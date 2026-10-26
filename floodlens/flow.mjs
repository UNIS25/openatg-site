import {createContext} from './context-ui.mjs?v=20261026-11';
import {streetEnabled} from './street-map.mjs?v=20261026-11';
import {LocationMap} from './location-map.mjs?v=20261026-11';
import {locationEvidence,warningState,ageState,insideGeometry,intersectsAccuracy,locationCandidates} from './core.mjs?v=20261026-11';
const $=s=>document.querySelector(s);
export function createFlow({t,name,getData,getCatalog,onLanguage,onArea,onRefresh}){
 let stage='language',point=null,accuracy=null,mode='gps',area=null,candidates=[],state='idle',manualPoint=null,catalog=null,locationRequest=0,matchRequest=0,lastMapMode=false;
 const shards=new Map();const resultMap=new LocationMap($('#result-map'),{translate:t});
 const context=createContext({map:resultMap,t});
 const pinMap=new LocationMap($('#pin-map'),{translate:t,onPin:p=>{manualPoint=p;$('#use-pin').disabled=false;$('#manual-status').textContent=t('manualAccuracy');}});
 function labels(){return [...(catalog?.districts||[]),...(catalog?.divisions||[])].map(a=>({...a,label:name(a)}));}
 function show(next){stage=next;for(const s of ['language','location','result'])$('#'+s+'-screen').hidden=s!==next;$('.language').hidden=next==='language';window.scrollTo(0,0);}
 function status(key,extra=''){$('#location-message').textContent=t(key)+(extra?' '+extra:'');$('#location-help').hidden=key==='gpsWorking';}
 async function openManual(approximate){
  locationRequest++;matchRequest++;$('#locate').disabled=false;
  show('location');$('#manual-panel').hidden=false;$('#location-screen').classList.add('manual-open');manualPoint=null;$('#use-pin').disabled=true;$('#manual-status').textContent=t('pinInstruction');
  if(approximate)pinMap.set({center:approximate.point,span:Math.max(.08,approximate.accuracy/111320*6),point:approximate.point,accuracy:approximate.accuracy});
  else pinMap.set({center:point||[80.7,7.9],span:point? .1:4.7,point:null,accuracy:null});
  await pinMap.load();if(pinMap.error)$('#location-help').hidden=false;try{catalog=await getCatalog();pinMap.set({labels:labels()});}catch{}
  $('#manual-title').focus({preventScroll:true});
 }
 async function match(p,uncertainty,source){
  const request=++matchRequest;
  point=[...p];accuracy=uncertainty;mode=source;area=null;candidates=[];state='checking';onArea(null);show('result');
  resultMap.set({center:point,span:Math.max(streetEnabled()?.012:.055,(uncertainty||0)/111320*6),point,accuracy,mode:source});resultMap.load();render();
  if(p[1]<5.7||p[1]>10.1||p[0]<79.3||p[0]>82.1){state='outside';render();return;}
  try{
   catalog=await getCatalog();if(request!==matchRequest)return;const districts=catalog.districts.filter(d=>intersectsAccuracy(d.bbox,p,(uncertainty??100)+30));
   if(!districts.length){state='outside';render();return;}
   const loaded=await Promise.all(districts.map(async d=>{if(!shards.has(d.code)){const response=await fetch(`./data/boundaries/${d.code}.json`,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Boundary unavailable');shards.set(d.code,await response.json());}return shards.get(d.code);}));
   if(request!==matchRequest)return;const features=loaded.flatMap(s=>s.features);const matches=locationCandidates(features,p,uncertainty??100);
   candidates=matches.map(f=>catalog.divisions.find(a=>a.code===f.properties.code)).filter(Boolean);
   resultMap.set({features,labels:labels()});
   if(matches.length===1&&insideGeometry(p,matches[0].geometry)){area=candidates[0]||null;state=area?(uncertainty>1500?'ambiguous':'matched'):'unavailable';if(uncertainty>1500)area=null;if(area&&!streetEnabled()){const [x0,y0,x1,y1]=area.bbox;const span=Math.max(.08,Math.min(.65,Math.max(x1-x0,(y1-y0)/.75)*1.35));resultMap.set({center:point,span});}onArea(area);}
   else state=candidates.length?'ambiguous':'outside';
  }catch{if(request!==matchRequest)return;state='unavailable';}
  render();
 }
 function locate(){
  const request=++locationRequest;matchRequest++;
  $('#locate').disabled=true;status('gpsWorking');
  if(!navigator.geolocation){$('#locate').disabled=false;status('gpsUnavailable');return;}
  navigator.geolocation.getCurrentPosition(position=>{
   if(request!==locationRequest)return;
   $('#locate').disabled=false;const {latitude,longitude,accuracy:a}=position.coords;
   if(![latitude,longitude,a].every(Number.isFinite)||a<=0||Math.abs(latitude)>90||Math.abs(longitude)>180){status('gpsUnavailable');return;}
   if(a>10000){status('gpsApproximate','±'+Math.round(a)+' m');openManual({point:[longitude,latitude],accuracy:a});return;}
   $('#location-message').textContent='';match([longitude,latitude],a,'gps');
  },error=>{if(request!==locationRequest)return;$('#locate').disabled=false;status(error.code===1?'gpsDenied':'gpsUnavailable');},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 }
 function render(){
  if(streetEnabled()!==lastMapMode){lastMapMode=streetEnabled();if(point){const a=area?.bbox;const localSpan=a?Math.max(.08,Math.min(.65,Math.max(a[2]-a[0],(a[3]-a[1])/.75)*1.35)):.15;resultMap.set({center:point,span:lastMapMode?Math.max(.012,(accuracy||0)/111320*6):localSpan});}}
  $('.flow-privacy').dataset.i18n=streetEnabled()?'streetPrivacy':'shortPrivacy';$('.flow-privacy').textContent=t($('.flow-privacy').dataset.i18n);
  resultMap.t=t;pinMap.t=t;resultMap.labels=labels();pinMap.labels=labels();resultMap.draw();pinMap.draw();
  if(stage!=='result')return;
  context.update({point,accuracy:accuracy||0,outside:state==='outside',checking:state==='checking'});
  const {data,needsUpdate,loadFailed,loading}=getData();
  const candidateAreas=area?[area]:state==='ambiguous'?candidates:[];
  const uncertain=state==='ambiguous';
  const evidence=locationEvidence(data?.bulletins||[],candidateAreas,{uncertain});
  const primary=evidence.source;
  let title='riskUnknown',body='noClearResult',facts=['missingNotSafe','checkOfficialShort'];let severity='unknown';
  if(state==='checking'){title='checkingPlace';body='checkingPlaceBody';facts=[];}
  else if(state==='outside'){title='outsideShort';body='outsideShortBody';facts=['checkLocalAuthorities'];}
  else if(!data&&loading){title='checkingPlace';body='loading';facts=[];}
  else if(state==='unavailable'){title='matchUnknown';body='matchUnavailable';facts=['missingNotSafe','checkOfficialShort'];}
  else if(primary){
   if(evidence.kind==='landslide'){
    title=evidence.level===3?'redShort':evidence.level===2?'amberLandslide':'yellowLandslide';
    body=uncertain?'possibleLandslideBody':evidence.level===3?'redShortBody':'landslideShortBody';severity=evidence.level===3?'red':'warning';
   }else if(evidence.kind==='flood'){title='amberFlood';body=uncertain?'possibleFloodBody':'floodShortBody';severity='warning';}
   else if(evidence.kind==='lightning'){title='lightning';body=uncertain?'possibleLightningBody':'lightningBody';severity='advisory';}
   else{title='rainAdvisory';body=uncertain?'possibleRainBody':'rainAdvisoryBody';severity='advisory';}
   facts=evidence.kind==='lightning'?['lightningAction',uncertain?'improvePinAction':'validUntil']:[evidence.level===3?'followOfficialEvacuation':evidence.kind==='rain'?'checkOfficialShort':'avoidWaterShort',uncertain?'improvePinAction':'areaNotHome'];
  }else if(uncertain){title='matchUnknown';body='boundaryUncertain';facts=['improvePinAction','missingNotSafe'];}
  else if(data&&!data.bulletins.some(w=>warningState(w)==='active')){title='outdatedShort';body='checkLatestShort';}
  if(needsUpdate){title='updateShort';body='updateShortBody';facts=['checkOfficialShort'];severity='unknown';}
  if(!navigator.onLine)facts.unshift('offlineShort');else if(loadFailed)facts.unshift('refreshFailedShort');
  $('#area-selection').textContent=area?name(area)+' · '+t('division'):t(mode==='gps'?'yourGps':'yourPin');
  $('#accuracy-label').textContent=mode==='gps'?t(accuracy>1500?'approximateGps':'gpsAccuracy')+' ±'+Math.round(accuracy)+' m':t('manualAccuracy');$('#improve-location').hidden=!uncertain;
  $('#assessment').className='compact-assessment '+severity;$('#assessment-title').textContent=t(title);$('#assessment-copy').textContent=t(body);$('#result-symbol').textContent=severity!=='unknown'?'!':'?';
  const list=$('#quick-facts');list.replaceChildren();for(const key of facts.slice(0,2)){const li=document.createElement('li');li.textContent=key==='validUntil'&&primary?t(key)+': '+new Intl.DateTimeFormat(document.documentElement.lang,{timeZone:'Asia/Colombo',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(primary.expiresAt))+' · SLST':t(key);list.append(li);}
  if(data&&state!=='checking'){const li=document.createElement('li');li.className='checked-fact';const date=new Date(data.reviewedAt);li.textContent=ageState(data.reviewedAt,3)==='stale'?t('warningReviewOld'):ageState(data.reviewedAt,3)==='unknown'?t('warningTimeUnknown'):Number.isFinite(date.getTime())?t('checkedShort')+' '+new Intl.DateTimeFormat(document.documentElement.lang,{timeZone:'Asia/Colombo',hour:'2-digit',minute:'2-digit',hour12:false}).format(date)+' · SLST':t('ageUnknown');list.append(li);}
  $('#quick-source').href=primary?.url||'https://www.dmc.gov.lk/';$('#quick-source').textContent=t(needsUpdate?'reloadPage':'officialUpdate');$('#quick-source').onclick=needsUpdate?e=>{e.preventDefault();window.location.reload();}:null;
  const choices=$('#candidate-choices');choices.replaceChildren();choices.hidden=state!=='ambiguous';if(state==='ambiguous'){const heading=document.createElement('strong');heading.textContent=t('possibleDivisions');choices.append(heading);for(const candidate of candidates){const label=document.createElement('span');label.dataset.candidate=candidate.code;label.textContent=name(candidate);choices.append(label);}}

 }
 document.querySelectorAll('[data-language]').forEach(b=>b.addEventListener('click',()=>{onLanguage(b.dataset.language);show('location');onRefresh();}));
 $('#locate').addEventListener('click',locate);$('#manual-location').addEventListener('click',()=>openManual());
 $('#change-location').addEventListener('click',()=>{locationRequest++;matchRequest++;$('#locate').disabled=false;show('location');$('#manual-panel').hidden=true;$('#location-screen').classList.remove('manual-open');$('#location-message').textContent='';});
 $('#improve-location').addEventListener('click',()=>openManual({point,accuracy:accuracy||100}));
 $('#cancel-pin').addEventListener('click',()=>{$('#manual-panel').hidden=true;$('#location-screen').classList.remove('manual-open');});
 $('#use-pin').addEventListener('click',()=>{if(manualPoint)match(manualPoint,null,'manual');});
 $('#area-search').addEventListener('input',async()=>{const query=$('#area-search').value.trim().toLocaleLowerCase();const list=$('#area-results');list.replaceChildren();list.hidden=!query;if(!query)return;try{catalog=await getCatalog();for(const a of [...catalog.districts,...catalog.divisions].filter(a=>Object.values(a.names).concat(Object.values(a.displayNames||{}),a.aliases||[],a.code).some(n=>String(n).toLocaleLowerCase().includes(query))).slice(0,12)){const b=document.createElement('button');b.type='button';b.textContent=name(a)+' · '+t(a.type);b.addEventListener('click',()=>{const [x0,y0,x1,y1]=a.bbox;pinMap.set({center:[(x0+x1)/2,(y0+y1)/2],span:Math.max(x1-x0,(y1-y0)/.75)*1.15,point:null,accuracy:null,labels:labels()});manualPoint=null;$('#use-pin').disabled=true;$('#area-search').value=name(a);list.hidden=true;$('#manual-status').textContent=t('pinInstruction');});list.append(b);}if(!list.childElementCount)list.textContent=t('noSearch');}catch{list.textContent=t('mapUnavailable');}});
 $('#all-details').addEventListener('toggle',()=>{if($('#all-details').open)onRefresh();});
 document.addEventListener('floodlens-map-mode',render);
 return {render};
}

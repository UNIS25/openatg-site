import {copy} from './i18n.mjs';
import {warningState,ageState,dailyAgeState,warningMatches,assessment,validateSnapshot,intersectsAccuracy,locationCandidates,insideGeometry} from './core.mjs';
const $=s=>document.querySelector(s);
let lang='en',data=null,catalog=null,selected=null,locationMessage='',outside=false,loadFailed=false,loading=false;
const t=k=>copy[lang][k]??copy.en[k]??k;
const local=v=>typeof v==='object'?(v?.[lang]||v?.en||''):v;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const date=(s)=>{if(!s||!Number.isFinite(Date.parse(s)))return t('ageUnknown');return new Intl.DateTimeFormat({en:'en-GB',si:'si-LK',ta:'ta-LK'}[lang],{timeZone:'Asia/Colombo',year:'numeric',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s))+' · SLST (UTC+05:30)';};
const link=(url,label,cls='')=>{const a=el('a',cls,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
function areaName(a){return local(a.names)||a.name;}
function translate(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i18n]').forEach(n=>{n.textContent=t(n.dataset.i18n);});
  document.querySelectorAll('[data-placeholder]').forEach(n=>n.placeholder=t(n.dataset.placeholder));
  $('#language').value=lang;
  render();if($('#area-search').value)searchAreas();
}
function renderAssessment(){
  let state=outside?'outside':!data?'unknown':assessment(data.bulletins,selected);
  $('#assessment-title').textContent=t(state+'Title');
  $('#assessment-copy').textContent=outside?t('outside'):loadFailed&&!data?t('dataError'):t(state+'Body');
  const red=selected?.type==='division'&&data?.bulletins.some(w=>warningState(w)==='active'&&w.areas.some(a=>a.divisionCode===selected.code&&a.level===3));
  $('#assessment').classList.toggle('severe',Boolean(red));
  if(red){$('#assessment-title').textContent=t('redTitle');$('#assessment-copy').textContent=t('redBody');}
  $('#area-selection').textContent=selected?`${t('selected')}: ${areaName(selected)} · ${t(selected.type)}`:t('allIsland');
  $('#clear-area').hidden=!selected&&!outside;
  $('#location-message').textContent=locationMessage?t(locationMessage):'';
}
function renderWarnings(){
  const wrap=$('#warnings');wrap.replaceChildren();
  if(!data){wrap.append(el('p','empty-state',t(loadFailed?'dataError':'loading')));return;}
  let warnings=data.bulletins.filter(w=>warningMatches(w,selected));
  if(!warnings.length)wrap.append(el('p','empty-state',t('unmatchedBody')));
  for(const w of warnings){
    const state=warningState(w),card=el('article','warning '+(state==='active'?'':'expired'));
    const matchedArea=selected?.type==='division'?w.areas.find(a=>a.divisionCode===selected.code):null;
    if(state==='active'&&(matchedArea?matchedArea.level===3:w.areas.some(a=>a.level===3)))card.classList.add('severe');
    const warningLabel=w.kind==='landslide'&&matchedArea?.level?t('landslideKind')+' · '+t('level'+matchedArea.level):t(w.kind);
    card.append(el('p','warning-type',warningLabel+' · '+t(state==='unknown'?'clockUnknown':state)),el('h3','',local(w.title)),el('p','',local(w.summary)),el('p','small',t('summaryNote')));
    if(w.areas.length){const details=el('details'),summary=el('summary','',t('areas'));details.append(summary);
      const list=el('ul');for(const a of w.areas){
        const c=catalog?.divisions.find(v=>v.code===a.divisionCode);
        const district=catalog?.districts.find(v=>v.code===a.districtCode);
        list.append(el('li','',`${c?areaName(c):a.division} · ${district?areaName(district):a.district}${a.level?' · '+t('level'+a.level):''}`));
      }details.append(list);card.append(details);
    }
    const times=el('div','warning-times');times.append(el('div','',`${t('issued')}: ${date(w.issuedAt)}`),el('div','',`${t('validUntil')}: ${date(w.expiresAt)}`),el('div','',w.authority));
    card.append(times,link(w.url,t('original')+' ↗','bulletin-link'));wrap.append(card);
  }
  const fresh=ageState(data.reviewedAt,3);
  $('#warning-freshness').textContent=`${t('snapshot')}: ${date(data.reviewedAt)}. ${fresh==='stale'?t('snapshotStale'):fresh==='unknown'?t('clockError'):''}`;
}
function renderStations(){
  const wrap=$('#stations');wrap.replaceChildren();if(!data){wrap.append(el('p','empty-state',t('dataError')));return;}
  const query=$('#station-search').value.trim().toLocaleLowerCase();
  const stations=data.stations.filter(s=>(s.name+' '+s.basin).toLocaleLowerCase().includes(query));
  for(const s of stations){const card=el('article','station');card.append(el('h3','',s.name),el('p','basin',s.basin));const level=el('div','level',s.value.toFixed(2)+' ');level.append(el('span','',s.unit));card.append(level,el('p','status',t(s.status)),el('p','small',`${t('observationAt')}: ${date(s.observedAt)}`));
    const freshness=ageState(s.observedAt,3);if(freshness!=='fresh')card.append(el('p','small',t(freshness==='unknown'?'ageUnknown':'stale')));
    card.append(el('p','small',t('gaugeNote')),link(s.url,t('report')));wrap.append(card);
  }
  if(!stations.length)wrap.append(el('p','empty-state',t('noStations')));
  $('#observation-status').textContent=`${t('observationSnapshot')} · ${t('publishedAt')}: ${date(data.stations[0]?.issuedAt)}. ${t('snapshotFetch')}: ${date(data.fetchedAt)}.`;
  let reservoirWrap=$('#reservoirs');
  if(!reservoirWrap){const title=el('h3','',t('reservoirHeading'));title.id='reservoir-heading';reservoirWrap=el('div','stations');reservoirWrap.id='reservoirs';$('.map-panel').after(title,reservoirWrap);}
  $('#reservoir-heading').textContent=t('reservoirHeading');reservoirWrap.replaceChildren();
  for(const r of data.reservoirs){const card=el('article','station');card.append(el('h3','',r.name),el('p','basin',r.river));const value=el('div','level',r.effectivePercent.toFixed(2)+' ');value.append(el('span','','%'));card.append(value,el('p','small',t('storage')),el('p','status',t('yesSpill')),el('p','small',`${t('spill')}: ${r.spillCusecs.toLocaleString()} ft³/s (cusecs)`),el('p','small',`${t('daily')}: ${r.observedDate} · ${t('dailyTime')}`));const age=dailyAgeState(r.observedDate);if(age!=='daily')card.append(el('p','status',t(age==='stale'?'stale':'ageUnknown')));card.append(el('p','small',t('reservoirNote')),link('https://irrigation.gov.lk/web/index.php?Itemid=201&id=84&lang=en&option=com_content&view=article',t('report')));reservoirWrap.append(card);}
}
function renderConnection(){const n=$('#connection');n.hidden=navigator.onLine&&!loadFailed;n.textContent=!navigator.onLine?t('offline'):t(data?'updateFailed':'dataError');}
function render(){renderAssessment();renderWarnings();renderStations();renderConnection();}
async function loadSnapshot(){
  if(loading)return;loading=true;$('#refresh').disabled=true;$('#load-observations').disabled=true;
  try{const r=await fetch('./data/reviewed.json',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Snapshot unavailable');const next=validateSnapshot(await r.json());data=next;loadFailed=false;}catch{loadFailed=true;}
  finally{loading=false;$('#refresh').disabled=false;$('#load-observations').disabled=false;render();}
}
async function loadCatalog(){
  if(catalog)return catalog;
  const r=await fetch('./data/areas.json',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Area catalogue unavailable');
  const next=await r.json();if(!Array.isArray(next.districts)||!Array.isArray(next.divisions))throw Error('Invalid area catalogue');catalog=next;return catalog;
}
function choose(a){selected=a;outside=false;$('#area-search').value=areaName(a);$('#area-results').hidden=true;render();}
async function searchAreas(){
  const query=$('#area-search').value.trim().toLocaleLowerCase();const results=$('#area-results');results.replaceChildren();if(!query){results.hidden=true;return;}
  results.hidden=false;
  try{await loadCatalog();const matches=[...catalog.districts,...catalog.divisions].filter(a=>Object.values(a.names).concat(a.aliases||[],a.code).some(n=>String(n).toLocaleLowerCase().includes(query))).slice(0,20);
    if(!matches.length)results.append(el('p','small',t('noSearch')));
    for(const a of matches){const district=catalog.districts.find(d=>d.code===a.districtCode);const button=el('button','',`${areaName(a)} · ${t(a.type)}${district?' · '+areaName(district):''}`);button.type='button';button.addEventListener('click',()=>choose(a));results.append(button);}
  }catch{results.append(el('p','small',t('dataError')));}
}
function geoSuccess(position){
  const {longitude,latitude,accuracy}=position.coords;
  // Coordinates remain in this function's memory. Never placed in storage, URLs, logs or requests.
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||!Number.isFinite(accuracy)||accuracy<0){locationMessage='geoError';finishGeo();return;}
  if(latitude<5.7||latitude>10.1||longitude<79.3||longitude>82.1){selected=null;outside=true;locationMessage='outside';finishGeo();return;}
  if(accuracy>1500){locationMessage='poorGps';finishGeo();return;}
  matchLocation([longitude,latitude],accuracy).finally(finishGeo);
}
async function matchLocation(point,accuracy){
  try{
    await loadCatalog();const districts=catalog.districts.filter(d=>intersectsAccuracy(d.bbox,point,accuracy+30));
    if(!districts.length){selected=null;outside=true;locationMessage='outside';return;}
    const shards=await Promise.all(districts.map(async d=>{const r=await fetch(`./data/boundaries/${d.code}.json`,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Boundaries unavailable');return r.json();}));
    const candidates=locationCandidates(shards.flatMap(s=>s.features),point,accuracy);
    if(candidates.length===1&&insideGeometry(point,candidates[0].geometry)){
      const a=catalog.divisions.find(a=>a.code===candidates[0].properties.code);if(!a)throw Error('Unmapped boundary');choose(a);locationMessage='geoMatched';
    }else if(candidates.length){
      selected=null;outside=false;locationMessage='geoOverlap';const results=$('#area-results');results.replaceChildren();results.hidden=false;
      for(const f of candidates){const a=catalog.divisions.find(a=>a.code===f.properties.code);if(!a)continue;const button=el('button','',areaName(a)+' · '+t('division'));button.type='button';button.addEventListener('click',()=>{locationMessage='geoManual';choose(a);});results.append(button);}
    }else{selected=null;outside=true;locationMessage='outside';}
  }catch{locationMessage='geoFound';}
}
function finishGeo(){$('#locate').disabled=false;render();}
$('#locate').addEventListener('click',()=>{
  locationMessage='locating';render();if(!navigator.geolocation){locationMessage='geoUnsupported';render();return;}
  $('#locate').disabled=true;navigator.geolocation.getCurrentPosition(geoSuccess,e=>{locationMessage=e.code===1?'denied':'geoError';finishGeo();},{enableHighAccuracy:false,timeout:12000,maximumAge:0});
});
$('#area-search').addEventListener('input',searchAreas);
$('#area-search').addEventListener('keydown',e=>{if(e.key==='Escape')$('#area-results').hidden=true;});
$('#station-search').addEventListener('input',renderStations);
$('#clear-area').addEventListener('click',()=>{selected=null;outside=false;locationMessage='';$('#area-search').value='';$('#area-results').hidden=true;render();});
$('#language').addEventListener('change',e=>{lang=e.target.value;translate();});
$('#refresh').addEventListener('click',loadSnapshot);$('#load-observations').addEventListener('click',loadSnapshot);
window.addEventListener('online',()=>{renderConnection();loadSnapshot();});window.addEventListener('offline',renderConnection);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();loadSnapshot();}});
setInterval(()=>{if(!document.hidden)render();},60000);
setInterval(()=>{if(!document.hidden&&navigator.onLine)loadSnapshot();},300000);
const browserLang=navigator.language?.slice(0,2);if(['si','ta'].includes(browserLang))lang=browserLang;
const boundaryNote=link('https://data.humdata.org/dataset/cod-ab-lka','');boundaryNote.dataset.i18n='boundarySource';const boundaryP=el('p','');boundaryP.append(boundaryNote);$('.about-content').append(boundaryP);
const history=link('https://github.com/UNIS25/openatg-site/actions/workflows/floodlens-source-check.yml','');history.dataset.i18n='scheduler';const historyP=el('p','');historyP.append(history);$('.about-content').append(historyP);
translate();loadSnapshot();loadCatalog().then(render).catch(()=>{});

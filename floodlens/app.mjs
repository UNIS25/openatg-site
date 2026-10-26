import {copy} from './i18n.mjs?v=20261026-6';
import {renderReservoirs,refreshReservoirs} from './reservoirs.mjs?v=20261026-6';
import {createFlow} from './flow.mjs?v=20261026-6';
import {warningState,ageState,dailyAgeState,warningMatches,assessment,validateSnapshot,intersectsAccuracy,locationCandidates,insideGeometry} from './core.mjs?v=20261026-6';
const $=s=>document.querySelector(s);
let lang='en',data=null,catalog=null,selected=null,locationMessage='',outside=false,loadFailed=false,loading=false,needsUpdate=false;
const t=k=>copy[lang][k]??copy.en[k]??k;
const local=v=>typeof v==='object'?(v?.[lang]||v?.en||''):v;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const date=(s)=>{if(!s||!Number.isFinite(Date.parse(s)))return t('ageUnknown');return new Intl.DateTimeFormat({en:'en-GB',si:'si-LK',ta:'ta-LK'}[lang],{timeZone:'Asia/Colombo',year:'numeric',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s))+' · SLST (UTC+05:30)';};
const link=(url,label,cls='')=>{const a=el('a',cls,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
function areaName(a){return a.displayNames?.[lang]||local(a.names)||a.name;}
function translate(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i18n]').forEach(n=>{n.textContent=t(n.dataset.i18n);});
  document.querySelectorAll('[data-placeholder]').forEach(n=>n.placeholder=t(n.dataset.placeholder));
  $('#language').value=lang;
  render();
}
function renderWarnings(){
  const wrap=$('#warnings');wrap.replaceChildren();
  if(!data){wrap.append(el('p','empty-state',t(needsUpdate?'updateRequiredBody':loadFailed?'dataError':'loading')));return;}
  let warnings=data.bulletins.filter(w=>warningMatches(w,selected));
  if(!warnings.length)wrap.append(el('p','empty-state',t('unmatchedBody')));
  for(const w of warnings){
    const state=warningState(w),card=el('article','warning '+(state==='active'?'':'expired'));
    const matchedArea=selected?.type==='division'?w.areas.find(a=>a.divisionCode===selected.code):null;
    if(state==='active'&&(matchedArea?matchedArea.level===3:w.areas.some(a=>a.level===3)))card.classList.add('severe');
    const levels=[...new Set(w.areas.map(a=>a.level).filter(Boolean))].sort();
    const overviewLevel=!levels.length?t('unknownValue'):levels.length===1?t('level'+levels[0]):t('levels')+' '+(levels.every((v,i)=>!i||v===levels[i-1]+1)?levels[0]+'–'+levels.at(-1):levels.join(', '));
    const warningLabel=w.kind==='landslide'?t('landslideKind')+' · '+(matchedArea?.level?t('level'+matchedArea.level):overviewLevel):t(w.kind);
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
  const wrap=$('#stations');wrap.replaceChildren();if(!data){wrap.append(el('p','empty-state',t(needsUpdate?'updateRequiredBody':loadFailed?'dataError':'loading')));return;}
  const query=$('#station-search').value.trim().toLocaleLowerCase();
  const stations=data.stations.filter(s=>(s.name+' '+s.basin).toLocaleLowerCase().includes(query));
  for(const s of stations){const card=el('article','station');card.append(el('h3','',s.name),el('p','basin',s.basin));const level=el('div','level',s.value.toFixed(2)+' ');level.append(el('span','',s.unit));card.append(level,el('p','status',t(s.status)),el('p','small',`${t('observationAt')}: ${date(s.observedAt)}`));
    const freshness=ageState(s.observedAt,3);if(freshness!=='fresh')card.append(el('p','small',t(freshness==='unknown'?'ageUnknown':'stale')));
    card.append(el('p','small',t('gaugeNote')),link(s.url,t('report')));wrap.append(card);
  }
  if(!stations.length)wrap.append(el('p','empty-state',t('noStations')));
  $('#observation-status').textContent=`${t('observationSnapshot')} · ${t('publishedAt')}: ${date(data.stations[0]?.issuedAt)}. ${t('snapshotFetch')}: ${date(data.fetchedAt)}.`;
  renderReservoirs({t,fallback:data.reservoirs});
}
function renderConnection(){const n=$('#connection');n.hidden=navigator.onLine&&!loadFailed&&!needsUpdate;n.textContent=!navigator.onLine?t('offline'):t(needsUpdate?'updateRequiredBody':data?'updateFailed':'dataError');$('#refresh').textContent=t(needsUpdate?'reloadPage':'refresh');}
function render(){renderWarnings();renderStations();renderConnection();flow?.render();}
async function loadSnapshot(){
  if(loading)return;loading=true;$('#refresh').disabled=true;$('#load-observations').disabled=true;
  try{const r=await fetch('./data/reviewed.json',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Snapshot unavailable');const next=validateSnapshot(await r.json());data=next;loadFailed=false;needsUpdate=false;}catch(error){if(error.code==='CLIENT_UPDATE_REQUIRED'){needsUpdate=true;data=null;}else loadFailed=true;}
  finally{loading=false;$('#refresh').disabled=false;$('#load-observations').disabled=false;render();}
}
async function loadCatalog(){
  if(catalog)return catalog;
  const r=await fetch('./data/areas.json',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Area catalogue unavailable');
  const next=await r.json();if(!Array.isArray(next.districts)||!Array.isArray(next.divisions))throw Error('Invalid area catalogue');catalog=next;return catalog;
}
$('#station-search').addEventListener('input',renderStations);
$('#language').addEventListener('change',e=>{lang=e.target.value;translate();});
$('#refresh').addEventListener('click',()=>{if(needsUpdate)window.location.reload();else{loadSnapshot();if($('#observation-browser').open)refreshReservoirs();}});$('#load-observations').addEventListener('click',()=>{loadSnapshot();refreshReservoirs();});
$('#observation-browser').addEventListener('toggle',()=>{if($('#observation-browser').open)refreshReservoirs();});
window.addEventListener('online',()=>{renderConnection();loadSnapshot();});window.addEventListener('offline',render);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();loadSnapshot();}});
setInterval(()=>{if(!document.hidden)render();},60000);
setInterval(()=>{if(!document.hidden&&navigator.onLine){loadSnapshot();if($('#observation-browser').open)refreshReservoirs();}},300000);

const boundaryNote=link('https://data.humdata.org/dataset/cod-ab-lka','');boundaryNote.dataset.i18n='boundarySource';const boundaryP=el('p','');boundaryP.append(boundaryNote);$('.about-content').append(boundaryP);
const history=link('https://github.com/UNIS25/openatg-site/actions/workflows/floodlens-source-check.yml','');history.dataset.i18n='scheduler';const historyP=el('p','');historyP.append(history);$('.about-content').append(historyP);
const pointSource=link('./data/reservoir-locations.json','');pointSource.dataset.i18n='mapPointSource';const pointP=el('p','');pointP.append(pointSource);$('.about-content').append(pointP);
const flow=createFlow({t,name:areaName,getData:()=>({data,needsUpdate,loadFailed}),getCatalog:loadCatalog,onLanguage:next=>{lang=next;translate();},onArea:next=>{selected=next;render();},onRefresh:loadSnapshot});
translate();

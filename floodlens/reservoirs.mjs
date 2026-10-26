import {dailyAgeState,ageState,safeSource} from './core.mjs?v=20261026-9';
let directory=null,context=null,busy=false,failed=false,showAll=false;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const value=v=>Number.isFinite(v)?v.toLocaleString(undefined,{maximumFractionDigits:2}):'—';
export async function refreshReservoirs(){
  if(busy)return;busy=true;
  try{const response=await fetch('./data/reservoirs.json',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Unavailable');const d=await response.json();if(d.schemaVersion!==1||!safeSource(d.sourceUrl)||!Array.isArray(d.records)||d.records.length>200||d.records.some(r=>typeof r.name!=='string'||(r.effectivePercent!==null&&!Number.isFinite(r.effectivePercent))))throw Error('Invalid schema');directory=d;failed=false;}catch{failed=true;}
  finally{busy=false;if(context)renderReservoirs(context);}
}
export function renderReservoirs(args){
  context=args;const {t,fallback}=args;let root=document.querySelector('#reservoir-directory');
  if(!root){root=el('section','reservoir-directory');root.id='reservoir-directory';const title=el('h3');title.id='reservoir-heading';const search=el('input');search.id='reservoir-search';search.type='search';search.addEventListener('input',()=>renderReservoirs(context));const label=el('label','sr-only');label.htmlFor='reservoir-search';label.id='reservoir-search-label';const status=el('p','source-note');status.id='reservoir-directory-status';status.setAttribute('role','status');const cards=el('div','stations');cards.id='reservoirs';const more=el('button','text-button');more.id='reservoir-more';more.type='button';more.addEventListener('click',()=>{showAll=!showAll;renderReservoirs(context);});root.append(title,label,search,status,cards,more);document.querySelector('.map-panel').after(root);}
  root.querySelector('h3').textContent=t('reservoirHeading');const search=root.querySelector('input');search.placeholder=t('reservoirSearch');root.querySelector('label').textContent=t('reservoirSearch');
  const records=directory?.records||fallback,query=search.value.trim().toLocaleLowerCase();let filtered=records.filter(r=>(r.name+' '+(r.range||r.river||'')).toLocaleLowerCase().includes(query));const matching=filtered.length;if(!query&&!showAll)filtered=filtered.slice(0,6);
  root.querySelector('#reservoir-directory-status').textContent=`${filtered.length} / ${records.length} · ${t('reservoirCoverage')}${failed?' '+t('directoryError'):''}`;
  if(directory){const time=directory.ingestion?.lastAttemptAt||directory.retrievedAt;const stamp=Number.isFinite(Date.parse(time))?new Intl.DateTimeFormat(document.documentElement.lang,{timeZone:'Asia/Colombo',dateStyle:'medium',timeStyle:'short'}).format(new Date(time))+' · SLST':t('ageUnknown');root.querySelector('#reservoir-directory-status').append(el('span','ingestion-status',`${t('sourceChecked')}: ${stamp}. ${directory.ingestion?.status==='error'?t('sourceFailed'):ageState(time,2)!=='fresh'?t('sourceCheckOld'):directory.ingestion?.status==='ok'?t('autoObservation'):t('snapshotFetch')}.`));}
  const wrap=root.querySelector('#reservoirs');wrap.replaceChildren();
  for(const r of filtered){const card=el('article','station');card.append(el('h3','',r.name),el('p','basin',r.river||r.range||''));const amount=el('div','level',value(r.effectivePercent)+' ');amount.append(el('span','',Number.isFinite(r.effectivePercent)?'%':''));card.append(amount,el('p','small',t('storage')),el('p','status',t(r.spilling===true?'yesSpill':r.spilling===false?'noSpill':'unknownValue')),el('p','small',`${t('spill')}: ${value(r.spillCusecs)} ft³/s (cusecs)`),el('p','small',`${t('daily')}: ${r.observedDate||t('unknownDate')} · ${t('dailyTime')}`));
    const age=dailyAgeState(r.observedDate);if(age!=='daily')card.append(el('p','status',t(age==='stale'?'stale':'unknownDate')));
    const details=el('details','reservoir-details');details.append(el('summary','',t('moreReadings')),el('p','small',`${t('reservoirDepth')}: ${value(r.depthFeet)} ft`),el('p','small',`${t('effectiveVolume')}: ${value(r.effectiveStorageAcreFeet)} acre-ft`),el('p','small',`${t('priorDayRain')}: ${value(r.previousDayRainfallMm)} mm`));card.append(details,el('p','small',t('reservoirNote')));
    const a=el('a','',t('report'));a.href=directory?.sourceUrl||r.url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);wrap.append(card);
  }
  if(!matching)wrap.append(el('p','empty-state',t('noReservoirs')));
  const more=root.querySelector('#reservoir-more');more.hidden=Boolean(query)||records.length<=6;more.textContent=t(showAll?'showFewer':'showAllReservoirs');
}

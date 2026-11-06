import {parseHourlyRainText,selectHourlyRain} from './hourly-rain-model.mjs?v=20261106-37';
const copy={
 en:{title:'Rain, hour by hour',past:'Past 24 hours',future:'Next 24 hours',estimate:'MODEL ESTIMATE · NOT MEASURED',forecast:'MODEL FORECAST',open:'Show hourly rain',source:'Sources & limits',unknown:'Unavailable',loading:'Loading hourly rainfall…',limit:'NOAA GFS global model, about 28 km grid spacing. Past rainfall is an archived forecast estimate, not a rain-gauge measurement. This does not show floodwater or household flood risk.',partial:'A complete 24-hour total is unavailable. Missing hours are not zero rain.',stale:'This snapshot is old. Check the model run and source before using it.',hours:'Totals use 24 whole hours. The ongoing partial hour is excluded. Native hourly boundaries fall at :30 in Sri Lanka.',run:'Model run',fetched:'Downloaded',point:'Model grid centre',away:'km from your pin',measured:'View official measured rainfall ↗',fallback:'More weather: regional rain & wind (3-hour model)'},
 si:{title:'පැයෙන් පැයට වැසි',past:'පසුගිය පැය 24',future:'ඉදිරි පැය 24',estimate:'ආකෘති ඇස්තමේන්තුව · මිනුමක් නොවේ',forecast:'ආකෘති පුරෝකථනය',open:'පැයක වැසි බලන්න',source:'මූලාශ්‍ර සහ සීමා',unknown:'නොමැත',loading:'පැයක වැසි දත්ත පූරණය වෙමින්…',limit:'NOAA GFS ගෝලීය ආකෘතියකි; ජාල පරතරය කි.මී. 28 පමණ. පසුගිය වැසි අගයන් පැරණි පුරෝකථන ඇස්තමේන්තු මිස වැසි මිනුම් නොවේ. නිවසක ගංවතුර අවදානම නොපෙන්වයි.',partial:'සම්පූර්ණ පැය 24 එකතුව නොමැත. අතුරුදන් පැය වැසි ශුන්‍ය බවක් නොවේ.',stale:'මෙම දත්ත පැරණිය. ආකෘති වේලාව සහ මූලාශ්‍රය පරීක්ෂා කරන්න.',hours:'එකතුව සම්පූර්ණ පැය 24කි. දැනට ගත වන පැයේ කොටස ඇතුළත් නොවේ. ශ්‍රී ලංකාවේ කාල සීමා පැයේ :30 වේ.',run:'ආකෘති ආරම්භය',fetched:'බාගත කළේ',point:'ආකෘති ජාල මධ්‍යය',away:'කි.මී. තෝරාගත් ස්ථානයේ සිට',measured:'නිල මිනුම් කළ වැසි බලන්න ↗',fallback:'තවත් කාලගුණය: වැසි සහ සුළං (පැය 3 ආකෘතිය)'},
 ta:{title:'மணிநேர மழை',past:'கடந்த 24 மணி',future:'அடுத்த 24 மணி',estimate:'மாதிரி மதிப்பீடு · அளவீடு அல்ல',forecast:'மாதிரி முன்னறிவிப்பு',open:'மணிநேர மழையைக் காட்டு',source:'மூலங்கள் & வரம்புகள்',unknown:'கிடைக்கவில்லை',loading:'மணிநேர மழை ஏற்றப்படுகிறது…',limit:'NOAA GFS உலகளாவிய மாதிரி; கட்ட இடைவெளி சுமார் 28 கி.மீ. கடந்த மழை பழைய முன்னறிவிப்பு மதிப்பீடு; மழைமானி அளவீடு அல்ல. வெள்ள நீரோ வீட்டின் வெள்ள அபாயமோ காட்டப்படவில்லை.',partial:'முழுமையான 24 மணி மொத்தம் கிடைக்கவில்லை. இல்லாத மணிகள் பூஜ்ஜிய மழை அல்ல.',stale:'இந்தத் தரவு பழையது. மாதிரி நேரத்தையும் மூலத்தையும் பார்க்கவும்.',hours:'மொத்தம் 24 முழு மணிகள். நடப்பு முழுமையற்ற மணி சேர்க்கப்படவில்லை. இலங்கையில் இயல்பான மணிநேர எல்லைகள் :30 இல் உள்ளன.',run:'மாதிரி தொடக்கம்',fetched:'பதிவிறக்கம்',point:'மாதிரிக் கட்ட மையம்',away:'கி.மீ. உங்கள் இடத்திலிருந்து',measured:'அதிகாரப்பூர்வ அளவிட்ட மழையைப் பார் ↗',fallback:'மேலும் வானிலை: மழை & காற்று (3 மணி மாதிரி)'}
};
const node=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e;};
const link=(title,url)=>{const a=node('a',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
export function renderHourlyRain(root,data,point,language='en',now=Date.now()){
 const c=copy[language]||copy.en,s=selectHourlyRain(data,point,now),time=v=>new Intl.DateTimeFormat(language,{timeZone:'Asia/Colombo',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v)),short=v=>new Intl.DateTimeFormat(language,{timeZone:'Asia/Colombo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v));
 const opened=new Set([...root.querySelectorAll('details[open]')].map(d=>d.dataset.window));root.replaceChildren(node('h3',c.title));root.dataset.hourlyStatus=s.status;
 if(s.status==='stale')root.append(node('p',c.stale,'forecast-notice'));
 const cards=node('div',undefined,'hourly-cards');
 for(const [key,title,kind]of[['past24',c.past,c.estimate],['next24',c.future,c.forecast]]){
  const w=s[key],card=node('section',undefined,'hourly-card');card.dataset.rainWindow=key;card.append(node('h4',title),node('small',kind,'hourly-kind'),node('strong',w.totalMm===null?c.unknown:w.totalMm.toFixed(1)+' mm','hourly-total'),node('p',time(w.start)+' → '+time(w.end)+' SLST','forecast-period'));
  if(w.status!=='complete')card.append(node('p',c.partial));
  const details=node('details');details.dataset.window=key;details.open=opened.has(key);details.append(node('summary',c.open));const list=node('ol',undefined,'hourly-list'),max=Math.max(1,...w.rows.map(r=>r.rainMm||0));
  for(const r of w.rows){const row=node('li'),label=node('span',time(r.intervalStart)+'–'+short(r.validAt)),amount=node('strong',r.rainMm===null?c.unknown:r.rainMm.toFixed(1)+' mm'),bar=node('span',undefined,'hourly-bar');bar.setAttribute('aria-hidden','true');const fill=node('i');fill.style.width=(r.rainMm===null?0:Math.max(1,100*r.rainMm/max))+'%';bar.append(fill);row.append(label,amount,bar);list.append(row);}
  details.append(list);card.append(details);cards.append(card);
 }
 root.append(cards,node('p',c.hours,'hourly-context'),node('p',c.limit,'hourly-context'));
 const sources=node('details');sources.dataset.window='source';sources.open=opened.has('source');sources.append(node('summary',c.source));
 if(s.gridPoint)sources.append(node('p',c.point+': '+s.gridPoint.join(', ')+' · '+s.distanceKm.toFixed(1)+' '+c.away));
 for(const run of [...new Set([...s.past24.runAts,...s.next24.runAts])])sources.append(node('p',c.run+': '+time(run)+' SLST'));
 if(s.capturedAt)sources.append(node('p',c.fetched+': '+time(s.capturedAt)+' SLST'));
 sources.append(link('NOAA GFS ↗','https://www.nco.ncep.noaa.gov/pmb/products/gfs/nomads/'),node('p'),link('NOAA terms ↗','https://www.weather.gov/disclaimer'),node('p'),link('Source provenance · SHA-256 ↗','/floodlens/data/hourly-rain/provenance.json'),node('p'),link(c.measured,'https://slirrigation.maps.arcgis.com/apps/dashboards/2cffe83c9ff5497d97375498bdf3ff38'));root.append(sources);return s;
}
let cache,cacheAt=0;
export async function loadHourlyRain(){
 let data=null;
 try{if(!cache||Date.now()-cacheAt>240000){cacheAt=Date.now();cache=fetch('/floodlens/data/hourly-rain/hourly-rain.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw Error();return parseHourlyRainText(await r.text());}).catch(e=>{cache=null;throw e;});}data=await cache;}catch{}
 return data;
}
export async function mountHourlyRain(root,point,language='en'){root.replaceChildren(node('p',(copy[language]||copy.en).loading));const data=await loadHourlyRain();renderHourlyRain(root,data,point,language);return data;}

export const weatherCopy=copy;

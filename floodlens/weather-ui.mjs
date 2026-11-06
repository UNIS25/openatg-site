import {loadHourlyRain,renderHourlyRain,weatherCopy} from './hourly-rain-ui.mjs?v=20261106-37';
import {mountForecast as mountRegionalForecast} from './forecast-ui.mjs?v=20261106-37';
const controllers=new WeakMap();
export async function mountForecast(root,point,language='en'){
 controllers.get(root)?.();let disposed=false,timer,regionalDispose,refreshing=false;root.replaceChildren();root.classList.add('forecast-widget');
 const hourly=document.createElement('section'),more=document.createElement('details'),summary=document.createElement('summary'),regional=document.createElement('div');summary.textContent=(weatherCopy[language]||weatherCopy.en).fallback;more.className='weather-more';more.append(summary,regional);hourly.textContent=(weatherCopy[language]||weatherCopy.en).loading;root.append(hourly,more);let regionalStarted=false;
 more.addEventListener('toggle',()=>{if(more.open&&!regionalStarted){regionalStarted=true;mountRegionalForecast(regional,point,language).then(fn=>{regionalDispose=fn;if(disposed)fn?.();});}});
 const dispose=()=>{disposed=true;clearInterval(timer);regionalDispose?.();};controllers.set(root,dispose);
 const refresh=async()=>{if(disposed||refreshing)return;refreshing=true;try{const data=await loadHourlyRain();if(!disposed)renderHourlyRain(hourly,data,point,language);}finally{refreshing=false;}};
 await refresh();if(disposed)return dispose;timer=setInterval(()=>{if(!document.hidden)refresh();},60000);return dispose;
}

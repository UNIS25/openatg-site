import {selectHourlyRain,validateHourlyRain} from './hourly-rain-model.mjs?v=20261106-37';
export function hourlyMapLayer(data,period='next24',frame=0,now=Date.now()){
 validateHourlyRain(data,now);if(!['past24','next24'].includes(period))throw Error('Unknown window');
 const selection=selectHourlyRain(data,[80.75,7.75],now),rows=selection[period].rows,index=Math.min(23,Math.max(0,Math.floor(frame))),row=rows[index],field=data.frames.find(f=>Date.parse(f.intervalStart)===Date.parse(row.intervalStart)&&Date.parse(f.validAt)===Date.parse(row.validAt));
 return {status:selection.status,kind:period==='past24'?'historical_model_estimate':'model_forecast',rows,frame:row,runAt:field?.runAt||null,cells:data.grid.points.map((point,id)=>({id,point,kind:'rain',value:field?.rainMm[id]??null,start:row.intervalStart,end:row.validAt,runAt:field?.runAt||null}))};
}

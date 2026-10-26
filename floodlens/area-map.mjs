// Administrative outline only. No user coordinates, tiles, routing or hazard geometry.
let current=null;
const ns='http://www.w3.org/2000/svg';
const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
function svgNode(tag,attributes){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attributes))e.setAttribute(k,String(v));return e;}
export function setAreaOutline(context){
  const prior=current?.area?.code;current=context;let details=document.querySelector('#area-outline');
  if(!details){details=node('details');details.id='area-outline';const summary=node('summary');const content=node('div');content.id='outline-content';details.append(summary,content);details.addEventListener('toggle',()=>{if(details.open)draw();});document.querySelector('.location-panel').append(details);}
  details.hidden=!context.area;details.querySelector('summary').textContent=context.t('outlineTitle');
  if(prior!==context.area?.code){details.open=false;details.querySelector('div').replaceChildren();}
  else if(details.open)draw();
}
async function draw(){
  const ctx=current;if(!ctx?.area)return;const {area,t}=ctx;const content=document.querySelector('#outline-content');content.replaceChildren(node('p',t('loading')));
  try{
    const districtCode=area.type==='district'?area.code:area.districtCode;
    const response=await fetch(`/floodlens/data/boundaries/${districtCode}.json`,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Unavailable');const shard=await response.json();
    if(current?.area?.code!==area.code)return;
    const features=area.type==='district'?shard.features:shard.features.filter(f=>f.properties.code===area.code);
    if(!features.length)throw Error('Missing area');
    const [x0,y0,x1,y1]=area.bbox;const sx=Math.cos((y0+y1)/2*Math.PI/180),scale=Math.min(380/((x1-x0)*sx),220/(y1-y0));
    const transform=([x,y])=>[210+(x-(x0+x1)/2)*sx*scale,130-(y-(y0+y1)/2)*scale];
    const svg=svgNode('svg',{viewBox:'0 0 420 260',role:'img','aria-label':t('outlineLabel')});
    for(const f of features){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;let d='';for(const polygon of polygons)for(const ring of polygon){d+=ring.map((p,i)=>{const xy=transform(p);return(i?'L':'M')+xy.map(n=>n.toFixed(3)).join(',');}).join(' ')+' Z ';}svg.append(svgNode('path',{d,fill:'#dfeee7',stroke:'#336f60','stroke-width':1,'fill-rule':'evenodd'}));}
    const north=svgNode('text',{x:390,y:27,'text-anchor':'middle',fill:'#33584b','font-size':13});north.textContent='N ↑';svg.append(north);
    const caption=node('p',t('outlineLabel'));caption.className='small';const source=node('a',t('outlineSource'));source.href='https://data.humdata.org/dataset/cod-ab-lka';source.target='_blank';source.rel='noopener noreferrer';source.className='small';content.replaceChildren(svg,caption,source);
  }catch{if(current?.area?.code===area.code)content.replaceChildren(node('p',t('outlineError')));}
}

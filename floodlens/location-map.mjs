import {gateSummary} from './gates.mjs?v=20261026-16';
import {StreetMap,streetEnabled} from './street-map.mjs?v=20261026-16';
// Matching is local. Optional street tiles require per-page consent; no geocoder or location storage.
const ns='http://www.w3.org/2000/svg';
const node=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
export const mapWorld=([lon,lat])=>[(lon+180)/360,(1-Math.log(Math.tan(Math.PI/4+Math.max(-85.0511,Math.min(85.0511,lat))*Math.PI/360))/Math.PI)/2];
export const mapLonLat=([x,y])=>[x*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI];
let overview,water;
const projectedFeatures=new WeakMap();
function displayGeometry(feature){
 if(projectedFeatures.has(feature))return projectedFeatures.get(feature);
 const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 const rings=polygons.flatMap(p=>p.map(r=>r.map(mapWorld)));
 const bounds=[Infinity,Infinity,-Infinity,-Infinity];
 for(const ring of rings)for(const [x,y] of ring){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);}
 const result={rings,bounds};projectedFeatures.set(feature,result);return result;
}
async function background(){if(!overview)overview=fetch('/floodlens/data/map-overview.json').then(r=>{if(!r.ok)throw Error('Map unavailable');return r.json();}).catch(e=>{overview=null;throw e;});return overview;}
export class LocationMap{
 constructor(root,{onPin,translate}){this.root=root;this.onPin=onPin;this.t=translate;this.center=[80.7,7.9];this.span=4.7;this.features=[];this.point=null;this.accuracy=null;this.manual=Boolean(onPin);this.svg=node('svg',{viewBox:'0 0 400 300',tabindex:0,role:'group'});this.root.append(this.svg);const controls=document.createElement('div');controls.className='map-controls';for(const [label,factor] of [['+',.5],['−',2]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',label==='+'?'Zoom in':'Zoom out');b.addEventListener('click',()=>{this.span=Math.max(.006,Math.min(7,this.span*factor));this.draw();this.selectCentre();});controls.append(b);}if(!this.manual){const center=document.createElement('button');center.type='button';center.textContent='⌖';center.setAttribute('aria-label',this.t('yourGps'));center.addEventListener('click',()=>{if(this.point){this.center=[...this.point];this.draw();}});controls.append(center);}this.root.append(controls);this.controls=controls;this.recenter=controls.querySelector('button:last-child');this.street=new StreetMap(root,{t:this.t,redraw:()=>this.draw()});
 this.pointers=new Map();
 const resetGesture=()=>{
  const ps=[...this.pointers.values()];if(!ps.length){this.gesture=null;return;}
  const mid=ps.length>1?{x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2}:ps[0];
  const q=new DOMPoint(mid.x,mid.y).matrixTransform(this.svg.getScreenCTM().inverse());
  this.gesture={q,world:mapWorld(this.center),span:this.span,distance:ps.length>1?Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y):0};
 };
 this.svg.addEventListener('pointerdown',e=>{
  e.preventDefault();this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.svg.setPointerCapture(e.pointerId);
  if(this.pointers.size===1)this.tap={x:e.clientX,y:e.clientY,feature:this.water?.find(f=>f.properties.tankCode===e.target.closest('[data-reservoir]')?.dataset.reservoir)};
  else this.tap=null;
  resetGesture();
 });
 this.svg.addEventListener('pointermove',e=>{
  if(!this.pointers.has(e.pointerId)||!this.gesture)return;
  e.preventDefault();
  this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const ps=[...this.pointers.values()];
  const mid=ps.length>1?{x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2}:ps[0];
  const q=new DOMPoint(mid.x,mid.y).matrixTransform(this.svg.getScreenCTM().inverse());
  if(ps.length>1&&this.gesture.distance)this.span=Math.max(.006,Math.min(7,this.gesture.span*this.gesture.distance/Math.max(1,Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y))));
  const anchor=[this.gesture.world[0]+(this.gesture.q.x-200)/400*this.gesture.span/360,this.gesture.world[1]+(this.gesture.q.y-150)/400*this.gesture.span/360];
  this.center=mapLonLat([anchor[0]-(q.x-200)/400*this.span/360,anchor[1]-(q.y-150)/400*this.span/360]);this.scheduleDraw();
 });
 this.svg.addEventListener('pointerup',e=>{
  if(!this.pointers.has(e.pointerId))return;
  this.pointers.delete(e.pointerId);this.draw();
  if(this.svg.hasPointerCapture(e.pointerId))this.svg.releasePointerCapture(e.pointerId);
  if(!this.pointers.size){if(!this.manual&&this.tap?.feature&&Math.hypot(e.clientX-this.tap.x,e.clientY-this.tap.y)<7)this.showReservoir(this.tap.feature);this.selectCentre();this.tap=null;}
  resetGesture();
 });
 for(const type of ['pointercancel','lostpointercapture'])this.svg.addEventListener(type,e=>{this.pointers.delete(e.pointerId);this.tap=null;resetGesture();});
 this.svg.addEventListener('keydown',e=>{const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};if(moves[e.key]){e.preventDefault();this.center=this.center.map((v,i)=>v+moves[e.key][i]*this.span*.12);this.draw();this.selectCentre();}if(e.key==='Enter'&&this.manual){e.preventDefault();this.selectCentre();}});
 }
 selectCentre(){if(this.manual&&this.features.length&&!this.error){this.onPin([...this.center]);}}

 async load(){try{this.features=(await background()).features;this.error=false;this.draw();}catch{this.error=true;this.draw();}try{if(!water)water=Promise.all([fetch('/floodlens/data/reservoir-locations.json').then(r=>r.json()),fetch('/floodlens/data/reservoirs.json',{cache:'no-store'}).then(r=>r.json())]);const [points,readings]=await water;this.water=points.features;this.readings=readings.records;this.draw();}catch{/* Context is optional; it cannot block location or warnings. */}}
 set({center,span,point,accuracy,features,labels,mode}={}){if(mode)this.mode=mode;if(center)this.center=[...center];if(span)this.span=span;if(point!==undefined)this.point=point? [...point]:null;if(accuracy!==undefined)this.accuracy=accuracy;if(features)this.features=features;if(labels)this.labels=labels;this.draw();}
 scheduleDraw(){if(!this.drawFrame)this.drawFrame=requestAnimationFrame(()=>{this.drawFrame=null;this.draw();});}
 draw(){if(this.drawFrame){cancelAnimationFrame(this.drawFrame);this.drawFrame=null;}const svg=this.svg;svg.replaceChildren();svg.setAttribute('aria-label',this.t(this.manual?'pinMapLabel':'gpsMapLabel'));if(!this.manual&&this.recenter)this.recenter.setAttribute('aria-label',this.t(this.mode==='manual'?'yourPin':'yourGps'));const world=mapWorld(this.center),scale=400/(this.span/360);const project=p=>{const w=mapWorld(p);return[200+(w[0]-world[0])*scale,150+(w[1]-world[1])*scale];};
 if(this.street){this.street.t=this.t;this.street.draw({world,scale});}
 svg.append(node('rect',{width:400,height:300,fill:streetEnabled()?'transparent':'#e9f1f0'}));
 // Only the bounded display overview is drawn. Exact DS shards never enter this path.
 for(const f of this.features){const {rings,bounds}=displayGeometry(f);const marginX=205/scale,marginY=155/scale;if(bounds[2]<world[0]-marginX||bounds[0]>world[0]+marginX||bounds[3]<world[1]-marginY||bounds[1]>world[1]+marginY)continue;let d='';for(const ring of rings){let previous;const points=[];for(const p of ring){const xy=[200+(p[0]-world[0])*scale,150+(p[1]-world[1])*scale];if(!previous||Math.hypot(xy[0]-previous[0],xy[1]-previous[1])>1.1){points.push(xy);previous=xy;}}if(points.length>=3)d+=points.map((p,i)=>(i?'L':'M')+p.map(v=>v.toFixed(1)).join(',')).join(' ')+' Z ';}if(d)svg.append(node('path',{d,fill:streetEnabled()?'none':'#f7f8f0',stroke:'#b7c9be','stroke-width':.7,'fill-rule':'evenodd'}));}
 for(const a of streetEnabled()?[]:this.labels||[]){const xy=project([(a.bbox[0]+a.bbox[2])/2,(a.bbox[1]+a.bbox[3])/2]);if(xy[0]<25||xy[0]>375||xy[1]<20||xy[1]>280)continue;const label=node('text',{x:xy[0],y:xy[1],'text-anchor':'middle',fill:'#516c65','font-size':10,'paint-order':'stroke',stroke:'#f7f8f0','stroke-width':3});label.textContent=a.label;svg.append(label);}
 for(const f of this.water||[]){const [x,y]=project(f.geometry.coordinates);if(x<0||x>400||y<0||y>300)continue;const group=node('g',{role:this.manual?'img':'button',tabindex:this.manual?-1:0,'data-reservoir':f.properties.tankCode,'aria-label':f.properties.name});group.append(node('circle',{cx:x,cy:y,r:32,fill:'transparent'}),node('circle',{cx:x,cy:y,r:6,fill:'#2d79a4',stroke:'white','stroke-width':2}));group.addEventListener('keydown',e=>{if(e.key==='Enter'){e.stopPropagation();this.showReservoir(f);}});svg.append(group);}
 if(this.point&&!this.manual){const [x,y]=project(this.point);if(Number.isFinite(this.accuracy)){const radius=this.accuracy/(111320*Math.cos(this.point[1]*Math.PI/180))/this.span*400;svg.append(node('circle',{cx:x,cy:y,r:radius,fill:'#1d6cae20',stroke:'#1d6cae70','stroke-width':1,'data-accuracy-circle':'true','pointer-events':'none'}));}svg.append(node('circle',{cx:x,cy:y,r:11,fill:'#fff',stroke:'#fff','stroke-width':4,'pointer-events':'none'}),node('circle',{cx:x,cy:y,r:8,fill:'#126b63',stroke:'#0c4943','stroke-width':1.5,'data-position-pin':'true','pointer-events':'none'}));}
 else if(this.manual){svg.append(node('circle',{cx:200,cy:150,r:13,fill:'#ffffffcc',stroke:'#126b63','stroke-width':2,'pointer-events':'none','data-centre-crosshair':'true'}),node('path',{d:'M181 150H195 M205 150H219 M200 131V145 M200 155V169',stroke:'#126b63','stroke-width':2,'pointer-events':'none'}));}
 const north=node('text',{x:378,y:22,'text-anchor':'middle',fill:'#48635b','font-size':12});north.textContent='N ↑';svg.append(north);
 const km=this.span*111.32*Math.cos(this.center[1]*Math.PI/180)/4,scaleLabel=node('text',{x:18,y:282,fill:'#48635b','font-size':10});scaleLabel.textContent=km<1?Math.round(km*1000)+' m':km.toFixed(km<10?1:0)+' km';svg.append(node('path',{d:'M18 264v5h100v-5',stroke:'#48635b',fill:'none'}),scaleLabel);
 if(this.error){const label=node('text',{x:200,y:65,'text-anchor':'middle',fill:'#516c65','font-size':13});label.textContent=this.t('mapUnavailable');svg.append(label);}
 }
 showReservoir(feature){let popup=this.root.querySelector('.map-popup');if(!popup){popup=document.createElement('div');popup.className='map-popup';this.root.append(popup);}popup.replaceChildren();const title=document.createElement('strong');title.textContent=feature.properties.name;const reading=this.readings?.find(r=>r.name===feature.properties.name);const value=document.createElement('p');value.textContent=reading?(Number.isFinite(reading.effectivePercent)?reading.effectivePercent+'% · '+this.t('storage'):'—')+' · '+(reading.observedDate||this.t('unknownDate')):this.t('unknownValue');const note=document.createElement('small');note.textContent=this.t('mapWaterNote');const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label',this.t('closeMapNote'));close.addEventListener('click',()=>popup.remove());const gates=document.createElement('p');gates.textContent=reading?gateSummary(reading,document.documentElement.lang):'';popup.append(title,value,gates,note,close);}
}

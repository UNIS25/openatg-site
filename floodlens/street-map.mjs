// Optional per-page opt-in. Normal browser caching; current viewport only.
let enabled=false,consented=false,offered=false;
const instances=new Set();
export function streetEnabled(){return enabled;}
function setEnabled(next){enabled=next;for(const item of instances)item.changed();document.dispatchEvent(new Event('floodlens-map-mode'));}
export class StreetMap{
 constructor(root,{t,redraw}){
  this.root=root;this.t=t;this.redraw=redraw;this.images=new Map();instances.add(this);
  this.layer=document.createElement('div');this.layer.className='street-tiles';root.prepend(this.layer);
  this.toggle=document.createElement('button');this.toggle.type='button';this.toggle.className='map-mode';this.toggle.addEventListener('click',()=>{if(enabled)setEnabled(false);else if(consented)setEnabled(true);else this.ask();});root.append(this.toggle);
  this.credit=document.createElement('a');this.credit.className='map-credit';this.credit.href='https://www.openstreetmap.org/copyright';this.credit.target='_blank';this.credit.rel='noopener noreferrer';this.credit.textContent='© OpenStreetMap contributors';root.append(this.credit);this.changed();
 }
 offerDefault(){if(!offered&&!consented&&!enabled){offered=true;this.ask(true);}}
 ask(defaultOffer=false){
  if(document.querySelector('.map-consent'))return;const dialog=document.createElement('dialog');dialog.className='map-consent';if(defaultOffer)dialog.dataset.defaultOffer='true';const heading=document.createElement('h2');heading.textContent=this.t('streetConsentTitle');const text=document.createElement('p');text.textContent=this.t('streetConsentBody');const allow=document.createElement('button');allow.type='button';allow.className='button';allow.textContent=this.t('streetConsentAccept');const cancel=document.createElement('button');cancel.type='button';cancel.className='text-button';cancel.textContent=this.t('streetConsentDecline');allow.addEventListener('click',()=>{consented=true;dialog.close();setEnabled(true);});cancel.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{dialog.remove();if(this.root.checkVisibility())this.toggle.focus({preventScroll:true});});dialog.append(heading,text,allow,cancel);document.body.append(dialog);dialog.showModal();
 }
 changed(){this.toggle.textContent=this.t(enabled?'privateMap':'streetMap');this.credit.hidden=!enabled;this.layer.hidden=!enabled;this.root.classList.toggle('street-enabled',enabled);if(!enabled){clearTimeout(this.timer);this.layer.replaceChildren();this.images.clear();}this.redraw();}
 draw(view){
  this.view=view;this.toggle.textContent=this.t(enabled?'privateMap':'streetMap');if(!enabled||this.root.closest('[hidden]'))return;
  for(const image of this.images.values())this.position(image);
  clearTimeout(this.timer);this.timer=setTimeout(()=>this.loadVisible(),150);
 }
 position(image){const {world,scale}=this.view,n=2**Number(image.dataset.z);const size=scale/n;image.style.left=(200+(Number(image.dataset.x)/n-world[0])*scale)/4+'%';image.style.top=(150+(Number(image.dataset.y)/n-world[1])*scale)/3+'%';image.style.width=size/4+'%';image.style.height=size/3+'%';}
 loadVisible(){
  if(!enabled||this.root.closest('[hidden]')||!this.view)return;
  const {world,scale}=this.view,z=Math.max(0,Math.min(19,Math.ceil(Math.log2(scale/256)))),n=2**z;
  const x0=Math.floor((world[0]-200/scale)*n),x1=Math.floor((world[0]+200/scale)*n),y0=Math.max(0,Math.floor((world[1]-150/scale)*n)),y1=Math.min(n-1,Math.floor((world[1]+150/scale)*n));
  if((x1-x0+1)*(y1-y0+1)>25)return;
  const wanted=new Set();for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
   const key=z+'/'+x+'/'+y;wanted.add(key);let image=this.images.get(key);
   if(!image){image=document.createElement('img');image.alt='';image.draggable=false;image.referrerPolicy='origin';image.dataset.z=z;image.dataset.x=x;image.dataset.y=y;image.addEventListener('error',()=>{if(!enabled)return;setEnabled(false);this.toggle.textContent=this.t('streetUnavailable');});this.images.set(key,image);this.position(image);this.layer.append(image);image.src='https://tile.openstreetmap.org/'+z+'/'+((x%n+n)%n)+'/'+y+'.png';}else this.position(image);
  }
  for(const [key,image] of this.images)if(!wanted.has(key)){image.remove();this.images.delete(key);}
 }
}

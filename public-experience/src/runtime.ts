// This public runtime has no network/API, account, order or payment client.
type Basket = Record<string, number>;
type Connection = EventTarget & {saveData?: boolean; effectiveType?: string};
const basketKey='v25_public_selection_v1';
const allowedProducts=new Set(['premium-black-tea-powder','green-tea-powder','cardamom-tea','cinnamon-tea','masala-tea-powder','gelber-curry-kokos']);
let basket:Basket={};
let toastTimer:ReturnType<typeof setTimeout>;
function announce(text:string) {
  const box=document.querySelector<HTMLElement>('.toast')!;
  box.textContent=text; clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{box.textContent='';},3500);
}
function sanitize(input:unknown):Basket {
  const result:Basket={};
  if(input && typeof input==='object' && !Array.isArray(input)) {
    for(const [key,value] of Object.entries(input)) if(allowedProducts.has(key)&&Number.isInteger(value)&&value>=1&&value<=20) result[key]=value;
  }
  return result;
}
try {basket=sanitize(JSON.parse(localStorage.getItem(basketKey)||'{}'));} catch { /* Optional, local-only selection. */ }
function setQuantity(group:HTMLElement,value:number) {
  group.querySelector('output')!.textContent=String(value);
  group.querySelector<HTMLButtonElement>('[data-minus]')!.disabled=value<=1;
  group.querySelector<HTMLButtonElement>('[data-plus]')!.disabled=value>=20;
}
function updateBasket() {
  const total=Object.values(basket).reduce((sum,n)=>sum+n,0);
  document.querySelectorAll('[data-basket-count]').forEach(node=>{node.textContent=String(total);});
  document.querySelectorAll<HTMLElement>('[data-bag-product]').forEach(row=>{
    const quantity=basket[row.dataset.bagProduct!];
    row.hidden=!quantity;
    if(quantity)setQuantity(row.querySelector<HTMLElement>('.quantity')!,quantity);
  });
  const empty=document.querySelector<HTMLElement>('[data-empty]'); if(empty)empty.hidden=total>0;
  const clear=document.querySelector<HTMLElement>('[data-clear]'); if(clear)clear.hidden=total===0;
}
function save() {
  updateBasket();
  try{localStorage.setItem(basketKey,JSON.stringify(basket));return true;}catch{announce(document.body.dataset.storageError!);return false;}
}
document.querySelectorAll<HTMLElement>('.quantity').forEach(group=>{
  setQuantity(group,1);
  group.addEventListener('click',event=>{
    const button=(event.target as HTMLElement).closest('button');if(!button||button.disabled)return;
    const value=Number(group.querySelector('output')!.textContent)+(button.hasAttribute('data-plus')?1:-1);
    setQuantity(group,Math.max(1,Math.min(20,value)));
    const row=group.closest<HTMLElement>('[data-bag-product]');
    if(row){basket[row.dataset.bagProduct!]=value;save();}
  });
});
document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(button=>{
  button.disabled=false;
  button.addEventListener('click',()=>{
    const card=button.closest<HTMLElement>('[data-product]')!;
    const slug=card.dataset.product!;
    const quantity=Number(card.querySelector('output')!.textContent);
    basket[slug]=Math.min(20,(basket[slug]||0)+quantity);
    if(save())announce(document.body.dataset.added!);
  });
});
document.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',()=>{
  const row=button.closest<HTMLElement>('[data-bag-product]')!;
  const next=row.nextElementSibling as HTMLElement|null;
  delete basket[row.dataset.bagProduct!];save();
  (next && !next.hidden ? next.querySelector<HTMLElement>('a') : document.querySelector<HTMLElement>('.basket-actions a'))?.focus();
}));
document.querySelector('[data-clear]')?.addEventListener('click',()=>{basket={};save();document.querySelector<HTMLElement>('.basket-actions a')?.focus();});
window.addEventListener('storage',event=>{if(event.key===basketKey){try{basket=sanitize(JSON.parse(event.newValue||'{}'));}catch{basket={};}updateBasket();}});
updateBasket();
const menuButton=document.querySelector<HTMLButtonElement>('.menu-toggle');
const menu=document.querySelector<HTMLElement>('#mobile-navigation');
menuButton?.addEventListener('click',()=>{if(menu){menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu&&!menu.hidden){menu.hidden=true;menuButton?.setAttribute('aria-expanded','false');menuButton?.focus();}});
// Filters remain ordinary navigable URLs, including direct reloads without JS.
const category=new URL(location.href).searchParams.get('category')||'all';
const selected=['tea','pantry'].includes(category)?category:'all';
document.querySelectorAll<HTMLElement>('[data-category]').forEach(node=>{node.hidden=selected!=='all'&&node.dataset.category!==selected;});
document.querySelectorAll<HTMLAnchorElement>('[data-filter]').forEach(node=>{if(node.dataset.filter===selected)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');});
const sectionAnchors=['#tea-collection','#tea-spiced','#curry-collection'];
const syncLanguageLinks=()=>document.querySelectorAll<HTMLAnchorElement>('.languages a').forEach(node=>{
  const url=new URL(node.href);
  if(location.search&&document.querySelector('.filters'))url.search=location.search;
  url.hash=sectionAnchors.includes(location.hash)?location.hash:'';
  node.href=url.href;
});
syncLanguageLinks();window.addEventListener('hashchange',syncLanguageLinks);
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const compact=matchMedia('(max-width: 700px)');
const connection=(navigator as Navigator & {connection?:Connection}).connection;
document.querySelectorAll<HTMLElement>('[data-film]').forEach(box=>{
  const video=box.querySelector('video')!;
  const button=box.querySelector<HTMLButtonElement>('.film-control button')!;
  const still=box.querySelector<HTMLElement>('.still-label')!;
  const gateway=box.dataset.film==='gateway';
  let inView=gateway, userPaused=false, failed=false, autoplayBlocked=false;
  const eligible=()=>!failed&&!motion.matches&&!connection?.saveData&&!['slow-2g','2g','3g'].includes(connection?.effectiveType||'');
  const control=()=>{
    const playing=!video.paused&&!video.ended;
    // Show Pause after automatic playback starts. A Play prompt appears only
    // after a deliberate pause or an actual browser autoplay rejection.
    button.hidden=!eligible()||(!playing&&box.dataset.started!=='true'&&!autoplayBlocked&&!userPaused);
    still.hidden=eligible();
    button.setAttribute('aria-label',button.dataset[playing?'pause':'play']!);
    button.querySelector('[data-icon-play]')!.setAttribute('display',playing?'none':'inline');
    button.querySelector('[data-icon-pause]')!.setAttribute('display',playing?'inline':'none');
    box.dataset.playing=String(playing);
  };
  const play=()=>{void video.play().then(()=>{autoplayBlocked=false;control();}).catch(error=>{if(error?.name==='NotAllowedError')autoplayBlocked=true;control();});};
  const sync=()=>{
    const allowed=eligible();
    if(!allowed){video.pause();box.dataset.started='false';if(video.hasAttribute('src')){video.removeAttribute('src');video.load();}control();return;}
    if(!inView||document.hidden||userPaused){video.pause();control();return;}
    const source=compact.matches?box.dataset.mobile!:box.dataset.desktop!;
    if(video.getAttribute('src')!==source){box.dataset.started='false';video.src=source;video.load();}
    control();
    if(!autoplayBlocked)play();
  };
  video.muted=true;video.defaultMuted=true;
  if(gateway){video.autoplay=true;video.preload='auto';}
  video.addEventListener('playing',()=>{box.dataset.started='true';control();});
  video.addEventListener('pause',control);
  video.addEventListener('error',()=>{if(video.hasAttribute('src')){failed=true;sync();}});
  button.addEventListener('click',()=>{
    userPaused=!video.paused;
    if(userPaused)video.pause();else{
      if(!video.hasAttribute('src'))video.src=compact.matches?box.dataset.mobile!:box.dataset.desktop!;
      play();
    }
  });
  if('IntersectionObserver' in window){new IntersectionObserver(([entry])=>{inView=entry.isIntersecting&&entry.intersectionRatio>=.12;sync();},{threshold:[0,.12]}).observe(box);}else{inView=box.dataset.film==='gateway'||box.dataset.film==='highlands';sync();}
  motion.addEventListener('change',sync);compact.addEventListener('change',sync);connection?.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  if(gateway){video.addEventListener('canplay',sync);window.addEventListener('pageshow',sync);}
  sync();
});

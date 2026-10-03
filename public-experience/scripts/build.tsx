import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copy, locales, link, base, type Locale } from '../src/copy';

const repo = resolve('..');
const output = resolve('out', base.slice(1));
rmSync(resolve('out'), {recursive: true, force: true});
mkdirSync(output, {recursive: true});
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const files: Record<string, string> = {};
function write(name: string, bytes: Buffer | string) {
  const dest = resolve(output, name);
  if (!dest.startsWith(output + '/')) throw Error('Output boundary');
  mkdirSync(dirname(dest), {recursive: true});
  writeFileSync(dest, bytes);
  files[name] = hash(bytes);
}
function asset(source: string, name = basename(source)) {
  const bytes = readFileSync(source);
  const dot = name.lastIndexOf('.');
  const target = `media/${name.slice(0, dot)}.${hash(bytes).slice(0, 12)}${name.slice(dot)}`;
  write(target, bytes);
  return `${base}/${target}`;
}
const media = (name: string) => asset(resolve('media', name));
const logo = asset(resolve(repo, 'platform/public/varathans25/brand/varathans25-transparent.png'));
const favicon = {svg: media('favicon.svg'), ico: media('favicon.ico'), apple: media('apple-touch-icon.png')};
const font = asset(resolve(repo, 'platform/public/varathans25/fonts/inter-latin.woff2'));
const gateway = {desktop: media('gateway-1920.mp4'), mobile: media('gateway-1280.mp4'), poster: media('gateway-poster.webp')};
const films = Object.fromEntries(['highlands', 'tea', 'kitchen'].map(name => [name, {
  desktop: asset(resolve(repo, `platform/public/varathans25/visual-reset/${name}-1600.mp4`)),
  mobile: asset(resolve(repo, `platform/public/varathans25/visual-reset/${name}-mobile.mp4`)),
  poster: asset(resolve(repo, `platform/public/varathans25/visual-reset/${name}-poster.webp`)),
}]));
const hospitality = Object.fromEntries(['dining-interior', 'bar-evening', 'rooftop-panorama'].map(name => [name, asset(resolve(repo, `platform/public/varathans25/images/restaurant/${name}.webp`))]));
type Product = {slug: string; category: string; image: string; translations: {locale: string; name: string}[]};
const source: Product[] = JSON.parse(readFileSync(resolve(repo, 'platform/src/data/catalogue.json'), 'utf8'));
const products = source.map(p => ({slug:p.slug, category:p.category, translations:p.translations.map(t=>({locale:t.locale, name:t.name})), image:asset(resolve(repo, 'platform/public', p.image.slice(1)))}));
if (products.length !== 6 || products.filter(p=>p.category==='tea').length !== 5) throw Error('Approved catalogue changed');
// Only supplied, verified food-label information is eligible. No sample price,
// stock, account, entitlement or order fixture is serialized into this export.
const shell = JSON.parse(readFileSync(resolve(repo, 'editorial/src/data/shell.json'), 'utf8'));
const curry = shell.products.find((p: {slug: string; verification: string}) => p.slug==='gelber-curry-kokos' && p.verification==='VERIFIED');
if (!curry || curry.weight !== '80 g') throw Error('Verified curry label missing');
const css = asset(resolve('src/style.css'));
const runtime = asset(resolve('.compiled/runtime.js'));
type Film = typeof gateway;
const Arrow = ({back=false}: {back?:boolean}) => <svg aria-hidden="true" className={`arrow${back?' arrow-back':''}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={back?'M20 12H4m6-6-6 6 6 6':'M5 19 19 5M5 5h14v14'}/></svg>;
const name = (p: Product, locale: Locale) => p.translations.find(t=>t.locale===locale)!.name;
function Languages({locale, route}: {locale: Locale; route: string}) {
  return <nav className="languages" aria-label={copy[locale].language}>{locales.map(l=><a key={l} href={link(l,route)} lang={l} aria-label={{de:'Deutsch',fr:'Français',en:'English'}[l]} aria-current={l===locale?'page':undefined}>{l.toUpperCase()}</a>)}</nav>;
}
function FilmView({film, locale, hero=false, id}: {film:Film; locale:Locale; hero?:boolean; id:string}) {
  return <div className="film-media" data-film={id} data-desktop={film.desktop} data-mobile={film.mobile}>
    <img className="film-poster" src={film.poster} width="1920" height="1080" loading={hero?'eager':'lazy'} fetchPriority={hero?'high':'auto'} alt=""/>
    <video id={`film-${id}`} muted playsInline loop autoPlay={id==='gateway'} preload={id==='gateway'?'auto':'none'} aria-hidden="true" tabIndex={-1}/>
    <div className="film-shade"/>
    <div className="film-control"><span className="still-label">{copy[locale].still}</span><button type="button" hidden aria-controls={`film-${id}`} aria-label={copy[locale].play} data-play={copy[locale].play} data-pause={copy[locale].pause}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path data-icon-play d="m8 5 11 7-11 7Z"/><path data-icon-pause display="none" d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg></button></div>
  </div>;
}
function Header({locale, route}: {locale:Locale; route:string}) {
  const c=copy[locale];
  return <header className="site-header"><div className="header-inner container">
    <a className="logo" href={link(locale)} aria-label="Varathans25"><img src={logo} alt="Varathans25" width="368" height="200"/></a>
    <nav className="desktop-nav" aria-label={c.navigation}><a href={link(locale,'store')} aria-current={route==='store'?'page':undefined}>{c.store}</a><a href={link(locale,'shop')} aria-current={route==='shop'?'page':undefined}>{c.catalogue}</a><a href={link(locale,'club')}>{c.member}</a></nav>
    <div className="header-tools"><Languages locale={locale} route={route}/><a className="account-link" href={link(locale,'account')} aria-label={c.account}><span aria-hidden="true">◯</span><span className="tool-text">{c.account}</span></a><a className="basket-link" href={link(locale,'bag')}>{c.basket}<span data-basket-count aria-label={c.quantity}>0</span></a><button type="button" className="menu-toggle" aria-expanded="false" aria-controls="mobile-navigation">{c.menu}<span aria-hidden="true">☰</span></button></div>
  </div><nav id="mobile-navigation" className="mobile-nav container" hidden aria-label={c.navigation}><a href={link(locale,'store')}>{c.store}</a><a href={link(locale,'shop')}>{c.catalogue}</a><a href={link(locale,'club')}>{c.member}</a><a href={link(locale,'account')}>{c.account}</a></nav></header>;
}
function Footer({locale}: {locale:Locale}) {
  const c=copy[locale];
  return <footer className="site-footer"><div className="container footer-grid"><div><a href={link(locale)} className="footer-logo"><img src={logo} alt="Varathans25" width="368" height="200"/></a><p>VARATHANS25 · SURSEE</p></div><nav aria-label={c.footer}><a href={link(locale,'store')}>{c.store}</a><a href={link(locale,'club')}>{c.member}</a><a href={link(locale,'privacy')}>{c.privacy}</a><a href={link(locale,'legal')}>{c.legal}</a></nav><p className="release-note">{c.notice}</p></div></footer>;
}
function Quantity({locale, value=1}: {locale:Locale;value?:number}) {
  const c=copy[locale];
  return <div className="quantity" role="group" aria-label={c.quantity}><button type="button" data-minus aria-label={c.minus} disabled>−</button><output aria-live="polite">{value}</output><button type="button" data-plus aria-label={c.plus} disabled>+</button></div>;
}
function Card({p,locale,detail=false}: {p:Product;locale:Locale;detail?:boolean}) {
  const c=copy[locale]; const title=name(p,locale);
  return <article className={`product-card${detail?' detail':''}`} data-product={p.slug}>
    <a className="product-photo" href={link(locale,`product/${p.slug}`)} aria-label={title}><img src={p.image} alt={title} width="640" height="640" loading={detail?'eager':'lazy'}/></a>
    <div className="product-copy"><p className="eyebrow">VARATHANS25 · {p.category==='tea'?c.tea:c.curry}</p>{detail?<h1>{title}</h1>:<h3><a href={link(locale,`product/${p.slug}`)}>{title}</a></h3>}<p className="variant">{c.pending}</p><p className="weight">{c.weight}: {p.slug==='gelber-curry-kokos'?'80 g':'—'}</p><div className="price">{c.price}</div><p className="stock">{c.stock}</p><div className="purchase-row"><Quantity locale={locale}/><button type="button" className="button add" disabled data-add data-added={c.added}>{c.add}<Arrow/></button></div><a className="detail-link" href={link(locale,`product/${p.slug}`)}>{c.details}<Arrow/></a></div>
  </article>;
}
function Gateway({locale, route}: {locale:Locale;route:string}) {
  const c=copy[locale];
  return <main id="content" className="gateway"><FilmView film={gateway} locale={locale} hero id="gateway"/><header className="gateway-header"><span className="eyebrow">VARATHANS25 · SURSEE</span><div><Languages locale={locale} route={route}/><a className="gateway-account" href={link(locale,'login')}>{c.login}<Arrow/></a></div></header><div className="gateway-copy"><a className="gateway-logo" href={link(locale)} aria-label="Varathans25"><img src={logo} alt="Varathans25" width="368" height="200"/></a><h1>{c.title}</h1><nav className="destinations" aria-label={c.destinations}><a className="button light" href={link(locale,'store')}>{c.store}<Arrow/></a><a className="button outline" href={link(locale,'club')}>{c.club}<Arrow/></a></nav></div><div className="gateway-bottom"><span>{c.filmNote}</span></div></main>;
}
function Store({locale}: {locale:Locale}) {
  const c=copy[locale];
  const teaGroup=(slugs:string[])=>slugs.map(slug=>products.find(p=>p.slug===slug)!);
  return <><section className="film-chapter store-hero"><FilmView film={films.highlands} locale={locale} hero id="highlands"/><div className="film-copy"><p className="eyebrow">01 / VARATHANS25 · {c.store}</p><h1>{c.storeTitle}</h1><p>{c.storeText}</p><a className="film-link" href="#tea-collection">{c.tea}<Arrow/></a></div></section>
    <section className="section container tea-section" id="tea-collection"><div className="chapter-heading"><div><p className="eyebrow">02 / VARATHANS25 · {c.tea}</p><h2>{c.teaTitle}</h2></div><div><p>{c.teaText}</p><a className="editorial-link" href={`${link(locale,'shop')}?category=tea`}>{c.catalogue}<Arrow/></a></div></div><div className="product-grid tea-grid tea-pair">{teaGroup(['premium-black-tea-powder','green-tea-powder']).map(p=><Card key={p.slug} p={p} locale={locale}/>)}</div></section>
    <section className="film-chapter pouring"><FilmView film={films.tea} locale={locale} id="tea"/><div className="film-copy"><p className="eyebrow">03 / VARATHANS25</p><h2>{c.pourTitle}</h2><p>{c.pourText}</p><a className="film-link" href="#tea-spiced">{c.tea}<Arrow/></a></div></section>
    <section className="section container tea-section" id="tea-spiced"><p className="eyebrow">04 / VARATHANS25 · {c.tea}</p><div className="product-grid tea-grid tea-trio">{teaGroup(['masala-tea-powder','cinnamon-tea','cardamom-tea']).map(p=><Card key={p.slug} p={p} locale={locale}/>)}</div></section>
    <section className="film-chapter spices"><FilmView film={films.kitchen} locale={locale} id="kitchen"/><div className="film-copy"><p className="eyebrow">05 / VARATHANS25</p><h2>{c.spiceTitle}</h2><p>{c.spiceText}</p><a className="film-link" href="#curry-collection">{c.curry}<Arrow/></a></div></section>
    <section className="curry-section" id="curry-collection"><div className="container curry-layout"><div><p className="eyebrow">06 / VARATHANS25 · CURRY</p><h2>{c.curryTitle}</h2><p>{c.curryText}</p></div><Card p={products.find(p=>p.slug==='gelber-curry-kokos')!} locale={locale}/></div></section>
    <section className="restaurant-closing"><img src={hospitality['dining-interior']} alt={c.restaurantText} width="768" height="1024" loading="lazy"/><div><p className="eyebrow">07 / VARATHANS25 · RESTAURANT</p><h2>{c.restaurantTitle}</h2><p>{c.restaurantText}</p><a className="editorial-link" href="https://www.varathans25.ch/" target="_blank" rel="noopener noreferrer">{c.restaurant}<Arrow/></a></div></section></>;
}
function Catalogue({locale}: {locale:Locale}) {
  const c=copy[locale];
  return <section className="container section catalogue"><p className="eyebrow">VARATHANS25 · {c.store}</p><div className="catalogue-heading"><h1>{c.catalogue}</h1><p>{c.basketNote}</p></div><nav className="filters" aria-label={c.catalogue}><a href={link(locale,'shop')} data-filter="all" aria-current="page">{c.all}</a><a href={`${link(locale,'shop')}?category=tea`} data-filter="tea">{c.tea}</a><a href={`${link(locale,'shop')}?category=pantry`} data-filter="pantry">{c.curry}</a></nav><div className="product-grid">{products.map(p=><div data-category={p.category} key={p.slug}><Card p={p} locale={locale}/></div>)}</div></section>;
}
function ProductPage({locale,slug}: {locale:Locale;slug:string}) {
  const c=copy[locale]; const p=products.find(p=>p.slug===slug)!;
  const facts = curry.translations.find((t:{locale:string})=>t.locale===locale);
  return <section className="container section product-page"><a className="back-link" href={link(locale,'shop')}><Arrow back/>{c.back}</a><Card p={p} locale={locale} detail/><section className="product-facts"><h2>{c.facts}</h2>{slug==='gelber-curry-kokos'?<dl>{(['ingredients','allergens','preparation'] as const).filter(key=>facts[key]).map(key=><div key={key}><dt>{c[key]}</dt><dd>{facts[key]}</dd></div>)}</dl>:<p>{c.noFacts}</p>}</section></section>;
}
function Bag({locale}: {locale:Locale}) {
  const c=copy[locale];
  return <section className="container section basket-page"><p className="eyebrow">VARATHANS25</p><h1>{c.selection}</h1><p className="service-note">{c.basketNote}</p><p data-empty>{c.empty}</p><div className="basket-lines">{products.map(p=><article key={p.slug} data-bag-product={p.slug} hidden><a href={link(locale,`product/${p.slug}`)}><img src={p.image} alt={name(p,locale)} width="120" height="120"/></a><div><h2><a href={link(locale,`product/${p.slug}`)}>{name(p,locale)}</a></h2><p>{c.price}</p></div><Quantity locale={locale}/><button type="button" data-remove>{c.remove}</button></article>)}</div><div className="basket-actions"><a className="button" href={link(locale,'shop')}>{c.continue}<Arrow/></a><button type="button" data-clear hidden>{c.clear}</button></div></section>;
}
function Club({locale}: {locale:Locale}) {
  const c=copy[locale];
  return <><section className="hospitality-hero"><img src={hospitality['bar-evening']} alt="" width="768" height="1024"/><div className="hospitality-copy"><p className="eyebrow">VARATHANS25 · {c.member}</p><h1>{c.clubTitle}</h1><p>{c.clubText}</p><a className="button light" href={link(locale,'login')}>{c.login}<Arrow/></a></div></section><section className="container section club-links"><div><p className="eyebrow">VARATHANS25</p><h2>{c.serviceTitle}</h2><p>{c.service}</p></div><nav aria-label={c.account}><a href={link(locale,'account')}>{c.account}<Arrow/></a><a href={link(locale,'membership')}>{c.membership}<Arrow/></a><a href={link(locale,'login')}>{c.login}<Arrow/></a></nav></section></>;
}
function Account({locale,route}: {locale:Locale;route:string}) {
  const c=copy[locale];
  const heading=route==='account'?c.account:route==='membership'?c.membership:route==='recovery'?c.recovery:c.login;
  return <section className="account-layout"><div className="account-picture"><img src={hospitality['rooftop-panorama']} width="1536" height="864" alt=""/></div><div className="account-copy"><p className="eyebrow">VARATHANS25 · {c.member}</p><h1>{heading}</h1><nav className="account-tabs" aria-label={c.account}>{(['login','account','membership'] as const).map(r=><a key={r} href={link(locale,r)} aria-current={route===r?'page':undefined}>{c[r]}</a>)}</nav><div className="service-note"><h2>{c.serviceTitle}</h2><p>{c.service}</p>{route==='membership'&&<p>{c.memberText}</p>}</div><a className="button" href="https://www.varathans25.ch/" target="_blank" rel="noopener noreferrer">{c.contact}<Arrow/></a><div className="account-secondary"><a href={link(locale,'recovery')}>{c.recovery}</a><a href={link(locale,'privacy')}>{c.privacy}</a></div></div></section>;
}
function DocumentPage({locale,route}: {locale:Locale;route:'privacy'|'legal'}) {
  const c=copy[locale];
  return <section className="container section text-page"><p className="eyebrow">VARATHANS25</p><h1>{c[route]}</h1><p>{route==='privacy'?c.privacyText:c.legalText}</p><a className="editorial-link" href={link(locale,'store')}>{c.store}<Arrow/></a></section>;
}
const routes=['','store','shop','bag','club','login','account','membership','recovery','privacy','legal',...products.map(p=>`product/${p.slug}`)];
const csp="default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; upgrade-insecure-requests";
function page(locale:Locale,route:string,root=false) {
  const c=copy[locale];
  const isGateway=route==='';
  const pageTitles: Record<string,string> = {store:c.store,shop:c.catalogue,bag:c.basket,club:c.member,login:c.login,account:c.account,membership:c.membership,recovery:c.recovery,privacy:c.privacy,legal:c.legal};
  const pageTitle=isGateway?c.title:route.startsWith('product/')?name(products.find(p=>p.slug===route.split('/')[1])!,locale):pageTitles[route];
  const content=isGateway?<Gateway locale={locale} route={route}/>:route==='store'?<Store locale={locale}/>:route==='shop'?<Catalogue locale={locale}/>:route==='bag'?<Bag locale={locale}/>:route==='club'?<Club locale={locale}/>:['login','account','membership','recovery'].includes(route)?<Account locale={locale} route={route}/>:route.startsWith('product/')?<ProductPage locale={locale} slug={route.split('/')[1]}/>:<DocumentPage locale={locale} route={route as 'privacy'|'legal'}/>;
  const markup=renderToStaticMarkup(<html lang={locale}><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/><meta httpEquiv="Content-Security-Policy" content={csp}/><meta name="robots" content="noindex, nofollow, noarchive"/><meta name="referrer" content="no-referrer"/><meta name="theme-color" content="#102c44"/><title>{`Varathans25 · ${pageTitle}`}</title><link rel="icon" type="image/svg+xml" href={favicon.svg}/><link rel="icon" type="image/x-icon" sizes="16x16 32x32 48x48" href={favicon.ico}/><link rel="apple-touch-icon" sizes="180x180" href={favicon.apple}/><link rel="preload" href={font} as="font" type="font/woff2" crossOrigin="anonymous"/><link rel="stylesheet" href={css}/><style>{''}</style></head><body data-locale={locale} data-added={c.added} data-storage-error={c.browserStorage} className={isGateway?'gateway-body':''}><a className="skip-link" href="#content">{c.skip}</a>{!isGateway&&<Header locale={locale} route={route}/ >}{isGateway?content:<main id="content">{content}</main>}{!isGateway&&<Footer locale={locale}/>}<div className="toast" role="status" aria-live="polite"/><script src={runtime} type="module" defer/></body></html>);
  write(root?'index.html':`${locale}/${route?route+'/':''}index.html`, '<!DOCTYPE html>\n'+markup.replace('<style></style>',''));
}
// Inject only a content-addressed font URL into the stylesheet, never an inline style.
// CSS has its own deterministic cache identity.
const originalCSS=readFileSync(resolve('src/style.css'),'utf8');
const resolvedCSS=originalCSS.replace('FONT_URL',font);
const finalCssPath=css.slice(base.length+1);
write(finalCssPath, resolvedCSS);
// Re-key after font substitution so all asset names reflect their exact bytes.
const finalCssName=`media/style.${hash(resolvedCSS).slice(0,12)}.css`;
write(finalCssName,resolvedCSS);
for (const locale of locales) for (const route of routes) page(locale,route);
page('de','',true);
// Update the stylesheet reference after serializing pages.
for (const path of Object.keys(files).filter(p=>p.endsWith('.html'))) {
  write(path,readFileSync(resolve(output,path),'utf8').replace(css,`${base}/${finalCssName}`));
}
rmSync(resolve(output,finalCssPath)); delete files[finalCssPath];
write('release.json', JSON.stringify({schema:1,sourceBase:'54b0203b11460f425d985040f8e66b5343b00b65',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),routes:locales.flatMap(l=>routes.map(r=>link(l,r))),gateway,files},null,2)+'\n');
if (!existsSync(resolve(output,'de/store/index.html'))) throw Error('Store missing');
console.log(`Built ${locales.length*routes.length+1} public pages; ${Object.keys(files).length} files, isolated at ${base}/.`);

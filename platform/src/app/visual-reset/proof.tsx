'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import s from './proof.module.css';

const media = '/varathans25/visual-reset';
const images = '/varathans25/images';
const logo = '/varathans25/brand/varathans25-original.png';
type Connection = { saveData?: boolean; effectiveType?: string; addEventListener?: (name: string, listener: () => void) => void; removeEventListener?: (name: string, listener: () => void) => void };

// Films are genuine camera footage. No animated stills or synthetic frames.
// Source assignment happens only when a chapter occupies the viewport.
function Film({ name, description, paused, onPause }: { name: string; description: string; paused: boolean; onPause: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [permitted, setPermitted] = useState(false);
  const [source, setSource] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const update = () => setPermitted(!motion.matches && !connection?.saveData && !['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? ''));
    update();
    motion.addEventListener('change', update);
    connection?.addEventListener?.('change', update);
    return () => { motion.removeEventListener('change', update); connection?.removeEventListener?.('change', update); };
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.56), { threshold: [0, 0.56, 1] });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (visible && permitted && !source) setSource(`${media}/${name}-${matchMedia('(max-width: 700px)').matches ? 'mobile' : 1600}.mp4`);
  }, [visible, permitted, name, source]);
  useEffect(() => {
    const video = player.current;
    if (!video) return;
    const update = () => {
      if (!visible || !permitted || paused || document.hidden || failed) video.pause();
      else if (source) void video.play().catch(() => setPlaying(false));
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => { document.removeEventListener('visibilitychange', update); video.pause(); };
  }, [visible, permitted, paused, source, failed]);
  return <div ref={container} className={s.film} data-film={name}>
    <img className={s.poster} src={`${media}/${name}-poster.webp`} alt={description} width="1600" height="900" fetchPriority={name === 'highlands' ? 'high' : 'auto'} loading={name === 'highlands' ? 'eager' : 'lazy'} />
    {!failed && <video ref={player} className={s.video} src={source} poster={`${media}/${name}-poster.webp`} muted playsInline loop preload="none" aria-hidden="true" tabIndex={-1} onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false); }} />}
    <div className={s.filmShade} />
    <div className={s.filmControls}>
      <span>{permitted && !failed ? 'SILENT FILM' : 'STILL EDITION'}</span>
      {permitted && !failed && <button type="button" onClick={onPause} aria-label={paused ? 'Play films' : 'Pause films'} aria-pressed={paused}>
        <span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span>
      </button>}
    </div>
  </div>;
}

function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex=\"0\"]'));
  const first = items[0];
  const last = items.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

const teas = [
  ['premium-black-tea-powder', 'Premium Black Tea Powder', '01'],
  ['green-tea-powder', 'Green Tea Powder', '02'],
  ['masala-tea-powder', 'Masala Tea Powder', '03'],
  ['cinnamon-tea', 'Cinnamon Tea', '04'],
  ['cardamom-tea', 'Cardamom Tea', '05'],
];

export default function VisualProof() {
  const [paused, setPaused] = useState(false);
  const [invitationOpen, setInvitationOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const menu = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const menuDestination = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = 'en';
    return () => { document.documentElement.lang = previous; };
  }, []);
  useEffect(() => {
    document.body.classList.toggle(s.locked, invitationOpen || menuOpen);
    return () => document.body.classList.remove(s.locked);
  }, [invitationOpen, menuOpen]);
  function openInvitation() {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.showModal();
    setInvitationOpen(true);
  }
  function closeInvitation() {
    dialog.current?.close();
  }
  function closeMenu() { menu.current?.close(); }
  function selectChapter(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    menuDestination.current = document.getElementById(event.currentTarget.hash.slice(1));
    history.replaceState(null, '', event.currentTarget.hash);
    closeMenu();
  }
  function finishMenuClose() {
    setMenuOpen(false);
    const destination = menuDestination.current;
    menuDestination.current = null;
    requestAnimationFrame(() => {
      if (destination) {
        destination.scrollIntoView();
        destination.setAttribute('tabindex', '-1');
        destination.focus({ preventScroll: true });
      } else menuTrigger.current?.focus({ preventScroll: true });
    });
  }
  const halt = paused || invitationOpen || menuOpen;
  return <div className={s.proof}>
    <a className={s.skip} href="#introduction">Skip to the story</a>
    <header className={s.navigation}>
      <button ref={menuTrigger} className={s.menuButton} onClick={() => { menu.current?.showModal(); setMenuOpen(true); }} aria-label="Open navigation" aria-haspopup="dialog" aria-expanded={menuOpen}><span className={s.menuIcon} aria-hidden="true"><i /><i /></span> <span>Explore</span></button>
      <a className={s.navCollection} href="#collection">The collection</a>
      <div className={s.navRight}><button onClick={openInvitation} aria-haspopup="dialog">Private club <span className={s.adultInline}>18+</span></button><span className={s.language}>EN</span></div>
    </header>
    <main>
      <section className={`${s.chapter} ${s.hero}`} aria-labelledby="opening-title">
        <Film name="highlands" description="Genuine aerial footage of green tea-covered hills in Sri Lanka; licensed stock study." paused={halt} onPause={() => setPaused(!paused)} />
        <div className={s.heroContent}>
          <div className={s.logoPlate}><img src={logo} width="368" height="200" alt="Varathans25" /></div>
          <p className={s.kicker}>A sense of place. A slower pace.</p>
          <h1 id="opening-title">The art of<br /><em>taking time.</em></h1>
          <div className={s.heroActions}><a href="#collection">Discover the collection <span aria-hidden="true">↗</span></a><button onClick={openInvitation}>Enter the private club · 18+ <span aria-hidden="true">↗</span></button></div>
        </div>
        <div className={s.chapterFoot}><span>01 <span className={s.footRule} /> The Highlands</span><a href="#introduction" aria-label="Scroll to the introduction">Scroll to discover <span aria-hidden="true">↓</span></a></div>
      </section>
      <section id="introduction" className={s.introduction} aria-labelledby="intro-title">
        <p className={s.overline}>The Varathans25 journal</p>
        <h2 id="intro-title">Some things deserve<br /><em>your undivided attention.</em></h2>
        <p>A pot of tea. A carefully laid table. An evening with nowhere to rush.<br className={s.desktopBreak} /> A world of small rituals, presented by Varathans25 in Switzerland.</p>
        <span className={s.smallRule} />
      </section>
      <section id="tea" className={`${s.chapter} ${s.teaChapter}`} aria-labelledby="tea-title">
        <Film name="tea" description="Tea pours slowly into a glass vessel in warm light; licensed stock preparation study." paused={halt} onPause={() => setPaused(!paused)} />
        <div className={s.chapterCopy}><p className={s.kicker}>02 / The Art of Tea</p><h2 id="tea-title">Let the moment<br /><em>unfold.</em></h2><p>Water. Leaves. A little time.</p><a href="#collection" className={s.textLink}>Meet the tea collection <span aria-hidden="true">↗</span></a></div>
      </section>
      <section id="collection" className={s.collection} aria-labelledby="collection-title">
        <div className={s.collectionHeading}><div><p className={s.overline}>The tea collection</p><h2 id="collection-title">Five expressions.<br /><em>One daily ritual.</em></h2></div><p>Tea, in its own time.<br />Discover the Varathans25 collection.</p></div>
        <div className={s.tins}>{teas.map(([slug, name, number]) => <figure key={slug}><div className={s.tinImage}><img src={`${images}/varathans25-${slug}-640.webp`} alt={name} width="640" height="640" loading="lazy" /></div><figcaption><span>{number}</span><h3>{name}</h3></figcaption></figure>)}</div>
        <p className={s.collectionNote}>A private visual presentation. Product ordering is not part of this prototype.</p>
      </section>
      <section id="kitchen" className={`${s.chapter} ${s.kitchenChapter}`} aria-labelledby="kitchen-title">
        <Film name="kitchen" description="A stone pestle turns spices in a mortar; licensed stock kitchen study, not a product-ingredient claim." paused={halt} onPause={() => setPaused(!paused)} />
        <div className={s.chapterCopy}><p className={s.kicker}>03 / The Varathans25 Kitchen</p><h2 id="kitchen-title">In the details,<br /><em>the character.</em></h2><p>A closer look at the rhythm of preparation.</p></div>
      </section>
      <section className={s.pantry} aria-labelledby="pantry-title"><div className={s.pantryImage}><img src={`${images}/gelber-curry-kokos-640.webp`} alt="The existing Gelber Curry Kokos product" width="640" height="640" loading="lazy" /></div><div><p className={s.overline}>From the pantry</p><h2 id="pantry-title">The kitchen’s<br /><em>signature.</em></h2><p>Gelber Curry Kokos</p><span className={s.smallRule} /></div></section>
      <section id="after-dark" className={`${s.chapter} ${s.nightChapter}`} aria-labelledby="night-title">
        <Film name="evening" description="A candle flickers on a table at night; licensed stock atmosphere, not footage of the Varathans25 venue." paused={halt} onPause={() => setPaused(!paused)} />
        <div className={s.chapterCopy}><p className={s.kicker}>04 / After Dark</p><h2 id="night-title">As the light<br /><em>changes.</em></h2><p>Restaurant spaces. Evening light. A quieter register.</p><button className={s.textLink} onClick={openInvitation}>Club account information · 18+ <span aria-hidden="true">↗</span></button></div>
      </section>
      <section className={s.venue} aria-labelledby="venue-title"><div className={s.venueText}><p className={s.overline}>The restaurant</p><h2 id="venue-title">A place<br /><em>to return to.</em></h2><p>Varathans25, Switzerland.</p><p className={s.venueNote}>The restaurant photograph is an existing Varathans25 project image. The films above are licensed stock studies for this private visual review.</p></div><img src={`${images}/restaurant/bar-evening.webp`} alt="The Varathans25 bar with navy seating and warm pendant lights" width="768" height="1024" loading="lazy" /></section>
    </main>
    <footer className={s.footer}><img src={logo} width="184" height="100" alt="Varathans25" /><p>Private visual direction · Not a live shop</p><p>Genuine filmed stock studies. No transaction or verification occurs on this page.</p><a href="#opening-title">Back to the beginning ↑</a></footer>
    <dialog ref={dialog} onKeyDown={containFocus} className={s.invitation} aria-labelledby="invitation-title" aria-describedby="invitation-description" aria-modal="true" onCancel={() => setInvitationOpen(false)} onClose={() => { setInvitationOpen(false); trigger.current?.focus(); }} onClick={(event) => { if (event.target === event.currentTarget) closeInvitation(); }}>
      <div className={s.invitationGrid}>
        <div className={s.invitationImage}><img src={`${images}/restaurant/bar-evening.webp`} alt="Warm light and navy seating at the Varathans25 restaurant" width="768" height="1024" /><div><span>Varathans25</span><p>The restaurant, Switzerland</p></div></div>
        <div className={s.invitationPanel}>
          <button className={s.close} type="button" onClick={closeInvitation} aria-label="Close club invitation" autoFocus>×</button>
          <div className={s.modalLogo}><img src={logo} width="184" height="100" alt="Varathans25" /></div>
          <p className={s.invitationEyebrow}><span>18+</span> Account registration</p>
          <h2 id="invitation-title">VARATHANS25<br /><span>PREMIUM CIGAR CLUB</span></h2>
          <div className={s.goldRule} />
          <p id="invitation-description">Accounts are available to adults aged 18 and over. Registration and approved identity verification are separate steps.</p>
          <a className={s.join} href="/en/register">Join &amp; verify 18+ <span aria-hidden="true">↗</span></a>
          <a className={s.signIn} href="/en/login">Already a member? Sign in</a>
          <p className={s.invitationLegal}>Registration does not verify age. This private prototype does not offer tobacco purchases. Privacy and membership terms apply to the existing account journey.</p>
        </div>
      </div>
    </dialog>
    <dialog ref={menu} onKeyDown={containFocus} className={s.menuDialog} aria-modal="true" aria-labelledby="menu-title" onCancel={() => setMenuOpen(false)} onClose={finishMenuClose}>
      <button className={s.menuClose} onClick={closeMenu} aria-label="Close navigation" autoFocus>×</button><img src={logo} width="184" height="100" alt="Varathans25" /><h2 id="menu-title">Explore</h2>
      <nav aria-label="Prototype chapters"><a href="#opening-title" onClick={selectChapter}>The Highlands <span>01</span></a><a href="#tea" onClick={selectChapter}>The Art of Tea <span>02</span></a><a href="#collection" onClick={selectChapter}>The collection <span>↗</span></a><a href="#kitchen" onClick={selectChapter}>The Kitchen <span>03</span></a><a href="#after-dark" onClick={selectChapter}>After Dark <span>04</span></a></nav><p>Private visual review · English proof</p>
    </dialog>
  </div>;
}

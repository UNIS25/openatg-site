"use strict";
const basketKey = 'v25_public_selection_v1';
const allowedProducts = new Set(['premium-black-tea-powder', 'green-tea-powder', 'cardamom-tea', 'cinnamon-tea', 'masala-tea-powder', 'gelber-curry-kokos']);
let basket = {};
let toastTimer;
function announce(text) {
    const box = document.querySelector('.toast');
    box.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.textContent = ''; }, 3500);
}
function sanitize(input) {
    const result = {};
    if (input && typeof input === 'object' && !Array.isArray(input)) {
        for (const [key, value] of Object.entries(input))
            if (allowedProducts.has(key) && Number.isInteger(value) && value >= 1 && value <= 20)
                result[key] = value;
    }
    return result;
}
try {
    basket = sanitize(JSON.parse(localStorage.getItem(basketKey) || '{}'));
}
catch { /* Optional, local-only selection. */ }
function setQuantity(group, value) {
    group.querySelector('output').textContent = String(value);
    group.querySelector('[data-minus]').disabled = value <= 1;
    group.querySelector('[data-plus]').disabled = value >= 20;
}
function updateBasket() {
    const total = Object.values(basket).reduce((sum, n) => sum + n, 0);
    document.querySelectorAll('[data-basket-count]').forEach(node => { node.textContent = String(total); });
    document.querySelectorAll('[data-bag-product]').forEach(row => {
        const quantity = basket[row.dataset.bagProduct];
        row.hidden = !quantity;
        if (quantity)
            setQuantity(row.querySelector('.quantity'), quantity);
    });
    const empty = document.querySelector('[data-empty]');
    if (empty)
        empty.hidden = total > 0;
    const clear = document.querySelector('[data-clear]');
    if (clear)
        clear.hidden = total === 0;
}
function save() {
    updateBasket();
    try {
        localStorage.setItem(basketKey, JSON.stringify(basket));
        return true;
    }
    catch {
        announce(document.body.dataset.storageError);
        return false;
    }
}
document.querySelectorAll('.quantity').forEach(group => {
    setQuantity(group, 1);
    group.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || button.disabled)
            return;
        const value = Number(group.querySelector('output').textContent) + (button.hasAttribute('data-plus') ? 1 : -1);
        setQuantity(group, Math.max(1, Math.min(20, value)));
        const row = group.closest('[data-bag-product]');
        if (row) {
            basket[row.dataset.bagProduct] = value;
            save();
        }
    });
});
document.querySelectorAll('[data-add]').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
        const card = button.closest('[data-product]');
        const slug = card.dataset.product;
        const quantity = Number(card.querySelector('output').textContent);
        basket[slug] = Math.min(20, (basket[slug] || 0) + quantity);
        if (save())
            announce(document.body.dataset.added);
    });
});
document.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
    const row = button.closest('[data-bag-product]');
    const next = row.nextElementSibling;
    delete basket[row.dataset.bagProduct];
    save();
    (next && !next.hidden ? next.querySelector('a') : document.querySelector('.basket-actions a'))?.focus();
}));
document.querySelector('[data-clear]')?.addEventListener('click', () => { basket = {}; save(); document.querySelector('.basket-actions a')?.focus(); });
window.addEventListener('storage', event => { if (event.key === basketKey) {
    try {
        basket = sanitize(JSON.parse(event.newValue || '{}'));
    }
    catch {
        basket = {};
    }
    updateBasket();
} });
updateBasket();
const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('#mobile-navigation');
menuButton?.addEventListener('click', () => { if (menu) {
    menu.hidden = !menu.hidden;
    menuButton.setAttribute('aria-expanded', String(!menu.hidden));
} });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu && !menu.hidden) {
    menu.hidden = true;
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.focus();
} });
// Filters remain ordinary navigable URLs, including direct reloads without JS.
const category = new URL(location.href).searchParams.get('category') || 'all';
const selected = ['tea', 'pantry'].includes(category) ? category : 'all';
document.querySelectorAll('[data-category]').forEach(node => { node.hidden = selected !== 'all' && node.dataset.category !== selected; });
document.querySelectorAll('[data-filter]').forEach(node => { if (node.dataset.filter === selected)
    node.setAttribute('aria-current', 'page');
else
    node.removeAttribute('aria-current'); });
const sectionAnchors = ['#tea-collection', '#tea-spiced', '#curry-collection'];
const syncLanguageLinks = () => document.querySelectorAll('.languages a').forEach(node => {
    const url = new URL(node.href);
    if (location.search && document.querySelector('.filters'))
        url.search = location.search;
    url.hash = sectionAnchors.includes(location.hash) ? location.hash : '';
    node.href = url.href;
});
syncLanguageLinks();
window.addEventListener('hashchange', syncLanguageLinks);
// On a direct product-section reload, font loading and native scroll restoration
// can move the section after the browser's first anchor jump. Align once after
// both have settled, unless the visitor has already begun scrolling elsewhere.
const initialSectionHash = location.hash;
if (sectionAnchors.includes(initialSectionHash)) {
    let interrupted = false;
    const interrupt = () => { interrupted = true; };
    document.addEventListener('wheel', interrupt, { once: true, passive: true });
    document.addEventListener('touchmove', interrupt, { once: true, passive: true });
    document.addEventListener('keydown', event => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key))
        interrupt(); });
    const align = () => {
        void document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
            if (!interrupted && location.hash === initialSectionHash)
                document.querySelector(initialSectionHash)?.scrollIntoView({ block: 'start', behavior: 'instant' });
        })));
    };
    if (document.readyState === 'complete')
        align();
    else
        window.addEventListener('load', align, { once: true });
}
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const compact = matchMedia('(max-width: 700px)');
const connection = navigator.connection;
document.querySelectorAll('[data-film]').forEach(box => {
    const video = box.querySelector('video');
    const button = box.querySelector('.film-control button');
    const still = box.querySelector('.still-label');
    const priority = box.dataset.film === 'gateway' || box.dataset.film === 'highlands';
    let inView = priority, userPaused = false, failed = false, autoplayBlocked = false;
    let pending = false, attempts = 0, generation = 0, retry;
    const eligible = () => !failed && !motion.matches && !connection?.saveData && !['slow-2g', '2g', '3g'].includes(connection?.effectiveType || '');
    const canStart = () => eligible() && inView && !document.hidden && !userPaused;
    const clearRetry = () => { if (retry !== undefined) {
        clearTimeout(retry);
        retry = undefined;
    } };
    const control = () => {
        const playing = !video.paused && !video.ended;
        // Show Pause after automatic playback starts. A Play prompt appears only
        // after a deliberate pause or an actual browser autoplay rejection.
        button.hidden = !eligible() || (!playing && box.dataset.started !== 'true' && !(autoplayBlocked && attempts >= 4) && !userPaused);
        still.hidden = eligible();
        button.setAttribute('aria-label', button.dataset[playing ? 'pause' : 'play']);
        button.querySelector('[data-icon-play]').setAttribute('display', playing ? 'none' : 'inline');
        button.querySelector('[data-icon-pause]').setAttribute('display', playing ? 'inline' : 'none');
        box.dataset.playing = String(playing);
    };
    const play = () => {
        if (!canStart() || pending || (!video.paused && !video.ended) || attempts >= 4)
            return;
        // Set native flags before every attempt, including Safari's legacy inline
        // attribute. A loading/visibility rejection must not become a permanent stop.
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.autoplay = true;
        pending = true;
        attempts++;
        const ticket = generation;
        void video.play().then(() => {
            if (ticket !== generation)
                return;
            autoplayBlocked = false;
            attempts = 0;
            if (!canStart()) {
                video.autoplay = false;
                video.pause();
            }
        }).catch(error => {
            if (ticket !== generation)
                return;
            if (error?.name === 'NotAllowedError')
                autoplayBlocked = true;
            if (canStart() && attempts < 4) {
                clearRetry();
                retry = window.setTimeout(() => { retry = undefined; play(); }, [0, 200, 700, 1500][attempts]);
            }
        }).finally(() => { if (ticket === generation) {
            pending = false;
            control();
        } });
    };
    const sync = () => {
        const allowed = eligible();
        if (!allowed) {
            clearRetry();
            video.autoplay = false;
            video.pause();
            box.dataset.started = 'false';
            box.dataset.videoActive = 'false';
            if (video.hasAttribute('src')) {
                generation++;
                pending = false;
                attempts = 0;
                video.removeAttribute('src');
                video.load();
            }
            control();
            return;
        }
        if (!canStart()) {
            clearRetry();
            video.autoplay = false;
            video.pause();
            control();
            return;
        }
        const source = compact.matches ? box.dataset.mobile : box.dataset.desktop;
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.autoplay = true;
        // The native poster covers loading. Remove the separate image overlay now,
        // so the video itself is visible to browsers' autoplay visibility checks.
        box.dataset.videoActive = 'true';
        if (video.getAttribute('src') !== source) {
            clearRetry();
            generation++;
            pending = false;
            attempts = 0;
            autoplayBlocked = false;
            box.dataset.started = 'false';
            video.src = source;
            video.load();
        }
        control();
        requestAnimationFrame(play);
    };
    const resume = () => { if (canStart()) {
        clearRetry();
        attempts = 0;
    } sync(); };
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('webkit-playsinline', '');
    if (priority)
        video.preload = 'auto';
    video.addEventListener('playing', () => { clearRetry(); autoplayBlocked = false; attempts = 0; box.dataset.started = 'true'; if (!canStart()) {
        video.autoplay = false;
        video.pause();
    } control(); });
    video.addEventListener('pause', control);
    video.addEventListener('error', () => { if (video.hasAttribute('src')) {
        failed = true;
        sync();
    } });
    video.addEventListener('loadeddata', () => { clearRetry(); sync(); });
    video.addEventListener('canplay', sync);
    button.addEventListener('click', () => {
        userPaused = !video.paused;
        if (userPaused) {
            clearRetry();
            video.autoplay = false;
            video.pause();
        }
        else {
            attempts = 0;
            autoplayBlocked = false;
            if (!video.hasAttribute('src')) {
                box.dataset.videoActive = 'true';
                video.src = compact.matches ? box.dataset.mobile : box.dataset.desktop;
            }
            play();
        }
        control();
    });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => { const next = entry.isIntersecting && entry.intersectionRatio >= .12; const entered = next && !inView; inView = next; if (entered)
            attempts = 0; sync(); }, { threshold: [0, .12] }).observe(box);
    }
    else {
        inView = priority;
        sync();
    }
    motion.addEventListener('change', resume);
    compact.addEventListener('change', sync);
    connection?.addEventListener('change', resume);
    document.addEventListener('visibilitychange', () => { if (document.hidden)
        sync();
    else
        resume(); });
    window.addEventListener('pageshow', resume);
    window.addEventListener('load', resume);
    window.addEventListener('focus', resume);
    // If the browser requires a gesture, an ordinary trusted page interaction
    // can recover playback without making the visitor find a Play button.
    const recover = (event) => {
        if (!event.isTrusted || !canStart() || !video.paused || (event.target instanceof Element && event.target.closest('.film-control')))
            return;
        clearRetry();
        attempts = 0;
        play();
    };
    document.addEventListener('click', recover, true);
    document.addEventListener('touchend', recover, { passive: true });
    document.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ')
        recover(event); });
    sync();
});

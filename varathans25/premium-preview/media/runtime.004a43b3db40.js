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
document.querySelectorAll('.languages a').forEach(node => { if (location.search && document.querySelector('.filters')) {
    const url = new URL(node.href);
    url.search = location.search;
    node.href = url.href;
} });
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const compact = matchMedia('(max-width: 700px)');
const connection = navigator.connection;
document.querySelectorAll('[data-film]').forEach(box => {
    const video = box.querySelector('video');
    const button = box.querySelector('.film-control button');
    const still = box.querySelector('.still-label');
    let inView = false, userPaused = false, failed = false;
    const eligible = () => !failed && !motion.matches && !connection?.saveData && !['slow-2g', '2g', '3g'].includes(connection?.effectiveType || '');
    const control = () => {
        const playing = !video.paused && !video.ended;
        button.querySelector('span').textContent = button.dataset[playing ? 'pause' : 'play'];
        button.setAttribute('aria-label', button.dataset[playing ? 'pause' : 'play']);
        button.querySelectorAll('span')[1].textContent = playing ? 'Ⅱ' : '▷';
        box.dataset.playing = String(playing);
    };
    const play = () => { void video.play().catch(() => control()); };
    const sync = () => {
        const allowed = eligible();
        button.hidden = !allowed;
        still.hidden = allowed;
        if (!allowed) {
            video.pause();
            box.dataset.started = 'false';
            if (video.hasAttribute('src')) {
                video.removeAttribute('src');
                video.load();
            }
            control();
            return;
        }
        if (!inView || document.hidden || userPaused) {
            video.pause();
            control();
            return;
        }
        const source = compact.matches ? box.dataset.mobile : box.dataset.desktop;
        if (video.getAttribute('src') !== source) {
            box.dataset.started = 'false';
            video.src = source;
            video.load();
        }
        play();
    };
    video.muted = true;
    video.defaultMuted = true;
    video.addEventListener('playing', () => { box.dataset.started = 'true'; control(); });
    video.addEventListener('pause', control);
    video.addEventListener('error', () => { if (video.hasAttribute('src')) {
        failed = true;
        sync();
    } });
    button.addEventListener('click', () => {
        userPaused = !video.paused;
        if (userPaused)
            video.pause();
        else {
            if (!video.hasAttribute('src'))
                video.src = compact.matches ? box.dataset.mobile : box.dataset.desktop;
            play();
        }
    });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => { inView = entry.isIntersecting && entry.intersectionRatio >= .12; sync(); }, { threshold: [0, .12] }).observe(box);
    }
    else {
        inView = box.dataset.film === 'gateway' || box.dataset.film === 'highlands';
        sync();
    }
    motion.addEventListener('change', sync);
    compact.addEventListener('change', sync);
    connection?.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
});

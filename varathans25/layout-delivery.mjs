import { standardDelivery, deliveryCopy, FREE_DELIVERY_RAPPEN } from './standard-delivery.mjs?v=20260922-layout';

let destination = 'CH';
try { if (sessionStorage.getItem('v25_standard_delivery_destination') === 'INTERNATIONAL') destination = 'INTERNATIONAL'; } catch { /* Storage is optional. */ }
const money = rappen => `CHF ${(rappen / 100).toFixed(2)}`;
const locale = () => location.pathname.match(/\/varathans25\/(de|fr|en)(?:\/|$)/)?.[1] || 'de';
const restrictedPage = () => /\/(?:cigars|tobacco-information|age-verification-policy)(?:\/|$)/.test(location.pathname);

function mount(parent, className, tag = 'div') {
  let element = parent.querySelector(`:scope > .${className}`);
  if (!element) { element = document.createElement(tag); element.className = className; parent.append(element); }
  return element;
}
function content(element, html) {
  if (element.dataset.markup !== html) { element.innerHTML = html; element.dataset.markup = html; }
}
function render() {
  if (document.documentElement.dataset.v25LayoutReady !== 'true') return;
  observer.disconnect();
  try {
    const t = deliveryCopy[locale()];
    const header = document.querySelector('.header-reserve');
    if (header) {
      const bar = mount(header, 'v25-delivery-announcement', 'aside');
      bar.setAttribute('aria-label', t.heading);
      bar.hidden = restrictedPage();
      content(bar, `<p>${t.announcement}<small>${t.scope}</small></p>`);
    }
    // Next may retain hidden route trees while streaming or navigating.
    const detail = [...document.querySelectorAll('#main .product-page .product-purchase')]
      .find(element => element.getClientRects().length > 0 && !element.closest('[hidden]'));
    if (detail) {
      const note = mount(detail, 'v25-product-delivery', 'p');
      note.textContent = t.product;
      const price = detail.querySelector('.detail-price');
      const anchor = price?.nextElementSibling?.matches('.micro') ? price.nextElementSibling : price;
      if (anchor && anchor.nextElementSibling !== note) anchor.after(note);
    }
    const dialog = [...document.querySelectorAll('dialog')].find(d => ['Your bag', 'Ihr Warenkorb', 'Votre panier'].includes(d.getAttribute('aria-label')));
    if (!dialog) return;
    const row = dialog.querySelector('[data-v25-subtotal]');
    const card = mount(dialog.querySelector('.modal-content') || dialog, 'v25-delivery-estimate', 'section');
    // Restricted or unknown merchandise does not enter this standard-delivery review.
    card.hidden = row?.getAttribute('data-v25-standard-only') === 'false' || !!dialog.querySelector('.unavailable-cart-line');
    if (card.hidden) return;
    let result;
    const subtotal = row ? Number(row.getAttribute('data-v25-subtotal')) : 0;
    try { result = standardDelivery({ discountedSubtotalRappen: subtotal, country: destination }); } catch { content(card, `<p role="status">${t.invalid}</p>`); return; }
    const message = destination !== 'CH' ? t.abroad : result.free ? t.unlocked : t.progress.replace('{amount}', money(result.remainingRappen));
    const focused = document.activeElement?.id === 'v25-delivery-country';
    content(card, `<h3>${t.heading}</h3><label for="v25-delivery-country">${t.country}</label><select id="v25-delivery-country"><option value="CH"${destination === 'CH' ? ' selected' : ''}>${t.swiss}</option><option value="INTERNATIONAL"${destination !== 'CH' ? ' selected' : ''}>${t.international}</option></select><p role="status" aria-live="polite" data-delivery-status="${result.status}">${message}</p>${destination === 'CH' ? `<progress max="${FREE_DELIVERY_RAPPEN}" value="${Math.min(subtotal, FREE_DELIVERY_RAPPEN)}" aria-label="${t.heading}"></progress>${result.free ? '' : `<p class="micro">${t.pending}</p>`}` : ''}<small>${t.basis}</small><small>${t.disabled}</small>`);
    if (focused) document.getElementById('v25-delivery-country')?.focus({ preventScroll: true });
    const bottom = dialog.querySelector('.cart-bottom');
    if (bottom && card.nextElementSibling !== bottom) bottom.before(card);
  } finally { observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-v25-subtotal', 'data-v25-standard-only', 'open'] }); }
}
let frame = 0;
function schedule() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; render(); }); }
const observer = new MutationObserver(schedule);
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-v25-subtotal', 'data-v25-standard-only', 'open'] });
window.addEventListener('varathans25:layout-ready', schedule);
window.addEventListener('pageshow', schedule);
document.addEventListener('change', event => {
  if (event.target.id !== 'v25-delivery-country') return;
  destination = event.target.value === 'CH' ? 'CH' : 'INTERNATIONAL';
  try { sessionStorage.setItem('v25_standard_delivery_destination', destination); } catch { /* Storage is optional. */ }
  schedule();
});
schedule();

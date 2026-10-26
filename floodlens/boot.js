// Queue an early language choice while the larger, local-only app modules load.
// No storage, location request, telemetry or network request is made here.
(() => {
  const status = document.querySelector('#boot-status');
  let choice = null;
  const ready = () => document.documentElement.dataset.arkReady === 'true';
  document.querySelectorAll('[data-language]').forEach(button => button.disabled = false);
  status.hidden = true;
  document.querySelector('#boot-help').hidden = true;
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-language]');
    if (!button || ready()) return;
    event.preventDefault();
    choice = button;
    status.hidden = false;
    document.querySelectorAll('[data-language]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  }, true);
  document.addEventListener('ark-ready', () => {
    status.hidden = true;
    document.querySelector('#boot-help').hidden = true;
    choice?.click();
  }, {once:true});
  setTimeout(() => {
    if (ready()) return;
    status.hidden = false;
    status.textContent = 'පූරණය ප්‍රමාදයි · ஏற்றுவதில் தாமதம் · Loading is taking longer';
    document.querySelector('#boot-help').hidden = false;
  }, 12000);
})();

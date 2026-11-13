const frame = document.querySelector('#towerFrame');
const open = document.querySelector('#loadTower');
const close = document.querySelector('#closeTower');
const pause = document.querySelector('#pauseTower');
const status = document.querySelector('#towerStatus');
const loading = document.querySelector('#towerLoading');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let timeout;
let paused = reducedMotion.matches;
let active = false;
let ready = false;

function applyMotion() {
  pause.setAttribute('aria-pressed', String(paused));
  // The sandbox gives the viewer an opaque origin; source checks protect replies.
  frame.contentWindow?.postMessage({ type: 'hongo-viewer-motion', paused }, '*');
  if (ready) status.textContent = reducedMotion.matches
    ? 'Model siap. Gerakan dihentikan mengikuti preferensi pengurangan gerakan perangkatmu.'
    : paused ? 'Gerakan dijeda. Model tetap dapat diputar dan diperbesar.' : 'Model siap. Kamu dapat menjeda gerakan atau menutup model untuk menghemat daya.';
}
function stop() {
  active = false;
  ready = false;
  clearTimeout(timeout);
  frame.hidden = true;
  frame.removeAttribute('src');
  pause.hidden = true;
  close.hidden = true;
  loading.hidden = true;
  open.setAttribute('aria-expanded', 'false');
}
function failed() {
  stop();
  status.textContent = 'Model belum berhasil dimuat. Coba buka kembali, atau lanjutkan belajar kosakata di atas.';
  open.textContent = 'Coba muat model lagi';
  open.focus();
}
open.addEventListener('click', () => {
  stop();
  active = true;
  paused = reducedMotion.matches;
  frame.src = 'japanese-tower.html?country=japan';
  frame.hidden = false;
  loading.hidden = false;
  close.hidden = false;
  open.setAttribute('aria-expanded', 'true');
  status.textContent = 'Memuat model menara. Waktu pemuatan bergantung pada perangkat.';
  timeout = setTimeout(failed, 20000);
});
window.addEventListener('message', event => {
  if (!active || event.source !== frame.contentWindow) return;
  if (event.data?.type === 'hongo-viewer-error') return failed();
  if (event.data?.type !== 'hongo-viewer-ready') return;
  clearTimeout(timeout);
  loading.hidden = true;
  ready = true;
  pause.hidden = false;
  pause.disabled = reducedMotion.matches;
  applyMotion();
});
pause.addEventListener('click', () => { paused = !paused; applyMotion(); });
reducedMotion.addEventListener('change', () => {
  paused = reducedMotion.matches;
  pause.disabled = reducedMotion.matches;
  if (active) applyMotion();
});
close.addEventListener('click', () => {
  stop();
  status.textContent = 'Model ditutup. Kosakata tetap tersedia.';
  open.textContent = 'Buka model 3D';
  open.focus();
});

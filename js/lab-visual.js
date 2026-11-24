import { annotateJapanese } from './language.js';
import { escapeHtml } from './study-core.js';
import { SPEAKER_ICON_SVG, speakJapanese } from './speech.js';

const ARCHITECTURE_TERMS = [
  ['城', 'しろ', 'shiro', 'Kastel', 'Benteng tradisional Jepang dengan fondasi batu melengkung dan menara utama.'],
  ['塔', 'とう', 'tou', 'Menara / Pagoda', 'Struktur bertingkat (seperti 五重塔 gojuu-no-tou, pagoda lima tingkat).'],
  ['屋根', 'やね', 'yane', 'Atap', 'Atap melengkung berlapis genteng (瓦 kawara) untuk menahan hujan dan salju.'],
  ['石', 'いし', 'ishi', 'Batu / Fondasi', 'Susunan dinding batu (石垣 ishigaki) yang menopang bobot kastel dan menara.'],
  ['柱', 'はしら', 'hashira', 'Tiang / Pilar Kayu', 'Tiang utama dari kayu hinoki yang menyalurkan beban struktur secara fleksibel.'],
  ['門', 'もん', 'mon', 'Gerbang', 'Pintu gerbang utama kuil, kastel, atau halaman tradisional Jepang.'],
];

const ANATOMY_TERMS = [
  ['頭', 'あたま', 'atama', 'Kepala', 'Bagian atas tubuh; ungkapan 頭がいい berarti pintar.'],
  ['目', 'め', 'me', 'Mata', 'Indra penglihatan; dipakai pada kata 目薬 (obat tetes mata).'],
  ['耳', 'みみ', 'mimi', 'Telinga', 'Indra pendengaran untuk menyimak bahasa Jepang.'],
  ['口', 'くち', 'kuchi', 'Mulut', 'Digunakan juga pada 入口 (pintu masuk) dan 出口 (pintu keluar).'],
  ['手', 'て', 'te', 'Tangan', 'Muncul di banyak kata majemuk seperti 手紙 (surat) dan 上手 (mahir).'],
  ['足', 'あし', 'ashi', 'Kaki', 'Mencakup tungkai maupun telapak kaki dalam bahasa Jepang.'],
  ['心', 'こころ', 'kokoro', 'Hati / Jiwa', 'Merujuk pada perasaan dan batin; organ jantung disebut 心臓 (shinzou).'],
  ['体', 'からだ', 'karada', 'Tubuh / Badan', 'Digunakan dalam ungkapan menjaga kesehatan 体に気をつけて.'],
];

const STAGES = [
  { desc: 'Fondasi batu bertingkat untuk kestabilan menara', progress: 28 },
  { desc: 'Pilar utama kayu dan dinding plester putih', progress: 56 },
  { desc: 'Lima lapis atap genteng melengkung simetris', progress: 84 },
  { desc: 'Puncak menara logam tradisional di atas atap', progress: 100 },
];

const $ = (sel, root = document) => root.querySelector(sel);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

(() => {
  const canvas = $('#pagodaCanvas');
  const ctx = canvas?.getContext('2d');
  const slider = $('#pagodaProgress');
  const output = $('#pagodaProgressOutput');
  const angleEl = $('#pagodaAngleLabel');
  const motionBtn = $('#pagodaMotionBtn');
  const motionLabel = $('#pagodaMotionLabel');
  const pauseIcon = $('#pagodaPauseIcon');
  const playIcon = $('#pagodaPlayIcon');
  const resetBtn = $('#pagodaResetBtn');
  const stageButtons = [...document.querySelectorAll('#pagodaStages [data-stage]')];
  const stageInfo = $('#pagodaStageInfo');

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let isDark = document.documentElement.classList.contains('dark-mode');
  let progress = 1;
  let orbit = 0;
  let stage = -1;
  let playing = !reducedMotion.matches;
  let phase = 0;
  let rafId = 0;
  let lastTick = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let pointerId = null;
  let lastX = 0;

  const line = (x1, y1, x2, y2, color, width, alpha = 1, cap = 'butt') => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = cap;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const paint = (fillColor, fillAlpha, strokeColor, strokeAlpha, width) => {
    ctx.globalAlpha = fillAlpha;
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.globalAlpha = strokeAlpha;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  function drawPagoda() {
    if (!ctx || w <= 0 || h <= 0) return;
    const span = Math.min(w, h * 1.45);
    const sway = playing && !reducedMotion.matches ? Math.sin(phase) * 6 : 0;
    const cx = w * 0.5 + clamp(orbit, -48, 48) + sway;
    const red = isDark ? '#FF8A7A' : '#D33827';
    const ink = isDark ? '#EDF1F5' : '#191A1E';
    const muted = isDark ? '#B5C0D0' : '#526176';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, isDark ? '#181A22' : '#FAF6F0');
    bg.addColorStop(1, isDark ? '#121316' : '#F1E9DF');
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const gridAlpha = isDark ? 0.06 : 0.05;
    for (let i = 1; i <= 5; i++) line(0, h * (i / 6), w, h * (i / 6), ink, 1, gridAlpha);
    line(cx, 0, cx, h, ink, 1, gridAlpha);

    ctx.globalAlpha = isDark ? 0.18 : 0.13;
    ctx.fillStyle = red;
    ctx.beginPath();
    ctx.arc(w * 0.5 - orbit * 0.25, h * 0.34, Math.min(w, h) * 0.28, 0, Math.PI * 2);
    ctx.fill();

    const groundY = h * 0.88;
    const stone = clamp(progress / 0.25, 0, 1);
    if (stone > 0) {
      const sh = h * 0.14 * stone;
      const bw = span * 0.56;
      const tw = span * 0.44;
      ctx.beginPath();
      ctx.moveTo(cx - bw / 2, groundY);
      ctx.lineTo(cx - tw / 2, groundY - sh);
      ctx.lineTo(cx + tw / 2, groundY - sh);
      ctx.lineTo(cx + bw / 2, groundY);
      ctx.closePath();
      paint(stage === 0 ? red : muted, stage === 0 ? 0.28 : isDark ? 0.34 : 0.28, stage === 0 ? red : ink, stage === 0 ? 1 : 0.55, 2);
      if (stone > 0.6) line(cx - bw * 0.44, groundY - sh * 0.5, cx + bw * 0.44, groundY - sh * 0.5, ink, 1.5, 0.25);
    }

    const baseTopY = groundY - h * 0.14;
    const stepH = h * 0.115;
    for (let t = 0; t < 5; t++) {
      const tp = clamp((progress - (0.20 + t * 0.13)) / 0.14, 0, 1);
      if (tp <= 0) continue;
      const shrink = 1 - t * 0.12;
      const wallW = span * 0.30 * shrink;
      const roofW = span * 0.48 * shrink;
      const baseY = baseTopY - t * stepH;
      const wallH = stepH * 0.54 * tp;
      const px = cx + orbit * (t + 1) * 0.08;

      ctx.beginPath();
      ctx.rect(px - wallW / 2, baseY - wallH, wallW, wallH);
      paint(stage === 1 ? red : isDark ? '#282C36' : '#FFFCF8', stage === 1 ? 0.2 : 1, stage === 1 ? red : ink, stage === 1 ? 1 : 0.55, 1.6);

      for (const rel of [-0.42, -0.14, 0.14, 0.42]) {
        const x = px + wallW * rel;
        line(x, baseY, x, baseY - wallH, red, 2.6, stage === 1 ? 1 : 0.85);
      }

      if (tp > 0.35) {
        const rs = clamp((tp - 0.35) / 0.65, 0, 1);
        const ry = baseY - wallH;
        const pk = stepH * 0.52 * rs;
        const rw = roofW * rs;
        ctx.beginPath();
        ctx.moveTo(px - rw * 0.52, ry - pk * 0.18);
        ctx.quadraticCurveTo(px - rw * 0.25, ry - pk * 0.35, px - rw * 0.18, ry - pk);
        ctx.lineTo(px + rw * 0.18, ry - pk);
        ctx.quadraticCurveTo(px + rw * 0.25, ry - pk * 0.35, px + rw * 0.52, ry - pk * 0.18);
        ctx.lineTo(px + rw * 0.42, ry + 3);
        ctx.lineTo(px - rw * 0.42, ry + 3);
        ctx.closePath();
        paint(stage === 2 ? red : isDark ? '#394050' : '#282B33', stage === 2 ? 0.85 : 1, stage === 2 ? red : ink, stage === 2 ? 1 : 0.7, 1.5);
      }
    }

    const spire = clamp((progress - 0.84) / 0.16, 0, 1);
    if (spire > 0) {
      const topX = cx + orbit * 0.48;
      const spireY = baseTopY - 5 * stepH + stepH * 0.06;
      const spireH = h * 0.14 * spire;
      line(topX, spireY, topX, spireY - spireH, stage === 3 ? red : ink, 3.5, 1, 'round');
      for (let r = 1; r <= 4; r++) {
        const ry = spireY - spireH * (r * 0.18);
        line(topX - 8 * spire, ry, topX + 8 * spire, ry, red, 2.2, 1, 'round');
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = red;
      ctx.beginPath();
      ctx.arc(topX, spireY - spireH, 4.5 * spire, 0, Math.PI * 2);
      ctx.fill();
    }

    line(w * 0.1, groundY, w * 0.9, groundY, ink, 2, 0.35, 'round');
    ctx.globalAlpha = 1;
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    dpr = Math.min(devicePixelRatio || 1, 2.5);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    drawPagoda();
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastTick = 0;
  }

  function tick(now) {
    if (!playing || reducedMotion.matches || document.hidden) return stopLoop();
    if (lastTick) phase = (phase + ((now - lastTick) / 5500) * Math.PI * 2) % (Math.PI * 2);
    lastTick = now;
    drawPagoda();
    rafId = requestAnimationFrame(tick);
  }

  function syncMotion() {
    const active = playing && !reducedMotion.matches;
    if (motionBtn) {
      motionBtn.disabled = reducedMotion.matches;
      motionBtn.setAttribute('aria-pressed', String(active));
    }
    if (motionLabel) motionLabel.textContent = active ? 'Jeda Gerakan' : 'Lanjutkan';
    if (pauseIcon) pauseIcon.hidden = !active;
    if (playIcon) playIcon.hidden = active;
    if (active && !document.hidden && !rafId) {
      lastTick = 0;
      rafId = requestAnimationFrame(tick);
    } else if (!active) {
      stopLoop();
      drawPagoda();
    }
  }

  function syncProgress(pct) {
    const rounded = Math.round(clamp(pct, 0, 100));
    progress = rounded / 100;
    if (slider) slider.value = String(rounded);
    if (output) output.textContent = `${rounded}%`;
  }

  function syncAngle() {
    if (angleEl) angleEl.textContent = `Geser: ${Math.round(orbit)} px`;
  }

  function syncStage() {
    stageButtons.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.stage) === stage)));
    if (stageInfo) {
      stageInfo.textContent = stage >= 0
        ? STAGES[stage].desc
        : reducedMotion.matches
          ? 'Animasi otomatis dijeda sesuai pengaturan pengurangan gerak perangkat.'
          : '';
    }
  }

  if (canvas && ctx) {
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else addEventListener('resize', resize);
    new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark-mode');
      if (dark !== isDark) { isDark = dark; drawPagoda(); }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    canvas.addEventListener('pointerdown', e => {
      pointerId = e.pointerId;
      lastX = e.clientX;
      canvas.setPointerCapture?.(e.pointerId);
      canvas.classList.add('is-dragging');
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== pointerId) return;
      orbit = clamp(orbit + (e.clientX - lastX) * 0.35, -48, 48);
      lastX = e.clientX;
      syncAngle();
      drawPagoda();
    });
    const endDrag = e => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      canvas.classList.remove('is-dragging');
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') orbit = clamp(orbit - 6, -48, 48);
      else if (e.key === 'ArrowRight') orbit = clamp(orbit + 6, -48, 48);
      else if (e.key === 'Home' || e.key === '0') orbit = 0;
      else return;
      e.preventDefault();
      syncAngle();
      drawPagoda();
    });

    document.addEventListener('visibilitychange', syncMotion);
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) playing = false;
      syncMotion();
      syncStage();
    });
    resize();
    syncStage();
    syncMotion();
  }

  slider?.addEventListener('input', () => { syncProgress(Number(slider.value)); drawPagoda(); });
  motionBtn?.addEventListener('click', () => { if (!reducedMotion.matches) { playing = !playing; syncMotion(); } });
  resetBtn?.addEventListener('click', () => {
    orbit = 0; stage = -1;
    syncProgress(100); syncAngle(); syncStage(); drawPagoda();
  });
  stageButtons.forEach(b => b.addEventListener('click', () => {
    const idx = Number(b.dataset.stage);
    stage = stage === idx ? -1 : idx;
    if (stage >= 0) syncProgress(STAGES[idx].progress);
    syncStage();
    drawPagoda();
  }));

  const vocabSection = $('#visualVocabSection');
  const tabs = [...document.querySelectorAll('[role="tab"][data-tab]')];
  const panels = [...document.querySelectorAll('[role="tabpanel"][data-panel]')];

  function renderTerms(box, terms) {
    if (!box) return;
    const off = document.body.classList.contains('furigana-off');
    box.innerHTML = terms.map(([k, f, r, m, d]) =>
      `<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div class="flex items-start justify-between gap-3"><p class="font-display text-3xl font-bold text-ink"><ruby lang="ja">${escapeHtml(k)}<rt aria-hidden="${off}">${escapeHtml(f)}</rt></ruby></p><div class="text-right"><p class="text-base font-bold text-ink">${escapeHtml(m)}</p><p class="font-mono text-xs font-semibold text-crimson">${escapeHtml(r)}</p></div></div><p class="mt-3 text-xs leading-relaxed text-slate-600">${escapeHtml(d)}</p><div class="mt-3 flex justify-end"><button type="button" class="tts-btn" data-speak="${escapeHtml(f || k)}" aria-label="Dengarkan pelafalan ${escapeHtml(m)}">${SPEAKER_ICON_SVG}<span>Dengar</span></button></div></article>`
    ).join('');
    annotateJapanese(box);
  }

  const syncFurigana = () => {
    if (!vocabSection) return;
    const off = document.body.classList.contains('furigana-off');
    vocabSection.querySelectorAll('rt').forEach(rt => rt.setAttribute('aria-hidden', String(off)));
  };

  function selectTab(key, focus = false) {
    tabs.forEach(t => {
      const on = t.dataset.tab === key;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    panels.forEach(p => {
      if (p.dataset.panel === key) p.removeAttribute('hidden');
      else p.setAttribute('hidden', 'until-found');
    });
  }

  renderTerms($('#architectureGrid'), ARCHITECTURE_TERMS);
  renderTerms($('#anatomyGrid'), ANATOMY_TERMS);
  syncFurigana();
  document.addEventListener('hongo-furigana-change', syncFurigana);
  vocabSection?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-speak]');
    if (!btn) return;
    speakJapanese(btn.dataset.speak, { button: btn });
  });

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t.dataset.tab));
    t.addEventListener('keydown', e => {
      const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length
        : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
        : e.key === 'Home' ? 0
        : e.key === 'End' ? tabs.length - 1 : -1;
      if (next < 0) return;
      e.preventDefault();
      selectTab(tabs[next].dataset.tab, true);
    });
  });
  panels.forEach(p => p.addEventListener('beforematch', () => selectTab(p.dataset.panel)));
})();

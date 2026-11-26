import { quizData } from './quiz-data.js';
import { escapeHtml, shuffle } from './study-core.js';
import {
  buildSrsQueue,
  formatIntervalLabel,
  getEffectiveStreak,
  reviewCard,
} from './srs-core.js';
import {
  getSrsMap,
  getStreak,
  recordSrsReview,
  recordVisit,
} from './progress.js';
import { speakJapanese } from './speech.js';
import { mountPage } from './page-lifecycle.js';

export function init(signal) {
  const categorySelector = document.querySelector('#srsCategorySelector');
  const dueCountEl = document.querySelector('#srsDueCount');
  const newCountEl = document.querySelector('#srsNewCount');
  const streakCountEl = document.querySelector('#srsStreakCount');
  const stageEl = document.querySelector('#flashcardStage');
  const doneEl = document.querySelector('#flashcardDone');
  const doneSummaryEl = document.querySelector('#flashcardDoneSummary');
  const positionEl = document.querySelector('#flashcardPosition');
  const modeBadgeEl = document.querySelector('#flashcardModeBadge');
  const catBadgeEl = document.querySelector('#flashcardCatBadge');
  const japaneseEl = document.querySelector('#flashcardJapanese');
  const speakBtn = document.querySelector('#flashSpeakBtn');
  const promptAreaEl = document.querySelector('#flashcardPromptArea');
  const revealBtn = document.querySelector('#revealAnswerBtn');
  const answerEl = document.querySelector('#flashcardAnswer');
  const meaningEl = document.querySelector('#flashcardMeaning');
  const romajiEl = document.querySelector('#flashcardRomaji');
  const ratingGrid = document.querySelector('#srsRatingGrid');
  const freePracticeBtn = document.querySelector('#freePracticeBtn');
  const statusEl = document.querySelector('#flashcardStatus');

  if (!stageEl || !japaneseEl) return;

  const categoryLabels = {
    waktu: 'Keterangan Waktu',
    sekolah: 'Sekolah & Kelas',
    'mata-pelajaran': 'Mata Pelajaran',
    pekerjaan: 'Pekerjaan & Profesi',
    orang: 'Kata Ganti & Orang',
    keluarga: 'Keluarga & Hubungan',
  };

  const allItems = [];
  Object.keys(categoryLabels).forEach((categoryKey) => {
    const group = quizData[categoryKey];
    if (!group?.items) return;
    group.items.forEach((item) => {
      allItems.push({
        id: item.id,
        kanji: item.q,
        meaning: item.a,
        romaji: item.r,
        furigana: item.f || item.r,
        categoryKey,
        categoryLabel: categoryLabels[categoryKey],
      });
    });
  });

  let currentCategory = 'all';
  let freeMode = false;
  let queue = [];
  let sessionTotal = 0;
  let sessionReviewed = 0;
  let revealed = false;

  const syncFurigana = () => {
    const hidden = document.body.classList.contains('furigana-off');
    japaneseEl.querySelectorAll('rt').forEach((rt) => {
      rt.setAttribute('aria-hidden', String(hidden));
    });
  };

  function updateMetrics() {
    const srsMap = getSrsMap();
    const { dueCount, newCount } = buildSrsQueue(allItems, srsMap, {
      dailyNewLimit: 10,
      category: currentCategory,
    });
    const streak = getEffectiveStreak(getStreak());
    if (dueCountEl) dueCountEl.textContent = String(dueCount);
    if (newCountEl) newCountEl.textContent = String(newCount);
    if (streakCountEl) streakCountEl.textContent = String(streak);
  }

  function updateIntervalHints(cardItem) {
    const existing = getSrsMap()[cardItem.id];
    const qualities = [1, 3, 4, 5];
    qualities.forEach((q) => {
      const hint = ratingGrid?.querySelector(`[data-interval-for="${q}"]`);
      if (!hint) return;
      if (freeMode) {
        hint.textContent = q === 1 ? 'Ulang sesi ini' : 'Lanjut';
        return;
      }
      if (q === 1) {
        hint.textContent = 'Ulang sesi ini';
        return;
      }
      const next = reviewCard(existing, q);
      hint.textContent = formatIntervalLabel(next.interval);
    });
  }

  function renderCurrent(moveFocus = false) {
    updateMetrics();
    const current = queue[0];
    if (!current) {
      stageEl.hidden = true;
      doneEl.hidden = false;
      const srsMap = getSrsMap();
      const { masteredCount, totalInFilter } = buildSrsQueue(allItems, srsMap, {
        category: currentCategory,
      });
      const streak = getEffectiveStreak(getStreak());
      doneSummaryEl.textContent = sessionReviewed > 0
        ? `Kamu baru menyelesaikan ${sessionReviewed} kartu. Total ${masteredCount} dari ${totalInFilter} kosakata pada kategori ini mulai menetap di ingatan jangka panjang${streak > 0 ? ` · Streak aktif ${streak} hari` : ''}.`
        : `Semua kartu jatuh tempo pada kategori ini sudah selesai untuk hari ini (${masteredCount}/${totalInFilter} dikuasai). Kamu bisa lanjut dengan Latihan Bebas.`;
      if (statusEl) statusEl.textContent = 'Sesi flashcard selesai.';
      return;
    }

    stageEl.hidden = false;
    doneEl.hidden = true;
    revealed = false;

    const currentStep = Math.min(sessionReviewed + 1, Math.max(1, sessionTotal));
    if (positionEl) {
      positionEl.textContent = `Kartu ${currentStep} dari ${Math.max(currentStep, sessionTotal)}`;
    }
    if (modeBadgeEl) {
      modeBadgeEl.textContent = freeMode ? 'Latihan Bebas' : 'Mode SRS';
    }
    if (catBadgeEl) catBadgeEl.textContent = current.categoryLabel;

    if (current.furigana && current.furigana !== current.kanji) {
      japaneseEl.innerHTML = `<ruby lang="ja">${escapeHtml(current.kanji)}<rt>${escapeHtml(current.furigana)}</rt></ruby>`;
    } else {
      japaneseEl.textContent = current.kanji;
    }
    syncFurigana();

    if (speakBtn) {
      speakBtn.dataset.speak = current.furigana || current.kanji;
      speakBtn.setAttribute('aria-label', `Dengarkan pelafalan ${current.kanji}`);
    }
    if (meaningEl) meaningEl.textContent = current.meaning;
    if (romajiEl) romajiEl.textContent = current.romaji;

    if (promptAreaEl) promptAreaEl.hidden = false;
    if (answerEl) answerEl.hidden = true;
    updateIntervalHints(current);

    if (moveFocus) japaneseEl.focus({ preventScroll: true });
  }

  function revealAnswer() {
    if (revealed || !queue.length) return;
    revealed = true;
    if (promptAreaEl) promptAreaEl.hidden = true;
    if (answerEl) answerEl.hidden = false;
    if (statusEl) statusEl.textContent = `Arti: ${queue[0].meaning}`;
  }

  function handleRate(quality) {
    if (!revealed || !queue.length) return;
    const current = queue.shift();
    if (!freeMode) {
      recordSrsReview(current.id, quality);
    }
    if (quality === 1) {
      queue.push(current);
      if (statusEl) statusEl.textContent = `${current.kanji} akan diulang di akhir sesi ini.`;
    } else {
      sessionReviewed++;
      if (statusEl) statusEl.textContent = `Penilaian disimpan untuk ${current.kanji}.`;
    }
    renderCurrent(true);
  }

  function startSrsSession(category = 'all', moveFocus = false) {
    currentCategory = category;
    freeMode = false;
    sessionReviewed = 0;
    const { queue: built } = buildSrsQueue(allItems, getSrsMap(), {
      dailyNewLimit: 10,
      category: currentCategory,
    });
    queue = [...built];
    sessionTotal = queue.length;
    recordVisit('flashcard', currentCategory);
    renderCurrent(moveFocus);
  }

  function startFreeSession() {
    freeMode = true;
    sessionReviewed = 0;
    const pool = currentCategory === 'all'
      ? allItems
      : allItems.filter((item) => item.categoryKey === currentCategory);
    queue = shuffle(pool).slice(0, 10);
    sessionTotal = queue.length;
    renderCurrent(true);
  }

  revealBtn?.addEventListener('click', revealAnswer);

  speakBtn?.addEventListener('click', () => {
    const current = queue[0];
    if (!current) return;
    speakJapanese(current.furigana || current.kanji, { button: speakBtn });
  });

  ratingGrid?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-quality]');
    if (!btn) return;
    handleRate(Number(btn.dataset.quality));
  });

  freePracticeBtn?.addEventListener('click', startFreeSession);

  categorySelector?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-category]');
    if (!btn) return;
    const cat = btn.dataset.category || 'all';
    categorySelector.querySelectorAll('[data-category]').forEach((chip) => {
      const active = chip === btn;
      chip.setAttribute('aria-pressed', String(active));
      chip.classList.toggle('bg-crimson', active);
      chip.classList.toggle('text-white', active);
      chip.classList.toggle('border-crimson', active);
      chip.classList.toggle('bg-white', !active);
      chip.classList.toggle('text-slate-700', !active);
      chip.classList.toggle('border-slate-200', !active);
    });
    startSrsSession(cat, true);
  });

  document.addEventListener('keydown', (event) => {
    if (stageEl.hidden || !queue.length) return;
    if (event.target.closest('input, textarea, select')) return;
    if (!revealed && (event.key === ' ' || event.key === 'Enter') && !event.target.closest('button, a')) {
      event.preventDefault();
      revealAnswer();
      return;
    }
    if (revealed) {
      const keyMap = { '1': 1, '2': 3, '3': 4, '4': 5 };
      if (Object.hasOwn(keyMap, event.key)) {
        event.preventDefault();
        handleRate(keyMap[event.key]);
      }
    }
  }, { signal });

  document.addEventListener('hongo-furigana-change', syncFurigana, { signal });

  startSrsSession('all', false);
}

mountPage(init);

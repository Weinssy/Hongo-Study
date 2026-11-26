import { storage } from './storage.js';
import { annotateJapanese } from './language.js';
import {
  exportProgress,
  getDueSrsCount,
  getProgress,
  getSrsMap,
  getStreak,
  getWrongAnswers,
  importProgress,
  recordVisit,
  resetProgress,
} from './progress.js';
import { getEffectiveStreak } from './srs-core.js';

const SPEAKER_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';

const DESTINATIONS = {
  drill: 'tebak-huruf.html',
  quiz: 'kuis.html',
  flashcard: 'flashcard.html',
  grammar: 'kamus-grammar.html',
  kosakata: 'kosakata.html',
  conversation: 'percakapan.html',
};
const VOCAB_CATEGORIES = ['waktu', 'sekolah', 'mata-pelajaran', 'pekerjaan', 'orang', 'keluarga'];
const GRAMMAR_CATEGORIES = ['struktur-kalimat', 'partikel-dasar', 'kata-kerja', 'kata-sifat', 'pertanyaan-negatif', 'kebutuhan-sehari-hari', 'keberadaan-lokasi', 'ungkapan-salam'];

function extractSpokenFromNode(node) {
  const clone = node.cloneNode(true);
  clone.querySelectorAll('ruby').forEach((ruby) => {
    const rt = ruby.querySelector('rt');
    ruby.replaceWith(rt ? rt.textContent : ruby.textContent);
  });
  return clone.textContent.trim();
}

function createInlineTtsButton(spoken, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tts-btn';
  btn.dataset.speak = spoken;
  btn.setAttribute('aria-label', label);
  btn.innerHTML = `${SPEAKER_SVG}<span>Dengar</span>`;
  return btn;
}

export function scheduleAudioPreload() {
  const needsAudio = Boolean(
    document.querySelector('[data-speak], #testTtsBtn, #speakQuestionBtn, #flashSpeakBtn')
    || /\/(kosakata|kanji|kamus-grammar|flashcard|kuis|percakapan|lab-visual|pengaturan)\.html$/i.test(location.pathname)
    || /\/(grammar|kosakata)\//.test(location.pathname)
  );
  if (!needsAudio) return;
  const run = () => {
    import('./speech.js').then(({ preloadAudioManifest }) => preloadAudioManifest()).catch(() => {});
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 600 });
  } else {
    setTimeout(run, 180);
  }
}

export function initMainPageContent(signal, { closeMenu, onThemeToggle, onFuriganaToggle } = {}) {
  const isAndroidBuild = typeof __ANDROID_APP__ !== 'undefined' && __ANDROID_APP__;

  document.querySelectorAll('.nav-link').forEach((link) => {
    const match = new URL(link.href).pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '') && !link.hash;
    if (match) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const settingsThemeToggle = document.querySelector('#settingsThemeToggle');
  if (settingsThemeToggle) {
    const dark = document.documentElement.classList.contains('dark-mode');
    settingsThemeToggle.setAttribute('aria-pressed', String(dark));
    settingsThemeToggle.textContent = dark ? 'Mode gelap aktif' : 'Mode terang aktif';
    if (onThemeToggle) settingsThemeToggle.addEventListener('click', onThemeToggle, { signal });
  }

  const settingsFuriganaToggle = document.querySelector('#settingsFuriganaToggle');
  const furiganaEnabled = !document.body.classList.contains('furigana-off');
  if (settingsFuriganaToggle) {
    settingsFuriganaToggle.setAttribute('aria-checked', String(furiganaEnabled));
    settingsFuriganaToggle.textContent = furiganaEnabled ? 'Furigana: ON' : 'Furigana: OFF';
    if (onFuriganaToggle) settingsFuriganaToggle.addEventListener('click', onFuriganaToggle, { signal });
  }
  document.querySelectorAll('main rt').forEach((rt) => rt.setAttribute('aria-hidden', String(!furiganaEnabled)));

  const testTtsBtn = document.querySelector('#testTtsBtn');
  const testTtsStatus = document.querySelector('#testTtsStatus');
  testTtsBtn?.addEventListener('click', async () => {
    if (testTtsStatus) {
      testTtsStatus.hidden = false;
      testTtsStatus.textContent = 'Memutar contoh suara: こんにちは、ほんごスタディです。';
    }
    try {
      const { speakJapaneseDetailed } = await import('./speech.js');
      const result = await speakJapaneseDetailed('こんにちは、ほんごスタディです。', { button: testTtsBtn });
      if (testTtsStatus) {
        testTtsStatus.hidden = false;
        testTtsStatus.textContent = result?.spoken
          ? `Audio berhasil diputar (${result.engine || 'audio'}).`
          : `Audio gagal diputar (${result?.reason || 'unknown'}${result?.engine ? ` · ${result.engine}` : ''}).`;
      }
    } catch (err) {
      if (testTtsStatus) {
        testTtsStatus.hidden = false;
        testTtsStatus.textContent = `Gagal memuat modul audio (${err?.message || 'error'}).`;
      }
    }
  }, { signal });

  document.querySelectorAll('table').forEach((table, index) => {
    table.querySelectorAll('thead th').forEach((th) => { th.scope = 'col'; });
    const heading = table.closest('section')?.querySelector('h2, h3');
    if (!table.caption) {
      const caption = table.createCaption();
      caption.className = 'sr-only';
      caption.textContent = `${heading?.textContent.trim() || 'Daftar kosakata'}, tabel ${index + 1}`;
    }
    table.caption.id ||= `table-caption-${index}`;
    const wrapper = table.parentElement;
    if (wrapper?.classList.contains('overflow-x-auto')) {
      wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-labelledby', table.caption.id);
    }
  });

  const mainRoot = document.querySelector('main') || document.body;
  annotateJapanese(mainRoot, { signal });

  const materialCategory = location.pathname.match(/\/(grammar|kosakata)\/([^/]+)\.html$/);
  if (materialCategory) {
    recordVisit(materialCategory[1], materialCategory[2]);
    const hasJapanese = (text) => /[\u3040-\u30ff\u4e00-\u9faf]/.test(text);
    const kind = materialCategory[1];

    if (kind === 'grammar') {
      document.querySelectorAll('.example-box p.font-display').forEach((p) => {
        if (p.parentElement?.querySelector('.tts-btn')) return;
        const spoken = extractSpokenFromNode(p);
        if (!hasJapanese(spoken)) return;
        const row = document.createElement('div');
        row.className = 'mt-2 flex justify-end';
        row.append(createInlineTtsButton(spoken, `Dengarkan contoh ${spoken}`));
        p.parentElement?.append(row);
      });
    } else if (kind === 'kosakata') {
      document.querySelectorAll('main li').forEach((li) => {
        const jpSpan = li.querySelector('span.font-display');
        if (!jpSpan || li.querySelector('.tts-btn')) return;
        const raw = jpSpan.textContent.trim().replace(/^[（(]/, '').replace(/[）)]$/, '');
        const parts = raw.split(/[／/]/).map((s) => s.trim()).filter(Boolean);
        const spoken = (parts.length > 1 && hasJapanese(parts[1]) ? parts[1] : parts[0]) || '';
        if (!hasJapanese(spoken)) return;
        const btn = createInlineTtsButton(spoken, `Dengarkan pelafalan ${spoken}`);
        btn.classList.add('ml-2', 'align-middle');
        li.append(btn);
      });
    }

    mainRoot.addEventListener('click', async (event) => {
      const btn = event.target.closest('[data-speak]');
      if (!btn) return;
      const { speakJapanese } = await import('./speech.js');
      speakJapanese(btn.dataset.speak, { button: btn });
    }, { signal });
  }

  const studyProgress = document.querySelector('#studyProgress');
  const resumeLink = document.querySelector('#resumeStudy');
  const exportButton = document.querySelector('#exportProgress');
  const importButton = document.querySelector('#importProgress');
  const importInput = document.querySelector('#importProgressInput');
  const importStatus = document.querySelector('#importStatus');
  const resetButton = document.querySelector('#resetProgress');
  const metricAnswered = document.querySelector('#metricAnswered');
  const metricCorrect = document.querySelector('#metricCorrect');
  const metricWrong = document.querySelector('#metricWrong');
  const streakPill = document.querySelector('#streakPill');
  const practiceWrongBadge = document.querySelector('#practiceWrongBadge');
  const practiceSrsBadge = document.querySelector('#practiceSrsBadge');

  const renderStudyStatus = () => {
    const progress = getProgress();
    const due = getWrongAnswers().length;
    const srsMap = getSrsMap();
    const srsStudied = Object.keys(srsMap).length;
    const srsDue = getDueSrsCount();
    const activeStreak = getEffectiveStreak(getStreak());

    if (metricAnswered) metricAnswered.textContent = String(progress.answered);
    if (metricCorrect) metricCorrect.textContent = String(progress.correct);
    if (metricWrong) metricWrong.textContent = String(due);
    if (streakPill) {
      streakPill.textContent = activeStreak > 0 ? `Streak ${activeStreak} hari` : 'Tersimpan offline';
    }
    if (practiceWrongBadge) {
      practiceWrongBadge.hidden = due === 0;
      practiceWrongBadge.textContent = due > 0 ? `${due} prioritas ulang` : '';
    }
    if (practiceSrsBadge) {
      practiceSrsBadge.hidden = false;
      practiceSrsBadge.textContent = srsDue > 0
        ? `${srsDue} jatuh tempo`
        : srsStudied > 0
          ? `${srsStudied} kartu dipelajari`
          : '10 kartu baru siap';
    }
    if (resumeLink) {
      const last = progress.last;
      if (last && Object.hasOwn(DESTINATIONS, last.kind)) {
        let href = DESTINATIONS[last.kind];
        if (last.kind === 'quiz' && [...VOCAB_CATEGORIES, 'campuran'].includes(last.category)) href += `?kategori=${last.category}`;
        if ((last.kind === 'grammar' && GRAMMAR_CATEGORIES.includes(last.category)) || (last.kind === 'kosakata' && VOCAB_CATEGORIES.includes(last.category))) {
          href = `${last.kind}/${last.category}.html`;
        }
        resumeLink.href = href;
        resumeLink.textContent = 'Lanjutkan belajar';
      } else {
        resumeLink.href = 'tebak-huruf.html';
        resumeLink.textContent = 'Mulai latihan Kana';
      }
    }
    if (studyProgress) {
      if (progress.answered || srsStudied) {
        const parts = [];
        if (progress.answered) parts.push(`${progress.correct} benar dari ${progress.answered} soal kuis`);
        if (srsStudied) parts.push(`${srsStudied} kartu SRS${srsDue ? ` (${srsDue} jatuh tempo)` : ''}`);
        if (activeStreak > 0) parts.push(`streak ${activeStreak} hari`);
        studyProgress.textContent = `${parts.join(' · ')}. ${due} kosakata perlu diulang.`;
      } else {
        studyProgress.textContent = isAndroidBuild
          ? 'Mulai dengan 10 huruf Kana atau Flashcard SRS. Hasil latihan disimpan di perangkat ini.'
          : 'Mulai dengan 10 huruf Kana atau Flashcard SRS. Hasil latihan disimpan di browser ini.';
      }
    }
  };

  if (resumeLink || studyProgress || metricAnswered || practiceWrongBadge || practiceSrsBadge) {
    renderStudyStatus();
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) renderStudyStatus();
    }, { signal });
  }

  const showImportStatus = (message, isError = false) => {
    if (!importStatus) return;
    importStatus.hidden = false;
    importStatus.textContent = message;
    importStatus.classList.toggle('text-crimson', isError);
    importStatus.classList.toggle('text-emerald-700', !isError);
  };

  importButton?.addEventListener('click', () => {
    importInput?.click();
  }, { signal });

  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;
    if (file.size > 1_048_576) {
      showImportStatus('Ukuran file terlalu besar (maksimal 1 MB).', true);
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = importProgress(parsed);
      if (!result.ok) {
        showImportStatus(result.error, true);
        return;
      }
      renderStudyStatus();
      const { answered, srsCount, streak } = result.summary;
      showImportStatus(
        `Progres berhasil dipulihkan (${answered} soal kuis, ${srsCount} kartu SRS, streak ${streak} hari).`,
        false
      );
    } catch {
      showImportStatus('File tidak dapat dibaca sebagai JSON progres Hongo Study.', true);
    }
  }, { signal });

  exportButton?.addEventListener('click', async () => {
    if (isAndroidBuild) {
      const { exportProgressNative } = await import('./android-bridge.js');
      if (await exportProgressNative()) return;
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportProgress(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hongo-study-progres.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, { signal });

  if (resetButton) {
    let armed = false;
    let resetTimer;
    const defaultLabel = resetButton.textContent.trim() || 'Atur ulang';
    const disarm = () => {
      armed = false;
      clearTimeout(resetTimer);
      resetButton.textContent = defaultLabel;
      resetButton.removeAttribute('data-armed');
    };
    resetButton.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        resetButton.textContent = 'Tekan sekali lagi untuk reset';
        resetButton.setAttribute('data-armed', 'true');
        clearTimeout(resetTimer);
        resetTimer = setTimeout(disarm, 3000);
        return;
      }
      disarm();
      resetProgress();
      renderStudyStatus();
      if (studyProgress) studyProgress.textContent = 'Progres belajar telah diatur ulang.';
    }, { signal });
    signal?.addEventListener('abort', () => clearTimeout(resetTimer), { once: true });
  }

  if (isAndroidBuild) {
    const manualCheckBtn = document.querySelector('#manualCheckUpdate');
    const updateCheckStatus = document.querySelector('#updateCheckStatus');
    const appVersionLabel = document.querySelector('#appVersionLabel');
    if (appVersionLabel) {
      import('@capacitor/app')
        .then(({ App }) => App.getInfo())
        .then((info) => {
          if (info?.version) {
            appVersionLabel.textContent = info.build
              ? `Hongo Study v${info.version} (build ${info.build})`
              : `Hongo Study v${info.version}`;
          }
        })
        .catch(() => {});
    }

    manualCheckBtn?.addEventListener('click', async () => {
      if (manualCheckBtn.disabled) return;
      manualCheckBtn.disabled = true;
      const originalText = manualCheckBtn.textContent;
      manualCheckBtn.textContent = 'Memeriksa...';
      if (updateCheckStatus) updateCheckStatus.textContent = 'Menghubungi server pembaruan...';
      try {
        const { checkForUpdatesManual } = await import('./android-updater.js');
        const result = await checkForUpdatesManual();
        if (updateCheckStatus && result?.message) {
          updateCheckStatus.textContent = result.message;
        }
        if (result?.status === 'update-available') {
          document.getElementById('updateBanner')?.scrollIntoView({
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'nearest',
          });
        }
      } catch {
        if (updateCheckStatus) updateCheckStatus.textContent = 'Gagal memeriksa pembaruan. Coba lagi nanti.';
      } finally {
        manualCheckBtn.disabled = false;
        manualCheckBtn.textContent = originalText;
      }
    }, { signal });
  }

  if (storage.available === false) {
    const storageStatus = document.querySelector('#storageStatus');
    if (storageStatus) storageStatus.hidden = false;
  }

  closeMenu?.();
  scheduleAudioPreload();
}

import { KANJI_CATEGORIES, KANJI_N5 } from './kanji-data.js';
import { escapeHtml } from './study-core.js';
import { SPEAKER_ICON_SVG, speakJapanese } from './speech.js';

(() => {
  const searchInput = document.querySelector('#kanjiSearch');
  const categorySelector = document.querySelector('#kanjiCategorySelector');
  const resultsEl = document.querySelector('#kanjiResults');
  const countEl = document.querySelector('#kanjiResultCount');

  if (!resultsEl) return;

  let currentCategory = 'all';
  let searchTimer;

  function render() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    const filtered = KANJI_N5.filter((item) => {
      if (currentCategory !== 'all' && item.category !== currentCategory) return false;
      if (!query) return true;
      const haystack = `${item.kanji} ${item.onyomi} ${item.kunyomi} ${item.meaning} ${item.example} ${item.reading} ${item.exampleMeaning}`.toLowerCase();
      return haystack.includes(query);
    });

    if (countEl) {
      countEl.textContent = `Menampilkan ${filtered.length} dari ${KANJI_N5.length} Kanji dasar N5`;
    }

    if (!filtered.length) {
      resultsEl.innerHTML = `
        <div class="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p class="text-base font-bold text-slate-700">Kanji tidak ditemukan</p>
          <p class="mt-1 text-sm text-slate-500">Coba kata kunci arti Indonesia, onyomi, kunyomi, atau contoh kata lain.</p>
        </div>`;
      return;
    }

    const furiganaHidden = document.body.classList.contains('furigana-off');
    resultsEl.innerHTML = filtered.map((item) => {
      const cat = KANJI_CATEGORIES[item.category];
      return `
      <article class="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-crimson/50">
        <div>
          <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div class="flex items-center gap-3">
              <span lang="ja" class="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-sakura/30 font-kanji text-4xl font-bold text-crimson">${escapeHtml(item.kanji)}</span>
              <div>
                <h2 class="font-display text-lg font-bold text-ink">${escapeHtml(item.meaning)}</h2>
                <span class="mt-0.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  <span lang="ja">${cat?.badge || ''}</span> ${escapeHtml(cat?.name || '')}
                </span>
              </div>
            </div>
          </div>

          <dl class="mt-3 space-y-1.5 text-xs">
            <div class="flex items-baseline justify-between gap-2">
              <dt class="font-bold text-slate-500">Onyomi</dt>
              <dd lang="ja" class="font-japanese font-semibold text-ink text-right">${escapeHtml(item.onyomi)}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-2">
              <dt class="font-bold text-slate-500">Kunyomi</dt>
              <dd lang="ja" class="font-japanese font-semibold text-crimson text-right">${escapeHtml(item.kunyomi)}</dd>
            </div>
          </dl>

          <div class="mt-3 rounded-xl bg-mist p-3">
            <p class="text-[11px] font-bold text-slate-500">Contoh Kata</p>
            <p class="mt-1 font-display text-lg font-bold text-ink">
              <ruby lang="ja">${escapeHtml(item.example)}<rt aria-hidden="${furiganaHidden}" class="text-xs font-normal text-crimson">${escapeHtml(item.reading)}</rt></ruby>
            </p>
            <p class="mt-0.5 text-xs text-slate-600">${escapeHtml(item.exampleMeaning)}</p>
          </div>
        </div>

        <div class="mt-3 flex justify-end border-t border-slate-100 pt-2.5">
          <button
            type="button"
            class="tts-btn"
            data-speak="${escapeHtml(item.reading)}"
            aria-label="Dengarkan contoh kata ${escapeHtml(item.exampleMeaning)}"
          >
            ${SPEAKER_ICON_SVG}
            <span>Dengar</span>
          </button>
        </div>
      </article>`;
    }).join('');
  }

  resultsEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-speak]');
    if (!btn) return;
    speakJapanese(btn.dataset.speak, { button: btn });
  });

  categorySelector?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-category]');
    if (!btn) return;
    currentCategory = btn.dataset.category || 'all';
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
    render();
  });

  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 120);
  });

  document.addEventListener('hongo-furigana-change', () => {
    const hidden = document.body.classList.contains('furigana-off');
    resultsEl.querySelectorAll('rt').forEach((rt) => {
      rt.setAttribute('aria-hidden', String(hidden));
    });
  });

  render();
})();

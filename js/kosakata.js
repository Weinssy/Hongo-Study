import { quizData, vocabularyCount } from './quiz-data.js';
import { escapeHtml } from './study-core.js';
import { getWrongAnswers } from './progress.js';

(() => {
  const searchInput = document.querySelector('#vocabSearch');
  const resultsContainer = document.querySelector('#vocabResults');
  const filterButtons = document.querySelectorAll('.category-filter-btn');
  const reviewFilterBtn = document.querySelector('#reviewFilterBtn');
  const resultCount = document.querySelector('#vocabResultCount');
  const quizLink = document.querySelector('#vocabQuizLink');

  const categoryMap = {
    waktu: { name: 'Keterangan Waktu', link: 'kosakata/waktu.html', badge: '時間' },
    sekolah: { name: 'Sekolah & Kelas', link: 'kosakata/sekolah.html', badge: '学校' },
    'mata-pelajaran': { name: 'Mata Pelajaran', link: 'kosakata/mata-pelajaran.html', badge: '教科' },
    pekerjaan: { name: 'Pekerjaan & Profesi', link: 'kosakata/pekerjaan.html', badge: '仕事' },
    orang: { name: 'Kata Ganti & Orang', link: 'kosakata/orang.html', badge: '人' },
    keluarga: { name: 'Keluarga & Hubungan', link: 'kosakata/keluarga.html', badge: '家族' }
  };

  const allVocab = [];

  function initVocab() {
    if (allVocab.length > 0) return;
    Object.keys(categoryMap).forEach(catKey => {
      const group = quizData[catKey];
      if (group && group.items) {
        group.items.forEach(item => {
          allVocab.push({
            kanji: item.q,
            romaji: item.r,
            furigana: item.f || item.r,
            meaning: item.a,
            categoryKey: catKey,
            categoryName: categoryMap[catKey].name,
            categoryLink: categoryMap[catKey].link,
            categoryBadge: categoryMap[catKey].badge
          });
        });
      }
    });
  }

  const wrongSet = new Set(getWrongAnswers());
  if (wrongSet.size > 0 && reviewFilterBtn) {
    reviewFilterBtn.hidden = false;
    reviewFilterBtn.textContent = `Perlu Ulang (${wrongSet.size})`;
  }

  let currentCategory = 'all';
  let visibleLimit = 30;
  let announcement;
  let searchTimer;
  const PAGE_SIZE = 30;
  const pagination = document.querySelector('#vocabPagination');

  const updateQuizLink = () => {
    if (!quizLink) return;
    const quizCategory = (currentCategory === 'all' || currentCategory === 'review')
      ? 'campuran'
      : currentCategory;
    quizLink.href = `kuis.html?kategori=${quizCategory}`;
  };

  const render = (resetLimit = true) => {
    initVocab();
    updateQuizLink();
    if (!searchInput || !resultsContainer) return;
    if (resetLimit) visibleLimit = PAGE_SIZE;
    const query = searchInput.value.toLowerCase().trim();

    const filtered = allVocab.filter(item => {
      const matchCat = currentCategory === 'all'
        ? true
        : currentCategory === 'review'
          ? wrongSet.has(item.kanji)
          : item.categoryKey === currentCategory;
      if (!matchCat) return false;
      if (!query) return true;
      const haystack = `${item.kanji} ${item.romaji} ${item.furigana} ${item.meaning}`.toLowerCase();
      return haystack.includes(query);
    });

    if (resultCount) {
      clearTimeout(announcement);
      announcement = setTimeout(() => { resultCount.textContent = `Menampilkan ${Math.min(visibleLimit, filtered.length)} dari ${filtered.length} kosakata`; }, 300);
    }

    if (filtered.length === 0) {
      resultsContainer.innerHTML = `
        <div class="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p class="text-base font-bold text-slate-700">Kosakata tidak ditemukan</p>
          <p class="mt-1 text-sm text-slate-500">Coba gunakan kata kunci bahasa Indonesia, romaji, atau kanji lainnya.</p>
        </div>`;
      pagination?.replaceChildren();
      return;
    }

    const furiganaHidden = document.body.classList.contains('furigana-off');
    const visibleItems = filtered.slice(0, visibleLimit);
    resultsContainer.innerHTML = visibleItems.map(item => {
      const isWrong = wrongSet.has(item.kanji);
      return `
      <article class="flex flex-col justify-between rounded-xl border ${isWrong ? 'border-crimson/60' : 'border-slate-200'} bg-white p-4 shadow-sm transition-colors hover:border-crimson/50">
        <div>
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="rounded-full bg-sakura/30 px-2.5 py-0.5 text-xs font-bold text-crimson">
                <span lang="ja">${item.categoryBadge}</span> ${item.categoryName}
              </span>
              ${isWrong ? '<span class="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">Perlu Ulang</span>' : ''}
            </div>
            <span class="text-xs font-semibold text-slate-400">${escapeHtml(item.romaji)}</span>
          </div>
          <div class="mt-3">
            <p class="font-display text-2xl font-bold text-ink">
              <ruby lang="ja">${escapeHtml(item.kanji)}<rt aria-hidden="${furiganaHidden}" class="text-sm font-normal text-crimson">${escapeHtml(item.furigana)}</rt></ruby>
            </p>
            <p class="mt-1 text-sm font-semibold text-slate-700">${escapeHtml(item.meaning)}</p>
          </div>
        </div>
        <div class="mt-4 border-t border-slate-100 pt-2 flex justify-end">
          <a href="${item.categoryLink}" class="inline-flex items-center text-xs font-bold text-crimson hover:underline">
            Buka di ${item.categoryName} &rarr;
          </a>
        </div>
      </article>
    `;
    }).join('');

    if (pagination) {
      pagination.replaceChildren();
      const remaining = filtered.length - visibleItems.length;
      if (remaining > 0) {
        const moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.className = 'secondary-button';
        moreBtn.textContent = `Tampilkan ${Math.min(PAGE_SIZE, remaining)} kosakata lagi (${remaining} tersisa)`;
        moreBtn.addEventListener('click', () => {
          visibleLimit += PAGE_SIZE;
          render(false);
        });
        pagination.append(moreBtn);
      }
    }
  };

  if (filterButtons.length) {
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => {
          b.classList.remove('bg-crimson', 'text-white', 'border-crimson');
          b.classList.add('border', 'border-slate-200', 'bg-white', 'text-slate-700');
        });
        btn.classList.add('bg-crimson', 'text-white', 'border-crimson');
        btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
        currentCategory = btn.getAttribute('data-category') || 'all';
        filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button === btn)));
        render(true);
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => render(true), 150);
    });
  }

  const total = document.querySelector('#vocabularyTotal');
  if (total) total.textContent = vocabularyCount;
  filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === 'all')));
  render();
})();

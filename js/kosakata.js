(() => {
  const searchInput = document.querySelector('#vocabSearch');
  const resultsContainer = document.querySelector('#vocabResults');
  const filterButtons = document.querySelectorAll('.category-filter-btn');
  const resultCount = document.querySelector('#vocabResultCount');

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
    const quizData = window.HONGO_QUIZ_DATA || {};
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

  let currentCategory = 'all';

  const render = () => {
    initVocab();
    if (!searchInput || !resultsContainer) return;
    const query = searchInput.value.toLowerCase().trim();

    const filtered = allVocab.filter(item => {
      const matchCat = currentCategory === 'all' || item.categoryKey === currentCategory;
      if (!matchCat) return false;
      if (!query) return true;
      const haystack = `${item.kanji} ${item.romaji} ${item.furigana} ${item.meaning}`.toLowerCase();
      return haystack.includes(query);
    });

    if (resultCount) {
      resultCount.textContent = `Menampilkan ${filtered.length} dari ${allVocab.length} kosakata`;
    }

    if (filtered.length === 0) {
      resultsContainer.innerHTML = `
        <div class="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p class="text-base font-bold text-slate-700">Kosakata tidak ditemukan</p>
          <p class="mt-1 text-sm text-slate-500">Coba gunakan kata kunci bahasa Indonesia, romaji, atau kanji lainnya.</p>
        </div>`;
      return;
    }

    resultsContainer.innerHTML = filtered.map(item => `
      <article class="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-crimson/50">
        <div>
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <span class="rounded-full bg-sakura/30 px-2.5 py-0.5 text-xs font-bold text-crimson">
              ${item.categoryBadge} ${item.categoryName}
            </span>
            <span class="text-xs font-semibold text-slate-400">${item.romaji}</span>
          </div>
          <div class="mt-3">
            <p class="font-display text-2xl font-bold text-ink">
              <ruby>${item.kanji}<rt class="text-sm font-normal text-crimson">${item.furigana}</rt></ruby>
            </p>
            <p class="mt-1 text-sm font-semibold text-slate-700">${item.meaning}</p>
          </div>
        </div>
        <div class="mt-4 border-t border-slate-100 pt-2 flex justify-end">
          <a href="${item.categoryLink}" class="inline-flex items-center text-xs font-bold text-crimson hover:underline">
            Buka di ${item.categoryName} &rarr;
          </a>
        </div>
      </article>
    `).join('');
  };

  if (filterButtons.length) {
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => {
          b.classList.remove('bg-crimson', 'text-white');
          b.classList.add('bg-white', 'text-slate-700');
        });
        btn.classList.add('bg-crimson', 'text-white');
        btn.classList.remove('bg-white', 'text-slate-700');
        currentCategory = btn.getAttribute('data-category') || 'all';
        render();
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', render);
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('load', render);
  render();
})();

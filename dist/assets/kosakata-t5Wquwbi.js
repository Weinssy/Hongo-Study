import"./main-Y6On9zBn.js";import"./quiz-data-BNbsWXo_.js";(()=>{let e=document.querySelector(`#vocabSearch`),t=document.querySelector(`#vocabResults`),n=document.querySelectorAll(`.category-filter-btn`),r=document.querySelector(`#vocabResultCount`),i={waktu:{name:`Keterangan Waktu`,link:`kosakata/waktu.html`,badge:`時間`},sekolah:{name:`Sekolah & Kelas`,link:`kosakata/sekolah.html`,badge:`学校`},"mata-pelajaran":{name:`Mata Pelajaran`,link:`kosakata/mata-pelajaran.html`,badge:`教科`},pekerjaan:{name:`Pekerjaan & Profesi`,link:`kosakata/pekerjaan.html`,badge:`仕事`},orang:{name:`Kata Ganti & Orang`,link:`kosakata/orang.html`,badge:`人`},keluarga:{name:`Keluarga & Hubungan`,link:`kosakata/keluarga.html`,badge:`家族`}},a=[];function o(){if(a.length>0)return;let e=window.HONGO_QUIZ_DATA||{};Object.keys(i).forEach(t=>{let n=e[t];n&&n.items&&n.items.forEach(e=>{a.push({kanji:e.q,romaji:e.r,furigana:e.f||e.r,meaning:e.a,categoryKey:t,categoryName:i[t].name,categoryLink:i[t].link,categoryBadge:i[t].badge})})})}let s=`all`,c=()=>{if(o(),!e||!t)return;let n=e.value.toLowerCase().trim(),i=a.filter(e=>s!==`all`&&e.categoryKey!==s?!1:!n||`${e.kanji} ${e.romaji} ${e.furigana} ${e.meaning}`.toLowerCase().includes(n));if(r&&(r.textContent=`Menampilkan ${i.length} dari ${a.length} kosakata`),i.length===0){t.innerHTML=`
        <div class="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p class="text-base font-bold text-slate-700">Kosakata tidak ditemukan</p>
          <p class="mt-1 text-sm text-slate-500">Coba gunakan kata kunci bahasa Indonesia, romaji, atau kanji lainnya.</p>
        </div>`;return}t.innerHTML=i.map(e=>`
      <article class="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-crimson/50">
        <div>
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <span class="rounded-full bg-sakura/30 px-2.5 py-0.5 text-xs font-bold text-crimson">
              ${e.categoryBadge} ${e.categoryName}
            </span>
            <span class="text-xs font-semibold text-slate-400">${e.romaji}</span>
          </div>
          <div class="mt-3">
            <p class="font-display text-2xl font-bold text-ink">
              <ruby>${e.kanji}<rt class="text-sm font-normal text-crimson">${e.furigana}</rt></ruby>
            </p>
            <p class="mt-1 text-sm font-semibold text-slate-700">${e.meaning}</p>
          </div>
        </div>
        <div class="mt-4 border-t border-slate-100 pt-2 flex justify-end">
          <a href="${e.categoryLink}" class="inline-flex items-center text-xs font-bold text-crimson hover:underline">
            Buka di ${e.categoryName} &rarr;
          </a>
        </div>
      </article>
    `).join(``)};n.length&&n.forEach(e=>{e.addEventListener(`click`,()=>{n.forEach(e=>{e.classList.remove(`bg-crimson`,`text-white`),e.classList.add(`bg-white`,`text-slate-700`)}),e.classList.add(`bg-crimson`,`text-white`),e.classList.remove(`bg-white`,`text-slate-700`),s=e.getAttribute(`data-category`)||`all`,c()})}),e&&e.addEventListener(`input`,c),document.addEventListener(`DOMContentLoaded`,c),window.addEventListener(`load`,c),c()})();
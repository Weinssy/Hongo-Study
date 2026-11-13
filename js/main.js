import { storage } from './storage.js';
import { annotateJapanese } from './language.js';
import { exportProgress, getProgress, getWrongAnswers, recordVisit } from './progress.js';

(() => {
  const menuButton = document.querySelector('#menuButton');
  const nav = document.querySelector('#mainNav');
  const themeToggle = document.querySelector('#themeToggle');
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const applyTheme = dark => {
    document.documentElement.classList.toggle('dark-mode', dark);
    themeToggle?.setAttribute('aria-pressed', String(dark));
  };
  const savedTheme = storage.get('nihongo-theme');
  applyTheme(savedTheme ? savedTheme === 'dark' : systemTheme.matches);
  systemTheme.addEventListener('change', event => {
    if (!storage.get('nihongo-theme')) applyTheme(event.matches);
  });
  themeToggle?.addEventListener('click', () => {
    const dark = !document.documentElement.classList.contains('dark-mode');
    applyTheme(dark);
    storage.set('nihongo-theme', dark ? 'dark' : 'light');
  });
  const closeMenu = () => {
    nav?.classList.add('hidden');
    menuButton?.setAttribute('aria-expanded', 'false');
  };
  menuButton?.addEventListener('click', () => {
    const closed = nav.classList.toggle('hidden');
    menuButton.setAttribute('aria-expanded', String(!closed));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('header')) closeMenu();
  });
  document.querySelectorAll('.nav-link').forEach(link => {
    if (new URL(link.href).pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '') && !link.hash) link.setAttribute('aria-current', 'page');
    link.addEventListener('click', closeMenu);
  });

  const storageStatus = document.querySelector('#storageStatus');
  const showStorageStatus = () => { if (storageStatus) storageStatus.hidden = storage.available; };
  window.addEventListener('study-storage-unavailable', showStorageStatus);

  const toggle = document.querySelector('#furiganaToggle');
  const applyFurigana = enabled => {
    document.body.classList.toggle('furigana-off', !enabled);
    toggle?.setAttribute('aria-checked', String(enabled));
    toggle?.setAttribute('aria-label', 'Furigana');
    document.querySelectorAll('rt').forEach(rt => rt.setAttribute('aria-hidden', String(!enabled)));
    if (toggle) {
      document.querySelector('#furiganaState').textContent = enabled ? 'ON' : 'OFF';
      document.querySelector('#furiganaDot').classList.toggle('bg-crimson', enabled);
      document.querySelector('#furiganaDot').classList.toggle('bg-slate-400', !enabled);
    }
  };
  applyFurigana(storage.get('hongo-furigana', 'on') !== 'off');
  toggle?.addEventListener('click', () => {
    const enabled = document.body.classList.contains('furigana-off');
    applyFurigana(enabled);
    storage.set('hongo-furigana', enabled ? 'on' : 'off');
  });

  document.querySelectorAll('table').forEach((table, index) => {
    table.querySelectorAll('thead th').forEach(th => { th.scope = 'col'; });
    const heading = table.closest('section')?.querySelector('h2, h3');
    if (!table.caption) {
      const caption = table.createCaption();
      caption.className = 'sr-only';
      caption.textContent = `${heading?.textContent.trim() || 'Daftar kosakata'}, tabel ${index + 1}`;
    }
    table.caption.id ||= `table-caption-${index}`;
    const wrapper = table.parentElement;
    if (wrapper.classList.contains('overflow-x-auto')) {
      wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-labelledby', table.caption.id);
    }
  });
  annotateJapanese();
  const materialCategory = location.pathname.match(/\/(grammar|kosakata)\/([^/]+)\.html$/);
  if (materialCategory) recordVisit(materialCategory[1], materialCategory[2]);

  const resumeLink = document.querySelector('#resumeStudy');
  if (resumeLink) {
    const progress = getProgress();
    const due = getWrongAnswers().length;
    const last = progress.last;
    const destinations = { drill: 'tebak-huruf.html', quiz: 'kuis.html', grammar: 'kamus-grammar.html', kosakata: 'kosakata.html', conversation: 'percakapan.html' };
    const vocabularyCategories = ['waktu', 'sekolah', 'mata-pelajaran', 'pekerjaan', 'orang', 'keluarga'];
    const grammarCategories = ['struktur-kalimat', 'partikel-dasar', 'kata-kerja', 'kata-sifat', 'pertanyaan-negatif', 'kebutuhan-sehari-hari', 'keberadaan-lokasi', 'ungkapan-salam'];
    if (last && Object.hasOwn(destinations, last.kind)) {
      let href = destinations[last.kind];
      if (last.kind === 'quiz' && [...vocabularyCategories, 'campuran'].includes(last.category)) href += `?kategori=${last.category}`;
      if ((last.kind === 'grammar' && grammarCategories.includes(last.category)) || (last.kind === 'kosakata' && vocabularyCategories.includes(last.category))) href = `${last.kind}/${last.category}.html`;
      resumeLink.href = href;
      resumeLink.textContent = 'Lanjutkan belajar';
    }
    document.querySelector('#studyProgress').textContent = progress.answered
      ? `${progress.correct} jawaban benar dari ${progress.answered} soal kuis. ${due} kosakata perlu diulang.`
      : 'Mulai dengan 10 huruf Kana. Hasil latihan disimpan di browser ini.';
    document.querySelector('#exportProgress').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(exportProgress(), null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hongo-study-progres.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  showStorageStatus();
  const entries = [
    // 1. Struktur Kalimat & です
    { keys:'wa desu は です identitas kalimat struktur pola dasar predikat sopan', title:'~ wa ~ desu', meaning:'Menyatakan identitas, profesi, atau keadaan dengan sopan.', formula:'A は B です', example:'<ruby>私<rt>わたし</rt></ruby>は<ruby>高校生<rt>こうこうせい</rt></ruby>です。', translation:'Saya adalah siswa SMA.', category:'1. Struktur Kalimat & です', link:'grammar/struktur-kalimat.html' },
    { keys:'dewa ja arimasen bukan negasi では ではありません じゃありません', title:'~ dewa / ja arimasen', meaning:'Bentuk negatif sopan untuk menyatakan bukan (penyangkalan identitas).', formula:'A は B ではありません', example:'<ruby>私<rt>わたし</rt></ruby>は<ruby>先生<rt>せんせい</rt></ruby>ではありません。', translation:'Saya bukan guru.', category:'1. Struktur Kalimat & です', link:'grammar/struktur-kalimat.html' },

    // 2. Partikel Dasar
    { keys:'wa topik penanda partikel は', title:'Partikel は (wa)', meaning:'Menandai topik utama yang sedang dibicarakan.', formula:'Topik は Predikat', example:'<ruby>今日<rt>きょう</rt></ruby>は<ruby>月曜日<rt>げつようび</rt></ruby>です。', translation:'Hari ini adalah hari Senin.', category:'2. Partikel Dasar', link:'grammar/partikel-dasar.html' },
    { keys:'ga subjek penegas partikel ada suka が', title:'Partikel が (ga)', meaning:'Menandai subjek spesifik, fokus penegas, atau objek keberadaan & kesukaan.', formula:'Subjek が Predikat', example:'<ruby>雨<rt>あめ</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>っています。', translation:'Hujan turun.', category:'2. Partikel Dasar', link:'grammar/partikel-dasar.html' },
    { keys:'o wo objek langsung partikel kata kerja を', title:'Partikel を (o)', meaning:'Menandai objek langsung sasaran tindakan kata kerja transitif.', formula:'Objek を Kata kerja', example:'<ruby>本<rt>ほん</rt></ruby>を<ruby>読<rt>よ</rt></ruby>みます。', translation:'Membaca buku.', category:'2. Partikel Dasar', link:'grammar/partikel-dasar.html' },
    { keys:'ni waktu tujuan pergi ke jam に いきます', title:'Partikel に (ni)', meaning:'Menandai titik tujuan arah, waktu tertentu dengan angka, atau titik keberadaan.', formula:'Tempat / Waktu に', example:'<ruby>学校<rt>がっこう</rt></ruby>に<ruby>行<rt>い</rt></ruby>きます。', translation:'Saya pergi ke sekolah.', category:'2. Partikel Dasar', link:'grammar/partikel-dasar.html' },
    { keys:'de tempat aktivitas alat sarana kendaraan で べんきょう', title:'Partikel で (de)', meaning:'Menandai tempat berlangsungnya kegiatan aksi atau sarana/alat/metode.', formula:'Tempat / Sarana で', example:'<ruby>図書館<rt>としょかん</rt></ruby>で<ruby>勉強<rt>べんきょう</rt></ruby>します。', translation:'Saya belajar di perpustakaan.', category:'2. Partikel Dasar', link:'grammar/partikel-dasar.html' },
    { keys:'to dan bersama kawan dengan と ともだち', title:'Partikel と (to)', meaning:'Menghubungkan dua kata benda (dan) atau menandai melakukan sesuatu bersama seseorang.', formula:'A と B / Orang と', example:'<ruby>友達<rt>ともだち</rt></ruby>と<ruby>話<rt>はな</rt></ruby>します。', translation:'Saya berbicara dengan teman.', category:'2. Partikel Dasar', link:'grammar/partikel-dasar.html' },
    { keys:'kara made dari sampai waktu tempat から まで', title:'Partikel から 〜 まで', meaning:'Menunjukkan batas awal (mulai dari) dan batas akhir (sampai/hingga).', formula:'A から B まで', example:'<ruby>九時<rt>くじ</rt></ruby>から<ruby>三時<rt>さんじ</rt></ruby>まで<ruby>学校<rt>がっこう</rt></ruby>です。', translation:'Saya di sekolah dari jam sembilan sampai jam tiga.', category:'2. Partikel Dasar', link:'grammar/partikel-dasar.html' },

    // 3. Kata Kerja & Perubahannya
    { keys:'masu positif sekarang masa depan sopan kata kerja ます', title:'Bentuk ~ masu', meaning:'Bentuk positif sopan untuk kebiasaan saat ini atau masa depan.', formula:'Stem Kata kerja + ます', example:'<ruby>毎日<rt>まいにち</rt></ruby><ruby>勉強<rt>べんきょう</rt></ruby>します。', translation:'Saya belajar setiap hari.', category:'3. Kata Kerja & Perubahannya', link:'grammar/kata-kerja.html' },
    { keys:'masen tidak negasi masa depan sekarang ません', title:'Bentuk ~ masen', meaning:'Bentuk negatif sopan untuk kegiatan yang tidak dilakukan saat ini atau masa depan.', formula:'Stem Kata kerja + ません', example:'<ruby>明日<rt>あした</rt></ruby>は<ruby>勉強<rt>べんきょう</rt></ruby>しません。', translation:'Besok saya tidak belajar.', category:'3. Kata Kerja & Perubahannya', link:'grammar/kata-kerja.html' },
    { keys:'mashita lampau sudah selesai positif ました', title:'Bentuk ~ mashita', meaning:'Bentuk positif sopan untuk kegiatan yang sudah selesai di masa lampau.', formula:'Stem Kata kerja + ました', example:'<ruby>昨日<rt>きのう</rt></ruby>、<ruby>本<rt>ほん</rt></ruby>を<ruby>読<rt>よ</rt></ruby>みました。', translation:'Kemarin saya membaca buku.', category:'3. Kata Kerja & Perubahannya', link:'grammar/kata-kerja.html' },
    { keys:'masen deshita lampau tidak negasi ませんでした', title:'Bentuk ~ masen deshita', meaning:'Bentuk negatif sopan untuk perbuatan yang tidak dilakukan di masa lampau.', formula:'Stem Kata kerja + ませんでした', example:'テレビを<ruby>見<rt>み</rt></ruby>ませんでした。', translation:'Saya tidak menonton TV.', category:'3. Kata Kerja & Perubahannya', link:'grammar/kata-kerja.html' },

    // 4. Kata Sifat
    { keys:'i keiyoushi kata sifat i kunai katta panas mahal い', title:'Kata Sifat い (I-keiyoushi)', meaning:'Kata sifat berakhiran i; negatif menjadi -kunai, lampau -katta.', formula:'Sifat-i + です / 〜くないです', example:'この<ruby>本<rt>ほん</rt></ruby>は<ruby>高<rt>たか</rt></ruby>くないです。', translation:'Buku ini tidak mahal.', category:'4. Kata Sifat', link:'grammar/kata-sifat.html' },
    { keys:'na keiyoushi kata sifat na tenang bersih dewa arimasen な', title:'Kata Sifat な (Na-keiyoushi)', meaning:'Kata sifat na berkarakter seperti kata benda kualitas; memakai "na" saat menerangkan benda.', formula:'Sifat-na + です / な + Benda', example:'この<ruby>部屋<rt>へや</rt></ruby>は<ruby>静<rt>しず</rt></ruby>かです。', translation:'Kamar ini tenang.', category:'4. Kata Sifat', link:'grammar/kata-sifat.html' },

    // 5. Pertanyaan & Kalimat Negatif
    { keys:'ka tanya partikel pertanyaan apakah か ですか', title:'Partikel Tanya か (ka)', meaning:'Diletakkan di akhir kalimat untuk mengubah kalimat menjadi pertanyaan sopan.', formula:'Kalimat + か', example:'<ruby>学生<rt>がくせい</rt></ruby>ですか。', translation:'Apakah kamu siswa?', category:'5. Pertanyaan & Kalimat Negatif', link:'grammar/pertanyaan-negatif.html' },
    { keys:'kata tanya nani doko dare itsu ikura apa di mana siapa kapan berapa 何 どこ だれ いつ', title:'Kata Tanya (何・どこ・だれ・いつ)', meaning:'Kata tanya pokok untuk menanyakan informasi spesifik dalam percakapan.', formula:'Kata Tanya + ですか / Predikat', example:'<ruby>駅<rt>えき</rt></ruby>はどこですか。', translation:'Stasiun ada di mana?', category:'5. Pertanyaan & Kalimat Negatif', link:'grammar/pertanyaan-negatif.html' },

    // 6. Pola untuk Kebutuhan Sehari-hari
    { keys:'o kudasai minta tolong berikan barang belanja をください', title:'~ o kudasai', meaning:'Meminta suatu benda dengan sopan di toko, restoran, atau kelas.', formula:'Benda を ください', example:'<ruby>水<rt>みず</rt></ruby>をください。', translation:'Tolong berikan air.', category:'6. Pola Sehari-hari', link:'grammar/kebutuhan-sehari-hari.html' },
    { keys:'tai desu ingin mau hasrat keinginan たいです', title:'~ tai desu', meaning:'Menyatakan keinginan diri sendiri untuk melakukan suatu tindakan.', formula:'Stem Kata kerja + たいです', example:'<ruby>日本語<rt>にほんご</rt></ruby>を<ruby>話<rt>はな</rt></ruby>したいです。', translation:'Saya ingin berbicara bahasa Jepang.', category:'6. Pola Sehari-hari', link:'grammar/kebutuhan-sehari-hari.html' },
    { keys:'mashou masenka ayo mari ajakan tawaran ましょう ませんか', title:'~ mashou / ~ masen ka', meaning:'Mengajak melakukan sesuatu (mashou = ayo/mari, masenka = maukah...?).', formula:'Stem Kata kerja + ましょう / ませんか', example:'<ruby>一緒<rt>いっしょ</rt></ruby>に<ruby>行<rt>い</rt></ruby>きませんか。', translation:'Maukah pergi bersama?', category:'6. Pola Sehari-hari', link:'grammar/kebutuhan-sehari-hari.html' },

    // 7. Keberadaan & Lokasi
    { keys:'ga arimasu imasu ada keberadaan lokasi benda orang があります います', title:'~ ga arimasu / imasu', meaning:'Menyatakan keberadaan benda mati (arimasu) atau makhluk hidup (imasu).', formula:'Tempat に Benda/Orang が あります／います', example:'<ruby>教室<rt>きょうしつ</rt></ruby>に<ruby>机<rt>つくえ</rt></ruby>があります。', translation:'Ada meja di dalam kelas.', category:'7. Keberadaan & Lokasi', link:'grammar/keberadaan-lokasi.html' },
    { keys:'wa ni arimasu imasu letak posisi lokasi benda は にあります', title:'A は Tempat に あります／います', meaning:'Menyatakan posisi letak atau lokasi dari subjek yang sudah diketahui.', formula:'Subjek は Tempat に あります／います', example:'<ruby>銀行<rt>ぎんこう</rt></ruby>はあそこにあります。', translation:'Bank ada di sebelah sana.', category:'7. Keberadaan & Lokasi', link:'grammar/keberadaan-lokasi.html' },

    // Kategori Khusus: Ungkapan & Salam
    { keys:'aisatsu salam ungkapan ohayou selamat pagi おはよう', title:'Aisatsu: Ohayou gozaimasu', meaning:'Salam sopan yang diucapkan pada pagi hari.', formula:'おはようございます', example:'おはようございます。', translation:'Selamat pagi.', category:'Ungkapan & Salam', link:'grammar/ungkapan-salam.html' },
    { keys:'aisatsu salam ungkapan konnichiwa selamat siang halo こんにちは', title:'Aisatsu: Konnichiwa', meaning:'Salam umum yang digunakan pada siang hingga sore hari.', formula:'こんにちは', example:'こんにちは。<ruby>元気<rt>げんき</rt></ruby>ですか。', translation:'Halo. Apa kabar?', category:'Ungkapan & Salam', link:'grammar/ungkapan-salam.html' },
    { keys:'aisatsu salam ungkapan konbanwa selamat malam こんばんは', title:'Aisatsu: Konbanwa', meaning:'Salam yang digunakan saat hari sudah malam.', formula:'こんばんは', example:'こんばんは。', translation:'Selamat malam.', category:'Ungkapan & Salam', link:'grammar/ungkapan-salam.html' },
    { keys:'aisatsu salam ungkapan arigatou terima kasih ありがとう', title:'Aisatsu: Arigatou gozaimasu', meaning:'Ungkapan terima kasih yang sopan.', formula:'ありがとうございます', example:'ありがとうございます。', translation:'Terima kasih banyak.', category:'Ungkapan & Salam', link:'grammar/ungkapan-salam.html' },
    { keys:'aisatsu salam ungkapan sumimasen maaf permisi すみません', title:'Aisatsu: Sumimasen', meaning:'Ungkapan meminta maaf atau memanggil perhatian dengan santun.', formula:'すみません', example:'すみません、<ruby>駅<rt>えき</rt></ruby>はどこですか。', translation:'Permisi, stasiun ada di mana?', category:'Ungkapan & Salam', link:'grammar/ungkapan-salam.html' },
    { keys:'aisatsu salam ungkapan sayounara sampai jumpa perpisahan さようなら', title:'Aisatsu: Sayounara', meaning:'Salam perpisahan saat tidak akan bertemu dalam jangka waktu tertentu.', formula:'さようなら', example:'さようなら。また<ruby>明日<rt>あした</rt></ruby>。', translation:'Sampai jumpa. Sampai besok.', category:'Ungkapan & Salam', link:'grammar/ungkapan-salam.html' }
  ];
  const search = document.querySelector('#grammarSearch'); const results = document.querySelector('#grammarResults');
  if (search && results) {
    const render = () => {
      const query = search.value.toLowerCase().trim();
      const found = entries.filter(entry => !query || `${entry.keys} ${entry.title} ${entry.meaning} ${entry.category || ''}`.toLowerCase().includes(query));
      results.innerHTML = found.length ? found.map(entry => `
        <article class="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
          <div>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <strong class="font-display text-lg text-crimson">${entry.title}</strong>
              <span class="rounded-full bg-sakura/40 px-3 py-1 text-xs font-bold">${entry.formula}</span>
            </div>
            ${entry.category ? `<span class="mt-2 inline-block rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">${entry.category}</span>` : ''}
            <p class="mt-2 text-sm text-slate-600 leading-relaxed">${entry.meaning}</p>
            <div class="mt-3 rounded-lg bg-mist p-3">
              <p lang="ja" class="font-display text-xl text-ink">${entry.example}</p>
              <p class="mt-1 text-xs text-slate-500">${entry.translation}</p>
            </div>
          </div>
          ${entry.link ? `<div class="mt-4 flex justify-end border-t border-slate-100 pt-3"><a href="${entry.link}" class="inline-flex items-center gap-1 text-xs font-bold text-crimson hover:underline">Pelajari di ${entry.category} &rarr;</a></div>` : ''}
        </article>
      `).join('') : '<p class="col-span-full rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Pola tata bahasa tidak ditemukan. Coba kata kunci lain seperti <em>wa, desu, pergi, kata sifat, atau salam</em>.</p>';
    };
    const count = document.querySelector('#grammarResultCount');
    let announcement;
    const update = () => {
      render();
      clearTimeout(announcement);
      announcement = setTimeout(() => {
        if (count) count.textContent = `${results.querySelectorAll('article').length} pola ditemukan.`;
      }, 300);
      applyFurigana(!document.body.classList.contains('furigana-off'));
    };
    search.addEventListener('input', update);
    update();
  }
})();

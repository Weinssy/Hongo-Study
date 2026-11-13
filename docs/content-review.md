# Pemeriksaan konten pembelajaran

`js/quiz-data.js` adalah sumber data untuk katalog dan kuis. ID memakai kategori dan tulisan Jepang sehingga tidak bergantung pada urutan entri. Jumlah katalog dihitung dari sumber ini; materi penjelasan manual dapat mencakup kosakata tambahan.

Perubahan bacaan diperiksa secara manual, kemudian jalankan `npm test`. Pengujian memastikan format kana, kesesuaian transliterasi, ID unik, bacaan hari yang ditinjau, dan variasi romaji. Pengujian transliterasi tidak memverifikasi arti atau menggantikan peninjauan pengajar bahasa Jepang.

Koreksi 13 November 2026: 金曜日 menjadi きんようび, dan ノート mempertahankan tanda vokal panjang. Pada drill, bentuk kata seperti 食べる dan 名前 ditampilkan utuh; bacaan huruf tunggal dipisahkan dari bentuk kata.

Rujukan peninjauan: [Japan Foundation, MARUGOTO-NO-KOTOBA](https://words.marugotoweb.jp/static_contents/pc/about/about.php?lang=en). Cantumkan rujukan dan alasan ketika menambah bacaan yang ambigu. Script yang menulis furigana otomatis telah dihapus agar hasil konversi tidak dianggap sebagai bacaan terverifikasi.

Kebijakan drill menerima variasi shi/si, chi/ti, tsu/tu, fu/hu dan padanan vokal panjang ou/oo serta ei/ee. Karakter を menerima wo/o. Apostrof atau tanda hubung setelah n dipertahankan sebagai batas suku kata sebelum vokal/y. Bacaan kanji yang dilatih terlihat pada daftar pilihan; satu karakter dapat mempunyai bacaan lain di konteks berbeda.

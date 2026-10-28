# Hongo Study

Portal pembelajaran bahasa Jepang interaktif berbasis web yang memadukan kurikulum dasar–menengah (JLPT N5–N4), latihan refleks aksara Kana, ensiklopedia kosakata tematik, dan panduan tata bahasa terstruktur dalam antarmuka tipografi modern.

Demo langsung: [https://weinssy.github.io/Hongo-Study/](https://weinssy.github.io/Hongo-Study/)

---

## Ikhtisar

Hongo Study dirancang untuk memberikan pengalaman belajar mandiri yang sistematis, bersih, dan bebas distraksi. Platform ini mengintegrasikan pemrosesan teks bahasa Jepang berbasis standar input romaji, sistem tata bahasa berformula, serta modul visual interaktif.

### Karakteristik Utama

- **Tipografi Terkalibrasi**: Penggunaan font kanji *Shippori Mincho* dan *Zen Kaku Gothic New* yang menjamin proporsi dan akhiran goresan aksara sesuai standar ortografi Jepang.
- **Sistem Furigana Global**: Pembacaan cara baca aksara Kanji menggunakan elemen semantik `<ruby>` dan `<rt>` yang dapat diaktifkan atau dinonaktifkan secara instan.
- **Evaluasi Berulang**: Sistem kuis tematik dengan retensi memori berbasis spaced repetition lokal untuk memprioritaskan soal yang sebelumnya salah dijawab.
- **Desain Asimetris**: Tata letak Bento Grid yang menonjolkan modul latihan utama tanpa beban visual berlebih.

---

## Modul Pembelajaran

### 1. Ruang Latihan
- **Tebak Huruf (Speed Drill)**: Latihan membaca karakter acak Hiragana dan Katakana dengan konversi otomatis romaji menggunakan Wanakana.
- **Roleplay Percakapan**: Simulasi skenario dialog situasional di lingkungan sekolah dan sosial sehari-hari.
- **Kuis Tematik**: Uji pemahaman materi pilihan ganda dengan 6 kategori spesifik (Waktu, Sekolah, Mata Pelajaran, Profesi, Orang, dan Mode Campuran).

### 2. Referensi & Materi
- **Kamus & Pola Tata Bahasa**: Katalog pola kalimat dasar (~wa ~desu, ~tai desu, partikel は, が, を, に, で), konjugasi kata kerja (~masu, ~mashita), dan pembagian kata sifat dengan formula visual.
- **Pusat Kosakata Tematik**: Kumpulan 350+ kosakata terstruktur yang mencakup keterangan waktu, kalender, perlengkapan belajar, profesi, serta sebutan keluarga (*kazoku*).
- **Visual 3D Lab**: Eksplorasi interaktif model anatomi tubuh manusia dan arsitektur menara tradisional Jepang berbasis WebGL/Three.js.

---

## Tumpukan Teknologi

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| Core Engine | Vite 8 | Build tool dan server pengembangan lokal |
| Styling | Tailwind CSS 3.4 & PostCSS | Utilitas layout, variabel warna semantik, dan tipografi |
| Templating | Handlebars | Modularisasi komponen header, footer, dan konteks path |
| Teks Jepang | Wanakana 5.3 | Deteksi dan konversi Hiragana, Katakana, dan Romaji |
| Grafis 3D | Three.js & WebGL | Rendering model interaktif anatomi dan lanskap arsitektur |
| Deployment | GitHub Actions & Pages | Pipeline CI/CD otomatis pada branch utama |

---

## Memulai Proyek

### Prasyarat
- Node.js versi 18 atau lebih baru
- npm versi 9 atau lebih baru

### Instalasi

1. Kloning repositori:
   ```bash
   git clone https://github.com/Weinssy/Hongo-Study.git
   cd Hongo-Study
   ```

2. Pasang dependensi:
   ```bash
   npm install
   ```

3. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
   Akses antarmuka melalui alamat lokal yang ditampilkan di terminal (default: `http://localhost:5173`).

### Build untuk Produksi

Kompilasi seluruh modul statis ke dalam direktori `dist/`:
```bash
npm run build
```

Untuk menguji hasil kompilasi produksi secara lokal:
```bash
npm run preview
```

---

## Struktur Direktori

```text
Hongo-Study/
├── .github/workflows/     Alur kerja otomatisasi deployment GitHub Actions
├── css/                   File sumber Tailwind dan stylesheet kustom
├── grammar/               Halaman materi pola kalimat dan tata bahasa
├── js/                    Logika aplikasi (kuis, data kosakata, tebak huruf)
├── kosakata/              Halaman materi kosakata tematik
├── public/                Aset statis, tekstur 3D, dan data pendukung
├── src/partials/          Komponen modular Handlebars (header, footer)
├── DESIGN.md              Spesifikasi sistem desain dan panduan tipografi
├── index.html             Halaman beranda utama
├── package.json           Manifes proyek dan dependensi
├── tailwind.config.cjs    Konfigurasi tema, warna, dan ekstensi font
└── vite.config.js         Konfigurasi bundler Vite dan plugin Handlebars
```

---

## Lisensi

Proyek ini dirilis di bawah lisensi [ISC](LICENSE).

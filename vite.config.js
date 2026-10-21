import { defineConfig } from 'vite';
import handlebars from 'vite-plugin-handlebars';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  plugins: [
    handlebars({
      partialDirectory: resolve(import.meta.dirname, 'src/partials'),
      context(pagePath) {
        const isNested = pagePath.includes('/grammar/') || pagePath.includes('\\grammar\\') ||
                         pagePath.includes('/kosakata/') || pagePath.includes('\\kosakata\\');
        return {
          isMenara: pagePath.includes('menara-jepang.html'),
          rootPath: isNested ? '../' : './'
        };
      }
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        kamusGrammar: resolve(import.meta.dirname, 'kamus-grammar.html'),
        kosakata: resolve(import.meta.dirname, 'kosakata.html'),
        grammarStrukturKalimat: resolve(import.meta.dirname, 'grammar/struktur-kalimat.html'),
        grammarPartikelDasar: resolve(import.meta.dirname, 'grammar/partikel-dasar.html'),
        grammarKataKerja: resolve(import.meta.dirname, 'grammar/kata-kerja.html'),
        grammarKataSifat: resolve(import.meta.dirname, 'grammar/kata-sifat.html'),
        grammarPertanyaanNegatif: resolve(import.meta.dirname, 'grammar/pertanyaan-negatif.html'),
        grammarKebutuhanSehariHari: resolve(import.meta.dirname, 'grammar/kebutuhan-sehari-hari.html'),
        grammarKeberadaanLokasi: resolve(import.meta.dirname, 'grammar/keberadaan-lokasi.html'),
        grammarUngkapanSalam: resolve(import.meta.dirname, 'grammar/ungkapan-salam.html'),
        kosakataWaktu: resolve(import.meta.dirname, 'kosakata/waktu.html'),
        kosakataSekolah: resolve(import.meta.dirname, 'kosakata/sekolah.html'),
        kosakataMataPelajaran: resolve(import.meta.dirname, 'kosakata/mata-pelajaran.html'),
        kosakataPekerjaan: resolve(import.meta.dirname, 'kosakata/pekerjaan.html'),
        kosakataOrang: resolve(import.meta.dirname, 'kosakata/orang.html'),
        kuis: resolve(import.meta.dirname, 'kuis.html'),
        menaraJepang: resolve(import.meta.dirname, 'menara-jepang.html'),
        japaneseTower: resolve(import.meta.dirname, 'japanese-tower.html'),
        percakapan: resolve(import.meta.dirname, 'percakapan.html'),
        tebakHuruf: resolve(import.meta.dirname, 'tebak-huruf.html')
      }
    }
  }
});

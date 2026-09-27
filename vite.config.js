import { defineConfig } from 'vite';
import handlebars from 'vite-plugin-handlebars';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  plugins: [
    handlebars({
      partialDirectory: resolve(import.meta.dirname, 'src/partials'),
      context(pagePath) {
        return {
          isMenara: pagePath.includes('menara-jepang.html')
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
        kosakataMataPelajaran: resolve(import.meta.dirname, 'kosakata-mata-pelajaran.html'),
        kosakataOrang: resolve(import.meta.dirname, 'kosakata-orang.html'),
        kosakataPekerjaan: resolve(import.meta.dirname, 'kosakata-pekerjaan.html'),
        kosakataSekolah: resolve(import.meta.dirname, 'kosakata-sekolah.html'),
        kosakataWaktu: resolve(import.meta.dirname, 'kosakata-waktu.html'),
        kuis: resolve(import.meta.dirname, 'kuis.html'),
        menaraJepang: resolve(import.meta.dirname, 'menara-jepang.html'),
        japaneseTower: resolve(import.meta.dirname, 'japanese-tower.html'),
        percakapan: resolve(import.meta.dirname, 'percakapan.html'),
        tebakHuruf: resolve(import.meta.dirname, 'tebak-huruf.html')
      }
    }
  }
});

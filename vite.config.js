import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        kamusGrammar: resolve(__dirname, 'kamus-grammar.html'),
        kosakataMataPelajaran: resolve(__dirname, 'kosakata-mata-pelajaran.html'),
        kosakataOrang: resolve(__dirname, 'kosakata-orang.html'),
        kosakataPekerjaan: resolve(__dirname, 'kosakata-pekerjaan.html'),
        kosakataSekolah: resolve(__dirname, 'kosakata-sekolah.html'),
        kosakataWaktu: resolve(__dirname, 'kosakata-waktu.html'),
        kuis: resolve(__dirname, 'kuis.html'),
        menaraJepang: resolve(__dirname, 'menara-jepang.html'),
        japaneseTower: resolve(__dirname, 'japanese-tower.html'),
        percakapan: resolve(__dirname, 'percakapan.html'),
        tebakHuruf: resolve(__dirname, 'tebak-huruf.html')
      }
    }
  }
});

import { defineConfig } from 'vite';
import handlebars from 'vite-plugin-handlebars';
import { copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'path';
import { vocabularyCount } from './js/quiz-data.js';

const isAndroid = process.env.BUILD_TARGET === 'android';
const LATIHAN_PAGES = ['/latihan.html', '/tebak-huruf.html', '/kuis.html', '/percakapan.html', '/flashcard.html'];

function androidFontsVirtualPlugin() {
  const virtualId = 'virtual:android-fonts';
  const resolvedId = '\0' + virtualId;
  return {
    name: 'android-fonts-virtual',
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    load(id) {
      if (id === resolvedId) {
        return isAndroid ? `import './js/android-fonts.js';` : 'export {};';
      }
    }
  };
}

function getActiveTab(pagePath) {
  const normalized = pagePath.replaceAll('\\', '/').replace(/^(?!\/)/, '/');
  if (normalized.includes('/grammar/') || normalized.endsWith('/kamus-grammar.html')) return 'grammar';
  if (normalized.includes('/kosakata/') || normalized.endsWith('/kosakata.html') || normalized.endsWith('/kanji.html')) return 'kosakata';
  if (LATIHAN_PAGES.some(page => normalized.endsWith(page))) return 'latihan';
  return 'home';
}

function optimizeAndroidBundle() {
  return {
    name: 'optimize-android-bundle',
    apply: 'build',
    async closeBundle() {
      const outDir = resolve(import.meta.dirname, 'dist-android');
      const assetsDir = resolve(outDir, 'assets');
      await mkdir(outDir, { recursive: true });
      await copyFile(
        resolve(import.meta.dirname, 'public/favicon.svg'),
        resolve(outDir, 'favicon.svg')
      );
      await cp(
        resolve(import.meta.dirname, 'public/audio'),
        resolve(outDir, 'audio'),
        { recursive: true }
      );
      const entries = await readdir(assetsDir).catch(() => []);
      await Promise.all(
        entries.map(async (name) => {
          const fullPath = resolve(assetsDir, name);
          if (name.endsWith('.woff')) {
            await rm(fullPath, { force: true });
          } else if (name.endsWith('.css')) {
            const css = await readFile(fullPath, 'utf8');
            const trimmed = css.replace(/,url\([^)]+\.woff\) format\(['"]woff['"]\)/g, '');
            if (trimmed !== css) await writeFile(fullPath, trimmed, 'utf8');
          }
        })
      );
    }
  };
}

export default defineConfig({
  base: './',
  ...(isAndroid ? { publicDir: false } : {}),
  define: {
    __ANDROID_APP__: JSON.stringify(isAndroid)
  },
  plugins: [
    androidFontsVirtualPlugin(),
    handlebars({
      partialDirectory: resolve(import.meta.dirname, 'src/partials'),
      context(pagePath) {
        const isNested = pagePath.includes('/grammar/') || pagePath.includes('\\grammar\\') ||
                         pagePath.includes('/kosakata/') || pagePath.includes('\\kosakata\\');
        const activeTab = getActiveTab(pagePath);
        return {
          vocabularyCount,
          isMenara: pagePath.includes('menara-jepang.html'),
          isPengaturan: pagePath.includes('pengaturan.html'),
          isAndroid,
          activeTab,
          isHomeTab: activeTab === 'home',
          isLatihanTab: activeTab === 'latihan',
          isKuisTab: activeTab === 'latihan',
          isGrammarTab: activeTab === 'grammar',
          isKosakataTab: activeTab === 'kosakata',
          rootPath: isNested ? '../' : './'
        };
      }
    }),
    ...(isAndroid ? [optimizeAndroidBundle()] : [])
  ],
  build: {
    outDir: isAndroid ? 'dist-android' : 'dist',
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
        kosakataKeluarga: resolve(import.meta.dirname, 'kosakata/keluarga.html'),
        kuis: resolve(import.meta.dirname, 'kuis.html'),
        flashcard: resolve(import.meta.dirname, 'flashcard.html'),
        kanji: resolve(import.meta.dirname, 'kanji.html'),
        pengaturan: resolve(import.meta.dirname, 'pengaturan.html'),
        latihan: resolve(import.meta.dirname, 'latihan.html'),
        labVisual: resolve(import.meta.dirname, 'lab-visual.html'),
        ...(isAndroid ? {} : {
          menaraJepang: resolve(import.meta.dirname, 'menara-jepang.html'),
          japaneseTower: resolve(import.meta.dirname, 'japanese-tower.html')
        }),
        percakapan: resolve(import.meta.dirname, 'percakapan.html'),
        tebakHuruf: resolve(import.meta.dirname, 'tebak-huruf.html')
      }
    }
  }
});

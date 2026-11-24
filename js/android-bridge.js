import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { buildProgressExportPayload, getHomeHref, isRootPath, resolveBackAction } from './android-navigation.js';
import { initAndroidUpdater } from './android-updater.js';
import { exportProgress } from './progress.js';

const THEME_COLORS = { dark: '#121316', light: '#FAF8F5' };
let toastTimer;
let bridgeInitialized = false;
let exportingProgress = false;

function isShareCanceled(error) {
  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return name === 'aborterror' || message.includes('cancel') || message.includes('abort');
}

export function showToast(message, durationMs = 2200) {
  if (typeof document === 'undefined' || !document.body) return;
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('p');
    toast.id = 'appToast';
    toast.className = 'app-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, durationMs);
}

export async function syncNativeTheme(isDark) {
  const color = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  if (typeof document !== 'undefined') {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta && document.head) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.append(meta);
    }
    meta?.setAttribute('content', color);
  }
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setBackgroundColor({ color });
  } catch {}
  try {
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  } catch {}
}

export async function exportProgressNative() {
  if (!Capacitor.isNativePlatform()) return false;
  if (exportingProgress) return true;
  exportingProgress = true;
  try {
    const { fileName, content } = buildProgressExportPayload(exportProgress());
    const written = await Filesystem.writeFile({
      path: fileName,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const uri = written?.uri || (await Filesystem.getUri({ path: fileName, directory: Directory.Cache })).uri;
    await Share.share({
      title: 'Progres Hongo Study',
      text: 'Cadangan progres belajar Hongo Study',
      files: [uri],
      dialogTitle: 'Simpan atau bagikan progres',
    });
  } catch (error) {
    if (!isShareCanceled(error)) {
      showToast('Gagal mengekspor progres. Coba lagi.');
    }
  } finally {
    exportingProgress = false;
  }
  return true;
}

export function initAndroidBridge({ closeMenu, isMenuOpen } = {}) {
  if (bridgeInitialized || typeof document === 'undefined') return;
  bridgeInitialized = true;

  let lastDark = document.documentElement.classList.contains('dark-mode');
  syncNativeTheme(lastDark);
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark-mode');
      if (isDark === lastDark) return;
      lastDark = isDark;
      syncNativeTheme(isDark);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  // Prefetch local HTML pages on pointerdown so tab switches feel immediate.
  const prefetched = new Set();
  const prefetchLink = (anchor) => {
    if (!anchor) return;
    const raw = anchor.getAttribute('href');
    if (!raw || raw.startsWith('#') || /^[a-z]+:/i.test(raw)) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    const key = url.pathname + url.search;
    if (prefetched.has(key)) return;
    prefetched.add(key);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = url.href;
    document.head?.append(link);
  };
  document.addEventListener('pointerdown', (event) => {
    const anchor = event.target?.closest?.('a[href]');
    if (anchor) prefetchLink(anchor);
  }, { passive: true });
  document.querySelectorAll('.bottom-nav__item[href]').forEach((el) => prefetchLink(el));

  if (!Capacitor.isNativePlatform()) return;

  let lastBackPressAt = null;
  App.addListener('backButton', ({ canGoBack }) => {
    if (typeof window !== 'undefined' && typeof window.__hongoBackHandler === 'function' && window.__hongoBackHandler()) {
      return;
    }
    const result = resolveBackAction({
      menuOpen: Boolean(isMenuOpen?.()),
      isRoot: isRootPath(location.pathname),
      canGoBack: Boolean(canGoBack),
      now: Date.now(),
      lastBackPressAt,
    });
    lastBackPressAt = result.nextLastBackPressAt;
    if (result.action === 'close-menu') closeMenu?.();
    else if (result.action === 'history-back') window.history.back();
    else if (result.action === 'go-home') location.href = getHomeHref(location.pathname);
    else if (result.action === 'confirm-exit') showToast('Tekan kembali sekali lagi untuk keluar');
    else if (result.action === 'exit-app') App.exitApp();
  }).catch(() => {});

  SplashScreen.hide().catch(() => {});
  const appVersionLabel = document.getElementById('appVersionLabel');
  if (appVersionLabel) {
    App.getInfo()
      .then((info) => {
        if (info?.version) {
          appVersionLabel.textContent = info.build
            ? `Hongo Study v${info.version} (build ${info.build})`
            : `Hongo Study v${info.version}`;
        }
      })
      .catch(() => {});
  }
  if (isRootPath(location.pathname)) {
    initAndroidUpdater();
  }
}

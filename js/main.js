import 'virtual:android-fonts';
import { storage } from './storage.js';
import { getPageSignal } from './page-lifecycle.js';
import { initMainPageContent } from './page-content.js';

(() => {
  const isAndroidBuild = typeof __ANDROID_APP__ !== 'undefined' && __ANDROID_APP__;
  const menuButton = document.querySelector('#menuButton');
  const nav = document.querySelector('#mainNav');
  const themeToggle = document.querySelector('#themeToggle');
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');

  const applyTheme = (dark) => {
    document.documentElement.classList.toggle('dark-mode', dark);
    themeToggle?.setAttribute('aria-pressed', String(dark));
    const settingsThemeToggle = document.querySelector('#settingsThemeToggle');
    if (settingsThemeToggle) {
      settingsThemeToggle.setAttribute('aria-pressed', String(dark));
      settingsThemeToggle.textContent = dark ? 'Mode gelap aktif' : 'Mode terang aktif';
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121316' : '#FAF8F5');
  };

  const savedTheme = storage.get('nihongo-theme');
  applyTheme(savedTheme ? savedTheme === 'dark' : systemTheme.matches);
  systemTheme.addEventListener('change', (event) => {
    if (!storage.get('nihongo-theme')) applyTheme(event.matches);
  });

  const toggleThemeAction = () => {
    const dark = !document.documentElement.classList.contains('dark-mode');
    applyTheme(dark);
    storage.set('nihongo-theme', dark ? 'dark' : 'light');
  };
  themeToggle?.addEventListener('click', toggleThemeAction);

  const closeMenu = () => {
    nav?.classList.add('hidden');
    menuButton?.setAttribute('aria-expanded', 'false');
  };
  menuButton?.addEventListener('click', () => {
    const closed = nav.classList.toggle('hidden');
    menuButton.setAttribute('aria-expanded', String(!closed));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('header')) closeMenu();
  });

  const storageStatus = document.querySelector('#storageStatus');
  const showStorageStatus = () => { if (storageStatus) storageStatus.hidden = storage.available; };
  window.addEventListener('study-storage-unavailable', showStorageStatus);
  showStorageStatus();

  const toggle = document.querySelector('#furiganaToggle');
  const applyFurigana = (enabled) => {
    document.body.classList.toggle('furigana-off', !enabled);
    toggle?.setAttribute('aria-checked', String(enabled));
    toggle?.setAttribute('aria-label', 'Furigana');
    const settingsFuriganaToggle = document.querySelector('#settingsFuriganaToggle');
    if (settingsFuriganaToggle) {
      settingsFuriganaToggle.setAttribute('aria-checked', String(enabled));
      settingsFuriganaToggle.textContent = enabled ? 'Furigana: ON' : 'Furigana: OFF';
    }
    document.querySelectorAll('rt').forEach((rt) => rt.setAttribute('aria-hidden', String(!enabled)));
    if (toggle) {
      const stateEl = document.querySelector('#furiganaState');
      const dotEl = document.querySelector('#furiganaDot');
      if (stateEl) stateEl.textContent = enabled ? 'ON' : 'OFF';
      if (dotEl) {
        dotEl.classList.toggle('bg-crimson', enabled);
        dotEl.classList.toggle('bg-slate-400', !enabled);
      }
    }
  };
  applyFurigana(storage.get('hongo-furigana', 'on') !== 'off');

  const toggleFuriganaAction = () => {
    const enabled = document.body.classList.contains('furigana-off');
    applyFurigana(enabled);
    storage.set('hongo-furigana', enabled ? 'on' : 'off');
    document.dispatchEvent(new CustomEvent('hongo-furigana-change', { detail: { enabled } }));
  };
  toggle?.addEventListener('click', toggleFuriganaAction);

  const pageCallbacks = {
    closeMenu,
    onThemeToggle: toggleThemeAction,
    onFuriganaToggle: toggleFuriganaAction,
  };

  initMainPageContent(getPageSignal(), pageCallbacks);

  if (isAndroidBuild) {
    document.body.classList.add('has-bottom-nav');
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.bottom-nav__item').forEach((tab) => {
        tab.addEventListener('click', () => {
          try { navigator.vibrate(8); } catch {}
        }, { passive: true });
      });
    }
    import('./android-bridge.js').then(({ initAndroidBridge }) => {
      initAndroidBridge({
        closeMenu,
        isMenuOpen: () => menuButton?.getAttribute('aria-expanded') === 'true',
      });
    });
  }

  import('./soft-nav.js')
    .then(({ initSoftNav }) => initSoftNav(pageCallbacks))
    .catch(() => {});
})();

import { resetPageLifecycle } from './page-lifecycle.js';
import { initMainPageContent } from './page-content.js';
import { stopSpeech } from './speech.js';

const EXCLUDED_PATH = /(?:^|\/)(?:anatomy\/|menara-jepang\.html$|japanese-tower\.html$)/i;
const MAX_CACHE_ENTRIES = 16;

const htmlCache = new Map();
const prefetchInFlight = new Map();
let activeNavController = null;

export function isSoftNavEligible(anchor, currentLocation = window.location) {
  if (!anchor || anchor.tagName !== 'A') return false;
  if (anchor.hasAttribute('download') || anchor.hasAttribute('data-no-soft-nav')) return false;
  const targetAttr = (anchor.getAttribute('target') || '').trim().toLowerCase();
  if (targetAttr && targetAttr !== '_self') return false;

  const rawHref = anchor.getAttribute('href');
  if (!rawHref || rawHref.startsWith('#') || /^(?:mailto|tel|javascript|data|blob):/i.test(rawHref)) {
    return false;
  }

  let targetUrl;
  try {
    targetUrl = new URL(anchor.href || rawHref, currentLocation.href);
  } catch {
    return false;
  }

  if (targetUrl.origin !== currentLocation.origin) return false;
  if (targetUrl.pathname === currentLocation.pathname && targetUrl.search === currentLocation.search && targetUrl.hash) {
    return false;
  }
  if (EXCLUDED_PATH.test(targetUrl.pathname)) return false;
  return true;
}

export function detectPageKey(pathname = '') {
  const normalized = String(pathname || '').replaceAll('\\', '/');
  if (normalized.endsWith('/kamus-grammar.html')) return 'kamus-grammar';
  if (normalized.endsWith('/kosakata.html')) return 'kosakata';
  if (normalized.endsWith('/kuis.html')) return 'kuis';
  if (normalized.endsWith('/flashcard.html')) return 'flashcard';
  if (normalized.endsWith('/kanji.html')) return 'kanji';
  if (normalized.endsWith('/percakapan.html')) return 'percakapan';
  if (normalized.endsWith('/tebak-huruf.html')) return 'tebak-huruf';
  if (normalized.endsWith('/lab-visual.html')) return 'lab-visual';
  return null;
}

async function loadFeatureModule(pageKey) {
  switch (pageKey) {
    case 'kamus-grammar': return import('./kamus-grammar.js');
    case 'kosakata': return import('./kosakata.js');
    case 'kuis': return import('./kuis.js');
    case 'flashcard': return import('./flashcard.js');
    case 'kanji': return import('./kanji.js');
    case 'percakapan': return import('./percakapan.js');
    case 'tebak-huruf': return import('./tebak-huruf.js');
    case 'lab-visual': return import('./lab-visual.js');
    default: return null;
  }
}

function storeCachedHtml(key, html) {
  if (htmlCache.has(key)) htmlCache.delete(key);
  htmlCache.set(key, html);
  if (htmlCache.size > MAX_CACHE_ENTRIES) {
    const oldest = htmlCache.keys().next().value;
    if (oldest) htmlCache.delete(oldest);
  }
}

async function fetchPageHtml(url, signal) {
  const cacheKey = url.pathname + url.search;
  if (htmlCache.has(cacheKey)) return htmlCache.get(cacheKey);

  const response = await fetch(url.href, {
    credentials: 'same-origin',
    signal,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  storeCachedHtml(cacheKey, html);
  return html;
}

export function warmPageHtml(urlString) {
  let url;
  try {
    url = new URL(urlString, window.location.href);
  } catch {
    return;
  }
  const cacheKey = url.pathname + url.search;
  if (htmlCache.has(cacheKey) || prefetchInFlight.has(cacheKey) || EXCLUDED_PATH.test(url.pathname)) return;
  const pending = fetchPageHtml(url).catch(() => null).finally(() => prefetchInFlight.delete(cacheKey));
  prefetchInFlight.set(cacheKey, pending);
}

function syncPersistentNav(currentContainer, nextContainer) {
  if (!currentContainer || !nextContainer) return;
  const currentLinks = currentContainer.querySelectorAll('a[href]');
  const nextLinks = nextContainer.querySelectorAll('a[href]');
  if (currentLinks.length !== nextLinks.length) return;
  currentLinks.forEach((link, idx) => {
    const source = nextLinks[idx];
    const href = source.getAttribute('href');
    if (href) link.setAttribute('href', href);
    const ariaCurrent = source.getAttribute('aria-current');
    if (ariaCurrent) link.setAttribute('aria-current', ariaCurrent);
    else link.removeAttribute('aria-current');
  });
}

function syncBodyClass(nextBody) {
  const preserveBottomNav = document.body.classList.contains('has-bottom-nav');
  const preserveFuriganaOff = document.body.classList.contains('furigana-off');
  document.body.className = nextBody?.className || 'font-sans';
  if (preserveBottomNav) document.body.classList.add('has-bottom-nav');
  if (preserveFuriganaOff) document.body.classList.add('furigana-off');
}

export function initSoftNav(callbacks = {}) {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return;
  if (window.__hongoSoftNavReady) return;
  window.__hongoSoftNavReady = true;

  // Cache initial page HTML if needed later on popstate
  if ('history' in window) {
    history.replaceState({ ...(history.state || {}), softNav: true }, '', window.location.href);
  }
  let activePageKey = window.location.pathname + window.location.search;

  async function navigateTo(targetUrl, { isPopstate = false } = {}) {
    activeNavController?.abort();
    const navAbort = new AbortController();
    activeNavController = navAbort;

    try {
      const html = await fetchPageHtml(targetUrl, navAbort.signal);
      if (navAbort.signal.aborted) return;

      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const nextMain = parsed.querySelector('main#main-content');
      const currentMain = document.querySelector('main#main-content');
      if (!nextMain || !currentMain) {
        window.location.href = targetUrl.href;
        return;
      }

      const pageKey = detectPageKey(targetUrl.pathname);
      let featureMod = null;
      if (pageKey) {
        window.__hongoSoftNavigating = true;
        try {
          featureMod = await loadFeatureModule(pageKey);
        } finally {
          window.__hongoSoftNavigating = false;
        }
      }
      if (navAbort.signal.aborted) return;

      const signal = resetPageLifecycle();
      stopSpeech();
      activePageKey = targetUrl.pathname + targetUrl.search;

      if (!isPopstate) {
        history.pushState({ softNav: true }, '', targetUrl.href);
      }

      const applyDomSwap = () => {
        if (parsed.title) document.title = parsed.title;
        syncBodyClass(parsed.body);
        syncPersistentNav(document.querySelector('header'), parsed.querySelector('header'));
        syncPersistentNav(document.querySelector('.bottom-nav'), parsed.querySelector('.bottom-nav'));

        const importedMain = document.importNode(nextMain, true);
        currentMain.replaceWith(importedMain);

        initMainPageContent(signal, callbacks);
        featureMod?.init?.(signal);

        if (targetUrl.hash) {
          const id = decodeURIComponent(targetUrl.hash.slice(1));
          const anchorEl = id ? document.getElementById(id) : null;
          if (anchorEl) {
            anchorEl.scrollIntoView({ behavior: 'instant' });
          } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      };

      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced && typeof document.startViewTransition === 'function') {
        const transition = document.startViewTransition(applyDomSwap);
        await transition.finished.catch(() => {});
      } else {
        applyDomSwap();
      }
    } catch (err) {
      if (err?.name === 'AbortError' || navAbort.signal.aborted) return;
      window.location.href = targetUrl.href;
    }
  }

  document.addEventListener('pointerdown', (event) => {
    const anchor = event.target?.closest?.('a[href]');
    if (anchor && isSoftNavEligible(anchor)) {
      warmPageHtml(anchor.href);
    }
  }, { passive: true });

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor || !isSoftNavEligible(anchor)) return;
    event.preventDefault();
    const targetUrl = new URL(anchor.href, window.location.href);
    navigateTo(targetUrl);
  });

  window.addEventListener('popstate', () => {
    const targetUrl = new URL(window.location.href);
    const targetKey = targetUrl.pathname + targetUrl.search;
    if (targetKey === activePageKey) return;
    if (EXCLUDED_PATH.test(targetUrl.pathname)) {
      window.location.reload();
      return;
    }
    navigateTo(targetUrl, { isPopstate: true });
  });

  // Warm the 4 bottom-nav tabs gently on idle
  const warmTabs = () => {
    document.querySelectorAll('.bottom-nav__item[href]').forEach((tab) => {
      if (isSoftNavEligible(tab)) warmPageHtml(tab.href);
    });
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(warmTabs, { timeout: 800 });
  } else {
    setTimeout(warmTabs, 300);
  }
}

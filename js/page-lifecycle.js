let currentAbort = new AbortController();

export function getPageSignal() {
  return currentAbort.signal;
}

export function resetPageLifecycle() {
  currentAbort.abort();
  currentAbort = new AbortController();
  if (typeof window !== 'undefined') {
    window.__hongoBackHandler = null;
  }
  return currentAbort.signal;
}

export function mountPage(initFn) {
  if (typeof document === 'undefined' || typeof window === 'undefined' || window.__hongoSoftNavigating) return;
  if (typeof initFn === 'function') {
    initFn(currentAbort.signal);
  }
}

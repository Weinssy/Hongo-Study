const NESTED_SECTION = /(?:^|\/)(grammar|kosakata)\//;

export function isRootPath(pathname = '') {
  const normalized = String(pathname ?? '').split(/[?#]/)[0];
  if (normalized === '' || normalized === '/' || normalized === 'index.html' || normalized === '/index.html') {
    return true;
  }
  return normalized.endsWith('/index.html') && !NESTED_SECTION.test(normalized);
}

export function getHomeHref(pathname = '') {
  const normalized = String(pathname ?? '').split(/[?#]/)[0];
  return NESTED_SECTION.test(normalized) ? '../index.html' : './index.html';
}

export function resolveBackAction({
  menuOpen = false,
  isRoot = false,
  canGoBack = false,
  now = Date.now(),
  lastBackPressAt = null,
  exitWindowMs = 2000,
} = {}) {
  if (menuOpen) return { action: 'close-menu', nextLastBackPressAt: lastBackPressAt };
  if (!isRoot && canGoBack) return { action: 'history-back', nextLastBackPressAt: lastBackPressAt };
  if (!isRoot) return { action: 'go-home', nextLastBackPressAt: lastBackPressAt };
  if (typeof lastBackPressAt === 'number' && now >= lastBackPressAt && (now - lastBackPressAt) <= exitWindowMs) {
    return { action: 'exit-app', nextLastBackPressAt: null };
  }
  return { action: 'confirm-exit', nextLastBackPressAt: now };
}

export function buildProgressExportPayload(data, date = new Date()) {
  const resolved = date instanceof Date ? date : new Date(date);
  const safeDate = Number.isNaN(resolved.getTime()) ? new Date() : resolved;
  const stamp = safeDate.toISOString().slice(0, 10);
  return {
    fileName: `hongo-study-progres-${stamp}.json`,
    content: JSON.stringify(data, null, 2),
  };
}

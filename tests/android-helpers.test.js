import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProgressExportPayload,
  getHomeHref,
  isRootPath,
  resolveBackAction,
} from '../js/android-navigation.js';
import {
  compareVersions,
  isAllowedApkUrl,
  isUpdateAvailable,
  isVersionDismissed,
  selectLatestAndroidRelease,
  shouldCheckForUpdate,
} from '../js/android-updater-core.js';
import {
  exportProgress,
  getProgress,
  getSrsMap,
  getStreak,
  getWrongAnswers,
  importProgress,
  recordAnswer,
  recordDrill,
  recordSrsReview,
  resetProgress,
  validateImportedProgress,
} from '../js/progress.js';
import {
  DAY_MS,
  MIN_EF,
  buildSrsQueue,
  formatIntervalLabel,
  getEffectiveStreak,
  reviewCard,
  updateStreak,
} from '../js/srs-core.js';
import { cleanSpeechText } from '../js/speech.js';

test('isRootPath recognizes root paths and excludes nested sections', () => {
  for (const path of ['', '/', '/index.html', 'index.html', '/Hongo-Study/index.html', '/index.html?from=quiz#top']) {
    assert.equal(isRootPath(path), true, path);
  }
  for (const path of [
    '/tebak-huruf.html',
    '/kuis.html',
    '/grammar/index.html',
    '/kosakata/index.html',
    '/Hongo-Study/grammar/index.html',
    '/Hongo-Study/kosakata/index.html',
    '/grammar/partikel-dasar.html',
    '/kosakata/waktu.html',
    '/anatomy/',
  ]) {
    assert.equal(isRootPath(path), false, path);
  }
});

test('getHomeHref resolves relative root path for top-level and nested pages', () => {
  assert.equal(getHomeHref('/kuis.html'), './index.html');
  assert.equal(getHomeHref('/tebak-huruf.html'), './index.html');
  assert.equal(getHomeHref('/grammar/partikel-dasar.html'), '../index.html');
  assert.equal(getHomeHref('/kosakata/waktu.html'), '../index.html');
  assert.equal(getHomeHref('/Hongo-Study/grammar/kata-kerja.html'), '../index.html');
});

test('resolveBackAction closes the menu before navigating or exiting', () => {
  assert.deepEqual(
    resolveBackAction({ menuOpen: true, isRoot: true, canGoBack: true, now: 5000, lastBackPressAt: 4500 }),
    { action: 'close-menu', nextLastBackPressAt: 4500 }
  );
  assert.deepEqual(
    resolveBackAction({ menuOpen: true, isRoot: false, canGoBack: false, now: 5000, lastBackPressAt: null }),
    { action: 'close-menu', nextLastBackPressAt: null }
  );
});

test('resolveBackAction navigates back or returns home on subpages', () => {
  assert.deepEqual(
    resolveBackAction({ menuOpen: false, isRoot: false, canGoBack: true, now: 1000, lastBackPressAt: null }),
    { action: 'history-back', nextLastBackPressAt: null }
  );
  assert.deepEqual(
    resolveBackAction({ menuOpen: false, isRoot: false, canGoBack: false, now: 1000, lastBackPressAt: null }),
    { action: 'go-home', nextLastBackPressAt: null }
  );
});

test('resolveBackAction confirms then exits on root within the exit window', () => {
  const first = resolveBackAction({
    menuOpen: false,
    isRoot: true,
    canGoBack: false,
    now: 10000,
    lastBackPressAt: null,
  });
  assert.deepEqual(first, { action: 'confirm-exit', nextLastBackPressAt: 10000 });

  const secondInWindow = resolveBackAction({
    menuOpen: false,
    isRoot: true,
    canGoBack: true,
    now: 11500,
    lastBackPressAt: first.nextLastBackPressAt,
    exitWindowMs: 2000,
  });
  assert.deepEqual(secondInWindow, { action: 'exit-app', nextLastBackPressAt: null });

  const exactBoundary = resolveBackAction({
    menuOpen: false,
    isRoot: true,
    canGoBack: false,
    now: 12000,
    lastBackPressAt: 10000,
    exitWindowMs: 2000,
  });
  assert.deepEqual(exactBoundary, { action: 'exit-app', nextLastBackPressAt: null });

  const expiredWindow = resolveBackAction({
    menuOpen: false,
    isRoot: true,
    canGoBack: false,
    now: 12001,
    lastBackPressAt: 10000,
    exitWindowMs: 2000,
  });
  assert.deepEqual(expiredWindow, { action: 'confirm-exit', nextLastBackPressAt: 12001 });
});

test('buildProgressExportPayload formats dated filename and pretty JSON content', () => {
  const sample = {
    exportedAt: '2026-11-23T01:00:00.000Z',
    progress: { version: 1, answered: 12, correct: 10, last: null, bestDrills: {} },
    wrongAnswers: ['今日'],
  };
  const payload = buildProgressExportPayload(sample, new Date('2026-11-23T08:30:00.000Z'));
  assert.equal(payload.fileName, 'hongo-study-progres-2026-11-23.json');
  assert.equal(payload.content, JSON.stringify(sample, null, 2));
  assert.deepEqual(JSON.parse(payload.content), sample);

  const fallbackPayload = buildProgressExportPayload(sample, new Date('invalid-date'));
  assert.match(fallbackPayload.fileName, /^hongo-study-progres-\d{4}-\d{2}-\d{2}\.json$/);
});

test('updater version comparison and APK URL allowlist validate safely', () => {
  assert.equal(compareVersions('1.0.1', '1.0.0'), 1);
  assert.equal(compareVersions('v1.1.0', '1.0.9'), 1);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('1.0.0', '1.0.1'), -1);

  assert.equal(isAllowedApkUrl('https://github.com/Weinssy/Hongo-Study/releases/download/android-v1.0.1/hongo-study-v1.0.1.apk'), true);
  assert.equal(isAllowedApkUrl('https://evil.example.com/app.apk'), false);
  assert.equal(isAllowedApkUrl('http://github.com/Weinssy/Hongo-Study/releases/download/android-v1.0.1/app.apk'), false);
  assert.equal(isAllowedApkUrl('https://github.com/Weinssy/Hongo-Study/releases/download/android-v1.0.1/app.zip'), false);
});

test('isUpdateAvailable prioritizes versionCode and respects dismissal and cooldown', () => {
  const validApk = 'https://github.com/Weinssy/Hongo-Study/releases/download/android-v1.0.1/hongo-study-v1.0.1.apk';
  assert.equal(isUpdateAvailable({
    localVersionCode: 1,
    localVersionName: '1.0.0',
    remote: { versionCode: 2, versionName: '1.0.1', apkUrl: validApk },
  }), true);
  assert.equal(isUpdateAvailable({
    localVersionCode: 2,
    localVersionName: '1.0.1',
    remote: { versionCode: 2, versionName: '1.0.1', apkUrl: validApk },
  }), false);
  assert.equal(isUpdateAvailable({
    localVersionCode: 1,
    localVersionName: '1.0.0',
    remote: { versionCode: null, versionName: '1.0.1', apkUrl: validApk },
  }), true);
  assert.equal(isUpdateAvailable({
    localVersionCode: 1,
    localVersionName: '1.0.0',
    remote: { versionCode: 2, versionName: '1.0.1', apkUrl: 'https://other.site/a.apk' },
  }), false);

  assert.equal(isVersionDismissed({ dismissedVersion: '1.0.1', remoteVersionName: '1.0.1' }), true);
  assert.equal(isVersionDismissed({ dismissedVersion: '1.0.1', remoteVersionName: '1.0.2' }), false);

  assert.equal(shouldCheckForUpdate({ now: 1000, lastCheckedAt: 0 }), true);
  assert.equal(shouldCheckForUpdate({ now: 10000, lastCheckedAt: 5000, intervalMs: 10000 }), false);
  assert.equal(shouldCheckForUpdate({ now: 15000, lastCheckedAt: 5000, intervalMs: 10000 }), true);
});

test('selectLatestAndroidRelease picks newest valid android-v release', () => {
  const picked = selectLatestAndroidRelease([
    {
      tag_name: 'web-belajarbahasa-jepang',
      draft: false,
      prerelease: false,
      assets: [],
    },
    {
      tag_name: 'android-v1.0.0',
      draft: false,
      prerelease: false,
      body: 'First release\nMore info',
      assets: [{ browser_download_url: 'https://github.com/Weinssy/Hongo-Study/releases/download/android-v1.0.0/hongo-study-v1.0.0.apk', digest: 'sha256:abc' }],
    },
    {
      tag_name: 'android-v1.0.2',
      draft: false,
      prerelease: true,
      assets: [{ browser_download_url: 'https://github.com/Weinssy/Hongo-Study/releases/download/android-v1.0.2/hongo-study-v1.0.2.apk' }],
    },
    {
      tag_name: 'android-v1.0.1',
      draft: false,
      prerelease: false,
      body: 'Update bugfix',
      assets: [{ browser_download_url: 'https://github.com/Weinssy/Hongo-Study/releases/download/android-v1.0.1/hongo-study-v1.0.1.apk', digest: 'sha256:def' }],
    },
  ]);
  assert.equal(picked.versionName, '1.0.1');
  assert.equal(picked.sha256, 'def');
  assert.equal(picked.notes, 'Update bugfix');
});

test('v1.0.2 version comparison and versionCode 3 vs 2 update detection', () => {
  const apkV102 = 'https://github.com/Weinssy/Hongo-Study/releases/download/android-v1.0.2/hongo-study-v1.0.2.apk';
  assert.equal(compareVersions('1.0.2', '1.0.1'), 1);
  assert.equal(compareVersions('1.0.1', '1.0.2'), -1);
  assert.equal(compareVersions('v1.0.2', '1.0.2'), 0);
  assert.equal(isAllowedApkUrl(apkV102), true);

  assert.equal(isUpdateAvailable({
    localVersionCode: 2,
    localVersionName: '1.0.1',
    remote: { versionCode: 3, versionName: '1.0.2', apkUrl: apkV102 },
  }), true);
  assert.equal(isUpdateAvailable({
    localVersionCode: 3,
    localVersionName: '1.0.2',
    remote: { versionCode: 3, versionName: '1.0.2', apkUrl: apkV102 },
  }), false);
  assert.equal(isUpdateAvailable({
    localVersionCode: 2,
    localVersionName: '1.0.1',
    remote: { versionCode: null, versionName: '1.0.2', apkUrl: apkV102 },
  }), true);
});

test('resetProgress clears wrong answers and resets stored progress counters', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const backing = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (key) => (backing.has(key) ? backing.get(key) : null),
      setItem: (key, value) => backing.set(key, String(value)),
      removeItem: (key) => backing.delete(key),
    },
  });

  try {
    recordAnswer('今日', false, 'waktu');
    recordDrill('hiragana', 9, 10);

    assert.equal(getProgress().answered, 1);
    assert.equal(getProgress().correct, 0);
    assert.deepEqual(getProgress().bestDrills, { hiragana: { score: 9, total: 10 } });
    assert.deepEqual(getWrongAnswers(), ['今日']);

    const reset = resetProgress();
    const expectedEmpty = { version: 1, answered: 0, correct: 0, last: null, bestDrills: {} };
    assert.deepEqual(reset, expectedEmpty);
    assert.deepEqual(getProgress(), expectedEmpty);
    assert.deepEqual(getWrongAnswers(), []);
    assert.equal(backing.has('hongo_wrong_answers'), false);
    assert.deepEqual(JSON.parse(backing.get('hongo-progress-v1')), expectedEmpty);
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test('reviewCard follows SM-2 intervals, EF floor, and lapse reset', () => {
  const t0 = 1_700_000_000_000;
  const firstGood = reviewCard(undefined, 4, t0);
  assert.equal(firstGood.reps, 1);
  assert.equal(firstGood.interval, 1);
  assert.equal(firstGood.ef, 2.5);
  assert.equal(firstGood.dueAt, t0 + DAY_MS);

  const secondGood = reviewCard(firstGood, 4, t0 + DAY_MS);
  assert.equal(secondGood.reps, 2);
  assert.equal(secondGood.interval, 6);

  const thirdEasy = reviewCard(secondGood, 5, t0 + 7 * DAY_MS);
  assert.equal(thirdEasy.reps, 3);
  assert.equal(thirdEasy.ef, 2.6);
  assert.equal(thirdEasy.interval, Math.round(6 * 2.6));

  const lapsed = reviewCard(thirdEasy, 1, t0 + 20 * DAY_MS);
  assert.equal(lapsed.reps, 0);
  assert.equal(lapsed.interval, 1);
  assert.equal(lapsed.lapses, 1);

  let lowEfCard = { reps: 0, interval: 0, ef: 1.35, lapses: 0 };
  for (let i = 0; i < 6; i++) {
    lowEfCard = reviewCard(lowEfCard, 1, t0 + i * DAY_MS);
  }
  assert.equal(lowEfCard.ef, MIN_EF);
  assert.throws(() => reviewCard(undefined, 2, t0), RangeError);
  assert.equal(formatIntervalLabel(1), '1 hari');
  assert.equal(formatIntervalLabel(60), '2 bln');
});

test('updateStreak and getEffectiveStreak handle consecutive days and gaps', () => {
  let s = updateStreak(null, '2026-11-20');
  assert.deepEqual(s, { current: 1, best: 1, lastActiveDate: '2026-11-20', todayCount: 1 });

  s = updateStreak(s, '2026-11-20');
  assert.equal(s.current, 1);
  assert.equal(s.todayCount, 2);

  s = updateStreak(s, '2026-11-21');
  assert.equal(s.current, 2);
  assert.equal(s.best, 2);
  assert.equal(s.todayCount, 1);

  assert.equal(getEffectiveStreak(s, '2026-11-21'), 2);
  assert.equal(getEffectiveStreak(s, '2026-11-22'), 2);
  assert.equal(getEffectiveStreak(s, '2026-11-23'), 0);

  s = updateStreak(s, '2026-11-24');
  assert.equal(s.current, 1);
  assert.equal(s.best, 2);
});

test('buildSrsQueue prioritizes overdue cards and limits daily new cards', () => {
  const items = [
    { id: 'a', categoryKey: 'waktu' },
    { id: 'b', categoryKey: 'waktu' },
    { id: 'c', categoryKey: 'waktu' },
    { id: 'd', categoryKey: 'sekolah' },
  ];
  const now = 10_000;
  const srsMap = {
    b: { reps: 1, interval: 1, ef: 2.5, dueAt: 5_000 },
    a: { reps: 2, interval: 6, ef: 2.5, dueAt: 2_000 },
  };
  const result = buildSrsQueue(items, srsMap, { nowMs: now, dailyNewLimit: 1, category: 'all' });
  assert.deepEqual(result.queue.map(x => x.id), ['a', 'b', 'c']);
  assert.equal(result.dueCount, 2);
  assert.equal(result.newCount, 1);
  assert.equal(result.masteredCount, 1);
});

test('importProgress validates payloads and round-trips v2 progress with SRS and streak', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const backing = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (key) => (backing.has(key) ? backing.get(key) : null),
      setItem: (key, value) => backing.set(key, String(value)),
      removeItem: (key) => backing.delete(key),
    },
  });

  try {
    assert.equal(validateImportedProgress(null).ok, false);
    assert.equal(validateImportedProgress({ progress: { version: 1, answered: 1, correct: 5, bestDrills: {} } }).ok, false);
    assert.equal(validateImportedProgress({
      progress: { version: 1, answered: 2, correct: 1, last: null, bestDrills: {} },
      srs: { bad: { reps: -1, interval: 1, ef: 2.5, dueAt: 100 } },
    }).ok, false);

    recordAnswer('明日', true, 'waktu');
    recordSrsReview('waktu-1', 4, 1_700_000_000_000);
    const snapshot = exportProgress();
    assert.equal(snapshot.version, 2);
    assert.equal(Object.keys(snapshot.srs).length, 1);
    assert.equal(snapshot.streak.current, 1);

    resetProgress();
    assert.equal(getProgress().answered, 0);
    assert.deepEqual(getSrsMap(), {});
    assert.equal(getStreak().current, 0);

    const restored = importProgress(snapshot);
    assert.equal(restored.ok, true);
    assert.equal(getProgress().answered, 1);
    assert.equal(getSrsMap()['waktu-1'].reps, 1);
    assert.equal(getStreak().current, 1);

    // Backward-compatible v1 backup without srs/streak
    const v1Result = importProgress({
      progress: { version: 1, answered: 4, correct: 3, last: null, bestDrills: {} },
      wrongAnswers: ['今日'],
    });
    assert.equal(v1Result.ok, true);
    assert.equal(getProgress().answered, 4);
    assert.deepEqual(getWrongAnswers(), ['今日']);
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test('cleanSpeechText strips parenthetical notes and normalizes separators', () => {
  assert.equal(cleanSpeechText('おはよう（朝）'), 'おはよう');
  assert.equal(cleanSpeechText('いぬ / ねこ (hewan)'), 'いぬ 、 ねこ');
  assert.equal(cleanSpeechText(''), '');
});

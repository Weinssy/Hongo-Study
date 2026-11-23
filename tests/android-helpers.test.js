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

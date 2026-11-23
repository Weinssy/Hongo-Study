export const ALLOWED_APK_PREFIX = 'https://github.com/Weinssy/Hongo-Study/releases/download/';
export const DEFAULT_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function parseSemver(version) {
  if (typeof version !== 'string') return null;
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export function isAllowedApkUrl(url) {
  return typeof url === 'string' && url.startsWith(ALLOWED_APK_PREFIX) && url.endsWith('.apk');
}

export function shouldCheckForUpdate({ now, lastCheckedAt, intervalMs = DEFAULT_CHECK_INTERVAL_MS }) {
  if (!Number.isFinite(lastCheckedAt) || lastCheckedAt <= 0) return true;
  return now - lastCheckedAt >= intervalMs;
}

export function isUpdateAvailable({ localVersionCode, localVersionName, remote }) {
  if (!remote || !isAllowedApkUrl(remote.apkUrl)) return false;
  if (Number.isInteger(remote.versionCode) && Number.isInteger(localVersionCode)) {
    return remote.versionCode > localVersionCode;
  }
  return compareVersions(remote.versionName, localVersionName) > 0;
}

export function isVersionDismissed({ dismissedVersion, remoteVersionName }) {
  return Boolean(dismissedVersion && remoteVersionName && dismissedVersion === remoteVersionName);
}

export function selectLatestAndroidRelease(releases) {
  if (!Array.isArray(releases)) return null;
  const candidates = releases
    .filter((release) => !release?.draft && !release?.prerelease && typeof release?.tag_name === 'string' && release.tag_name.startsWith('android-v'))
    .map((release) => {
      const versionName = release.tag_name.replace(/^android-v/, '');
      const apkAsset = Array.isArray(release.assets)
        ? release.assets.find((asset) => isAllowedApkUrl(asset?.browser_download_url))
        : null;
      if (!apkAsset || !parseSemver(versionName)) return null;
      return {
        versionCode: null,
        versionName,
        tag: release.tag_name,
        apkUrl: apkAsset.browser_download_url,
        sha256: typeof apkAsset.digest === 'string' && apkAsset.digest.startsWith('sha256:')
          ? apkAsset.digest.slice('sha256:'.length)
          : '',
        notes: typeof release.body === 'string' ? release.body.split('\n')[0].trim() : '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => compareVersions(b.versionName, a.versionName));

  return candidates[0] || null;
}

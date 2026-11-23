import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { storage } from './storage.js';
import {
  isAllowedApkUrl,
  isUpdateAvailable,
  isVersionDismissed,
  selectLatestAndroidRelease,
  shouldCheckForUpdate,
} from './android-updater-core.js';

const AppUpdater = registerPlugin('AppUpdater');
const VERSION_MANIFEST_URL = 'https://weinssy.github.io/Hongo-Study/android-version.json';
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/Weinssy/Hongo-Study/releases?per_page=5';
const LAST_CHECK_KEY = 'hongo-update-last-check';
const DISMISSED_KEY = 'hongo-update-dismissed';
const FETCH_TIMEOUT_MS = 5000;

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRemoteRelease() {
  const manifest = await fetchJsonWithTimeout(VERSION_MANIFEST_URL);
  if (manifest && isAllowedApkUrl(manifest.apkUrl)) {
    return {
      versionCode: Number.isInteger(manifest.versionCode) ? manifest.versionCode : null,
      versionName: String(manifest.versionName || ''),
      apkUrl: manifest.apkUrl,
      sha256: String(manifest.sha256 || ''),
      notes: String(manifest.notes || ''),
    };
  }
  const releases = await fetchJsonWithTimeout(GITHUB_RELEASES_URL);
  return selectLatestAndroidRelease(releases);
}

function renderUpdateBanner(remote) {
  if (typeof document === 'undefined' || document.getElementById('updateBanner')) return;
  const slot = document.getElementById('updateBannerSlot') || document.querySelector('main');
  if (!slot) return;

  const banner = document.createElement('section');
  banner.id = 'updateBanner';
  banner.className = 'update-banner';
  banner.setAttribute('aria-labelledby', 'updateBannerTitle');

  const header = document.createElement('div');
  const title = document.createElement('h2');
  title.id = 'updateBannerTitle';
  title.className = 'text-sm font-bold text-ink';
  title.textContent = `Pembaruan tersedia: v${remote.versionName}`;

  const desc = document.createElement('p');
  desc.id = 'updateBannerDesc';
  desc.className = 'mt-1 text-xs text-slate-600';
  desc.textContent = remote.notes || 'Versi terbaru siap dipasang langsung dari aplikasi.';
  header.append(title, desc);

  const actions = document.createElement('div');
  actions.className = 'mt-3 flex flex-wrap gap-2';

  const updateBtn = document.createElement('button');
  updateBtn.type = 'button';
  updateBtn.className = 'primary-button';
  updateBtn.textContent = 'Perbarui';

  const laterBtn = document.createElement('button');
  laterBtn.type = 'button';
  laterBtn.className = 'secondary-button';
  laterBtn.textContent = 'Nanti';

  let progressListener;
  updateBtn.addEventListener('click', async () => {
    updateBtn.disabled = true;
    laterBtn.disabled = true;
    updateBtn.textContent = 'Menyiapkan...';
    try {
      progressListener = await AppUpdater.addListener('updateProgress', ({ progress }) => {
        if (typeof progress === 'number' && progress >= 0) {
          updateBtn.textContent = `Mengunduh ${progress}%`;
        }
      });
      const res = await AppUpdater.downloadAndInstall({
        url: remote.apkUrl,
        sha256: remote.sha256 || '',
        versionName: remote.versionName || '',
      });
      if (res?.status === 'permission_required') {
        desc.textContent = 'Izinkan pemasangan dari sumber ini di Pengaturan, lalu tekan Coba Pasang Lagi.';
        updateBtn.textContent = 'Coba Pasang Lagi';
        updateBtn.disabled = false;
        laterBtn.disabled = false;
        return;
      }
      desc.textContent = 'Installer Android dibuka. Ikuti dialog sistem untuk menyelesaikan pembaruan.';
      updateBtn.textContent = 'Membuka installer...';
    } catch {
      desc.textContent = 'Gagal mengunduh pembaruan. Periksa koneksi internet lalu coba lagi.';
      updateBtn.textContent = 'Coba lagi';
      updateBtn.disabled = false;
      laterBtn.disabled = false;
    } finally {
      await progressListener?.remove?.().catch(() => {});
    }
  });

  laterBtn.addEventListener('click', () => {
    if (remote.versionName) storage.set(DISMISSED_KEY, remote.versionName);
    banner.remove();
  });

  actions.append(updateBtn, laterBtn);
  banner.append(header, actions);

  if (slot.id === 'updateBannerSlot') slot.append(banner);
  else slot.prepend(banner);
}

export async function initAndroidUpdater() {
  if (!Capacitor.isNativePlatform()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  try {
    const support = await AppUpdater.isSupported();
    if (!support?.supported) return;

    const now = Date.now();
    const lastCheckedAt = Number(storage.get(LAST_CHECK_KEY, '0'));
    if (!shouldCheckForUpdate({ now, lastCheckedAt })) return;

    const [info, remote] = await Promise.all([App.getInfo(), fetchRemoteRelease()]);
    storage.set(LAST_CHECK_KEY, String(now));
    if (!remote) return;

    const localVersionCode = Number.parseInt(String(info?.build || ''), 10);
    const localVersionName = String(info?.version || '');
    if (!isUpdateAvailable({ localVersionCode, localVersionName, remote })) return;
    if (isVersionDismissed({ dismissedVersion: storage.get(DISMISSED_KEY, ''), remoteVersionName: remote.versionName })) return;

    renderUpdateBanner(remote);
  } catch {
    // Fail silently so offline study flow is never interrupted.
  }
}

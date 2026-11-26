export const SPEAKER_ICON_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';

let nativeTtsPromise;
let manifestPromise;
let activeAudio;

async function getAudioManifest() {
  if (!manifestPromise) {
    manifestPromise = import('./audio-manifest.json')
      .then((mod) => mod.default || mod)
      .catch(() => ({}));
  }
  return manifestPromise;
}

export function preloadAudioManifest() {
  if (typeof window === 'undefined') return;
  getAudioManifest().catch(() => {});
}

export function stopSpeech() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {}
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

function resolveAudioUrl(fileName) {
  if (typeof window === 'undefined') return `./audio/${fileName}`;
  const path = window.location?.pathname || '/';
  const prefix = path.includes('/grammar/') || path.includes('/kosakata/') ? '../audio/' : './audio/';
  return new URL(prefix + fileName, window.location.href).href;
}

async function playBundledAudio(cleaned, raw, clearBusy) {
  if (typeof Audio === 'undefined') return false;
  const manifest = await getAudioManifest();
  const fileName = manifest[cleaned] || manifest[String(raw || '').trim()];
  if (!fileName) return false;

  try {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } else {
      activeAudio = new Audio();
      activeAudio.preload = 'auto';
    }
    const audio = activeAudio;
    audio.onended = clearBusy;
    audio.onerror = clearBusy;
    audio.src = resolveAudioUrl(fileName);
    await audio.play();
    setTimeout(clearBusy, 4000);
    return true;
  } catch {
    clearBusy();
    return false;
  }
}

async function getNativeTts() {
  if (typeof __ANDROID_APP__ !== 'undefined' && __ANDROID_APP__) {
    if (!nativeTtsPromise) {
      nativeTtsPromise = import('@capacitor/core')
        .then(({ Capacitor, registerPlugin }) =>
          Capacitor.isNativePlatform() ? registerPlugin('JapaneseTts') : null
        )
        .catch(() => null);
    }
    return nativeTtsPromise;
  }
  return null;
}

export function cleanSpeechText(text) {
  return String(text || '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[・／/]/g, '、')
    .trim();
}

export async function speakJapaneseDetailed(text, { rate = 0.92, button = null } = {}) {
  const cleaned = cleanSpeechText(text);
  if (!cleaned) return { spoken: false, reason: 'empty' };

  if (button) button.setAttribute('aria-busy', 'true');
  const clearBusy = () => button?.removeAttribute('aria-busy');

  if (await playBundledAudio(cleaned, text, clearBusy)) {
    return { spoken: true, engine: 'audio-offline-jepang' };
  }

  if (typeof __ANDROID_APP__ !== 'undefined' && __ANDROID_APP__) {
    const plugin = await getNativeTts();
    if (plugin) {
      try {
        const res = await plugin.speak({ text: cleaned, rate });
        setTimeout(clearBusy, 450);
        if (res?.spoken) return { spoken: true, engine: res.engine || 'android-tts' };
        if (res?.reason === 'missing_voice') {
          const { showToast } = await import('./android-bridge.js');
          showToast('Suara Jepang (ja-JP) belum terpasang di Pengaturan Text-to-Speech HP.');
        } else if (res?.reason === 'init_failed' || res?.reason === 'error' || String(res?.reason || '').startsWith('speak_failed')) {
          const { showToast } = await import('./android-bridge.js');
          showToast('Layanan Text-to-Speech Android tidak merespons. Cek Speech Services di Pengaturan.');
        }
        return {
          spoken: false,
          reason: res?.reason || 'unknown',
          engine: res?.engine || '',
          initStatus: res?.initStatus,
          langResult: res?.langResult,
        };
      } catch (err) {
        clearBusy();
        return { spoken: false, reason: 'plugin_exception', detail: err?.message || '' };
      }
    }
    clearBusy();
    return { spoken: false, reason: 'plugin_unavailable' };
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'ja-JP';
      utterance.rate = rate;
      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('ja'));
      if (jaVoice) utterance.voice = jaVoice;
      utterance.onend = clearBusy;
      utterance.onerror = clearBusy;
      window.speechSynthesis.speak(utterance);
      setTimeout(clearBusy, 2500);
      return { spoken: true, engine: 'web-speech-synthesis' };
    } catch {
      clearBusy();
      return { spoken: false, reason: 'web_tts_error' };
    }
  }

  clearBusy();
  return { spoken: false, reason: 'unsupported' };
}

export async function speakJapanese(text, options) {
  const result = await speakJapaneseDetailed(text, options);
  return Boolean(result?.spoken);
}

export const SPEAKER_ICON_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';

let nativeTtsPromise;

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

export async function speakJapanese(text, { rate = 0.92, button = null } = {}) {
  const cleaned = cleanSpeechText(text);
  if (!cleaned) return false;

  if (button) button.setAttribute('aria-busy', 'true');
  const clearBusy = () => button?.removeAttribute('aria-busy');

  if (typeof __ANDROID_APP__ !== 'undefined' && __ANDROID_APP__) {
    const plugin = await getNativeTts();
    if (plugin) {
      try {
        const res = await plugin.speak({ text: cleaned, rate });
        setTimeout(clearBusy, 450);
        if (res?.spoken) return true;
        if (res?.reason === 'missing_voice') {
          const { showToast } = await import('./android-bridge.js');
          showToast('Suara Jepang belum aktif di Pengaturan Text-to-Speech HP.');
        }
        return false;
      } catch {
        clearBusy();
        return false;
      }
    }
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
      return true;
    } catch {
      clearBusy();
      return false;
    }
  }

  clearBusy();
  return false;
}

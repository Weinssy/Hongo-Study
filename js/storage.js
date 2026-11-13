export function createStorage(getStorage = () => globalThis.localStorage) {
  const memory = new Map();
  let available = true;

  function failed() {
    available = false;
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('study-storage-unavailable'));
  }

  return {
    get available() { return available; },
    get(key, fallback = null) {
      if (memory.has(key)) return memory.get(key);
      try { return getStorage().getItem(key) ?? fallback; }
      catch { failed(); return fallback; }
    },
    set(key, value) {
      memory.set(key, value);
      try { getStorage().setItem(key, value); return true; }
      catch { failed(); return false; }
    },
    remove(key) {
      memory.delete(key);
      try { getStorage().removeItem(key); }
      catch { failed(); }
    },
    read(key, fallback, validate = () => true) {
      try {
        const value = JSON.parse(this.get(key));
        return validate(value) ? value : fallback;
      } catch { return fallback; }
    },
    write(key, value) { return this.set(key, JSON.stringify(value)); },
  };
}

export const storage = createStorage();

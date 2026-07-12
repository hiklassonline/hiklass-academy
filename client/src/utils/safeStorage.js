function buildSafeStorage(kind) {
  function get() {
    try {
      return kind === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  }

  return {
    getItem(key) {
      try {
        return get()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        get()?.setItem(key, value);
      } catch {
        // Storage unavailable (private browsing, blocked cookies, restrictive
        // in-app browser, etc.) — fail silently rather than crash the app.
      }
    },
    removeItem(key) {
      try {
        get()?.removeItem(key);
      } catch {
        // See setItem.
      }
    },
  };
}

export const safeLocalStorage = buildSafeStorage('local');
export const safeSessionStorage = buildSafeStorage('session');

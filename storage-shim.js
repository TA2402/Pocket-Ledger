// Pocket Ledger runs inside Claude.ai artifacts with a built-in `window.storage`
// API. Outside that sandbox (GitHub Pages, home-screen install) that API doesn't
// exist, so this shim reproduces the same get/set contract on top of
// localStorage — same method names, same async shape, zero app-code changes.
// If a real window.storage is ever present (e.g. this file loads inside an
// artifact by mistake), it's left untouched.
(function () {
  if (window.storage) return;

  const NS = "pocket-ledger-storage::";

  window.storage = {
    async get(key, shared) {
      const raw = localStorage.getItem(NS + key);
      if (raw === null) throw new Error("Key not found: " + key);
      return { key, value: raw, shared: !!shared };
    },
    async set(key, value, shared) {
      localStorage.setItem(NS + key, value);
      return { key, value, shared: !!shared };
    },
    async delete(key, shared) {
      const existed = localStorage.getItem(NS + key) !== null;
      localStorage.removeItem(NS + key);
      return { key, deleted: existed, shared: !!shared };
    },
    async list(prefix, shared) {
      const p = NS + (prefix || "");
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(p)) keys.push(k.slice(NS.length));
      }
      return { keys, prefix, shared: !!shared };
    },
  };
})();

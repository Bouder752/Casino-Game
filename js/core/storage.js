// Accès au stockage local, toujours protégé (navigation privée, quota, Node…)
const Storage = (() => {
  const mem = {};
  const ls = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } };
  return {
    get(key, fallback = null) {
      try {
        const s = ls();
        const raw = s ? s.getItem(key) : mem[key];
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      try { const s = ls(); if (s) s.setItem(key, raw); else mem[key] = raw; return true; } catch (e) { mem[key] = raw; return false; }
    },
    remove(key) { try { const s = ls(); if (s) s.removeItem(key); } catch (e) { /* ignore */ } delete mem[key]; },
  };
})();

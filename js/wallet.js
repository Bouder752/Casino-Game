// Portefeuille de jetons fictifs, sauvegardé localement
const Wallet = (() => {
  const KEY = 'casino.balance';
  const START = 1000;
  const listeners = [];
  let balance = load();

  function load() {
    try {
      const v = parseFloat(localStorage.getItem(KEY));
      if (Number.isFinite(v) && v >= 0) return v;
    } catch (e) { /* stockage indisponible */ }
    return START;
  }
  function save() {
    try { localStorage.setItem(KEY, String(balance)); } catch (e) { /* ignore */ }
  }
  function emit() { listeners.forEach(f => f(balance)); }

  return {
    START,
    get: () => balance,
    canAfford: a => a <= balance + 1e-9,
    take(a) {
      if (a < 0 || !this.canAfford(a)) return false;
      balance = Util.round2(balance - a); save(); emit();
      return true;
    },
    give(a) {
      if (a <= 0) return;
      balance = Util.round2(balance + a); save(); emit();
    },
    reset() { balance = START; save(); emit(); },
    onChange(f) { listeners.push(f); f(balance); },
  };
})();

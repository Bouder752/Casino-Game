// Portefeuille : solde libre (sauvegardé) ou solde de la partie roguelike
const Wallet = (() => {
  const KEY = 'casino.balance';
  const START = 1000;
  const listeners = [];
  let mode = 'free';
  let balance = loadFree();

  function loadFree() {
    try {
      const v = parseFloat(localStorage.getItem(KEY));
      if (Number.isFinite(v) && v >= 0) return v;
    } catch (e) { /* stockage indisponible */ }
    return START;
  }
  function save() {
    if (mode !== 'free') return;
    try { localStorage.setItem(KEY, String(balance)); } catch (e) { /* ignore */ }
  }
  function emit() { listeners.forEach(f => f(balance)); }

  return {
    START,
    mode: () => mode,
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
    useFree() { mode = 'free'; balance = loadFree(); emit(); },
    useRun(v) { mode = 'run'; balance = Util.round2(v); emit(); },
    onChange(f) { listeners.push(f); f(balance); },
  };
})();

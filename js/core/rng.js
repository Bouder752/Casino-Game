// Générateur aléatoire unique, seedé (mulberry32).
// L'état est un simple objet { s } stocké dans l'état de la partie : il se sérialise
// avec elle, et une même seed + les mêmes actions donnent exactement la même partie.
const RNG = (() => {
  // Hachage d'une chaîne en entier 32 bits (pour les seeds texte)
  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  // Crée un générateur qui lit et écrit l'état passé en paramètre
  function make(state) {
    const g = {
      state,
      next() {
        let t = (state.s = (state.s + 0x6D2B79F5) >>> 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      int: n => Math.floor(g.next() * n),
      range: (a, b) => a + Math.floor(g.next() * (b - a + 1)),
      chance: p => g.next() < p,
      pick: arr => arr[Math.floor(g.next() * arr.length)],
      // Tirage pondéré : items = [{ w, ... }]
      weighted(items, key = 'w') {
        const total = items.reduce((a, it) => a + it[key], 0);
        let r = g.next() * total;
        for (const it of items) { if ((r -= it[key]) < 0) return it; }
        return items[items.length - 1];
      },
      shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(g.next() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      },
    };
    return g;
  }

  // Seed lisible de 6 caractères (l'entropie initiale vient de crypto ou de l'horloge)
  function randomSeed() {
    let n;
    try { const b = new Uint32Array(1); crypto.getRandomValues(b); n = b[0]; } catch (e) { n = (Date.now() * 2654435761) >>> 0; }
    const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) { s += alpha[n % alpha.length]; n = Math.floor(n / alpha.length) ^ (i * 7919); n >>>= 0; }
    return s;
  }
  const fromSeed = seed => make({ s: hashSeed(String(seed)) });

  // Générateur « cosmétique » (animations, sons) : même algorithme, mais séparé
  // pour ne jamais modifier le déroulement de la partie.
  const fx = fromSeed(randomSeed() + ':fx');

  return { hashSeed, make, fromSeed, randomSeed, fx };
})();

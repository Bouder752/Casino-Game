// Retour des machines à grille : node tools/rtp-machines.js <confiserie|mousquetaires|chaudron> [tours] [achats] [réglages JSON]
const api = require('./load-core')();
const { CONFIG, RNG } = api;
const id = process.argv[2], N = +process.argv[3] || 200000, B = +process.argv[4] || 20000;
if (process.argv[5]) {
  const o = JSON.parse(process.argv[5]);
  const deep = (t, s) => { for (const k in s) { if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) deep(t[k], s[k]); else t[k] = s[k]; } };
  deep(CONFIG.games.machines[id], o);
}
const H = { rng: RNG.make({ s: 12345 }), query: (n, c) => c, charges: () => 0 };
const M = api.Machines;
const cap = CONFIG.games.slots.maxWin;
function round(buy) {
  const r = { bet: 1, buy, symbols: M.symbols(H, id), wild: {} };
  const spins = M.run(id, H, r);
  const t = Math.min(cap, spins.reduce((a, s) => a + s.total, 0));
  return { t, fs: spins.length > 1, base: spins[0].total, n: spins.length - 1 };
}
let tot = 0, fsN = 0, baseOnly = 0, hit = 0, fsTot = 0, max = 0, sq = 0;
for (let i = 0; i < N; i++) { const o = round(false); tot += o.t; sq += o.t * o.t; if (o.fs) { fsN++; fsTot += o.t - o.base; } baseOnly += o.base; if (o.t > 0) hit++; max = Math.max(max, o.t); }
let bt = 0, bmax = 0, under = 0, bsq = 0, spinsN = 0;
for (let i = 0; i < B; i++) { const o = round(true); bt += o.t; bsq += o.t * o.t; bmax = Math.max(bmax, o.t); if (o.t < 100) under++; spinsN += o.n; }
const sd = Math.sqrt(sq / N - (tot / N) ** 2), bsd = Math.sqrt(bsq / B - (bt / B) ** 2);
console.log(id, `base RTP ${(tot / N * 100).toFixed(2)}% ±${(196 * sd / Math.sqrt(N)).toFixed(2)} (sans bonus ${(baseOnly / N * 100).toFixed(1)}%) · touche ${(hit / N * 100).toFixed(1)}% · bonus 1/${(N / fsN).toFixed(0)} valeur moy ${(fsTot / fsN).toFixed(1)}× · max ${max.toFixed(0)}×`);
console.log(id, `achat RTP ${(bt / B).toFixed(2)}% ±${(1.96 * bsd / Math.sqrt(B)).toFixed(2)} · perdants ${(under / B * 100).toFixed(0)}% · max ${bmax.toFixed(0)}× · tours moy ${(spinsN / B).toFixed(1)}`);

// Moteur Roulette européenne avec joueurs IA. Les jokers (Rouge Fidèle,
// Zéro Ami, Pickpocket…) agissent au règlement via onResolve/onSettle.
const RouletteEngine = (() => {
  const C = CONFIG.games.roulette;
  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const color = n => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');
  const OUTSIDE = {
    red: { label: 'Rouge', test: n => color(n) === 'red', pay: C.even },
    black: { label: 'Noir', test: n => color(n) === 'black', pay: C.even },
    even: { label: 'Pair', test: n => n > 0 && n % 2 === 0, pay: C.even },
    odd: { label: 'Impair', test: n => n % 2 === 1, pay: C.even },
    low: { label: '1-18', test: n => n >= 1 && n <= 18, pay: C.even },
    high: { label: '19-36', test: n => n >= 19, pay: C.even },
    d1: { label: '1-12', test: n => n >= 1 && n <= 12, pay: C.dozen },
    d2: { label: '13-24', test: n => n >= 13 && n <= 24, pay: C.dozen },
    d3: { label: '25-36', test: n => n >= 25, pay: C.dozen },
    c1: { label: 'colonne 1', test: n => n > 0 && n % 3 === 1, pay: C.dozen },
    c2: { label: 'colonne 2', test: n => n > 0 && n % 3 === 2, pay: C.dozen },
    c3: { label: 'colonne 3', test: n => n > 0 && n % 3 === 0, pay: C.dozen },
  };
  const validKey = k => (k[0] === 'n' ? +k.slice(1) >= 0 && +k.slice(1) <= 36 : !!OUTSIDE[k]);
  const payFor = (k, n) => (k[0] === 'n' ? (+k.slice(1) === n ? C.straight : 0) : OUTSIDE[k].test(n) ? OUTSIDE[k].pay : 0);
  const label = k => (k[0] === 'n' ? `n° ${k.slice(1)}` : OUTSIDE[k].label);
  const AIS = [
    { name: 'Gégé', avatar: '🧔', style: 'outside' },
    { name: 'Mamie Lulu', avatar: '👵', style: 'numbers' },
    { name: 'Le Baron', avatar: '🎩', style: 'dozen' },
  ];
  function aiBets(H) {
    return AIS.slice(0, C.ai.count).map(a => {
      const amount = H.rng.range(C.ai.min / C.ai.step, C.ai.max / C.ai.step) * C.ai.step;
      let key;
      if (a.style === 'outside') key = H.rng.pick(['red', 'black', 'even', 'odd', 'low', 'high']);
      else if (a.style === 'numbers') key = 'n' + H.rng.pick([7, 17, 23, 32, H.rng.int(37)]);
      else key = H.rng.pick(['d1', 'd2', 'd3', 'c1', 'c2', 'c3']);
      return { key, amount };
    });
  }
  function spin(H, r) {
    r.n = H.rng.int(37);
    r.spins.push(r.n);
    r.back = Object.entries(r.bets).reduce((a, [k, v]) => a + v * payFor(k, r.n), 0);
    r.ai.forEach(b => { b.net = b.amount * payFor(b.key, r.n) - b.amount; });
    r.stage = r.back < r.total && H.charges('roulette') > 0 ? 'decide' : 'done';
    r.done = r.stage === 'done';
  }
  return Games.register({
    id: 'roulette', name: 'Roulette', ORDER, color, OUTSIDE, label, AIS,
    start(H, gs, { bets }) {
      const clean = {};
      Object.entries(bets || {}).forEach(([k, v]) => { if (validKey(k) && v > 0) clean[k] = Math.round(v * 100) / 100; });
      const total = Object.values(clean).reduce((a, b) => a + b, 0);
      if (total <= 0) return { error: 'Placez vos jetons sur le tapis.' };
      if (total > H.maxBet('roulette')) return { error: `Mise maximale : ${H.maxBet('roulette')}.` };
      if (!H.stake(total)) return { error: 'Solde insuffisant.' };
      const r = { bets: clean, total, spins: [], ai: aiBets(H) };
      spin(H, r);
      return { round: r };
    },
    actions: (H, gs, r) => (r.stage === 'decide' ? [{ id: 'reroll', label: `👻 Relancer la bille (${H.charges('roulette')})`, ghost: true }, { id: 'accept', label: 'Accepter' }] : []),
    act(H, gs, r, id) {
      if (id === 'accept') { r.done = true; r.stage = 'done'; return; }
      if (id === 'reroll' && H.useCharge('roulette')) spin(H, r);
    },
    resolve(H, gs, r) {
      const aiWin = r.ai.reduce((a, b) => a + Math.max(0, b.net), 0);
      return {
        staked: r.total, back: r.back,
        info: { n: r.n, color: color(r.n), bets: r.bets, aiWin },
        draws: [{ kind: 'number', value: String(r.n) }],
      };
    },
  });
})();

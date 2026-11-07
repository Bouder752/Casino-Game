// Moteur Machine à sous « Les Chats des Toits » : 5×3, 20 lignes.
// Wild Carton (id « palace », rouleaux 2-4) avec multiplicateur ×2/×3, Pelote (rouleaux 1, 3, 5) :
// 3 pelotes = tours gratuits pendant lesquels les wilds restent collés.
// Les variations passent par les requêtes slots.symbols et slots.wild.
const SlotsEngine = (() => {
  const C = CONFIG.games.slots;
  const symbols = H => H.query('slots.symbols', { symbols: C.symbols.slice() }).symbols;

  // Tirage d'une grille ; sticky = wilds collés (tours gratuits)
  function grid(H, syms, sticky = {}) {
    const g = [];
    for (let r = 0; r < C.reels; r++) {
      const col = [];
      const pool = syms.slice();
      if (C.wild.reels.includes(r)) pool.push(C.wild);
      if (C.scatter.reels.includes(r)) pool.push(C.scatter);
      for (let y = 0; y < C.rows; y++) {
        const key = r + ':' + y;
        if (sticky[key]) { col.push({ ...sticky[key], sticky: true }); continue; }
        const s = H.rng.weighted(pool);
        col.push(s.id === C.wild.id ? { id: s.id, m: H.rng.weighted(C.wild.mults).m } : { id: s.id });
      }
      g.push(col);
    }
    return g;
  }

  // Gains d'une grille : ligne par ligne, de gauche à droite
  function evaluate(g, syms, wild, lineBet) {
    const PAY = Object.fromEntries(syms.map(s => [s.id, s.pay]));
    const best = syms.reduce((a, s) => (s.pay[2] > PAY[a][2] ? s.id : a), syms[0].id);
    const isWild = c => c.id === C.wild.id || (wild.wild && c.id === wild.wild);
    const wins = [];
    let total = 0, sevens = 0, wildUsed = false;
    C.lines.forEach((line, li) => {
      const seq = line.map((row, reel) => g[reel][row]);
      let target = null;
      for (const c of seq) { if (c.id === C.scatter.id) break; if (!isWild(c)) { target = c.id; break; } }
      if (!target) target = seq.every(isWild) ? best : null;
      if (!target || !PAY[target]) return;
      let count = 0, mult = 1, usedJoker = false;
      for (const c of seq) {
        if (c.id === target || (isWild(c) && c.id !== C.scatter.id)) {
          count++;
          if (c.id === C.wild.id) mult *= c.m;
          if (wild.wild && c.id === wild.wild && target !== wild.wild) usedJoker = true;
        } else break;
      }
      if (count < 3) return;
      const x = PAY[target][count - 3] * mult * (usedJoker ? wild.ratio : 1);
      const win = Math.round(lineBet * x * 100) / 100;
      if (win <= 0) return;
      total += win;
      if (usedJoker) wildUsed = true;
      sevens += seq.slice(0, count).filter(c => c.id === 'sept').length;
      wins.push({ line: li, count, symbol: target, mult, win, cells: line.slice(0, count).map((row, reel) => [reel, row]) });
    });
    const scatters = g.reduce((a, col) => a + col.filter(c => c.id === C.scatter.id).length, 0);
    return { total: Math.round(total * 100) / 100, wins, sevens, wildUsed, scatters };
  }

  function spinAll(H, r) {
    const lineBet = r.bet / C.lines.length;
    const base = grid(H, r.symbols);
    const ev = evaluate(base, r.symbols, r.wild, lineBet);
    const spins = [{ grid: base, ...ev, free: false }];
    if (ev.scatters >= C.scatter.min) {
      const sticky = {};
      const stick = g => g.forEach((col, x) => col.forEach((c, y) => { if (c.id === C.wild.id) sticky[x + ':' + y] = { id: c.id, m: c.m }; }));
      stick(base);
      for (let k = 0; k < C.scatter.spins; k++) {
        const g = grid(H, r.symbols, sticky);
        stick(g);
        spins.push({ grid: g, ...evaluate(g, r.symbols, r.wild, lineBet), free: true });
      }
    }
    r.spins = spins;
    r.total = Math.round(spins.reduce((a, s) => a + s.total, 0) * 100) / 100;
    r.attempts.push(r.total);
    r.stage = r.total < r.bet && H.charges('slots') > 0 ? 'decide' : 'done';
    r.done = r.stage === 'done';
  }

  return Games.register({
    id: 'slots', name: 'Machine', symbols, evaluate, grid,
    start(H, gs, { bet }) {
      if (!(bet > 0)) return { error: 'Choisissez une mise.' };
      if (bet > H.maxBet('slots')) return { error: `Mise maximale : ${H.maxBet('slots')}.` };
      if (!H.stake(bet)) return { error: 'Solde insuffisant.' };
      const wild = H.query('slots.wild', { wild: null, ratio: 1, sources: [] });
      const r = { bet, attempts: [], symbols: symbols(H), wild: { wild: wild.wild, ratio: wild.ratio }, wildSources: wild.sources };
      spinAll(H, r);
      return { round: r };
    },
    actions: (H, gs, r) => (r.stage === 'decide' ? [{ id: 'reroll', label: `👻 Relancer (${H.charges('slots')})`, ghost: true }, { id: 'accept', label: 'Accepter' }] : []),
    act(H, gs, r, id) {
      if (id === 'accept') { r.done = true; r.stage = 'done'; return; }
      if (id === 'reroll' && H.useCharge('slots')) spinAll(H, r);
    },
    resolve(H, gs, r) {
      if (r.spins.some(s => s.wildUsed)) r.wildSources.forEach(me => me.flash('Joker !'));
      const sevens = r.spins.reduce((a, s) => a + s.sevens, 0);
      return {
        staked: r.bet, back: r.total,
        info: { free: r.spins.length - 1 },
        draws: Array.from({ length: sevens }, () => ({ kind: 'symbol', value: 'sept' })),
      };
    },
  });
})();

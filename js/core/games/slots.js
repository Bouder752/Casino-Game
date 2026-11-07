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
      const noScatter = pool.filter(s => s.id !== C.scatter.id);
      let hasScatter = false;
      for (let y = 0; y < C.rows; y++) {
        const key = r + ':' + y;
        if (sticky[key]) { col.push({ ...sticky[key], sticky: true }); continue; }
        // une seule Pelote par rouleau
        let s = H.rng.weighted(hasScatter ? noScatter : pool);
        if (s.id === C.scatter.id) hasScatter = true;
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
    // Les Pelotes paient n'importe où (× la mise totale)
    if (scatters >= C.scatter.min) {
      const x = C.scatter.pay[Math.min(scatters, C.scatter.pay.length + C.scatter.min - 1) - C.scatter.min];
      const win = Math.round(lineBet * C.lines.length * x * 100) / 100;
      total += win;
      const cells = [];
      g.forEach((col, reel) => col.forEach((c, row) => { if (c.id === C.scatter.id) cells.push([reel, row]); }));
      wins.push({ line: -1, count: scatters, symbol: C.scatter.id, mult: 1, win, cells, scatter: true });
    }
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
      // Tours gratuits ; 3 Pelotes pendant le bonus = tours en plus (plafonné)
      let left = C.scatter.spins, played = 0;
      while (left > 0 && played < C.scatter.maxSpins) {
        left--; played++;
        const g = grid(H, r.symbols, sticky);
        stick(g);
        const ev2 = evaluate(g, r.symbols, r.wild, lineBet);
        const retrigger = ev2.scatters >= C.scatter.min ? Math.min(C.scatter.retrigger, C.scatter.maxSpins - played - left) : 0;
        left += Math.max(0, retrigger);
        spins.push({ grid: g, ...ev2, free: true, retrigger: Math.max(0, retrigger) });
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
      if (bet < H.minBet()) return { error: `Mise minimale à cette table : ${H.minBet()}.` };
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

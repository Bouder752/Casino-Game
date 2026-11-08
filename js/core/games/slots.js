// Moteur Machine à sous « Les Chats des Toits » : 5×3, 20 lignes.
// Wild Carton (id « palace », rouleaux 2-4) avec multiplicateur ×2/×3, Pelote (rouleaux 1, 3, 5) :
// 3 pelotes = tours gratuits pendant lesquels les wilds restent collés.
// Les variations passent par les requêtes slots.symbols et slots.wild.
const SlotsEngine = (() => {
  const C = CONFIG.games.slots;
  const symbols = H => H.query('slots.symbols', { symbols: C.symbols.slice() }).symbols;

  // Tirage d'une grille ; sticky = wilds collés (tours gratuits)
  function grid(H, syms, sticky = {}, free = false) {
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
        col.push(s.id === C.wild.id ? { id: s.id, m: H.rng.weighted(free ? C.wild.fsMults : C.wild.mults).m } : { id: s.id });
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

  // Achat du bonus : la grille de départ contient d'office 3 Pelotes (sur 3 rouleaux au hasard)
  function forceScatters(H, g) {
    const reels = H.rng.shuffle([0, 1, 2, 3, 4]).slice(0, C.scatter.min);
    reels.forEach(x => { const y = H.rng.int(C.rows); g[x][y] = { id: C.scatter.id }; });
    return g;
  }
  function spinAll(H, r) {
    const lineBet = r.bet / C.lines.length;
    let base = grid(H, r.symbols);
    // Événement surprise : le chat noir saute sur les rouleaux et y laisse des Cartons
    if (!r.buy && H.rng.chance(C.feature.chance)) {
      const n = H.rng.range(C.feature.min, C.feature.max);
      for (let k = 0; k < n; k++) {
        const x = H.rng.pick(C.wild.reels), y = H.rng.int(C.rows);
        if (base[x][y].id !== C.scatter.id) base[x][y] = { id: C.wild.id, m: 1, feature: true }; // Cartons simples (sans ×)
      }
      r.feature = true;
    }
    if (r.buy) {
      // une seule Pelote par rouleau : on retire celles déjà tombées, puis on en pose 3
      base = base.map(col => col.map(c => (c.id === C.scatter.id ? { id: r.symbols[0].id } : c)));
      forceScatters(H, base);
    }
    const ev = evaluate(base, r.symbols, r.wild, lineBet);
    const spins = [{ grid: base, ...ev, free: false, feature: !!r.feature }];
    if (ev.scatters >= C.scatter.min) {
      const sticky = {};
      const stick = g => g.forEach((col, x) => col.forEach((c, y) => { if (c.id === C.wild.id) sticky[x + ':' + y] = { id: c.id, m: c.m }; }));
      stick(base);
      // Tours gratuits ; 3 Pelotes pendant le bonus = tours en plus (plafonné)
      let left = C.scatter.spins, played = 0;
      while (left > 0 && played < C.scatter.maxSpins) {
        left--; played++;
        const g = grid(H, r.symbols, sticky, true);
        // au plus tard au 6e tour gratuit, au moins un Carton est collé
        if (played === 6 && !Object.keys(sticky).length) { const x = H.rng.pick(C.wild.reels), y = H.rng.int(C.rows); if (g[x][y].id !== C.scatter.id) g[x][y] = { id: C.wild.id, m: 2 }; }
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
    r.stage = !r.buy && r.total < r.bet && H.charges('slots') > 0 ? 'decide' : 'done';
    r.done = r.stage === 'done';
  }

  // Un tour complet de la machine en jeu (Toits ou l'une des trois autres), gain plafonné
  function spinMachine(H, r) {
    if (r.machine && r.machine !== 'toits') {
      const spins = Machines.run(r.machine, H, r);
      r.spins = spins;
      r.total = r2(spins.reduce((a, s) => a + s.total, 0));
      r.attempts.push(r.total);
      r.stage = !r.buy && r.total < r.bet && H.charges('slots') > 0 ? 'decide' : 'done';
      r.done = r.stage === 'done';
    } else spinAll(H, r);
    const cap = r.bet * C.maxWin;
    if (r.total > cap) { r.total = cap; r.capped = true; r.attempts[r.attempts.length - 1] = cap; }
  }
  const r2 = v => Math.round(v * 100) / 100;

  return Games.register({
    id: 'slots', name: 'Machine', symbols, evaluate, grid,
    // Achat du bonus : toujours 100 × la mise du tour (donc la mise choisie fixe le prix)
    buyQuote(H, bet) {
      const b = Math.max(H.minBet('slots'), Math.min(bet, H.maxBet('slots')));
      const cost = Math.round(b * C.buy.cost);
      return { bet: b, cost, ok: H.canAfford(cost) };
    },
    start(H, gs, { bet, buy = false }) {
      if (!(bet > 0)) return { error: 'Choisissez une mise.' };
      if (bet > H.maxBet('slots')) return { error: `Mise maximale : ${H.maxBet('slots')}.` };
      if (bet < H.minBet('slots')) return { error: `Mise minimale à cette table : ${H.minBet('slots')}.` };
      let stake = bet;
      if (buy) {
        const q = this.buyQuote(H, bet);
        if (!H.canAfford(q.cost)) return { error: `Il faut ${q.cost} jetons pour acheter le bonus (100 × la mise).` };
        bet = q.bet; stake = q.cost;
      }
      if (!H.stake(stake)) return { error: 'Solde insuffisant.' };
      const machine = H.slotMachine();
      const wild = H.query('slots.wild', { wild: null, ratio: 1, sources: [] });
      const r = { bet, stake, buy, machine, attempts: [], symbols: machine === 'toits' ? symbols(H) : Machines.symbols(H, machine), wild: { wild: wild.wild, ratio: wild.ratio } };
      // les sources (jokers) ne sont pas sauvegardées : elles pointent vers le moteur
      Object.defineProperty(r, 'wildSources', { value: wild.sources, enumerable: false });
      spinMachine(H, r);
      return { round: r };
    },
    actions: (H, gs, r) => (r.stage === 'decide' ? [{ id: 'reroll', label: `🔄 Relancer (${H.charges('slots')})${H.rerollCost() ? ` · −${H.rerollCost()}` : ''}`, ghost: true }, { id: 'accept', label: 'Accepter' }] : []),
    act(H, gs, r, id) {
      if (id === 'accept') { r.done = true; r.stage = 'done'; return; }
      if (id === 'reroll' && H.useCharge('slots')) spinMachine(H, r);
    },
    resolve(H, gs, r) {
      if (r.spins.some(s => s.wildUsed)) (r.wildSources || []).forEach(me => me.flash('Joker !'));
      const sevens = r.spins.reduce((a, s) => a + s.sevens, 0);
      return {
        staked: r.stake || r.bet, back: r.total,
        info: { free: r.spins.length - 1, buy: !!r.buy },
        // un 7 de machine vaut une part de la mise du tour (pas du prix d'un bonus acheté)
        draws: Array.from({ length: sevens }, () => ({ kind: 'symbol', value: 'sept', per: r.bet })),
      };
    },
  });
})();

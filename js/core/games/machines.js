// Moteurs purs des trois machines tirées au hasard à chaque table (la machine des Toits est dans slots.js).
// Chaque machine produit une liste de tours (le tour payé, puis les tours gratuits) ; chaque tour
// contient ses étapes de cascade : la grille, les gains, les cases qui disparaissent.
// La vue ne fait que raconter ces étapes : tout le hasard vient de H.rng.
const Machines = (() => {
  const MC = CONFIG.games.machines;
  const r2 = v => Math.round(v * 100) / 100;
  const key = (x, y) => x + ':' + y;

  // Symboles d'une machine (les jokers et améliorations peuvent en ajouter : Machine dorée)
  function symbols(H, id) {
    const D = MC[id];
    return H.query('slots.symbols', { symbols: D.symbols.slice(), machine: id, diamant: D.diamant }).symbols;
  }
  // Triple Cerise : sur ces machines, les gains de cerises sont multipliés
  const cerise = (r, sym) => (r.wild && r.wild.wild && sym === r.wild.wild ? MC.cerisePay : 1);

  // Gravité : les cases restantes tombent, de nouvelles arrivent par le haut
  function collapse(g, removed, refill) {
    const gone = new Set(removed.map(([x, y]) => key(x, y)));
    return g.map((col, x) => {
      const keep = col.filter((c, y) => !gone.has(key(x, y)));
      const fresh = [];
      for (let k = keep.length; k < col.length; k++) fresh.push(refill(x));
      return [...fresh, ...keep];
    });
  }
  const countIn = (g, id) => g.reduce((a, col) => a + col.filter(c => c.id === id).length, 0);
  const cellsOf = (g, id) => { const out = []; g.forEach((col, x) => col.forEach((c, y) => { if (c.id === id) out.push([x, y]); })); return out; };
  const tierOf = (tiers, n) => { let t = -1; tiers.forEach((v, i) => { if (n >= v) t = i; }); return t; };

  // =====================================================================
  // Confiserie Céleste : paie partout, cascades, bulles multiplicatrices en bonus
  // =====================================================================
  const CF = MC.confiserie;
  function cfCell(H, r, free) {
    if (free && H.rng.chance(CF.bubble.chance)) return { id: 'bulle', m: H.rng.weighted(CF.bubble.values.map(([m, w]) => ({ m, w }))).m };
    const s = H.rng.weighted([...r.symbols, CF.scatter]);
    return { id: s.id };
  }
  function cfSpin(H, r, free, forceScatters = 0) {
    let g = Array.from({ length: CF.cols }, () => Array.from({ length: CF.rows }, () => cfCell(H, r, free)));
    if (forceScatters) {
      g = g.map(col => col.map(c => (c.id === CF.scatter.id ? { id: r.symbols[0].id } : c)));
      const spots = H.rng.shuffle(Array.from({ length: CF.cols * CF.rows }, (_, i) => i)).slice(0, forceScatters);
      spots.forEach(i => { g[i % CF.cols][Math.floor(i / CF.cols)] = { id: CF.scatter.id }; });
    }
    const PAY = Object.fromEntries(r.symbols.map(s => [s.id, s.pay]));
    const steps = [];
    let total = 0, sevens = 0, wildUsed = false;
    for (let guard = 0; guard < 40; guard++) {
      const wins = [];
      Object.keys(PAY).forEach(id => {
        const n = countIn(g, id);
        if (n < CF.min) return;
        const tier = n >= 12 ? 2 : n >= 10 ? 1 : 0;
        const k = cerise(r, id);
        if (k > 1) wildUsed = true;
        if (id === 'sept') sevens += 3;
        wins.push({ symbol: id, count: n, cells: cellsOf(g, id), win: r2(r.bet * PAY[id][tier] * CF.scale * k) });
      });
      const sum = wins.reduce((a, w) => a + w.win, 0);
      steps.push({ grid: g, wins, total: r2(sum) });
      if (!wins.length) break;
      total += sum;
      g = collapse(g, wins.flatMap(w => w.cells), () => cfCell(H, r, free));
    }
    // Bulles : additionnées, elles multiplient tout le gain de la cascade (tours gratuits)
    const last = steps[steps.length - 1].grid;
    const bubbles = cellsOf(last, 'bulle').map(([x, y]) => ({ x, y, m: last[x][y].m }));
    const mult = bubbles.reduce((a, b) => a + b.m, 0);
    const base = total;
    if (free && total > 0 && mult > 0) total *= mult;
    // Montgolfières : comptées sur la grille finale, elles paient n'importe où
    const scatters = countIn(last, CF.scatter.id);
    let scatterWin = 0;
    if (scatters >= CF.scatter.min) scatterWin = r2(r.bet * CF.scatter.pay[Math.min(scatters, CF.scatter.min + 2) - CF.scatter.min]);
    total += scatterWin;
    return { kind: 'cascade', free, steps, grid: last, base: r2(base), bubbles: free ? bubbles : [], mult: free && base > 0 ? mult : 0, scatterWin, scatters, scatterCells: cellsOf(last, CF.scatter.id), total: r2(total), sevens, wildUsed };
  }
  function cfRun(H, r) {
    const first = cfSpin(H, r, false, r.buy ? CF.scatter.min : 0);
    const spins = [first];
    if (first.scatters >= CF.scatter.min) {
      let left = CF.scatter.spins, played = 0;
      while (left > 0 && played < CF.scatter.maxSpins) {
        left--; played++;
        const s = cfSpin(H, r, true);
        s.retrigger = s.scatters >= CF.scatter.retriggerMin ? Math.max(0, Math.min(CF.scatter.retrigger, CF.scatter.maxSpins - played - left)) : 0;
        left += s.retrigger;
        spins.push(s);
      }
    }
    return spins;
  }

  // =====================================================================
  // Chats Mousquetaires : lignes, duels « En garde ! » (rouleaux wild multiplicateurs)
  // =====================================================================
  const MQ = MC.mousquetaires;
  function mqGrid(H, r, duels, free, forceScatters) {
    const g = [];
    const scatReels = forceScatters ? H.rng.shuffle(MQ.scatter.reels.slice()).slice(0, MQ.scatter.min) : null;
    for (let x = 0; x < MQ.cols; x++) {
      const col = Array.from({ length: MQ.rows }, () => ({ id: H.rng.weighted(r.symbols).id }));
      // Sceau : au plus un par rouleau (rouleaux 1, 3 et 5)
      if (MQ.scatter.reels.includes(x) && (scatReels ? scatReels.includes(x) : H.rng.chance(MQ.scatter.chance))) col[H.rng.int(MQ.rows)] = { id: MQ.scatter.id };
      // En garde ! : au plus un par rouleau (rouleaux 2 à 4), jamais sur un rouleau déjà en duel
      if (MQ.duel.reels.includes(x) && !duels[x] && H.rng.chance(free ? MQ.fsDuel : MQ.duel.chance)) {
        const y = H.rng.int(MQ.rows);
        if (col[y].id !== MQ.scatter.id) col[y] = { id: MQ.duel.id };
      }
      g.push(col);
    }
    return g;
  }
  function mqEval(g, r, wildReels) {
    const PAY = Object.fromEntries(r.symbols.map(s => [s.id, s.pay]));
    const lineBet = r.bet / MQ.lines.length;
    const jokerWild = r.wild && r.wild.wild;
    const wins = [];
    let total = 0, sevens = 0, wildUsed = false;
    MQ.lines.forEach((line, li) => {
      const seq = line.map((row, x) => (wildReels[x] ? { id: 'wild', m: wildReels[x] } : g[x][row]));
      const target = seq[0].id;
      if (!PAY[target]) return;
      let count = 0, mult = 0, usedJoker = false;
      for (const c of seq) {
        if (c.id === target) count++;
        else if (c.id === 'wild') { count++; mult += c.m; }
        else if (jokerWild && c.id === jokerWild) { count++; usedJoker = true; }
        else break;
      }
      if (count < 3) return;
      const x = PAY[target][count - 3] * MQ.scale * Math.max(1, mult) * (usedJoker ? r.wild.ratio : 1);
      const win = r2(lineBet * x);
      if (win <= 0) return;
      total += win;
      if (usedJoker) wildUsed = true;
      if (target === 'sept') sevens += count;
      wins.push({ line: li, symbol: target, count, mult: Math.max(1, mult), win, cells: line.slice(0, count).map((row, x) => [x, row]) });
    });
    return { wins, total: r2(total), sevens, wildUsed };
  }
  const mqMult = H => H.rng.weighted(MQ.duel.mults.map(([m, w]) => ({ m, w }))).m;
  function mqSpin(H, r, free, sticky, forceScatters = 0) {
    const g = mqGrid(H, r, sticky, free, forceScatters);
    // duels de ce tour : le rouleau entier devient wild avec son multiplicateur
    const duels = [];
    g.forEach((col, x) => { if (col.some(c => c.id === MQ.duel.id)) duels.push({ x, m: mqMult(H), y: col.findIndex(c => c.id === MQ.duel.id) }); });
    const wildReels = { ...sticky };
    duels.forEach(d => { wildReels[d.x] = d.m; });
    const ev = mqEval(g, r, wildReels);
    const scatters = countIn(g, MQ.scatter.id);
    return { kind: 'lines', free, grid: g, duels, sticky: { ...sticky }, wildReels, ...ev, scatters, scatterCells: cellsOf(g, MQ.scatter.id) };
  }
  function mqRun(H, r) {
    const first = mqSpin(H, r, false, {}, r.buy ? MQ.scatter.min : 0);
    const spins = [first];
    if (first.scatters >= MQ.scatter.min) {
      // Duel à l'aube : chaque rouleau en duel reste wild (avec son ×) jusqu'à la fin
      const sticky = {};
      let left = MQ.scatter.spins, played = 0;
      while (left > 0 && played < MQ.scatter.maxSpins) {
        left--; played++;
        const s = mqSpin(H, r, true, sticky);
        s.duels.forEach(d => { sticky[d.x] = d.m; });
        s.retrigger = s.scatters >= MQ.scatter.min ? Math.max(0, Math.min(MQ.scatter.retrigger, MQ.scatter.maxSpins - played - left)) : 0;
        left += s.retrigger;
        spins.push(s);
      }
    }
    return spins;
  }

  // =====================================================================
  // Chaudron Magique : grappes, cascades, cases multiplicatrices
  // =====================================================================
  const CH = MC.chaudron;
  // Pendant les tours gratuits, les petits symboles tombent plus souvent : plus de grappes, plus de cases qui grossissent
  const chPool = (r, free) => [...r.symbols.map(s => (free && CH.fsBoost.ids.includes(s.id) ? { ...s, w: s.w * CH.fsBoost.k } : s)), CH.scatter];
  const chCell = (H, r, free) => ({ id: H.rng.weighted(chPool(r, free)).id });
  function clusters(g) {
    const seen = new Set(), out = [];
    g.forEach((col, x) => col.forEach((c, y) => {
      if (seen.has(key(x, y)) || c.id === CH.scatter.id) return;
      const id = c.id, stack = [[x, y]], cells = [];
      seen.add(key(x, y));
      while (stack.length) {
        const [a, b] = stack.pop();
        cells.push([a, b]);
        [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]].forEach(([u, v]) => {
          if (u < 0 || v < 0 || u >= g.length || v >= g[0].length || seen.has(key(u, v)) || g[u][v].id !== id) return;
          seen.add(key(u, v)); stack.push([u, v]);
        });
      }
      if (cells.length >= CH.min) out.push({ symbol: id, cells });
    }));
    return out;
  }
  // spots : { 'x:y': 0 (marquée) | 2..128 (multiplicateur) }
  function chSpin(H, r, free, spots, forceScatters = 0) {
    let g = Array.from({ length: CH.cols }, () => Array.from({ length: CH.rows }, () => chCell(H, r, free)));
    if (forceScatters) {
      g = g.map(col => col.map(c => (c.id === CH.scatter.id ? { id: r.symbols[0].id } : c)));
      const spotsIdx = H.rng.shuffle(Array.from({ length: CH.cols * CH.rows }, (_, i) => i)).slice(0, forceScatters);
      spotsIdx.forEach(i => { g[i % CH.cols][Math.floor(i / CH.cols)] = { id: CH.scatter.id }; });
    }
    const PAY = Object.fromEntries(r.symbols.map(s => [s.id, s.pay]));
    const steps = [];
    let total = 0, sevens = 0, wildUsed = false;
    for (let guard = 0; guard < 60; guard++) {
      const before = { ...spots };
      const wins = [];
      clusters(g).forEach(cl => {
        if (!PAY[cl.symbol]) return;
        const tier = tierOf(CH.tiers, cl.cells.length);
        const m = cl.cells.reduce((a, [x, y]) => a + (spots[key(x, y)] >= 2 ? spots[key(x, y)] : 0), 0);
        const k = cerise(r, cl.symbol);
        if (k > 1) wildUsed = true;
        if (cl.symbol === 'sept') sevens += 3;
        wins.push({ symbol: cl.symbol, count: cl.cells.length, cells: cl.cells, mult: Math.max(1, m), win: r2(r.bet * PAY[cl.symbol][tier] * CH.scale * Math.max(1, m) * k) });
      });
      const sum = wins.reduce((a, w) => a + w.win, 0);
      // chaque case qui explose est marquée, puis double
      wins.forEach(w => w.cells.forEach(([x, y]) => {
        const k = key(x, y);
        spots[k] = spots[k] === undefined ? 0 : spots[k] === 0 ? 2 : Math.min(CH.spotMax, spots[k] * 2);
      }));
      steps.push({ grid: g, wins, total: r2(sum), spots: before });
      if (!wins.length) break;
      total += sum;
      g = collapse(g, wins.flatMap(w => w.cells), () => chCell(H, r, free));
    }
    const last = steps[steps.length - 1].grid;
    const scatters = countIn(last, CH.scatter.id);
    return { kind: 'cascade', free, steps, grid: last, spotsEnd: { ...spots }, scatters, scatterCells: cellsOf(last, CH.scatter.id), total: r2(total), sevens, wildUsed };
  }
  const chSpins = (n, table) => table[Math.min(n, CH.scatter.min + table.length - 1) - CH.scatter.min];
  function chRun(H, r) {
    const first = chSpin(H, r, false, {}, r.buy ? CH.scatter.min : 0);
    const spins = [first];
    if (first.scatters >= CH.scatter.min) {
      const spots = {}; // les cases restent marquées pendant tout le bonus
      let left = chSpins(first.scatters, CH.scatter.spins), played = 0;
      spins[0].award = left;
      while (left > 0 && played < CH.scatter.maxSpins) {
        left--; played++;
        const s = chSpin(H, r, true, spots);
        s.retrigger = s.scatters >= CH.scatter.min ? Math.max(0, Math.min(chSpins(s.scatters, CH.scatter.retrigger), CH.scatter.maxSpins - played - left)) : 0;
        left += s.retrigger;
        spins.push(s);
      }
    }
    return spins;
  }

  const RUN = { confiserie: cfRun, mousquetaires: mqRun, chaudron: chRun };
  // Nombre de tours gratuits annoncé à l'entrée du bonus
  const award = (id, first) => (id === 'chaudron' ? first.award : MC[id].scatter.spins);
  return { symbols, run: (id, H, r) => RUN[id](H, r), award, clusters, collapse };
})();

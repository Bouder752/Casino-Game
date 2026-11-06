// Moteur Machine à sous : 3 rouleaux, ligne centrale. Symboles et joker
// passent par les requêtes slots.symbols et slots.wild.
const SlotsEngine = (() => {
  const C = CONFIG.games.slots;
  const symbols = H => H.query('slots.symbols', { symbols: C.symbols.slice() }).symbols;
  function evaluate(line, syms, wild) {
    const P = Object.fromEntries(syms.map(s => [s.id, s.pay]));
    const ch = line.filter(x => x === 'cerise').length, di = line.filter(x => x === 'diamant').length;
    if (wild.wild) {
      const o = line.filter(x => x !== wild.wild);
      if (!o.length) return { x: P[wild.wild], text: `3 × ${wild.wild}` };
      if (o.every(x => x === o[0])) {
        const full = o.length === 3;
        return { x: P[o[0]] * (full ? 1 : wild.ratio), text: `3 × ${o[0]}${full ? '' : ' (joker)'}`, wildUsed: !full };
      }
    } else if (line[0] === line[1] && line[1] === line[2]) return { x: P[line[0]], text: `3 × ${line[0]}` };
    if (di === 2) return { x: C.twoDiamonds, text: '2 × diamant' };
    if (di === 1) return { x: C.oneDiamond, text: '1 × diamant' };
    if (ch === 2) return { x: C.twoCherries, text: '2 × cerise' };
    return { x: 0, text: '' };
  }
  function spin(H, r) {
    r.line = [0, 1, 2].map(() => H.rng.weighted(r.symbols).id);
    r.spins.push(r.line);
    r.eval = evaluate(r.line, r.symbols, r.wild);
    r.stage = r.eval.x < 1 && H.charges('slots') > 0 ? 'decide' : 'done';
    r.done = r.stage === 'done';
  }
  return Games.register({
    id: 'slots', name: 'Machine', symbols, evaluate,
    start(H, gs, { bet }) {
      if (!(bet > 0)) return { error: 'Choisissez une mise.' };
      if (bet > H.maxBet('slots')) return { error: `Mise maximale : ${H.maxBet('slots')}.` };
      if (!H.stake(bet)) return { error: 'Solde insuffisant.' };
      const wild = H.query('slots.wild', { wild: null, ratio: 1, sources: [] });
      const r = { bet, spins: [], symbols: symbols(H), wild: { wild: wild.wild, ratio: wild.ratio }, wildSources: wild.sources };
      spin(H, r);
      return { round: r };
    },
    actions: (H, gs, r) => (r.stage === 'decide' ? [{ id: 'reroll', label: `👻 Relancer (${H.charges('slots')})`, ghost: true }, { id: 'accept', label: 'Accepter' }] : []),
    act(H, gs, r, id) {
      if (id === 'accept') { r.done = true; r.stage = 'done'; return; }
      if (id === 'reroll' && H.useCharge('slots')) spin(H, r);
    },
    resolve(H, gs, r) {
      if (r.eval.wildUsed) r.wildSources.forEach(me => me.flash('Joker !'));
      return {
        staked: r.bet, back: Math.round(r.bet * r.eval.x * 100) / 100,
        info: { line: r.line, text: r.eval.text }, draws: r.line.map(value => ({ kind: 'symbol', value })),
      };
    },
  });
})();

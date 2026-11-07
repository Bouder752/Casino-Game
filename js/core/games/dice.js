// Moteur Dice : tirage 0.00–99.99, au-dessus ou en dessous d'un seuil.
// L'avantage maison passe par la requête dice.edge.
const DiceEngine = (() => {
  const C = CONFIG.games.dice;
  function quote(H, target, mode) {
    const edge = H.query('dice.edge', { edge: C.edge }).edge;
    const chance = mode === 'under' ? target : 100 - target;
    return { edge, chance, mult: Math.floor((edge / chance) * 10000) / 10000 };
  }
  function roll(H, r) {
    const v = H.rng.int(10000) / 100;
    r.roll = v;
    r.rolls.push(v);
    r.win = r.mode === 'under' ? v < r.target : v >= r.target;
    r.stage = !r.win && H.charges('dice') > 0 ? 'decide' : 'done';
    r.done = r.stage === 'done';
  }
  return Games.register({
    id: 'dice', name: 'Dice', quote,
    start(H, gs, { bet, target, mode }) {
      if (!(bet > 0)) return { error: 'Choisissez une mise.' };
      if (bet > H.maxBet('dice')) return { error: `Mise maximale : ${H.maxBet('dice')}.` };
      if (bet < H.minBet()) return { error: `Mise minimale à cette table : ${H.minBet()}.` };
      target = Math.max(C.minTarget, Math.min(C.maxTarget, Math.round(target)));
      if (!H.stake(bet)) return { error: 'Solde insuffisant.' };
      const r = { bet, target, mode, rolls: [], ...quote(H, target, mode) };
      roll(H, r);
      return { round: r };
    },
    actions: (H, gs, r) => (r.stage === 'decide' ? [{ id: 'reroll', label: `🎲 Relancer (${H.charges('dice')})`, ghost: true }, { id: 'accept', label: 'Accepter' }] : []),
    act(H, gs, r, id) {
      if (id === 'accept') { r.done = true; r.stage = 'done'; return; }
      if (id === 'reroll' && H.useCharge('dice')) roll(H, r);
    },
    resolve: (H, gs, r) => ({
      staked: r.bet, back: r.win ? Math.round(r.bet * r.mult * 100) / 100 : 0,
      info: { roll: r.roll }, draws: [{ kind: 'number', value: r.roll.toFixed(2) }],
    }),
  });
})();

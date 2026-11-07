// Moteur Ultimate Texas Hold'em. Variations via la requête uth.rules
// (croupier toujours qualifié, table de la Blind…).
const UTHEngine = (() => {
  const G = CONFIG.games.uth;
  const all = r => [...r.player, ...r.dealer, ...r.board];

  return Games.register({
    id: 'uth', name: 'Hold\'em',
    init: () => ({}),
    start(H, gs, { ante, trips = 0 }) {
      if (!(ante > 0)) return { error: 'Placez une mise Ante.' };
      const max = H.maxBet('uth');
      if (ante > max || trips > max) return { error: `Mise maximale : ${max} (Ante) et ${max} (Trips).` };
      if (ante * 2 < H.minBet()) return { error: `Mise minimale à cette table : ${Math.ceil(H.minBet() / 2)} d'Ante.` };
      if (!H.canAfford(ante * 2 + trips)) return { error: `Solde insuffisant (il faut ${ante * 2 + trips} : Ante + Blind${trips ? ' + Trips' : ''}).` };
      H.stake(ante * 2 + trips);
      const deck = Deck.create(H.rng, { decks: 1, exclude: H.excludedRanks() });
      const d = () => Deck.draw(deck, H.rng);
      const r = { ante, blind: ante, trips, play: 0, player: [], dealer: [], board: [], shown: 0, stage: 'preflop', folded: false, bribed: false, reveal: false, deck, done: false };
      r.player.push(d()); r.dealer.push(d()); r.player.push(d()); r.dealer.push(d());
      for (let i = 0; i < 5; i++) r.board.push(d());
      return { round: r };
    },
    actions(H, gs, r) {
      if (r.done) return [];
      const play = m => ({ id: 'bet' + m, label: `Miser ${m}x (${r.ante * m})`, primary: true, disabled: !H.canAfford(r.ante * m) });
      if (r.stage === 'preflop') return [play(4), play(3), { id: 'check', label: 'Check' }];
      if (r.stage === 'flop') return [play(2), { id: 'check', label: 'Check' }];
      return [play(1), { id: 'fold', label: 'Se coucher', danger: true }];
    },
    act(H, gs, r, id) {
      if (id === 'check') {
        if (r.stage === 'preflop') { r.stage = 'flop'; r.shown = 3; } else { r.stage = 'river'; r.shown = 5; }
        return;
      }
      if (id === 'fold') { r.folded = true; r.shown = 5; r.reveal = true; r.done = true; return; }
      const m = +id.slice(3);
      if (!H.stake(r.ante * m)) return;
      r.play = r.ante * m; r.shown = 5; r.reveal = true; r.done = true;
    },
    resolve(H, gs, r) {
      const rules = H.query('uth.rules', { alwaysQualify: false, blindPay: { ...G.blindPay }, tripsPay: { ...G.tripsPay } });
      const ph = bestHand([...r.player, ...r.board]), dh = bestHand([...r.dealer, ...r.board]);
      const qual = dh.cat >= 1 || rules.alwaysQualify;
      const cmp = compareHands(ph, dh);
      const lines = [];
      let staked = 0, back = 0;
      const add = (key, name, stake, ret, note = '') => {
        if (stake <= 0) return;
        staked += stake; back += ret;
        lines.push({ key, name, net: Math.round((ret - stake) * 100) / 100, note });
      };
      const nq = 'croupier non qualifié : rendu';
      if (r.folded) { add('ante', 'Ante', r.ante, 0, 'couché'); add('blind', 'Blind', r.blind, 0, 'couché'); }
      else if (cmp > 0) {
        add('play', 'Play', r.play, r.play * 2, '1:1');
        add('ante', 'Ante', r.ante, qual ? r.ante * 2 : r.ante, qual ? '1:1' : nq);
        const bp = rules.blindPay[ph.cat] || 0;
        add('blind', 'Blind', r.blind, r.blind * (1 + bp), bp ? `${ph.name} ${bp === 1.5 ? '3:2' : bp + ':1'}` : 'rendu (moins qu\'une quinte)');
      } else if (cmp === 0) {
        add('play', 'Play', r.play, r.play, 'égalité'); add('ante', 'Ante', r.ante, r.ante, 'égalité'); add('blind', 'Blind', r.blind, r.blind, 'égalité');
      } else {
        add('play', 'Play', r.play, 0);
        add('ante', 'Ante', r.ante, qual ? 0 : r.ante, qual ? '' : nq);
        add('blind', 'Blind', r.blind, 0);
      }
      if (r.trips > 0) {
        const tp = rules.tripsPay[ph.cat];
        add('trips', 'Trips', r.trips, tp ? r.trips * (tp + 1) : 0, tp ? `${ph.name} ${tp}:1` : 'moins qu\'un brelan');
      }
      Object.assign(r, { ph, dh, qual, cmp, lines });
      return { staked, back, info: { cmp, qual, folded: r.folded, cat: r.folded ? -1 : ph.cat }, draws: all(r).map(card => ({ kind: 'card', card })) };
    },
    capabilities: {
      bribe: {
        can: (H, gs, r) => !r.done && !r.bribed,
        use: (H, gs, r) => { r.bribed = true; return '💰 Le croupier vous montre discrètement ses cartes…'; },
      },
      bonusCard: {
        can: (H, gs, r) => !r.done && r.player.length < 3,
        use(H, gs, r, card) {
          // Si la carte choisie est cachée (tableau ou croupier), elle y est remplacée
          const fresh = () => { let c; do { c = Deck.draw(r.deck, H.rng); } while (sameCard(c, card)); return c; };
          r.board.forEach((c, i) => { if (sameCard(c, card)) r.board[i] = fresh(); });
          r.dealer.forEach((c, i) => { if (sameCard(c, card)) r.dealer[i] = fresh(); });
          r.player.push({ rank: card.rank, suit: card.suit });
          return '🎴 Une troisième carte rejoint votre main.';
        },
      },
    },
    // Cartes visibles par le joueur (pour la Carte Bonus et les probabilités)
    visible: r => [...r.player, ...r.board.slice(0, r.shown), ...(r.bribed || r.reveal ? r.dealer : [])],
  });
})();

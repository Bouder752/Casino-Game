// Moteur Blackjack : 6 jeux, croupier reste sur 17 souple, assurance, double, split.
// Les variations (paiement du BJ, Charlie, cartes du croupier en moins…) passent
// par des requêtes au moteur : bj.rules, bj.dealerSkip, deck.exclude.
const BlackjackEngine = (() => {
  const C = CONFIG.games.bj;
  const cardVal = c => (c.rank === 14 ? 11 : Math.min(c.rank, 10));
  function value(cards) {
    let total = 0, aces = 0;
    cards.forEach(c => { total += cardVal(c); if (c.rank === 14) aces++; });
    while (total > 21 && aces) { total -= 10; aces--; }
    return { total, soft: aces > 0 };
  }
  const isBJ = cards => cards.length === 2 && value(cards).total === 21;
  const inPlay = r => [...r.dealer, ...r.hands.flatMap(h => h.cards)];
  const draw = (H, gs, r) => Deck.draw(gs.shoe, H.rng, inPlay(r));
  const current = r => r.hands[r.active];
  const isCharlie = (r, h) => r.rules.charlie > 0 && h.cards.length >= r.rules.charlie && value(h.cards).total <= 21;

  function ensureShoe(H, gs) {
    const ex = H.excludedRanks().slice().sort().join();
    if (!gs.shoe || gs.sig !== ex) {
      gs.shoe = Deck.create(H.rng, { decks: C.decks, penetration: C.penetration, exclude: ex ? ex.split(',').map(Number) : [] });
      gs.sig = ex;
      return 'Nouveau sabot.';
    }
    if (Deck.needsShuffle(gs.shoe)) { Deck.shuffle(gs.shoe, H.rng); return 'Le sabot est mélangé.'; }
    return '';
  }

  function peek(H, r) {
    if (cardVal(r.dealer[0]) >= 10 && isBJ(r.dealer)) {
      r.hideHole = false;
      r.notes.push('Le croupier a un Blackjack !' + (r.insurance ? ' L\'assurance paie 2:1.' : ''));
      r.done = true;
      return;
    }
    if (r.insurance) r.notes.push('Pas de Blackjack pour le croupier : l\'assurance est perdue.');
    if (r.hands[0].isBJ) { r.hideHole = false; r.done = true; return; }
    r.stage = 'player';
  }

  function afterDraw(H, gs, r, h, forceDone) {
    const t = value(h.cards).total;
    if (t > 21) {
      if (r.lastHit === r.active && H.charges('bj') > 0) { r.stage = 'bust'; return; }
      h.done = true; h.bust = true;
    } else if (t === 21 || isCharlie(r, h) || forceDone) h.done = true;
    next(H, gs, r);
  }

  function next(H, gs, r) {
    r.stage = 'player';
    while (r.active < r.hands.length && r.hands[r.active].done) r.active++;
    if (r.active < r.hands.length) {
      const h = current(r);
      if (h.cards.length === 1) { // main issue d'un split
        h.cards.push(draw(H, gs, r));
        if (h.splitAces || value(h.cards).total === 21) { h.done = true; return next(H, gs, r); }
      }
      return;
    }
    dealerPlay(H, gs, r);
  }

  function dealerPlay(H, gs, r) {
    r.stage = 'dealer';
    r.hideHole = false;
    r.dealerStart = r.dealer.length;
    const alive = r.hands.some(h => value(h.cards).total <= 21 && !isCharlie(r, h));
    if (alive) {
      const drawn = [];
      const tmp = r.dealer.slice();
      while (value(tmp).total < ((r.rules && r.rules.standOn) || C.standOn)) { const c = draw(H, gs, r); tmp.push(c); drawn.push(c); }
      const q = H.query('bj.dealerSkip', { skip: 0, sources: [] });
      const skip = Math.min(drawn.length, q.skip);
      for (let i = 0; i < skip; i++) gs.shoe.cards.push(drawn.pop()); // remis dans le sabot
      if (skip) q.sources.forEach(me => me.flash(`−${skip} carte`));
      r.dealer.push(...drawn);
    }
    r.done = true;
  }

  return Games.register({
    id: 'bj', name: 'Blackjack',
    value, isBJ, cardVal,
    init: H => ({ shoe: null, sig: null }),
    shoeInfo: gs => (gs.shoe ? { total: gs.shoe.cards.length, high: gs.shoe.cards.filter(c => c.rank >= 10).length } : { total: 0, high: 0 }),

    start(H, gs, { bet }) {
      if (!(bet > 0)) return { error: 'Choisissez une mise.' };
      if (bet > H.maxBet('bj')) return { error: `Mise maximale : ${H.maxBet('bj')}.` };
      if (bet < H.minBet()) return { error: `Mise minimale à cette table : ${H.minBet()}.` };
      if (!H.stake(bet)) return { error: 'Solde insuffisant.' };
      const note = ensureShoe(H, gs);
      const rules = H.query('bj.rules', { bjPay: C.bjPay, charlie: 0, standOn: C.standOn });
      const r = { hands: [{ cards: [], bet }], dealer: [], active: 0, hideHole: true, bribed: false, stage: 'deal', insurance: 0, lastHit: null, notes: note ? [note] : [], rules, done: false };
      const h = r.hands[0];
      for (const t of [h.cards, r.dealer, h.cards, r.dealer]) t.push(draw(H, gs, r));
      h.isBJ = isBJ(h.cards);
      if (r.dealer[0].rank === 14 && H.canAfford(bet / 2)) r.stage = 'insurance';
      else peek(H, r);
      return { round: r };
    },

    actions(H, gs, r) {
      if (r.done) return [];
      if (r.stage === 'insurance') {
        const ins = Math.round(r.hands[0].bet / 2 * 100) / 100;
        return [{ id: 'insure', label: `Assurance (${ins})`, primary: true }, { id: 'noinsure', label: 'Pas d\'assurance' }];
      }
      const redo = { id: 'redo', label: `🔄 Refaire la carte (${H.charges('bj')})${H.rerollCost() ? ` · −${H.rerollCost()}` : ''}`, ghost: true };
      if (r.stage === 'bust') return [redo, { id: 'accept', label: 'Accepter' }];
      const h = current(r);
      const list = [
        { id: 'hit', label: 'Tirer', primary: true },
        { id: 'stand', label: 'Rester' },
        { id: 'double', label: 'Doubler', disabled: !(h.cards.length === 2 && !h.splitAces && H.canAfford(h.bet)) },
        { id: 'split', label: 'Séparer', disabled: !(h.cards.length === 2 && !h.splitAces && r.hands.length < C.maxHands && cardVal(h.cards[0]) === cardVal(h.cards[1]) && H.canAfford(h.bet)) },
      ];
      if (r.lastHit === r.active && H.charges('bj') > 0) list.push(redo);
      return list;
    },

    act(H, gs, r, id) {
      const h = current(r);
      switch (id) {
        case 'insure': {
          const ins = Math.round(r.hands[0].bet / 2 * 100) / 100;
          if (H.stake(ins)) r.insurance = ins;
          return peek(H, r);
        }
        case 'noinsure': return peek(H, r);
        case 'hit': h.cards.push(draw(H, gs, r)); r.lastHit = r.active; return afterDraw(H, gs, r, h);
        case 'stand': h.done = true; r.lastHit = null; return next(H, gs, r);
        case 'double':
          if (!H.stake(h.bet)) return;
          h.bet *= 2; h.doubled = true;
          h.cards.push(draw(H, gs, r)); r.lastHit = r.active;
          return afterDraw(H, gs, r, h, true);
        case 'split': {
          if (!H.stake(h.bet)) return;
          const aces = h.cards[0].rank === 14;
          r.hands.splice(r.active + 1, 0, { cards: [h.cards.pop()], bet: h.bet, splitAces: aces });
          h.splitAces = aces;
          h.cards.push(draw(H, gs, r)); r.lastHit = null;
          if (aces || value(h.cards).total === 21) h.done = true;
          return next(H, gs, r);
        }
        case 'redo': {
          if (!H.useCharge('bj')) return;
          gs.shoe.cards.unshift(h.cards.pop()); // la carte annulée retourne sous le sabot
          h.cards.push(draw(H, gs, r));
          r.stage = 'player';
          return afterDraw(H, gs, r, h, h.doubled);
        }
        case 'accept': h.done = true; h.bust = true; r.lastHit = null; return next(H, gs, r);
      }
    },

    resolve(H, gs, r) {
      const d = value(r.dealer).total, dBJ = isBJ(r.dealer);
      let staked = r.insurance, back = dBJ ? r.insurance * (1 + C.insurancePay) : 0;
      r.hands.forEach(h => {
        const p = value(h.cards).total;
        let b = 0;
        if (h.isBJ && r.hands.length === 1) {
          if (dBJ) { b = h.bet; h.result = 'Égalité'; h.cls = 'push'; }
          else { b = h.bet * (1 + r.rules.bjPay); h.result = `Blackjack ! ${r.rules.bjPay === 2 ? '2:1' : r.rules.bjPay === 1.2 ? '6:5' : '3:2'}`; h.cls = 'win'; }
        } else if (dBJ) { h.result = 'Perdu'; h.cls = 'lose'; }
        else if (p > 21) { h.result = 'Bust'; h.cls = 'lose'; }
        else if (isCharlie(r, h)) { b = h.bet * 2; h.result = 'Charlie — Gagné'; h.cls = 'win'; }
        else if (d > 21 || p > d) { b = h.bet * 2; h.result = d > 21 ? 'Le croupier saute — Gagné' : 'Gagné'; h.cls = 'win'; }
        else if (p === d) { b = h.bet; h.result = 'Égalité'; h.cls = 'push'; }
        else { h.result = 'Perdu'; h.cls = 'lose'; }
        h.net = Math.round((b - h.bet) * 100) / 100;
        staked += h.bet; back += b;
      });
      const natural = r.hands.length === 1 && r.hands[0].isBJ && !dBJ;
      const doubledWin = r.hands.some(h => h.doubled && h.cls === 'win');
      return { staked, back, info: { dealerBJ: dBJ, natural, doubledWin }, draws: inPlay(r).map(card => ({ kind: 'card', card })) };
    },

    capabilities: {
      bribe: {
        can: (H, gs, r) => !r.done && r.hideHole && !r.bribed && (r.stage === 'player' || r.stage === 'insurance'),
        use: (H, gs, r) => { r.bribed = true; return '💰 Le croupier vous montre discrètement sa carte…'; },
      },
      bonusCard: {
        can: (H, gs, r) => !r.done && r.stage === 'player',
        use(H, gs, r, card) {
          const h = current(r);
          h.cards.push({ rank: card.rank, suit: card.suit });
          r.lastHit = null;
          const t = value(h.cards).total;
          if (t > 21) { h.done = true; h.bust = true; } else if (t === 21 || isCharlie(r, h)) h.done = true;
          if (h.done) next(H, gs, r);
          return `🎴 Carte ajoutée à votre main.`;
        },
      },
    },
  });
})();

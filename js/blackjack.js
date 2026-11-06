// Blackjack : 6 jeux, croupier reste sur 17 souple, BJ payé 3:2, assurance,
// double sur 2 cartes, split jusqu'à 4 mains (As splittés : une seule carte).
// En mode roguelike : jokers, relances (Fantôme), Carte Bonus, Pot-de-vin.
const Blackjack = (() => {
  const $ = id => document.getElementById(id);
  const els = {
    dealer: $('bj-dealer'), dealerVal: $('bj-dealer-val'),
    hands: $('bj-hands'), actions: $('bj-actions'), msg: $('bj-msg'), shoe: $('bj-shoe'), counter: $('bj-counter'),
  };
  const bet = new BetControl($('bj-bet'), { label: 'Mise', initial: 10, max: () => Casino.maxBet('bj') });
  let shoe = new Shoe(6, 0.75);
  let shoeSig = '';
  let s = null;

  const cardVal = c => (c.rank === 14 ? 11 : Math.min(c.rank, 10));
  function value(cards) {
    let total = 0, aces = 0;
    cards.forEach(c => { total += cardVal(c); if (c.rank === 14) aces++; });
    while (total > 21 && aces) { total -= 10; aces--; }
    return { total, soft: aces > 0 };
  }
  const isBJ = cards => cards.length === 2 && value(cards).total === 21;
  const valText = cards => {
    const v = value(cards);
    return v.soft && v.total < 21 ? `${v.total - 10} / ${v.total}` : String(v.total);
  };
  const bjPay = () => (Casino.rule('bj21') ? 2 : Casino.boss('radin') ? 1.2 : 1.5);
  const charlie = h => Casino.rule('charlie') && h.cards.length >= 5 && value(h.cards).total <= 21;

  function msg(text, cls = '') { els.msg.textContent = text; els.msg.className = 'msg ' + cls; }

  function render() {
    els.shoe.textContent = `Sabot : ${shoe.cards.length} cartes`;
    const cpt = Casino.has('compteur');
    els.counter.hidden = !cpt;
    if (cpt) {
      const high = shoe.cards.filter(c => c.rank >= 10).length;
      els.counter.innerHTML = `🧮 Cartes hautes restantes : <b>${high}</b> / ${shoe.cards.length} <span>(${Math.round(high / Math.max(1, shoe.cards.length) * 100)} %)</span>`;
    }
    if (!s) {
      renderCards(els.dealer, []); els.dealerVal.textContent = '';
      els.hands.innerHTML = '';
      els.hands.appendChild(handBox());
      setSpot(els.hands.firstChild.querySelector('.spot'), bet.value);
      return;
    }
    const hidden = s.hideHole && !s.bribed;
    renderCards(els.dealer, s.dealer, i => i === 1 && hidden);
    els.dealerVal.textContent = !s.dealer.length ? '' : hidden ? valText([s.dealer[0]])
      : (!s.hideHole && isBJ(s.dealer)) ? 'Blackjack' : valText(s.dealer) + (s.hideHole ? ' 👁' : '');
    while (els.hands.children.length > s.hands.length) els.hands.lastChild.remove();
    s.hands.forEach((h, i) => {
      let box = els.hands.children[i];
      if (!box) els.hands.appendChild(box = handBox());
      box.classList.toggle('active', s.stage === 'player' && i === s.active && s.hands.length > 1);
      renderCards(box.querySelector('.cards'), h.cards);
      box.querySelector('.val').textContent = h.isBJ ? 'Blackjack' : valText(h.cards);
      box.querySelector('.hbet').textContent = [h.doubled ? 'doublée' : '', i === 0 && s.insurance ? `assurance ${Util.fmt(s.insurance)}` : ''].filter(Boolean).join(' · ');
      if (!h.settled) setSpot(box.querySelector('.spot'), h.bet);
      const r = box.querySelector('.hand-result');
      r.textContent = h.result || '';
      r.className = 'hand-result ' + (h.resultCls || '');
    });
  }

  function handBox() {
    const box = Util.el('div', 'bj-hand');
    box.innerHTML = '<div class="cards"></div><div class="hand-info"><span class="val"></span><span class="hbet"></span></div>' +
      '<div class="spot bj-spot"><div class="spot-chips"></div></div><div class="hand-result"></div>';
    return box;
  }
  bet.onChange = () => { if (!s || s.stage === 'done') { s = null; render(); } };

  // Consommables disponibles selon l'étape
  function updateCtx() {
    const live = s && (s.stage === 'player' || s.stage === 'insurance');
    Casino.setCtx('bj', live ? {
      bonusCard: s.stage === 'player' ? card => bonusCard(card) : null,
      bribe: s.hideHole && !s.bribed ? () => { s.bribed = true; render(); refreshActions(); } : null,
    } : null);
  }

  function idle() {
    bet.setEnabled(true);
    updateCtx();
    setActions(els.actions, [['Distribuer', deal, { cls: 'primary' }]]);
  }

  async function deal() {
    const err = Casino.canStart();
    if (err) return idle(), msg(err, 'warn');
    const amount = bet.value;
    if (amount <= 0) return idle(), msg('Choisissez une mise.', 'warn');
    if (!Wallet.take(amount)) return idle(), msg('Solde insuffisant.', 'warn');
    Casino.begin();
    bet.setEnabled(false);
    msg('');
    const sig = Casino.excludedRanks().join();
    if (sig !== shoeSig) { shoe = new Shoe(6, 0.75); shoeSig = sig; msg('Nouveau sabot.'); }
    else if (shoe.needsShuffle()) { shoe.shuffle(); msg('Le sabot est mélangé.'); }
    s = { hands: [{ cards: [], bet: amount }], dealer: [], active: 0, hideHole: true, stage: 'deal', insurance: 0 };
    els.hands.innerHTML = '';
    renderCards(els.dealer, []);
    els.dealerVal.textContent = '';
    const h = s.hands[0];
    for (const target of [h.cards, s.dealer, h.cards, s.dealer]) {
      target.push(shoe.draw()); render(); await Util.sleep(280);
    }
    h.isBJ = isBJ(h.cards);
    if (s.dealer[0].rank === 14 && Wallet.canAfford(amount / 2)) {
      s.stage = 'insurance';
      updateCtx();
      msg(h.isBJ ? 'As du croupier : assurance (équivaut à « paiement égal ») ?' : 'Le croupier montre un As : voulez-vous vous assurer ?');
      return refreshActions();
    }
    return peek();
  }

  function refreshActions() {
    if (!s) return;
    if (s.stage === 'insurance') {
      const ins = Util.round2(s.hands[0].bet / 2);
      setActions(els.actions, [
        [`Assurance (${Util.fmt(ins)})`, async () => { if (Wallet.take(ins)) { s.insurance = ins; Sfx.play('chip'); } return peek(); }, { cls: 'primary' }],
        ['Pas d\'assurance', peek],
      ]);
    } else if (s.stage === 'player') playerTurn();
    else if (s.stage === 'bust') bustChoice();
  }

  async function peek() {
    const h = s.hands[0];
    const up = s.dealer[0];
    if (cardVal(up) >= 10 && isBJ(s.dealer)) {
      s.hideHole = false;
      s.note = 'Le croupier a un Blackjack !' + (s.insurance ? ' L\'assurance paie 2:1.' : '');
      return finish();
    }
    if (s.insurance) msg('Pas de Blackjack pour le croupier : l\'assurance est perdue.', 'lose');
    if (h.isBJ) { s.hideHole = false; return finish(); }
    s.stage = 'player';
    playerTurn();
  }

  const current = () => s.hands[s.active];
  const canDouble = h => h.cards.length === 2 && !h.splitAces && Wallet.canAfford(h.bet);
  const canSplit = h => h.cards.length === 2 && !h.splitAces && s.hands.length < 4 &&
    cardVal(h.cards[0]) === cardVal(h.cards[1]) && Wallet.canAfford(h.bet);
  const redoBtn = () => {
    const n = Casino.charges('bj');
    return [`👻 Refaire la carte (${n})`, redo, { cls: 'ghost' }];
  };

  function playerTurn() {
    s.stage = 'player';
    render();
    updateCtx();
    const h = current();
    const list = [
      ['Tirer', hit, { cls: 'primary' }],
      ['Rester', stand],
      ['Doubler', double, { disabled: !canDouble(h) }],
      ['Séparer', split, { disabled: !canSplit(h) }],
    ];
    if (s.lastHit === h && Casino.charges('bj') > 0) list.push(redoBtn());
    setActions(els.actions, list);
  }

  // Après une carte tirée : bust, 21, Charlie
  async function afterDraw(h, forceDone) {
    const t = value(h.cards).total;
    if (t > 21) {
      if (Casino.charges('bj') > 0) { s.stage = 'bust'; s.lastHit = h; return bustChoice(); }
      h.done = true; h.result = 'Bust'; h.resultCls = 'lose';
    } else if (t === 21 || charlie(h) || forceDone) h.done = true;
    return next();
  }
  function bustChoice() {
    render(); updateCtx();
    msg('Bust ! Le Fantôme peut effacer cette carte…', 'warn');
    setActions(els.actions, [redoBtn(), ['Accepter', async () => {
      const h = s.lastHit; h.done = true; h.result = 'Bust'; h.resultCls = 'lose'; s.stage = 'player'; msg(''); return next();
    }]]);
  }
  async function redo() {
    const h = s.lastHit;
    if (!h || !Casino.useCharge('bj')) return refreshActions();
    h.cards.pop(); render(); await Util.sleep(250);
    h.cards.push(shoe.draw()); render(); await Util.sleep(300);
    s.stage = 'player'; msg('');
    return afterDraw(h, h.doubled);
  }

  async function next() {
    while (s.active < s.hands.length && s.hands[s.active].done) s.active++;
    if (s.active < s.hands.length) {
      const h = current();
      if (h.cards.length === 1) { // main issue d'un split : compléter
        h.cards.push(shoe.draw()); render(); await Util.sleep(280);
        if (h.splitAces || value(h.cards).total === 21) { h.done = true; return next(); }
      }
      return playerTurn();
    }
    return dealerTurn();
  }

  async function hit() {
    const h = current();
    h.cards.push(shoe.draw()); s.lastHit = h; render(); await Util.sleep(220);
    return afterDraw(h);
  }
  async function bonusCard(card) {
    const h = current();
    h.cards.push({ rank: card.rank, suit: card.suit }); s.lastHit = null;
    Sfx.play('joker'); render(); await Util.sleep(250);
    const t = value(h.cards).total;
    if (t > 21) { h.done = true; h.result = 'Bust'; h.resultCls = 'lose'; }
    else if (t === 21 || charlie(h)) h.done = true;
    if (h.done) { setActions(els.actions, []); return next(); }
    return playerTurn();
  }
  async function stand() { current().done = true; return next(); }
  async function double() {
    const h = current();
    if (!Wallet.take(h.bet)) return playerTurn();
    h.bet *= 2; h.doubled = true;
    h.cards.push(shoe.draw()); s.lastHit = h; render(); await Util.sleep(300);
    return afterDraw(h, true);
  }
  async function split() {
    const h = current();
    if (!Wallet.take(h.bet)) return playerTurn();
    const aces = h.cards[0].rank === 14;
    const nh = { cards: [h.cards.pop()], bet: h.bet, splitAces: aces };
    h.splitAces = aces;
    s.hands.splice(s.active + 1, 0, nh);
    h.cards.push(shoe.draw()); s.lastHit = null; render(); await Util.sleep(280);
    if (aces || value(h.cards).total === 21) h.done = true;
    return next();
  }

  async function dealerTurn() {
    s.stage = 'dealer';
    updateCtx();
    setActions(els.actions, []);
    s.hideHole = false; render(); await Util.sleep(450);
    const alive = s.hands.some(h => value(h.cards).total <= 21 && !charlie(h));
    if (alive) {
      // Tirage complet, puis le Croupier Corrompu retire ses dernières cartes
      const drawn = [];
      const tmp = s.dealer.slice();
      while (value(tmp).total < 17) { const c = shoe.draw(); tmp.push(c); drawn.push(c); }
      const skip = Math.min(drawn.length, Casino.has('corrompu'));
      for (let i = 0; i < skip; i++) shoe.cards.push(drawn.pop());
      if (skip) Casino.flash('corrompu', `−${skip} carte`);
      for (const c of drawn) { s.dealer.push(c); render(); await Util.sleep(500); }
    }
    return finish();
  }

  function finish() {
    s.stage = 'done';
    updateCtx();
    const d = value(s.dealer).total;
    const dBJ = isBJ(s.dealer);
    let totalBet = s.insurance, totalBack = dBJ ? s.insurance * 3 : 0;
    s.hands.forEach(h => {
      const p = value(h.cards).total;
      let back = 0;
      if (h.isBJ && s.hands.length === 1) {
        if (dBJ) { back = h.bet; h.result = 'Égalité'; h.resultCls = 'push'; }
        else { const r = bjPay(); back = h.bet * (1 + r); h.result = `Blackjack ! ${r === 2 ? '2:1' : r === 1.2 ? '6:5' : '3:2'}`; h.resultCls = 'win'; }
      } else if (dBJ) { h.result = 'Perdu'; h.resultCls = 'lose'; }
      else if (p > 21) { h.result = 'Bust'; h.resultCls = 'lose'; }
      else if (charlie(h)) { back = h.bet * 2; h.result = 'Charlie 5 cartes — Gagné'; h.resultCls = 'win'; }
      else if (d > 21 || p > d) { back = h.bet * 2; h.result = d > 21 ? 'Croupier bust — Gagné' : 'Gagné'; h.resultCls = 'win'; }
      else if (p === d) { back = h.bet; h.result = 'Égalité'; h.resultCls = 'push'; }
      else { h.result = 'Perdu'; h.resultCls = 'lose'; }
      totalBet += h.bet; totalBack += back;
      h.net = Util.round2(back - h.bet);
    });
    const sevens = [...s.dealer, ...s.hands.flatMap(h => h.cards)].filter(c => c.rank === 7).length;
    const res = Casino.settle('bj', { staked: Util.round2(totalBet), back: Util.round2(totalBack), sevens });
    const net = res.net;
    render();
    s.hands.forEach((h, i) => {
      h.settled = true;
      settleSpot(els.hands.children[i].querySelector('.spot'), h.net > 0 ? 'win' : h.net < 0 ? 'lose' : 'push', h.net);
    });
    const text = net > 0 ? `Vous gagnez ${Util.fmt(net)} jetons !` : net < 0 ? `Vous perdez ${Util.fmt(-net)} jetons.` : 'Égalité, mise rendue.';
    msg((s.note ? s.note + ' ' : '') + text, net > 0 ? 'win' : net < 0 ? 'lose' : 'push');
    Sfx.play(net > 0 ? (net >= totalBet * 1.4 ? 'bigwin' : 'win') : net < 0 ? 'lose' : 'push');
    idle();
  }

  render();
  idle();
  return { value, isBJ, refresh: () => render(), _shoe: () => shoe };
})();

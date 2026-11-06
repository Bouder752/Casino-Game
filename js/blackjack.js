// Blackjack : 6 jeux, croupier reste sur 17 souple, BJ payé 3:2,
// double sur 2 cartes, split jusqu'à 4 mains (As splittés : une seule carte).
const Blackjack = (() => {
  const $ = id => document.getElementById(id);
  const els = {
    dealer: $('bj-dealer'), dealerVal: $('bj-dealer-val'),
    hands: $('bj-hands'), actions: $('bj-actions'), msg: $('bj-msg'), shoe: $('bj-shoe'),
  };
  const bet = new BetControl($('bj-bet'), { label: 'Mise', initial: 10 });
  const shoe = new Shoe(6, 0.75);
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

  function msg(text, cls = '') { els.msg.textContent = text; els.msg.className = 'msg ' + cls; }

  function render() {
    els.shoe.textContent = `Sabot : ${shoe.cards.length} cartes`;
    if (!s) { renderCards(els.dealer, []); els.dealerVal.textContent = ''; els.hands.innerHTML = ''; return; }
    renderCards(els.dealer, s.dealer, i => i === 1 && s.hideHole);
    els.dealerVal.textContent = !s.dealer.length ? '' : s.hideHole ? valText([s.dealer[0]]) : isBJ(s.dealer) ? 'Blackjack' : valText(s.dealer);
    // Mains du joueur
    while (els.hands.children.length > s.hands.length) els.hands.lastChild.remove();
    s.hands.forEach((h, i) => {
      let box = els.hands.children[i];
      if (!box) {
        box = Util.el('div', 'bj-hand');
        box.innerHTML = '<div class="cards"></div><div class="hand-info"><span class="val"></span><span class="hbet"></span></div><div class="hand-result"></div>';
        els.hands.appendChild(box);
      }
      box.classList.toggle('active', s.stage === 'player' && i === s.active && s.hands.length > 1);
      renderCards(box.querySelector('.cards'), h.cards);
      box.querySelector('.val').textContent = h.isBJ ? 'Blackjack' : valText(h.cards);
      box.querySelector('.hbet').textContent = `Mise ${Util.fmt(h.bet)}${h.doubled ? ' (doublée)' : ''}`;
      const r = box.querySelector('.hand-result');
      r.textContent = h.result || '';
      r.className = 'hand-result ' + (h.resultCls || '');
    });
  }

  function idle() {
    bet.setEnabled(true);
    setActions(els.actions, [['Distribuer', deal, { cls: 'primary' }]]);
  }

  async function deal() {
    const amount = bet.value;
    if (amount <= 0) return idle(), msg('Choisissez une mise.', 'warn');
    if (!Wallet.take(amount)) return idle(), msg('Solde insuffisant.', 'warn');
    bet.setEnabled(false);
    msg('');
    if (shoe.needsShuffle()) { shoe.shuffle(); msg('Le sabot est mélangé.'); }
    s = { hands: [{ cards: [], bet: amount }], dealer: [], active: 0, hideHole: true, stage: 'deal' };
    els.hands.innerHTML = '';
    renderCards(els.dealer, []);
    const h = s.hands[0];
    for (const target of [h.cards, s.dealer, h.cards, s.dealer]) {
      target.push(shoe.draw()); render(); await Util.sleep(280);
    }
    const up = s.dealer[0];
    const dealerBJ = isBJ(s.dealer);
    h.isBJ = isBJ(h.cards);
    if ((cardVal(up) >= 10) && dealerBJ) {
      s.hideHole = false;
      s.note = 'Le croupier a un Blackjack !';
      return finish();
    }
    if (h.isBJ) { s.hideHole = false; return finish(); }
    s.stage = 'player';
    playerTurn();
  }

  const current = () => s.hands[s.active];
  const canDouble = h => h.cards.length === 2 && !h.splitAces && Wallet.canAfford(h.bet);
  const canSplit = h => h.cards.length === 2 && !h.splitAces && s.hands.length < 4 &&
    cardVal(h.cards[0]) === cardVal(h.cards[1]) && Wallet.canAfford(h.bet);

  function playerTurn() {
    render();
    const h = current();
    setActions(els.actions, [
      ['Tirer', hit, { cls: 'primary' }],
      ['Rester', stand],
      ['Doubler', double, { disabled: !canDouble(h) }],
      ['Séparer', split, { disabled: !canSplit(h) }],
    ]);
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
    h.cards.push(shoe.draw()); render(); await Util.sleep(200);
    const t = value(h.cards).total;
    if (t > 21) { h.done = true; h.result = 'Bust'; h.resultCls = 'lose'; }
    else if (t === 21) h.done = true;
    return next();
  }
  async function stand() { current().done = true; return next(); }
  async function double() {
    const h = current();
    if (!Wallet.take(h.bet)) return playerTurn();
    h.bet *= 2; h.doubled = true;
    h.cards.push(shoe.draw()); render(); await Util.sleep(300);
    if (value(h.cards).total > 21) { h.result = 'Bust'; h.resultCls = 'lose'; }
    h.done = true;
    return next();
  }
  async function split() {
    const h = current();
    if (!Wallet.take(h.bet)) return playerTurn();
    const aces = h.cards[0].rank === 14;
    const nh = { cards: [h.cards.pop()], bet: h.bet, splitAces: aces };
    h.splitAces = aces;
    s.hands.splice(s.active + 1, 0, nh);
    h.cards.push(shoe.draw()); render(); await Util.sleep(280);
    if (aces || value(h.cards).total === 21) h.done = true;
    return next();
  }

  async function dealerTurn() {
    s.stage = 'dealer';
    setActions(els.actions, []);
    s.hideHole = false; render(); await Util.sleep(450);
    const alive = s.hands.some(h => value(h.cards).total <= 21);
    if (alive) {
      while (value(s.dealer).total < 17) { // reste sur 17 souple
        s.dealer.push(shoe.draw()); render(); await Util.sleep(500);
      }
    }
    return finish();
  }

  function finish() {
    s.stage = 'done';
    const d = value(s.dealer).total;
    const dBJ = isBJ(s.dealer);
    let totalBet = 0, totalBack = 0;
    s.hands.forEach(h => {
      const p = value(h.cards).total;
      let back = 0;
      if (h.isBJ && s.hands.length === 1) {
        if (dBJ) { back = h.bet; h.result = 'Égalité'; h.resultCls = 'push'; }
        else { back = h.bet * 2.5; h.result = 'Blackjack ! 3:2'; h.resultCls = 'win'; }
      } else if (dBJ) { h.result = 'Perdu'; h.resultCls = 'lose'; }
      else if (p > 21) { h.result = 'Bust'; h.resultCls = 'lose'; }
      else if (d > 21 || p > d) { back = h.bet * 2; h.result = d > 21 ? 'Croupier bust — Gagné' : 'Gagné'; h.resultCls = 'win'; }
      else if (p === d) { back = h.bet; h.result = 'Égalité'; h.resultCls = 'push'; }
      else { h.result = 'Perdu'; h.resultCls = 'lose'; }
      totalBet += h.bet; totalBack += back;
    });
    Wallet.give(Util.round2(totalBack));
    const net = Util.round2(totalBack - totalBet);
    render();
    const text = net > 0 ? `Vous gagnez ${Util.fmt(net)} jetons !` : net < 0 ? `Vous perdez ${Util.fmt(-net)} jetons.` : 'Égalité, mise rendue.';
    msg((s.note ? s.note + ' ' : '') + text, net > 0 ? 'win' : net < 0 ? 'lose' : 'push');
    idle();
  }

  render();
  idle();
  return { value, isBJ };
})();

// Vue Blackjack : affiche et anime l'état du moteur, aucune règle ici
App.register((() => {
  const $ = id => document.getElementById(id);
  const E = BlackjackEngine;
  const els = {
    dealer: $('bj-dealer'), dealerVal: $('bj-dealer-val'), hands: $('bj-hands'),
    actions: $('bj-actions'), msg: $('bj-msg'), shoe: $('bj-shoe'), counter: $('bj-counter'),
  };
  const bet = new BetControl($('bj-bet'), { label: 'Mise', initial: 10, max: betLimit('bj') });
  let round = null;     // manche affichée (en cours ou terminée)
  let anim = false;
  const valText = cards => { const v = E.value(cards); return v.soft && v.total < 21 ? `${v.total - 10} / ${v.total}` : String(v.total); };
  const msg = (t, c = '') => { els.msg.textContent = t; els.msg.className = 'msg ' + c; };

  function handBox() {
    const box = Util.el('div', 'bj-hand');
    box.innerHTML = '<div class="cards"></div><div class="hand-info"><span class="val"></span><span class="hbet"></span></div>' +
      '<div class="spot bj-spot"><div class="spot-chips"></div></div><div class="hand-result"></div>';
    return box;
  }
  function info() {
    const H = App.host;
    const si = E.shoeInfo(H.gameState('bj'));
    els.shoe.textContent = si.total ? `Sabot : ${si.total} cartes` : 'Sabot neuf';
    const q = H.query('bj.info', { lines: [], high: si.high, total: si.total });
    els.counter.hidden = !q.lines.length;
    els.counter.innerHTML = q.lines.join('<br>');
  }
  // Rendu ; opts.dealer / opts.hands limitent le nombre de cartes montrées (animation)
  function render(opts = {}) {
    info();
    if (!round) {
      renderCards(els.dealer, []); els.dealerVal.textContent = '';
      els.hands.innerHTML = '';
      els.hands.appendChild(handBox());
      setSpot(els.hands.firstChild.querySelector('.spot'), bet.value);
      return;
    }
    const r = round;
    const dealer = r.dealer.slice(0, opts.dealer ?? r.dealer.length);
    const hidden = r.hideHole && !r.bribed;
    renderCards(els.dealer, dealer, i => i === 1 && (hidden || opts.hideHole));
    const shownDealer = hidden || opts.hideHole ? dealer.slice(0, 1) : dealer;
    els.dealerVal.textContent = !dealer.length ? '' : (!hidden && !opts.hideHole && E.isBJ(r.dealer) && dealer.length === 2) ? 'Blackjack' : valText(shownDealer) + (r.hideHole && r.bribed ? ' 👁' : '');
    while (els.hands.children.length > r.hands.length) els.hands.lastChild.remove();
    r.hands.forEach((h, i) => {
      let box = els.hands.children[i];
      if (!box) els.hands.appendChild(box = handBox());
      box.classList.toggle('active', !r.done && r.stage === 'player' && i === r.active && r.hands.length > 1);
      const cards = h.cards.slice(0, opts.hands ? opts.hands[i] : h.cards.length);
      renderCards(box.querySelector('.cards'), cards);
      box.querySelector('.val').textContent = h.isBJ ? 'Blackjack' : cards.length ? valText(cards) : '';
      box.querySelector('.hbet').textContent = [h.doubled ? 'doublée' : '', i === 0 && r.insurance ? `assurance ${Util.fmt(r.insurance)}` : ''].filter(Boolean).join(' · ');
      if (!h.settled) setSpot(box.querySelector('.spot'), h.bet);
      const res = box.querySelector('.hand-result');
      res.textContent = r.settled ? h.result || '' : (h.bust ? 'Bust' : '');
      res.className = 'hand-result ' + (r.settled ? h.cls || '' : h.bust ? 'lose' : '');
    });
  }

  function idle() {
    bet.setEnabled(true);
    setActions(els.actions, [['Distribuer', deal, { cls: 'primary' }]]);
  }
  function showActions() { engineActions(els.actions, App.host.actions(), act); }

  async function deal() {
    anim = true;
    const res = App.host.startPlay('bj', { bet: bet.value });
    if (res.error) { anim = false; Sfx.play('error'); return msg(res.error, 'warn'); }
    App.syncBalance();
    bet.setEnabled(false);
    msg(res.round.notes.join(' '));
    round = res.round;
    els.hands.innerHTML = '';
    renderCards(els.dealer, []);
    await App.animate(async () => {
      // distribution une carte à la fois : joueur, croupier, joueur, croupier
      for (const [p, d] of [[1, 0], [1, 1], [2, 1], [2, 2]]) { render({ hands: [p], dealer: d, hideHole: true }); await Util.sleep(300); }
      await continueWith(res);
    });
  }
  async function act(id) {
    const before = { dealer: round.dealer.length, hidden: round.hideHole && !round.bribed };
    anim = true;
    const res = App.host.act(id);
    if (res.error) { anim = false; return showActions(); }
    if (['insure', 'double', 'split'].includes(id)) { App.syncBalance(); Sfx.play('chip'); }
    await App.animate(async () => {
      render({ dealer: before.dealer, hideHole: before.hidden });
      await Util.sleep(250);
      await continueWith(res, before);
    });
  }
  // Suite commune : révélation du croupier, règlement ou nouvelles actions
  async function continueWith(res, before = { dealer: 2 }) {
    const r = round;
    try {
      if (r.notes.length) msg(r.notes.join(' '), r.notes.some(n => n.includes('croupier a un')) ? 'lose' : '');
      if (!res.settlement) {
        render();
        if (r.stage === 'bust') msg('Bust ! Le Fantôme peut effacer cette carte…', 'warn');
        return showActions();
      }
      setActions(els.actions, []);
      // le croupier retourne sa carte puis tire, une carte à la fois
      render({ dealer: Math.min(before.dealer, r.dealer.length) });
      await Util.sleep(450);
      for (let k = before.dealer + 1; k <= r.dealer.length; k++) { render({ dealer: k }); await Util.sleep(480); }
      r.settled = true;
      render();
      r.hands.forEach((h, i) => { h.settled = true; settleSpot(els.hands.children[i].querySelector('.spot'), h.net > 0 ? 'win' : h.net < 0 ? 'lose' : 'push', h.net); });
      const st = res.settlement;
      msg((r.notes.filter(n => n.includes('croupier a un')).join(' ') + ' ' +
        (st.net > 0 ? `Vous gagnez ${Util.fmt(st.net)} jetons !` : st.net < 0 ? `Vous perdez ${Util.fmt(-st.net)} jetons.` : 'Égalité, mise rendue.')).trim(),
        st.net > 0 ? 'win' : st.net < 0 ? 'lose' : 'push');
      Sfx.play(st.net > 0 ? (st.net >= st.staked ? 'bigwin' : 'win') : st.net < 0 ? 'lose' : 'push');
      await App.showSettlement(st);
      idle();
    } finally { anim = false; }
  }

  bet.onChange = () => { if (!round || round.settled) { round = null; render(); } };
  App.on('change', () => {
    const a = App.host && App.host.active();
    if (anim || !a || a.id !== 'bj') { if (!a) info(); return; }
    render(); showActions();
  });
  return {
    id: 'bj',
    reset() { round = null; render(); idle(); msg(''); bet.refresh(); },
    refresh() { bet.refresh(); if (!anim) render(); },
  };
})());

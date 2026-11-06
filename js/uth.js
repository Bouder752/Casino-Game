// Ultimate Texas Hold'em
// Ante = Blind obligatoires, Trips optionnel.
// Pré-flop : parole ou Play 3x/4x · Flop : parole ou Play 2x · Turn + River : se coucher ou Play 1x.
// Le croupier se qualifie avec une paire ou mieux (sinon l'Ante est rendu).
const BLIND_PAY = { 9: 500, 8: 50, 7: 10, 6: 3, 5: 1.5, 4: 1 };
const TRIPS_PAY = { 9: 50, 8: 40, 7: 30, 6: 8, 5: 6, 4: 5, 3: 3 };

const UTH = (() => {
  const $ = id => document.getElementById(id);
  const els = {
    dealer: $('uth-dealer'), dealerName: $('uth-dealer-name'),
    board: $('uth-board'), player: $('uth-player'), playerName: $('uth-player-name'),
    actions: $('uth-actions'), msg: $('uth-msg'), results: $('uth-results'),
    spots: { ante: $('uth-spot-ante'), blind: $('uth-spot-blind'), play: $('uth-spot-play'), trips: $('uth-spot-trips') },
    odds: $('uth-odds'), mini: $('uth-mini-odds'),
  };
  const ante = new BetControl($('uth-ante'), { label: 'Ante (= Blind)', initial: 10, max: () => Casino.maxBet('uth') });
  const trips = new BetControl($('uth-trips'), { label: 'Trips (optionnel)', initial: 0, max: () => Casino.maxBet('uth') });
  let s = null;

  function msg(text, cls = '') { els.msg.textContent = text; els.msg.className = 'msg ' + cls; }

  function updateSpots() {
    const v = s ? { ante: s.ante, blind: s.blind, play: s.play, trips: s.trips }
                : { ante: ante.value, blind: ante.value, play: 0, trips: trips.value };
    for (const k in els.spots) setSpot(els.spots[k], v[k]);
  }
  ante.onChange = trips.onChange = () => { if (!s) updateSpots(); };

  function render(final = null) {
    updateSpots();
    if (!s) {
      [els.dealer, els.board, els.player].forEach(c => renderCards(c, []));
      els.dealerName.textContent = els.playerName.textContent = '';
      return;
    }
    const hl = final ? final.cards : null;
    renderCards(els.dealer, s.dealer, () => !s.reveal && !s.bribed);
    renderCards(els.board, s.board, i => i >= s.shown, hl);
    renderCards(els.player, s.player, () => false, hl);
    els.playerName.textContent = describeHand([...s.player, ...s.board.slice(0, s.shown)]);
    els.dealerName.textContent = s.reveal ? describeHand([...s.dealer, ...s.board])
      : s.bribed ? describeHand([...s.dealer, ...s.board.slice(0, s.shown)]) + ' 👁' : '';
  }

  // ---------- Encart de probabilités ----------
  const ODDS_ORDER = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  function buildOdds() {
    els.odds.innerHTML = `
      <div class="odds-head"><span>Probabilités en direct</span><span class="odds-stage"></span></div>
      <div class="odds-empty">Distribuez pour voir vos chances.</div>
      <div class="odds-body" hidden>
        <div class="odds-sub">Contre le croupier</div>
        <div class="wtl"><div class="w"></div><div class="t"></div><div class="l"></div></div>
        <div class="wtl-legend"><span class="w">Gagner <b></b></span><span class="t">Égalité <b></b></span><span class="l">Perdre <b></b></span></div>
        <div class="odds-sub">Votre main à la river</div>
        <div class="odds-list">${ODDS_ORDER.map(c => `
          <div class="odds-row" data-cat="${c}"><span class="on">${HAND_NAMES[c]}</span>
          <span class="ob"><i></i></span><span class="op"></span></div>`).join('')}</div>
        <div class="odds-note"></div>
      </div>`;
  }
  const pct = x => x <= 0 ? '—' : x < 0.0001 ? '<0,01 %' : (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: x < 0.1 ? 2 : 1, minimumFractionDigits: 1 }) + ' %';

  function showOdds(r, made, stageLabel) {
    els.odds.querySelector('.odds-empty').hidden = true;
    els.odds.querySelector('.odds-body').hidden = false;
    els.odds.querySelector('.odds-stage').textContent = stageLabel + (r.done ? '' : ' …');
    els.mini.textContent = `${pct(r.win)} de gagner`;
    const wtl = els.odds.querySelector('.wtl');
    wtl.querySelector('.w').style.width = r.win * 100 + '%';
    wtl.querySelector('.t').style.width = r.tie * 100 + '%';
    wtl.querySelector('.l').style.width = r.lose * 100 + '%';
    const leg = els.odds.querySelectorAll('.wtl-legend b');
    leg[0].textContent = pct(r.win); leg[1].textContent = pct(r.tie); leg[2].textContent = pct(r.lose);
    els.odds.querySelectorAll('.odds-row').forEach(row => {
      const c = +row.dataset.cat, p = r.cats[c];
      row.querySelector('i').style.width = Math.max(p > 0 ? 1.5 : 0, p * 100) + '%';
      row.querySelector('.op').textContent = pct(p);
      row.classList.toggle('made', c === made);
      row.classList.toggle('zero', p <= 0);
    });
    els.odds.querySelector('.odds-note').textContent = r.exact
      ? 'Calcul exact sur toutes les cartes restantes.'
      : 'Estimation sur 40 000 donnes simulées.';
  }

  function updateOdds() {
    if (!s) return;
    const board = s.board.slice(0, s.shown);
    const made = eval7([...s.player, ...board]) >> 20;
    const label = { 0: 'Pré-flop', 3: 'Flop', 5: 'River' }[s.shown];
    Odds.compute(s.player, board, r => showOdds(r, made, label + (s.bribed ? ' · croupier connu' : '')), s.bribed ? s.dealer : []);
  }
  function resetOdds() {
    Odds.cancel();
    els.odds.querySelector('.odds-empty').hidden = false;
    els.odds.querySelector('.odds-body').hidden = true;
    els.odds.querySelector('.odds-stage').textContent = '';
    els.mini.textContent = '';
  }

  // ---------- Déroulement ----------
  // Consommables (Carte Bonus, Pot-de-vin) pendant une main
  function updateCtx() {
    const live = s && ['preflop', 'flop', 'river'].includes(s.stage);
    Casino.setCtx('uth', live ? {
      bonusCard: s.player.length < 3 ? card => bonusCard(card) : null,
      bribe: !s.bribed ? () => { s.bribed = true; render(); updateOdds(); updateCtx(); } : null,
      used: [...s.player, ...s.board.slice(0, s.shown), ...(s.bribed ? s.dealer : [])],
    } : null);
  }
  function bonusCard(card) {
    const same = c => c.rank === card.rank && c.suit === card.suit;
    // Si la carte choisie est cachée (tableau ou croupier), elle est remplacée par une autre
    const fresh = () => { let c; do { c = s.deck.draw(); } while (same(c)); return c; };
    s.board.forEach((c, i) => { if (same(c)) s.board[i] = fresh(); });
    s.dealer.forEach((c, i) => { if (same(c)) s.dealer[i] = fresh(); });
    s.player.push({ rank: card.rank, suit: card.suit });
    Sfx.play('joker');
    render(); updateOdds(); updateCtx();
  }

  function idle() {
    ante.setEnabled(true); trips.setEnabled(true);
    updateCtx();
    setActions(els.actions, [['Distribuer', deal, { cls: 'primary' }]]);
  }

  async function deal() {
    const err = Casino.canStart();
    if (err) return idle(), msg(err, 'warn');
    const a = ante.value, t = trips.value;
    if (a <= 0) return idle(), msg('Placez une mise Ante.', 'warn');
    if (!Wallet.take(a * 2 + t)) return idle(), msg(`Solde insuffisant (il faut ${Util.fmt(a * 2 + t)} : Ante + Blind${t ? ' + Trips' : ''}).`, 'warn');
    Casino.begin();
    ante.setEnabled(false); trips.setEnabled(false);
    msg(''); els.results.innerHTML = '';
    resetOdds();
    const deck = new Shoe(1);
    s = { ante: a, blind: a, trips: t, play: 0, player: [], dealer: [], board: [], shown: 0, reveal: false, deck };
    render();
    for (let i = 0; i < 2; i++) {
      s.player.push(deck.draw()); render(); await Util.sleep(260);
      s.dealer.push(deck.draw()); render(); await Util.sleep(260);
    }
    for (let i = 0; i < 5; i++) s.board.push(deck.draw());
    render();
    await Util.sleep(250);
    updateOdds();
    stage('preflop');
  }

  function playBtn(mult) {
    const amt = s.ante * mult;
    return [`Miser ${mult}x (${Util.fmt(amt)})`, () => placePlay(mult), { cls: 'primary', disabled: !Wallet.canAfford(amt) }];
  }

  function stage(name) {
    s.stage = name;
    render();
    updateCtx();
    if (name === 'preflop') {
      msg('Pré-flop : misez 3x ou 4x l\'Ante, ou checkez.');
      setActions(els.actions, [playBtn(4), playBtn(3), ['Check', () => reveal(3, 'flop')]]);
    } else if (name === 'flop') {
      msg('Flop : misez 2x l\'Ante, ou checkez.');
      setActions(els.actions, [playBtn(2), ['Check', () => reveal(5, 'river')]]);
    } else if (name === 'river') {
      msg('Turn et river : misez 1x l\'Ante ou couchez-vous.');
      setActions(els.actions, [playBtn(1), ['Se coucher', fold, { cls: 'danger' }]]);
    }
  }

  async function reveal(n, nextStage) {
    while (s.shown < n) { s.shown++; render(); await Util.sleep(380); }
    updateOdds();
    if (nextStage) stage(nextStage);
  }

  async function placePlay(mult) {
    const amt = s.ante * mult;
    if (!Wallet.take(amt)) return stage(s.stage);
    s.play = amt;
    updateSpots();
    await Util.sleep(350);
    await reveal(5);
    return showdown();
  }

  async function fold() {
    s.folded = true;
    return showdown();
  }

  async function showdown() {
    s.stage = 'showdown';
    updateCtx();
    setActions(els.actions, []);
    await Util.sleep(400);
    s.reveal = true;
    const ph = bestHand([...s.player, ...s.board]);
    const dh = bestHand([...s.dealer, ...s.board]);
    render(s.folded ? null : ph);
    await Util.sleep(700);

    const qual = dh.cat >= 1 || Casino.boss('fer');
    const cmp = compareHands(ph, dh);
    const lines = [];
    let back = 0, staked = 0;
    const add = (key, name, stake, ret, note = '') => {
      if (stake <= 0) return;
      ret = Util.round2(ret);
      staked += stake; back += ret;
      lines.push({ key, name, net: Util.round2(ret - stake), note });
    };
    const nq = 'croupier non qualifié : rendu';
    if (s.folded) {
      add('ante', 'Ante', s.ante, 0, 'couché');
      add('blind', 'Blind', s.blind, 0, 'couché');
    } else if (cmp > 0) {
      add('play', 'Play', s.play, s.play * 2, '1:1');
      add('ante', 'Ante', s.ante, qual ? s.ante * 2 : s.ante, qual ? '1:1' : nq);
      const bp = BLIND_PAY[ph.cat] || (ph.cat === 3 && Casino.rule('uthTrips') ? 1 : 0);
      add('blind', 'Blind', s.blind, s.blind * (1 + (bp || 0)), bp ? `${ph.name} ${bp === 1.5 ? '3:2' : bp + ':1'}` : 'rendu (moins qu\'une quinte)');
    } else if (cmp === 0) {
      add('play', 'Play', s.play, s.play, 'égalité');
      add('ante', 'Ante', s.ante, s.ante, 'égalité');
      add('blind', 'Blind', s.blind, s.blind, 'égalité');
    } else {
      add('play', 'Play', s.play, 0);
      add('ante', 'Ante', s.ante, qual ? 0 : s.ante, qual ? '' : nq);
      add('blind', 'Blind', s.blind, 0);
    }
    if (s.trips > 0) {
      const tp = TRIPS_PAY[ph.cat];
      add('trips', 'Trips', s.trips, tp ? s.trips * (tp + 1) : 0, tp ? `${ph.name} ${tp}:1` : 'moins qu\'un brelan');
    }
    lines.forEach(l => settleSpot(els.spots[l.key], l.net > 0 ? 'win' : l.net < 0 ? 'lose' : 'push', l.net));
    const sevens = [...s.player, ...s.board, ...s.dealer].filter(c => c.rank === 7).length;
    const res = Casino.settle('uth', { staked: Util.round2(staked), back: Util.round2(back), sevens });
    const bonus = Util.round2(res.net - (back - staked));
    if (bonus) lines.push({ key: 'jokers', name: 'Jokers', net: bonus, note: res.mult > 1 ? `gains ×${Util.fmt(Util.round2(res.mult))}` : 'bonus' });
    const net = res.net;
    Sfx.play(net > 0 ? (net >= staked ? 'bigwin' : 'win') : net < 0 ? 'lose' : 'push');

    let verdict;
    if (s.folded) verdict = 'Vous vous êtes couché.';
    else if (cmp > 0) verdict = `Vous gagnez avec ${describeHand([...s.player, ...s.board])} !`;
    else if (cmp < 0) verdict = `Le croupier gagne avec ${describeHand([...s.dealer, ...s.board])}.`;
    else verdict = 'Égalité !';
    if (!s.folded && !qual) verdict += ' (Croupier non qualifié)';
    msg(verdict, net > 0 ? 'win' : net < 0 ? 'lose' : 'push');

    els.results.innerHTML = '';
    lines.forEach(l => {
      const row = Util.el('div', 'res-row ' + (l.net > 0 ? 'win' : l.net < 0 ? 'lose' : 'push'));
      row.append(Util.el('span', 'res-name', l.name), Util.el('span', 'res-note', l.note), Util.el('span', 'res-net', Util.signed(l.net)));
      els.results.appendChild(row);
    });
    const tot = Util.el('div', 'res-row total ' + (net > 0 ? 'win' : net < 0 ? 'lose' : 'push'));
    tot.append(Util.el('span', 'res-name', 'Total'), Util.el('span', 'res-note', ''), Util.el('span', 'res-net', Util.signed(net)));
    els.results.appendChild(tot);

    setActions(els.actions, [['Nouvelle main', async () => {
      s = null; render(); els.results.innerHTML = ''; msg(''); resetOdds(); idle();
    }, { cls: 'primary' }]]);
  }

  buildOdds();
  render();
  idle();
})();

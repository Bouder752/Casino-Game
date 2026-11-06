// Ultimate Texas Hold'em
// Ante = Blind obligatoires, Trips optionnel.
// Pré-flop : parole ou Play 3x/4x · Flop : parole ou Play 2x · River : se coucher ou Play 1x.
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
  };
  const ante = new BetControl($('uth-ante'), { label: 'Ante (= Blind)', initial: 10 });
  const trips = new BetControl($('uth-trips'), { label: 'Trips (optionnel)', initial: 0 });
  let s = null;

  function msg(text, cls = '') { els.msg.textContent = text; els.msg.className = 'msg ' + cls; }

  function updateSpots() {
    const v = s ? { ante: s.ante, blind: s.blind, play: s.play, trips: s.trips }
                : { ante: ante.value, blind: ante.value, play: 0, trips: trips.value };
    for (const k in els.spots) {
      const sp = els.spots[k];
      sp.querySelector('.amt').textContent = v[k] ? Util.fmt(v[k]) : '—';
      sp.classList.toggle('filled', v[k] > 0);
    }
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
    renderCards(els.dealer, s.dealer, () => !s.reveal);
    renderCards(els.board, s.board, i => i >= s.shown, hl);
    renderCards(els.player, s.player, () => false, hl);
    els.playerName.textContent = describeHand([...s.player, ...s.board.slice(0, s.shown)]);
    els.dealerName.textContent = s.reveal ? describeHand([...s.dealer, ...s.board]) : '';
  }

  function idle() {
    ante.setEnabled(true); trips.setEnabled(true);
    setActions(els.actions, [['Distribuer', deal, { cls: 'primary' }]]);
  }

  async function deal() {
    const a = ante.value, t = trips.value;
    if (a <= 0) return idle(), msg('Placez une mise Ante.', 'warn');
    if (!Wallet.take(a * 2 + t)) return idle(), msg(`Solde insuffisant (il faut ${Util.fmt(a * 2 + t)} : Ante + Blind${t ? ' + Trips' : ''}).`, 'warn');
    ante.setEnabled(false); trips.setEnabled(false);
    msg(''); els.results.innerHTML = '';
    const deck = new Shoe(1);
    s = { ante: a, blind: a, trips: t, play: 0, player: [], dealer: [], board: [], shown: 0, reveal: false };
    render();
    for (let i = 0; i < 2; i++) {
      s.player.push(deck.draw()); render(); await Util.sleep(220);
      s.dealer.push(deck.draw()); render(); await Util.sleep(220);
    }
    for (let i = 0; i < 5; i++) s.board.push(deck.draw());
    render();
    stage('preflop');
  }

  function playBtn(mult) {
    const amt = s.ante * mult;
    return [`Miser ${mult}x (${Util.fmt(amt)})`, () => placePlay(mult), { cls: 'primary', disabled: !Wallet.canAfford(amt) }];
  }

  function stage(name) {
    s.stage = name;
    render();
    if (name === 'preflop') {
      msg('Pré-flop : misez 3x ou 4x l\'Ante, ou checkez.');
      setActions(els.actions, [playBtn(4), playBtn(3), ['Check', () => reveal(3, 'flop')]]);
    } else if (name === 'flop') {
      msg('Flop : misez 2x l\'Ante, ou checkez.');
      setActions(els.actions, [playBtn(2), ['Check', () => reveal(5, 'river')]]);
    } else if (name === 'river') {
      msg('River : misez 1x l\'Ante ou couchez-vous.');
      setActions(els.actions, [playBtn(1), ['Se coucher', fold, { cls: 'danger' }]]);
    }
  }

  async function reveal(n, nextStage) {
    while (s.shown < n) { s.shown++; render(); await Util.sleep(250); }
    if (nextStage) stage(nextStage);
  }

  async function placePlay(mult) {
    const amt = s.ante * mult;
    if (!Wallet.take(amt)) return stage(s.stage);
    s.play = amt;
    updateSpots();
    await reveal(5);
    return showdown();
  }

  async function fold() {
    s.folded = true;
    return showdown();
  }

  async function showdown() {
    setActions(els.actions, []);
    await Util.sleep(300);
    s.reveal = true;
    const ph = bestHand([...s.player, ...s.board]);
    const dh = bestHand([...s.dealer, ...s.board]);
    render(s.folded ? null : ph);

    const qual = dh.cat >= 1;
    const cmp = compareHands(ph, dh);
    const lines = [];
    let back = 0, staked = 0;
    const add = (name, stake, ret, note = '') => {
      if (stake <= 0) return;
      ret = Util.round2(ret);
      staked += stake; back += ret;
      lines.push({ name, net: Util.round2(ret - stake), note });
    };
    const nq = 'croupier non qualifié : rendu';
    if (s.folded) {
      add('Ante', s.ante, 0, 'couché');
      add('Blind', s.blind, 0, 'couché');
    } else if (cmp > 0) {
      add('Play', s.play, s.play * 2, '1:1');
      add('Ante', s.ante, qual ? s.ante * 2 : s.ante, qual ? '1:1' : nq);
      const bp = BLIND_PAY[ph.cat];
      add('Blind', s.blind, s.blind * (1 + (bp || 0)), bp ? `${ph.name} ${bp === 1.5 ? '3:2' : bp + ':1'}` : 'rendu (moins qu\'une quinte)');
    } else if (cmp === 0) {
      add('Play', s.play, s.play, 'égalité');
      add('Ante', s.ante, s.ante, 'égalité');
      add('Blind', s.blind, s.blind, 'égalité');
    } else {
      add('Play', s.play, 0);
      add('Ante', s.ante, qual ? 0 : s.ante, qual ? '' : nq);
      add('Blind', s.blind, 0);
    }
    if (s.trips > 0) {
      const tp = TRIPS_PAY[ph.cat];
      add('Trips', s.trips, tp ? s.trips * (tp + 1) : 0, tp ? `${ph.name} ${tp}:1` : 'moins qu\'un brelan');
    }
    Wallet.give(Util.round2(back));
    const net = Util.round2(back - staked);

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

    setActions(els.actions, [['Nouvelle main', async () => { s = null; render(); els.results.innerHTML = ''; msg(''); idle(); }, { cls: 'primary' }]]);
  }

  render();
  idle();
})();

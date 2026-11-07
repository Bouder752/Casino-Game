// Vue Ultimate Texas Hold'em + encart de probabilités en direct
App.register((() => {
  const $ = id => document.getElementById(id);
  const E = Games.get('uth');
  const els = {
    dealer: $('uth-dealer'), dealerName: $('uth-dealer-name'), board: $('uth-board'), player: $('uth-player'),
    playerName: $('uth-player-name'), actions: $('uth-actions'), msg: $('uth-msg'), results: $('uth-results'),
    spots: { ante: $('uth-spot-ante'), blind: $('uth-spot-blind'), play: $('uth-spot-play'), trips: $('uth-spot-trips') },
    odds: $('uth-odds'), mini: $('uth-mini-odds'),
  };
  const ante = new BetControl($('uth-ante'), { label: 'Ante', initial: 10, max: () => (App.host ? Math.min(App.host.maxBet('uth'), Math.floor(App.host.chips() / 2)) : Infinity) });
  const trips = new BetControl($('uth-trips'), { label: 'Trips', initial: 0, chips: [1, 5, 25], compact: true, max: betLimit('uth') });
  let r = null, anim = false;
  const msg = (t, c = '') => { els.msg.textContent = iconMsg(t, c); els.msg.className = 'msg ' + c; };

  function spots() {
    const v = r ? { ante: r.ante, blind: r.blind, play: r.play, trips: r.trips } : { ante: ante.value, blind: ante.value, play: 0, trips: trips.value };
    for (const k in els.spots) setSpot(els.spots[k], v[k]);
  }
  ante.onChange = trips.onChange = () => { if (!r || r.done) { r = null; render(); } };

  function render(final = null) {
    spots();
    if (!r) {
      [els.dealer, els.board, els.player].forEach(c => renderCards(c, []));
      els.dealerName.textContent = els.playerName.textContent = '';
      return;
    }
    const hl = final ? final.cards : null;
    renderCards(els.dealer, r.dealer, () => !r.reveal && !r.bribed);
    renderCards(els.board, r.board, i => i >= r.shown, hl);
    renderCards(els.player, r.player, () => false, hl);
    els.playerName.textContent = describeHand([...r.player, ...r.board.slice(0, r.shown)]);
    els.dealerName.textContent = r.reveal ? describeHand([...r.dealer, ...r.board])
      : r.bribed ? describeHand([...r.dealer, ...r.board.slice(0, r.shown)]) + ' 👁' : '';
  }

  // ---------- Probabilités ----------
  const ORDER = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  els.odds.innerHTML = `
    <div class="odds-head"><span>Probabilités en direct</span><span class="odds-stage"></span></div>
    <div class="odds-empty">Distribuez pour voir vos chances.</div>
    <div class="odds-body" hidden>
      <div class="odds-sub">Contre le croupier</div>
      <div class="wtl"><div class="w"></div><div class="t"></div><div class="l"></div></div>
      <div class="wtl-legend"><span class="w">Gagner <b></b></span><span class="t">Égalité <b></b></span><span class="l">Perdre <b></b></span></div>
      <div class="odds-sub">Votre main à la river</div>
      <div class="odds-list">${ORDER.map(c => `<div class="odds-row" data-cat="${c}"><span class="on">${HAND_NAMES[c]}</span><span class="ob"><i></i></span><span class="op"></span></div>`).join('')}</div>
      <div class="odds-note"></div>
    </div>`;
  const pct = x => x <= 0 ? '—' : x < 0.0001 ? '<0,01 %' : (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: x < 0.1 ? 2 : 1, minimumFractionDigits: 1 }) + ' %';
  function showOdds(o, made, label) {
    els.odds.querySelector('.odds-empty').hidden = true;
    els.odds.querySelector('.odds-body').hidden = false;
    els.odds.querySelector('.odds-stage').textContent = label + (o.done ? '' : ' …');
    els.mini.textContent = pct(o.win);
    const w = els.odds.querySelector('.wtl');
    w.querySelector('.w').style.width = o.win * 100 + '%';
    w.querySelector('.t').style.width = o.tie * 100 + '%';
    w.querySelector('.l').style.width = o.lose * 100 + '%';
    const leg = els.odds.querySelectorAll('.wtl-legend b');
    leg[0].textContent = pct(o.win); leg[1].textContent = pct(o.tie); leg[2].textContent = pct(o.lose);
    els.odds.querySelectorAll('.odds-row').forEach(row => {
      const c = +row.dataset.cat, p = o.cats[c];
      row.querySelector('i').style.width = Math.max(p > 0 ? 1.5 : 0, p * 100) + '%';
      row.querySelector('.op').textContent = pct(p);
      row.classList.toggle('made', c === made);
      row.classList.toggle('zero', p <= 0);
    });
    els.odds.querySelector('.odds-note').textContent = o.exact ? 'Calcul exact sur toutes les cartes restantes.' : 'Estimation sur 40 000 donnes simulées.';
  }
  function updateOdds() {
    if (!r || ![0, 3, 5].includes(r.shown)) return;
    const board = r.board.slice(0, r.shown);
    const made = eval7([...r.player, ...board]) >> 20;
    const label = { 0: 'Pré-flop', 3: 'Flop', 5: 'River' }[r.shown] + (r.bribed ? ' · croupier connu' : '');
    Odds.compute(r.player, board, o => showOdds(o, made, label), r.bribed ? r.dealer : [], App.host.excludedRanks());
  }
  function resetOdds() {
    Odds.cancel();
    els.odds.querySelector('.odds-empty').hidden = false;
    els.odds.querySelector('.odds-body').hidden = true;
    els.odds.querySelector('.odds-stage').textContent = '';
    els.mini.textContent = '';
  }

  // ---------- Déroulement ----------
  const STAGE_MSG = { preflop: 'Pré-flop : misez 3x ou 4x l\'Ante, ou checkez.', flop: 'Flop : misez 2x l\'Ante, ou checkez.', river: 'Turn et river : misez 1x l\'Ante ou couchez-vous.' };
  function idle() {
    ante.setEnabled(true); trips.setEnabled(true);
    setActions(els.actions, [['Distribuer', deal, { cls: 'primary' }]]);
  }
  function showActions() { msg(STAGE_MSG[r.stage]); engineActions(els.actions, App.host.actions(), act); }

  async function deal() {
    anim = true;
    const res = App.host.startPlay('uth', { ante: ante.value, trips: trips.value });
    if (res.error) { anim = false; Sfx.play('error'); return msg(res.error, 'warn'); }
    App.syncStake(res);
    ante.setEnabled(false); trips.setEnabled(false);
    msg(''); els.results.innerHTML = '';
    resetOdds();
    r = res.round;
    await App.animate(async () => {
      try {
        const full = { player: r.player, dealer: r.dealer };
        for (let i = 1; i <= 2; i++) {
          renderCards(els.player, full.player.slice(0, i)); await Util.sleep(260);
          renderCards(els.dealer, full.dealer.slice(0, i), () => true); await Util.sleep(260);
        }
        render(); spots();
        await Util.sleep(250);
        updateOdds();
        showActions();
      } finally { anim = false; }
    });
  }
  async function act(id) {
    const shownBefore = r.shown;
    anim = true;
    const res = App.host.act(id);
    if (res.error) { anim = false; return showActions(); }
    if (id.startsWith('bet')) { App.syncBalance(); spots(); }
    await App.animate(async () => {
      try {
        setActions(els.actions, []);
        // révélation progressive du tableau
        const target = r.shown;
        r.shown = shownBefore;
        while (r.shown < target) { r.shown++; render(); await Util.sleep(380); }
        if (!res.settlement) { updateOdds(); return showActions(); }
        await showdown(res.settlement);
      } finally { anim = false; }
    });
  }
  async function showdown(st) {
    updateOdds();
    await Util.sleep(400);
    render(r.folded ? null : r.ph);
    await Util.sleep(600);
    r.lines.forEach(l => settleSpot(els.spots[l.key], l.net > 0 ? 'win' : l.net < 0 ? 'lose' : 'push', l.net));
    let verdict;
    if (r.folded) verdict = 'Vous vous êtes couché.';
    else if (r.cmp > 0) verdict = `Vous gagnez avec ${describeHand([...r.player, ...r.board])} !`;
    else if (r.cmp < 0) verdict = `Le croupier gagne avec ${describeHand([...r.dealer, ...r.board])}.`;
    else verdict = 'Égalité !';
    if (!r.folded && !r.qual) verdict += ' (Croupier non qualifié)';
    msg(verdict, st.net > 0 ? 'win' : st.net < 0 ? 'lose' : 'push');
    els.results.innerHTML = '';
    const lines = r.lines.slice();
    if (Math.abs(st.net - (st.baseBack - st.staked)) > 0.001) lines.push({ name: 'Jokers', net: Math.round((st.net - (st.baseBack - st.staked)) * 100) / 100, note: 'voir le détail' });
    lines.forEach(l => {
      const row = Util.el('div', 'res-row ' + (l.net > 0 ? 'win' : l.net < 0 ? 'lose' : 'push'));
      row.append(Util.el('span', 'res-name', l.name), Util.el('span', 'res-note', l.note), Util.el('span', 'res-net', Util.signed(l.net)));
      els.results.appendChild(row);
    });
    const tot = Util.el('div', 'res-row total ' + (st.net > 0 ? 'win' : st.net < 0 ? 'lose' : 'push'));
    tot.append(Util.el('span', 'res-name', 'Total'), Util.el('span', 'res-note', ''), Util.el('span', 'res-net', Util.signed(st.net)));
    els.results.appendChild(tot);
    Sfx.play(st.net > 0 ? (st.net >= st.staked ? 'bigwin' : 'win') : st.net < 0 ? 'lose' : 'push');
    await App.showSettlement(st);
    // Enchaîner directement : « Distribuer » relance une main (la table est nettoyée au passage)
    ante.setEnabled(true); trips.setEnabled(true);
    setActions(els.actions, [['Distribuer', async () => { els.results.innerHTML = ''; r = null; render(); return deal(); }, { cls: 'primary' }]]);
  }

  App.on('change', () => {
    const a = App.host && App.host.active();
    if (anim || !a || a.id !== 'uth') return;
    render(); updateOdds(); showActions();
  });
  return {
    id: 'uth',
    reset() { r = null; render(); resetOdds(); idle(); msg(''); els.results.innerHTML = ''; ante.refresh(); trips.refresh(); },
    refresh() { ante.refresh(); trips.refresh(); if (!anim) render(); },
  };
})());

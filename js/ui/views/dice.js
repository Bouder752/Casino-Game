// Vue Dice : seuil, mode, tirage animé ; le tirage vient du moteur
App.register((() => {
  const $ = id => document.getElementById(id);
  const E = Games.get('dice');
  const els = {
    result: $('dice-result'), slider: $('dice-target'), targetVal: $('dice-target-val'),
    under: $('dice-under'), over: $('dice-over'), chance: $('dice-chance'), mult: $('dice-mult'),
    profit: $('dice-profit'), rule: $('dice-rule'), marker: $('dice-marker'), track: $('dice-track'),
    history: $('dice-history'), actions: $('dice-actions'), msg: $('dice-msg'),
  };
  const bet = new BetControl($('dice-bet'), { label: 'Mise', initial: 10, max: betLimit('dice') });
  let mode = 'under', busy = false;
  const history = [];
  const msg = (t, c = '') => { els.msg.textContent = iconMsg(t, c); els.msg.className = 'msg ' + c; };
  const target = () => +els.slider.value;

  function update() {
    if (!App.host) return;
    const q = E.quote(App.host, target(), mode), t = target();
    els.targetVal.textContent = t.toFixed(2);
    els.chance.textContent = q.chance.toFixed(2) + ' %';
    els.mult.textContent = '×' + q.mult.toFixed(4);
    els.profit.textContent = Util.fmt(Util.round2(bet.value * q.mult - bet.value));
    els.rule.textContent = mode === 'under' ? `Gagné si le résultat < ${t.toFixed(2)}` : `Gagné si le résultat ≥ ${t.toFixed(2)}`;
    els.under.classList.toggle('active', mode === 'under');
    els.over.classList.toggle('active', mode === 'over');
    els.track.style.setProperty('--t', t + '%');
    els.track.classList.toggle('over', mode === 'over');
  }
  els.slider.oninput = update;
  els.under.onclick = () => { if (!busy) { mode = 'under'; update(); } };
  els.over.onclick = () => { if (!busy) { mode = 'over'; update(); } };
  bet.onChange = update;

  async function show(r) {
    els.result.className = 'dice-result rolling';
    Sfx.play('roll');
    for (let i = 0; i < 14; i++) {
      els.result.textContent = (RNG.fx.int(10000) / 100).toFixed(2); // défilement décoratif
      if (i % 3 === 0) Sfx.play('tick');
      await Util.sleep(35 + i * 3);
    }
    els.result.textContent = r.roll.toFixed(2);
    els.result.className = 'dice-result ' + (r.win ? 'win' : 'lose');
    els.marker.style.left = r.roll + '%';
    els.marker.className = 'dice-marker show ' + (r.win ? 'win' : 'lose');
    history.unshift({ r: r.roll, win: r.win });
    if (history.length > 14) history.pop();
    els.history.innerHTML = '';
    history.forEach(h => els.history.appendChild(Util.el('span', 'pill ' + (h.win ? 'win' : 'lose'), h.r.toFixed(2))));
  }
  async function after(res, roll = true) {
    if (roll) await show(res.round);
    if (!res.settlement) {
      msg('Perdu… une relance est possible.', 'warn');
      return engineActions(els.actions, App.host.actions(), act);
    }
    const st = res.settlement;
    if (st.net > 0) { msg(`Gagné ! +${Util.fmt(st.net)} jetons`, 'win'); Sfx.play(res.round.mult >= 4 ? 'bigwin' : 'win'); }
    else if (st.net < 0) { msg(`Perdu ! −${Util.fmt(-st.net)} jetons`, 'lose'); Sfx.play('lose'); }
    else { msg('Perdu, mais les jokers compensent.', 'push'); Sfx.play('push'); }
    await App.showSettlement(st);
    end();
  }
  function end() { busy = false; bet.setEnabled(true); els.slider.disabled = false; idle(); }
  function roll() {
    return App.animate(async () => {
      const res = App.host.startPlay('dice', { bet: bet.value, target: target(), mode });
      if (res.error) { Sfx.play('error'); return msg(res.error, 'warn'); }
      App.syncBalance();
      busy = true; bet.setEnabled(false); els.slider.disabled = true;
      setActions(els.actions, []);
      await after(res);
    });
  }
  function act(id) {
    return App.animate(async () => {
      const res = App.host.act(id);
      if (res.error) return end();
      setActions(els.actions, []);
      if (id === 'reroll') history.shift();
      await after(res, id === 'reroll');
    });
  }
  function idle() { setActions(els.actions, [['Lancer', roll, { cls: 'primary' }]]); }
  App.on('change', () => { if (!busy) update(); });
  return {
    id: 'dice',
    reset() { end(); bet.refresh(); update(); msg(''); },
    refresh() { bet.refresh(); update(); },
  };
})());

// Vue Machine à sous : rouleaux animés ; le résultat vient du moteur
App.register((() => {
  const $ = id => document.getElementById(id);
  const E = Games.get('slots');
  const els = { reels: $('sl-reels'), actions: $('sl-actions'), msg: $('sl-msg'), lever: $('sl-lever'), pay: $('sl-paytable'), win: $('sl-win'), lights: $('sl-lights') };
  const bet = new BetControl($('sl-bet'), { label: 'Mise par tour', initial: 5, max: betLimit('slots') });
  const HTML = {
    cerise: '🍒', citron: '🍋', cloche: '🔔', etoile: '⭐', diamant: '💎',
    bar: '<span class="sym-bar">BAR</span>', sept: '<span class="sym-7">7</span>',
  };
  const NAMES = { cerise: 'Cerises', citron: 'Citrons', cloche: 'Cloches', etoile: 'Étoiles', diamant: 'Diamants', bar: 'BAR', sept: 'Sept' };
  const msg = (t, c = '') => { els.msg.textContent = t; els.msg.className = 'msg ' + c; };
  const symbols = () => (App.host ? E.symbols(App.host) : CONFIG.games.slots.symbols);
  const fxSym = () => RNG.fx.weighted(symbols()).id; // symboles de remplissage purement décoratifs

  const reels = [0, 1, 2].map(() => {
    const el = Util.el('div', 'reel'), strip = Util.el('div', 'strip');
    el.appendChild(strip); els.reels.appendChild(el);
    return { el, strip, syms: ['citron', 'cloche', 'etoile'] };
  });
  const symEl = id => { const d = Util.el('div', 'sym sym-' + id); d.innerHTML = HTML[id] || id; return d; };
  function drawStatic() {
    reels.forEach(R => { R.strip.style.transition = 'none'; R.strip.style.transform = 'translateY(0)'; R.strip.innerHTML = ''; R.syms.forEach(id => R.strip.appendChild(symEl(id))); });
  }
  function paytable() {
    const C = CONFIG.games.slots, s = symbols();
    const wild = App.host ? App.host.query('slots.wild', { wild: null, ratio: 1, sources: [] }) : { wild: null };
    els.pay.innerHTML = '<tr><th>Ligne</th><th>Gain</th></tr>' + s.map(x => `<tr><td>${HTML[x.id]} ${HTML[x.id]} ${HTML[x.id]}</td><td>×${x.pay}</td></tr>`).join('') +
      (s.some(x => x.id === 'diamant') ? `<tr><td>💎 💎 + autre</td><td>×${C.twoDiamonds}</td></tr><tr><td>💎 + autres</td><td>×${String(C.oneDiamond).replace('.', ',')}</td></tr>` : '') +
      `<tr><td>🍒 🍒 + autre</td><td>×${C.twoCherries}</td></tr>` +
      (wild.wild ? `<tr><td colspan="2" class="wild-note">🍒 joker : complète une ligne (gain × ${String(wild.ratio).replace('.', ',')})</td></tr>` : '');
  }

  async function animate(final) {
    els.lever.classList.remove('pull'); void els.lever.offsetWidth; els.lever.classList.add('pull');
    els.lights.classList.add('chase');
    const h = reels[0].el.clientHeight / 3 || 80;
    const stops = reels.map((R, i) => new Promise(res => {
      const seq = [...R.syms];
      for (let k = 0; k < 16 + i * 7; k++) seq.push(fxSym());
      seq.push(fxSym(), final[i], fxSym());
      R.strip.style.transition = 'none'; R.strip.style.transform = 'translateY(0)';
      R.strip.innerHTML = ''; seq.forEach(id => R.strip.appendChild(symEl(id)));
      R.syms = seq.slice(-3);
      void R.strip.offsetWidth;
      const dur = 900 + i * 450;
      R.strip.style.transition = `transform ${dur}ms cubic-bezier(.15,.65,.25,1.04)`;
      R.strip.style.transform = `translateY(${-(seq.length - 3) * h}px)`;
      R.el.classList.add('spinning');
      setTimeout(() => { R.el.classList.remove('spinning'); Sfx.play('reelstop'); res(); }, dur);
    }));
    let ticking = true;
    (async () => { while (ticking) { Sfx.play('tick'); await Util.sleep(70); } })();
    await Promise.all(stops);
    ticking = false;
    els.lights.classList.remove('chase');
    drawStatic();
  }
  const describe = text => text.replace(/(\d) × (\w+)/, (m, n, id) => `${n} ${NAMES[id] || id}`);

  async function after(res, spin = true) {
    const r = res.round;
    if (spin) await animate(r.line);
    if (!res.settlement) {
      msg('Perdu… une relance est possible.', 'warn');
      return engineActions(els.actions, App.host.actions(), act);
    }
    const st = res.settlement;
    const ev = r.eval;
    els.reels.classList.toggle('winning', ev.x > 0);
    if (st.net > 0) {
      msg(`${describe(ev.text)} — +${Util.fmt(st.net)} jetons !`, 'win');
      els.win.textContent = `+${Util.fmt(st.net)}`; els.win.className = 'sl-win show';
      Sfx.play(ev.x >= 25 ? 'bigwin' : 'win');
    } else if (st.net < 0) { msg(ev.x > 0 ? `${describe(ev.text)} — ${Util.fmt(st.baseBack)} rendus` : 'Rien cette fois…', 'lose'); Sfx.play('lose'); }
    else { msg(ev.text ? describe(ev.text) : 'Mise rendue', 'push'); }
    await App.showSettlement(st);
    bet.setEnabled(true);
    idle();
  }
  const run = fn => App.animate(fn);
  function spin() {
    return run(async () => {
      const res = App.host.startPlay('slots', { bet: bet.value });
      if (res.error) { Sfx.play('error'); return msg(res.error, 'warn'); }
      App.syncBalance();
      bet.setEnabled(false);
      msg(''); els.win.className = 'sl-win'; els.reels.classList.remove('winning');
      setActions(els.actions, []);
      await after(res);
    });
  }
  function act(id) {
    return run(async () => {
      const res = App.host.act(id);
      if (res.error) return idle();
      setActions(els.actions, []);
      await after(res, id === 'reroll');
    });
  }
  function idle() { setActions(els.actions, [['Lancer', spin, { cls: 'primary' }]]); }
  els.lever.onclick = () => { const b = els.actions.querySelector('button.primary:not([disabled])'); if (b) b.click(); };
  drawStatic();
  App.on('change', paytable);
  return {
    id: 'slots',
    reset() { bet.setEnabled(true); bet.refresh(); paytable(); idle(); msg(''); },
    refresh() { bet.refresh(); paytable(); },
  };
})());

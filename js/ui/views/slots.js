// Vue Machine à sous « Les Chats des Toits » : rouleaux animés, lignes gagnantes,
// tours gratuits avec wilds collants. Le résultat vient entièrement du moteur.
App.register((() => {
  const $ = id => document.getElementById(id);
  const E = Games.get('slots');
  const C = CONFIG.games.slots;
  const els = { grid: $('sl-reels'), lines: $('sl-lines'), actions: $('sl-actions'), msg: $('sl-msg'), pay: $('sl-paytable'), win: $('sl-win'), fs: $('sl-fs'), lights: $('sl-lights') };
  const bet = new BetControl($('sl-bet'), { label: 'Mise', initial: 20, max: betLimit('slots') });
  const msg = (t, c = '') => { els.msg.textContent = iconMsg(t, c); els.msg.className = 'msg ' + c; };
  const symbols = () => (App.host ? E.symbols(App.host) : C.symbols);
  const pool = () => [...symbols(), C.wild, C.scatter];
  const fxSym = () => RNG.fx.weighted(pool()).id; // remplissage purement décoratif
  const ROWS = C.rows;

  // Rouleaux
  const reels = Array.from({ length: C.reels }, (_, x) => {
    const el = Util.el('div', 'reel'), strip = Util.el('div', 'strip');
    el.appendChild(strip); els.grid.appendChild(el);
    return { el, strip, cells: [{ id: 'roi' }, { id: 'chatnoir' }, { id: 'as' }].map((c, y) => ({ id: [['roi', 'chatnoir', 'as'], ['dame', 'siamois', 'dix'], ['as', 'persan', 'valet'], ['dix', 'tigre', 'roi'], ['valet', 'sept', 'dame']][x][y] })) };
  });
  const cellEl = c => {
    const d = Util.el('div', 'sym sym-' + c.id);
    d.innerHTML = SlotArt.svg(c.id) + (c.m ? `<b class="wmult">×${c.m}</b>` : '');
    return d;
  };
  function drawStatic(sticky = {}) {
    reels.forEach((R, x) => {
      R.strip.style.transition = 'none'; R.strip.style.transform = 'translateY(0)';
      R.strip.innerHTML = '';
      R.cells.forEach((c, y) => { const d = cellEl(c); if (sticky[x + ':' + y]) d.classList.add('sticky'); R.strip.appendChild(d); });
    });
  }
  function paytable() {
    const lb = bet.value / C.lines.length;
    const row = (id, pay) => `<tr><td class="pt-sym">${SlotArt.svg(id)}</td><td>${pay.map(p => Util.fmt(Math.round(p * lb * 100) / 100)).join(' · ')}</td></tr>`;
    const wild = App.host ? App.host.query('slots.wild', { wild: null, ratio: 1, sources: [] }) : { wild: null };
    els.pay.innerHTML = `<p class="hint">Gains pour 3 · 4 · 5 symboles alignés de gauche à droite, avec la mise actuelle (${Util.fmt(bet.value)}).</p>
      <table class="paytable">${symbols().slice().reverse().map(s => row(s.id, s.pay)).join('')}</table>
      <div class="pt-special"><div class="pt-sym">${SlotArt.svg('palace')}</div><p><b>Carton (Wild)</b> — rouleaux 2 à 4, remplace tous les symboles sauf le Bonus et multiplie le gain de la ligne par ×2 ou ×3.</p></div>
      <div class="pt-special"><div class="pt-sym">${SlotArt.svg('pelote')}</div><p><b>Pelote (Bonus)</b> — rouleaux 1, 3 et 5. ${C.scatter.min} pelotes = <b>${C.scatter.spins} tours gratuits</b> : chaque Wild qui apparaît reste collé jusqu'à la fin.</p></div>
      ${wild.wild ? `<p class="wild-note">🍒 Triple Cerise : les cerises remplacent n'importe quel symbole (ligne complétée payée × ${String(wild.ratio).replace('.', ',')}).</p>` : ''}`;
  }

  // Lancer animé jusqu'à la grille donnée
  async function spinTo(g, sticky = {}) {
    els.lines.innerHTML = '';
    els.grid.querySelectorAll('.win').forEach(c => c.classList.remove('win'));
    els.lights.classList.add('chase');
    const h = reels[0].el.clientHeight / ROWS || 76;
    const stops = reels.map((R, x) => new Promise(res => {
      const seq = [...R.cells];
      const n = 10 + x * 4;
      for (let k = 0; k < n; k++) seq.push({ id: fxSym() });
      g[x].forEach(c => seq.push(c));
      R.strip.style.transition = 'none'; R.strip.style.transform = 'translateY(0)';
      R.strip.innerHTML = '';
      seq.forEach((c, i) => { const d = cellEl(c); if (i >= seq.length - ROWS && sticky[x + ':' + (i - seq.length + ROWS)]) d.classList.add('sticky'); R.strip.appendChild(d); });
      R.cells = g[x];
      void R.strip.offsetWidth;
      const dur = Util.dur(650 + x * 230);
      R.strip.style.transition = `transform ${dur}ms cubic-bezier(.15,.65,.25,1.04)`;
      R.strip.style.transform = `translateY(${-(seq.length - ROWS) * h}px)`;
      R.el.classList.add('spinning');
      setTimeout(() => { R.el.classList.remove('spinning'); Sfx.play('reelstop'); res(); }, dur);
    }));
    let ticking = true;
    (async () => { while (ticking) { Sfx.play('tick'); await Util.sleep(70); } })();
    await Promise.all(stops);
    ticking = false;
    els.lights.classList.remove('chase');
    drawStatic(sticky);
  }
  // Lignes gagnantes : tracées puis mises en avant une par une
  async function showWins(spin) {
    if (!spin.wins.length) return;
    const W = els.grid.clientWidth, Hh = els.grid.clientHeight;
    els.lines.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
    const cw = W / C.reels, ch = Hh / ROWS;
    const colors = ['#F2D675', '#ff6b6b', '#7fe0a8', '#9cc2ff', '#e3b8ff'];
    els.lines.innerHTML = spin.wins.map((w, i) => {
      const pts = C.lines[w.line].map((row, x) => `${(x + 0.5) * cw},${(row + 0.5) * ch}`).join(' ');
      return `<polyline points="${pts}" class="wl" style="--c:${colors[i % colors.length]};animation-delay:${i * 60}ms"/>`;
    }).join('');
    spin.wins.forEach(w => w.cells.forEach(([x, y]) => { const c = reels[x].strip.children[y]; if (c) c.classList.add('win'); }));
    Sfx.play(spin.total >= bet.value * 5 ? 'bigwin' : 'win');
    els.win.textContent = `+${Util.fmt(spin.total)}`;
    els.win.className = 'sl-win show';
    await Util.sleep(900);
  }

  async function play(r) {
    const spins = r.spins;
    const sticky = {};
    await spinTo(spins[0].grid);
    await showWins(spins[0]);
    if (spins.length > 1) {
      // Tours gratuits
      spins[0].grid.forEach((col, x) => col.forEach((c, y) => { if (c.id === C.wild.id) sticky[x + ':' + y] = true; }));
      els.fs.hidden = false;
      els.fs.innerHTML = `🧶 ${C.scatter.min} Pelotes ! <b>${spins.length - 1} tours gratuits</b>`;
      els.fs.className = 'fs-banner pop';
      Sfx.play('fanfare');
      await Util.sleep(1300);
      let acc = spins[0].total;
      for (let k = 1; k < spins.length; k++) {
        els.fs.innerHTML = `Tour gratuit <b>${k} / ${spins.length - 1}</b> · gains <b>${Util.fmt(Math.round(acc * 100) / 100)}</b>`;
        await spinTo(spins[k].grid, sticky);
        spins[k].grid.forEach((col, x) => col.forEach((c, y) => { if (c.id === C.wild.id) sticky[x + ':' + y] = true; }));
        drawStatic(sticky);
        await showWins(spins[k]);
        acc += spins[k].total;
      }
      els.fs.innerHTML = `Tours gratuits terminés · <b>${Util.fmt(Math.round(acc * 100) / 100)}</b> gagnés`;
      await Util.sleep(900);
    }
  }

  async function after(res, animate = true) {
    const r = res.round;
    if (animate) await play(r);
    if (!res.settlement) {
      msg('✗ Perdu… une relance est possible.', 'warn');
      return engineActions(els.actions, App.host.actions(), act);
    }
    const st = res.settlement;
    if (st.net > 0) msg(`✓ +${Util.fmt(st.net)} jetons !`, 'win');
    else if (st.net < 0) { msg(r.total > 0 ? `✗ ${Util.fmt(r.total)} récupérés sur ${Util.fmt(r.bet)}` : '✗ Rien cette fois…', 'lose'); Sfx.play('lose'); }
    else msg('= Mise rendue', 'push');
    await App.showSettlement(st);
    els.fs.hidden = true;
    bet.setEnabled(true);
    idle();
  }
  function spin() {
    return App.animate(async () => {
      const res = App.host.startPlay('slots', { bet: bet.value });
      if (res.error) { Sfx.play('error'); return msg(res.error, 'warn'); }
      App.syncBalance();
      bet.setEnabled(false);
      msg(''); els.win.className = 'sl-win'; els.fs.hidden = true;
      setActions(els.actions, []);
      await after(res);
    });
  }
  function act(id) {
    return App.animate(async () => {
      const res = App.host.act(id);
      if (res.error) return idle();
      setActions(els.actions, []);
      await after(res, id === 'reroll');
    });
  }
  function idle() { setActions(els.actions, [['Lancer', spin, { cls: 'primary big' }]]); }
  drawStatic();
  bet.onChange = paytable;
  App.on('change', paytable);
  return {
    id: 'slots',
    reset() { bet.setEnabled(true); bet.refresh(); paytable(); idle(); msg(''); els.fs.hidden = true; els.lines.innerHTML = ''; },
    refresh() { bet.refresh(); paytable(); },
  };
})());

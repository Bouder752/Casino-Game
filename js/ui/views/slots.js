// Vue Machine à sous « Les Chats des Toits » : rouleaux animés avec arrêt rapide,
// suspense quand les Pelotes tombent, wilds collés figés pendant les tours gratuits,
// lignes gagnantes une par une, écrans d'entrée et de fin du bonus.
// Le résultat vient entièrement du moteur : la vue ne fait que le raconter.
App.register((() => {
  const $ = id => document.getElementById(id);
  const E = Games.get('slots');
  const C = CONFIG.games.slots;
  const els = {
    grid: $('sl-reels'), lines: $('sl-lines'), actions: $('sl-actions'), msg: $('sl-msg'), pay: $('sl-paytable'), win: $('sl-win'),
    fs: $('sl-fs'), lights: $('sl-lights'), sticky: $('sl-sticky'), intro: $('sl-intro'), palace: document.querySelector('#slots .palace'),
    ledBet: $('sl-led-bet'), ledWin: $('sl-led-win'), ledLabel: $('sl-led-label'),
  };
  const bet = new BetControl($('sl-bet'), { label: 'Mise', initial: 20, max: betLimit('slots') });
  const msg = (t, c = '') => { els.msg.textContent = iconMsg(t, c); els.msg.className = 'msg ' + c; };
  const symbols = () => (App.host ? E.symbols(App.host) : C.symbols);
  const pool = () => [...symbols(), C.wild, C.scatter];
  const fxSym = () => RNG.fx.weighted(pool()).id; // remplissage purement décoratif
  const ROWS = C.rows;
  const NAME = id => SlotArt.NAMES[id] || id;
  let quick = false;         // arrêt rapide demandé
  let skip = false;          // passer la présentation des lignes

  // Rouleaux
  const reels = Array.from({ length: C.reels }, (_, x) => {
    const el = Util.el('div', 'reel'), strip = Util.el('div', 'strip');
    el.appendChild(strip); els.grid.appendChild(el);
    return { el, strip, cells: [['roi', 'chatnoir', 'as'], ['dame', 'siamois', 'dix'], ['as', 'persan', 'valet'], ['dix', 'tigre', 'roi'], ['valet', 'sept', 'dame']][x].map(id => ({ id })) };
  });
  const cellEl = c => {
    const d = Util.el('div', 'sym sym-' + c.id);
    d.innerHTML = SlotArt.svg(c.id) + (c.m ? `<b class="wmult">×${c.m}</b>` : '');
    return d;
  };
  function drawStatic() {
    reels.forEach(R => {
      R.strip.style.transition = 'none'; R.strip.style.transform = 'translateY(0)';
      R.strip.innerHTML = '';
      R.cells.forEach(c => R.strip.appendChild(cellEl(c)));
    });
  }
  // Wilds collés : un calque fixe au-dessus des rouleaux (ils ne défilent pas)
  function drawSticky(sticky) {
    els.sticky.innerHTML = '';
    Object.entries(sticky).forEach(([k, c]) => {
      const [x, y] = k.split(':').map(Number);
      const d = cellEl(c);
      d.classList.add('sticky');
      d.style.left = `calc(${x} * (var(--sym) + var(--gap)))`;
      d.style.top = `calc(${y} * var(--sym))`;
      els.sticky.appendChild(d);
    });
  }
  function led(win = null, label = 'Gain') {
    els.ledBet.textContent = Util.fmt(bet.value);
    els.ledLabel.textContent = label;
    els.ledWin.textContent = win == null ? '—' : Util.fmt(win);
  }
  function paytable() {
    const lb = bet.value / C.lines.length;
    const row = (id, pay) => `<tr><td class="pt-sym">${SlotArt.svg(id)}</td><td>${pay.map(p => Util.fmt(Math.round(p * lb * 100) / 100)).join(' · ')}</td></tr>`;
    const wild = App.host ? App.host.query('slots.wild', { wild: null, ratio: 1, sources: [] }) : { wild: null };
    els.pay.innerHTML = `<p class="hint">Gains pour 3 · 4 · 5 symboles alignés de gauche à droite, avec la mise actuelle (${Util.fmt(bet.value)}).</p>
      <table class="paytable">${symbols().slice().reverse().map(s => row(s.id, s.pay)).join('')}</table>
      <div class="pt-special"><div class="pt-sym">${SlotArt.svg('palace')}</div><p><b>Carton (Wild)</b> — rouleaux 2 à 4, remplace tous les symboles sauf la Pelote et multiplie le gain de la ligne par ×2 ou ×3.</p></div>
      <div class="pt-special"><div class="pt-sym">${SlotArt.svg('pelote')}</div><p><b>Pelote (Bonus)</b> — une par rouleau au plus, paie n'importe où : 3 = ×${C.scatter.pay[0]}, 4 = ×${C.scatter.pay[1]}, 5 = ×${C.scatter.pay[2]} la mise. 3 Pelotes = <b>${C.scatter.spins} tours gratuits</b> : chaque Carton reste collé jusqu'à la fin, et 3 Pelotes pendant le bonus ajoutent ${C.scatter.retrigger} tours.</p></div>
      ${wild.wild ? `<p class="wild-note">🍒 Triple Cerise : les cerises remplacent n'importe quel symbole (ligne complétée payée × ${String(wild.ratio).replace('.', ',')}).</p>` : ''}`;
  }

  // Lancer animé jusqu'à la grille donnée, avec suspense dès 2 Pelotes posées
  async function spinTo(g, sticky = {}) {
    els.lines.innerHTML = '';
    els.grid.classList.remove('has-wins');
    els.grid.querySelectorAll('.win').forEach(c => c.classList.remove('win'));
    els.lights.classList.add('chase');
    const h = reels[0].el.clientHeight / ROWS || 76;
    // nombre de Pelotes posées avant chaque rouleau → rouleaux suivants plus lents
    let seen = 0, extra = 0;
    const plan = g.map((col, x) => {
      const antic = seen >= C.scatter.min - 1 && x > 0;
      if (antic) extra += Util.dur(1100);
      const dur = Util.dur(520 + x * 170) + extra;
      seen += col.some(c => c.id === C.scatter.id) ? 1 : 0;
      return { dur, antic, scatter: col.some(c => c.id === C.scatter.id) };
    });
    const t0 = performance.now();
    let landed = 0;
    const stops = reels.map((R, x) => new Promise(res => {
      const seq = [...R.cells];
      const n = 10 + x * 4 + (plan[x].antic ? 12 : 0);
      for (let k = 0; k < n; k++) seq.push({ id: fxSym() });
      g[x].forEach(c => seq.push(c));
      R.strip.style.transition = 'none'; R.strip.style.transform = 'translateY(0)';
      R.strip.innerHTML = '';
      seq.forEach(c => R.strip.appendChild(cellEl(c)));
      R.cells = g[x];
      void R.strip.offsetWidth;
      R.el.classList.add('spinning');
      const finish = () => {
        if (R.done) return;
        R.done = true;
        R.strip.style.transition = `transform ${quick ? 120 : 260}ms cubic-bezier(.2,1.6,.4,1)`;
        R.strip.style.transform = `translateY(${-(seq.length - ROWS) * h}px)`;
        setTimeout(() => {
          R.el.classList.remove('spinning', 'antic');
          R.el.classList.add('stopped');
          setTimeout(() => R.el.classList.remove('stopped'), 300);
          Sfx.play('stopn', x);
          if (plan[x].scatter) { landed++; Sfx.play('scatter', landed); R.el.classList.add('has-scatter'); }
          res();
        }, quick ? 110 : 250);
      };
      R.done = false;
      // défilement continu puis arrêt avec rebond
      R.strip.style.transition = `transform ${plan[x].dur}ms cubic-bezier(.35,.1,.6,1)`;
      R.strip.style.transform = `translateY(${-(seq.length - ROWS - 1) * h}px)`;
      R.finish = finish;
      const wait = () => {
        if (R.done) return;
        const t = performance.now() - t0;
        if (plan[x].antic && !R.el.classList.contains('antic') && t > plan[x].dur - Util.dur(1300) && !quick) {
          R.el.classList.add('antic'); els.palace.classList.add('tense'); Sfx.play('antic');
        }
        if (quick || t >= plan[x].dur) finish(); else requestAnimationFrame(wait);
      };
      requestAnimationFrame(wait);
    }));
    let ticking = true;
    (async () => { while (ticking) { Sfx.play('tick'); await Util.sleep(90); } })();
    await Promise.all(stops);
    ticking = false;
    els.palace.classList.remove('tense');
    reels.forEach(R => R.el.classList.remove('has-scatter'));
    els.lights.classList.remove('chase');
    drawStatic();
    drawSticky(sticky);
  }

  // Lignes gagnantes : toutes ensemble, puis une par une avec leur montant
  async function showWins(spin, stake, label = 'Gain') {
    if (!spin.wins.length) { led(spin.total ? spin.total : null, label); return; }
    const W = els.grid.clientWidth, Hh = els.grid.clientHeight;
    els.lines.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
    const cw = W / C.reels, ch = Hh / ROWS;
    const colors = ['#ffd23f', '#ff5c8a', '#4fe08a', '#4fb6ff', '#c084fc', '#ff9d1f'];
    const lineSvg = (w, i) => {
      if (w.scatter) return '';
      const pts = w.cells.map(([x, y]) => `${(x + 0.5) * cw},${(y + 0.5) * ch}`).join(' ');
      return `<polyline points="${pts}" class="wl" style="--c:${colors[i % colors.length]}"/>`;
    };
    const mark = cells => {
      els.grid.querySelectorAll('.win').forEach(c => c.classList.remove('win'));
      els.sticky.querySelectorAll('.win').forEach(c => c.classList.remove('win'));
      cells.forEach(([x, y]) => {
        const c = reels[x].strip.children[y]; if (c) c.classList.add('win');
        [...els.sticky.children].forEach(s => { if (s.style.left.includes(`calc(${x} *`) && s.style.top.includes(`calc(${y} *`)) s.classList.add('win'); });
      });
    };
    els.grid.classList.add('has-wins');
    els.lines.innerHTML = spin.wins.map(lineSvg).join('');
    mark(spin.wins.flatMap(w => w.cells));
    const under = spin.total < stake;
    Sfx.play(under ? 'push' : spin.total >= stake * 5 ? 'bigwin' : 'win');
    led(spin.total, label);
    els.win.textContent = under ? `${Util.fmt(spin.total)} récupérés` : `+${Util.fmt(spin.total)}`;
    els.win.className = 'sl-win show' + (under ? ' under' : '');
    await Util.sleep(700);
    if (spin.wins.length > 1 && !quick && !skip) {
      for (const [i, w] of spin.wins.slice(0, 6).entries()) {
        if (skip) break;
        els.lines.innerHTML = lineSvg(w, i);
        mark(w.cells);
        els.win.className = 'sl-win line';
        els.win.textContent = w.scatter ? `${w.count} Pelotes · ${Util.fmt(w.win)}` : `${w.count}× ${NAME(w.symbol)}${w.mult > 1 ? ` ×${w.mult}` : ''} · ${Util.fmt(w.win)}`;
        Sfx.play('chip');
        await Util.sleep(520);
      }
      els.lines.innerHTML = spin.wins.map(lineSvg).join('');
      mark(spin.wins.flatMap(w => w.cells));
      els.win.textContent = under ? `${Util.fmt(spin.total)} récupérés` : `+${Util.fmt(spin.total)}`;
      els.win.className = 'sl-win show' + (under ? ' under' : '');
      await Util.sleep(400);
    }
  }

  // Écran plein de la machine (entrée / fin du bonus) ; un clic le passe
  function splash(html, ms, cls = '') {
    return new Promise(res => {
      els.intro.innerHTML = html;
      els.intro.className = 'sl-intro ' + cls;
      els.intro.hidden = false;
      let t;
      const done = () => { clearTimeout(t); els.intro.hidden = true; els.intro.onclick = null; res(); };
      els.intro.onclick = done;
      t = setTimeout(done, Util.dur(ms));
    });
  }
  // Compteur qui défile jusqu'à une valeur
  function countUp(node, to, ms) {
    return new Promise(res => {
      const t0 = performance.now(), d = Util.dur(ms);
      const step = t => {
        const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3);
        node.textContent = Util.fmt(Math.round(to * e * 100) / 100);
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  async function play(r) {
    const spins = r.spins;
    const sticky = {};
    drawSticky({});
    led(null);
    await spinTo(spins[0].grid);
    await showWins(spins[0], r.bet);
    if (spins.length <= 1) return;
    // ---- Tours gratuits ----
    const stick = g => g.forEach((col, x) => col.forEach((c, y) => { if (c.id === C.wild.id && !sticky[x + ':' + y]) sticky[x + ':' + y] = { id: c.id, m: c.m }; }));
    stick(spins[0].grid);
    Sfx.play('fanfare');
    await splash(`<div class="sli-k">${spins[0].scatters} Pelotes !</div><div class="sli-big">${C.scatter.spins}</div><div class="sli-t">tours gratuits</div><div class="sli-s">Les Cartons restent collés jusqu'à la fin</div><div class="sli-tap">Touchez pour commencer</div>`, 2600, 'in');
    els.palace.classList.add('bonus');
    let acc = spins[0].total, total = spins.length - 1;
    els.fs.hidden = false;
    drawSticky(sticky);
    for (let k = 1; k < spins.length; k++) {
      els.fs.innerHTML = `Tour gratuit <b>${k} / ${total}</b><span>Gain du bonus <b>${Util.fmt(Math.round(acc * 100) / 100)}</b></span>`;
      els.win.className = 'sl-win';
      await spinTo(spins[k].grid, sticky);
      const before = Object.keys(sticky).length;
      stick(spins[k].grid);
      if (Object.keys(sticky).length > before) { Sfx.play('joker'); drawSticky(sticky); els.sticky.classList.remove('clack'); void els.sticky.offsetWidth; els.sticky.classList.add('clack'); }
      await showWins(spins[k], r.bet, 'Gain bonus');
      acc += spins[k].total;
      led(Math.round(acc * 100) / 100, 'Gain bonus');
      if (spins[k].retrigger) {
        Sfx.play('fanfare');
        await splash(`<div class="sli-big">+${spins[k].retrigger}</div><div class="sli-t">tours gratuits</div>`, 1400, 'in small');
      }
    }
    acc = Math.round(acc * 100) / 100;
    els.fs.hidden = true;
    const p = splash(`<div class="sli-k">Bonus terminé</div><div class="sli-big" id="sl-total">0</div><div class="sli-t">${(acc / r.bet).toFixed(1).replace('.', ',')} × la mise</div>`, 3000, 'out');
    await countUp($('sl-total'), acc, 1600);
    Sfx.play(acc >= r.bet ? 'bigwin' : 'push');
    await p;
    els.palace.classList.remove('bonus');
    drawSticky({});
  }

  async function after(res, animate = true) {
    const r = res.round;
    quick = false; skip = false;
    if (animate) {
      setActions(els.actions, [['Stop', () => { quick = true; skip = true; reels.forEach(R => R.finish && R.finish()); }, { cls: 'stop' }]]);
      await play(r);
      setActions(els.actions, []);
    }
    if (!res.settlement) {
      msg(r.total > 0 ? `${Util.fmt(r.total)} récupérés sur ${Util.fmt(r.bet)} : une relance est possible.` : 'Rien cette fois… une relance est possible.', 'warn');
      return engineActions(els.actions, App.host.actions(), act);
    }
    const st = res.settlement;
    if (st.net > 0) msg(`+${Util.fmt(st.net)} jetons !`, 'win');
    else if (st.net < 0) { msg(r.total > 0 ? `${Util.fmt(r.total)} récupérés sur ${Util.fmt(r.bet)}` : 'Rien cette fois…', 'lose'); if (!r.total) Sfx.play('lose'); }
    else msg('Mise rendue', 'push');
    await App.showSettlement(st);
    els.fs.hidden = true;
    bet.setEnabled(true);
    idle();
  }
  function spin() {
    return App.animate(async () => {
      const res = App.host.startPlay('slots', { bet: bet.value });
      if (res.error) { Sfx.play('error'); return msg(res.error, 'warn'); }
      App.syncStake(res);
      bet.setEnabled(false);
      msg(''); els.win.className = 'sl-win'; els.fs.hidden = true;
      await after(res);
    });
  }
  function act(id) {
    return App.animate(async () => {
      const res = App.host.act(id);
      if (res.error) return idle();
      setActions(els.actions, []);
      if (id === 'reroll') App.syncStake(res);
      await after(res, id === 'reroll');
    });
  }
  function idle() { setActions(els.actions, [['Lancer', spin, { cls: 'primary big' }]]); }
  drawStatic();
  bet.onChange = () => { paytable(); led(null); };
  App.on('change', paytable);
  return {
    id: 'slots',
    reset() { bet.setEnabled(true); bet.refresh(); paytable(); idle(); led(null); msg(''); els.fs.hidden = true; els.lines.innerHTML = ''; drawSticky({}); els.palace.classList.remove('bonus', 'tense'); },
    refresh() { bet.refresh(); paytable(); },
  };
})());

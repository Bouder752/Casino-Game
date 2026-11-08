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
    ledBet: $('sl-led-bet'), ledWin: $('sl-led-win'), ledLabel: $('sl-led-label'), ledBal: $('sl-led-bal'),
    buy: $('sl-buy'), buyCost: $('sl-buy-cost'), minus: $('sl-minus'), plus: $('sl-plus'),
  };
  const bet = new BetControl($('sl-bet'), { label: 'Mise', initial: 20, max: betLimit('slots') });
  const msg = (t, c = '') => { els.msg.textContent = iconMsg(t, c); els.msg.className = 'msg ' + c; };
  const symbols = () => (App.host ? E.symbols(App.host) : C.symbols);
  const pool = x => [...symbols(), ...(C.wild.reels.includes(x) ? [C.wild] : []), ...(C.scatter.reels.includes(x) ? [C.scatter] : [])];
  // remplissage purement décoratif, mais honnête : jamais un symbole impossible sur ce rouleau
  const fxSym = x => RNG.fx.weighted(pool(x)).id;
  const ROWS = C.rows;
  const NAME = id => SlotArt.NAMES[id] || id;
  const R = v => Util.fmt(Math.round(v)); // jetons entiers à l'affichage
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
      R.strip.getAnimations().forEach(a => a.cancel());
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
    paintBuy();
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

  // Lancer animé jusqu'à la grille donnée (Web Animations : fluide, sur le compositeur),
  // avec suspense dès 2 Pelotes posées et arrêt rapide
  let anims = [];
  async function spinTo(g, sticky = {}) {
    els.lines.innerHTML = '';
    els.grid.classList.remove('has-wins');
    els.lights.classList.add('chase');
    const h = reels[0].el.clientHeight / ROWS || 76;
    let seen = 0, extra = 0;
    const plan = g.map((col, x) => {
      const antic = seen >= C.scatter.min - 1 && x > 0;
      if (antic) extra += Util.dur(1200);
      const scat = col.some(c => c.id === C.scatter.id);
      const dur = Util.dur(turbo ? 300 + x * 90 : 700 + x * 220) + extra;
      seen += scat ? 1 : 0;
      return { dur, antic, scatter: scat };
    });
    let landed = 0;
    anims = [];
    const stops = reels.map((R, x) => new Promise(res => {
      const seq = [...R.cells];
      const n = 12 + x * 4 + (plan[x].antic ? 14 : 0);
      for (let k = 0; k < n; k++) seq.push({ id: fxSym(x) });
      g[x].forEach(c => seq.push(c));
      R.strip.getAnimations().forEach(a => a.cancel());
      R.strip.style.transform = '';
      R.strip.innerHTML = '';
      const frag = document.createDocumentFragment();
      seq.forEach(c => frag.appendChild(cellEl(c)));
      R.strip.appendChild(frag);
      R.cells = g[x];
      const D = (seq.length - ROWS) * h;
      R.el.classList.add('spinning');
      // départ en arrière (élan), défilement, puis léger dépassement et retour
      const a = R.strip.animate([
        { transform: 'translate3d(0,0,0)', offset: 0 },
        { transform: `translate3d(0,${Math.min(18, h * 0.2)}px,0)`, offset: 0.04, easing: 'ease-in' },
        { transform: `translate3d(0,${-D - h * 0.18}px,0)`, offset: 0.93, easing: 'cubic-bezier(.25,.1,.35,1)' },
        { transform: `translate3d(0,${-D}px,0)`, offset: 1 },
      ], { duration: quick ? Util.dur(260) : plan[x].dur, easing: 'linear', fill: 'forwards' });
      anims.push(a);
      if (plan[x].antic && !quick) setTimeout(() => { if (a.playState === 'running' && !quick) { R.el.classList.add('antic'); els.palace.classList.add('tense'); Sfx.play('antic'); } }, Math.max(0, plan[x].dur - Util.dur(1400)));
      setTimeout(() => R.el.classList.remove('spinning'), Math.max(0, (quick ? Util.dur(260) : plan[x].dur) - Util.dur(240)));
      a.finished.then(() => {
        R.el.classList.remove('spinning', 'antic');
        R.el.classList.add('stopped');
        setTimeout(() => R.el.classList.remove('stopped'), 300);
        Sfx.play('stopn', x);
        if (plan[x].scatter) { landed++; Sfx.play('scatter', landed); R.el.classList.add('has-scatter'); }
        res();
      }, res);
    }));
    let ticking = true;
    (async () => { while (ticking) { Sfx.play('tick'); await Util.sleep(260); } })();
    await Promise.all(stops);
    ticking = false;
    els.palace.classList.remove('tense');
    reels.forEach(R => R.el.classList.remove('has-scatter'));
    els.lights.classList.remove('chase');
    drawStatic();
    drawSticky(sticky);
  }
  // Arrêt rapide : les rouleaux en cours accélèrent jusqu'à leur position finale
  function stopNow() {
    quick = true; skip = true;
    anims.forEach(a => { if (a.playState === 'running') { const left = (a.effect.getTiming().duration - a.currentTime); if (left > 0) a.updatePlaybackRate(Math.max(1, left / Util.dur(220))); } });
  }

  // Lignes gagnantes : toutes ensemble, puis une par une avec leur montant
  async function showWins(spin, stake, label = 'Gain') {
    if (!spin.wins.length) { led(spin.total ? Math.round(spin.total) : null, label); return; }
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
    led(Math.round(spin.total), label);
    els.win.textContent = under ? `${R(spin.total)} récupérés` : `+${R(spin.total)}`;
    els.win.className = 'sl-win show' + (under ? ' under' : '');
    await Util.sleep(700);
    if (spin.wins.length > 1 && !quick && !skip) {
      for (const [i, w] of spin.wins.slice(0, 6).entries()) {
        if (skip) break;
        els.lines.innerHTML = lineSvg(w, i);
        mark(w.cells);
        els.win.className = 'sl-win line';
        els.win.textContent = w.scatter ? `${w.count} Pelotes · ${R(w.win)}` : `${w.count}× ${NAME(w.symbol)}${w.mult > 1 ? ` ×${w.mult}` : ''} · ${R(w.win)}`;
        Sfx.play('chip');
        await Util.sleep(520);
      }
      els.lines.innerHTML = spin.wins.map(lineSvg).join('');
      mark(spin.wins.flatMap(w => w.cells));
      els.win.textContent = under ? `${R(spin.total)} récupérés` : `+${R(spin.total)}`;
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
    if (spins[0].feature) {
      // le chat noir est passé : on montre les Cartons qu'il a semés
      els.palace.classList.add('cat-pass');
      Sfx.play('joker');
      els.win.textContent = '😼 Le chat noir sème des Cartons !';
      els.win.className = 'sl-win line show-feature';
      await Util.sleep(1100);
      els.palace.classList.remove('cat-pass');
    }
    await showWins(spins[0], r.bet);
    if (spins.length <= 1) { if (spins[0].total >= r.bet * 10) auto = 0; return; }
    auto = 0; // un bonus arrête les tours automatiques
    // ---- Tours gratuits ----
    const stick = g => g.forEach((col, x) => col.forEach((c, y) => { if (c.id === C.wild.id && !sticky[x + ':' + y]) sticky[x + ':' + y] = { id: c.id, m: c.m }; }));
    stick(spins[0].grid);
    Sfx.play('fanfare');
    await splash(`<div class="sli-k">${spins[0].scatters} Pelotes !</div><div class="sli-big">${C.scatter.spins}</div><div class="sli-t">tours gratuits</div><div class="sli-s">Les Cartons restent collés jusqu'à la fin</div><div class="sli-tap">Touchez pour commencer</div>`, 2600, 'in');
    els.palace.classList.add('bonus');
    Sfx.music('bonus');
    let acc = spins[0].total, total = spins.length - 1;
    els.fs.hidden = false;
    drawSticky(sticky);
    for (let k = 1; k < spins.length; k++) {
      els.fs.innerHTML = `Tour gratuit <b>${k} / ${total}</b><span>Gain du bonus <b>${Util.fmt(Math.round(acc))}</b></span>`;
      els.win.className = 'sl-win';
      await spinTo(spins[k].grid, sticky);
      const before = Object.keys(sticky).length;
      stick(spins[k].grid);
      if (Object.keys(sticky).length > before) { Sfx.play('joker'); drawSticky(sticky); els.sticky.classList.remove('clack'); void els.sticky.offsetWidth; els.sticky.classList.add('clack'); }
      await showWins(spins[k], r.bet, 'Gain bonus');
      acc += spins[k].total;
      led(Math.round(acc), 'Gain bonus');
      if (spins[k].retrigger) {
        Sfx.play('fanfare');
        await splash(`<div class="sli-big">+${spins[k].retrigger}</div><div class="sli-t">tours gratuits</div>`, 1400, 'in small');
      }
    }
    acc = Math.round(acc * 100) / 100;
    els.fs.hidden = true;
    const paid = r.stake || r.bet;
    const ratio = acc / paid;
    const verdict = r.buy ? `${ratio.toFixed(1).replace('.', ',')} × le prix payé (${Util.fmt(paid)})` : `${(acc / r.bet).toFixed(1).replace('.', ',')} × la mise`;
    const p = splash(`<div class="sli-k">${r.buy && acc < paid ? 'Bonus terminé… pas rentable cette fois' : 'Bonus terminé'}</div><div class="sli-big" id="sl-total">0</div><div class="sli-t">${verdict}</div>`, 3000, 'out' + (acc < paid ? ' meh' : ''));
    await countUp($('sl-total'), Math.round(acc), 1600);
    Sfx.play(acc >= paid ? 'bigwin' : 'push');
    await p;
    els.palace.classList.remove('bonus');
    Sfx.music('normal');
    drawSticky({});
  }

  async function after(res, animate = true) {
    const r = res.round;
    quick = false; skip = false;
    if (animate) {
      setActions(els.actions, [['Stop', () => stopNow(), { cls: 'stop' }]]);
      await play(r);
      setActions(els.actions, []);
    }
    if (!res.settlement) {
      msg(r.total > 0 ? `${Util.fmt(Math.round(r.total))} récupérés sur ${Util.fmt(r.stake || r.bet)} : une relance est possible.` : 'Rien cette fois… une relance est possible.', 'warn');
      return engineActions(els.actions, App.host.actions(), act);
    }
    const st = res.settlement;
    if (st.net > 0) msg(`+${Util.fmt(st.net)} jetons !`, 'win');
    else if (st.net < 0) { msg(r.total > 0 ? `${Util.fmt(Math.round(r.total))} récupérés sur ${Util.fmt(r.stake || r.bet)}` : 'Rien cette fois…', 'lose'); if (!r.total) Sfx.play('lose'); }
    else msg('Mise rendue', 'push');
    await App.showSettlement(st);
    els.fs.hidden = true;
    bet.setEnabled(true);
    idle();
  }
  function spin(buy = false) {
    return App.animate(async () => {
      const res = App.host.startPlay('slots', buy ? { bet: bet.value, buy: true } : { bet: bet.value });
      if (res.error) { Sfx.play('error'); return msg(res.error, 'warn'); }
      App.syncStake(res);
      bet.setEnabled(false); setBusy(true);
      msg(''); els.win.className = 'sl-win'; els.fs.hidden = true;
      if (buy) { Sfx.play('fanfare'); }
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
  function idle() {
    setActions(els.actions, [['Lancer', () => spin(), { cls: 'primary big' }]]); setBusy(false);
    // tours automatiques : on enchaîne tant qu'il en reste (arrêt sur un bonus ou un gros gain)
    // arrêt automatique si la bankroll a fondu de moitié depuis le début de la série
    if (auto > 0 && App.host.chips() < autoStart * 0.5) { auto = 0; paintAuto(); announce('Tours automatiques arrêtés : la moitié des jetons est partie.'); }
    if (auto > 0) { auto--; paintAuto(); announce(`Tours automatiques : encore ${auto + 1}.`); setTimeout(() => { if (auto >= 0 && document.querySelector('#slots:not([hidden])') && !App.host.busy()) spin(); }, Util.dur(350)); }
  }
  let auto = 0, autoStart = 0;
  const announce = t => { els.msg.setAttribute('aria-live', 'polite'); els.msg.textContent = t; };
  // Échap ou la touche A arrêtent les tours automatiques à tout moment
  document.addEventListener('keydown', e => { if (auto > 0 && (e.key === 'Escape' || e.key.toLowerCase() === 'a')) { auto = 0; paintAuto(); announce('Tours automatiques arrêtés.'); } });
  const autoBtn = document.getElementById('sl-auto'), turboBtn = document.getElementById('sl-turbo');
  const paintAuto = () => { autoBtn.classList.toggle('on', auto > 0); autoBtn.querySelector('b').textContent = auto > 0 ? auto : '10'; };
  autoBtn.onclick = () => { Sfx.play('click'); auto = auto > 0 ? 0 : 10; autoStart = App.host.chips(); paintAuto(); if (auto > 0 && !App.host.busy()) { auto--; paintAuto(); spin(); } };
  let turbo = Storage.get('boubouzino.turbo', false);
  const paintTurbo = () => { turboBtn.classList.toggle('on', turbo); turboBtn.setAttribute('aria-pressed', String(turbo)); };
  turboBtn.onclick = () => { turbo = !turbo; Storage.set('boubouzino.turbo', turbo); paintTurbo(); Sfx.play('click'); };
  paintTurbo();
  function setBusy(b) { els.buy.disabled = b; els.minus.disabled = b; els.plus.disabled = b; els.palace.classList.toggle('playing', b); }

  // ---- Panneau de commande : mise −/+ par paliers, achat du bonus, solde ----
  const LADDER = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500, 600, 800];
  const ladder = () => { const out = []; for (let m = 1; m <= 1e9; m *= 1000) LADDER.forEach(v => out.push(v * m)); return out; };
  function step(dir) {
    const lo = App.host ? App.host.minBet() : 1, hi = bet.maxFn();
    const vals = ladder().filter(v => v >= lo && v <= hi);
    if (!vals.length) return;
    const cur = bet.value;
    const next = dir > 0 ? vals.find(v => v > cur + 1e-9) : vals.slice().reverse().find(v => v < cur - 1e-9);
    bet.set(next != null ? next : dir > 0 ? vals[vals.length - 1] : vals[0]);
    Sfx.play('chip');
  }
  els.minus.onclick = () => step(-1);
  els.plus.onclick = () => step(1);
  function paintBuy() {
    if (!App.host) return;
    const q = E.buyQuote(App.host, bet.value || 1);
    els.buyCost.innerHTML = `<span class="wallet-chip s"></span> ${Util.fmt(q.cost)}`;
    els.buy.classList.toggle('off', !q.ok);
  }
  els.buy.onclick = () => {
    if (!App.host || App.host.busy()) return;
    const q = E.buyQuote(App.host, bet.value || 1);
    Sfx.play('click');
    if (!q.ok) { Sfx.play('error'); return msg(q.cost < App.host.minBet() ? `Monte la mise : le bonus doit coûter au moins ${Util.fmt(App.host.minBet())}.` : `Il te faut ${Util.fmt(q.cost)} jetons pour acheter le bonus.`, 'warn'); }
    UI.confirm(`<h2>Acheter le bonus ?</h2><p class="center"><b>${C.scatter.spins} tours gratuits</b> avec des Cartons collants, à <b>${Util.fmt(q.bet)}</b> par tour.</p><p class="center buy-price">Prix : <span class="wallet-chip s"></span> <b>${Util.fmt(q.cost)}</b></p>`, 'Acheter', () => spin(true));
  };
  App.on('balance', v => { els.ledBal.textContent = Util.fmt(Math.round(v)); });
  drawStatic();
  bet.onChange = () => { paytable(); led(null); };
  App.on('change', paytable);
  return {
    id: 'slots',
    reset() { bet.setEnabled(true); bet.refresh(); paytable(); idle(); led(null); msg(''); els.fs.hidden = true; els.lines.innerHTML = ''; drawSticky({}); els.palace.classList.remove('bonus', 'tense'); },
    refresh() { bet.refresh(); paytable(); },
  };
})());

// Machine à sous : 3 rouleaux, ligne de paiement centrale
const Slots = (() => {
  const $ = id => document.getElementById(id);
  const els = { reels: $('sl-reels'), actions: $('sl-actions'), msg: $('sl-msg'), lever: $('sl-lever'), pay: $('sl-paytable'), win: $('sl-win'), lights: $('sl-lights') };
  const bet = new BetControl($('sl-bet'), { label: 'Mise par tour', initial: 5, max: () => Casino.maxBet('slots') });
  const SYMBOLS = [
    { id: 'cerise', w: 2, p: 12, html: '🍒', name: 'Cerise' },
    { id: 'citron', w: 6, p: 10, html: '🍋', name: 'Citron' },
    { id: 'cloche', w: 5, p: 18, html: '🔔', name: 'Cloche' },
    { id: 'etoile', w: 4, p: 30, html: '⭐', name: 'Étoile' },
    { id: 'bar', w: 3, p: 60, html: '<span class="sym-bar">BAR</span>', name: 'BAR' },
    { id: 'sept', w: 2, p: 150, html: '<span class="sym-7">7</span>', name: 'Sept' },
    { id: 'diamant', w: 3, p: 10, html: '💎', name: 'Diamant', golden: true },
  ];
  const BY = Object.fromEntries(SYMBOLS.map(s => [s.id, s]));
  const pool = () => SYMBOLS.filter(s => !s.golden || Casino.upgrade('doree'));
  function randSym() {
    const P = pool(), W = P.reduce((a, s) => a + s.w, 0);
    let r = Util.randInt(W);
    for (const s of P) { if (r < s.w) return s.id; r -= s.w; }
    return P[0].id;
  }
  // Gain (en multiple de la mise) et description pour une ligne
  function evaluate(line) {
    const wild = Casino.has('cerise') > 0;
    const ch = line.filter(x => x === 'cerise').length, di = line.filter(x => x === 'diamant').length;
    if (wild) {
      const o = line.filter(x => x !== 'cerise');
      if (!o.length) return { x: BY.cerise.p, text: '3 Cerises' };
      if (o.every(x => x === o[0])) return { x: BY[o[0]].p * (o.length === 3 ? 1 : 0.5), text: `3 ${BY[o[0]].name}${o.length < 3 ? ' (cerise joker)' : ''}`, wild: o.length < 3 };
    } else if (line[0] === line[1] && line[1] === line[2]) return { x: BY[line[0]].p, text: `3 ${BY[line[0]].name}` };
    if (di === 2) return { x: 4, text: '2 Diamants' };
    if (di === 1) return { x: 1.5, text: '1 Diamant' };
    if (ch === 2) return { x: 3, text: '2 Cerises' };
    return { x: 0, text: '' };
  }

  // Rouleaux
  const ROWS = 3;
  const reels = [0, 1, 2].map(i => {
    const r = Util.el('div', 'reel');
    const strip = Util.el('div', 'strip');
    r.appendChild(strip);
    els.reels.appendChild(r);
    return { el: r, strip, syms: [randSym(), randSym(), randSym()] };
  });
  const symEl = id => { const d = Util.el('div', 'sym sym-' + id); d.innerHTML = BY[id].html; return d; };
  function drawStatic() {
    reels.forEach(R => { R.strip.style.transition = 'none'; R.strip.style.transform = 'translateY(0)'; R.strip.innerHTML = ''; R.syms.forEach(id => R.strip.appendChild(symEl(id))); });
  }
  function renderPaytable() {
    els.pay.innerHTML = '<tr><th>Ligne</th><th>Gain</th></tr>' + pool().map(s => `<tr><td>${s.html} ${s.html} ${s.html}</td><td>×${s.p}</td></tr>`).join('') +
      (Casino.upgrade('doree') ? '<tr><td>💎 💎 + autre</td><td>×4</td></tr><tr><td>💎 + autres</td><td>×1,5</td></tr>' : '') +
      '<tr><td>🍒 🍒 + autre</td><td>×3</td></tr>';
  }

  function msg(text, cls = '') { els.msg.textContent = text; els.msg.className = 'msg ' + cls; }

  async function animate(final) {
    els.lever.classList.remove('pull'); void els.lever.offsetWidth; els.lever.classList.add('pull');
    els.lights.classList.add('chase');
    const h = reels[0].el.clientHeight / ROWS || 80;
    const stops = reels.map((R, i) => new Promise(res => {
      const n = 16 + i * 7;
      R.strip.style.transition = 'none';
      R.strip.style.transform = 'translateY(0)';
      R.strip.innerHTML = '';
      const seq = [...R.syms];
      for (let k = 0; k < n; k++) seq.push(randSym());
      seq.push(randSym(), final[i], randSym());
      seq.forEach(id => R.strip.appendChild(symEl(id)));
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

  async function resolve(amount) {
    const line = [randSym(), randSym(), randSym()];
    await animate(line);
    const ev = evaluate(line);
    const mult = Casino.rule('slots15') ? 1.5 : 1;
    const back = Util.round2(amount * ev.x * mult);
    const sevens = line.filter(x => x === 'sept').length;
    const res = Casino.settle('slots', { staked: amount, back, sevens });
    if (ev.wild) Casino.flash('cerise', 'Joker !');
    els.reels.classList.toggle('winning', ev.x > 0);
    if (res.net > 0) {
      msg(`${ev.text} — +${Util.fmt(res.net)} jetons !`, 'win');
      els.win.textContent = `+${Util.fmt(res.net)}`; els.win.className = 'sl-win show';
      Sfx.play(ev.x >= 25 ? 'bigwin' : 'win');
    } else if (res.net < 0) { msg(ev.x > 0 ? `${ev.text} — ${Util.fmt(back)} rendus` : 'Rien cette fois…', 'lose'); els.win.className = 'sl-win'; Sfx.play('lose'); }
    else { msg(ev.text || 'Mise rendue', 'push'); els.win.className = 'sl-win'; }
    return res.net < 0;
  }

  async function spin() {
    const err = Casino.canStart();
    if (err) return msg(err, 'warn');
    const amount = bet.value;
    if (amount <= 0) return msg('Choisissez une mise.', 'warn');
    if (!Wallet.take(amount)) return msg('Solde insuffisant.', 'warn');
    Casino.begin();
    bet.setEnabled(false);
    msg(''); els.win.className = 'sl-win'; els.reels.classList.remove('winning');
    setActions(els.actions, []);
    let snap = Casino.snapshot();
    let lost = await resolve(amount);
    while (lost && Casino.charges('slots') > 0) {
      Casino.hold();
      const again = await new Promise(r => setActions(els.actions, [[`👻 Relancer (${Casino.charges('slots')})`, () => r(true), { cls: 'ghost' }], ['Accepter', () => r(false)]]));
      if (!again) { Casino.release(); break; }
      Casino.useCharge('slots');
      Casino.restore(snap);
      snap = Casino.snapshot();
      lost = await resolve(amount);
    }
    bet.setEnabled(true);
    idle();
  }
  function idle() { setActions(els.actions, [['Lancer', spin, { cls: 'primary' }]]); }
  els.lever.onclick = () => { const b = els.actions.querySelector('button.primary:not([disabled])'); if (b) b.click(); };

  drawStatic();
  renderPaytable();
  idle();
  return { refresh: renderPaytable };
})();

// Roulette européenne (un seul zéro) avec trois joueurs IA autour de la table
const Roulette = (() => {
  const $ = id => document.getElementById(id);
  const els = {
    wheel: $('rl-wheel'), ballTrack: $('rl-ball-track'), result: $('rl-result'), board: $('rl-board'),
    ai: $('rl-ai'), actions: $('rl-actions'), msg: $('rl-msg'), total: $('rl-total'), chips: $('rl-chips'), history: $('rl-history'),
  };
  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const color = n => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');
  const SEG = 360 / 37;
  let bets = {}, lastBets = null, chip = 5, rot = 0, ballRot = 0, busy = false;
  const history = [];

  // ---------- Roue (SVG) ----------
  (function drawWheel() {
    const R = 150, r2 = 112, cx = 160, cy = 160;
    let g = `<circle cx="${cx}" cy="${cy}" r="158" fill="#3a2212" stroke="#c9a24a" stroke-width="4"/>`;
    ORDER.forEach((n, i) => {
      const a0 = (i * SEG - SEG / 2 - 90) * Math.PI / 180, a1 = (i * SEG + SEG / 2 - 90) * Math.PI / 180;
      const p = (rr, a) => `${cx + rr * Math.cos(a)} ${cy + rr * Math.sin(a)}`;
      const fill = { green: '#11804a', red: '#b3141f', black: '#151515' }[color(n)];
      g += `<path d="M${p(r2, a0)} L${p(R, a0)} A${R} ${R} 0 0 1 ${p(R, a1)} L${p(r2, a1)} A${r2} ${r2} 0 0 0 ${p(r2, a0)}Z" fill="${fill}" stroke="#d8b65c" stroke-width="1"/>`;
      g += `<text x="${cx}" y="${cy - 131}" transform="rotate(${i * SEG} ${cx} ${cy})" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700" fill="#fff" font-family="Georgia,serif">${n}</text>`;
    });
    g += `<circle cx="${cx}" cy="${cy}" r="${r2}" fill="none" stroke="#d8b65c" stroke-width="3"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="96" fill="url(#rl-cone)" stroke="#8a6a2a" stroke-width="2"/>`;
    for (let k = 0; k < 8; k++) g += `<path d="M${cx} ${cy} L${cx + 92 * Math.cos(k * Math.PI / 4)} ${cy + 92 * Math.sin(k * Math.PI / 4)}" stroke="#c9a24a" stroke-width="5" stroke-linecap="round"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="22" fill="#e2bd62" stroke="#7a5a1c" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="8" fill="#fff6d0"/>`;
    els.wheel.innerHTML = `<defs><radialGradient id="rl-cone"><stop offset="0" stop-color="#7a4a26"/><stop offset="1" stop-color="#3b220f"/></radialGradient></defs>${g}`;
  })();

  // ---------- Tapis de mises ----------
  const OUTSIDE = {
    red: { label: 'Rouge', test: n => color(n) === 'red', pay: 2 },
    black: { label: 'Noir', test: n => color(n) === 'black', pay: 2 },
    even: { label: 'Pair', test: n => n > 0 && n % 2 === 0, pay: 2 },
    odd: { label: 'Impair', test: n => n % 2 === 1, pay: 2 },
    low: { label: '1-18', test: n => n >= 1 && n <= 18, pay: 2 },
    high: { label: '19-36', test: n => n >= 19, pay: 2 },
    d1: { label: '1-12', test: n => n >= 1 && n <= 12, pay: 3 },
    d2: { label: '13-24', test: n => n >= 13 && n <= 24, pay: 3 },
    d3: { label: '25-36', test: n => n >= 25, pay: 3 },
    c1: { label: '2:1', test: n => n > 0 && n % 3 === 1, pay: 3 },
    c2: { label: '2:1', test: n => n > 0 && n % 3 === 2, pay: 3 },
    c3: { label: '2:1', test: n => n > 0 && n % 3 === 0, pay: 3 },
  };
  function payFor(key, n) {
    if (key[0] === 'n') return +key.slice(1) === n ? (Casino.rule('plein40') ? 41 : 36) : 0;
    const o = OUTSIDE[key];
    if (!o.test(n)) return 0;
    if (key === 'red') return 2 + 0.2 * Casino.has('rouge');
    return o.pay;
  }
  const betLabel = k => (k[0] === 'n' ? `n° ${k.slice(1)}` : k[0] === 'c' ? `colonne ${k[1]}` : OUTSIDE[k].label);

  function cell(key, text, cls, style) {
    const c = Util.el('button', 'rl-cell ' + cls);
    c.dataset.key = key; c.innerHTML = `<span>${text}</span>`;
    if (style) c.style.cssText = style;
    c.onclick = () => place(key);
    c.oncontextmenu = e => { e.preventDefault(); remove(key); };
    return c;
  }
  (function drawBoard() {
    const g = els.board;
    g.appendChild(cell('n0', '0', 'green zero', 'grid-row:1/4;grid-column:1'));
    for (let col = 0; col < 12; col++) for (let row = 0; row < 3; row++) {
      const n = col * 3 + (3 - row);
      g.appendChild(cell('n' + n, n, color(n), `grid-row:${row + 1};grid-column:${col + 2}`));
    }
    ['c3', 'c2', 'c1'].forEach((k, row) => g.appendChild(cell(k, '2:1', 'out', `grid-row:${row + 1};grid-column:14`)));
    ['d1', 'd2', 'd3'].forEach((k, i) => g.appendChild(cell(k, OUTSIDE[k].label, 'out', `grid-row:4;grid-column:${2 + i * 4}/span 4`)));
    ['low', 'even', 'red', 'black', 'odd', 'high'].forEach((k, i) => g.appendChild(cell(k, k === 'red' ? '◆' : k === 'black' ? '◆' : OUTSIDE[k].label, 'out ' + (k === 'red' || k === 'black' ? 'diamond-' + k : ''), `grid-row:5;grid-column:${2 + i * 2}/span 2`)));
  })();
  // Sélecteur de jeton
  [1, 5, 25, 100].forEach(v => {
    const b = Util.el('button', `chip chip-${v}`, v);
    b.onclick = () => { chip = v; Sfx.play('chip'); els.chips.querySelectorAll('.chip').forEach(x => x.classList.toggle('sel', x === b)); };
    if (v === chip) b.classList.add('sel');
    els.chips.appendChild(b);
  });

  const total = () => Util.round2(Object.values(bets).reduce((a, b) => a + b, 0));
  function renderBets() {
    els.board.querySelectorAll('.rl-cell').forEach(c => {
      const v = bets[c.dataset.key];
      let m = c.querySelector('.rl-chip');
      if (v) {
        if (!m) { m = Util.el('i', 'rl-chip chipv chip-' + (v >= 100 ? 100 : v >= 25 ? 25 : v >= 5 ? 5 : 1)); c.appendChild(m); }
        m.className = 'rl-chip chipv chip-' + (v >= 100 ? 100 : v >= 25 ? 25 : v >= 5 ? 5 : 1);
        m.textContent = Util.fmt(v);
      } else if (m) m.remove();
    });
    const max = Casino.maxBet('roulette');
    els.total.innerHTML = `Mise totale : <b>${Util.fmt(total())}</b>${Number.isFinite(max) ? ` <span>/ max ${Util.fmt(max)}</span>` : ''}`;
  }
  function place(key) {
    if (busy) return;
    const max = Casino.maxBet('roulette');
    const add = Math.min(chip, max - total());
    if (add <= 0) { Sfx.play('error'); return msg(`Mise maximale atteinte (${Util.fmt(max)}).`, 'warn'); }
    if (total() + add > Wallet.get()) { Sfx.play('error'); return msg('Solde insuffisant.', 'warn'); }
    bets[key] = Util.round2((bets[key] || 0) + add);
    Sfx.play('chip'); msg(''); renderBets();
  }
  function remove(key) { if (busy || !bets[key]) return; delete bets[key]; renderBets(); }
  function msg(text, cls = '') { els.msg.textContent = text; els.msg.className = 'msg ' + cls; }

  // ---------- Joueurs IA ----------
  const AIS = [
    { name: 'Gégé', avatar: '🧔', style: 'outside' },
    { name: 'Mamie Lulu', avatar: '👵', style: 'numbers' },
    { name: 'Le Baron', avatar: '🎩', style: 'dozen' },
  ];
  els.ai.innerHTML = AIS.map((a, i) => `<div class="ai" data-i="${i}"><span class="ai-av">${a.avatar}</span><div><b>${a.name}</b><small class="ai-bet">—</small></div><span class="ai-res"></span></div>`).join('');
  function aiBets() {
    return AIS.map(a => {
      const amount = 5 * (1 + Util.randInt(10));
      let key;
      if (a.style === 'outside') key = ['red', 'black', 'even', 'odd', 'low', 'high'][Util.randInt(6)];
      else if (a.style === 'numbers') key = 'n' + [7, 17, 23, 32, Util.randInt(37)][Util.randInt(5)];
      else key = Util.randInt(2) ? ['d1', 'd2', 'd3'][Util.randInt(3)] : ['c1', 'c2', 'c3'][Util.randInt(3)];
      return { key, amount };
    });
  }
  function showAi(list, n) {
    let won = 0;
    list.forEach((b, i) => {
      const row = els.ai.children[i];
      row.querySelector('.ai-bet').textContent = `${Util.fmt(b.amount)} sur ${betLabel(b.key)}`;
      const res = row.querySelector('.ai-res');
      if (n === null) { res.textContent = ''; res.className = 'ai-res'; return; }
      const back = b.amount * (b.key[0] === 'n' ? (+b.key.slice(1) === n ? 36 : 0) : OUTSIDE[b.key].test(n) ? OUTSIDE[b.key].pay : 0);
      const g = back - b.amount;
      if (g > 0) won += g;
      res.textContent = g > 0 ? `+${Util.fmt(g)}` : `−${Util.fmt(b.amount)}`;
      res.className = 'ai-res ' + (g > 0 ? 'win' : 'lose');
    });
    return won;
  }

  // ---------- Lancer ----------
  async function spinTo(n) {
    const idx = ORDER.indexOf(n);
    const want = ((360 - idx * SEG) % 360 + 360) % 360;
    const cur = ((rot % 360) + 360) % 360;
    rot += 360 * 5 + ((want - cur + 360) % 360);
    ballRot -= 360 * 7 + (((ballRot % 360) + 360) % 360);
    els.wheel.style.transform = `rotate(${rot}deg)`;
    els.ballTrack.style.transform = `rotate(${ballRot}deg)`;
    els.ballTrack.classList.add('spinning');
    els.result.className = 'rl-result';
    els.result.textContent = '…';
    let t = 0;
    while (t < 4200) { Sfx.play('tick'); const d = 40 + t / 18; await Util.sleep(d); t += d; }
    els.ballTrack.classList.remove('spinning');
    els.result.textContent = n;
    els.result.className = 'rl-result show ' + color(n);
  }

  async function resolve(n, ai, staked) {
    await spinTo(n);
    let back = 0;
    const zeroSafe = n === 0 && Casino.has('zero');
    for (const k in bets) {
      const p = payFor(k, n);
      back += p ? bets[k] * p : zeroSafe ? bets[k] : 0;
    }
    if (zeroSafe) Casino.flash('zero', 'Mises rendues');
    const aiWin = showAi(ai, n);
    const sevens = (String(n).match(/7/g) || []).length;
    const res = Casino.settle('roulette', { staked, back: Util.round2(back), sevens, aiWin });
    els.board.querySelectorAll('.rl-cell').forEach(c => c.classList.toggle('hit', c.dataset.key === 'n' + n || (c.dataset.key[0] !== 'n' && OUTSIDE[c.dataset.key].test(n))));
    history.unshift(n); if (history.length > 12) history.pop();
    els.history.innerHTML = history.map(h => `<span class="rl-h ${color(h)}">${h}</span>`).join('');
    const label = `${n} ${n === 0 ? 'vert' : color(n) === 'red' ? 'rouge' : 'noir'}`;
    if (res.net > 0) { msg(`${label} — gagné ! +${Util.fmt(res.net)} jetons`, 'win'); Sfx.play(res.net >= staked * 3 ? 'bigwin' : 'win'); }
    else if (res.net < 0) { msg(`${label} — perdu, −${Util.fmt(-res.net)} jetons`, 'lose'); Sfx.play('lose'); }
    else { msg(`${label} — mises rendues`, 'push'); Sfx.play('push'); }
    return res.net < 0;
  }

  async function spin() {
    const err = Casino.canStart();
    if (err) return msg(err, 'warn');
    const staked = total();
    if (staked <= 0) return msg('Placez vos jetons sur le tapis.', 'warn');
    if (!Wallet.take(staked)) return msg('Solde insuffisant.', 'warn');
    Casino.begin();
    busy = true;
    lastBets = { ...bets };
    els.board.querySelectorAll('.hit').forEach(c => c.classList.remove('hit'));
    const ai = aiBets();
    showAi(ai, null);
    setActions(els.actions, []);
    let snap = Casino.snapshot();
    let lost = await resolve(Util.randInt(37), ai, staked);
    while (lost && Casino.charges('roulette') > 0) {
      Casino.hold();
      const again = await new Promise(r => setActions(els.actions, [[`👻 Relancer la bille (${Casino.charges('roulette')})`, () => r(true), { cls: 'ghost' }], ['Accepter', () => r(false)]]));
      if (!again) { Casino.release(); break; }
      Casino.useCharge('roulette');
      Casino.restore(snap);
      history.shift();
      snap = Casino.snapshot();
      lost = await resolve(Util.randInt(37), ai, staked);
    }
    busy = false;
    bets = {};
    renderBets();
    idle();
  }

  function idle() {
    setActions(els.actions, [
      ['Lancer la bille', spin, { cls: 'primary' }],
      ['Remiser', async () => {
        if (!lastBets) return;
        const t = Object.values(lastBets).reduce((a, b) => a + b, 0);
        if (t > Casino.maxBet('roulette') || t > Wallet.get()) return msg('Impossible de remiser (limite ou solde).', 'warn');
        bets = { ...lastBets }; renderBets(); Sfx.play('chip');
      }, { disabled: !lastBets }],
      ['Effacer', async () => { bets = {}; renderBets(); }],
    ]);
  }
  renderBets();
  showAi(aiBets(), null);
  idle();
  return { refresh: renderBets };
})();

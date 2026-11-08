// Vue Roulette : roue SVG, tapis de mises, joueurs IA — tout le hasard vient du moteur
App.register((() => {
  const $ = id => document.getElementById(id);
  const E = Games.get('roulette');
  const els = {
    wheel: $('rl-wheel'), ballTrack: $('rl-ball-track'), result: $('rl-result'), board: $('rl-board'),
    ai: $('rl-ai'), actions: $('rl-actions'), msg: $('rl-msg'), total: $('rl-total'), chips: $('rl-chips'), history: $('rl-history'),
  };
  const SEG = 360 / 37;
  let bets = {}, lastBets = null, chip = 5, rot = 0, ballRot = 0, busy = false;
  const history = [];
  const msg = (t, c = '') => { els.msg.textContent = iconMsg(t, c); els.msg.className = 'msg ' + c; };

  (function drawWheel() {
    const R = 150, r2 = 112, cx = 160, cy = 160;
    let g = `<circle cx="${cx}" cy="${cy}" r="158" fill="#3a2212" stroke="#c9a24a" stroke-width="4"/>`;
    E.ORDER.forEach((n, i) => {
      const a0 = (i * SEG - SEG / 2 - 90) * Math.PI / 180, a1 = (i * SEG + SEG / 2 - 90) * Math.PI / 180;
      const p = (rr, a) => `${cx + rr * Math.cos(a)} ${cy + rr * Math.sin(a)}`;
      const fill = { green: '#11804a', red: '#b3141f', black: '#151515' }[E.color(n)];
      g += `<path d="M${p(r2, a0)} L${p(R, a0)} A${R} ${R} 0 0 1 ${p(R, a1)} L${p(r2, a1)} A${r2} ${r2} 0 0 0 ${p(r2, a0)}Z" fill="${fill}" stroke="#d8b65c" stroke-width="1"/>`;
      g += `<text x="${cx}" y="${cy - 131}" transform="rotate(${i * SEG} ${cx} ${cy})" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700" fill="#fff" font-family="Georgia,serif">${n}</text>`;
    });
    g += `<circle cx="${cx}" cy="${cy}" r="${r2}" fill="none" stroke="#d8b65c" stroke-width="3"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="96" fill="url(#rl-cone)" stroke="#8a6a2a" stroke-width="2"/>`;
    for (let k = 0; k < 8; k++) g += `<path d="M${cx} ${cy} L${cx + 92 * Math.cos(k * Math.PI / 4)} ${cy + 92 * Math.sin(k * Math.PI / 4)}" stroke="#c9a24a" stroke-width="5" stroke-linecap="round"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="22" fill="#e2bd62" stroke="#7a5a1c" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="8" fill="#fff6d0"/>`;
    els.wheel.innerHTML = `<defs><radialGradient id="rl-cone"><stop offset="0" stop-color="#7a4a26"/><stop offset="1" stop-color="#3b220f"/></radialGradient></defs>${g}`;
  })();

  function cell(key, text, cls, style) {
    const c = Util.el('button', 'rl-cell ' + cls);
    c.dataset.key = key; c.innerHTML = `<span>${text}</span>`;
    c.style.cssText = style;
    c.onclick = () => { if (c._long) { c._long = false; return; } place(key); };
    c.oncontextmenu = ev => { ev.preventDefault(); remove(key); };
    // appui long (tactile) : retirer la mise de la case
    let lt = null;
    c.addEventListener('pointerdown', () => { lt = setTimeout(() => { c._long = true; remove(key); Sfx.play('chip'); }, 550); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => c.addEventListener(t, () => clearTimeout(lt)));
    c.setAttribute('aria-label', key[0] === 'n' ? `Numéro ${key.slice(1)}` : E.OUTSIDE[key].label);
    return c;
  }
  (function drawBoard() {
    const g = els.board;
    g.appendChild(cell('n0', '0', 'green zero', 'grid-row:1/4;grid-column:1'));
    for (let col = 0; col < 12; col++) for (let row = 0; row < 3; row++) {
      const n = col * 3 + (3 - row);
      g.appendChild(cell('n' + n, n, E.color(n), `grid-row:${row + 1};grid-column:${col + 2}`));
    }
    ['c3', 'c2', 'c1'].forEach((k, row) => g.appendChild(cell(k, '2:1', 'out', `grid-row:${row + 1};grid-column:14`)));
    ['d1', 'd2', 'd3'].forEach((k, i) => g.appendChild(cell(k, E.OUTSIDE[k].label, 'out', `grid-row:4;grid-column:${2 + i * 4}/span 4`)));
    ['low', 'even', 'red', 'black', 'odd', 'high'].forEach((k, i) => g.appendChild(cell(k, k === 'red' ? '♦ Rouge' : k === 'black' ? '♠ Noir' : E.OUTSIDE[k].label, 'out ' + (k === 'red' || k === 'black' ? 'diamond-' + k : ''), `grid-row:5;grid-column:${2 + i * 2}/span 2`)));
    layout();
    // Téléphone : les mises courantes en gros boutons (un seul toucher pour « Rouge »), les numéros repliés
    const q = document.getElementById('rl-quick');
    ['red', 'black', 'even', 'odd', 'low', 'high', 'd1', 'd2', 'd3'].forEach(k => q.appendChild(cell(k, k === 'red' ? '♦ Rouge' : k === 'black' ? '♠ Noir' : E.OUTSIDE[k].label, 'out quick ' + (k === 'red' || k === 'black' ? 'diamond-' + k : ''), '')));
    const more = document.getElementById('rl-more');
    more.onclick = () => { const open = !document.getElementById('roulette').classList.toggle('rl-closed'); more.setAttribute('aria-expanded', String(open)); more.textContent = open ? 'Masquer les numéros ▴' : 'Mises sur les numéros ▾'; };
    document.getElementById('roulette').classList.add('rl-closed');
  })();
  // Placement des cases : horizontal (écran large) ou vertical (téléphone)
  function layout() {
    const vertical = window.matchMedia('(max-width: 560px)').matches;
    els.board.classList.toggle('vertical', vertical);
    els.board.querySelectorAll('.rl-cell').forEach(c => {
      const k = c.dataset.key;
      if (!vertical) { c.style.gridRow = c.dataset.hr || c.style.gridRow; c.style.gridColumn = c.dataset.hc || c.style.gridColumn; return; }
      if (!c.dataset.hr) { c.dataset.hr = c.style.gridRow; c.dataset.hc = c.style.gridColumn; }
      let row, col;
      if (k === 'n0') { row = '1'; col = '2 / span 3'; }
      else if (k[0] === 'n') { const n = +k.slice(1); row = String(1 + Math.ceil(n / 3)); col = String(1 + ((n - 1) % 3) + 1); }
      else if (k[0] === 'c') { row = '14'; col = String(1 + +k[1]); }
      else if (k[0] === 'd') { const d = +k[1]; row = `${2 + (d - 1) * 4} / span 4`; col = '1'; }
      else { const i = ['low', 'even', 'red', 'black', 'odd', 'high'].indexOf(k); row = `${2 + i * 2} / span 2`; col = '5'; }
      c.style.gridRow = row; c.style.gridColumn = col;
    });
  }
  window.addEventListener('resize', layout);
  [1, 5, 25, 100].forEach(v => {
    const b = Util.el('button', `chip chip-${v}`, v);
    b.onclick = () => { chip = v; Sfx.play('chip'); els.chips.querySelectorAll('.chip').forEach(x => x.classList.toggle('sel', x === b)); };
    if (v === chip) b.classList.add('sel');
    els.chips.appendChild(b);
  });

  const total = () => Util.round2(Object.values(bets).reduce((a, b) => a + b, 0));
  const chipCls = v => 'chip-' + (v >= 100 ? 100 : v >= 25 ? 25 : v >= 5 ? 5 : 1);
  function renderBets() {
    document.querySelectorAll('#roulette .rl-cell').forEach(c => {
      const v = bets[c.dataset.key];
      let m = c.querySelector('.rl-chip');
      if (v) {
        if (!m) { m = Util.el('i'); c.appendChild(m); }
        m.className = 'rl-chip chipv ' + chipCls(v);
        m.textContent = Util.fmt(v);
      } else if (m) m.remove();
    });
    const max = App.host ? App.host.maxBet('roulette') : Infinity;
    els.total.innerHTML = `Mise totale : <b>${Util.fmt(total())}</b>${Number.isFinite(max) ? ` <span>/ max ${Util.fmt(max)}</span>` : ''}`;
  }
  function place(key) {
    if (busy) return;
    const max = App.host.maxBet('roulette');
    const add = Math.min(chip, max - total(), App.host.chips() - total());
    if (add <= 0) { Sfx.play('error'); return msg(total() >= max ? `Mise maximale atteinte (${Util.fmt(max)}).` : 'Solde insuffisant.', 'warn'); }
    bets[key] = Util.round2((bets[key] || 0) + add);
    Sfx.play('chip'); msg(''); renderBets();
  }
  function remove(key) { if (busy || !bets[key]) return; delete bets[key]; renderBets(); }

  els.ai.innerHTML = E.AIS.map(a => `<div class="ai"><span class="ai-av">${a.avatar}</span><div><b>${a.name}</b><small class="ai-bet">—</small></div><span class="ai-res"></span></div>`).join('');
  function showAi(list, done) {
    list.forEach((b, i) => {
      const row = els.ai.children[i];
      row.querySelector('.ai-bet').textContent = `${Util.fmt(b.amount)} sur ${E.label(b.key)}`;
      const res = row.querySelector('.ai-res');
      res.textContent = done ? (b.net > 0 ? `+${Util.fmt(b.net)}` : `−${Util.fmt(b.amount)}`) : '';
      res.className = 'ai-res ' + (done ? (b.net > 0 ? 'win' : 'lose') : '');
    });
  }

  async function spinTo(n) {
    const idx = E.ORDER.indexOf(n);
    const want = ((360 - idx * SEG) % 360 + 360) % 360;
    const cur = ((rot % 360) + 360) % 360;
    rot += 360 * 5 + ((want - cur + 360) % 360);
    ballRot -= 360 * 7 + (((ballRot % 360) + 360) % 360);
    els.wheel.style.transitionDuration = els.ballTrack.style.transitionDuration = Util.dur(4200) + 'ms';
    els.wheel.style.transform = `rotate(${rot}deg)`;
    els.ballTrack.style.transform = `rotate(${ballRot}deg)`;
    els.ballTrack.classList.add('spinning');
    els.result.className = 'rl-result';
    els.result.textContent = '…';
    els.board.querySelectorAll('.hit').forEach(c => c.classList.remove('hit'));
    let t = 0;
    while (t < 4200) { Sfx.play('tick'); const d = 40 + t / 18; await Util.sleep(d); t += d; }
    els.ballTrack.classList.remove('spinning');
    els.result.textContent = n;
    els.result.className = 'rl-result show ' + E.color(n);
    document.querySelectorAll('#roulette .rl-cell').forEach(c => {
      const k = c.dataset.key;
      c.classList.toggle('hit', k === 'n' + n || (k[0] !== 'n' && E.OUTSIDE[k].test(n)));
    });
    history.unshift(n); if (history.length > 12) history.pop();
    els.history.innerHTML = history.map(h => `<span class="rl-h ${E.color(h)}">${h}</span>`).join('');
  }
  const label = n => `${n} ${n === 0 ? 'vert' : E.color(n) === 'red' ? 'rouge' : 'noir'}`;

  async function play(fn) {
    busy = true;
    await App.animate(async () => {
      try { await fn(); } finally { busy = false; }
    });
  }
  // spin = false : le joueur accepte une perte, pas de nouveau lancer
  async function afterSpin(res, spin = true) {
    const r = res.round;
    if (spin) await spinTo(r.n);
    showAi(r.ai, true);
    if (!res.settlement) {
      msg(`${label(r.n)} — perdu… une relance est possible.`, 'warn');
      return engineActions(els.actions, App.host.actions(), act);
    }
    const st = res.settlement;
    if (st.net > 0) { msg(`${label(r.n)} — gagné ! +${Util.fmt(st.net)} jetons`, 'win'); Sfx.play(st.net >= st.staked * 3 ? 'bigwin' : 'win'); }
    else if (st.net < 0) { msg(`${label(r.n)} — perdu, −${Util.fmt(-st.net)} jetons`, 'lose'); Sfx.play('lose'); }
    else { msg(`${label(r.n)} — gains et pertes s'annulent (net 0)`, 'push'); Sfx.play('push'); }
    await App.showSettlement(st);
    renderBets(); idle(); // la mise reste en place pour le tour suivant ; « Effacer » pour la retirer
  }
  function spin() {
    return play(async () => {
      const res = App.host.startPlay('roulette', { bets });
      if (res.error) { Sfx.play('error'); msg(res.error, 'warn'); return idle(); }
      App.syncStake(res);
      lastBets = { ...bets };
      msg('');
      setActions(els.actions, []);
      showAi(res.round.ai, false);
      await afterSpin(res);
    });
  }
  function act(id) {
    return play(async () => {
      const res = App.host.act(id);
      if (res.error) return idle();
      setActions(els.actions, []);
      if (id === 'reroll') history.shift();
      await afterSpin(res, id === 'reroll');
    });
  }
  function idle() {
    setActions(els.actions, [
      ['Lancer la bille', spin, { cls: 'primary' }],
      ['Remiser', async () => {
        if (!lastBets) return;
        const t = Object.values(lastBets).reduce((a, b) => a + b, 0);
        if (t > App.host.maxBet('roulette') || t > App.host.chips()) return msg('Impossible de remiser (limite ou solde).', 'warn');
        bets = { ...lastBets }; renderBets(); Sfx.play('chip');
      }, { disabled: !lastBets }],
      ['Effacer', async () => { bets = {}; renderBets(); }],
    ]);
  }
  return {
    id: 'roulette',
    reset() { bets = {}; lastBets = null; renderBets(); showAi(E.AIS.map(() => ({ key: 'red', amount: 0 })), false); els.ai.querySelectorAll('.ai-bet').forEach(x => (x.textContent = '—')); idle(); msg(''); },
    refresh() { renderBets(); },
  };
})());

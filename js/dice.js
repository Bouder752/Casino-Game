// Dice : tirage de 0.00 à 99.99, pariez en dessous ou au-dessus d'un seuil.
// Multiplicateur = 99 / chance de gain (avantage maison 1 %).
const Dice = (() => {
  const $ = id => document.getElementById(id);
  const els = {
    result: $('dice-result'), slider: $('dice-target'), targetVal: $('dice-target-val'),
    under: $('dice-under'), over: $('dice-over'), chance: $('dice-chance'), mult: $('dice-mult'),
    profit: $('dice-profit'), rule: $('dice-rule'), marker: $('dice-marker'), track: $('dice-track'),
    history: $('dice-history'), actions: $('dice-actions'), msg: $('dice-msg'),
  };
  const bet = new BetControl($('dice-bet'), { label: 'Mise', initial: 10, max: () => Casino.maxBet('dice') });
  let mode = 'under';
  const history = [];

  const target = () => +els.slider.value;
  const chance = () => (mode === 'under' ? target() : 100 - target());
  const edge = () => (Casino.rule('diceFair') ? 100 : Casino.boss('maison') ? 95 : 99);
  const multiplier = () => Math.floor((edge() / chance()) * 10000) / 10000;

  function update() {
    const t = target();
    els.targetVal.textContent = t.toFixed(2);
    els.chance.textContent = chance().toFixed(2) + ' %';
    els.mult.textContent = '×' + multiplier().toFixed(4);
    els.profit.textContent = Util.fmt(Util.round2(bet.value * multiplier() - bet.value));
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

  function msg(text, cls = '') { els.msg.textContent = text; els.msg.className = 'msg ' + cls; }
  let busy = false;

  async function animateRoll(r, win) {
    els.result.className = 'dice-result rolling';
    Sfx.play('roll');
    for (let i = 0; i < 14; i++) {
      els.result.textContent = (Util.randInt(10000) / 100).toFixed(2);
      if (i % 3 === 0) Sfx.play('tick');
      await Util.sleep(35 + i * 3);
    }
    els.result.textContent = r.toFixed(2);
    els.result.className = 'dice-result ' + (win ? 'win' : 'lose');
    els.marker.style.left = r + '%';
    els.marker.className = 'dice-marker show ' + (win ? 'win' : 'lose');
  }

  // Un tirage complet ; renvoie true si perdu (pour proposer une relance)
  async function resolve(amount) {
    const r = Util.randInt(10000) / 100;
    const t = target();
    const win = mode === 'under' ? r < t : r >= t;
    await animateRoll(r, win);
    const back = win ? Util.round2(amount * multiplier()) : 0;
    const sevens = (r.toFixed(2).match(/7/g) || []).length;
    const res = Casino.settle('dice', { staked: amount, back, sevens });
    if (res.net > 0) { msg(`Gagné ! +${Util.fmt(res.net)} jetons`, 'win'); Sfx.play(multiplier() >= 4 ? 'bigwin' : 'win'); }
    else if (res.net < 0) { msg(`Perdu ! −${Util.fmt(-res.net)} jetons`, 'lose'); Sfx.play('lose'); }
    else { msg(`Perdu, mais les jokers compensent.`, 'push'); Sfx.play('push'); }
    history.unshift({ r, win });
    if (history.length > 14) history.pop();
    els.history.innerHTML = '';
    history.forEach(h => els.history.appendChild(Util.el('span', 'pill ' + (h.win ? 'win' : 'lose'), h.r.toFixed(2))));
    return !win;
  }

  async function roll() {
    const err = Casino.canStart();
    if (err) return msg(err, 'warn');
    const amount = bet.value;
    if (amount <= 0) return msg('Choisissez une mise.', 'warn');
    if (!Wallet.take(amount)) return msg('Solde insuffisant.', 'warn');
    Casino.begin();
    busy = true;
    bet.setEnabled(false); els.slider.disabled = true;
    let snap = Casino.snapshot();
    let lost = await resolve(amount);
    // Relances (Dé Pipé, Fantôme, Boisson du Bar)
    while (lost && Casino.charges('dice') > 0) {
      Casino.hold();
      const again = await choice([`🎲 Relancer (${Casino.charges('dice')})`, 'Accepter']);
      if (!again) { Casino.release(); break; }
      Casino.useCharge('dice');
      Casino.restore(snap);
      history.shift();
      snap = Casino.snapshot();
      lost = await resolve(amount);
    }
    busy = false;
    bet.setEnabled(true); els.slider.disabled = false;
    idle();
  }

  // Petite décision à deux boutons ; résout true pour le premier
  function choice([a, b]) {
    return new Promise(res => setActions(els.actions, [[a, () => res(true), { cls: 'ghost' }], [b, () => res(false)]]));
  }

  function idle() { setActions(els.actions, [['Lancer', roll, { cls: 'primary' }]]); }
  idle();
  update();
  return { update };
})();

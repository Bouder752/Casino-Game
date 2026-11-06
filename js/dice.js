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
  const bet = new BetControl($('dice-bet'), { label: 'Mise', initial: 10 });
  let mode = 'under';
  const history = [];

  const target = () => +els.slider.value;
  const chance = () => (mode === 'under' ? target() : 100 - target());
  const multiplier = () => Math.floor((99 / chance()) * 10000) / 10000;

  function update() {
    const t = target();
    els.targetVal.textContent = t.toFixed(2);
    els.chance.textContent = chance().toFixed(2) + ' %';
    els.mult.textContent = '×' + multiplier().toFixed(4);
    els.profit.textContent = Util.fmt(Util.round2(bet.value * multiplier() - bet.value));
    els.rule.textContent = mode === 'under' ? `Gagné si le résultat < ${t.toFixed(2)}` : `Gagné si le résultat ≥ ${t.toFixed(2)}`;
    els.under.classList.toggle('active', mode === 'under');
    els.over.classList.toggle('active', mode === 'over');
    const pct = t + '%';
    els.track.style.setProperty('--t', pct);
    els.track.classList.toggle('over', mode === 'over');
  }
  els.slider.oninput = update;
  els.under.onclick = () => { mode = 'under'; update(); };
  els.over.onclick = () => { mode = 'over'; update(); };
  bet.onChange = update;

  function msg(text, cls = '') { els.msg.textContent = text; els.msg.className = 'msg ' + cls; }

  async function roll() {
    const amount = bet.value;
    if (amount <= 0) return msg('Choisissez une mise.', 'warn');
    if (!Wallet.take(amount)) return msg('Solde insuffisant.', 'warn');
    bet.setEnabled(false); els.slider.disabled = true;
    const r = Util.randInt(10000) / 100;
    els.result.className = 'dice-result rolling';
    for (let i = 0; i < 12; i++) {
      els.result.textContent = (Util.randInt(10000) / 100).toFixed(2);
      await Util.sleep(35);
    }
    const t = target();
    const win = mode === 'under' ? r < t : r >= t;
    els.result.textContent = r.toFixed(2);
    els.result.className = 'dice-result ' + (win ? 'win' : 'lose');
    els.marker.style.left = r + '%';
    els.marker.className = 'dice-marker show ' + (win ? 'win' : 'lose');
    if (win) {
      const payout = Util.round2(amount * multiplier());
      Wallet.give(payout);
      msg(`Gagné ! +${Util.fmt(Util.round2(payout - amount))} jetons`, 'win');
    } else msg(`Perdu ! −${Util.fmt(amount)} jetons`, 'lose');
    history.unshift({ r, win });
    if (history.length > 14) history.pop();
    els.history.innerHTML = '';
    history.forEach(h => els.history.appendChild(Util.el('span', 'pill ' + (h.win ? 'win' : 'lose'), h.r.toFixed(2))));
    bet.setEnabled(true); els.slider.disabled = false;
  }

  setActions(els.actions, [['Lancer', async () => { await roll(); idleBtn(); }, { cls: 'primary' }]]);
  function idleBtn() { els.actions.querySelectorAll('button').forEach(b => (b.disabled = false)); }
  update();
})();

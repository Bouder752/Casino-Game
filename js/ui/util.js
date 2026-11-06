// Réglages d'interface (vitesse d'animation 1x / 2x / 4x)
const Settings = (() => {
  const st = Object.assign({ speed: 1 }, Storage.get('boubouzino.settings', {}));
  const apply = () => document.documentElement.style.setProperty('--spd', String(1 / st.speed));
  apply();
  return {
    get speed() { return st.speed; },
    setSpeed(v) { st.speed = v; Storage.set('boubouzino.settings', st); apply(); },
  };
})();

// Utilitaires partagés
const Util = {
  // Toutes les attentes d'animation passent par ici : la vitesse 2x / 4x les raccourcit
  sleep(ms) { return new Promise(r => setTimeout(r, ms / Settings.speed)); },
  dur(ms) { return ms / Settings.speed; },
  round2(x) { return Math.round(x * 100) / 100; },
  fmt(n) {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  },
  signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Util.fmt(Math.abs(n)); },
  el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  },
};

// Liste globale des contrôles de mise (pour ré-appliquer les limites)
const BetControls = [];

// Contrôle de mise réutilisable (jetons)
class BetControl {
  constructor(container, { label, initial = 0, chips = [1, 5, 25, 100, 500], max = () => Infinity }) {
    this.value = initial;
    this.maxFn = max;
    this.base = initial;
    this.enabled = true;
    this.onChange = null;
    container.classList.add('betctl');
    container.innerHTML = `
      <div class="betctl-head"><span class="betctl-label"></span><span class="betctl-max"></span><span class="betctl-amount"></span></div>
      <div class="betctl-chips"></div>`;
    container.querySelector('.betctl-label').textContent = label;
    this.amountEl = container.querySelector('.betctl-amount');
    this.maxEl = container.querySelector('.betctl-max');
    const chipsEl = container.querySelector('.betctl-chips');
    chips.forEach(v => {
      const b = Util.el('button', `chip chip-${v}`, v);
      b.title = `+${v}`;
      b.onclick = () => { Sfx.play('chip'); this.set(this.value + v); };
      chipsEl.appendChild(b);
    });
    [['½', () => this.set(Math.floor(this.value / 2)), 'Diviser par 2'],
     ['×2', () => this.set(this.value * 2), 'Doubler'],
     ['✕', () => this.set(0), 'Effacer']].forEach(([t, fn, title]) => {
      const b = Util.el('button', 'chip-op', t);
      b.title = title;
      b.onclick = fn;
      chipsEl.appendChild(b);
    });
    this.buttons = [...container.querySelectorAll('button')];
    this.update();
    BetControls.push(this);
  }
  set(v) {
    if (!this.enabled) return;
    const m = this.maxFn();
    this.value = Math.max(0, Math.min(m, Util.round2(v)));
    this.update();
    if (this.onChange) this.onChange(this.value);
  }
  update() {
    const m = this.maxFn();
    this.amountEl.textContent = Util.fmt(this.value);
    this.maxEl.textContent = Number.isFinite(m) ? `max ${Util.fmt(m)}` : '';
  }
  // Ré-applique la limite (changement de manche / de mode)
  refresh() {
    const m = this.maxFn();
    if (this.value > m) this.value = m;
    this.update();
    if (this.onChange) this.onChange(this.value);
  }
  setEnabled(e) {
    this.enabled = e;
    this.buttons.forEach(b => (b.disabled = !e));
  }
}

// Barre d'actions : liste de [libellé, callback, options]
function setActions(container, list) {
  container.innerHTML = '';
  list.forEach(([label, fn, opts = {}]) => {
    const b = Util.el('button', 'btn ' + (opts.cls || ''), label);
    b.disabled = opts.disabled || false;
    b.onclick = async () => {
      if (container.dataset.busy === '1') return;
      Sfx.play('click');
      container.dataset.busy = '1';
      const all = [...container.querySelectorAll('button')];
      const was = all.map(x => x.disabled);
      all.forEach(x => (x.disabled = true));
      try { await fn(); } finally {
        container.dataset.busy = '0';
        // Si l'action n'a pas remplacé les boutons, on les réactive
        all.forEach((x, i) => { if (x.isConnected && container.contains(x)) x.disabled = was[i]; });
      }
    };
    container.appendChild(b);
  });
}

// Piles de jetons posées sur le tapis
const CHIP_VALUES = [500, 100, 25, 5, 1];
function chipBreakdown(amount) {
  const out = [];
  let a = Math.round(amount * 100) / 100;
  for (const v of CHIP_VALUES) while (a >= v - 1e-9 && out.length < 14) { out.push(v); a = Util.round2(a - v); }
  if (!out.length && amount > 0) out.push(1);
  return out;
}
function chipStack(amount, cls = '') {
  const st = Util.el('div', 'stack ' + cls);
  chipBreakdown(amount).slice(0, 10).forEach((v, i) => {
    const c = Util.el('div', `chipv chip-${v}`);
    c.style.setProperty('--i', i);
    c.style.animationDelay = `${i * 45}ms`;
    st.appendChild(c);
  });
  Sfx.play('chip');
  st.appendChild(Util.el('div', 'stack-amt', Util.fmt(amount)));
  return st;
}
// Met à jour la mise d'une case du tapis (anime seulement si le montant change)
function setSpot(spot, amount) {
  const holder = spot.querySelector('.spot-chips');
  if (holder._amount === amount && !spot.classList.contains('settled')) return;
  spot.classList.remove('settled');
  holder._amount = amount;
  holder.innerHTML = '';
  if (amount > 0) holder.appendChild(chipStack(amount));
  spot.classList.toggle('filled', amount > 0);
}
// Animation de règlement : 'win' (gains apportés), 'lose' (jetons ramassés), 'push'
function settleSpot(spot, outcome, payout = 0) {
  const holder = spot.querySelector('.spot-chips');
  spot.classList.add('settled');
  if (outcome === 'lose') {
    holder.querySelector('.stack')?.classList.add('collected');
  } else if (outcome === 'win' && payout > 0) {
    holder.appendChild(chipStack(payout, 'payout'));
  }
  spot.classList.add('flash-' + outcome);
  setTimeout(() => spot.classList.remove('flash-' + outcome), 1200);
}

// Affiche les actions proposées par un moteur de jeu ({ id, label, primary… })
function engineActions(container, actions, onAct) {
  setActions(container, actions.map(a => [a.label, () => onAct(a.id),
    { cls: a.primary ? 'primary' : a.danger ? 'danger' : a.ghost ? 'ghost' : '', disabled: a.disabled }]));
}
// Limite de mise : plafond de la manche et jetons disponibles
const betLimit = (game, ratio = 1) => () => (App.host ? Math.max(0, Math.min(App.host.maxBet(game), Math.floor(App.host.chips() * ratio * 100) / 100)) : 0);

// Symboles des messages (lisibles sans les couleurs)
const MSG_ICON = { win: '✓ ', lose: '✗ ', push: '= ', warn: '⚠ ' };
const iconMsg = (t, c) => (t && MSG_ICON[c] && !/^[✓✗=⚠]/.test(t) ? MSG_ICON[c] : '') + t;

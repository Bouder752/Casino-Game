// Utilitaires partagés
const Util = {
  // Entier aléatoire uniforme dans [0, n) via crypto (sans biais modulo)
  randInt(n) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return x % n;
  },
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
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

// Contrôle de mise réutilisable (jetons)
class BetControl {
  constructor(container, { label, initial = 0, chips = [1, 5, 25, 100, 500] }) {
    this.value = initial;
    this.enabled = true;
    this.onChange = null;
    container.classList.add('betctl');
    container.innerHTML = `
      <div class="betctl-head"><span class="betctl-label"></span><span class="betctl-amount"></span></div>
      <div class="betctl-chips"></div>`;
    container.querySelector('.betctl-label').textContent = label;
    this.amountEl = container.querySelector('.betctl-amount');
    const chipsEl = container.querySelector('.betctl-chips');
    chips.forEach(v => {
      const b = Util.el('button', `chip chip-${v}`, v);
      b.title = `+${v}`;
      b.onclick = () => this.set(this.value + v);
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
  }
  set(v) {
    if (!this.enabled) return;
    this.value = Math.max(0, Util.round2(v));
    this.update();
    if (this.onChange) this.onChange(this.value);
  }
  update() { this.amountEl.textContent = Util.fmt(this.value); }
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
      container.dataset.busy = '1';
      container.querySelectorAll('button').forEach(x => (x.disabled = true));
      try { await fn(); } finally { container.dataset.busy = '0'; }
    };
    container.appendChild(b);
  });
}

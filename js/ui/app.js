// Contrôleur d'interface : session en cours (partie ou mode libre), compteur de
// jetons, animation du détail des gains, file des transitions d'écran.
const App = (() => {
  const $ = id => document.getElementById(id);
  const views = {};
  let host = null;
  let shown = 0;          // valeur affichée par le compteur
  let tweenId = 0;
  let animating = 0;      // animations de règlement en cours
  const queue = [];       // transitions (shop, game over) en attente de la fin des animations
  const handlers = {};    // type → [fn] pour l'interface (runui)

  const on = (type, fn) => (handlers[type] = handlers[type] || []).push(fn);
  const fire = (type, data) => (handlers[type] || []).forEach(f => f(data));

  // ---------- Compteur de jetons qui défile ----------
  function syncBalance(immediate = false) {
    const el = $('balance');
    const target = host ? host.chips() : 0;
    const from = shown, id = ++tweenId;
    if (immediate || Math.abs(target - from) < 0.01) { shown = target; el.textContent = Util.fmt(target); fire('balance', target); return; }
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    const t0 = performance.now(), dur = Util.dur(Math.min(900, 250 + Math.abs(target - from) * 4));
    el.classList.toggle('up', target > from); el.classList.toggle('down', target < from);
    const step = t => {
      if (id !== tweenId) return;
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      shown = from + (target - from) * e;
      el.textContent = Util.fmt(Math.round(shown * 100) / 100);
      fire('balance', shown);
      if (k < 1) requestAnimationFrame(step);
      else { shown = target; el.textContent = Util.fmt(target); el.classList.remove('up', 'down'); }
    };
    requestAnimationFrame(step);
  }

  // ---------- Détail du gain, étape par étape ----------
  const fmtStep = s => s.kind === 'mult' ? `×${Util.fmt(Math.round(s.value * 100) / 100)}`
    : s.kind === 'add' ? `+${Math.round(s.value * 100)} %` : Util.signed(s.value);
  async function showSettlement(st) {
    animating++;
    try {
      const steps = st.steps || [];
      if (steps.length) {
        const box = $('ledger');
        box.innerHTML = '';
        box.hidden = false;
        const line = (cls, label, value) => {
          const r = Util.el('div', 'lg-line ' + cls);
          r.innerHTML = `<span>${label}</span><b>${value}</b>`;
          box.appendChild(r);
          return r;
        };
        line('base', `Mise ${Util.fmt(st.staked)} · rendu ${Util.fmt(st.baseBack)}`, '');
        for (const s of steps.filter(x => x.kind === 'adjust')) { await Util.sleep(260); pop(s); line('adjust', `${s.src.icon} ${s.src.name}${s.label ? ` <i>${s.label}</i>` : ''}`, fmtStep(s)); }
        await Util.sleep(200);
        line('gain', 'Gain brut', Util.signed(st.gain));
        for (const s of steps.filter(x => x.kind !== 'adjust')) {
          await Util.sleep(320);
          pop(s);
          line(s.kind, `${s.src ? s.src.icon + ' ' + s.src.name : ''}${s.label ? ` <i>${s.label}</i>` : ''}`, fmtStep(s));
        }
        await Util.sleep(300);
        line('total ' + (st.net > 0 ? 'win' : st.net < 0 ? 'lose' : 'push'), 'Total', Util.signed(st.net));
        Sfx.play(st.net > 0 ? 'coins' : 'push');
        setTimeout(() => { box.classList.add('out'); setTimeout(() => { box.hidden = true; box.classList.remove('out'); }, 400); }, Util.dur(2600) + 600);
      }
      if (st.net !== 0) floatGain(st.net);
      if (st.net > 0) {
        const felt = document.querySelector('.game:not([hidden]) .felt');
        const [x, y] = FX.from(felt);
        FX.burst(x, y, Math.round(8 + Math.min(40, st.net / Math.max(1, st.staked) * 8)), st.net >= st.staked * 2 ? 'coin' : 'chip');
      }
      if (isBig(st)) bigWin();
      syncBalance();
      await Util.sleep(steps.length ? 500 : 150);
    } finally {
      animating--;
      if (!animating) flush();
    }
  }
  // Un « gros coup » : au moins 4× la mise, ou la moitié de l'objectif de la table
  function isBig(st) {
    const t = host && host.state.table;
    return st.net > 0 && (st.net >= Math.max(40, st.staked * 4) || (t && st.net >= t.target * 0.5 && st.net >= 30));
  }
  function bigWin() {
    document.body.classList.remove('bigwin'); void document.body.offsetWidth;
    document.body.classList.add('bigwin');
    FX.rain();
    Sfx.play('boom');
    setTimeout(() => document.body.classList.remove('bigwin'), 900);
  }
  function pop(s) {
    if (!s.src) return;
    fire('flash', { uid: s.src.uid, text: fmtStep(s) });
    Sfx.play('joker');
  }
  function floatGain(net) {
    const f = Util.el('div', 'gain-float ' + (net > 0 ? 'win' : 'lose'), Util.signed(net));
    $('balance').parentElement.appendChild(f);
    setTimeout(() => f.remove(), 1400);
  }

  // Les transitions (shop, fin de partie) attendent la fin des animations
  function defer(fn) { if (animating || (host && host.busy())) queue.push(fn); else fn(); }
  function flush() { while (queue.length) queue.shift()(); }

  // ---------- Session ----------
  function attach(h) {
    host = h;
    queue.length = 0;
    Odds.cancel();
    if (!h) { syncBalance(true); fire('session'); return; }
    h.on((type, data) => {
      if (h !== host) return; // ancienne session
      switch (type) {
        case 'chips': if (!animating && !h.busy()) syncBalance(); BetControls.forEach(b => b.update()); break;
        case 'change': fire('change'); break;
        case 'flash': fire('flash', data); break;
        case 'toast': fire('toast', data.text); break;
        case 'sound': Sfx.play(data.name); break;
        case 'table': fire('table'); break;
        case 'choose': defer(() => fire('choose')); break;
        case 'shop': setTimeout(() => defer(() => fire('shop')), Util.dur(700)); break;
        case 'victory': setTimeout(() => defer(() => fire('victory')), Util.dur(700)); break;
        case 'over': setTimeout(() => defer(() => fire('over', data)), Util.dur(700)); break;
      }
    });
    syncBalance(true);
    Object.values(views).forEach(v => v.reset && v.reset());
    fire('session');
  }

  return {
    get host() { return host; },
    attach, on, fire, syncBalance, showSettlement, defer,
    register: v => (views[v.id] = v),
    view: id => views[id],
    views: () => Object.values(views),
    isAnimating: () => animating > 0,
    // Les vues encadrent leurs animations : les transitions attendent la fin
    async animate(fn) { animating++; try { return await fn(); } finally { animating--; if (!animating) flush(); } },
  };
})();

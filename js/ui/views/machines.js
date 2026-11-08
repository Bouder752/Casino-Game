// Vue des trois machines « à grille » : Confiserie Céleste (paie partout + bulles),
// Chats Mousquetaires (lignes + duels « En garde ! ») et Chaudron Magique (grappes + cases multiplicatrices).
// Les symboles tombent par colonnes, les gagnants explosent, la grille se remplit par le haut.
// Tout le résultat vient du moteur (Machines) : la vue raconte les étapes, sans rien tirer elle-même.
const MachineView = (() => {
  const MC = CONFIG.games.machines;
  const INFO = {
    confiserie: { title: 'Confiserie', sub: 'Céleste', scatter: 'Montgolfières', fs: 'Des bulles multiplicatrices tombent pendant les tours', buy: 'tours gratuits avec des <b>bulles multiplicatrices</b> (×2 à ×100)' },
    mousquetaires: { title: 'Chats', sub: 'Mousquetaires', scatter: 'Sceaux', fs: 'Duel à l\'aube : chaque duel reste jusqu\'à la fin', buy: 'tours « <b>Duel à l\'aube</b> » : chaque rouleau en duel reste wild jusqu\'à la fin' },
    chaudron: { title: 'Chaudron', sub: 'Magique', scatter: 'Grimoires', fs: 'Les cases multiplicatrices restent jusqu\'à la fin', buy: 'tours gratuits où les <b>cases multiplicatrices</b> restent jusqu\'à la fin' },
  };
  const NAME = id => (SlotArt.NAMES[id] || id).replace(/ \(.*\)$/, '');
  const R = v => Util.fmt(Math.round(v));
  const T = (x, y, extra = '') => `translate(${x * 100}%, ${y * 100}%)${extra}`;

  function create(stage, K) {
    let id = null, D = null;
    let grid = [];          // grid[x][y] = élément affiché
    let anims = [];
    const els = {};
    const dur = ms => (K.quick() ? Math.min(60, ms) : Util.dur(K.turbo() ? ms * 0.55 : ms));
    const sleep = ms => Util.sleep(dur(ms));
    function anim(el, frames, opts) {
      const a = el.animate(frames, { fill: 'forwards', ...opts });
      anims.push(a);
      return a.finished.then(() => {}, () => {});
    }
    // Arrêt rapide : toutes les animations en cours sautent à leur fin
    function stop() { anims.forEach(a => { try { if (a.playState === 'running') a.finish(); } catch (e) { /* déjà fini */ } }); }

    function cellEl(c, x, y) {
      const d = Util.el('div', `mx-cell sym-${c.id}`);
      d.innerHTML = SlotArt.svg(c.id) + (c.m ? `<b class="mx-mult">×${c.m}</b>` : '');
      d.style.transform = T(x, y);
      d._p = [x, y];
      els.grid.appendChild(d);
      return d;
    }
    // Grille de départ décorative (symboles possibles de cette machine)
    function idleGrid() {
      const pool = D.symbols;
      return Array.from({ length: D.cols }, () => Array.from({ length: D.rows }, () => ({ id: RNG.fx.weighted(pool).id })));
    }
    function mount(machineId) {
      id = machineId; D = MC[id];
      stage.dataset.machine = id;
      stage.style.setProperty('--cols', D.cols);
      stage.style.setProperty('--rows', D.rows);
      stage.innerHTML = `<div class="mx-spots"></div><div class="mx-grid"></div><div class="mx-reels"></div><svg class="mx-lines" aria-hidden="true"></svg>`;
      els.spots = stage.querySelector('.mx-spots');
      els.grid = stage.querySelector('.mx-grid');
      els.reels = stage.querySelector('.mx-reels');
      els.lines = stage.querySelector('.mx-lines');
      if (id === 'chaudron') {
        els.spots.innerHTML = Array.from({ length: D.cols * D.rows }, (_, i) => `<i style="--x:${i % D.cols};--y:${Math.floor(i / D.cols)}"></i>`).join('');
      }
      drawStatic(idleGrid());
    }
    function drawStatic(g) {
      anims.forEach(a => a.cancel()); anims = [];
      els.grid.innerHTML = '';
      grid = g.map((col, x) => col.map((c, y) => cellEl(c, x, y)));
    }
    function paintSpots(spots = {}) {
      if (id !== 'chaudron') return;
      [...els.spots.children].forEach((s, i) => {
        const v = spots[(i % D.cols) + ':' + Math.floor(i / D.cols)];
        const was = s.dataset.v;
        s.className = v === undefined ? '' : v === 0 ? 'on' : 'mult';
        s.textContent = v >= 2 ? `×${v}` : '';
        s.dataset.v = v === undefined ? '' : v;
        if (v >= 2 && String(v) !== was) { s.classList.add('up'); }
      });
    }
    // Rouleaux en duel (wild avec multiplicateur) : un panneau qui couvre la colonne
    function wildReel(x, m, fresh) {
      let w = els.reels.querySelector(`[data-x="${x}"]`);
      if (!w) {
        w = Util.el('div', 'mx-wild');
        w.dataset.x = x;
        w.style.setProperty('--x', x);
        els.reels.appendChild(w);
      }
      w.innerHTML = `<div class="mxw-art">${SlotArt.svg('rapiere')}${SlotArt.svg('rapiere')}</div><b class="mxw-k">WILD</b><b class="mxw-m">×${m}</b>`;
      if (fresh) { w.classList.remove('in'); void w.offsetWidth; w.classList.add('in'); }
      return w;
    }
    const clearWild = keep => [...els.reels.children].forEach(w => { if (!keep || !(w.dataset.x in keep)) w.remove(); });

    // ---------- Chute d'une grille complète (avec suspense quand les bonus tombent) ----------
    async function drop(g, { scatterId, min }) {
      anims = anims.filter(a => a.playState !== 'finished');
      els.lines.innerHTML = '';
      stage.classList.remove('has-wins');
      const old = grid.flat();
      old.forEach(el => {
        const [x, y] = el._p;
        anim(el, [{ transform: T(x, y), opacity: 1 }, { transform: T(x, y + D.rows), opacity: 0 }], { duration: dur(240), delay: dur(x * 30), easing: 'ease-in' }).then(() => el.remove());
      });
      await sleep(110);
      let seen = 0, extra = 0, landed = 0;
      const done = [];
      grid = g.map((col, x) => {
        const antic = seen >= min - 1 && x > 0;
        if (antic) extra += 650;
        const scat = col.some(c => c.id === scatterId);
        const delay = dur(x * 95 + extra);
        seen += col.filter(c => c.id === scatterId).length;
        if (antic && !K.quick()) setTimeout(() => { stage.classList.add('tense'); Sfx.play('antic'); }, Math.max(0, delay - dur(500)));
        const colEls = col.map((c, y) => {
          const el = cellEl(c, x, y);
          done.push(anim(el, [
            { transform: T(x, y - D.rows - 0.5), opacity: 1 },
            { transform: T(x, y), opacity: 1, offset: 0.82 },
            { transform: T(x, y - 0.07), opacity: 1, offset: 0.92 },
            { transform: T(x, y), opacity: 1 },
          ], { duration: dur(420), delay: delay + dur((D.rows - 1 - y) * 22), easing: 'cubic-bezier(.35,0,.6,1)', fill: 'both' }));
          return el;
        });
        setTimeout(() => {
          Sfx.play('stopn', x);
          if (scat) { landed += col.filter(c => c.id === scatterId).length; Sfx.play('scatter', landed); colEls.forEach(e => { if (e.classList.contains('sym-' + scatterId)) e.classList.add('land'); }); }
        }, delay + dur(420));
        return colEls;
      });
      await Promise.all(done);
      stage.classList.remove('tense');
    }

    // ---------- Cascade : les gagnants explosent, la colonne tombe, de nouveaux symboles arrivent ----------
    async function cascade(cells, next) {
      const gone = new Set(cells.map(([x, y]) => x + ':' + y));
      const pops = cells.map(([x, y]) => {
        const el = grid[x][y];
        return anim(el, [
          { transform: T(x, y, ' scale(1)'), opacity: 1, filter: 'brightness(1)' },
          { transform: T(x, y, ' scale(1.22)'), opacity: 1, filter: 'brightness(1.9)', offset: 0.45 },
          { transform: T(x, y, ' scale(.15)'), opacity: 0 },
        ], { duration: dur(380), easing: 'ease-in' }).then(() => el.remove());
      });
      Sfx.play('chip');
      await Promise.all(pops);
      const moves = [];
      grid = grid.map((col, x) => {
        const keep = col.map((el, y) => [el, y]).filter(([, y]) => !gone.has(x + ':' + y));
        const fresh = D.rows - keep.length;
        const out = [];
        for (let y = 0; y < fresh; y++) {
          const el = cellEl(next[x][y], x, y);
          moves.push(anim(el, [{ transform: T(x, y - fresh - 0.3) }, { transform: T(x, y) }], { duration: dur(360), delay: dur(x * 30), easing: 'cubic-bezier(.4,0,.6,1.25)', fill: 'both' }));
          out.push(el);
        }
        keep.forEach(([el, oy], k) => {
          const ny = fresh + k;
          el._p = [x, ny];
          if (ny !== oy) moves.push(anim(el, [{ transform: T(x, oy) }, { transform: T(x, ny) }], { duration: dur(320), delay: dur(x * 30), easing: 'cubic-bezier(.4,0,.6,1.25)', fill: 'both' }));
          out.push(el);
        });
        return out;
      });
      await Promise.all(moves);
    }

    const markWins = cells => {
      grid.flat().forEach(el => el.classList.remove('win'));
      cells.forEach(([x, y]) => grid[x][y] && grid[x][y].classList.add('win'));
      stage.classList.toggle('has-wins', cells.length > 0);
    };
    const winText = w => `${w.count}× ${NAME(w.symbol)}${w.mult > 1 ? ` ×${w.mult}` : ''} · ${R(w.win)}`;

    // ---------- Un tour « cascade » (Confiserie, Chaudron) ----------
    async function playCascade(spin, r, label, acc) {
      const sc = D.scatter;
      paintSpots(spin.steps[0].spots);
      await drop(spin.steps[0].grid, { scatterId: sc.id, min: sc.min });
      let run = 0;
      for (let i = 0; i < spin.steps.length; i++) {
        const st = spin.steps[i];
        if (!st.wins.length) break;
        markWins(st.wins.flatMap(w => w.cells));
        run += st.total;
        K.win(st.wins.length === 1 ? winText(st.wins[0]) : `${st.wins.length} gains · ${R(st.total)}`, 'line');
        Sfx.play(i ? 'tier' : 'win', Math.min(5, i + 1));
        K.led(acc + run, label);
        await sleep(st.wins.some(w => w.mult > 1) ? 900 : 620);
        // les cases qui explosent sont marquées / doublent (Chaudron)
        if (id === 'chaudron') paintSpots(i + 1 < spin.steps.length ? spin.steps[i + 1].spots : spin.spotsEnd);
        markWins([]);
        if (!spin.steps[i + 1]) break;
        await cascade(st.wins.flatMap(w => w.cells), spin.steps[i + 1].grid);
      }
      if (id === 'chaudron') paintSpots(spin.spotsEnd);
      // Bulles : elles multiplient le gain de toute la cascade
      if (spin.mult > 0) {
        grid.flat().forEach(el => { if (el.classList.contains('sym-bulle')) el.classList.add('fire'); });
        Sfx.play('joker');
        K.win(`Bulles : ×${spin.mult} !`, 'line show-feature');
        await sleep(800);
        K.win(`${R(spin.base)} × ${spin.mult} = ${R(spin.base * spin.mult)}`, 'show');
        Sfx.play('bigwin');
        K.led(acc + spin.total - spin.scatterWin, label);
        await sleep(900);
      }
      if (spin.scatterWin) {
        markWins(spin.scatterCells);
        K.win(`${spin.scatters} ${INFO[id].scatter} · ${R(spin.scatterWin)}`, 'line');
        Sfx.play('win');
        await sleep(700);
      }
      return spin.total;
    }

    // ---------- Un tour « lignes + duels » (Mousquetaires) ----------
    async function playLines(spin, r, label, acc) {
      clearWild(spin.sticky);
      Object.entries(spin.sticky).forEach(([x, m]) => wildReel(+x, m, false));
      await drop(spin.grid, { scatterId: D.scatter.id, min: D.scatter.min });
      for (const d of spin.duels) {
        const el = grid[d.x][d.y];
        el.classList.add('duel');
        Sfx.play('antic');
        K.win('⚔ En garde !', 'line show-feature');
        await sleep(520);
        const w = wildReel(d.x, '?', true);
        const m = w.querySelector('.mxw-m');
        const vals = MC.mousquetaires.duel.mults.map(([v]) => v);
        for (let k = 0; k < 9 && !K.quick(); k++) { m.textContent = '×' + RNG.fx.pick(vals); Sfx.play('tick'); await sleep(70); }
        m.textContent = `×${d.m}`;
        w.classList.add('won');
        Sfx.play(d.m >= 10 ? 'bigwin' : 'joker');
        K.win(`Duel gagné : rouleau WILD ×${d.m}`, 'line show-feature');
        await sleep(650);
      }
      if (!spin.wins.length) { if (spin.scatters >= D.scatter.min) { markWins(spin.scatterCells); await sleep(500); } return spin.total; }
      const W = stage.clientWidth, Hh = stage.clientHeight;
      els.lines.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
      const cw = W / D.cols, ch = Hh / D.rows;
      const colors = ['#ffd23f', '#ff5c8a', '#4fe08a', '#4fb6ff', '#c084fc', '#ff9d1f'];
      const lineSvg = (w, i) => `<polyline points="${MC.mousquetaires.lines[w.line].map((row, x) => `${(x + 0.5) * cw},${(row + 0.5) * ch}`).join(' ')}" class="wl" style="--c:${colors[i % colors.length]}"/>`;
      els.lines.innerHTML = spin.wins.map(lineSvg).join('');
      markWins(spin.wins.flatMap(w => w.cells));
      K.led(acc + spin.total, label);
      K.win(`+${R(spin.total)}`, 'show');
      Sfx.play(spin.total >= r.bet * 5 ? 'bigwin' : 'win');
      await sleep(700);
      if (spin.wins.length > 1 && !K.quick()) {
        for (const [i, w] of spin.wins.slice(0, 6).entries()) {
          if (K.quick()) break;
          els.lines.innerHTML = lineSvg(w, i);
          markWins(w.cells);
          K.win(winText(w), 'line');
          Sfx.play('chip');
          await sleep(480);
        }
        els.lines.innerHTML = spin.wins.map(lineSvg).join('');
        markWins(spin.wins.flatMap(w => w.cells));
        K.win(`+${R(spin.total)}`, 'show');
        await sleep(350);
      }
      return spin.total;
    }

    const playSpin = (spin, r, label, acc) => (spin.kind === 'lines' ? playLines(spin, r, label, acc) : playCascade(spin, r, label, acc));

    // ---------- Partie complète : tour payé puis tours gratuits ----------
    async function play(r) {
      const spins = r.spins;
      clearWild(null);
      if (id === 'chaudron') paintSpots({});
      K.led(null);
      const first = await playSpin(spins[0], r, 'Gain', 0);
      if (spins.length <= 1) {
        if (!first) K.win('', '');
        else K.win(first < r.bet ? `${R(first)} récupérés` : `+${R(first)}`, 'show' + (first < r.bet ? ' under' : ''));
        return false;
      }
      const award = id === 'chaudron' ? spins[0].award : D.scatter.spins;
      Sfx.play('fanfare');
      await K.splash(`<div class="sli-k">${spins[0].scatters} ${INFO[id].scatter} !</div><div class="sli-big">${award}</div><div class="sli-t">tours gratuits</div><div class="sli-s">${INFO[id].fs}</div><div class="sli-tap">Touchez pour commencer</div>`, 2600, 'in');
      K.bonus(true);
      let acc = first;
      const total = spins.length - 1;
      for (let k = 1; k < spins.length; k++) {
        K.fs(`Tour gratuit <b>${k} / ${total}</b><span>Gain du bonus <b>${Util.fmt(Math.round(acc))}</b></span>`);
        K.win('', '');
        acc += await playSpin(spins[k], r, 'Gain bonus', acc);
        K.led(Math.round(acc), 'Gain bonus');
        if (spins[k].retrigger) {
          Sfx.play('fanfare');
          await K.splash(`<div class="sli-big">+${spins[k].retrigger}</div><div class="sli-t">tours gratuits</div>`, 1400, 'in small');
        }
      }
      K.fs(null);
      await K.bonusEnd(r, Math.min(r.total, acc));
      clearWild(null);
      if (id === 'chaudron') paintSpots({});
      K.bonus(false);
      return true;
    }

    // ---------- Table des gains (avec la mise actuelle) ----------
    function paytable(bet, syms, wild) {
      const f = v => Util.fmt(Math.round(v * 100) / 100);
      const sym = s => `<td class="pt-sym">${SlotArt.svg(s)}</td>`;
      const cer = wild && wild.wild ? `<p class="wild-note">🍒 Triple Cerise : ${id === 'mousquetaires' ? `les cerises remplacent n'importe quel symbole (ligne complétée payée × ${String(wild.ratio).replace('.', ',')})` : `les gains de cerises sont ×${MC.cerisePay}`}.</p>` : '';
      if (id === 'confiserie') {
        return `<p class="hint"><b>Paie partout</b> : 8 symboles identiques ou plus, n'importe où sur la grille. Gains pour 8-9 · 10-11 · 12+ avec la mise actuelle (${Util.fmt(bet)}). Les gagnants explosent et de nouveaux bonbons tombent (cascades).</p>
          <table class="paytable">${syms.slice().reverse().map(s => `<tr>${sym(s.id)}<td>${s.pay.map(p => f(p * bet * D.scale)).join(' · ')}</td></tr>`).join('')}</table>
          <div class="pt-special"><div class="pt-sym">${SlotArt.svg('montgolfiere')}</div><p><b>Montgolfière (Bonus)</b> — paie n'importe où : 4 = ×${D.scatter.pay[0]}, 5 = ×${D.scatter.pay[1]}, 6 = ×${D.scatter.pay[2]} la mise. 4 Montgolfières = <b>${D.scatter.spins} tours gratuits</b> ; 3 pendant le bonus = +${D.scatter.retrigger} tours.</p></div>
          <div class="pt-special"><div class="pt-sym">${SlotArt.svg('bulle')}</div><p><b>Bulle multiplicatrice</b> — seulement pendant les tours gratuits, de ×2 à ×100. À la fin d'une cascade gagnante, toutes les bulles s'additionnent et multiplient le gain de la cascade.</p></div>${cer}`;
      }
      if (id === 'chaudron') {
        const tiers = D.tiers.map((t, i) => (i === D.tiers.length - 1 ? `${t}+` : `${t}-${D.tiers[i + 1] - 1}`));
        return `<p class="hint"><b>Grappes</b> : 5 symboles identiques ou plus qui se touchent (haut, bas, gauche, droite). Gains selon la taille (${tiers.join(' · ')}) avec la mise actuelle (${Util.fmt(bet)}).</p>
          <table class="paytable small">${syms.slice().reverse().map(s => `<tr>${sym(s.id)}<td>${s.pay.map(p => f(p * bet * D.scale)).join(' · ')}</td></tr>`).join('')}</table>
          <div class="pt-special"><div class="pt-sym mx-spot-demo">×2</div><p><b>Cases magiques</b> — une case où un symbole explose est marquée. Si un symbole y explose encore, elle devient <b>×2</b>, puis double à chaque explosion (jusqu'à ×${D.spotMax}). Les multiplicateurs sous une grappe s'additionnent. En jeu de base, les cases s'effacent à chaque tour ; <b>pendant les tours gratuits, elles restent</b>.</p></div>
          <div class="pt-special"><div class="pt-sym">${SlotArt.svg('grimoire')}</div><p><b>Grimoire (Bonus)</b> — 3, 4, 5 ou 6 Grimoires = ${D.scatter.spins.join(', ')} tours gratuits (et autant de tours en plus pendant le bonus, jusqu'à ${D.scatter.retrigger.join('/')}).</p></div>${cer}`;
      }
      const lb = bet / D.lines.length;
      return `<p class="hint">${D.lines.length} lignes, de gauche à droite. Gains pour 3 · 4 · 5 symboles avec la mise actuelle (${Util.fmt(bet)}).</p>
        <table class="paytable">${syms.slice().reverse().map(s => `<tr>${sym(s.id)}<td>${s.pay.map(p => f(p * lb * D.scale)).join(' · ')}</td></tr>`).join('')}</table>
        <div class="pt-special"><div class="pt-sym">${SlotArt.svg('engarde')}</div><p><b>En garde !</b> — rouleaux 2 à 4. Un duel éclate : le rouleau entier devient <b>WILD</b> avec un multiplicateur de ×2 à ×100. Sur une ligne, les multiplicateurs des rouleaux en duel s'additionnent.</p></div>
        <div class="pt-special"><div class="pt-sym">${SlotArt.svg('sceau')}</div><p><b>Sceau royal (Bonus)</b> — rouleaux 1, 3 et 5. 3 Sceaux = <b>${D.scatter.spins} tours « Duel à l'aube »</b> : chaque rouleau en duel <b>reste WILD avec son multiplicateur</b> jusqu'à la fin. 3 Sceaux pendant le bonus = +${D.scatter.retrigger} tours.</p></div>${cer}`;
    }

    return { mount, play, stop, paytable, info: () => INFO[id], id: () => id };
  }
  return { create, INFO };
})();

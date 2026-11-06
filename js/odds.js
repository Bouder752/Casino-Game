// Probabilités en direct pour l'Ultimate Texas Hold'em.
// Pré-flop : simulation Monte-Carlo ; flop et river : calcul exact.
// Seules les cartes visibles par le joueur sont utilisées. Si le croupier a été soudoyé
// (Pot-de-vin), ses cartes sont connues et le calcul en tient compte.
const Odds = (() => {
  let token = 0;

  function remaining(known) {
    const used = new Set(known.map(c => c.rank * 4 + c.suit));
    const skip = typeof Casino !== 'undefined' ? Casino.excludedRanks() : [];
    const out = [];
    for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) if (!used.has(r * 4 + s) && !skip.includes(r)) out.push({ rank: r, suit: s });
    return out;
  }

  function result(cats, n, win, tie, lose, exact, done) {
    const tot = win + tie + lose || 1;
    return { cats: Array.from(cats, x => x / n), win: win / tot, tie: tie / tot, lose: lose / tot, exact, done };
  }

  // hole : 2 ou 3 cartes ; board : 0, 3 ou 5 cartes visibles ; dealer : [] ou 2 cartes connues
  function compute(hole, board, onUpdate, dealer = []) {
    const my = ++token;
    const knownDealer = dealer.length === 2;
    const rem = remaining([...hole, ...board, ...dealer]);
    const cats = new Float64Array(10);
    let win = 0, tie = 0, lose = 0, n = 0;
    const tick = () => new Promise(r => setTimeout(r, 0));
    const alive = () => my === token;
    const H = hole.length;
    const p = new Array(H + 5), d = new Array(7);
    hole.forEach((c, i) => (p[i] = c));
    board.forEach((c, i) => { p[H + i] = c; d[2 + i] = c; });
    if (knownDealer) { d[0] = dealer[0]; d[1] = dealer[1]; }
    const missing = 5 - board.length;

    // Compare la main du joueur à toutes les mains possibles du croupier (ou à la main connue)
    function versus(ps, pool, excl1, excl2) {
      if (knownDealer) {
        const ds = eval7(d);
        if (ps > ds) win++; else if (ps < ds) lose++; else tie++;
        return;
      }
      const L = pool.length;
      for (let a = 0; a < L; a++) {
        if (a === excl1 || a === excl2) continue;
        d[0] = pool[a];
        for (let b = a + 1; b < L; b++) {
          if (b === excl1 || b === excl2) continue;
          d[1] = pool[b];
          const ds = eval7(d);
          if (ps > ds) win++; else if (ps < ds) lose++; else tie++;
        }
      }
    }

    if (missing === 5) {
      return (async () => {
        const N = 40000, CHUNK = 4000, pool = rem.slice(), need = knownDealer ? 5 : 7;
        while (n < N) {
          for (let it = 0; it < CHUNK; it++) {
            for (let j = 0; j < need; j++) {
              const k = j + Math.floor(Math.random() * (pool.length - j));
              const t = pool[j]; pool[j] = pool[k]; pool[k] = t;
            }
            for (let j = 0; j < 5; j++) p[H + j] = d[2 + j] = pool[j];
            if (!knownDealer) { d[0] = pool[5]; d[1] = pool[6]; }
            const ps = eval7(p), ds = eval7(d);
            cats[ps >> 20]++;
            if (ps > ds) win++; else if (ps < ds) lose++; else tie++;
            n++;
          }
          if (!alive()) return;
          onUpdate(result(cats, n, win, tie, lose, false, n >= N));
          await tick();
          if (!alive()) return;
        }
      })();
    }

    if (missing === 2) {
      return (async () => {
        const L = rem.length;
        let since = 0;
        for (let i = 0; i < L; i++) {
          for (let j = i + 1; j < L; j++) {
            p[H + 3] = d[5] = rem[i]; p[H + 4] = d[6] = rem[j];
            const ps = eval7(p);
            cats[ps >> 20]++; n++;
            versus(ps, rem, i, j);
            if (++since >= 40) {
              since = 0;
              if (!alive()) return;
              onUpdate(result(cats, n, win, tie, lose, true, false));
              await tick();
              if (!alive()) return;
            }
          }
        }
        if (alive()) onUpdate(result(cats, n, win, tie, lose, true, true));
      })();
    }

    // River : tout est connu côté joueur
    const ps = eval7(p);
    cats[ps >> 20] = 1; n = 1;
    versus(ps, rem, -1, -1);
    onUpdate(result(cats, n, win, tie, lose, true, true));
    return Promise.resolve();
  }

  function cancel() { token++; }
  return { compute, cancel };
})();

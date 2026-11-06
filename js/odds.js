// Probabilités en direct pour l'Ultimate Texas Hold'em.
// Pré-flop : simulation Monte-Carlo ; flop et river : calcul exact.
// Seules les cartes visibles par le joueur sont utilisées (les cartes du croupier restent inconnues).
const Odds = (() => {
  let token = 0;

  function remaining(known) {
    const used = new Set(known.map(c => c.rank * 4 + c.suit));
    const out = [];
    for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) if (!used.has(r * 4 + s)) out.push({ rank: r, suit: s });
    return out;
  }

  function result(cats, n, win, tie, lose, exact, done) {
    const tot = win + tie + lose || 1;
    return { cats: Array.from(cats, x => x / n), win: win / tot, tie: tie / tot, lose: lose / tot, exact, done };
  }

  // hole : 2 cartes ; board : 0, 3 ou 5 cartes visibles
  function compute(hole, board, onUpdate) {
    const my = ++token;
    const rem = remaining([...hole, ...board]);
    const cats = new Float64Array(10);
    let win = 0, tie = 0, lose = 0, n = 0;
    const tick = () => new Promise(r => setTimeout(r, 0));
    const alive = () => my === token;

    if (board.length === 0) {
      return (async () => {
        const N = 40000, CHUNK = 4000;
        const p = new Array(7), d = new Array(7), pool = rem.slice();
        p[0] = hole[0]; p[1] = hole[1];
        while (n < N) {
          for (let it = 0; it < CHUNK; it++) {
            // tirage partiel sans remise : 5 cartes du tableau + 2 du croupier
            for (let j = 0; j < 7; j++) {
              const k = j + Math.floor(Math.random() * (pool.length - j));
              const t = pool[j]; pool[j] = pool[k]; pool[k] = t;
            }
            for (let j = 0; j < 5; j++) p[2 + j] = d[2 + j] = pool[j];
            d[0] = pool[5]; d[1] = pool[6];
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

    if (board.length === 3) {
      return (async () => {
        const p = [hole[0], hole[1], ...board, null, null];
        const d = [null, null, ...board, null, null];
        const L = rem.length;
        let since = 0;
        for (let i = 0; i < L; i++) {
          for (let j = i + 1; j < L; j++) {
            p[5] = d[5] = rem[i]; p[6] = d[6] = rem[j];
            const ps = eval7(p);
            cats[ps >> 20]++; n++;
            for (let a = 0; a < L; a++) {
              if (a === i || a === j) continue;
              d[0] = rem[a];
              for (let b = a + 1; b < L; b++) {
                if (b === i || b === j) continue;
                d[1] = rem[b];
                const ds = eval7(d);
                if (ps > ds) win++; else if (ps < ds) lose++; else tie++;
              }
            }
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

    // River : tout est connu côté joueur, seules les cartes du croupier varient
    const p = [...hole, ...board];
    const ps = eval7(p);
    cats[ps >> 20] = 1; n = 1;
    const d = [null, null, ...board];
    for (let a = 0; a < rem.length; a++) {
      d[0] = rem[a];
      for (let b = a + 1; b < rem.length; b++) {
        d[1] = rem[b];
        const ds = eval7(d);
        if (ps > ds) win++; else if (ps < ds) lose++; else tie++;
      }
    }
    onUpdate(result(cats, n, win, tie, lose, true, true));
    return Promise.resolve();
  }

  function cancel() { token++; }
  return { compute, cancel };
})();

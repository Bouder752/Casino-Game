// =====================================================================
//  SIMULATION — joue des parties complètes avec une stratégie simple,
//  sans interface, pour équilibrer la config.
//    Navigateur : ouvrez la console et tapez  Sim.run(1000)
//    Node       : node tools/simulate.js 1000
//  Stratégies : 'sniper' (défaut : Dice à fort multiplicateur), 'blackjack'
//  (blackjack de base, Dice en dernier recours) ou opts.game pour un seul jeu.
// =====================================================================
const Sim = (() => {
  const freshMeta = () => ({ prestige: 0, jackpot: 1, unlocked: [], felt: '', back: '', best: 0, runs: 0, wins: 0 });

  // ---- Stratégies de jeu (décision pour l'action en cours) ----
  const decide = {
    bj(H, r) {
      const ids = H.actions().filter(a => !a.disabled).map(a => a.id);
      if (ids.includes('noinsure')) return 'noinsure';
      if (r.stage === 'bust') return ids.includes('redo') ? 'redo' : 'accept';
      const h = r.hands[r.active];
      const v = BlackjackEngine.value(h.cards), up = BlackjackEngine.cardVal(r.dealer[0]);
      if (ids.includes('split') && (h.cards[0].rank === 14 || h.cards[0].rank === 8)) return 'split';
      if (ids.includes('double') && !v.soft && (v.total === 11 || (v.total === 10 && up <= 9))) return 'double';
      if (v.soft) return v.total <= 17 ? 'hit' : 'stand';
      if (v.total <= 11) return 'hit';
      if (v.total <= 16) return up >= 7 ? 'hit' : 'stand';
      return 'stand';
    },
    uth(H, r) {
      const ids = H.actions().filter(a => !a.disabled).map(a => a.id);
      const ranks = r.player.map(c => c.rank).sort((a, b) => b - a);
      if (r.stage === 'preflop') {
        const good = ranks[0] === ranks[1] || ranks[0] === 14 || (ranks[0] >= 13 && ranks[1] >= 10);
        return good && ids.includes('bet4') ? 'bet4' : 'check';
      }
      const mine = eval7([...r.player, ...r.board.slice(0, r.shown)]) >> 20;
      const board = r.shown >= 5 ? eval7(r.board) >> 20 : 0;
      if (r.stage === 'flop') return mine >= 2 || (mine === 1 && board === 0) ? (ids.includes('bet2') ? 'bet2' : 'check') : 'check';
      return mine > board || ranks[0] === 14 ? (ids.includes('bet1') ? 'bet1' : 'fold') : 'fold';
    },
    other: H => (H.actions().some(a => a.id === 'reroll') ? 'reroll' : 'accept'),
  };

  function playGame(H, id, params) {
    let res = H.startPlay(id, params);
    if (res.error) return null;
    let guard = 0;
    while (!res.settlement && guard++ < 50) {
      const a = (decide[id] || decide.other)(H, res.round);
      res = H.act(a);
      if (res.error) res = H.act(H.actions().find(x => !x.disabled).id);
    }
    return res.settlement;
  }

  // ---- Build : jeu favori selon les jokers possédés ----
  const GAME_TAG = { Blackjack: 'bj', Roulette: 'roulette', Dice: 'dice', "Hold'em": 'uth', Machine: 'slots' };
  function favorite(H) {
    const c = {};
    H.state.jokers.forEach(j => (JOKERS[j.id].tags || []).forEach(t => { const g = GAME_TAG[t]; if (g) c[g] = (c[g] || 0) + 1; }));
    const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : null;
  }
  // ---- Stratégie du shop : jokers utiles au build, en gardant de quoi viser le palier ----
  const RANK = { legendaire: 3, rare: 2, commun: 1 };
  function value(H, id) {
    const d = JOKERS[id], tags = d.tags || [], fav = favorite(H);
    let v = RANK[d.rarity];
    if (tags.includes('Tous les jeux') || tags.includes('Multiplicateur')) v += 2;
    if (tags.includes('Grandit')) v += 1;
    const g = tags.map(t => GAME_TAG[t]).find(Boolean);
    if (g) v += !fav || g === fav ? 2 : -3;
    if (['compteur', 'assurance', 'roue', 'pickpocket', 'cerise'].includes(id)) v -= 1;
    return v;
  }
  function shop(H, opts) {
    const st = H.state;
    const next = H.objective(st.etage, st.tableType);
    const floor = next * (opts.reserve != null ? opts.reserve : 0.5);
    const offers = st.shop.offers.map((o, i) => ({ ...o, i }));
    if (!opts.noJokers) offers.filter(o => o.kind === 'joker').map(o => ({ ...o, v: value(H, o.id) })).filter(o => o.v > 1).sort((a, b) => b.v - a.v)
      .forEach(o => { if (H.bankroll() - o.price >= floor && st.jokers.length < st.jokerSlots) H.buy(o.i); });
    offers.filter(o => o.kind === 'upgrade' && o.id === 'vip').forEach(o => { if (H.bankroll() - o.price >= floor) H.buy(o.i); });
    if (!opts.noJokers) offers.filter(o => o.kind === 'pack').forEach(o => {
      if (H.bankroll() - o.price >= floor && st.jokers.length < st.jokerSlots) { const r = H.buy(o.i); if (r.pack && r.pack.length) H.choosePack(r.pack.slice().sort((a, b) => value(H, b) - value(H, a))[0]); }
    });
    if (!opts.noJokers && st.jokers.length >= st.jokerSlots && H.slotPrice() && H.bankroll() - H.slotPrice() >= floor * 1.4) H.buySlot();
  }
  function useConsumables(H) {
    for (let i = H.state.consumables.length - 1; i >= 0; i--) {
      if (['boisson', 'dore', 'ticket'].includes(H.state.consumables[i])) H.useConsumable(i, null);
    }
  }

  // ---- Taille des mises : « jeu audacieux » : viser ce qui manque pour atteindre le palier,
  // dans la limite de la mise max ----
  function betSize(H, game) {
    const need = H.state.table.target - H.bankroll();
    return Math.max(H.minBet(), Math.min(H.maxBet(game), Math.floor(H.chips()), Math.ceil(need)));
  }

  function playRun(seed, opts = {}) {
    const meta = freshMeta();
    const H = Engine.newRun({ seed, meta, persist: false });
    const F = CONFIG.progression.etagesPourGagner;
    if (H.state.starter && !opts.noJokers) H.pickStarter(H.state.starter.slice().sort((a, b) => value(H, b) - value(H, a))[0]);
    let won = false, guard = 0;
    while (guard++ < 20000) {
      const st = H.state;
      if (st.phase === 'victory') { won = true; break; }
      if (st.phase === 'shop') { shop(H, opts); H.leaveShop(); continue; }
      if (st.phase === 'choose') { H.chooseTable(); continue; }
      if (st.phase !== 'play') break;
      useConsumables(H);
      const need = st.table.target - H.bankroll();
      const game = opts.game || favorite(H) || (opts.strategy === 'blackjack' ? 'bj' : 'dice');
      if (game === 'dice') {
        // « Sniper » : mise max au Dice, avec la chance calibrée pour combler l'écart en un coup
        const b = Math.max(1, Math.min(H.maxBet('dice'), Math.floor(H.chips())));
        const chance = Math.max(CONFIG.games.dice.minTarget, Math.min(90, Math.floor(99 * b / (need + b))));
        playGame(H, 'dice', { bet: b, target: chance, mode: 'under' });
      } else playOne(H, game, betSize(H, game));
    }
    const st = H.state;
    return { seed, won, etage: won ? F : Math.min(st.etage, F), tables: st.stats.tablesWon, jokers: st.stats.jokersOwned.slice(), plays: st.stats.plays, chips: H.chips() };
  }
  function playOne(H, game, bet) {
    if (game === 'uth') return playGame(H, 'uth', { ante: Math.max(Math.ceil(H.minBet() / 2), Math.min(H.maxBet('uth'), Math.floor(H.chips() / 6), Math.floor(bet / 3))) });
    if (game === 'dice') return playGame(H, 'dice', { bet, target: 50, mode: 'under' });
    if (game === 'roulette') return playGame(H, 'roulette', { bets: { red: bet } });
    if (game === 'slots') return playGame(H, 'slots', { bet });
    return playGame(H, 'bj', { bet });
  }

  function run(n = 1000, opts = {}) {
    const seed = opts.seed || 'SIM';
    const t0 = Date.now();
    const results = [];
    for (let i = 0; i < n; i++) results.push(playRun(`${seed}-${i}`, opts));
    const wins = results.filter(r => r.won);
    const dist = {};
    results.forEach(r => (dist[r.etage] = (dist[r.etage] || 0) + 1));
    const jokers = JOKER_DEFS.map(d => {
      const inWins = wins.filter(r => r.jokers.includes(d.id)).length;
      const inAll = results.filter(r => r.jokers.includes(d.id)).length;
      return {
        joker: d.name, rarete: d.rarity,
        'présent (gagnées)': inWins, 'présent (toutes)': inAll,
        'taux victoire si présent': inAll ? +(inWins / inAll * 100).toFixed(1) : 0,
      };
    }).sort((a, b) => b['présent (gagnées)'] - a['présent (gagnées)']);
    const stats = {
      parties: n,
      victoires: wins.length,
      tauxVictoire: +(wins.length / n * 100).toFixed(2),
      etageMoyen: +(results.reduce((a, r) => a + r.etage, 0) / n).toFixed(2),
      tablesMoyennes: +(results.reduce((a, r) => a + r.tables, 0) / n).toFixed(2),
      coupsMoyens: +(results.reduce((a, r) => a + r.plays, 0) / n).toFixed(1),
      repartitionEtages: dist,
      jokers,
      dureeMs: Date.now() - t0,
    };
    if (opts.print !== false && typeof console !== 'undefined') {
      console.log(`Simulation : ${n} parties en ${stats.dureeMs} ms — victoire ${stats.tauxVictoire} %, étage moyen ${stats.etageMoyen}, tables gagnées en moyenne ${stats.tablesMoyennes}`);
      console.log('Étage atteint :', JSON.stringify(dist));
      (console.table || console.log)(jokers.slice(0, 20));
    }
    return stats;
  }

  return { run, playRun, decide };
})();

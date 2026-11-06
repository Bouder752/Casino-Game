// =====================================================================
//  SIMULATION — joue des parties complètes avec une stratégie simple,
//  sans interface, pour équilibrer la config.
//    Navigateur : ouvrez la console et tapez  Sim.run(1000)
//    Node       : node tools/simulate.js 1000
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

  // ---- Stratégie du shop : jokers d'abord, en gardant une réserve ----
  const RANK = { legendaire: 3, rare: 2, commun: 1 };
  function shop(H) {
    const st = H.state;
    const reserve = H.roundCfg(st.manche).maxBet * 2;
    const offers = st.shop.offers.map((o, i) => ({ ...o, i }));
    offers.filter(o => o.kind === 'joker').sort((a, b) => RANK[JOKERS[b.id].rarity] - RANK[JOKERS[a.id].rarity] || a.price - b.price)
      .forEach(o => { if (H.chips() - o.price >= reserve && st.jokers.length < st.jokerSlots) H.buy(o.i); });
    offers.filter(o => o.kind === 'upgrade' && o.id === 'vip').forEach(o => { if (H.chips() - o.price >= reserve) H.buy(o.i); });
    offers.filter(o => o.kind === 'consumable' && ['boisson', 'dore', 'ticket'].includes(o.id)).forEach(o => { if (H.chips() - o.price >= reserve) H.buy(o.i); });
    offers.filter(o => o.kind === 'pack').forEach(o => {
      if (H.chips() - o.price >= reserve && st.jokers.length < st.jokerSlots) { const r = H.buy(o.i); if (r.pack && r.pack.length) H.choosePack(r.pack[0]); }
    });
  }
  function useConsumables(H) {
    for (let i = H.state.consumables.length - 1; i >= 0; i--) {
      if (['boisson', 'dore', 'ticket'].includes(H.state.consumables[i])) H.useConsumable(i, null);
    }
  }

  function playRun(seed, opts = {}) {
    const meta = freshMeta();
    const H = Engine.newRun({ seed, meta, persist: false });
    const F = CONFIG.rounds.final;
    let won = false, guard = 0;
    while (guard++ < 2000) {
      const st = H.state;
      if (st.phase === 'shop') {
        if (st.summary && st.summary.victory) { won = true; break; }
        shop(H); H.nextRound(); continue;
      }
      if (st.phase !== 'play') break;
      if (H.objectiveMet()) { H.endRound(); continue; }
      useConsumables(H);
      const need = st.round.target - H.profit();
      const tours = st.round.tours;
      const bet = Math.max(1, Math.min(H.maxBet('bj'), Math.floor(H.chips())));
      if (opts.game && opts.game !== 'mixed') {
        playOne(H, opts.game, bet, need);
      } else if (tours <= 2 && need > bet) {
        // dernier recours : un Dice risqué calibré pour atteindre l'objectif
        const b = Math.max(1, Math.min(H.maxBet('dice'), Math.floor(H.chips())));
        const chance = Math.max(2, Math.min(95, Math.floor(99 * b / (need + b))));
        playGame(H, 'dice', { bet: b, target: chance, mode: 'under' });
      } else playOne(H, 'bj', bet, need);
    }
    return { seed, won, manche: won ? F : Math.min(H.state.manche, F), jokers: H.state.stats.jokersOwned.slice(), plays: H.state.stats.plays, chips: H.chips() };
  }
  function playOne(H, game, bet, need) {
    if (game === 'uth') return playGame(H, 'uth', { ante: Math.max(1, Math.min(H.maxBet('uth'), Math.floor(bet / 6))) });
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
    results.forEach(r => (dist[r.manche] = (dist[r.manche] || 0) + 1));
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
      mancheMoyenne: +(results.reduce((a, r) => a + r.manche, 0) / n).toFixed(2),
      coupsMoyens: +(results.reduce((a, r) => a + r.plays, 0) / n).toFixed(1),
      repartitionManches: dist,
      jokers,
      dureeMs: Date.now() - t0,
    };
    if (opts.print !== false && typeof console !== 'undefined') {
      console.log(`Simulation : ${n} parties en ${stats.dureeMs} ms — victoire ${stats.tauxVictoire} %, manche moyenne ${stats.mancheMoyenne}`);
      console.log('Manche atteinte :', JSON.stringify(dist));
      (console.table || console.log)(jokers.slice(0, 20));
    }
    return stats;
  }

  return { run, playRun, decide };
})();

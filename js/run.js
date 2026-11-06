// Mode roguelike : état de la partie, effets des jokers, manches, shop.
// « Casino » est la façade utilisée par les jeux (mode libre ou roguelike).
const Run = (() => {
  const KEY = 'boubouzino.run';
  const TARGETS = [25, 40, 60, 90, 130, 180, 250, 350];
  const MAXBETS = [25, 35, 50, 70, 100, 140, 200, 280];
  const FINAL = 8;
  let st = null;
  let uidSeq = 1;
  const listeners = [];
  const emit = (ev = {}) => listeners.forEach(f => f(ev));
  const pick = arr => arr[Util.randInt(arr.length)];

  function save() {
    if (!st) return;
    st.balance = Wallet.get();
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ }
  }
  function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  function hasSave() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); return !!(s && s.phase !== 'over'); } catch (e) { return false; }
  }

  // ---------- Jokers effectifs (avec Miroir et Glaçon) ----------
  function effective() {
    if (!st) return [];
    const out = [];
    const J = st.jokers;
    J.forEach((j, i) => {
      let k = i;
      while (J[k] && J[k].id === 'miroir' && k - i < 12) k++;
      const target = J[k];
      if (!target || target.id === 'miroir') return;
      const def = CATALOG[target.id];
      if (st.boss === 'glacon' && def.rarity === 'commun') return;
      out.push({ def, inst: j });
    });
    return out;
  }
  const count = id => effective().filter(e => e.def.id === id).length;
  const flash = (entries, text) => entries.forEach(e => emit({ type: 'joker', uid: e.inst.uid, text }));
  const entries = id => effective().filter(e => e.def.id === id);

  // ---------- Manches ----------
  function mancheCfg(n) {
    const target = n <= FINAL ? TARGETS[n - 1] : Math.round(TARGETS[FINAL - 1] * Math.pow(1.5, n - FINAL));
    const maxBet = n <= FINAL ? MAXBETS[n - 1] : Math.round(MAXBETS[FINAL - 1] * Math.pow(1.4, n - FINAL));
    const boss = n % 3 === 0 || n === FINAL;
    return { target, maxBet, boss, tours: 10 };
  }

  function startManche() {
    const cfg = mancheCfg(st.manche);
    st.phase = 'play';
    st.target = cfg.target;
    st.baseMax = cfg.maxBet;
    st.boss = cfg.boss ? pick(BOSSES).id : null;
    st.tours = cfg.tours - (st.boss === 'horloger' ? 3 : 0);
    st.toursMax = st.tours;
    st.mancheStart = Wallet.get();
    st.molleUsed = false;
    st.rules = [];
    entries('roue').forEach(() => {
      const free = WILD_RULES.filter(r => !st.rules.includes(r.id));
      if (free.length) st.rules.push(pick(free).id);
    });
    st.charges = { dice: count('depipe'), any: count('fantome') };
    st.busy = 0;
    save(); emit({ type: 'manche' });
  }

  function newRun() {
    Meta.data.runs++; Meta.save();
    st = null;
    Wallet.useRun(100);
    st = {
      manche: 1, phase: 'play', jokers: [], jokerSlots: 4, slotBuys: 0,
      consumables: [], consSlots: 2, upgrades: [], lossStreak: 0, golden: false,
      stats: { plays: 0, wins: 0, best: 0, earned: 0 }, shop: null, summary: null,
    };
    startManche();
  }

  function resume() {
    try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) { st = null; }
    if (!st) return false;
    st.busy = 0;
    uidSeq = Math.max(1, ...st.jokers.map(j => j.uid + 1));
    Wallet.useRun(st.balance);
    emit({ type: st.phase });
    return true;
  }

  function quit() { st = null; Wallet.useFree(); emit({ type: 'quit' }); }

  const profit = () => (st ? Util.round2(Wallet.get() - st.mancheStart) : 0);
  const objectiveMet = () => st && profit() >= st.target;

  function maxBet(game) {
    if (!st) return Infinity;
    let m = st.baseMax * (st.upgrades.includes('vip') ? 1.5 : 1) * (st.boss === 'douane' ? 0.6 : 1);
    m = Math.max(5, Math.round(m));
    return game === 'uth' ? Math.max(2, Math.floor(m / 2)) : m;
  }

  // Après chaque coup : faillite, fin de manche
  function afterPlay() {
    if (!st || st.phase !== 'play' || st.busy) return;
    if (Wallet.get() < 1) {
      const a = entries('assurance')[0];
      if (a) {
        removeJoker(a.inst.uid);
        Wallet.give(50);
        emit({ type: 'toast', text: '🛟 L\'Assurance-Vie te sauve : +50 jetons !' });
        Sfx.play('joker');
      } else return gameOver('Faillite : plus un seul jeton…');
    }
    save(); emit({ type: 'update' });
    if (st.tours <= 0 && !st.busy) setTimeout(() => endManche(false), 1400);
  }

  function endManche(early) {
    if (!st || st.phase !== 'play' || st.busy) return;
    if (!objectiveMet()) return gameOver(`Objectif manqué : ${Util.signed(profit())} / +${st.target} jetons.`);
    const lines = [];
    const reward = 8 + 2 * st.manche;
    lines.push(['Manche gagnée', reward]);
    if (st.tours > 0) lines.push([`Tours restants (${st.tours} × 2)`, st.tours * 2]);
    let total = lines.reduce((a, l) => a + l[1], 0);
    Wallet.give(total);
    entries('banquier').forEach(e => {
      const i = Math.min(50, Math.floor(Wallet.get() * 0.1));
      if (i > 0) { Wallet.give(i); lines.push(['🏦 Intérêts du Banquier', i]); }
      flash([e], `+${i}`);
    });
    const caught = [];
    entries('tricheur').forEach(() => {
      if (Math.random() < 0.1 && st.jokers.length) {
        const victim = pick(st.jokers);
        caught.push(CATALOG[victim.id].name);
        removeJoker(victim.uid);
      }
    });
    Meta.data.prestige += 1;
    if (st.manche === FINAL) Meta.data.prestige += 5;
    Meta.data.best = Math.max(Meta.data.best, st.manche);
    if (st.manche === FINAL) Meta.data.wins++;
    Meta.save();
    st.summary = { manche: st.manche, lines, caught, victory: st.manche === FINAL };
    st.manche++;
    st.phase = 'shop';
    st.shop = genShop();
    save(); emit({ type: 'shop' });
    Sfx.play(st.summary.victory ? 'fanfare' : 'win');
  }

  function gameOver(reason) {
    st.phase = 'over';
    st.reason = reason;
    Meta.data.best = Math.max(Meta.data.best, st.manche - 1);
    Meta.save();
    clearSave();
    emit({ type: 'over' });
    Sfx.play('gameover');
  }

  // ---------- Jokers ----------
  function addJoker(id) {
    if (st.jokers.length >= st.jokerSlots) return false;
    st.jokers.push({ id, uid: uidSeq++ });
    save(); emit({ type: 'update' });
    return true;
  }
  function removeJoker(uid) {
    st.jokers = st.jokers.filter(j => j.uid !== uid);
    save(); emit({ type: 'update' });
  }
  function sellJoker(uid) {
    const j = st.jokers.find(x => x.uid === uid);
    if (!j) return;
    Wallet.give(Math.floor(CATALOG[j.id].price / 2));
    removeJoker(uid);
    Sfx.play('coins');
  }
  function moveJoker(uid, dir) {
    const i = st.jokers.findIndex(x => x.uid === uid), k = i + dir;
    if (i < 0 || k < 0 || k >= st.jokers.length) return;
    [st.jokers[i], st.jokers[k]] = [st.jokers[k], st.jokers[i]];
    save(); emit({ type: 'update' });
  }

  // ---------- Shop ----------
  function rollJoker(minRarity = 'commun', exclude = []) {
    const owned = st.jokers.map(j => j.id).concat(exclude);
    const leg = Math.min(0.04 + 0.01 * st.manche, 0.12), rare = 0.25 + 0.02 * st.manche;
    let r = Math.random(), rarity = r < leg ? 'legendaire' : r < leg + rare ? 'rare' : 'commun';
    if (minRarity === 'rare' && rarity === 'commun') rarity = Math.random() < 0.25 ? 'legendaire' : 'rare';
    let pool = JOKERS.filter(j => j.rarity === rarity && !owned.includes(j.id));
    if (!pool.length) pool = JOKERS.filter(j => !owned.includes(j.id) && (minRarity !== 'rare' || j.rarity !== 'commun'));
    if (!pool.length) pool = JOKERS;
    return pick(pool).id;
  }
  function genShop(keepReroll) {
    const offers = [];
    const taken = [];
    for (let i = 0; i < 3; i++) { const id = rollJoker('commun', taken); taken.push(id); offers.push({ kind: 'joker', id }); }
    const cons = CONSUMABLES.slice();
    for (let i = 0; i < 2; i++) offers.push({ kind: 'cons', id: cons.splice(Util.randInt(cons.length), 1)[0].id });
    offers.push({ kind: 'pack', id: pick(PACKS).id });
    const ups = UPGRADES.filter(u => !st.upgrades.includes(u.id));
    if (ups.length) offers.push({ kind: 'upgrade', id: pick(ups).id });
    offers.forEach(o => (o.price = CATALOG[o.id].price));
    return { offers, rerollCost: keepReroll || 5 };
  }
  function reroll() {
    const c = st.shop.rerollCost;
    if (!Wallet.take(c)) return Sfx.play('error');
    st.shop = genShop(c + 5);
    Sfx.play('buy'); save(); emit({ type: 'update' });
  }
  const slotPrice = () => [100, 200, 400][st.slotBuys];
  function buySlot() {
    const p = slotPrice();
    if (!p || !Wallet.take(p)) return Sfx.play('error');
    st.slotBuys++; st.jokerSlots++;
    Sfx.play('buy'); save(); emit({ type: 'update' });
  }
  // Retourne null ou { pack: [ids] } pour un pack à ouvrir
  function buy(index) {
    const o = st.shop.offers[index];
    if (!o || o.sold) return null;
    if (o.kind === 'joker' && st.jokers.length >= st.jokerSlots) { emit({ type: 'toast', text: 'Plus de place pour un joker : vends-en un ou achète un emplacement.' }); Sfx.play('error'); return null; }
    if (o.kind === 'cons' && st.consumables.length >= st.consSlots) { emit({ type: 'toast', text: 'Tes poches sont pleines (2 consommables max).' }); Sfx.play('error'); return null; }
    if (o.kind === 'pack' && st.jokers.length >= st.jokerSlots) { emit({ type: 'toast', text: 'Il faut un emplacement de joker libre pour ouvrir un pack.' }); Sfx.play('error'); return null; }
    if (!Wallet.take(o.price)) { emit({ type: 'toast', text: 'Pas assez de jetons.' }); Sfx.play('error'); return null; }
    o.sold = true;
    Sfx.play('buy');
    let res = null;
    if (o.kind === 'joker') addJoker(o.id);
    else if (o.kind === 'cons') st.consumables.push(o.id);
    else if (o.kind === 'upgrade') st.upgrades.push(o.id);
    else if (o.kind === 'pack') {
      if (o.id === 'petit') {
        const a = rollJokerOf('commun', []), b = rollJokerOf('commun', [a]);
        res = { pack: [a, b] };
      } else res = { pack: [rollJoker('rare')] };
    }
    save(); emit({ type: 'update' });
    return res;
  }
  function rollJokerOf(rarity, exclude) {
    const owned = st.jokers.map(j => j.id).concat(exclude);
    let pool = JOKERS.filter(j => j.rarity === rarity && !owned.includes(j.id));
    if (!pool.length) pool = JOKERS.filter(j => j.rarity === rarity);
    return pick(pool).id;
  }
  function nextManche() { st.summary = null; startManche(); }

  // ---------- Consommables ----------
  function scratch() {
    const r = Math.random();
    if (r < 0.35) return 0;
    if (r < 0.65) return 5 + Util.randInt(11);
    if (r < 0.87) return 20 + Util.randInt(21);
    if (r < 0.98) return 50 + Util.randInt(31);
    return 100;
  }
  // useConsumable(i, ctx) : ctx = contexte du jeu visible (bonusCard, bribe)
  function useConsumable(i, ctx) {
    const id = st.consumables[i];
    if (!id) return { ok: false };
    const done = (extra = {}) => { st.consumables.splice(i, 1); save(); emit({ type: 'update' }); return { ok: true, ...extra }; };
    switch (id) {
      case 'ticket': { const g = scratch(); if (g) Wallet.give(g); Sfx.play(g ? 'coins' : 'lose'); return done({ text: g ? `🎟️ Ticket gagnant : +${g} jetons !` : '🎟️ Perdu… rien sous la pellicule.' }); }
      case 'boisson': if (st.phase !== 'play') return { ok: false, text: 'À utiliser pendant une manche.' };
        st.charges.any++; Sfx.play('joker'); return done({ text: '🍸 +1 relance pour cette manche.' });
      case 'dore': if (st.phase !== 'play') return { ok: false, text: 'À utiliser pendant une manche.' };
        st.golden = true; Sfx.play('joker'); return done({ text: '🪙 Ta prochaine mise compte double !' });
      case 'bonus': if (!ctx || !ctx.bonusCard) return { ok: false, text: 'Utilisable pendant une main de Blackjack ou de Hold\'em.' };
        return { ok: true, pickCard: card => { ctx.bonusCard(card); done(); } };
      case 'potdevin': if (!ctx || !ctx.bribe) return { ok: false, text: 'Utilisable pendant une main de Blackjack ou de Hold\'em.' };
        ctx.bribe(); Sfx.play('coins'); return done({ text: '💰 Le croupier vous montre discrètement sa carte…' });
    }
    return { ok: false };
  }

  return {
    get state() { return st; },
    FINAL, newRun, resume, quit, hasSave, clearSave, save, on: f => listeners.push(f), emit,
    effective, count, entries, flash, profit, objectiveMet, maxBet, afterPlay, endManche,
    mancheCfg, removeJoker, sellJoker, moveJoker, addJoker, buy, reroll, buySlot, slotPrice, nextManche, useConsumable,
  };
})();

// ---------- Façade utilisée par les jeux ----------
const Casino = (() => {
  const ctx = {};
  const active = () => !!Run.state && Run.state.phase === 'play';
  const st = () => Run.state;

  return {
    isRun: active,
    // Peut-on lancer un coup ? (renvoie un message d'erreur ou null)
    canStart() {
      if (!Run.state) return null;
      if (!active()) return 'La manche est terminée.';
      if (st().tours <= 0) return 'Plus de tours dans cette manche.';
      return null;
    },
    begin() {
      if (!active()) return;
      st().tours--; st().busy++; st().stats.plays++;
      Run.save(); Run.emit({ type: 'update' });
    },
    maxBet: game => Run.maxBet(game),
    has: id => (active() ? Run.count(id) : 0),
    rule: id => active() && (st().rules || []).includes(id),
    boss: id => active() && st().boss === id,
    excludedRanks: () => (Run.state && Run.state.upgrades.includes('truque') ? [2, 3] : []),
    upgrade: id => !!Run.state && Run.state.upgrades.includes(id),
    flash: (id, text) => Run.flash(Run.entries(id), text),

    // Relances : 'dice' utilise d'abord le Dé Pipé, sinon les relances génériques
    charges(game) { if (!active()) return 0; const c = st().charges; return c.any + (game === 'dice' ? c.dice : 0); },
    useCharge(game) {
      const c = st().charges;
      if (game === 'dice' && c.dice > 0) { c.dice--; Run.flash(Run.entries('depipe'), 'Relance !'); }
      else if (c.any > 0) { c.any--; Run.flash(Run.entries('fantome'), 'Boo !'); }
      else return false;
      Sfx.play('joker'); Run.save(); Run.emit({ type: 'update' });
      return true;
    },
    // Instantané pour annuler un règlement (relance)
    snapshot() { return active() ? { bal: Wallet.get(), streak: st().lossStreak, golden: st().golden, molle: st().molleUsed, jackpot: Meta.data.jackpot, wins: st().stats.wins } : { bal: Wallet.get() }; },
    restore(s) {
      const d = s.bal - Wallet.get();
      if (d > 0) Wallet.give(d); else if (d < 0) Wallet.take(-d);
      if (!active()) return;
      Object.assign(st(), { lossStreak: s.streak, golden: s.golden, molleUsed: s.molle });
      st().stats.wins = s.wins;
      Meta.data.jackpot = s.jackpot; Meta.save();
    },

    // Règlement d'un coup : staked = misé, back = rendu avant jokers.
    // o.sevens : nombre de 7 tirés · o.aiWin : gains des joueurs IA · o.loseRefundable : défaite de blackjack
    settle(game, o) {
      let back = Util.round2(o.back), extra = 0;
      const staked = o.staked;
      if (!active()) { Wallet.give(back); return { back, extra: 0, net: Util.round2(back - staked), mult: 1 }; }
      const S = st();
      S.busy = Math.max(0, S.busy - 1);
      let gain = Util.round2(back - staked), mult = 1;
      if (game === 'bj' && gain < 0 && !S.molleUsed && Run.count('molle')) {
        const refund = Util.round2(Math.min(-gain, -gain * 0.5 * Run.count('molle')));
        back += refund; gain += refund; S.molleUsed = true;
        Run.flash(Run.entries('molle'), `+${Util.fmt(refund)}`);
      }
      if (gain > 0) {
        let add = 0, xm = 1;
        const E = Run.effective();
        E.forEach(e => {
          switch (e.def.id) {
            case 'porte': add += 0.05; Run.flash([e], '+5 %'); break;
            case 'parrain': { const n = S.jokers.length - 1; if (n > 0) { add += n; Run.flash([e], `+${n} mult`); } break; }
            case 'martingale': if (S.lossStreak) { add += 0.25 * S.lossStreak; Run.flash([e], `+${S.lossStreak * 25} %`); } break;
            case 'tricheur': xm *= 2; Run.flash([e], '×2'); break;
            case 'jackpot': xm *= Meta.data.jackpot; Run.flash([e], `×${Meta.data.jackpot.toFixed(1)}`); break;
          }
        });
        if (S.golden) { xm *= 2; S.golden = false; Run.emit({ type: 'toast', text: '🪙 Jeton Doré : gain doublé !' }); }
        mult = (1 + add) * xm;
        gain = Util.round2(gain * mult);
        back = Util.round2(staked + gain);
        S.lossStreak = 0;
        S.stats.wins++;
        const jk = Run.entries('jackpot').length;
        if (jk) { Meta.data.jackpot = Math.round((Meta.data.jackpot + 0.1 * jk) * 10) / 10; Meta.save(); }
      } else if (gain < 0) {
        S.lossStreak++;
        S.golden = false;
        const c = Run.entries('consolation');
        if (c.length) { extra += 3 * c.length; Run.flash(c, '+3'); }
      }
      if (o.sevens) {
        const e = Run.entries('septieme');
        if (e.length) { extra += 10 * o.sevens * e.length; Run.flash(e, `+${10 * o.sevens}`); }
      }
      if (o.aiWin > 0) {
        const e = Run.entries('pickpocket');
        if (e.length) { const g = Util.round2(o.aiWin * 0.1 * e.length); extra += g; Run.flash(e, `+${Util.fmt(g)}`); }
      }
      Wallet.give(back + extra);
      S.stats.best = Math.max(S.stats.best, gain);
      const net = Util.round2(back + extra - staked);
      setTimeout(() => Run.afterPlay(), 0);
      return { back, extra, net, mult };
    },
    // Garde la manche ouverte pendant une décision (relancer ou accepter)
    hold() { if (active()) st().busy++; },
    release() { if (!active()) return; st().busy = Math.max(0, st().busy - 1); Run.afterPlay(); },
    // Contexte des consommables pour le jeu visible
    setCtx(game, c) { ctx[game] = c; Run.emit({ type: 'ctx' }); },
    ctx: game => ctx[game] || null,
  };
})();

// =====================================================================
//  MOTEUR — état unique sérialisable, bus d'événements, règlement des gains,
//  manches, shop, prêts et sauvegarde. Aucun DOM : fonctionne aussi sous Node
//  (simulation). L'interface s'abonne via host.on(listener).
// =====================================================================

// Registre des jeux : chaque module respecte la même interface
//   { id, name, init(host) → état persistant,
//     start(host, gs, params, play) → { round } | { error },
//     actions(host, gs, round) → [{ id, label, primary, danger, ghost, disabled }],
//     act(host, gs, round, actionId, arg), resolve(host, gs, round) → { staked, back, info, draws },
//     capabilities: { nom: { can(host, gs, round), use(host, gs, round, arg) → texte } } }
const Games = (() => {
  const reg = {};
  return { register: def => (reg[def.id] = def), get: id => reg[id], list: () => Object.values(reg) };
})();

const Engine = (() => {
  const VERSION = 2;
  const SAVE_KEY = 'boubouzino.run.v2';
  const META_KEY = 'boubouzino.meta';
  const FREE_KEY = 'boubouzino.free';
  const round2 = x => Math.round(x * 100) / 100;
  const KIND_ORDER = { adjust: 0, add: 1, mult: 2, flat: 3 };

  function loadMeta() {
    return Object.assign({
      prestige: 0, jackpot: 1, unlocked: ['felt-vert', 'back-bordeaux'], felt: 'felt-vert', back: 'back-bordeaux',
      best: 0, runs: 0, wins: 0,
    }, Storage.get(META_KEY, {}));
  }

  function newRunState(seed) {
    return {
      v: VERSION, mode: 'run', seed, rng: { s: RNG.hashSeed(seed) },
      chips: CONFIG.start.chips, manche: 1, phase: 'play', round: null, reason: '',
      jokers: [], jokerSlots: CONFIG.shop.jokerSlots.base, slotBuys: 0,
      consumables: [], consSlots: CONFIG.shop.consumableSlots,
      upgrades: [], statuses: [], charges: [], debts: [],
      shop: null, summary: null, games: {}, uid: 1,
      stats: { plays: 0, wins: 0, losses: 0, best: 0, jokersOwned: [] },
    };
  }
  function freeState() {
    const saved = Storage.get(FREE_KEY, {});
    return {
      v: VERSION, mode: 'free', seed: saved.seed || RNG.randomSeed(), rng: saved.rng || { s: RNG.hashSeed(RNG.randomSeed()) },
      chips: Number.isFinite(saved.chips) ? saved.chips : CONFIG.start.freeChips,
      phase: 'play', round: null, jokers: [], upgrades: [], statuses: [], charges: [], debts: [], consumables: [],
      games: {}, uid: 1, stats: { plays: 0, wins: 0, losses: 0, best: 0, jokersOwned: [] },
    };
  }

  function createHost(state, opts = {}) {
    const meta = opts.meta || loadMeta();
    const persist = opts.persist !== false;
    const listeners = [];
    const rng = RNG.make(state.rng);
    let active = null; // coup en cours : { id, round, play }
    const isRun = state.mode === 'run';

    const H = { state, rng, meta, isRun };
    const notify = (type, data = {}) => listeners.forEach(f => f(type, data));
    H.on = f => listeners.push(f);
    H.notify = notify;
    H.saveMeta = () => { if (persist) Storage.set(META_KEY, meta); };

    // ---------------- Modificateurs actifs (ordre déterministe) ----------------
    // améliorations → statuts → patron → jokers de gauche à droite (+ leurs enfants)
    function resolveJoker(i, seen = new Set()) {
      const j = state.jokers[i];
      if (!j || seen.has(i)) return null; // garde-fou : jamais de boucle
      seen.add(i);
      const d = JOKERS[j.id];
      return d.copyRight ? resolveJoker(i + 1, seen) : d;
    }
    function makeMe(def, inst, kind, parent) {
      if (!inst.state) inst.state = {};
      const src = parent || null;
      return {
        host: H, def, kind, inst, state: inst.state,
        uid: src ? src.uid : inst.uid,
        name: def.name, icon: def.icon || (src ? src.icon : kind === 'boss' ? '☠' : '✨'),
        flash: text => notify('flash', { uid: src ? src.uid : inst.uid, text }),
        remove: () => {
          if (kind === 'joker') H.removeJoker(inst.uid);
          else if (kind === 'status') state.statuses = state.statuses.filter(s => s !== inst);
        },
      };
    }
    function mods() {
      if (!isRun) return [];
      const out = [];
      const push = (def, inst, kind) => {
        if (!def) return;
        const me = makeMe(def, inst, kind);
        out.push({ def, me });
        if (def.children) def.children(me).forEach(c => out.push({ def: c, me: makeMe(c, inst, 'rule', me) }));
      };
      state.upgrades.forEach(id => push(UPGRADES[id], { uid: 'up:' + id }, 'upgrade'));
      state.statuses.slice().forEach(s => push(STATUSES[s.id], s, 'status'));
      const boss = state.round && state.round.boss ? BOSSES[state.round.boss] : null;
      if (boss) push(boss, { uid: 'boss' }, 'boss');
      state.jokers.forEach((j, i) => {
        const def = resolveJoker(i);
        if (!def || (boss && boss.disables && boss.disables(def))) return;
        push(def, j, 'joker');
      });
      return out;
    }
    H.mods = mods;
    // Émet un événement ; les modificateurs lisent/modifient e, qui est renvoyé
    H.emit = (name, e = {}) => {
      for (const { def, me } of mods()) {
        const h = def[name];
        if (typeof h === 'function') h.call(def, e, me);
      }
      return e;
    };
    H.activeRules = () => mods().filter(m => m.def.kind === 'rule').map(m => m.def.id);
    H.isJokerDisabled = j => {
      const boss = state.round && state.round.boss ? BOSSES[state.round.boss] : null;
      const def = resolveJoker(state.jokers.indexOf(j));
      return !!(boss && boss.disables && def && boss.disables(def));
    };
    H.mirrorTarget = uid => {
      const i = state.jokers.findIndex(j => j.uid === uid);
      const d = resolveJoker(i);
      return d && d.id !== JOKERS[state.jokers[i].id].id ? d : null;
    };

    // ---------------- Jetons ----------------
    H.chips = () => state.chips;
    H.canAfford = a => a <= state.chips + 1e-9;
    H.stake = a => {
      if (!(a > 0) || !H.canAfford(a)) return false;
      state.chips = round2(state.chips - a);
      notify('chips');
      return true;
    };
    H.give = a => { if (a > 0) { state.chips = round2(state.chips + a); notify('chips'); } };

    // ---------------- Limites, règles de deck ----------------
    H.maxBet = game => {
      if (!isRun || !state.round) return Infinity;
      const e = H.emit('maxBet', { value: state.round.maxBase, game });
      const m = Math.max(5, Math.round(e.value));
      return game === 'uth' ? Math.max(2, Math.floor(m * CONFIG.rounds.uthMaxBetRatio)) : m;
    };
    H.excludedRanks = () => H.emit('deck.exclude', { ranks: [] }).ranks;
    H.query = (name, ctx) => H.emit(name, ctx);

    // ---------------- Relances (Dé Pipé, Fantôme, Boisson) ----------------
    H.addCharge = (src, games, n = 1) => {
      for (let i = 0; i < n; i++) state.charges.push({ src: src.uid, name: src.name, icon: src.icon, games });
      notify('change');
    };
    H.charges = game => (isRun ? state.charges.filter(c => c.games === 'any' || c.games === game).length : 0);
    H.useCharge = game => {
      let i = state.charges.findIndex(c => c.games === game);
      if (i < 0) i = state.charges.findIndex(c => c.games === 'any');
      if (i < 0) return false;
      const c = state.charges.splice(i, 1)[0];
      notify('flash', { uid: c.src, text: 'Relance !' });
      notify('sound', { name: 'joker' });
      notify('change');
      return true;
    };
    H.addStatus = id => { state.statuses.push({ id, uid: 'st' + state.uid++, state: {} }); notify('change'); };

    // ---------------- Coups ----------------
    const gameState = id => {
      const G = Games.get(id);
      if (!state.games[id]) state.games[id] = G.init ? G.init(H) : {};
      return state.games[id];
    };
    H.gameState = gameState;
    H.active = () => active;
    H.busy = () => !!active;
    H.canStart = () => {
      if (active) return 'Un coup est déjà en cours.';
      if (!isRun) return null;
      if (state.phase !== 'play') return 'La manche est terminée.';
      if (state.round.tours <= 0) return 'Plus de tours dans cette manche.';
      return null;
    };
    H.startPlay = (id, params) => {
      const err = H.canStart();
      if (err) return { error: err };
      const G = Games.get(id);
      const play = { game: id, steps: [] };
      play.flat = (me, v, label) => { if (v) play.steps.push(step('flat', me, v, label)); };
      const res = G.start(H, gameState(id), params, play);
      if (res.error) return res;
      if (isRun) state.round.tours--;
      state.stats.plays++;
      active = { id, round: res.round, play };
      H.emit('onBetPlaced', { game: id, round: res.round, play });
      notify('change');
      return res.round.done ? { round: res.round, settlement: finish() } : { round: res.round };
    };
    H.actions = () => (active ? Games.get(active.id).actions(H, gameState(active.id), active.round) : []);
    H.act = (actionId, arg) => {
      if (!active) return { error: 'Aucun coup en cours.' };
      const { id, round } = active;
      const allowed = H.actions().find(a => a.id === actionId && !a.disabled);
      if (!allowed) return { error: 'Action impossible.' };
      Games.get(id).act(H, gameState(id), round, actionId, arg);
      notify('change');
      return round.done ? { round, settlement: finish() } : { round };
    };
    H.canUseCapability = (ctx, name) => {
      if (!active || !ctx || active.id !== ctx.game) return false;
      const cap = (Games.get(active.id).capabilities || {})[name];
      return !!(cap && cap.can(H, gameState(active.id), active.round));
    };
    H.useCapability = (ctx, name, arg) => {
      if (!H.canUseCapability(ctx, name)) return { ok: false, text: 'Utilisable pendant une main de Blackjack ou de Hold\'em, au bon moment.' };
      const text = Games.get(active.id).capabilities[name].use(H, gameState(active.id), active.round, arg);
      notify('change');
      return { ok: true, text };
    };

    function step(kind, me, value, label) {
      return { kind, value: kind === 'mult' ? value : round2(value), label: label || '', src: me ? { uid: me.uid, name: me.name, icon: me.icon } : null };
    }

    // Règlement : mise → rendu brut (+ ajustements) → bonus additifs → multiplicateurs → bonus fixes
    function finish() {
      const { id, round, play } = active;
      const r = Games.get(id).resolve(H, gameState(id), round);
      (r.draws || []).forEach(d => {
        if (d.kind === 'card') H.emit('onCardDrawn', { game: id, card: d.card, play });
        else H.emit('onDraw', { game: id, kind: d.kind, value: d.value, play });
      });
      const e = {
        game: id, staked: round2(r.staked), back: round2(r.back), baseBack: round2(r.back), info: r.info || {},
        gain: 0, outcome: 'push', steps: play.steps.slice(),
        adjust(me, v, label) { if (v) { e.back = round2(e.back + v); e.steps.push(step('adjust', me, v, label)); } },
        add(me, v, label) { e.steps.push(step('add', me, v, label)); },
        mult(me, x, label) { e.steps.push(step('mult', me, x, label)); },
        flat(me, v, label) { if (v) e.steps.push(step('flat', me, v, label)); },
      };
      H.emit('onResolve', e);
      e.gain = round2(e.back - e.staked);
      e.outcome = e.gain > 0 ? 'win' : e.gain < 0 ? 'loss' : 'push';
      H.emit('onSettle', e);
      H.emit(e.outcome === 'win' ? 'onWin' : e.outcome === 'loss' ? 'onLoss' : 'onPush', e);
      const steps = e.steps.map((s, i) => ({ s, i })).sort((a, b) => KIND_ORDER[a.s.kind] - KIND_ORDER[b.s.kind] || a.i - b.i).map(x => x.s);
      const add = steps.filter(s => s.kind === 'add').reduce((a, s) => a + s.value, 0);
      const mult = steps.filter(s => s.kind === 'mult').reduce((a, s) => a * s.value, 1);
      const flats = steps.filter(s => s.kind === 'flat').reduce((a, s) => a + s.value, 0);
      const gainF = e.gain > 0 ? round2(e.gain * (1 + add) * mult) : e.gain;
      const net = round2(gainF + flats);
      H.give(Math.max(0, round2(e.staked + net)));
      if (e.outcome === 'win') state.stats.wins++; else if (e.outcome === 'loss') state.stats.losses++;
      state.stats.best = Math.max(state.stats.best, net);
      active = null;
      const settlement = {
        game: id, staked: e.staked, baseBack: e.baseBack, back: e.back, gain: e.gain, outcome: e.outcome,
        steps, add, mult: round2(mult), gainFinal: gainF, flats: round2(flats), net, info: e.info,
      };
      notify('settled', settlement);
      afterPlay();
      return settlement;
    }

    function afterPlay() {
      if (!isRun) { save(); return; }
      if (state.phase !== 'play') return;
      if (checkBankrupt()) return;
      if (state.round.tours <= 0) endRound(false);
      else save();
      notify('change');
    }
    function checkBankrupt() {
      if (!isRun || active || state.chips >= 1) return false;
      const e = H.emit('onBankrupt', { saved: false });
      if (e.saved && state.chips >= 1) { notify('change'); return false; }
      gameOver('Faillite : plus un seul jeton…');
      return true;
    }

    // ---------------- Manches ----------------
    H.roundCfg = n => {
      const R = CONFIG.rounds, F = R.final;
      const target = n <= F ? R.targets[n - 1] : Math.round(R.targets[F - 1] * Math.pow(R.endless.targetGrowth, n - F));
      const maxBet = n <= F ? R.maxBets[n - 1] : Math.round(R.maxBets[F - 1] * Math.pow(R.endless.maxBetGrowth, n - F));
      return { target, maxBet, tours: R.tours, boss: n % R.bossEvery === 0 || n === F };
    };
    function startRound() {
      const cfg = H.roundCfg(state.manche);
      state.round = {
        n: state.manche, target: cfg.target, maxBase: cfg.maxBet, tours: cfg.tours, toursMax: cfg.tours,
        boss: cfg.boss ? rng.pick(BOSS_DEFS).id : null, start: state.chips,
      };
      state.charges = [];
      state.phase = 'play';
      H.emit('onRoundStart', { round: state.round });
      state.round.tours = Math.max(1, state.round.tours);
      state.round.toursMax = state.round.tours;
      notify('round');
      if (!checkBankrupt()) save();
    }
    H.profit = () => (isRun && state.round ? round2(state.chips - state.round.start) : 0);
    H.objectiveMet = () => isRun && state.phase === 'play' && H.profit() >= state.round.target;

    function endRound() {
      if (active || state.phase !== 'play') return { error: 'Termine le coup en cours.' };
      if (!H.objectiveMet()) { gameOver(`Objectif manqué : ${H.profit() >= 0 ? '+' : ''}${H.profit()} / +${state.round.target} jetons.`); return { over: true }; }
      const RW = CONFIG.rounds.reward;
      const lines = [];
      const reward = RW.base + RW.perManche * state.manche;
      H.give(reward); lines.push({ label: 'Manche gagnée', value: reward });
      if (state.round.tours > 0) {
        const b = state.round.tours * RW.perTourLeft;
        H.give(b); lines.push({ label: `Tours restants (${state.round.tours} × ${RW.perTourLeft})`, value: b });
      }
      const e = { lines, reward(me, v, label) { H.give(v); lines.push({ label, value: v, src: me.uid }); me.flash(`+${v}`); } };
      H.emit('onRoundEnd', e);
      processDebts(lines);
      const victory = state.manche === CONFIG.rounds.final;
      meta.prestige += CONFIG.prestige.perManche + (victory ? CONFIG.prestige.victory : 0);
      meta.best = Math.max(meta.best, state.manche);
      if (victory) meta.wins++;
      H.saveMeta();
      state.summary = { manche: state.manche, lines, victory };
      state.manche++;
      state.phase = 'shop';
      state.charges = [];
      state.shop = genShop(CONFIG.shop.reroll.base);
      H.emit('onShopEnter', { shop: state.shop });
      save();
      notify('shop');
      return { ok: true };
    }
    H.endRound = endRound;
    H.nextRound = () => {
      if (state.phase !== 'shop') return;
      state.summary = null;
      startRound();
    };
    function gameOver(reason) {
      state.phase = 'over';
      state.reason = reason;
      meta.best = Math.max(meta.best, state.manche - 1);
      H.saveMeta();
      if (persist) Storage.remove(SAVE_KEY);
      notify('over', { reason });
    }

    // ---------------- Jokers ----------------
    H.addJoker = id => {
      if (state.jokers.length >= state.jokerSlots) return false;
      state.jokers.push({ uid: state.uid++, id, state: {} });
      if (!state.stats.jokersOwned.includes(id)) state.stats.jokersOwned.push(id);
      notify('change');
      return true;
    };
    // Retirer un joker met fin à ses effets en cours (relances, règles…)
    H.removeJoker = uid => {
      state.jokers = state.jokers.filter(j => j.uid !== uid);
      state.charges = state.charges.filter(c => c.src !== uid);
      notify('change');
    };
    H.sellJoker = uid => {
      if (active) return { error: 'Impossible de vendre un joker pendant un coup.' };
      const j = state.jokers.find(x => x.uid === uid);
      if (!j) return { error: 'Joker introuvable.' };
      const v = Math.floor(JOKERS[j.id].price * CONFIG.shop.sellRatio);
      H.removeJoker(uid);
      H.give(v);
      save();
      return { ok: true, value: v };
    };
    H.moveJoker = (uid, dir) => {
      const i = state.jokers.findIndex(x => x.uid === uid), k = i + dir;
      if (i < 0 || k < 0 || k >= state.jokers.length) return;
      [state.jokers[i], state.jokers[k]] = [state.jokers[k], state.jokers[i]];
      notify('change'); save();
    };

    // ---------------- Shop ----------------
    function rollJoker({ minRarity = null, exclude = [] } = {}) {
      const owned = new Set([...state.jokers.map(j => j.id), ...exclude]);
      const pool = JOKER_DEFS.filter(d => !owned.has(d.id));
      if (!pool.length) return null;
      const w = CONFIG.shop.rarityWeights(state.manche);
      if (minRarity === 'rare') w.commun = 0;
      const tiers = Object.keys(w).filter(r => w[r] > 0 && pool.some(d => d.rarity === r)).map(r => ({ r, w: w[r] }));
      const tier = tiers.length ? rng.weighted(tiers).r : pool[0].rarity;
      return rng.pick(pool.filter(d => d.rarity === tier)).id;
    }
    function genShop(rerollCost) {
      const S = CONFIG.shop, offers = [], taken = [];
      for (let i = 0; i < S.jokers; i++) { const id = rollJoker({ exclude: taken }); if (id) { taken.push(id); offers.push({ kind: 'joker', id }); } }
      const cons = CONSUMABLE_DEFS.slice();
      for (let i = 0; i < S.consumables && cons.length; i++) offers.push({ kind: 'consumable', id: cons.splice(rng.int(cons.length), 1)[0].id });
      for (let i = 0; i < S.packs; i++) offers.push({ kind: 'pack', id: rng.pick(PACK_DEFS).id });
      const ups = UPGRADE_DEFS.filter(u => !state.upgrades.includes(u.id));
      for (let i = 0; i < S.upgrades && ups.length; i++) offers.push({ kind: 'upgrade', id: ups.splice(rng.int(ups.length), 1)[0].id });
      offers.forEach(o => { o.price = CATALOG[o.id].price; o.sold = false; });
      return { offers, rerollCost };
    }
    H.reroll = () => {
      if (state.phase !== 'shop') return { error: 'Le shop est fermé.' };
      const c = state.shop.rerollCost;
      if (!H.stake(c)) return { error: 'Pas assez de jetons.' };
      state.shop = genShop(c + CONFIG.shop.reroll.step);
      save(); notify('change');
      return { ok: true };
    };
    H.slotPrice = () => CONFIG.shop.jokerSlots.prices[state.slotBuys];
    H.buySlot = () => {
      const p = H.slotPrice();
      if (!p) return { error: 'Nombre maximal d\'emplacements atteint.' };
      if (!H.stake(p)) return { error: 'Pas assez de jetons.' };
      state.slotBuys++; state.jokerSlots++;
      save(); notify('change');
      return { ok: true };
    };
    H.buy = i => {
      const o = state.shop && state.shop.offers[i];
      if (!o || o.sold) return { error: 'Article indisponible.' };
      const full = state.jokers.length >= state.jokerSlots;
      if ((o.kind === 'joker' || o.kind === 'pack') && full) return { error: 'Plus de place pour un joker : vends-en un ou achète un emplacement.' };
      if (o.kind === 'consumable' && state.consumables.length >= state.consSlots) return { error: `Tes poches sont pleines (${state.consSlots} consommables max).` };
      if (!H.canAfford(o.price)) return { error: 'Pas assez de jetons.' };
      H.stake(o.price);
      o.sold = true;
      let pack = null;
      if (o.kind === 'joker') H.addJoker(o.id);
      else if (o.kind === 'consumable') state.consumables.push(o.id);
      else if (o.kind === 'upgrade') state.upgrades.push(o.id);
      else if (o.kind === 'pack') {
        if (o.id === 'petit') {
          pack = [];
          for (let k = 0; k < CONFIG.packs.petit.choices; k++) {
            const owned = new Set([...state.jokers.map(j => j.id), ...pack]);
            const pool = JOKER_DEFS.filter(d => d.rarity === 'commun' && !owned.has(d.id));
            const id = pool.length ? rng.pick(pool).id : rollJoker({ exclude: pack });
            if (id) pack.push(id);
          }
        } else {
          const owned = new Set(state.jokers.map(j => j.id));
          const legend = rng.chance(CONFIG.packs.mystere.legendaryChance);
          let pool = JOKER_DEFS.filter(d => d.rarity === (legend ? 'legendaire' : 'rare') && !owned.has(d.id));
          if (!pool.length) pool = JOKER_DEFS.filter(d => d.rarity !== 'commun' && !owned.has(d.id));
          pack = pool.length ? [rng.pick(pool).id] : [];
        }
        state.pendingPack = pack;
      }
      save(); notify('change');
      return { ok: true, pack };
    };
    H.choosePack = id => {
      const p = state.pendingPack || [];
      state.pendingPack = null;
      if (id && p.includes(id)) H.addJoker(id);
      save(); notify('change');
    };

    // ---------------- Consommables ----------------
    H.useConsumable = (i, ctx, arg) => {
      const id = state.consumables[i];
      const def = id && CONSUMABLES[id];
      if (!def) return { ok: false, text: 'Consommable introuvable.' };
      if (def.inPlayOnly && state.phase !== 'play') return { ok: false, text: 'À utiliser pendant une manche.' };
      if (def.capability && !H.canUseCapability(ctx, def.capability)) return { ok: false, text: 'Utilisable pendant une main de Blackjack ou de Hold\'em, au bon moment.' };
      if (id === 'bonus' && !arg) return { ok: true, needCard: true };
      const r = def.use(H, ctx, arg);
      if (r.ok) { state.consumables.splice(i, 1); save(); notify('change'); }
      return r;
    };
    H.sellConsumable = i => {
      const id = state.consumables[i];
      if (!id) return;
      state.consumables.splice(i, 1);
      H.give(Math.floor(CONSUMABLES[id].price * CONFIG.shop.sellRatio));
      save(); notify('change');
    };

    // ---------------- Prêts ----------------
    H.takeLoan = id => {
      const opt = CONFIG.loans.options.find(o => o.id === id);
      if (!opt) return { error: 'Prêt inconnu.' };
      if (state.debts.length >= CONFIG.loans.maxActive) return { error: 'Rembourse d\'abord ton prêt en cours.' };
      const total = Math.round(opt.amount * (1 + opt.rate));
      state.debts.push({ id, name: opt.name, total, left: total, per: Math.ceil(total / opt.manches), missed: 0 });
      H.give(opt.amount);
      save(); notify('change');
      return { ok: true };
    };
    function processDebts(lines) {
      state.debts = state.debts.filter(d => {
        const due = Math.min(d.per, d.left);
        const pay = Math.min(due, Math.floor(state.chips));
        state.chips = round2(state.chips - pay);
        d.left -= pay;
        lines.push({ label: `Remboursement ${d.name}`, value: -pay });
        const unpaid = due - pay;
        if (unpaid > 0) {
          const pen = Math.round(unpaid * CONFIG.loans.penaltyRate);
          d.left += pen; d.missed++;
          lines.push({ label: `⚖️ Échéance impayée : pénalité +${pen} et l'huissier confisque ${CONFIG.loans.penaltyTours} tours`, value: 0, bad: true });
          H.addStatus('huissier');
        }
        return d.left > 0;
      });
      notify('chips');
    }

    // ---------------- Sauvegarde ----------------
    function save() {
      if (!persist || active) return;
      if (isRun && state.phase !== 'over') Storage.set(SAVE_KEY, state);
      if (!isRun) Storage.set(FREE_KEY, { chips: state.chips, rng: state.rng, seed: state.seed });
    }
    H.save = save;
    H.resetFree = () => { if (!isRun) { state.chips = CONFIG.start.freeChips; save(); notify('chips'); } };
    H.startRound = startRound;
    return H;
  }

  return {
    VERSION, SAVE_KEY, loadMeta,
    newRun({ seed, meta, persist } = {}) {
      const s = (seed && String(seed).trim().toUpperCase()) || RNG.randomSeed();
      const H = createHost(newRunState(s), { meta, persist });
      H.meta.runs++; H.saveMeta();
      H.startRound();
      return H;
    },
    hasSave() { const s = Storage.get(SAVE_KEY); return !!(s && s.v === VERSION && s.phase !== 'over'); },
    load(opts = {}) {
      const s = Storage.get(SAVE_KEY);
      if (!s || s.v !== VERSION || s.phase === 'over') return null;
      return createHost(s, opts);
    },
    clearSave() { Storage.remove(SAVE_KEY); },
    free(opts = {}) { return createHost(freeState(), opts); },
    createHost,
  };
})();

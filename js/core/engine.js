// =====================================================================
//  MOTEUR — état unique sérialisable, bus d'événements, règlement des gains,
//  étages et tables, shop, prêts et sauvegarde. Aucun DOM : fonctionne aussi sous Node
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
  const VERSION = 4;
  const SAVE_KEY = 'boubouzino.run.v4';
  const META_KEY = 'boubouzino.meta';
  const FREE_KEY = 'boubouzino.free';
  const round2 = x => Math.round(x * 100) / 100;
  const KIND_ORDER = { adjust: 0, add: 1, mult: 2, flat: 3 };

  function loadMeta() {
    const m = Object.assign({
      prestige: 0, jackpot: 1, unlocked: ['felt-vert', 'back-bordeaux'], felt: 'felt-vert', back: 'back-bordeaux',
      best: 0, runs: 0, wins: 0, collection: null,
    }, Storage.get(META_KEY, {}));
    if (!m.collection) m.collection = { jokers: {}, bosses: {} };
    return m;
  }

  function newRunState(seed) {
    return {
      v: VERSION, mode: 'run', seed, rng: { s: RNG.hashSeed(seed) },
      chips: CONFIG.progression.jetonsDepart, etage: 1, tableType: 'petite', bossId: null, tagOffers: {}, etageLog: {},
      infinite: false, phase: 'choose', table: null, reason: '',
      jokers: [], jokerSlots: CONFIG.shop.jokerSlots.base, slotBuys: 0,
      consumables: [], consSlots: CONFIG.shop.consumableSlots,
      upgrades: [], statuses: [], charges: [], debts: [],
      shop: null, summary: null, games: {}, uid: 1,
      stats: { plays: 0, wins: 0, losses: 0, best: 0, tablesWon: 0, jokersOwned: [], jokerEarned: {}, bestPlay: null },
    };
  }
  function freeState() {
    const saved = Storage.get(FREE_KEY, {});
    return {
      v: VERSION, mode: 'free', seed: saved.seed || RNG.randomSeed(), rng: saved.rng || { s: RNG.hashSeed(RNG.randomSeed()) },
      chips: Number.isFinite(saved.chips) ? saved.chips : CONFIG.freeChips,
      phase: 'play', table: null, jokers: [], upgrades: [], statuses: [], charges: [], debts: [], consumables: [],
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
    // Collection (jokers découverts, boss battus) — conservée entre les parties
    const coll = () => { if (!meta.collection) meta.collection = { jokers: {}, bosses: {} }; return meta.collection; };
    const collJoker = id => (coll().jokers[id] = coll().jokers[id] || { seen: 0, owned: 0, wins: 0, earned: 0 });

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
        name: kind === 'joker' && inst.id === 'miroir' && def.id !== 'miroir' ? `Miroir → ${def.name}` : def.name,
        icon: kind === 'joker' && inst.id === 'miroir' && def.id !== 'miroir' ? '🪞' : def.icon || (src ? src.icon : kind === 'boss' ? '☠' : '✨'),
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
      const boss = currentBoss();
      if (boss) push(boss, { uid: 'boss' }, 'boss');
      state.jokers.forEach((j, i) => {
        const def = resolveJoker(i);
        if (!def || disabled(boss, def, i)) return;
        push(def, j, 'joker');
      });
      return out;
    }
    H.mods = mods;
    function currentBoss() { return state.table && state.table.boss ? BOSSES[state.table.boss] : null; }
    function disabled(boss, def, i) { return !!(boss && ((boss.disables && boss.disables(def)) || (boss.disablesIndex && boss.disablesIndex(i, state.jokers)))); }
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
      const i = state.jokers.indexOf(j);
      const def = resolveJoker(i);
      return !!def && disabled(currentBoss(), def, i);
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
    // Mise max : une part du palier visé (et les effets des boss, tags, améliorations)
    H.maxBet = game => {
      if (!isRun) return Infinity;
      const target = state.table ? state.table.target : H.objective(state.etage, state.tableType);
      const e = H.emit('maxBet', { value: target * H.maxBetRatio(), game });
      const m = Math.max(5, Math.round(e.value));
      return game === 'uth' ? Math.max(2, Math.floor(m / 2)) : m;
    };
    H.maxBetRatio = (etage = state.etage || 1) => CONFIG.progression.miseMaxRatio * Math.pow(CONFIG.progression.miseMaxDecroissance || 1, Math.max(0, Math.min(etage, CONFIG.progression.etagesPourGagner) - 1));
    // Mise minimale : une petite part du palier (impossible de « farmer » à 1 jeton)
    H.minBet = () => (isRun && state.table && state.table.minBet ? state.table.minBet : CONFIG.progression.miseMin);
    H.excludedRanks = () => H.emit('deck.exclude', { ranks: [] }).ranks;
    H.query = (name, ctx) => H.emit(name, ctx);

    // ---------------- Relances (Dé Pipé, Fantôme, Boisson) ----------------
    H.addCharge = (src, games, n = 1) => {
      if (state.table && state.table.noRerolls) return; // Le Videur : aucune relance
      for (let i = 0; i < n; i++) state.charges.push({ src: src.uid, name: src.name, icon: src.icon, games });
      notify('change');
    };
    const perBetLeft = () => (active && CONFIG.progression.relancesParMise ? CONFIG.progression.relancesParMise - (active.play.rerolls || 0) : Infinity);
    H.charges = game => (isRun ? Math.min(perBetLeft(), state.charges.filter(c => c.games === 'any' || c.games === game).length) : 0);
    H.chargesTotal = () => (isRun ? state.charges.length : 0);
    // Coût d'une relance : une part de la mise en cours (une relance n'est jamais gratuite)
    const roundStake = r => !r ? 0 : r.hands ? r.hands.reduce((a, h) => a + (h.bet || 0), 0)
      : r.ante ? r.ante * 2 + (r.trips || 0) + (r.play || 0) : r.bets ? Object.values(r.bets).reduce((a, v) => a + v, 0) : r.bet || 0;
    H.rerollCost = () => (isRun && active ? Math.max(1, Math.round(roundStake(active.round) * (CONFIG.progression.coutRelance || 0))) : 0);
    H.useCharge = game => {
      if (perBetLeft() <= 0) return false;
      let i = state.charges.findIndex(c => c.games === game);
      if (i < 0) i = state.charges.findIndex(c => c.games === 'any');
      if (i < 0) return false;
      const cost = H.rerollCost();
      if (cost && !H.canAfford(cost)) return false;
      if (cost) {
        H.stake(cost);
        active.play.prepaid = (active.play.prepaid || 0) + cost;
        active.play.steps.push(step('flat', { uid: 'reroll', name: 'Relance', icon: '🔄' }, -cost, 'coût de la relance'));
      }
      if (active) active.play.rerolls = (active.play.rerolls || 0) + 1;
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
    // Jeu imposé par le boss (null = tous les jeux ouverts)
    H.onlyGame = () => { const b = currentBoss(); return b && b.onlyGame ? b.onlyGame : null; };
    H.canStart = id => {
      const only = H.onlyGame();
      if (only && id && id !== only) return `${currentBoss().name} : seul le ${Games.get(only).name} est ouvert à cette table.`;
      if (active) return `Termine d'abord ta main en cours (${Games.get(active.id).name}).`;
      if (!isRun) return null;
      if (state.phase !== 'play') return 'Aucune table en cours.';
      return null;
    };
    H.startPlay = (id, params) => {
      const err = H.canStart(id);
      if (err) return { error: err };
      const G = Games.get(id);
      const play = { game: id, steps: [] };
      play.flat = (me, v, label) => { if (v) play.steps.push(step('flat', me, v, label)); };
      // Frais par mise (Le Gourmand…) : vérifiés avant, prélevés après la mise
      const fee = isRun ? H.query('betFee', { fee: 0, sources: [] }) : { fee: 0 };
      if (fee.fee && !H.canAfford(fee.fee + 1)) return { error: `Il faut au moins ${fee.fee + 1} jetons (frais de ${fee.fee} par mise).` };
      const res = G.start(H, gameState(id), params, play);
      if (res.error) return res;
      if (isRun) {
        if (fee.fee) {
          // prélevés tout de suite, puis affichés comme étape du règlement (déjà payée)
          const f = Math.min(fee.fee, state.chips);
          H.stake(f);
          play.prepaid = f;
          fee.sources.forEach(me => play.steps.push(step('flat', me, -f / fee.sources.length, 'frais de mise')));
        }
      }
      state.stats.plays++;
      active = { id, round: res.round, play };
      H.emit('onBetPlaced', { game: id, round: res.round, play });
      save();
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
      save();
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
      play.stake = round2(r.staked);
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
      // La Fusion : chaque bonus en % devient un multiplicateur
      if (mods().some(m => m.def.fusion)) e.steps = e.steps.map(s => (s.kind === 'add' ? { ...s, kind: 'mult', value: Math.round((1 + s.value) * 1000) / 1000, label: (s.label ? s.label + ' · ' : '') + 'fusion' } : s));
      const steps = e.steps.map((s, i) => ({ s, i })).sort((a, b) => KIND_ORDER[a.s.kind] - KIND_ORDER[b.s.kind] || a.i - b.i).map(x => x.s);
      const add = steps.filter(s => s.kind === 'add').reduce((a, s) => a + s.value, 0);
      const mult = steps.filter(s => s.kind === 'mult').reduce((a, s) => a * s.value, 1);
      const flats = steps.filter(s => s.kind === 'flat').reduce((a, s) => a + s.value, 0);
      const gainF = e.gain > 0 ? round2(e.gain * (1 + add) * mult) : e.gain;
      // Jetons entiers : un jeton ne se coupe pas en centimes (arrondi au jeton le plus proche)
      const net = Math.round(gainF + flats);
      attribute(steps, e.gain, add, mult);
      H.give(Math.max(0, round2(e.staked + net + (play.prepaid || 0))));
      if (e.outcome === 'win') { state.stats.wins++; if (state.table) state.table.wins = (state.table.wins || 0) + 1; } else if (e.outcome === 'loss') state.stats.losses++;
      if (net > state.stats.best) { state.stats.best = net; state.stats.bestPlay = { game: id, net, staked: e.staked }; }
      active = null;
      // Seules les mises gagnantes font avancer l'objectif (un bonus sur une perte ne compte pas)
      if (isRun && state.table && e.outcome === 'win') state.table.gains = round2(state.table.gains + Math.max(0, net));
      const settlement = {
        game: id, staked: e.staked, baseBack: e.baseBack, back: e.back, gain: e.gain, outcome: e.outcome,
        steps, add, mult: round2(mult), gainFinal: gainF, flats: round2(flats), net, info: e.info,
      };
      notify('settled', settlement);
      afterPlay();
      return settlement;
    }

    // Fin de table : objectif atteint → gagnée ; sinon faillite ou plus de mises → perdu
    // Part de chaque joker dans le gain final (pour « a rapporté X jetons » et le joker MVP)
    function attribute(steps, gain, add, mult) {
      const credit = (uid, v) => {
        const j = state.jokers.find(x => x.uid === uid);
        if (!j || !isRun) return;
        j.stats = j.stats || { earned: 0, triggers: 0 };
        j.stats.earned = round2(j.stats.earned + v); j.stats.triggers++;
        const se = state.stats.jokerEarned || (state.stats.jokerEarned = {});
        se[j.id] = round2((se[j.id] || 0) + v);
        collJoker(j.id).earned = round2(collJoker(j.id).earned + v);
      };
      const mults = steps.filter(x => x.kind === 'mult');
      const logSum = mults.reduce((a, x) => a + Math.log(Math.max(1e-6, x.value)), 0);
      // gain × ((1 + Σ%) × Πmult − 1) = Σ (gain × %ᵢ × Πmult) + gain × (Πmult − 1)
      const uplift = gain > 0 ? gain * (mult - 1) : 0;
      steps.forEach(x => {
        if (!x.src) return;
        let v = 0;
        if (x.kind === 'flat' || x.kind === 'adjust') v = x.value;
        else if (x.kind === 'add') v = gain > 0 ? gain * x.value * mult : 0;
        else if (x.kind === 'mult') v = logSum ? uplift * Math.log(Math.max(1e-6, x.value)) / logSum : 0;
        credit(x.src.uid, v);
      });
    }

    function afterPlay() {
      if (!isRun) { save(); return; }
      if (state.phase !== 'play') return;
      const t = state.table;
      if (H.bankroll() >= t.target && (!t.mustWin || t.wins > 0)) return tableWon();
      if (checkBankrupt()) return;
      save();
      notify('change');
    }
    function checkBankrupt() {
      if (!isRun || active || state.chips >= H.minBet()) return false;
      const e = H.emit('onBankrupt', { saved: false });
      if (e.saved && state.chips >= H.minBet()) { notify('change'); return false; }
      gameOver('Faillite : plus assez de jetons pour miser.');
      return true;
    }

    // ---------------- Étages et tables ----------------
    const P = CONFIG.progression;
    const NEXT = { petite: 'grande', grande: 'boss' };
    // Bankroll = jetons − dettes (un prêt ne fait pas gagner une table)
    H.bankroll = () => round2(state.chips - state.debts.reduce((a, d) => a + d.left, 0));
    // Palier de la table n° k (0 = petite table de l'étage 1) : croissance de plus en plus forte
    const TYPE_INDEX = { petite: 0, grande: 1, boss: 2 };
    const nice = x => { const e = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1)); return Math.round(x / e) * e; };
    H.objective = (etage, type) => {
      const k = (etage - 1) * 3 + TYPE_INDEX[type];
      let t = P.jetonsDepart;
      for (let i = 0; i <= k; i++) t *= P.croissanceDepart + P.croissanceParTable * i;
      return nice(t);
    };
    // Les prix et montants de la config sont donnés pour un palier de référence (150) : ils suivent le palier visé
    // prix : selon le palier prévu de la table (pas selon ta bankroll : être riche ne rend pas le Comptoir plus cher)
    const refTarget = () => (isRun ? H.objective(state.etage || 1, state.table ? state.table.type : state.tableType || 'petite') : P.prixReference);
    H.scale = v => (v > 0 ? Math.max(1, Math.round(v * refTarget() / P.prixReference)) : 0);
    H.sellValue = j => Math.floor((j.paid != null ? j.paid : H.scale(JOKERS[j.id].price)) * CONFIG.shop.sellRatio);
    H.loanOptions = () => CONFIG.loans.options.map(o => ({ ...o, amount: H.scale(o.amount) }));
    // Infos d'une table de l'étage courant (pour l'écran de choix)
    // Palier réel d'une table : le palier prévu, ou au moins +X % de la bankroll actuelle
    // (une grosse avance ne fait jamais gagner une table, ni un boss, sans jouer)
    H.tableTarget = type => H.objective(state.etage, type);
    H.tableInfo = type => ({
      type, target: state.tableType === type ? H.tableTarget(type) : H.objective(state.etage, type), reward: Math.round(P.recompenseTable[type] * H.objective(state.etage, type)),
      boss: type === 'boss' ? state.bossId : null, tag: state.tagOffers[type] || null,
      status: state.etageLog[type] || (state.tableType === type ? 'current' : 'upcoming'),
      // mise max de base (sans jokers ni tags), réduite par le Directeur Pressé
      maxBet: Math.max(5, Math.round((state.tableType === type ? H.tableTarget(type) : H.objective(state.etage, type)) * H.maxBetRatio()
        * (type === 'boss' && state.bossId === 'presse' ? CONFIG.bosses.presse.maxBet : 1))),
    });
    function newEtage() {
      const seen = state.bossSeen || (state.bossSeen = []);
      const pool = BOSS_DEFS.filter(b => !b.final && !seen.includes(b.id));
      state.bossId = state.etage === P.etagesPourGagner && !state.infinite ? 'patron' : (pool.length ? rng.pick(pool) : rng.pick(BOSS_DEFS.filter(b => !b.final))).id;
      seen.push(state.bossId); if (seen.length >= BOSS_DEFS.length - 1) seen.length = 0;
      state.tagOffers = { petite: rng.pick(TAG_DEFS).id, grande: rng.pick(TAG_DEFS).id };
      state.etageLog = {};
      state.tableType = 'petite';
    }
    H.chooseTable = () => {
      if (state.phase !== 'choose') return { error: 'Choisis d\'abord ta table.' };
      state.starter = null; // joker de départ non choisi : tant pis
      const t = state.table = {
        type: state.tableType, etage: state.etage, target: H.tableTarget(state.tableType), gains: 0,
        boss: state.tableType === 'boss' ? state.bossId : null, start: H.bankroll(),
      };
      t.minBet = Math.max(P.miseMin, Math.round(t.target * P.miseMinRatio));
      state.charges = [];
      state.phase = 'play';
      H.addCharge({ uid: 'table', name: 'Relance', icon: '🔄' }, 'any', P.relancesParTable);
      H.emit('onRoundStart', { table: t, round: t });
      if (t.noRerolls) state.charges = [];
      notify('table');
      // Bankroll déjà au palier : table gagnée d'office
      // Bankroll déjà au palier : la table se valide en gagnant une seule mise (jamais d'office)
      t.mustWin = H.bankroll() >= t.target; t.wins = 0;
      if (!checkBankrupt()) save();
      return { ok: true };
    };
    // Joker de départ : choix entre quelques jokers communs
    H.offerStarter = () => {
      const pool = JOKER_DEFS.filter(d => d.rarity === 'commun').map(d => d.id);
      state.starter = rng.shuffle(pool).slice(0, P.jokerDeDepart);
    };
    H.pickStarter = id => {
      if (!state.starter || !state.starter.includes(id)) return { error: 'Choix impossible.' };
      state.starter = null;
      H.addJoker(id);
      save(); notify('change');
      return { ok: true };
    };
    // Passer la petite ou la grande table contre un tag
    H.skipTable = () => {
      if (state.phase !== 'choose') return { error: 'Impossible maintenant.' };
      if (state.tableType === 'boss') return { error: 'Impossible de passer le boss.' };
      const tag = state.tagOffers[state.tableType];
      let text = '';
      if (tag === 'cadeau') {
        const id = rng.pick(CONSUMABLE_DEFS).id;
        if (state.consumables.length < state.consSlots) { state.consumables.push(id); text = `🎁 ${CONSUMABLES[id].name} offert !`; }
        else { const v = H.scale(CONSUMABLES[id].price); H.give(v); text = `🎁 Poches pleines : ${v} jetons à la place.`; }
      } else if (tag) { H.addStatus(tag); text = `${STATUSES[tag].icon} Tag ${STATUSES[tag].name} obtenu.`; }
      state.etageLog[state.tableType] = 'skipped';
      state.tableType = NEXT[state.tableType];
      save(); notify('change');
      return { ok: true, text };
    };

    function tableWon() {
      const t = state.table;
      const I = P.interets;
      const lines = [];
      const interest = Math.floor(Math.min(I.maxPalier * t.target, I.taux * state.chips));
      const reward = Math.round(P.recompenseTable[t.type] * t.target);
      H.give(reward); lines.push({ label: { petite: 'Petite table gagnée', grande: 'Grande table gagnée', boss: 'Boss vaincu' }[t.type], value: reward });
      if (interest > 0) { H.give(interest); lines.push({ label: `Intérêts (${Math.round(I.taux * 100)} % de tes jetons)`, value: interest }); }
      const e = { lines, table: t, reward(me, v, label) { H.give(v); lines.push({ label, value: v, src: me.uid }); me.flash(`+${v}`); attribute([{ kind: 'flat', value: v, src: { uid: me.uid } }], 0, 0, 1); } };
      H.emit('onRoundEnd', e);
      processDebts(lines);
      state.stats.tablesWon++;
      state.etageLog[t.type] = 'won';
      let victory = false;
      if (t.type === 'boss') {
        coll().bosses[t.boss] = (coll().bosses[t.boss] || 0) + 1;
        meta.prestige += CONFIG.prestige.perBoss;
        meta.best = Math.max(meta.best, state.etage);
        if (state.etage === P.etagesPourGagner && !state.infinite) {
          victory = true;
          meta.wins++;
          state.jokers.forEach(j => collJoker(j.id).wins++);
          meta.prestige += CONFIG.prestige.victory;
        } else { state.etage++; newEtage(); }
      } else state.tableType = NEXT[t.type];
      H.saveMeta();
      state.summary = { type: t.type, etage: t.etage, lines, victory, target: t.target, boss: t.boss };
      state.table = null;
      state.charges = [];
      state.shop = genShop(0);
      H.emit('onShopEnter', { shop: state.shop, rollJoker, scale: H.scale });
      state.phase = victory ? 'victory' : 'shop';
      save();
      notify(victory ? 'victory' : 'shop');
    }
    // Après la victoire finale : continuer en mode infini
    H.continueInfinite = () => {
      if (state.phase !== 'victory') return;
      state.infinite = true;
      state.etage++;
      newEtage();
      state.phase = 'shop';
      save(); notify('shop');
    };
    H.leaveShop = () => {
      if (state.phase !== 'shop') return;
      state.summary = null;
      state.phase = 'choose';
      save(); notify('choose');
    };
    function gameOver(reason) {
      state.phase = 'over';
      state.reason = reason;
      meta.best = Math.max(meta.best, state.etage - 1);
      H.saveMeta();
      if (persist) Storage.remove(SAVE_KEY);
      notify('over', { reason });
    }

    // ---------------- Jokers ----------------
    H.addJoker = id => {
      if (state.jokers.length >= state.jokerSlots) return false;
      state.jokers.push({ uid: state.uid++, id, state: {}, stats: { earned: 0, triggers: 0 } });
      if (!state.stats.jokersOwned.includes(id)) state.stats.jokersOwned.push(id);
      const c = collJoker(id); c.owned++; c.seen = Math.max(c.seen, 1); H.saveMeta();
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
      const v = H.sellValue(j);
      const index = state.jokers.indexOf(j);
      const charges = state.charges.filter(c => c.src === uid);
      H.removeJoker(uid);
      H.give(v);
      state.lastSale = { joker: JSON.parse(JSON.stringify(j)), index, value: v, charges, plays: state.stats.plays, phase: state.phase };
      save();
      return { ok: true, value: v };
    };
    // Annule la dernière vente tant qu'aucune mise n'a été jouée depuis
    H.canUndoSell = () => {
      const l = state.lastSale;
      return !!l && l.plays === state.stats.plays && l.phase === state.phase && !active && state.jokers.length < state.jokerSlots && H.canAfford(l.value);
    };
    H.undoSell = () => {
      if (!H.canUndoSell()) return { error: 'Impossible d\'annuler cette vente.' };
      const l = state.lastSale;
      H.stake(l.value);
      state.jokers.splice(Math.min(l.index, state.jokers.length), 0, l.joker);
      state.charges.push(...l.charges);
      state.lastSale = null;
      save(); notify('change');
      return { ok: true };
    };
    // Déplace un joker à une position donnée (glisser-déposer)
    H.moveJokerTo = (uid, index) => {
      const i = state.jokers.findIndex(x => x.uid === uid);
      if (i < 0) return;
      const [j] = state.jokers.splice(i, 1);
      state.jokers.splice(Math.max(0, Math.min(index, state.jokers.length)), 0, j);
      notify('change'); save();
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
      const w = CONFIG.shop.rarityWeights(state.etage);
      if (minRarity === 'rare') w.commun = 0;
      const tiers = Object.keys(w).filter(r => w[r] > 0 && pool.some(d => d.rarity === r)).map(r => ({ r, w: w[r] }));
      const tier = tiers.length ? rng.weighted(tiers).r : pool[0].rarity;
      return rng.pick(pool.filter(d => d.rarity === tier)).id;
    }
    function genShop(rerolls) {
      const S = CONFIG.shop, offers = [], taken = [];
      for (let i = 0; i < S.jokers; i++) { const id = rollJoker({ exclude: taken }); if (id) { taken.push(id); offers.push({ kind: 'joker', id }); } }
      const cons = CONSUMABLE_DEFS.slice();
      for (let i = 0; i < S.consumables && cons.length; i++) offers.push({ kind: 'consumable', id: cons.splice(rng.int(cons.length), 1)[0].id });
      for (let i = 0; i < S.packs; i++) offers.push({ kind: 'pack', id: rng.pick(PACK_DEFS).id });
      const ups = UPGRADE_DEFS.filter(u => !state.upgrades.includes(u.id));
      for (let i = 0; i < S.upgrades && ups.length; i++) offers.push({ kind: 'upgrade', id: ups.splice(rng.int(ups.length), 1)[0].id });
      offers.forEach(o => { o.price = H.scale(CATALOG[o.id].price); o.sold = false; if (o.kind === 'joker') collJoker(o.id).seen++; });
      H.saveMeta();
      return { offers, rerolls, rerollCost: H.scale(CONFIG.shop.reroll.base + CONFIG.shop.reroll.step * rerolls) };
    }
    H.reroll = () => {
      if (state.phase !== 'shop') return { error: 'Le shop est fermé.' };
      const c = state.shop.rerollCost;
      if (!H.stake(c)) return { error: 'Pas assez de jetons.' };
      state.shop = genShop((state.shop.rerolls || 0) + 1);
      save(); notify('change');
      return { ok: true };
    };
    H.slotPrice = () => { const p = CONFIG.shop.jokerSlots.prices[state.slotBuys]; return p ? H.scale(p) : 0; };
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
      if (o.kind === 'joker') { H.addJoker(o.id); state.jokers[state.jokers.length - 1].paid = o.price; }
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
      if (def.inPlayOnly && state.phase !== 'play') return { ok: false, text: 'À utiliser pendant une table.' };
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
      H.give(Math.floor(H.scale(CONSUMABLES[id].price) * CONFIG.shop.sellRatio));
      save(); notify('change');
    };

    // ---------------- Prêts ----------------
    H.takeLoan = id => {
      const opt = H.loanOptions().find(o => o.id === id);
      if (!opt) return { error: 'Prêt inconnu.' };
      if (state.debts.length >= CONFIG.loans.maxActive) return { error: 'Rembourse d\'abord ton prêt en cours.' };
      const free = state.jokers.some(j => JOKERS[j.id].noLoanInterest);
      const total = Math.round(opt.amount * (1 + (free ? 0 : opt.rate)));
      state.debts.push({ id, name: opt.name, total, left: total, per: Math.ceil(total / opt.tables), missed: 0 });
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
          lines.push({ label: `⚖️ Échéance impayée : pénalité +${pen} et l'huissier réduit la mise max`, value: 0, bad: true });
          H.addStatus('huissier');
        }
        return d.left > 0;
      });
      notify('chips');
    }

    // ---------------- Sauvegarde ----------------
    // Sauvegarde : aussi pendant un coup (la mise engagée est alors perdue si on recharge la page)
    function save() {
      if (!persist) return;
      if (isRun && state.phase !== 'over') Storage.set(SAVE_KEY, state);
      if (!isRun) Storage.set(FREE_KEY, { chips: state.chips, rng: state.rng, seed: state.seed });
    }
    H.save = save;
    H.resetFree = () => { if (!isRun) { state.chips = CONFIG.freeChips; save(); notify('chips'); } };
    H.newEtage = newEtage;
    return H;
  }

  return {
    VERSION, SAVE_KEY, loadMeta,
    newRun({ seed, meta, persist } = {}) {
      const s = (seed && String(seed).trim().toUpperCase()) || RNG.randomSeed();
      const H = createHost(newRunState(s), { meta, persist });
      H.meta.runs++; H.saveMeta();
      H.newEtage();
      H.offerStarter();
      H.save();
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

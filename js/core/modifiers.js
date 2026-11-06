// =====================================================================
//  MODIFICATEURS — jokers, patrons, règles de la Roue Folle, améliorations,
//  statuts et consommables. Chacun est un objet de données + des fonctions
//  qui réagissent à des événements. Les jeux n'en connaissent aucun : ils
//  émettent des événements et lisent un contexte que les modificateurs modifient.
//
//  Événements de cycle :   onRoundStart / onRoundEnd (début / victoire d'une table), onShopEnter, onBetPlaced,
//                          onCardDrawn, onDraw, onResolve, onSettle, onWin,
//                          onLoss, onPush, onBankrupt
//  Requêtes (contexte) :   maxBet, deck.exclude, bj.rules, bj.dealerSkip, bj.info,
//                          uth.rules, dice.edge, slots.symbols, slots.wild
//
//  Signature : handler(e, me) — e = contexte de l'événement,
//  me = { host, state, uid, name, icon, flash(texte), remove() }.
// =====================================================================
const J = CONFIG.jokers;
const pct = x => `${Math.round(x * 100)} %`;
const countSevens = v => (String(v).match(/7/g) || []).length;

const JOKER_DEFS = [
  // ---------------- Communs ----------------
  { id: 'porte', name: 'Le Porte-Bonheur', icon: '🍀', desc: () => `+${pct(J.porte.pct)} sur tous tes gains.`,
    onSettle(e, me) { if (e.outcome === 'win') e.add(me, J.porte.pct); } },
  { id: 'rouge', name: 'Le Rouge Fidèle', icon: '🌹', desc: () => `Les mises sur le rouge à la roulette paient ×${2 + J.rouge.bonus} au lieu de ×2.`,
    onResolve(e, me) {
      const b = e.info && e.info.bets && e.info.bets.red;
      if (e.game === 'roulette' && b && e.info.color === 'red' && !e.info.redVoid) e.adjust(me, b * J.rouge.bonus, 'rouge payé plus');
    } },
  { id: 'septieme', name: 'Le Septième Ciel', icon: '7️⃣', desc: () => `Chaque 7 tiré, quel que soit le jeu, rapporte +${J.septieme.bonus} jetons.`,
    onCardDrawn(e, me) { if (e.card.rank === 7) e.play.flat(me, J.septieme.bonus, '7 tiré'); },
    onDraw(e, me) {
      const n = e.kind === 'symbol' ? (e.value === 'sept' ? 1 : 0) : countSevens(e.value);
      if (n) e.play.flat(me, J.septieme.bonus * n, n > 1 ? `${n} × 7 tirés` : '7 tiré');
    } },
  { id: 'molle', name: 'La Main Molle', icon: '🧤', desc: () => `Au blackjack, ta première défaite de chaque table est remboursée à ${pct(J.molle.refund)}.`,
    onRoundStart(e, me) { me.state.used = false; },
    onLoss(e, me) {
      if (e.game !== 'bj' || me.state.used) return;
      me.state.used = true;
      e.flat(me, -e.gain * J.molle.refund, 'défaite remboursée');
    } },
  { id: 'compteur', name: 'Le Compteur', icon: '🧮', desc: () => 'Affiche le nombre de cartes hautes (10 à As) restantes dans le sabot du blackjack.',
    'bj.info'(e) { e.lines.push(`🧮 Cartes hautes restantes : <b>${e.high}</b> / ${e.total} (${Math.round(e.high / Math.max(1, e.total) * 100)} %)`); } },
  { id: 'consolation', name: 'Le Lot de Consolation', icon: '🎗️', desc: () => `Chaque perte te rapporte ${J.consolation.bonus} jetons.`,
    onLoss(e, me) { e.flat(me, J.consolation.bonus, 'consolation'); } },
  { id: 'depipe', name: 'Le Dé Pipé', icon: '🎲', desc: () => 'Une relance de plus par table, réservée au Dice.',
    onRoundStart(e, me) { me.host.addCharge(me, 'dice', J.depipe.charges); } },

  // ---------------- Rares ----------------
  { id: 'corrompu', name: 'Le Croupier Corrompu', icon: '🤵', desc: () => 'Au blackjack, le croupier tire une carte de moins.',
    'bj.dealerSkip'(e, me) { e.skip += J.corrompu.cards; e.sources.push(me); } },
  { id: 'martingale', name: 'La Martingale', icon: '📈', desc: () => `Chaque perte consécutive ajoute +${pct(J.martingale.pct)} à ton prochain gain (cumulable).`,
    onSettle(e, me) { if (e.outcome === 'win' && me.state.streak) e.add(me, J.martingale.pct * me.state.streak, `${me.state.streak} perte(s) d'affilée`); },
    onWin(e, me) { me.state.streak = 0; },
    onLoss(e, me) { me.state.streak = (me.state.streak || 0) + 1; } },
  { id: 'zero', name: 'Le Zéro Ami', icon: '🟢', desc: () => 'Le 0 à la roulette ne te fait plus perdre : tes mises te sont rendues.',
    onResolve(e, me) {
      if (e.game !== 'roulette' || e.info.n !== 0) return;
      const lost = Object.entries(e.info.bets).filter(([k]) => k !== 'n0').reduce((a, [, v]) => a + v, 0);
      if (lost > 0) e.adjust(me, lost, 'mises rendues sur le 0');
    } },
  { id: 'cerise', name: 'Triple Cerise', icon: '🍒', desc: () => `Les cerises remplacent n'importe quel symbole dans les machines à sous (ligne complétée payée ${pct(J.cerise.wildRatio)}).`,
    'slots.wild'(e, me) { e.wild = 'cerise'; e.ratio = J.cerise.wildRatio; e.sources.push(me); } },
  { id: 'pickpocket', name: 'Le Pickpocket', icon: '🕵️', desc: () => `Quand un joueur IA gagne à la roulette, tu récupères ${pct(J.pickpocket.pct)} de son gain (au plus ta mise).`,
    onSettle(e, me) { if (e.info && e.info.aiWin > 0) e.flat(me, Math.min(e.staked, e.info.aiWin * J.pickpocket.pct), 'gains des voisins'); } },
  { id: 'miroir', name: 'Le Miroir', icon: '🪞', desc: () => 'Copie l\'effet du joker placé à sa droite.', copyRight: true },
  { id: 'assurance', name: 'L\'Assurance-Vie', icon: '🛟', desc: () => `Si tu tombes à 0 jeton, tu repars avec ${J.assurance.amount} jetons. Usage unique.`,
    onBankrupt(e, me) {
      if (e.saved) return;
      e.saved = true;
      me.host.give(J.assurance.amount);
      me.flash(`+${J.assurance.amount}`);
      me.host.notify('toast', { text: `🛟 L'Assurance-Vie te sauve : +${J.assurance.amount} jetons !` });
      me.remove();
    } },

  // ---------------- Légendaires ----------------
  { id: 'parrain', name: 'Le Parrain', icon: '🎩', desc: () => `+${J.parrain.perJoker} multiplicateur de gains pour chaque autre joker que tu possèdes.`,
    onSettle(e, me) {
      const n = me.host.state.jokers.length - 1;
      if (e.outcome === 'win' && n > 0) e.add(me, n * J.parrain.perJoker, `${n} autre(s) joker(s)`);
    } },
  { id: 'tricheur', name: 'Le Tricheur Maladroit', icon: '🃏', desc: () => `Tes gains sont multipliés par ${J.tricheur.mult}, mais à chaque table gagnée tu as ${pct(J.tricheur.catchChance)} de chances d'être pris : tu perds un joker au hasard.`,
    onSettle(e, me) { if (e.outcome === 'win') e.mult(me, J.tricheur.mult); },
    onRoundEnd(e, me) {
      const H = me.host;
      if (!H.state.jokers.length || !H.rng.chance(J.tricheur.catchChance)) return;
      const victim = H.rng.pick(H.state.jokers);
      e.lines.push({ label: `🃏 Tricheur pris la main dans le sac : ${JOKERS[victim.id].name} confisqué`, value: 0, bad: true });
      H.removeJoker(victim.uid);
    } },
  { id: 'roue', name: 'La Roue Folle', icon: '🎡', desc: () => 'À chaque table, une règle du casino change au hasard, toujours un peu en ta faveur.',
    onRoundStart(e, me) {
      const active = me.host.activeRules();
      const free = RULE_DEFS.filter(r => !active.includes(r.id));
      me.state.rules = free.length ? [me.host.rng.pick(free).id] : [];
    },
    // Les règles tirées agissent comme des modificateurs « enfants » du joker
    children: me => (me.state.rules || []).map(id => RULES[id]).filter(Boolean) },
  { id: 'banquier', name: 'Le Banquier', icon: '🏦', desc: () => `Tu touches ${pct(J.banquier.rate)} d'intérêts sur tes jetons à chaque table gagnée (${J.banquier.cap} max).`,
    onRoundEnd(e, me) {
      const v = Math.min(J.banquier.cap, Math.floor(me.host.chips() * J.banquier.rate));
      if (v > 0) e.reward(me, v, '🏦 Intérêts du Banquier');
    } },
  { id: 'fantome', name: 'Le Fantôme du Casino', icon: '👻', desc: () => 'Une relance de plus par table : annule un tirage et refais-le (carte au blackjack, dé, roulette, machine).',
    onRoundStart(e, me) { me.host.addCharge(me, 'any', J.fantome.charges); } },
  { id: 'jackpot', name: 'Jackpot Éternel', icon: '💎', desc: h => `Chaque table gagnée ajoute +${J.jackpot.step} à son multiplicateur de gains (×${J.jackpot.max} max). Il ne se réinitialise jamais, même entre les parties.${h ? ` Actuellement ×${h.meta.jackpot.toFixed(1)}.` : ''}`,
    onSettle(e, me) { if (e.outcome === 'win' && me.host.meta.jackpot !== 1) e.mult(me, me.host.meta.jackpot); },
    onRoundEnd(e, me) { me.host.meta.jackpot = Math.min(J.jackpot.max, Math.round((me.host.meta.jackpot + J.jackpot.step) * 10) / 10); me.host.saveMeta(); me.flash(`×${me.host.meta.jackpot.toFixed(1)}`); } },
];
JOKER_DEFS.forEach(d => Object.assign(d, { kind: 'joker', rarity: J[d.id].rarity, price: J[d.id].price }));
const JOKERS = Object.fromEntries(JOKER_DEFS.map(d => [d.id, d]));

// ---------------- Règles de la Roue Folle ----------------
const R = CONFIG.rules;
const RULE_DEFS = [
  { id: 'bj21', name: 'Blackjack payé 2:1', desc: () => 'Le Blackjack paie 2:1.', 'bj.rules'(e) { e.bjPay = Math.max(e.bjPay, R.bj21.bjPay); } },
  { id: 'diceFair', name: 'Dé honnête', desc: () => 'Dice sans avantage maison.', 'dice.edge'(e) { e.edge = Math.max(e.edge, R.diceFair.edge); } },
  { id: 'plein40', name: 'Plein généreux', desc: () => `Roulette : le numéro plein paie ${R.plein40.straight - 1}:1.`,
    onResolve(e, me) {
      if (e.game !== 'roulette') return;
      const s = e.info.bets['n' + e.info.n];
      if (s) e.adjust(me, s * (R.plein40.straight - CONFIG.games.roulette.straight), 'plein généreux');
    } },
  { id: 'slots15', name: 'Machines en folie', desc: () => `Machines à sous : gains ×${R.slots15.mult}.`, onSettle(e, me) { if (e.game === 'slots' && e.outcome === 'win') e.mult(me, R.slots15.mult); } },
  { id: 'charlie', name: 'Charlie', desc: () => `Blackjack : ${R.charlie.cards} cartes sans dépasser 21 = victoire.`, 'bj.rules'(e) { e.charlie = R.charlie.cards; } },
  { id: 'uthTrips', name: 'Blind du brelan', desc: () => 'Hold\'em : la Blind paie aussi 1:1 sur un brelan.', 'uth.rules'(e) { e.blindPay[3] = e.blindPay[3] || 1; } },
];
RULE_DEFS.forEach(d => (d.kind = 'rule'));
const RULES = Object.fromEntries(RULE_DEFS.map(d => [d.id, d]));

// ---------------- Boss (3e table de chaque étage) ----------------
const B = CONFIG.bosses;
const BOSS_DEFS = [
  { id: 'avare', name: 'Le Croupier Avare', desc: () => `Tous les gains sont réduits de ${pct(1 - B.avare.mult)}.`,
    onSettle(e, me) { if (e.outcome === 'win') e.mult(me, B.avare.mult, 'gains réduits'); } },
  { id: 'presse', name: 'Le Directeur Pressé', desc: () => `Seulement ${B.presse.bets} mises à cette table.`,
    onRoundStart(e) { e.table.bets = B.presse.bets; } },
  { id: 'noir', name: 'La Dame en Noir', desc: () => 'Les mises sur le rouge ne paient rien.',
    onResolve(e, me) {
      const b = e.info && e.info.bets && e.info.bets.red;
      if (e.game === 'roulette' && b && e.info.color === 'red') { e.info.redVoid = true; e.adjust(me, -b * CONFIG.games.roulette.even, 'le rouge ne paie rien'); }
    } },
  { id: 'sobre', name: 'Le Videur', desc: () => 'Aucune relance autorisée.', onRoundStart(e) { e.table.noRerolls = true; } },
  { id: 'endormi', name: 'Le Gardien Endormi', desc: () => 'Le joker le plus à gauche est désactivé.', disablesIndex: i => i === 0 },
  { id: 'gourmand', name: 'Le Gourmand', desc: () => `Chaque mise coûte ${B.gourmand.fee} jetons en plus.`,
    betFee(e, me) { e.fee += B.gourmand.fee; e.sources.push(me); } },
];
BOSS_DEFS.forEach(d => (d.kind = 'boss'));
const BOSSES = Object.fromEntries(BOSS_DEFS.map(d => [d.id, d]));

// ---------------- Améliorations de table ----------------
const U = CONFIG.upgrades;
const UPGRADE_DEFS = [
  { id: 'vip', name: 'Table VIP', icon: '👑', desc: () => `+${U.vip.bets} mise à chaque table.`, onRoundStart(e) { e.table.bets += U.vip.bets; } },
  { id: 'truque', name: 'Sabot truqué', icon: '🗃️', desc: () => `Retire tous les ${U.truque.ranks.join(' et ')} du paquet (Blackjack et Hold'em).`,
    'deck.exclude'(e) { U.truque.ranks.forEach(r => { if (!e.ranks.includes(r)) e.ranks.push(r); }); } },
  { id: 'doree', name: 'Machine dorée', icon: '💠', desc: () => `Ajoute un symbole Diamant ×${CONFIG.games.slots.diamant.pay} aux machines à sous.`,
    'slots.symbols'(e) { if (!e.symbols.some(s => s.id === 'diamant')) e.symbols.push(CONFIG.games.slots.diamant); } },
];
UPGRADE_DEFS.forEach(d => Object.assign(d, { kind: 'upgrade', price: U[d.id].price }));
const UPGRADES = Object.fromEntries(UPGRADE_DEFS.map(d => [d.id, d]));

// ---------------- Statuts temporaires et tags ----------------
// Les tags s'obtiennent en passant une petite ou une grande table.
const T = CONFIG.tags;
const STATUS_DEFS = [
  { id: 'golden', name: 'Jeton Doré', icon: '🪙', desc: () => 'Ta prochaine mise : si elle gagne, son gain est doublé.',
    onSettle(e, me) { if (e.outcome === 'win') e.mult(me, CONFIG.consumables.dore.mult, 'Jeton Doré'); me.remove(); } },
  { id: 'huissier', name: 'Huissier', icon: '⚖️', desc: () => `Échéance de prêt impayée : ${CONFIG.loans.penaltyBets} mises de moins à la prochaine table.`,
    onRoundStart(e, me) { e.table.bets -= CONFIG.loans.penaltyBets; me.remove(); } },
  { id: 'soldes', tag: true, name: 'Soldes', icon: '🏷️', desc: () => `Prochain shop : tout à −${pct(T.soldes.discount)}.`,
    onShopEnter(e, me) { e.shop.offers.forEach(o => (o.price = Math.ceil(o.price * (1 - T.soldes.discount)))); me.remove(); } },
  { id: 'cadeau', tag: true, name: 'Paquet cadeau', icon: '🎁', desc: () => 'Un consommable gratuit, tout de suite.', instant: true },
  { id: 'turbo', tag: true, name: 'Turbo', icon: '⚡', desc: () => `+${T.turbo.bets} mises à la prochaine table.`,
    onRoundStart(e, me) { e.table.bets += T.turbo.bets; me.remove(); } },
  { id: 'collection', tag: true, name: 'Collectionneur', icon: '💜', desc: () => 'Le prochain shop propose un joker rare ou légendaire garanti.',
    onShopEnter(e, me) {
      const i = e.shop.offers.findIndex(o => o.kind === 'joker');
      const id = e.rollJoker({ minRarity: 'rare', exclude: e.shop.offers.map(o => o.id) });
      if (id) { const o = { kind: 'joker', id, price: JOKERS[id].price, sold: false }; if (i >= 0) e.shop.offers[i] = o; else e.shop.offers.unshift(o); }
      me.remove();
    } },
  { id: 'investisseur', tag: true, name: 'Investisseur', icon: '💼', desc: () => `+${T.investisseur.amount} jetons à la prochaine table gagnée.`,
    onRoundEnd(e, me) { e.reward(me, T.investisseur.amount, '💼 Tag Investisseur'); me.remove(); } },
  { id: 'double', tag: true, name: 'Double ou rien', icon: '🔁', desc: () => `+${T.double.rerolls} relances à la prochaine table.`,
    onRoundStart(e, me) { me.host.addCharge(me, 'any', T.double.rerolls); me.remove(); } },
];
STATUS_DEFS.forEach(d => (d.kind = 'status'));
const STATUSES = Object.fromEntries(STATUS_DEFS.map(d => [d.id, d]));
const TAG_DEFS = STATUS_DEFS.filter(d => d.tag);

// ---------------- Consommables ----------------
// use(host, ctx) → { ok, text } ; ctx = { game, round } du jeu affiché
const CONSUMABLE_DEFS = [
  { id: 'bonus', name: 'Carte Bonus', icon: '🎴', desc: () => 'Ajoute une carte de ton choix dans ta main (pendant une main de Blackjack ou de Hold\'em).',
    capability: 'bonusCard', use: (H, ctx, card) => H.useCapability(ctx, 'bonusCard', card) },
  { id: 'dore', name: 'Jeton Doré', icon: '🪙', desc: () => 'Ta prochaine mise : si elle gagne, son gain est doublé (perdue sinon).', inPlayOnly: true,
    use: H => { H.addStatus('golden'); return { ok: true, text: '🪙 Ta prochaine mise compte double !' }; } },
  { id: 'boisson', name: 'Boisson du Bar', icon: '🍸', desc: () => '+1 relance à cette table (dé, roulette, machine ou carte au blackjack).', inPlayOnly: true,
    use: H => { H.addCharge({ uid: 'boisson', name: 'Boisson du Bar', icon: '🍸' }, 'any', 1); return { ok: true, text: '🍸 +1 relance pour cette table.' }; } },
  { id: 'potdevin', name: 'Pot-de-vin', icon: '💰', desc: () => 'Le croupier révèle sa carte cachée (pendant une main de Blackjack ou de Hold\'em).',
    capability: 'bribe', use: (H, ctx) => H.useCapability(ctx, 'bribe') },
  { id: 'ticket', name: 'Ticket à gratter', icon: '🎟️', desc: () => 'Gain aléatoire de 0 à 100 jetons.',
    use: H => {
      const t = H.rng.weighted(CONFIG.consumables.ticket.table);
      const g = H.rng.range(t.min, t.max);
      if (g) H.give(g);
      return { ok: true, text: g ? `🎟️ Ticket gagnant : +${g} jetons !` : '🎟️ Perdu… rien sous la pellicule.', sound: g ? 'coins' : 'lose' };
    } },
];
CONSUMABLE_DEFS.forEach(d => Object.assign(d, { kind: 'consumable', price: CONFIG.consumables[d.id].price }));
const CONSUMABLES = Object.fromEntries(CONSUMABLE_DEFS.map(d => [d.id, d]));

// ---------------- Packs ----------------
const PACK_DEFS = [
  { id: 'petit', name: 'Petit pack', icon: '🎁', desc: () => `${CONFIG.packs.petit.choices} jokers communs : choisis-en un.` },
  { id: 'mystere', name: 'Pack mystère', icon: '❓', desc: () => '1 joker aléatoire, rare au minimum.' },
];
PACK_DEFS.forEach(d => Object.assign(d, { kind: 'pack', price: CONFIG.packs[d.id].price }));
const PACKS = Object.fromEntries(PACK_DEFS.map(d => [d.id, d]));

const CATALOG = { ...JOKERS, ...UPGRADES, ...CONSUMABLES, ...PACKS };
const RARITY_LABEL = { commun: 'Commun', rare: 'Rare', legendaire: 'Légendaire' };

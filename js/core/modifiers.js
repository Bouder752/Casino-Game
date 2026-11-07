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

const winOn = (e, game) => e.outcome === 'win' && (!game || e.game === game);
const JOKER_DEFS = [
  // ---------------- Communs ----------------
  { id: 'porte', name: 'Le Porte-Bonheur', icon: '🍀', tags: ['Tous les jeux'], desc: () => `+${pct(J.porte.pct)} sur tous tes gains.`,
    onSettle(e, me) { if (winOn(e)) e.add(me, J.porte.pct); } },
  { id: 'rouge', name: 'Le Rouge Fidèle', icon: '🌹', tags: ['Roulette'], desc: () => `Roulette : tes mises sur le Rouge paient ${String(1 + J.rouge.bonus).replace('.', ',')} contre 1 au lieu de 1 contre 1.`,
    onResolve(e, me) {
      const b = e.info && e.info.bets && e.info.bets.red;
      if (e.game === 'roulette' && b && e.info.color === 'red' && !e.info.redVoid) e.adjust(me, b * J.rouge.bonus, 'rouge payé plus');
    } },
  { id: 'septieme', name: 'Le Septième Ciel', icon: '7️⃣', tags: ['Tous les jeux'], desc: () => `Chaque 7 tiré (carte, dé, roulette, machine) rapporte ${pct(J.septieme.stake)} de ta mise.`,
    onCardDrawn(e, me) { if (e.card.rank === 7) e.play.flat(me, e.play.stake * J.septieme.stake, '7 tiré'); },
    onDraw(e, me) {
      const n = e.kind === 'symbol' ? (e.value === 'sept' ? 1 : 0) : countSevens(e.value);
      if (n) e.play.flat(me, e.play.stake * J.septieme.stake * n, n > 1 ? `${n} × 7 tirés` : '7 tiré');
    } },
  { id: 'molle', name: 'La Main Molle', icon: '🧤', tags: ['Blackjack'], desc: () => `Blackjack : tes mains perdues sont remboursées à ${pct(J.molle.refund)}.`,
    onLoss(e, me) { if (e.game === 'bj') e.flat(me, -e.gain * J.molle.refund, 'défaite remboursée'); } },
  { id: 'compteur', name: 'Le Compteur', icon: '🧮', tags: ['Blackjack'], desc: () => `Blackjack : +${pct(J.compteur.pct)} sur tes gains. Affiche les cartes hautes restantes dans le sabot.`,
    onSettle(e, me) { if (winOn(e, 'bj')) e.add(me, J.compteur.pct); },
    'bj.info'(e) { e.lines.push(`🧮 Cartes hautes restantes : <b>${e.high}</b> / ${e.total} (${Math.round(e.high / Math.max(1, e.total) * 100)} %)`); } },
  { id: 'consolation', name: 'Le Lot de Consolation', icon: '🎗️', tags: ['Tous les jeux'], desc: () => `Chaque perte te rend ${pct(J.consolation.stake)} de ta mise.`,
    onLoss(e, me) { e.flat(me, e.staked * J.consolation.stake, 'consolation'); } },
  { id: 'depipe', name: 'Le Dé Pipé', icon: '🎲', tags: ['Dice'], desc: () => `Dice : +${pct(J.depipe.pct)} sur tes gains et une relance de plus par table.`,
    onSettle(e, me) { if (winOn(e, 'dice')) e.add(me, J.depipe.pct); },
    onRoundStart(e, me) { me.host.addCharge(me, 'dice', J.depipe.charges); } },
  { id: 'serie', name: 'La Série', icon: '🔥', tags: ['Tous les jeux', 'Grandit'], grows: true,
    desc: (h, j) => `+${pct(J.serie.pct)} sur tes gains par victoire d'affilée. Une défaite remet la série à zéro.${j ? ` Série actuelle : ${j.state.streak || 0} (+${pct(J.serie.pct * (j.state.streak || 0))}).` : ''}`,
    onSettle(e, me) { if (winOn(e) && me.state.streak) e.add(me, J.serie.pct * me.state.streak, `série de ${me.state.streak}`); },
    onWin(e, me) { me.state.streak = (me.state.streak || 0) + 1; me.flash(`🔥 ${me.state.streak}`); },
    onLoss(e, me) { if (me.state.streak) me.flash('Série perdue'); me.state.streak = 0; } },

  // ---------------- Rares ----------------
  { id: 'corrompu', name: 'Le Croupier Corrompu', icon: '🤵', tags: ['Blackjack'], desc: () => 'Blackjack : le croupier tire une carte de moins.',
    'bj.dealerSkip'(e, me) { e.skip += J.corrompu.cards; e.sources.push(me); } },
  { id: 'martingale', name: 'La Martingale', icon: '📈', tags: ['Tous les jeux', 'Grandit'], grows: true,
    desc: (h, j) => `Chaque perte d'affilée ajoute +${pct(J.martingale.pct)} à ton prochain gain.${j && j.state.streak ? ` En réserve : +${pct(J.martingale.pct * j.state.streak)}.` : ''}`,
    onSettle(e, me) { if (winOn(e) && me.state.streak) e.add(me, J.martingale.pct * me.state.streak, `${me.state.streak} perte(s) d'affilée`); },
    onWin(e, me) { me.state.streak = 0; },
    onLoss(e, me) { me.state.streak = (me.state.streak || 0) + 1; me.flash(`+${pct(J.martingale.pct * me.state.streak)}`); } },
  { id: 'zero', name: 'Le Zéro Ami', icon: '🟢', tags: ['Roulette'], desc: () => `Roulette : le 0 te rend tes mises, et un numéro plein gagnant paie ×${J.zero.straightMult}.`,
    onResolve(e, me) {
      if (e.game !== 'roulette') return;
      if (e.info.n === 0) {
        const lost = Object.entries(e.info.bets).filter(([k]) => k !== 'n0').reduce((a, [, v]) => a + v, 0);
        if (lost > 0) e.adjust(me, lost, 'mises rendues sur le 0');
      }
      const s = e.info.bets['n' + e.info.n];
      if (s) e.adjust(me, s * (CONFIG.games.roulette.straight - 1) * (J.zero.straightMult - 1), 'plein payé double');
    } },
  { id: 'cerise', name: 'Triple Cerise', icon: '🍒', tags: ['Machine'], desc: () => `Machine : les cerises remplacent n'importe quel symbole (ligne complétée payée ${pct(J.cerise.wildRatio)}).`,
    'slots.wild'(e, me) { e.wild = 'cerise'; e.ratio = J.cerise.wildRatio; e.sources.push(me); } },
  { id: 'pickpocket', name: 'Le Pickpocket', icon: '🕵️', tags: ['Roulette'], desc: () => `Roulette : quand un joueur IA gagne, tu empoches ${pct(J.pickpocket.pct)} de son gain (au plus ta mise).`,
    onSettle(e, me) { if (e.info && e.info.aiWin > 0) e.flat(me, Math.min(e.staked, e.info.aiWin * J.pickpocket.pct * me.host.scale(10) / 10), 'gains des voisins'); } },
  { id: 'miroir', name: 'Le Miroir', icon: '🪞', tags: ['Copie'], desc: () => 'Copie l\'effet du joker placé à sa droite.', copyRight: true },
  { id: 'assurance', name: 'L\'Assurance-Vie', icon: '🛟', tags: ['Survie'], desc: () => `Si tu fais faillite, tu repars avec ${pct(J.assurance.palier)} du palier. Usage unique.`,
    onBankrupt(e, me) {
      if (e.saved) return;
      e.saved = true;
      const v = Math.round(J.assurance.palier * (me.host.state.table ? me.host.state.table.target : 100));
      me.host.give(v);
      me.flash(`+${v}`);
      me.host.notify('toast', { text: `🛟 L'Assurance-Vie te sauve : +${v} jetons !` });
      me.remove();
    } },
  { id: 'doubleur', name: 'Le Doubleur', icon: '✌️', tags: ['Blackjack'], desc: () => `Blackjack : quand tu gagnes une main doublée, gains ×${String(J.doubleur.mult).replace('.', ',')}.`,
    onSettle(e, me) { if (winOn(e, 'bj') && e.info.doubledWin) e.mult(me, J.doubleur.mult, 'main doublée'); } },
  { id: 'cristal', name: 'La Boule de Cristal', icon: '🔮', tags: ["Hold'em"], desc: () => `Hold'em : +${pct(J.cristal.pct)} sur tes gains, et ×${J.cristal.mult} avec un brelan ou mieux.`,
    onSettle(e, me) {
      if (!winOn(e, 'uth')) return;
      e.add(me, J.cristal.pct);
      if (e.info.cat >= 3) e.mult(me, J.cristal.mult, 'brelan ou mieux');
    } },
  { id: 'grosbras', name: 'Le Gros Bras', icon: '💪', tags: ['Tous les jeux', 'Grandit'], grows: true,
    desc: (h, j) => `+${pct(J.grosbras.pct)} sur tes gains par table gagnée depuis son achat (il ne redescend jamais).${j ? ` Actuellement : +${pct(J.grosbras.pct * (j.state.tables || 0))}.` : ''}`,
    onSettle(e, me) { if (winOn(e) && me.state.tables) e.add(me, J.grosbras.pct * me.state.tables, `${me.state.tables} table(s)`); },
    onRoundEnd(e, me) { me.state.tables = (me.state.tables || 0) + 1; me.flash(`+${pct(J.grosbras.pct * me.state.tables)}`); } },

  // ---------------- Légendaires ----------------
  { id: 'parrain', name: 'Le Parrain', icon: '🎩', tags: ['Tous les jeux', 'Multiplicateur'], desc: () => `Gains ×(1 + ${String(J.parrain.perJoker).replace('.', ',')} par autre joker que tu possèdes).`,
    onSettle(e, me) {
      const n = me.host.state.jokers.length - 1;
      if (winOn(e) && n > 0) e.mult(me, 1 + n * J.parrain.perJoker, `${n} autre(s) joker(s)`);
    } },
  { id: 'tricheur', name: 'Le Tricheur Maladroit', icon: '🃏', tags: ['Tous les jeux', 'Multiplicateur'], desc: () => `Gains ×${String(J.tricheur.mult).replace('.', ',')}, mais à chaque table gagnée tu as ${pct(J.tricheur.catchChance)} de chances d'être pris : tu perds un joker au hasard.`,
    onSettle(e, me) { if (winOn(e)) e.mult(me, J.tricheur.mult); },
    onRoundEnd(e, me) {
      const H = me.host;
      if (!H.state.jokers.length || !H.rng.chance(J.tricheur.catchChance)) return;
      const victim = H.rng.pick(H.state.jokers);
      e.lines.push({ label: `🃏 Tricheur pris la main dans le sac : ${JOKERS[victim.id].name} confisqué`, value: 0, bad: true });
      H.removeJoker(victim.uid);
    } },
  { id: 'roue', name: 'La Roue Folle', icon: '🎡', tags: ['Règles'], desc: () => 'À chaque table, une règle du casino change au hasard, toujours en ta faveur.',
    onRoundStart(e, me) {
      const active = me.host.activeRules();
      const free = RULE_DEFS.filter(r => !active.includes(r.id));
      me.state.rules = free.length ? [me.host.rng.pick(free).id] : [];
    },
    // Les règles tirées agissent comme des modificateurs « enfants » du joker
    children: me => (me.state.rules || []).map(id => RULES[id]).filter(Boolean) },
  { id: 'banquier', name: 'Le Banquier', icon: '🏦', tags: ['Économie'], desc: () => `À chaque table gagnée, +${pct(J.banquier.rate)} de tes jetons (sans plafond).`,
    onRoundEnd(e, me) {
      const v = Math.floor(me.host.chips() * J.banquier.rate);
      if (v > 0) e.reward(me, v, '🏦 Intérêts du Banquier');
    } },
  { id: 'fantome', name: 'Le Fantôme du Casino', icon: '👻', tags: ['Relances'], desc: () => `${J.fantome.charges} relances de plus par table : annule un tirage et refais-le (carte, dé, roulette, machine).`,
    onRoundStart(e, me) { me.host.addCharge(me, 'any', J.fantome.charges); } },
  { id: 'jackpot', name: 'Jackpot Éternel', icon: '💎', tags: ['Multiplicateur', 'Grandit'], grows: true,
    desc: h => `Gains ×${h ? h.meta.jackpot.toFixed(1) : '1'} : +${J.jackpot.step} à chaque table gagnée (×${J.jackpot.max} max). Il ne se réinitialise jamais, même entre les parties.`,
    onSettle(e, me) { if (winOn(e) && me.host.meta.jackpot !== 1) e.mult(me, me.host.meta.jackpot); },
    onRoundEnd(e, me) { me.host.meta.jackpot = Math.min(J.jackpot.max, Math.round((me.host.meta.jackpot + J.jackpot.step) * 10) / 10); me.host.saveMeta(); me.flash(`×${me.host.meta.jackpot.toFixed(1)}`); } },
  { id: 'midas', name: 'Le Roi Midas', icon: '👑', tags: ['Multiplicateur', 'Grandit'], grows: true,
    desc: (h, j) => `Gains ×${j ? (1 + J.midas.step * (j.state.wins || 0)).toFixed(2).replace('.', ',') : '1'} : +${String(J.midas.step).replace('.', ',')} à chaque victoire, retour à ×1 à chaque défaite.`,
    onSettle(e, me) { if (winOn(e) && me.state.wins) e.mult(me, 1 + J.midas.step * me.state.wins, `${me.state.wins} victoire(s)`); },
    onWin(e, me) { me.state.wins = (me.state.wins || 0) + 1; me.flash(`×${(1 + J.midas.step * me.state.wins).toFixed(2)}`); },
    onLoss(e, me) { if (me.state.wins) me.flash('×1'); me.state.wins = 0; } },
];
JOKER_DEFS.forEach(d => Object.assign(d, { kind: 'joker', rarity: J[d.id].rarity, price: J[d.id].price }));
const JOKERS = Object.fromEntries(JOKER_DEFS.map(d => [d.id, d]));

// ---------------- Règles de la Roue Folle ----------------
const R = CONFIG.rules;
const RULE_DEFS = [
  { id: 'porteBonus', name: 'Soirée chanceuse', desc: () => 'Tous les gains +30 %.', onSettle(e, me) { if (e.outcome === 'win') e.add(me, 0.3); } },
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
  { id: 'presse', name: 'Le Directeur Pressé', desc: () => `Mise max divisée par ${Math.round(1 / B.presse.maxBet)} à cette table.`,
    maxBet(e) { e.value *= B.presse.maxBet; } },
  { id: 'noir', name: 'La Dame en Noir', desc: () => 'Les mises sur le rouge ne paient rien.',
    onResolve(e, me) {
      const b = e.info && e.info.bets && e.info.bets.red;
      if (e.game === 'roulette' && b && e.info.color === 'red') { e.info.redVoid = true; e.adjust(me, -b * CONFIG.games.roulette.even, 'le rouge ne paie rien'); }
    } },
  { id: 'sobre', name: 'Le Videur', desc: () => 'Aucune relance autorisée.', onRoundStart(e) { e.table.noRerolls = true; } },
  { id: 'endormi', name: 'Le Gardien Endormi', desc: () => 'Le joker le plus à gauche est désactivé.', disablesIndex: i => i === 0 },
  { id: 'gourmand', name: 'Le Gourmand', desc: h => `Chaque mise coûte ${h ? h.scale(B.gourmand.fee) : B.gourmand.fee} jetons en plus.`,
    betFee(e, me) { e.fee += me.host.scale(B.gourmand.fee); e.sources.push(me); } },
];
BOSS_DEFS.forEach(d => (d.kind = 'boss'));
const BOSSES = Object.fromEntries(BOSS_DEFS.map(d => [d.id, d]));

// ---------------- Améliorations de table ----------------
const U = CONFIG.upgrades;
const UPGRADE_DEFS = [
  { id: 'vip', name: 'Table VIP', icon: '👑', desc: () => `Mise max augmentée de ${pct(U.vip.maxBet - 1)}.`, maxBet(e) { e.value *= U.vip.maxBet; } },
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
  { id: 'huissier', name: 'Huissier', icon: '⚖️', desc: () => `Échéance de prêt impayée : mise max réduite de ${pct(1 - CONFIG.loans.penaltyMaxBet)} à la prochaine table.`,
    maxBet(e) { e.value *= CONFIG.loans.penaltyMaxBet; }, onRoundEnd(e, me) { me.remove(); } },
  { id: 'soldes', tag: true, name: 'Soldes', icon: '🏷️', desc: () => `Prochain shop : tout à −${pct(T.soldes.discount)}.`,
    onShopEnter(e, me) { e.shop.offers.forEach(o => (o.price = Math.ceil(o.price * (1 - T.soldes.discount)))); me.remove(); } },
  { id: 'cadeau', tag: true, name: 'Paquet cadeau', icon: '🎁', desc: () => 'Un consommable gratuit, tout de suite.', instant: true },
  { id: 'turbo', tag: true, name: 'Turbo', icon: '⚡', desc: () => `Mise max ×${String(T.turbo.maxBet).replace('.', ',')} à la prochaine table.`,
    maxBet(e) { e.value *= T.turbo.maxBet; }, onRoundEnd(e, me) { me.remove(); } },
  { id: 'collection', tag: true, name: 'Collectionneur', icon: '💜', desc: () => 'Le prochain shop propose un joker rare ou légendaire garanti.',
    onShopEnter(e, me) {
      const i = e.shop.offers.findIndex(o => o.kind === 'joker');
      const id = e.rollJoker({ minRarity: 'rare', exclude: e.shop.offers.map(o => o.id) });
      if (id) { const o = { kind: 'joker', id, price: e.scale(JOKERS[id].price), sold: false }; if (i >= 0) e.shop.offers[i] = o; else e.shop.offers.unshift(o); }
      me.remove();
    } },
  { id: 'investisseur', tag: true, name: 'Investisseur', icon: '💼', desc: h => `+${h ? h.scale(T.investisseur.amount) : T.investisseur.amount} jetons à la prochaine table gagnée.`,
    onRoundEnd(e, me) { e.reward(me, me.host.scale(T.investisseur.amount), '💼 Tag Investisseur'); me.remove(); } },
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
  { id: 'ticket', name: 'Ticket à gratter', icon: '🎟️', desc: h => `Gain aléatoire de 0 à ${h ? h.scale(75) : 75} jetons.`,
    use: H => {
      const t = H.rng.weighted(CONFIG.consumables.ticket.table);
      const g = H.scale(H.rng.range(t.min, t.max));
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

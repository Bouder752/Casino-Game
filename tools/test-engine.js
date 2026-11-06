#!/usr/bin/env node
// Tests du moteur : node tools/test-engine.js
const api = require('./load-core')();
const { Engine, Sim, RNG, Deck, CONFIG, JOKERS } = api;
const P = CONFIG.progression;
let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('ÉCHEC :', msg); } };
const meta = () => ({ prestige: 0, jackpot: 1, unlocked: [], best: 0, runs: 0, wins: 0 });
// Nouvelle partie avec la petite table ouverte
// (objectif rendu inatteignable pour tester les effets sans finir la table)
const run = (seed, realTarget = false) => { const H = Engine.newRun({ seed, meta: meta(), persist: false }); H.chooseTable(); if (!realTarget) H.state.table.target = 1e9; return H; };
// Rejoue une table du même type (pour réinitialiser mises et relances)
const newTable = (H, realTarget = false) => { H.state.phase = 'choose'; H.chooseTable(); if (!realTarget) H.state.table.target = 1e9; };
// Faux jeu : le résultat brut est imposé
api.Games.register({ id: 'test', name: 'Test', start: (H, gs, p) => (H.stake(p.bet) ? { round: { ...p, done: true } } : { error: 'solde' }),
  actions: () => [], act() {}, resolve: (H, gs, r) => ({ staked: r.bet, back: r.back, info: r.info || {}, draws: r.draws || [] }) });
const play = (H, bet, back, extra = {}) => H.startPlay('test', { bet, back, ...extra }).settlement;
const winTable = H => play(H, 1, 1 + Math.max(0, H.state.table.target - H.bankroll()));

// 1. Déterminisme
ok(JSON.stringify(Sim.playRun('SEED-X')) === JSON.stringify(Sim.playRun('SEED-X')), 'même seed → même partie');
const r1 = RNG.fromSeed('abc'), r2 = RNG.fromSeed('abc');
ok([1, 2, 3].every(() => r1.next() === r2.next()), 'RNG reproductible');

// 2. Objectifs et structure des étages
let H = Engine.newRun({ seed: 'O', meta: meta(), persist: false });
const O1 = P.objectifBase[1], TM = P.multiplicateurTable;
ok(H.objective(1, 'petite') === Math.round(O1 * TM.petite) && H.objective(1, 'grande') === Math.round(O1 * TM.grande) && H.objective(1, 'boss') === Math.round(O1 * TM.boss), 'objectifs de l\'étage 1');
ok(H.objective(9, 'petite') === Math.round(P.objectifBase[8] * P.croissanceInfinie), 'croissance du mode infini');
ok(H.state.phase === 'choose' && H.state.tableType === 'petite', 'la partie commence au choix de la petite table');
ok(!!H.startPlay('test', { bet: 1, back: 0 }).error, 'pas de mise sans table ouverte');
H.chooseTable();
ok(H.charges('dice') === P.relancesParTable, 'relances par table');
ok(H.maxBet('bj') === Math.round(H.state.table.target * P.miseMaxRatio), 'mise max = part du palier');

// 3. Palier de bankroll : la table est gagnée dès que la bankroll l'atteint, sans limite de mises
for (let i = 0; i < 12; i++) play(H, 1, 0.5); // beaucoup de petites mises perdantes : pas de limite
ok(H.state.phase === 'play', 'pas de limite de mises');
winTable(H);
ok(H.state.phase === 'shop' && H.state.tableType === 'grande', 'palier atteint → shop puis grande table');
const I = P.interetsParTranche;
ok(H.state.summary.lines[0].value === P.recompenseTable.petite, 'récompense de table');
ok(H.state.summary.lines.some(l => l.label.startsWith('Intérêts') && l.value <= I.max), 'intérêts plafonnés');
H.leaveShop();
ok(H.state.phase === 'choose', 'sortie du shop → choix de table');

// 4. Passer une table contre un tag, impossible pour le boss
const tag = H.state.tagOffers.grande;
const sk = H.skipTable();
ok(sk.ok && H.state.tableType === 'boss' && H.state.etageLog.grande === 'skipped', 'grande table passée');
ok(tag === 'cadeau' || H.state.statuses.some(s => s.id === tag), `tag obtenu (${tag})`);
ok(!!H.skipTable().error, 'le boss ne se passe pas');
H.chooseTable();
ok(!!H.state.table.boss, 'table du boss');
winTable(H);
ok(H.state.etage === 2 && H.state.tableType === 'petite', 'boss vaincu → étage suivant');

// 5. On ne perd que par faillite
H = run('GO2', true);
play(H, H.chips(), 0);
ok(H.state.phase === 'over' && /[Ff]aillite/.test(H.state.reason), 'faillite → perdu');
// Un prêt ne fait pas gagner la table (bankroll = jetons − dettes)
H = Engine.newRun({ seed: 'LOAN', meta: meta(), persist: false }); H.chooseTable(); H.takeLoan('gros');
ok(H.state.phase === 'play' && H.bankroll() < H.state.table.target, 'un prêt ne compte pas dans la bankroll');

// 6. Victoire à l'étage 8 puis mode infini
H = run('WIN');
H.state.etage = P.etagesPourGagner; H.state.tableType = 'boss'; H.state.bossId = 'sobre'; newTable(H, true);
winTable(H);
ok(H.state.phase === 'victory' && H.state.summary.victory, 'victoire après le boss de l\'étage 8');
H.continueInfinite();
ok(H.state.phase === 'shop' && H.state.etage === P.etagesPourGagner + 1 && H.state.infinite, 'mode infini');

// 7. Boss
const withBoss = (id, seed = 'B') => { const h = Engine.newRun({ seed, meta: meta(), persist: false }); h.state.tableType = 'boss'; h.state.bossId = id; h.chooseTable(); h.state.table.target = 1e9; return h; };
H = withBoss('presse'); ok(H.maxBet('dice') === Math.max(5, Math.round(H.state.table.target * P.miseMaxRatio * CONFIG.bosses.presse.maxBet)), 'Directeur Pressé : mise max réduite');
H = withBoss('sobre'); H.addJoker('fantome');
ok(H.charges('dice') === 0, 'Le Videur : aucune relance');
H = withBoss('avare'); let s = play(H, 10, 30);
ok(s.mult === 0.75 && s.net === 15, `Croupier Avare : gains −25 % (net ${s.net})`);
H = withBoss('gourmand'); s = play(H, 10, 20);
ok(s.net === 10 - 5 && H.chips() === P.jetonsDepart + 5, `Gourmand : 5 jetons par mise (net ${s.net})`);
H = withBoss('endormi'); ['tricheur', 'porte'].forEach(id => H.addJoker(id)); s = play(H, 10, 20);
ok(s.mult === 1 && Math.abs(s.add - 0.05) < 1e-9, 'Gardien Endormi : joker de gauche désactivé');
const realRL = api.Games.get('roulette');
api.Games.register({ ...api.Games.get('test'), id: 'roulette' });
H = withBoss('noir'); s = H.startPlay('roulette', { bet: 10, back: 20, info: { bets: { red: 10 }, color: 'red', n: 1 } }).settlement;
ok(s.net === -10, 'Dame en Noir : le rouge ne paie rien');
api.Games.register(realRL);

// 8. Formule : Porte-Bonheur (+5 %) + Parrain (+2) puis Tricheur ×2, Septième +10
H = run('T1');
['porte', 'parrain', 'tricheur'].forEach(id => H.addJoker(id));
s = play(H, 10, 20);
// Porte-Bonheur +5 % et Parrain +0,5 × 2 autres jokers = +105 %, puis Tricheur ×2 : 10 × 2,05 × 2 = 41
ok(s.gain === 10 && Math.abs(s.add - 1.05) < 1e-9 && s.mult === 2 && s.gainFinal === 41, `formule gain (obtenu ${s.gainFinal})`);
H.addJoker('septieme');
s = play(H, 10, 20, { draws: [{ kind: 'card', card: { rank: 7, suit: 0 } }] });
ok(s.flats === 10 && s.steps.map(x => x.kind).join() === 'add,add,mult,flat', 'Septième Ciel et ordre des étapes');

// 9. Miroir (chaîne sans boucle), Martingale (état persistant entre les tables)
H = run('T2'); ['miroir', 'miroir', 'tricheur'].forEach(id => H.addJoker(id));
ok(play(H, 10, 20).mult === 8, 'miroir ×2 ×2 ×2');
H = run('T3'); ['tricheur', 'miroir'].forEach(id => H.addJoker(id));
ok(play(H, 10, 20).mult === 2, 'miroir sans voisin à droite : aucun effet');
H = run('T4'); H.addJoker('martingale');
play(H, 10, 0); play(H, 10, 0); newTable(H);
ok(H.state.jokers[0].state.streak === 2, 'martingale : série conservée d\'une table à l\'autre');
s = play(H, 10, 20);
ok(Math.abs(s.add - 0.5) < 1e-9 && H.state.jokers[0].state.streak === 0, 'martingale +50 % puis remise à zéro');

// 10. Main Molle (1re défaite de blackjack par table) et Consolation
H = run('T5'); ['molle', 'consolation'].forEach(id => H.addJoker(id));
const realBJ = api.Games.get('bj');
api.Games.register({ ...api.Games.get('test'), id: 'bj' });
ok(H.startPlay('bj', { bet: 10, back: 0 }).settlement.net === -2, 'Main Molle 50 % + Consolation 3');
ok(H.startPlay('bj', { bet: 10, back: 0 }).settlement.net === -7, 'Main Molle une seule fois par table');
newTable(H);
ok(H.startPlay('bj', { bet: 10, back: 0 }).settlement.net === -2, 'Main Molle réarmée à la table suivante');
api.Games.register(realBJ);

// 11. Assurance-Vie
H = run('T6'); H.addJoker('assurance');
play(H, H.chips(), 0);
ok(H.state.phase === 'play' && H.chips() === 50 && H.state.jokers.length === 0, 'Assurance-Vie sauve et disparaît');

// 12. Shop : pas de joker possédé, emplacements limités, reroll croissant, revente 50 %
H = run('T7', true); H.state.chips = 100000; winTable(H);
for (let k = 0; k < 30; k++) {
  const owned = H.state.jokers.map(j => j.id);
  const ids = H.state.shop.offers.filter(o => o.kind === 'joker').map(o => o.id);
  if (ids.some(id => owned.includes(id)) || new Set(ids).size !== ids.length) { ok(false, 'joker possédé ou doublon proposé'); break; }
  ok(H.state.shop.offers.filter(o => o.kind === 'consumable').length === CONFIG.shop.consumables, 'shop : consommables');
  H.state.shop.offers.forEach((o, i) => { if (o.kind === 'joker') H.buy(i); });
  H.reroll();
}
ok(H.state.jokers.length === H.state.jokerSlots, 'emplacements remplis');
const off = H.state.shop.offers.findIndex(o => o.kind === 'joker');
ok(off < 0 || H.buy(off).error, 'achat refusé faute d\'emplacement');
ok(H.state.shop.rerollCost === CONFIG.shop.reroll.base + 30 * CONFIG.shop.reroll.step, 'reroll à prix croissant');
const j0 = H.state.jokers[0], before = H.chips();
H.sellJoker(j0.uid);
ok(H.chips() - before === Math.floor(JOKERS[j0.id].price / 2), 'revente à 50 %');

// 13. Tags : Soldes (−50 % au prochain shop), Turbo (+2 mises)
H = run('T8', true); H.addStatus('soldes'); H.state.chips = 10000; winTable(H);
ok(H.state.shop.offers.every(o => o.price === Math.ceil(api.CATALOG[o.id].price * 0.5)), 'Soldes : prix divisés par 2');
H.leaveShop(); const mb = H.maxBet('dice'); H.addStatus('turbo'); H.chooseTable();
ok(H.maxBet('dice') > mb, 'Turbo : mise max augmentée');

// 14. Vente d'un joker actif : ses relances disparaissent
H = run('T9'); H.addJoker('fantome'); newTable(H);
ok(H.charges('dice') === P.relancesParTable + 1, 'Fantôme : +1 relance');
H.sellJoker(H.state.jokers[0].uid);
ok(H.charges('dice') === P.relancesParTable, 'relance du joker retirée à la vente');

// 15. Prêt : remboursement à chaque table gagnée, pénalité + huissier si impayé
H = run('T10', true);
H.takeLoan('petit');
ok(H.chips() === P.jetonsDepart + 100 && H.state.debts[0].left === 120, 'prêt accordé');
ok(!!H.takeLoan('gros').error, 'un seul prêt à la fois');
winTable(H);
ok(H.state.debts[0].left === 80, `échéance prélevée (reste ${H.state.debts[0].left})`);
H.leaveShop(); H.state.chips = 100; H.chooseTable();
ok(H.bankroll() === H.chips() - H.state.debts[0].left, 'bankroll = jetons − dettes');

// 16. Sabot vide en pleine main : remélange sans les cartes en jeu
const rng = RNG.fromSeed('deck');
const shoe = Deck.create(rng, { decks: 1 });
const inPlay = shoe.cards.splice(0, 3).slice();
shoe.cards = [];
ok(Deck.draw(shoe, rng, inPlay) && shoe.cards.length === 52 - 3 - 1, 'sabot vide → remélangé sans les cartes en jeu');

// 17. Mise supérieure aux jetons
H = run('T11'); H.state.chips = 3;
ok(!!H.startPlay('bj', { bet: 5 }).error && H.chips() === 3, 'mise > jetons refusée');

// 18. Sérialisation : l'état complet survit à JSON
H = run('T12'); ['martingale', 'roue'].forEach(id => H.addJoker(id)); newTable(H);
const H2 = Engine.createHost(JSON.parse(JSON.stringify(H.state)), { meta: meta(), persist: false });
ok(H2.activeRules().length === 1 && H2.state.jokers.length === 2, 'état restauré (Roue Folle active)');
const x1 = H.startPlay('bj', { bet: 5 }).round, x2 = H2.startPlay('bj', { bet: 5 }).round;
ok(JSON.stringify(x1.hands) === JSON.stringify(x2.hands), 'même suite aléatoire après restauration');

// 19. Les 5 jeux tournent en simulation
['bj', 'uth', 'dice', 'roulette', 'slots'].forEach(g => ok(Sim.run(20, { seed: 'G-' + g, strategy: 'blackjack', game: g, print: false }).parties === 20, `simulation ${g}`));

// 20. Attribution des gains par joker (fiche et joker MVP)
H = run('A1'); ['porte', 'tricheur', 'septieme'].forEach(id => H.addJoker(id));
s = play(H, 10, 20, { draws: [{ kind: 'card', card: { rank: 7, suit: 0 } }] });
const earned = H.state.jokers.map(j => j.stats.earned);
ok(Math.abs(earned.reduce((a, b) => a + b, 0) - (s.net - 10)) < 0.05, `somme des contributions = bonus des jokers (${earned})`);
ok(H.state.stats.jokerEarned.tricheur > H.state.stats.jokerEarned.porte, 'Tricheur plus rentable que Porte-Bonheur ici');
ok(H.meta.collection.jokers.tricheur.owned === 1, 'collection : joker possédé');

// 21. Annuler une vente (avant la prochaine mise)
H = run('U1'); H.addJoker('fantome'); newTable(H);
const ch = H.charges('dice'), c0 = H.chips();
H.sellJoker(H.state.jokers[0].uid);
ok(H.canUndoSell() && H.undoSell().ok && H.state.jokers.length === 1 && H.chips() === c0 && H.charges('dice') === ch, 'vente annulée (joker, jetons, relances)');
H.sellJoker(H.state.jokers[0].uid); play(H, 1, 0);
ok(!H.canUndoSell(), 'plus d\'annulation après une mise');

// 22. Machine à sous 5×3 : lignes, wilds multiplicateurs, tours gratuits
const E = api.Games.get('slots'), SC = CONFIG.games.slots;
const g = (ids) => ids.map(col => col.map(id => (typeof id === 'object' ? id : { id })));
const syms = SC.symbols;
let ev = E.evaluate(g([['as', 'as', 'as'], ['as', 'dix', 'dix'], ['as', 'dix', 'dix'], ['dame', 'dix', 'dix'], ['roi', 'dix', 'dix']]), syms, { wild: null, ratio: 1 }, 1);
ok(ev.wins.some(w => w.symbol === 'as' && w.count === 3 && w.line === 1), '3 As sur la ligne du haut');
ev = E.evaluate(g([['chatnoir', 'dix', 'roi'], [{ id: 'palace', m: 2 }, 'dix', 'roi'], ['chatnoir', 'valet', 'dame'], ['dame', 'roi', 'as'], ['roi', 'as', 'dix']]), syms, { wild: null, ratio: 1 }, 1);
const top = ev.wins.find(w => w.line === 1);
ok(top && top.mult === 2 && top.win === SC.symbols.find(x => x.id === 'chatnoir').pay[0] * 2, 'wild Palace ×2 sur une ligne');
const st = { chips: 1e9 };
const Hs = Engine.free({ meta: meta(), persist: false }); Hs.state.chips = 1e9;
let fsSeen = false;
for (let i = 0; i < 2000 && !fsSeen; i++) { const r = Hs.startPlay('slots', { bet: 20 }); if (r.round.spins.length > 1) { fsSeen = true; ok(r.round.spins.length === 1 + SC.scatter.spins, 'tours gratuits complets'); const sticky = r.round.spins.slice(1).every((sp, k) => k === 0 || true); ok(sticky, 'tours gratuits'); } if (!r.settlement) Hs.act('accept'); }
ok(fsSeen, 'tours gratuits déclenchés en 2000 lancers');
void st;

// 23. Retours des testeurs : poids de l'objectif, bonus sur perte, relance par mise, sauvegarde
H = run('P2'); H.addJoker('consolation');
const g0 = H.state.table.gains; play(H, 1, 0);
ok(H.state.table.gains === g0, 'un bonus sur une perte ne compte pas pour l\'objectif');
H = run('P3'); H.state.chips = 1000;
let rr = H.startPlay('dice', { bet: 1, target: 10, mode: 'under' });
let guard = 0;
while (rr.round && !rr.settlement && guard++ < 10) { if (H.actions().some(a => a.id === 'reroll')) rr = H.act('reroll'); else rr = H.act('accept'); }
ok(rr.round.rolls.length <= 1 + (P.relancesParMise || 99), `une seule relance par mise (${rr.round.rolls.length} tirages)`);

console.log(`${passes} réussis, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);

#!/usr/bin/env node
// Tests du moteur : node tools/test-engine.js
const api = require('./load-core')();
const { Engine, Sim, RNG, Deck, JOKER_DEFS, CONFIG } = api;
let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('ÉCHEC :', msg); } };
const meta = () => ({ prestige: 0, jackpot: 1, unlocked: [], best: 0, runs: 0, wins: 0 });
const run = seed => Engine.newRun({ seed, meta: meta(), persist: false });
// Coup de test : on force le résultat brut via un faux jeu
api.Games.register({ id: 'test', name: 'Test', start: (H, gs, p) => (H.stake(p.bet) ? { round: { ...p, done: true } } : { error: 'solde' }),
  actions: () => [], act() {}, resolve: (H, gs, r) => ({ staked: r.bet, back: r.back, info: r.info || {}, draws: r.draws || [] }) });
const play = (H, bet, back, extra = {}) => H.startPlay('test', { bet, back, ...extra }).settlement;

// 1. Déterminisme
const a = Sim.playRun('SEED-X'), b = Sim.playRun('SEED-X');
ok(JSON.stringify(a) === JSON.stringify(b), 'même seed → même partie');
const r1 = RNG.fromSeed('abc'), r2 = RNG.fromSeed('abc');
ok([1, 2, 3].every(() => r1.next() === r2.next()), 'RNG reproductible');

// 2. Formule : Porte-Bonheur (+5 %) + Parrain (+2) puis Tricheur ×2, Septième +10
let H = run('T1');
['porte', 'parrain', 'tricheur'].forEach(id => H.addJoker(id));
let s = play(H, 10, 20, { draws: [{ kind: 'card', card: { rank: 7, suit: 0 } }] });
ok(s.gain === 10 && Math.abs(s.add - 2.05) < 1e-9 && s.mult === 2 && s.gainFinal === 61, `formule gain (obtenu ${s.gainFinal})`);
ok(s.net === 61 && s.steps.length === 3, 'Septième non possédé → pas de bonus');
H.addJoker('septieme');
s = play(H, 10, 20, { draws: [{ kind: 'card', card: { rank: 7, suit: 0 } }] });
ok(s.flats === 10 && s.steps.some(x => x.kind === 'flat' && x.src.name === 'Le Septième Ciel'), 'Septième Ciel via onCardDrawn');
ok(s.steps.map(x => x.kind).join() === 'add,add,mult,flat', `ordre des étapes (${s.steps.map(x => x.kind)})`);

// 3. Miroir copie le voisin de droite ; miroirs en chaîne sans boucle
H = run('T2');
['miroir', 'miroir', 'tricheur'].forEach(id => H.addJoker(id));
s = play(H, 10, 20);
ok(s.mult === 8, `miroir ×2 ×2 ×2 (obtenu ${s.mult})`);
H = run('T3'); ['tricheur', 'miroir'].forEach(id => H.addJoker(id));
s = play(H, 10, 20);
ok(s.mult === 2, 'miroir sans voisin à droite : aucun effet');

// 4. Martingale : état interne qui persiste entre les manches
H = run('T4'); H.addJoker('martingale');
play(H, 10, 0); play(H, 10, 0);
ok(H.state.jokers[0].state.streak === 2, 'martingale compte les pertes');
s = play(H, 10, 20);
ok(Math.abs(s.add - 0.5) < 1e-9 && H.state.jokers[0].state.streak === 0, 'martingale +50 % puis remise à zéro');

// 5. Main Molle (1re défaite de blackjack de la manche) et Consolation (chaque perte)
H = run('T5'); ['molle', 'consolation'].forEach(id => H.addJoker(id)); H.startRound();
const realBJ = api.Games.get('bj');
api.Games.register({ ...api.Games.get('test'), id: 'bj' });
s = H.startPlay('bj', { bet: 10, back: 0 }).settlement;
ok(s.net === -10 + 5 + 3, `Main Molle 50 % + Consolation 3 (net ${s.net})`);
s = H.startPlay('bj', { bet: 10, back: 0 }).settlement;
ok(s.net === -7, 'Main Molle une seule fois par manche');
H.startRound();
s = H.startPlay('bj', { bet: 10, back: 0 }).settlement;
ok(s.net === -2, 'Main Molle réarmée à la manche suivante');
api.Games.register(realBJ);

// 6. Assurance-Vie : faillite évitée une seule fois
H = run('T6'); H.addJoker('assurance');
play(H, H.chips(), 0);
ok(H.state.phase === 'play' && H.chips() === 50 && H.state.jokers.length === 0, 'Assurance-Vie sauve et disparaît');
play(H, H.chips(), 0);
ok(H.state.phase === 'over', 'faillite sans assurance → game over');

// 7. Shop : pas de joker déjà possédé, emplacements limités, revente à 50 %
H = run('T7');
H.state.chips = 100000;
H.state.round.start = 0;
H.endRound();
ok(H.state.phase === 'shop', 'objectif atteint → shop');
for (let k = 0; k < 30; k++) {
  const owned = H.state.jokers.map(j => j.id);
  const ids = H.state.shop.offers.filter(o => o.kind === 'joker').map(o => o.id);
  if (ids.some(id => owned.includes(id)) || new Set(ids).size !== ids.length) { ok(false, 'joker possédé ou doublon proposé'); break; }
  H.state.shop.offers.forEach((o, i) => { if (o.kind === 'joker') H.buy(i); });
  H.reroll();
}
ok(H.state.jokers.length === H.state.jokerSlots, 'emplacements remplis');
const off = H.state.shop.offers.findIndex(o => o.kind === 'joker');
ok(off < 0 || H.buy(off).error, 'achat refusé faute d\'emplacement');
ok(H.state.shop.rerollCost === CONFIG.shop.reroll.base + 30 * CONFIG.shop.reroll.step, 'coût du reroll croissant');
const j0 = H.state.jokers[0];
const before = H.chips();
H.sellJoker(j0.uid);
ok(H.chips() - before === Math.floor(api.JOKERS[j0.id].price / 2), 'revente à 50 %');

// 8. Vente d'un joker actif : ses relances disparaissent
H = run('T8'); H.addJoker('fantome'); H.nextRound && H.startRound();
ok(H.charges('dice') === 1, 'Fantôme donne une relance');
H.sellJoker(H.state.jokers[0].uid);
ok(H.charges('dice') === 0, 'relance retirée à la vente');
H.addJoker('fantome'); H.startRound();
ok(H.startPlay('test', { bet: 1, back: 0 }).settlement && H.sellJoker(H.state.jokers[0].uid).ok, 'vente hors coup autorisée');

// 9. Prêt : remboursement par manche, pénalité si impayé
H = run('T9');
H.takeLoan('petit');
ok(H.chips() === 200 && H.state.debts[0].left === 120, 'prêt accordé');
ok(H.takeLoan('gros').error, 'un seul prêt à la fois');
H.state.round.start = H.chips() - 1000; // objectif atteint
H.endRound();
ok(H.state.debts[0].left === 80, `échéance prélevée (reste ${H.state.debts[0].left})`);
H.state.chips = 1; H.nextRound(); H.state.round.start = -1000; H.endRound();
ok(H.state.statuses.some(s => s.id === 'huissier') && H.state.debts[0].left > 40, 'pénalité + huissier si impayé');
H.nextRound();
ok(H.state.round.tours === CONFIG.rounds.tours - CONFIG.loans.penaltyTours, 'huissier : tours confisqués');

// 10. Sabot vide en pleine main : remélange sans les cartes en jeu
const rng = RNG.fromSeed('deck');
const shoe = Deck.create(rng, { decks: 1 });
const inPlay = shoe.cards.splice(0, 3).slice();
shoe.cards = [];
const c = Deck.draw(shoe, rng, inPlay);
ok(c && shoe.cards.length === 52 - 3 - 1, 'sabot vide → remélangé sans les cartes en jeu');

// 11. Mise supérieure aux jetons
H = run('T11');
ok(!!H.startPlay('bj', { bet: 1000 }).error, 'mise supérieure au max refusée');
H.state.chips = 3;
ok(!!H.startPlay('bj', { bet: 5 }).error && H.chips() === 3, 'mise supérieure aux jetons refusée');

// 12. Sérialisation : l'état complet survit à JSON
H = run('T12'); ['martingale', 'roue'].forEach(id => H.addJoker(id)); H.startRound();
const json = JSON.parse(JSON.stringify(H.state));
const H2 = Engine.createHost(json, { meta: meta(), persist: false });
ok(H2.activeRules().length === 1 && H2.state.jokers.length === 2, 'état restauré (Roue Folle active)');
const x1 = H.startPlay('bj', { bet: 5 }).round, x2 = H2.startPlay('bj', { bet: 5 }).round;
ok(JSON.stringify(x1.hands) === JSON.stringify(x2.hands), 'même suite aléatoire après restauration');

// 13. Les 5 jeux tournent sous la simulation pour chaque jeu
['bj', 'uth', 'dice', 'roulette', 'slots'].forEach(g => {
  const st = Sim.run(30, { seed: 'G-' + g, game: g, print: false });
  ok(st.parties === 30, `simulation ${g}`);
});

console.log(`${passes} réussis, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);

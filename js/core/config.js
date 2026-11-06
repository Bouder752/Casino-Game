// =====================================================================
//  CONFIGURATION — toutes les valeurs d'équilibrage du Boubouz'ino.
//  Modifiez ce fichier puis lancez la simulation (Sim.run(1000) dans la
//  console, ou `node tools/simulate.js 1000`) pour mesurer l'effet.
// =====================================================================
const CONFIG = {
  start: { chips: 100, freeChips: 1000 },

  rounds: {
    final: 8,                                        // manches à survivre pour gagner
    targets: [25, 40, 60, 90, 130, 180, 250, 350],   // objectif de gain par manche
    maxBets: [25, 35, 50, 70, 100, 140, 200, 280],   // mise max de base par manche
    tours: 10,                                       // coups par manche
    bossEvery: 3,                                    // un Patron toutes les N manches (+ la finale)
    endless: { targetGrowth: 1.5, maxBetGrowth: 1.4 },
    reward: { base: 8, perManche: 2, perTourLeft: 2 },
    uthMaxBetRatio: 0.5,                             // l'Ante est limité à 50 % de la mise max (Ante + Blind)
  },
  prestige: { perManche: 1, victory: 5 },

  shop: {
    jokers: 3, consumables: 2, packs: 1, upgrades: 1,
    // Poids de rareté selon la manche (n = numéro de la manche)
    rarityWeights: n => ({ commun: 70 - 2 * n, rare: 25 + 1.5 * n, legendaire: 5 + 0.5 * n }),
    reroll: { base: 5, step: 5 },
    sellRatio: 0.5,
    jokerSlots: { base: 4, prices: [100, 200, 400] },
    consumableSlots: 2,
  },

  loans: {
    options: [
      { id: 'petit', name: 'Petit prêt', amount: 100, rate: 0.2, manches: 3 },
      { id: 'gros', name: 'Gros prêt', amount: 300, rate: 0.35, manches: 4 },
    ],
    maxActive: 1,
    penaltyRate: 0.5,      // la part impayée d'une échéance augmente de 50 %
    penaltyTours: 2,       // et l'huissier confisque 2 tours à la manche suivante
  },

  jokers: {
    porte: { rarity: 'commun', price: 30, pct: 0.05 },
    rouge: { rarity: 'commun', price: 35, bonus: 0.2 },
    septieme: { rarity: 'commun', price: 40, bonus: 10 },
    molle: { rarity: 'commun', price: 40, refund: 0.5 },
    compteur: { rarity: 'commun', price: 45 },
    consolation: { rarity: 'commun', price: 50, bonus: 3 },
    depipe: { rarity: 'commun', price: 55, charges: 1 },
    corrompu: { rarity: 'rare', price: 90, cards: 1 },
    martingale: { rarity: 'rare', price: 100, pct: 0.25 },
    zero: { rarity: 'rare', price: 100 },
    cerise: { rarity: 'rare', price: 110, wildRatio: 0.5 },
    pickpocket: { rarity: 'rare', price: 120, pct: 0.1 },
    miroir: { rarity: 'rare', price: 130 },
    assurance: { rarity: 'rare', price: 150, amount: 50 },
    parrain: { rarity: 'legendaire', price: 220, perJoker: 1 },
    tricheur: { rarity: 'legendaire', price: 250, mult: 2, catchChance: 0.1 },
    roue: { rarity: 'legendaire', price: 280 },
    banquier: { rarity: 'legendaire', price: 300, rate: 0.1, cap: 50 },
    fantome: { rarity: 'legendaire', price: 350, charges: 1 },
    jackpot: { rarity: 'legendaire', price: 400, step: 0.1 },
  },

  consumables: {
    bonus: { price: 15 },
    dore: { price: 20, mult: 2 },
    boisson: { price: 25 },
    potdevin: { price: 40 },
    ticket: { price: 10, table: [
      { w: 35, min: 0, max: 0 }, { w: 30, min: 5, max: 15 }, { w: 22, min: 20, max: 40 },
      { w: 11, min: 50, max: 80 }, { w: 2, min: 100, max: 100 },
    ] },
  },
  upgrades: {
    vip: { price: 150, mult: 1.5 },
    truque: { price: 120, ranks: [2, 3] },
    doree: { price: 180 },
  },
  packs: {
    petit: { price: 50, choices: 2 },
    mystere: { price: 120, legendaryChance: 0.25 },
  },
  bosses: {
    radin: { bjPay: 1.2 },
    douane: { maxBetMult: 0.6 },
    horloger: { tours: 3 },
    glacon: {},
    fer: {},
    maison: { edge: 95 },
  },
  rules: {
    bj21: { bjPay: 2 },
    diceFair: { edge: 100 },
    plein40: { straight: 41 },
    slots15: { mult: 1.5 },
    charlie: { cards: 5 },
    uthTrips: {},
  },

  games: {
    bj: { decks: 6, penetration: 0.75, bjPay: 1.5, standOn: 17, maxHands: 4, insurancePay: 2 },
    uth: {
      blindPay: { 9: 500, 8: 50, 7: 10, 6: 3, 5: 1.5, 4: 1 },
      tripsPay: { 9: 50, 8: 40, 7: 30, 6: 8, 5: 6, 4: 5, 3: 3 },
    },
    dice: { edge: 99, minTarget: 2, maxTarget: 98 },
    roulette: { straight: 36, even: 2, dozen: 3, ai: { count: 3, min: 5, max: 50, step: 5 } },
    slots: {
      symbols: [
        { id: 'cerise', w: 2, pay: 12 },
        { id: 'citron', w: 6, pay: 10 },
        { id: 'cloche', w: 5, pay: 18 },
        { id: 'etoile', w: 4, pay: 30 },
        { id: 'bar', w: 3, pay: 60 },
        { id: 'sept', w: 2, pay: 150 },
      ],
      diamant: { id: 'diamant', w: 3, pay: 10 },
      twoCherries: 3, twoDiamonds: 4, oneDiamond: 1.5,
    },
  },
};

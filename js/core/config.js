// =====================================================================
//  CONFIGURATION — toutes les valeurs d'équilibrage du Boubouz'ino.
//  Modifiez ce fichier puis lancez la simulation (Sim.run(1000) dans la
//  console, ou `node tools/simulate.js 1000`) pour mesurer l'effet.
// =====================================================================
const CONFIG = {
  // ---------- Progression : des paliers de bankroll ----------
  // Chaque étage a 3 tables (petite, grande, boss). Une table est gagnée dès que ta
  // bankroll (jetons − dettes) atteint le palier. Pas de limite de mises :
  // on ne perd que par faillite. La mise max suit le palier.
  progression: {
    etagesPourGagner: 8,
    jetonsDepart: 100,
    // Bankroll à atteindre à la petite table de chaque étage (index = étage)
    objectifBase: [0, 125, 310, 700, 1550, 3400, 7500, 16500, 36000],
    multiplicateurTable: { petite: 1, grande: 1.25, boss: 1.5 },
    croissanceInfinie: 1.7,    // après l'étage 8, palier ×1,7 par étage
    miseMaxRatio: 0.25,        // mise max = 25 % du palier visé (arrondie)
    miseMin: 1,                // en dessous, c'est la faillite
    relancesParTable: 3,       // refaire un tirage raté sans miser à nouveau
    relancesParMise: 1,        // relances utilisables sur une même mise

    recompenseTable: { petite: 15, grande: 25, boss: 40 },
    interetsParTranche: { tranche: 50, gain: 5, max: 25 }, // 5 jetons par 50 possédés, 25 max

    // La petite ou la grande table (pas le boss) peut être passée contre un tag bonus
    passerTableRecompense: 'tag',
  },
  freeChips: 1000,
  prestige: { perBoss: 1, victory: 5 },

  // Tags obtenus en passant une table
  tags: {
    soldes: { discount: 0.5 },
    cadeau: {},
    turbo: { maxBet: 1.5 },
    collection: {},
    investisseur: { amount: 40 },
    double: { rerolls: 2 },
  },

  shop: {
    jokers: 3, consumables: 2, packs: 1, upgrades: 1,
    // Poids de rareté selon la manche (n = numéro de la manche)
    // Poids de rareté selon l'étage (n)
    rarityWeights: n => ({ commun: 70 - 3 * n, rare: 25 + 2 * n, legendaire: 5 + n }),
    reroll: { base: 5, step: 5 },
    priceGrowth: 0.15,         // les prix montent de 15 % par étage
    sellRatio: 0.5,
    jokerSlots: { base: 4, prices: [100, 200, 400] },
    consumableSlots: 2,
  },

  loans: {
    options: [
      { id: 'petit', name: 'Petit prêt', amount: 100, rate: 0.2, tables: 3 },
      { id: 'gros', name: 'Gros prêt', amount: 300, rate: 0.35, tables: 4 },
    ],
    maxActive: 1,
    penaltyRate: 0.5,      // la part impayée d'une échéance augmente de 50 %
    penaltyMaxBet: 0.7,    // et l'huissier réduit la mise max de 30 % à la table suivante
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
    cerise: { rarity: 'rare', price: 110, wildRatio: 0.3 },
    pickpocket: { rarity: 'rare', price: 120, pct: 0.1 },
    miroir: { rarity: 'rare', price: 130 },
    assurance: { rarity: 'rare', price: 150, amount: 50 },
    parrain: { rarity: 'legendaire', price: 220, perJoker: 0.5 },
    tricheur: { rarity: 'legendaire', price: 250, mult: 2, catchChance: 0.25 },
    roue: { rarity: 'legendaire', price: 280 },
    banquier: { rarity: 'legendaire', price: 300, rate: 0.1, cap: 50 },
    fantome: { rarity: 'legendaire', price: 350, charges: 1 },
    jackpot: { rarity: 'legendaire', price: 400, step: 0.1, max: 3 },
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
    vip: { price: 150, maxBet: 1.25 },
    truque: { price: 120, ranks: [2, 3] },
    doree: { price: 180 },
  },
  packs: {
    petit: { price: 50, choices: 2 },
    mystere: { price: 120, legendaryChance: 0.25 },
  },
  // Boss : règles spéciales de la 3e table de chaque étage
  bosses: {
    avare: { mult: 0.75 },
    presse: { maxBet: 0.5 },
    noir: {},
    sobre: {},
    endormi: {},
    gourmand: { fee: 5 },
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
    dice: { edge: 99, minTarget: 10, maxTarget: 95 },   // 10 % de chance minimum (×9,9 max)
    roulette: { straight: 36, even: 2, dozen: 3, ai: { count: 3, min: 5, max: 50, step: 5 } },
    // Machine « Le Palace des Chats » : 5 rouleaux × 3 rangées, 20 lignes.
    // pay = multiples de la mise par ligne (mise / 20) pour 3, 4 et 5 symboles alignés.
    slots: {
      reels: 5, rows: 3,
      lines: [
        [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
        [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 2, 1, 0, 1],
        [1, 0, 1, 2, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
        [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 2, 2, 0],
      ],
      symbols: [
        { id: 'dix', w: 24, pay: [9, 18, 45] },
        { id: 'valet', w: 22, pay: [9, 18, 45] },
        { id: 'dame', w: 20, pay: [9, 27, 54] },
        { id: 'roi', w: 18, pay: [9, 27, 72] },
        { id: 'as', w: 16, pay: [18, 36, 90] },
        { id: 'cerise', w: 12, pay: [18, 45, 108] },
        { id: 'sept', w: 8, pay: [27, 72, 180] },
        { id: 'tigre', w: 9, pay: [27, 72, 180] },
        { id: 'persan', w: 8, pay: [36, 90, 270] },
        { id: 'siamois', w: 6, pay: [45, 135, 450] },
        { id: 'chatnoir', w: 5, pay: [72, 270, 900] },
      ],
      wild: { id: 'palace', w: 4, reels: [1, 2, 3], mults: [{ m: 2, w: 3 }, { m: 3, w: 1 }] },
      scatter: { id: 'pelote', w: 7, reels: [0, 2, 4], spins: 10, min: 3 },
      diamant: { id: 'diamant', w: 6, pay: [180, 600, 2000] },   // ajouté par la Machine dorée
    },
  },
};

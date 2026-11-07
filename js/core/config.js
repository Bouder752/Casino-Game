// =====================================================================
//  CONFIGURATION — toutes les valeurs d'équilibrage du Boubouz'ino.
//  Modifiez ce fichier puis lancez la simulation (Sim.run(1000) dans la
//  console, ou `node tools/simulate.js 1000`) pour mesurer l'effet.
// =====================================================================
const CONFIG = {
  // ---------- Progression : des paliers de bankroll qui montent de façon exponentielle ----------
  // Chaque étage a 3 tables (petite, grande, boss). Une table est gagnée dès que ta
  // bankroll (jetons − dettes) atteint le palier. Pas de limite de mises :
  // on ne perd que par faillite. La mise max suit le palier.
  // Palier de la table n (0 = petite table de l'étage 1) : jetonsDepart × Π (croissanceDepart + croissanceParTable × k)
  // → 140, 210, 320 | 490, 750, 1 200 | … | 22 M, 44 M au boss final. Il faut un build pour suivre.
  progression: {
    etagesPourGagner: 8,
    jetonsDepart: 100,
    croissanceDepart: 1.45,    // la 1re table demande ×1,45
    croissanceParTable: 0.05, // puis chaque table un peu plus (×2 au boss final)
    miseMaxRatio: 0.25,        // mise max = 25 % du palier visé à l'étage 1…
    miseMaxDecroissance: 0.85, // …puis ×0,88 par étage (≈ 10 % du palier à l'étage 8) : il faut des multiplicateurs
    miseMin: 1,
    miseMinRatio: 0.03,        // mise minimale = 3 % du palier (en dessous, c'est la faillite)
    croissanceMin: 1.25,       // une table demande toujours au moins +25 % de ta bankroll de départ
    relancesParTable: 3,       // refaire un tirage raté sans miser à nouveau
    relancesParMise: 1,        // relances utilisables sur une même mise
    jokerDeDepart: 3,          // choix entre 3 jokers communs en début de partie

    // Récompense de table : une part du palier atteint
    recompenseTable: { petite: 0.06, grande: 0.08, boss: 0.12 },
    interets: { taux: 0.05, maxPalier: 0.06 }, // 5 % de tes jetons, au plus 6 % du palier

    // Les prix du Comptoir sont donnés pour un palier de 150 et suivent le palier visé
    prixReference: 150,

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
    investisseur: { amount: 30 },     // en jetons pour un palier de 150 (suit le palier)
    double: { rerolls: 2 },
  },

  shop: {
    jokers: 3, consumables: 2, packs: 1, upgrades: 1,
    // Poids de rareté selon la manche (n = numéro de la manche)
    // Poids de rareté selon l'étage (n)
    rarityWeights: n => ({ commun: 70 - 3 * n, rare: 25 + 2 * n, legendaire: 5 + n }),
    reroll: { base: 6, step: 4 },     // prix pour un palier de 150 (tous les prix suivent le palier)
    sellRatio: 0.5,
    jokerSlots: { base: 5, prices: [90, 160, 260] },
    consumableSlots: 2,
  },

  loans: {
    options: [
      { id: 'petit', name: 'Petit prêt', amount: 60, rate: 0.2, tables: 3 },   // montants pour un palier de 150
      { id: 'gros', name: 'Gros prêt', amount: 150, rate: 0.35, tables: 4 },
    ],
    maxActive: 1,
    penaltyRate: 0.5,      // la part impayée d'une échéance augmente de 50 %
    penaltyMaxBet: 0.7,    // et l'huissier réduit la mise max de 30 % à la table suivante
  },

  // Prix pour un palier de 150 : ils suivent le palier visé (≈ 12-18 % du palier pour un commun)
  jokers: {
    // Communs
    porte: { rarity: 'commun', price: 20, pct: 0.2 },
    rouge: { rarity: 'commun', price: 20, bonus: 0.5 },
    septieme: { rarity: 'commun', price: 22, stake: 0.15 },
    molle: { rarity: 'commun', price: 24, refund: 0.25 },
    compteur: { rarity: 'commun', price: 24, pct: 0.35 },
    consolation: { rarity: 'commun', price: 18, stake: 0.1 },
    depipe: { rarity: 'commun', price: 22, pct: 0.4, charges: 1 },
    serie: { rarity: 'commun', price: 26, pct: 0.12 },
    // Rares
    corrompu: { rarity: 'rare', price: 45, cards: 1 },
    martingale: { rarity: 'rare', price: 38, pct: 0.5 },
    zero: { rarity: 'rare', price: 40, straightMult: 2 },
    cerise: { rarity: 'rare', price: 40, wildRatio: 0.6 },
    pickpocket: { rarity: 'rare', price: 36, pct: 0.3 },
    miroir: { rarity: 'rare', price: 48 },
    assurance: { rarity: 'rare', price: 34, palier: 0.6 },
    doubleur: { rarity: 'rare', price: 40, mult: 2.5 },
    cristal: { rarity: 'rare', price: 42, pct: 0.5, mult: 2 },
    grosbras: { rarity: 'rare', price: 42, pct: 0.1 },
    // Légendaires
    parrain: { rarity: 'legendaire', price: 95, perJoker: 0.3 },
    tricheur: { rarity: 'legendaire', price: 85, mult: 2.5, catchChance: 0.25 },
    roue: { rarity: 'legendaire', price: 80 },
    banquier: { rarity: 'legendaire', price: 90, rate: 0.1 },
    fantome: { rarity: 'legendaire', price: 80, charges: 2 },
    jackpot: { rarity: 'legendaire', price: 100, step: 0.1, max: 3 },
    midas: { rarity: 'legendaire', price: 100, step: 0.25 },
  },

  consumables: {
    bonus: { price: 12 },
    dore: { price: 14, mult: 2 },
    boisson: { price: 14 },
    potdevin: { price: 20 },
    ticket: { price: 8, table: [            // gains pour un palier de 150 (suivent le palier)
      { w: 35, min: 0, max: 0 }, { w: 30, min: 4, max: 10 }, { w: 22, min: 12, max: 25 },
      { w: 11, min: 30, max: 50 }, { w: 2, min: 75, max: 75 },
    ] },
  },
  upgrades: {
    vip: { price: 70, maxBet: 1.25 },
    truque: { price: 60, ranks: [2, 3] },
    doree: { price: 80 },
  },
  packs: {
    petit: { price: 22, choices: 3 },
    mystere: { price: 60, legendaryChance: 0.25 },
  },
  // Boss : règles spéciales de la 3e table de chaque étage
  bosses: {
    avare: { mult: 0.75 },
    presse: { maxBet: 0.5 },
    noir: {},
    sobre: {},
    endormi: {},
    gourmand: { fee: 3 },              // jetons par mise pour un palier de 150 (suit le palier)
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
    // Machine « Les Chats des Toits » : 5 rouleaux × 3 rangées, 20 lignes.
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
      scatter: { id: 'pelote', w: 5, reels: [0, 1, 2, 3, 4], spins: 10, min: 3, pay: [2, 10, 50], retrigger: 5, maxSpins: 30 }, // une Pelote max par rouleau
      diamant: { id: 'diamant', w: 6, pay: [180, 600, 2000] },   // ajouté par la Machine dorée
    },
  },
};

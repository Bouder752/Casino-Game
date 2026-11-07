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
  // → 120, 150, 200 | 270, 390, 590 | … des centaines de millions au boss final. Il faut un build pour suivre.
  progression: {
    etagesPourGagner: 8,
    jetonsDepart: 100,
    croissanceDepart: 1.2,     // la 1re table demande ×1,2
    croissanceParTable: 0.065, // puis chaque table un peu plus (×2,7 au boss final)
    miseMaxRatio: 0.25,        // mise max = 25 % du palier visé à l'étage 1…
    miseMaxDecroissance: 0.85, // …puis ×0,85 par étage (≈ 8 % du palier à l'étage 8) : il faut des multiplicateurs
    miseMin: 1,
    miseMinRatio: 0.03,        // mise minimale = 3 % du palier (en dessous, c'est la faillite)
    croissanceMin: 1.1,        // une table demande toujours au moins +10 % de ta bankroll de départ
    relancesParTable: 3,       // refaire un tirage raté (en payant une part de la mise)
    relancesParMise: 1,        // relances utilisables sur une même mise
    coutRelance: 0.25,         // une relance coûte 25 % de la mise en cours
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
    reroll: { base: 4, step: 3 },     // prix pour un palier de 150 (tous les prix suivent le palier)
    sellRatio: 0.5,
    jokerSlots: { base: 5, prices: [50, 90, 150] },
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

  // Prix pour un palier de 150 : ils suivent le palier prévu de la prochaine table.
  // Commun ≈ 8-11 % du palier, rare ≈ 15-20 %, légendaire ≈ 25-32 % : tout est achetable, rien n'est gratuit.
  jokers: {
    // Communs
    porte: { rarity: 'commun', price: 14, pct: 0.2 },
    rouge: { rarity: 'commun', price: 12, bonus: 0.5 },
    septieme: { rarity: 'commun', price: 14, stake: 0.15 },
    molle: { rarity: 'commun', price: 14, refund: 0.25 },
    compteur: { rarity: 'commun', price: 14, pct: 0.35 },
    consolation: { rarity: 'commun', price: 12, stake: 0.1 },
    depipe: { rarity: 'commun', price: 13, pct: 0.4, charges: 1 },
    serie: { rarity: 'commun', price: 16, pct: 0.12 },
    // Rares
    corrompu: { rarity: 'rare', price: 28, cards: 1 },
    martingale: { rarity: 'rare', price: 24, pct: 0.4, cap: 5, minStake: 0.25 },
    zero: { rarity: 'rare', price: 24, straightMult: 2 },
    cerise: { rarity: 'rare', price: 24, wildRatio: 0.6 },
    pickpocket: { rarity: 'rare', price: 22, pct: 0.3 },
    miroir: { rarity: 'rare', price: 30 },
    assurance: { rarity: 'rare', price: 22, palier: 0.6 },
    doubleur: { rarity: 'rare', price: 24, mult: 2.5 },
    cristal: { rarity: 'rare', price: 26, pct: 0.5, mult: 2 },
    grosbras: { rarity: 'rare', price: 26, pct: 0.1 },
    // Légendaires
    parrain: { rarity: 'legendaire', price: 46, perJoker: 0.3 },
    tricheur: { rarity: 'legendaire', price: 42, mult: 2.5, catchChance: 0.25 },
    roue: { rarity: 'legendaire', price: 38 },
    banquier: { rarity: 'legendaire', price: 42, rate: 0.1 },
    fantome: { rarity: 'legendaire', price: 38, charges: 2 },
    jackpot: { rarity: 'legendaire', price: 46, step: 0.2, max: 4 },
    midas: { rarity: 'legendaire', price: 46, step: 0.25 },
    // Nouvelles stratégies
    touriste: { rarity: 'commun', price: 13, pct: 0.4 },
    habitue: { rarity: 'commun', price: 14, pct: 0.08 },
    marchand: { rarity: 'commun', price: 12 },
    collect7: { rarity: 'rare', price: 28, step: 0.05 },
    tapis: { rarity: 'rare', price: 26, step: 0.3, fast: 3, slow: 6 },
    faussaire: { rarity: 'rare', price: 22 },
    carnet: { rarity: 'rare', price: 22, pct: 0.3 },
    ivre: { rarity: 'rare', price: 28, standOn: 19 },
    fusion: { rarity: 'legendaire', price: 48 },
    russe: { rarity: 'legendaire', price: 40, mult: 3 },
  },

  consumables: {
    bonus: { price: 9 },
    dore: { price: 10, mult: 2 },
    boisson: { price: 10 },
    potdevin: { price: 12 },
    ticket: { price: 6, table: [            // gains pour un palier de 150 (suivent le palier)
      { w: 35, min: 0, max: 0 }, { w: 30, min: 4, max: 10 }, { w: 22, min: 12, max: 25 },
      { w: 11, min: 30, max: 50 }, { w: 2, min: 75, max: 75 },
    ] },
  },
  upgrades: {
    vip: { price: 40, maxBet: 1.25 },
    truque: { price: 32, ranks: [2, 3] },
    doree: { price: 40 },
  },
  packs: {
    petit: { price: 14, choices: 3 },
    mystere: { price: 32, legendaryChance: 0.25 },
  },
  // Boss : règles spéciales de la 3e table de chaque étage
  bosses: {
    avare: { mult: 0.75 },
    presse: { maxBet: 0.5 },
    noir: {},
    sobre: {},
    endormi: {},
    gourmand: { fee: 3 },
    patron: { mult: 0.8, maxBet: 0.75 }, // boss final              // jetons par mise pour un palier de 150 (suit le palier)
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
    dice: { edge: 99, minTarget: 10, maxTarget: 90, minRerollChance: 25 },   // 10 % de chance minimum (×9,9 max)
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

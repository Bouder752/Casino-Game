// Catalogue : jokers, consommables, améliorations, packs, patrons, règles de la Roue Folle
const JOKERS = [
  // Communs
  { id: 'porte', name: 'Le Porte-Bonheur', rarity: 'commun', price: 30, icon: '🍀', desc: '+5 % sur tous tes gains.' },
  { id: 'rouge', name: 'Le Rouge Fidèle', rarity: 'commun', price: 35, icon: '🌹', desc: 'Les mises sur le rouge à la roulette paient ×2,2 au lieu de ×2.' },
  { id: 'septieme', name: 'Le Septième Ciel', rarity: 'commun', price: 40, icon: '7️⃣', desc: 'Chaque 7 tiré, quel que soit le jeu, rapporte +10 jetons.' },
  { id: 'molle', name: 'La Main Molle', rarity: 'commun', price: 40, icon: '🧤', desc: 'Au blackjack, ta première défaite de chaque manche est remboursée à 50 %.' },
  { id: 'compteur', name: 'Le Compteur', rarity: 'commun', price: 45, icon: '🧮', desc: 'Affiche le nombre de cartes hautes (10 à As) restantes dans le sabot du blackjack.' },
  { id: 'consolation', name: 'Le Lot de Consolation', rarity: 'commun', price: 50, icon: '🎗️', desc: 'Chaque perte te rapporte 3 jetons.' },
  { id: 'depipe', name: 'Le Dé Pipé', rarity: 'commun', price: 55, icon: '🎲', desc: 'Une fois par manche, tu peux relancer un dé perdant au Dice.' },
  // Rares
  { id: 'corrompu', name: 'Le Croupier Corrompu', rarity: 'rare', price: 90, icon: '🤵', desc: 'Au blackjack, le croupier tire une carte de moins.' },
  { id: 'martingale', name: 'La Martingale', rarity: 'rare', price: 100, icon: '📈', desc: 'Chaque perte consécutive ajoute +25 % à ton prochain gain (cumulable).' },
  { id: 'zero', name: 'Le Zéro Ami', rarity: 'rare', price: 100, icon: '🟢', desc: 'Le 0 à la roulette ne te fait plus perdre : tes mises te sont rendues.' },
  { id: 'cerise', name: 'Triple Cerise', rarity: 'rare', price: 110, icon: '🍒', desc: 'Les cerises remplacent n\'importe quel symbole dans les machines à sous.' },
  { id: 'pickpocket', name: 'Le Pickpocket', rarity: 'rare', price: 120, icon: '🕵️', desc: 'Quand un joueur IA gagne à la roulette, tu récupères 10 % de son gain.' },
  { id: 'miroir', name: 'Le Miroir', rarity: 'rare', price: 130, icon: '🪞', desc: 'Copie l\'effet du joker placé à sa droite.' },
  { id: 'assurance', name: 'L\'Assurance-Vie', rarity: 'rare', price: 150, icon: '🛟', desc: 'Si tu tombes à 0 jeton, tu repars avec 50 jetons. Usage unique.' },
  // Légendaires
  { id: 'parrain', name: 'Le Parrain', rarity: 'legendaire', price: 220, icon: '🎩', desc: '+1 multiplicateur de gains pour chaque autre joker que tu possèdes.' },
  { id: 'tricheur', name: 'Le Tricheur Maladroit', rarity: 'legendaire', price: 250, icon: '🃏', desc: 'Tes gains sont doublés, mais à chaque fin de manche tu as 10 % de chances d\'être pris : tu perds un joker au hasard.' },
  { id: 'roue', name: 'La Roue Folle', rarity: 'legendaire', price: 280, icon: '🎡', desc: 'À chaque manche, une règle du casino change au hasard, toujours un peu en ta faveur.' },
  { id: 'banquier', name: 'Le Banquier', rarity: 'legendaire', price: 300, icon: '🏦', desc: 'Tu touches 10 % d\'intérêts sur tes jetons à la fin de chaque manche (50 max).' },
  { id: 'fantome', name: 'Le Fantôme du Casino', rarity: 'legendaire', price: 350, icon: '👻', desc: 'Une fois par manche, annule un tirage et refais-le (carte au blackjack, dé, roulette, machine).' },
  { id: 'jackpot', name: 'Jackpot Éternel', rarity: 'legendaire', price: 400, icon: '💎', desc: 'Chaque victoire ajoute +0,1 à son multiplicateur de gains. Il ne se réinitialise jamais, même entre les parties.' },
];
const CONSUMABLES = [
  { id: 'bonus', name: 'Carte Bonus', price: 15, icon: '🎴', desc: 'Ajoute une carte de ton choix dans ta main (Blackjack ou Hold\'em, pendant une main).' },
  { id: 'dore', name: 'Jeton Doré', price: 20, icon: '🪙', desc: 'Ta prochaine mise compte double : son gain est doublé.' },
  { id: 'boisson', name: 'Boisson du Bar', price: 25, icon: '🍸', desc: '+1 relance pour la manche (dé, roulette, machine ou carte au blackjack).' },
  { id: 'potdevin', name: 'Pot-de-vin', price: 40, icon: '💰', desc: 'Le croupier révèle sa carte cachée (Blackjack ou Hold\'em, pendant une main).' },
  { id: 'ticket', name: 'Ticket à gratter', price: 10, icon: '🎟️', desc: 'Gain aléatoire de 0 à 100 jetons.' },
];
const UPGRADES = [
  { id: 'vip', name: 'Table VIP', price: 150, icon: '👑', desc: 'Mise max augmentée de 50 %.' },
  { id: 'truque', name: 'Sabot truqué', price: 120, icon: '🗃️', desc: 'Retire tous les 2 et 3 du paquet (Blackjack et Hold\'em).' },
  { id: 'doree', name: 'Machine dorée', price: 180, icon: '💠', desc: 'Ajoute un symbole Diamant ×10 aux machines à sous.' },
];
const PACKS = [
  { id: 'petit', name: 'Petit pack', price: 50, icon: '🎁', desc: '2 jokers communs : choisis-en un.' },
  { id: 'mystere', name: 'Pack mystère', price: 120, icon: '❓', desc: '1 joker aléatoire, rare au minimum.' },
];
const BOSSES = [
  { id: 'radin', name: 'Le Radin', desc: 'Le Blackjack paie 6:5.' },
  { id: 'douane', name: 'La Douane', desc: 'Mise max réduite de 40 %.' },
  { id: 'horloger', name: 'L\'Horloger', desc: '3 tours de moins.' },
  { id: 'glacon', name: 'Le Glaçon', desc: 'Les jokers communs sont désactivés.' },
  { id: 'fer', name: 'Le Croupier de fer', desc: 'Au Hold\'em, le croupier est toujours qualifié.' },
  { id: 'maison', name: 'La Maison', desc: 'Dice : avantage maison de 5 %.' },
];
const WILD_RULES = [
  { id: 'bj21', desc: 'Le Blackjack paie 2:1.' },
  { id: 'diceFair', desc: 'Dice sans avantage maison.' },
  { id: 'plein40', desc: 'Roulette : le numéro plein paie 40:1.' },
  { id: 'slots15', desc: 'Machines à sous : gains ×1,5.' },
  { id: 'charlie', desc: 'Blackjack : 5 cartes sans dépasser 21 = victoire.' },
  { id: 'uthTrips', desc: 'Hold\'em : la Blind paie aussi 1:1 sur un brelan.' },
];
const CATALOG = {};
[...JOKERS, ...CONSUMABLES, ...UPGRADES, ...PACKS].forEach(x => (CATALOG[x.id] = x));
const RARITY_LABEL = { commun: 'Commun', rare: 'Rare', legendaire: 'Légendaire' };

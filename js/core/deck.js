// Cartes et sabots — données pures (sérialisables), aucun DOM.
const SUITS = [
  { sym: '♠', color: 'black', name: 'Pique' },
  { sym: '♥', color: 'red', name: 'Cœur' },
  { sym: '♦', color: 'red', name: 'Carreau' },
  { sym: '♣', color: 'black', name: 'Trèfle' },
];
const RANK_LABEL = { 11: 'V', 12: 'D', 13: 'R', 14: 'A' };
const RANK_NAME = { 2: 'Deux', 3: 'Trois', 4: 'Quatre', 5: 'Cinq', 6: 'Six', 7: 'Sept', 8: 'Huit',
  9: 'Neuf', 10: 'Dix', 11: 'Valet', 12: 'Dame', 13: 'Roi', 14: 'As' };
const cardLabel = c => RANK_LABEL[c.rank] || String(c.rank);
const sameCard = (a, b) => a.rank === b.rank && a.suit === b.suit;

// Un sabot est un objet { decks, penetration, exclude, cards, cutAt }
const Deck = {
  create(rng, { decks = 1, penetration = 1, exclude = [] } = {}) {
    const shoe = { decks, penetration, exclude: exclude.slice(), cards: [], cutAt: 0 };
    Deck.shuffle(shoe, rng);
    return shoe;
  },
  // Reconstitue le sabot complet, moins les cartes encore sur la table
  shuffle(shoe, rng, inPlay = []) {
    const cards = [];
    for (let d = 0; d < shoe.decks; d++)
      for (let s = 0; s < 4; s++)
        for (let r = 2; r <= 14; r++) if (!shoe.exclude.includes(r)) cards.push({ rank: r, suit: s });
    inPlay.forEach(c => { const i = cards.findIndex(x => sameCard(x, c)); if (i >= 0) cards.splice(i, 1); });
    shoe.cards = rng.shuffle(cards);
    shoe.cutAt = Math.floor(shoe.cards.length * (1 - shoe.penetration));
  },
  needsShuffle: shoe => shoe.cards.length <= shoe.cutAt,
  // Sabot vide en pleine main : on remélange sans les cartes déjà en jeu
  draw(shoe, rng, inPlay = []) {
    if (!shoe.cards.length) Deck.shuffle(shoe, rng, inPlay);
    return shoe.cards.pop();
  },
};

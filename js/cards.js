// Cartes, sabot et rendu
const SUITS = [
  { sym: '♠', color: 'black' },
  { sym: '♥', color: 'red' },
  { sym: '♦', color: 'red' },
  { sym: '♣', color: 'black' },
];
const RANK_LABEL = { 11: 'V', 12: 'D', 13: 'R', 14: 'A' };
const RANK_NAME = { 2: 'Deux', 3: 'Trois', 4: 'Quatre', 5: 'Cinq', 6: 'Six', 7: 'Sept', 8: 'Huit',
  9: 'Neuf', 10: 'Dix', 11: 'Valet', 12: 'Dame', 13: 'Roi', 14: 'As' };

class Shoe {
  constructor(decks = 1, penetration = 0.75) {
    this.decks = decks;
    this.penetration = penetration;
    this.shuffle();
  }
  shuffle() {
    this.cards = [];
    for (let d = 0; d < this.decks; d++)
      for (let s = 0; s < 4; s++)
        for (let r = 2; r <= 14; r++) this.cards.push({ rank: r, suit: s });
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Util.randInt(i + 1);
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    this.cutAt = Math.floor(this.cards.length * (1 - this.penetration));
  }
  needsShuffle() { return this.cards.length <= this.cutAt; }
  draw() {
    if (this.cards.length === 0) this.shuffle();
    return this.cards.pop();
  }
}

function cardLabel(c) { return RANK_LABEL[c.rank] || String(c.rank); }

function cardEl(card, faceDown = false) {
  const e = Util.el('div', 'card');
  if (faceDown || !card) { e.classList.add('back'); return e; }
  const suit = SUITS[card.suit];
  e.classList.add(suit.color);
  const lab = cardLabel(card);
  e.innerHTML = `<span class="corner tl">${lab}<br>${suit.sym}</span>
    <span class="pip">${suit.sym}</span>
    <span class="corner br">${lab}<br>${suit.sym}</span>`;
  e.setAttribute('aria-label', `${RANK_NAME[card.rank]} de ${suit.sym}`);
  return e;
}

// Rendu d'une rangée de cartes avec animation des nouvelles cartes / retournements
function renderCards(container, cards, isHidden = () => false, highlight = null) {
  const prev = container._states || [];
  container.innerHTML = '';
  const states = [];
  cards.forEach((c, i) => {
    const hidden = isHidden(i);
    const e = cardEl(c, hidden);
    if (i >= prev.length) e.classList.add('deal');
    else if (prev[i] && !hidden) e.classList.add('flip');
    if (highlight && !hidden) e.classList.add(highlight.includes(c) ? 'win' : 'dim');
    e.style.animationDelay = '0ms';
    container.appendChild(e);
    states.push(hidden);
  });
  container._states = states;
}

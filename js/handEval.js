// Évaluation des mains de poker (meilleure main de 5 cartes parmi 5 à 7)
const HAND_NAMES = ['Carte haute', 'Paire', 'Double paire', 'Brelan', 'Quinte', 'Couleur',
  'Full', 'Carré', 'Quinte flush', 'Quinte flush royale'];

function eval5(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const flush = cards.every(c => c.suit === cards[0].suit);
  const uniq = new Set(ranks);
  let straightHigh = 0;
  if (uniq.size === 5) {
    if (ranks[0] - ranks[4] === 4) straightHigh = ranks[0];
    else if (ranks[0] === 14 && ranks[1] === 5) straightHigh = 5; // roue A-2-3-4-5
  }
  const counts = {};
  ranks.forEach(r => (counts[r] = (counts[r] || 0) + 1));
  const groups = Object.entries(counts).map(([r, c]) => [c, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const pattern = groups.map(g => g[0]).join('');
  const byGroup = groups.map(g => g[1]);
  let cat, kick;
  if (straightHigh && flush) { cat = straightHigh === 14 ? 9 : 8; kick = [straightHigh]; }
  else if (pattern === '41') { cat = 7; kick = byGroup; }
  else if (pattern === '32') { cat = 6; kick = byGroup; }
  else if (flush) { cat = 5; kick = ranks; }
  else if (straightHigh) { cat = 4; kick = [straightHigh]; }
  else if (pattern === '311') { cat = 3; kick = byGroup; }
  else if (pattern === '221') { cat = 2; kick = byGroup; }
  else if (pattern === '2111') { cat = 1; kick = byGroup; }
  else { cat = 0; kick = ranks; }
  return { cat, kick, name: HAND_NAMES[cat], cards };
}

function compareHands(a, b) {
  if (a.cat !== b.cat) return a.cat - b.cat;
  for (let i = 0; i < Math.max(a.kick.length, b.kick.length); i++) {
    const d = (a.kick[i] || 0) - (b.kick[i] || 0);
    if (d) return d;
  }
  return 0;
}

function bestHand(cards) {
  let best = null;
  const n = cards.length;
  const pick = [];
  (function rec(start) {
    if (pick.length === 5) {
      const h = eval5(pick.map(i => cards[i]));
      if (!best || compareHands(h, best) > 0) best = h;
      return;
    }
    for (let i = start; i <= n - (5 - pick.length); i++) {
      pick.push(i); rec(i + 1); pick.pop();
    }
  })(0);
  return best;
}

// Nom lisible de la main (gère aussi moins de 5 cartes)
function describeHand(cards) {
  if (cards.length >= 5) {
    const h = bestHand(cards);
    const top = h.kick[0];
    const plural = pluralRank(top);
    switch (h.cat) {
      case 0: return `Hauteur ${RANK_NAME[top]}`;
      case 1: return `Paire de ${plural}`;
      case 3: return `Brelan de ${plural}`;
      case 7: return `Carré de ${plural}`;
      default: return h.name;
    }
  }
  const [a, b] = cards;
  if (a && b && a.rank === b.rank) return `Paire de ${pluralRank(a.rank)}`;
  return 'Carte haute';
}

function pluralRank(r) {
  const n = RANK_NAME[r];
  return /[sx]$/.test(n) ? n : n + 's';
}

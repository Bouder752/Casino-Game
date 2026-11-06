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
    const plural = deRank(top);
    switch (h.cat) {
      case 0: return `Hauteur ${RANK_NAME[top]}`;
      case 1: return `Paire ${plural}`;
      case 3: return `Brelan ${plural}`;
      case 7: return `Carré ${plural}`;
      default: return h.name;
    }
  }
  const [a, b] = cards;
  if (a && b && a.rank === b.rank) return `Paire ${deRank(a.rank)}`;
  if (a || b) return `Hauteur ${RANK_NAME[Math.max(a ? a.rank : 0, b ? b.rank : 0)]}`;
  return '';
}

// « d'As », « de Rois », « de Sept »… (les nombres sont invariables)
function deRank(r) {
  if (r === 14) return "d'As";
  return 'de ' + RANK_NAME[r] + (r >= 11 ? 's' : '');
}

// Évaluateur rapide (5 à 7 cartes) → score numérique comparable ; catégorie = score >> 20
const _rc = new Uint8Array(15), _sc = new Uint8Array(4), _sm = new Uint16Array(4);
const _tr = new Uint8Array(3), _pr = new Uint8Array(4), _sg = new Uint8Array(8);
function _straightHigh(mask) {
  for (let h = 14; h >= 5; h--) {
    const need = 0x1F << (h - 4);
    if ((mask & need) === need) return h;
  }
  return 0;
}
function eval7(cards) {
  _rc.fill(0); _sc.fill(0); _sm.fill(0);
  let mask = 0;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    _rc[c.rank]++; _sc[c.suit]++; _sm[c.suit] |= 1 << c.rank; mask |= 1 << c.rank;
  }
  if (mask & (1 << 14)) mask |= 2;
  let flushScore = 0;
  for (let s = 0; s < 4; s++) {
    if (_sc[s] < 5) continue;
    let m = _sm[s];
    if (m & (1 << 14)) m |= 2;
    const sh = _straightHigh(m);
    if (sh) return ((sh === 14 ? 9 : 8) << 20) | (sh << 16);
    flushScore = 5 << 20;
    for (let r = 14, k = 0; r >= 2 && k < 5; r--) if (_sm[s] & (1 << r)) { flushScore |= r << (4 * (4 - k)); k++; }
    break;
  }
  let quad = 0, nt = 0, np = 0, ns = 0;
  _sg.fill(0); _pr.fill(0); _tr.fill(0);
  for (let r = 14; r >= 2; r--) {
    const n = _rc[r];
    if (n === 4) quad = r; else if (n === 3) _tr[nt++] = r; else if (n === 2) _pr[np++] = r; else if (n === 1) _sg[ns++] = r;
  }
  if (quad) return (7 << 20) | (quad << 16) | (Math.max(_tr[0], _pr[0], _sg[0]) << 12);
  if (nt && (nt > 1 || np)) return (6 << 20) | (_tr[0] << 16) | (Math.max(_tr[1], _pr[0]) << 12);
  if (flushScore) return flushScore;
  const sh = _straightHigh(mask);
  if (sh) return (4 << 20) | (sh << 16);
  if (nt) return (3 << 20) | (_tr[0] << 16) | (_sg[0] << 12) | (_sg[1] << 8);
  if (np >= 2) return (2 << 20) | (_pr[0] << 16) | (_pr[1] << 12) | (Math.max(_pr[2], _sg[0]) << 8);
  if (np === 1) return (1 << 20) | (_pr[0] << 16) | (_sg[0] << 12) | (_sg[1] << 8) | (_sg[2] << 4);
  return (_sg[0] << 16) | (_sg[1] << 12) | (_sg[2] << 8) | (_sg[3] << 4) | _sg[4];
}

// Rendu des cartes au style « portrait français » (SVG) et animations de distribution
const CardArt = (() => {
  const INK = { red: '#c4161c', black: '#141414' };
  const C = { red: '#c4161c', blue: '#1d4b9a', yellow: '#e9b81c', skin: '#f7d9bb', hair: '#7a4a22', line: '#1a1a1a' };
  // Noms traditionnels du portrait de Paris : [Valet, Dame, Roi]
  const COURT_NAMES = [
    ['HOGIER', 'PALLAS', 'DAVID'],
    ['LA HIRE', 'JUDITH', 'CHARLES'],
    ['HECTOR', 'RACHEL', 'CÉSAR'],
    ['LANCELOT', 'ARGINE', 'ALEXANDRE'],
  ];
  const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  const SUIT_PATHS = [
    'M50 2C44 16 4 38 4 62C4 77 16 87 30 87C39 87 45 83 48 77C47 86 43 92 33 98L67 98C57 92 53 86 52 77C55 83 61 87 70 87C84 87 96 77 96 62C96 38 56 16 50 2Z',
    'M50 94C46 85 4 61 4 32C4 15 16 5 30 5C40 5 47 12 50 21C53 12 60 5 70 5C84 5 96 15 96 32C96 61 54 85 50 94Z',
    'M50 2C60 20 72 36 88 50C72 64 60 80 50 98C40 80 28 64 12 50C28 36 40 20 50 2Z',
    circ(50, 27, 21) + circ(27, 58, 21) + circ(73, 58, 21) + circ(50, 50, 12) + 'M46 55Q46 85 31 97L69 97Q54 85 54 55Z',
  ];

  // Définitions globales (symboles + motif du dos)
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', 0); defs.setAttribute('height', 0);
  defs.style.position = 'absolute';
  defs.innerHTML = `<defs>
    ${SUIT_PATHS.map((d, i) => `<symbol id="suit-${i}" viewBox="0 0 100 100"><path d="${d}" fill="currentColor"/></symbol>`).join('')}
    ${Cosmetics.BACKS.map(b => `<pattern id="pat-${b.id}" width="18" height="18" patternUnits="userSpaceOnUse">
      <rect width="18" height="18" fill="${b.c[0]}"/>
      <path d="M0 9L9 0L18 9L9 18Z" fill="none" stroke="${b.c[1]}" stroke-width="1.3"/>
      <circle cx="9" cy="9" r="2" fill="${b.c[2]}"/><circle cx="0" cy="0" r="1.4" fill="${b.c[2]}"/>
      <circle cx="18" cy="0" r="1.4" fill="${b.c[2]}"/><circle cx="0" cy="18" r="1.4" fill="${b.c[2]}"/><circle cx="18" cy="18" r="1.4" fill="${b.c[2]}"/>
    </pattern>`).join('')}
    <linearGradient id="card-sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#f1ebdc"/>
    </linearGradient></defs>`;
  document.body.prepend(defs);

  const pip = (s, cx, cy, size) => {
    const u = `<use href="#suit-${s}" x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}"/>`;
    return cy > 145 ? `<g transform="rotate(180 ${cx} ${cy})">${u}</g>` : u;
  };

  // Dispositions classiques des points (x : 64/100/136)
  const L = 64, M = 100, R = 136, T = 56, B = 234, Y = 145;
  const q1 = 115.3, q2 = 174.7; // 4 rangées
  const LAYOUTS = {
    2: [[M, T], [M, B]],
    3: [[M, T], [M, Y], [M, B]],
    4: [[L, T], [R, T], [L, B], [R, B]],
    5: [[L, T], [R, T], [M, Y], [L, B], [R, B]],
    6: [[L, T], [R, T], [L, Y], [R, Y], [L, B], [R, B]],
    7: [[L, T], [R, T], [M, 100], [L, Y], [R, Y], [L, B], [R, B]],
    8: [[L, T], [R, T], [M, 100], [L, Y], [R, Y], [M, 190], [L, B], [R, B]],
    9: [[L, T], [R, T], [L, q1], [R, q1], [M, Y], [L, q2], [R, q2], [L, B], [R, B]],
    10: [[L, T], [R, T], [M, 86], [L, q1], [R, q1], [L, q2], [R, q2], [M, 204], [L, B], [R, B]],
  };

  function figure(type, suit) { // type 0 Valet, 1 Dame, 2 Roi — demi-figure (haut)
    const pal = [[C.red, C.blue], [C.blue, C.yellow], [C.yellow, C.red]][(type + suit) % 3];
    const [robe, accent] = pal;
    let g = '';
    // attribut tenu à la main
    if (type === 2) g += `<line x1="66" y1="145" x2="66" y2="66" stroke="${C.line}" stroke-width="3"/><circle cx="66" cy="62" r="7" fill="${C.yellow}" stroke="${C.line}" stroke-width="1.5"/><path d="M60 58L66 46L72 58Z" fill="${C.yellow}" stroke="${C.line}" stroke-width="1.2"/>`;
    if (type === 0) g += `<line x1="136" y1="145" x2="136" y2="48" stroke="${C.line}" stroke-width="3"/><path d="M136 40L146 56L136 66L128 56Z" fill="#cfd6dd" stroke="${C.line}" stroke-width="1.5"/>`;
    // corps
    g += `<path d="M46 145L50 120Q58 100 82 96L118 96Q142 100 150 120L154 145Z" fill="${robe}" stroke="${C.line}" stroke-width="1.6"/>`;
    g += `<path d="M94 100L106 100L110 145L90 145Z" fill="${accent}" stroke="${C.line}" stroke-width="1.2"/>`;
    g += `<path d="M58 118Q70 112 80 120M120 120Q130 112 142 118" fill="none" stroke="${C.line}" stroke-width="1.2"/>`;
    g += `<path d="M78 96Q100 116 122 96L118 106Q100 124 82 106Z" fill="#fff" stroke="${C.line}" stroke-width="1.2"/>`;
    for (let i = 0; i < 4; i++) g += `<circle cx="${86 + i * 9.5}" cy="${105 + (i === 1 || i === 2 ? 5 : 0)}" r="1.4" fill="${C.line}"/>`;
    if (type === 1) g += `<g transform="translate(128 108)"><line x1="0" y1="6" x2="-6" y2="30" stroke="#2f7a2f" stroke-width="2"/><circle r="7" fill="${C.red}" stroke="${C.line}"/><circle r="2.5" fill="${C.yellow}"/></g>`;
    // cheveux arrière
    if (type === 1) g += `<path d="M80 66Q78 96 90 100L110 100Q122 96 120 66Z" fill="${C.hair}" stroke="${C.line}" stroke-width="1.2"/>`;
    else g += `<path d="M84 64Q82 86 90 90L110 90Q118 86 116 64Z" fill="${C.hair}" stroke="${C.line}" stroke-width="1.2"/>`;
    // cou + tête
    g += `<rect x="94" y="84" width="12" height="14" fill="${C.skin}" stroke="${C.line}" stroke-width="1.2"/>`;
    g += `<ellipse cx="100" cy="72" rx="14" ry="16" fill="${C.skin}" stroke="${C.line}" stroke-width="1.5"/>`;
    g += `<circle cx="95" cy="70" r="1.6" fill="${C.line}"/><circle cx="105" cy="70" r="1.6" fill="${C.line}"/>`;
    g += `<path d="M100 72L98 78L101 78" fill="none" stroke="${C.line}" stroke-width="1"/><path d="M96 82Q100 84 104 82" fill="none" stroke="${C.red}" stroke-width="1.4"/>`;
    if (type === 2) g += `<path d="M87 76Q88 96 100 98Q112 96 113 76Q108 86 100 86Q92 86 87 76Z" fill="${C.hair}" stroke="${C.line}" stroke-width="1.2"/>`;
    // couvre-chef
    if (type === 2) g += `<path d="M85 60L84 42L91 50L95 36L100 47L105 36L109 50L116 42L115 60Z" fill="${C.yellow}" stroke="${C.line}" stroke-width="1.5"/><rect x="85" y="56" width="30" height="6" fill="${C.red}" stroke="${C.line}" stroke-width="1.2"/>`;
    if (type === 1) g += `<path d="M88 58L89 46L95 52L100 42L105 52L111 46L112 58Z" fill="${C.yellow}" stroke="${C.line}" stroke-width="1.4"/><circle cx="100" cy="48" r="2" fill="${C.red}"/>`;
    if (type === 0) g += `<path d="M82 62Q84 40 100 40Q116 40 118 62Z" fill="${accent}" stroke="${C.line}" stroke-width="1.5"/><path d="M78 62L122 62L120 66L80 66Z" fill="${robe}" stroke="${C.line}" stroke-width="1.2"/><path d="M114 46Q132 30 142 40Q128 40 118 52Z" fill="#fff" stroke="${C.line}" stroke-width="1.2"/>`;
    return g;
  }

  function corner(lab, s) {
    const fs = lab.length > 1 ? 30 : 36;
    return `<text x="22" y="40" text-anchor="middle" font-size="${fs}" font-family="Georgia,'Times New Roman',serif" font-weight="700" fill="currentColor" letter-spacing="-2">${lab}</text>
      <use href="#suit-${s}" x="10" y="48" width="24" height="24"/>`;
  }

  const cache = new Map();
  function front(card) {
    const key = card.rank + '-' + card.suit;
    if (cache.has(key)) return cache.get(key);
    const s = card.suit, lab = cardLabel(card), ink = INK[SUITS[s].color];
    let body = '';
    if (card.rank <= 10) {
      body = LAYOUTS[card.rank].map(([x, y]) => pip(s, x, y, 36)).join('');
    } else if (card.rank === 14) {
      body = pip(s, 100, 145, s === 0 ? 96 : 84);
      if (s === 0) body = `<ellipse cx="100" cy="145" rx="62" ry="74" fill="none" stroke="currentColor" stroke-width="2"/>
        <ellipse cx="100" cy="145" rx="56" ry="68" fill="none" stroke="#b8902f" stroke-width="1.5" stroke-dasharray="3 4"/>` + body +
        `<text x="100" y="236" text-anchor="middle" font-size="11" font-family="Georgia,serif" letter-spacing="2" fill="currentColor">BOUBOUZ'INO</text>`;
    } else {
      const type = card.rank - 11;
      const half = figure(type, s) + `<use href="#suit-${s}" x="42" y="36" width="22" height="22"/>` +
        `<text transform="translate(157 40) rotate(90)" font-size="10" font-family="Georgia,serif" font-weight="700" letter-spacing="1.5" fill="currentColor">${COURT_NAMES[s][type]}</text>`;
      body = `<rect x="36" y="30" width="128" height="230" fill="#fbf4e2" stroke="currentColor" stroke-width="1.5"/>
        <svg x="36" y="30" width="128" height="230" viewBox="36 30 128 230" overflow="hidden">
          <g>${half}</g><g transform="rotate(180 100 145)">${half}</g></svg>
        <line x1="36" y1="145" x2="164" y2="145" stroke="currentColor" stroke-width="1.5"/>
        <rect x="36" y="30" width="128" height="230" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
    }
    const svg = `<svg viewBox="0 0 200 290" style="color:${ink}" aria-hidden="true">
      <rect x="1.5" y="1.5" width="197" height="287" rx="14" fill="url(#card-sheen)" stroke="#c9c1ad" stroke-width="2"/>
      ${corner(lab, s)}<g transform="rotate(180 100 145)">${corner(lab, s)}</g>${body}</svg>`;
    cache.set(key, svg);
    return svg;
  }

  function back() {
    const b = Cosmetics.back();
    return `<svg viewBox="0 0 200 290" aria-hidden="true">
    <rect x="1.5" y="1.5" width="197" height="287" rx="14" fill="#fbf8f0" stroke="#c9c1ad" stroke-width="2"/>
    <rect x="11" y="11" width="178" height="268" rx="8" fill="url(#pat-${b.id})"/>
    <rect x="16" y="16" width="168" height="258" rx="5" fill="none" stroke="${b.c[2]}" stroke-width="1.5"/>
    <ellipse cx="100" cy="145" rx="44" ry="56" fill="${b.c[3]}" stroke="#e2bd62" stroke-width="3"/>
    <ellipse cx="100" cy="145" rx="37" ry="49" fill="none" stroke="#e2bd62" stroke-width="1"/>
    <text x="100" y="165" text-anchor="middle" font-size="58" font-family="Georgia,serif" font-style="italic" font-weight="700" fill="#e2bd62">B</text></svg>`;
  }

  return { front, back };
})();

function cardEl(card) {
  const e = Util.el('div', 'card');
  e.innerHTML = `<div class="card-inner"><div class="face front">${CardArt.front(card)}</div><div class="face back">${CardArt.back()}</div></div>`;
  e._key = card.rank + '-' + card.suit;
  e.setAttribute('aria-label', `${RANK_NAME[card.rank]} de ${SUITS[card.suit].name}`);
  return e;
}

// Fait glisser la carte depuis le sabot de la table visible
function dealFromShoe(e) {
  const shoe = e.closest('.felt')?.querySelector('.shoe');
  if (!shoe) return;
  const a = shoe.getBoundingClientRect(), b = e.getBoundingClientRect();
  if (!a.width || !b.width) return;
  e.style.setProperty('--dx', `${a.left + a.width / 2 - (b.left + b.width / 2)}px`);
  e.style.setProperty('--dy', `${a.top + a.height / 2 - (b.top + b.height / 2)}px`);
  e.classList.add('dealing');
  e.addEventListener('animationend', () => e.classList.remove('dealing'), { once: true });
}

// Rendu incrémental : nouvelles cartes distribuées, cartes cachées retournées en 3D
function renderCards(container, cards, isHidden = () => false, highlight = null) {
  const kids = [...container.children];
  let keep = 0;
  while (keep < kids.length && keep < cards.length && kids[keep]._key === cards[keep].rank + '-' + cards[keep].suit) keep++;
  kids.slice(keep).forEach(k => k.remove());
  cards.forEach((c, i) => {
    const hidden = isHidden(i);
    let e = container.children[i];
    if (!e) {
      e = cardEl(c);
      e.classList.add('down');
      container.appendChild(e);
      dealFromShoe(e);
      Sfx.play('deal');
      if (!hidden) {
        e._pending = setTimeout(() => { e._pending = null; if (!e._wantHidden) e.classList.remove('down'); }, 330);
      }
    } else if (!e._pending) {
      if (e.classList.contains('down') && !hidden) Sfx.play('flip');
      e.classList.toggle('down', hidden);
    }
    e._wantHidden = hidden;
    e.classList.toggle('win', !!highlight && !hidden && highlight.includes(c));
    e.classList.toggle('dim', !!highlight && !hidden && !highlight.includes(c));
  });
}

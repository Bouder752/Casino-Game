// Illustrations originales des jokers (SVG, 160 × 140), style Art déco.
// Certaines sont chic, d'autres franchement trolls.
const JokerArt = (() => {
  const G = '#D4AF37', G2 = '#F2D675', CR = '#F3E9D2', BG = '#0B3B2E', BX = '#6B1E2E', K = '#14110F';
  const ink = 'stroke="#14110F" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';

  // Fond : soleil Art déco + arche
  const sun = (c1, c2) => {
    let rays = '';
    for (let i = 0; i < 18; i++) {
      const a = (-90 + (i - 8.5) * 10) * Math.PI / 180;
      rays += `<path d="M80 150 L${80 + 190 * Math.cos(a - 0.03)} ${150 + 190 * Math.sin(a - 0.03)} L${80 + 190 * Math.cos(a + 0.03)} ${150 + 190 * Math.sin(a + 0.03)}Z" fill="${c2}" opacity="${i % 2 ? 0.16 : 0.08}"/>`;
    }
    return `<rect width="160" height="140" fill="${c1}"/>${rays}
      <path d="M8 140 V60 A72 72 0 0 1 152 60 V140" fill="none" stroke="${G}" stroke-width="1" opacity=".55"/>
      <path d="M14 140 V62 A66 66 0 0 1 146 62 V140" fill="none" stroke="${G}" stroke-width=".6" opacity=".35"/>`;
  };
  const sparkle = (x, y, r = 5, c = G2) => `<path d="M${x} ${y - r}L${x + r * 0.28} ${y - r * 0.28}L${x + r} ${y}L${x + r * 0.28} ${y + r * 0.28}L${x} ${y + r}L${x - r * 0.28} ${y + r * 0.28}L${x - r} ${y}L${x - r * 0.28} ${y - r * 0.28}Z" fill="${c}"/>`;
  const eye = (x, y, r = 4, look = 0) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${ink}/><circle cx="${x + look}" cy="${y + 0.5}" r="${r * 0.48}" fill="${K}"/>`;
  const chip = (x, y, r, c = BX) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${ink}/><circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="none" stroke="${CR}" stroke-width="${r * 0.18}" stroke-dasharray="${r * 0.5} ${r * 0.35}"/><circle cx="${x}" cy="${y}" r="${r * 0.38}" fill="${c}" stroke="${G}" stroke-width="1"/>`;

  const ART = {
    // 🍀 Trèfle snob : haut-de-forme et monocle
    porte: () => sun('#0f4a35', G2) + `
      <path d="M80 92 C82 108 76 122 66 132" fill="none" stroke="#1d6b3c" stroke-width="5" stroke-linecap="round"/>
      ${[0, 90, 180, 270].map(a => `<path transform="translate(80 80) rotate(${a})" d="M0 0 C-24 -6 -30 -36 -10 -42 C-2 -44 0 -36 0 -30 C0 -36 2 -44 10 -42 C30 -36 24 -6 0 0Z" fill="#3fa65e" ${ink}/>`).join('')}
      <circle cx="80" cy="80" r="15" fill="#5cc276" ${ink}/>
      ${eye(74, 78, 3.6, 1)}${eye(86, 78, 3.6, 1)}
      <circle cx="86" cy="78" r="6" fill="none" stroke="${G}" stroke-width="2"/><path d="M92 80 Q100 92 96 104" fill="none" stroke="${G}" stroke-width="1.2"/>
      <path d="M73 87 Q80 92 87 86" fill="none" ${ink}/>
      <rect x="66" y="24" width="28" height="22" rx="2" fill="${K}" ${ink}/><rect x="58" y="44" width="44" height="6" rx="3" fill="${K}" ${ink}/>
      <rect x="66" y="38" width="28" height="5" fill="${BX}"/>${sparkle(126, 34, 6)}${sparkle(34, 108, 4)}`,

    // 🌹 Rose dans une coupe de champagne
    rouge: () => sun('#3a0f18', '#ff8a9a') + `
      <path d="M50 56 L110 56 L84 86 L84 118 L100 124 L60 124 L76 118 L76 86Z" fill="${CR}" opacity=".25" ${ink}/>
      <path d="M54 60 L106 60 L83 84 L77 84Z" fill="#f6e3a8" opacity=".65"/>
      ${[0, 1, 2, 3, 4].map(i => `<circle cx="${66 + i * 7}" cy="${74 - (i % 2) * 6}" r="1.6" fill="#fff" opacity=".9"/>`).join('')}
      <path d="M80 60 C80 50 78 44 80 38" fill="none" stroke="#2e7d32" stroke-width="3"/>
      <path d="M80 44 C70 46 64 40 62 34 C70 32 76 36 80 44Z" fill="#3e9b4f" ${ink}/>
      <circle cx="80" cy="28" r="16" fill="#c4161c" ${ink}/>
      <path d="M68 26 C72 16 88 16 92 26 C88 22 72 22 68 26Z M72 32 C76 24 86 24 90 32 M74 22 C78 30 84 30 86 20" fill="none" stroke="#7a0a10" stroke-width="2"/>
      ${sparkle(118, 30, 6)}${sparkle(40, 46, 4)}`,

    // 7️⃣ Le 7 au paradis : ailes et auréole
    septieme: () => sun('#16365a', '#cfe3ff') + `
      <ellipse cx="80" cy="22" rx="20" ry="5" fill="none" stroke="${G2}" stroke-width="3.5"/>
      <path d="M58 70 C30 56 20 70 14 54 C30 52 40 44 56 52 C40 40 30 44 22 32 C42 30 52 40 60 48Z" fill="#fff" ${ink}/>
      <path d="M102 70 C130 56 140 70 146 54 C130 52 120 44 104 52 C120 40 130 44 138 32 C118 30 108 40 100 48Z" fill="#fff" ${ink}/>
      <path d="M56 34 H106 L82 112 H64 L86 48 H56Z" fill="${G}" ${ink}/><path d="M60 38 H100 L98 44 H62Z" fill="${G2}"/>
      <path d="M10 124 C20 108 40 112 46 120 C54 106 74 108 80 120 C88 106 110 108 114 120 C122 110 146 112 150 126 V140 H10Z" fill="#fff" ${ink}/>`,

    // 🧤 La main molle qui agite un drapeau blanc
    molle: () => sun('#2a3b33', '#c9d6c8') + `
      <path d="M100 18 L104 96" stroke="#7a5a3a" stroke-width="3.5"/>
      <path d="M104 22 C120 16 128 30 142 24 C140 38 132 44 146 52 C130 58 118 46 106 52Z" fill="#fff" ${ink}/>
      <path d="M30 126 C30 108 40 96 56 92 L90 86 C100 84 106 92 98 98 L80 102 C92 104 98 112 90 116 C98 118 96 128 86 128 C92 132 86 138 76 136 L44 136 C34 136 30 132 30 126Z" fill="${CR}" ${ink}/>
      <path d="M62 104 C70 106 78 104 84 102 M60 116 C70 118 80 118 88 116" fill="none" stroke="#a8977a" stroke-width="1.6"/>
      <path d="M36 70 Q42 62 38 54 M48 66 Q56 56 50 48" fill="none" stroke="#9fb5ff" stroke-width="2.4"/>
      <path d="M52 40 C52 34 58 34 58 40 C58 44 52 46 52 40Z" fill="#9fd3ff" ${ink}/>
      <text x="22" y="40" font-family="Georgia,serif" font-size="13" font-style="italic" fill="${CR}">pfff…</text>`,

    // 🧮 Hibou comptable à lunettes, boulier
    compteur: () => sun('#2b2a45', '#d6d0ff') + `
      <rect x="22" y="104" width="116" height="30" rx="4" fill="#5a3d24" ${ink}/>
      ${[112, 120, 128].map((y, k) => `<line x1="26" y1="${y}" x2="134" y2="${y}" stroke="#2a1b0e" stroke-width="1.5"/>` + [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${34 + i * 9 + (k === 1 && i > 2 ? 30 : 0)}" cy="${y}" r="3.6" fill="${[BX, G, BG][k]}" ${ink}/>`).join('')).join('')}
      <path d="M52 100 C44 70 50 36 80 34 C110 36 116 70 108 100Z" fill="#8a6a48" ${ink}/>
      <path d="M58 34 L52 20 L68 32 M102 34 L108 20 L92 32" fill="#8a6a48" ${ink}/>
      <path d="M64 70 C70 92 90 92 96 70 Z" fill="${CR}" opacity=".85"/>
      <circle cx="68" cy="56" r="12" fill="#fff" stroke="${G}" stroke-width="3"/><circle cx="92" cy="56" r="12" fill="#fff" stroke="${G}" stroke-width="3"/>
      <line x1="80" y1="56" x2="80" y2="56" ${ink}/><path d="M78 56 H82" stroke="${G}" stroke-width="3"/>
      <circle cx="70" cy="57" r="5" fill="${K}"/><circle cx="94" cy="57" r="5" fill="${K}"/>
      <path d="M76 66 L80 74 L84 66Z" fill="#f2a43a" ${ink}/>
      <text x="118" y="34" font-family="Georgia,serif" font-size="14" font-weight="700" fill="${G2}">16?</text>`,

    // 🎗️ Nounours triste avec son ruban « participant »
    consolation: () => sun('#3b2d3f', '#f3c6e0') + `
      <circle cx="56" cy="40" r="13" fill="#a07048" ${ink}/><circle cx="104" cy="40" r="13" fill="#a07048" ${ink}/>
      <circle cx="56" cy="40" r="6" fill="#d9a77c"/><circle cx="104" cy="40" r="6" fill="#d9a77c"/>
      <ellipse cx="80" cy="112" rx="34" ry="30" fill="#a07048" ${ink}/>
      <circle cx="80" cy="62" r="30" fill="#b07c52" ${ink}/>
      <ellipse cx="80" cy="74" rx="13" ry="10" fill="#e3bd96" ${ink}/>
      <circle cx="80" cy="70" r="3.5" fill="${K}"/>
      <path d="M72 82 Q80 76 88 82" fill="none" ${ink}/>
      <path d="M64 58 L72 60 M96 58 L88 60" ${ink}/><circle cx="68" cy="64" r="2.6" fill="${K}"/><circle cx="92" cy="64" r="2.6" fill="${K}"/>
      <path d="M70 70 C68 76 68 78 70 80 C72 78 72 76 70 70Z" fill="#7fc3ff"/>
      <circle cx="80" cy="108" r="11" fill="#3b6fd1" ${ink}/><path d="M74 116 L70 134 L78 128 L80 136 L84 128 L90 134 L86 116" fill="#3b6fd1" ${ink}/>
      <text x="80" y="111" text-anchor="middle" font-size="7" font-family="Georgia,serif" font-weight="700" fill="#fff">PART.</text>`,

    // 🎲 Le dé pipé… qui fume la pipe
    depipe: () => sun('#2e2b26', '#efe2c4') + `
      <path d="M92 26 C84 18 96 12 90 4 M104 30 C98 20 110 16 104 8" fill="none" stroke="#d9d9d9" stroke-width="3" stroke-linecap="round" opacity=".8"/>
      <path d="M36 52 L80 34 L124 52 L124 104 L80 126 L36 104Z" fill="${CR}" ${ink}/>
      <path d="M36 52 L80 70 L124 52 M80 70 V126" fill="none" ${ink}/>
      <circle cx="80" cy="50" r="4" fill="${BX}"/><circle cx="56" cy="82" r="4" fill="${BX}"/><circle cx="58" cy="102" r="4" fill="${BX}"/>
      <circle cx="100" cy="82" r="4" fill="${K}"/><circle cx="110" cy="96" r="4" fill="${K}"/><circle cx="96" cy="108" r="4" fill="${K}"/>
      <path d="M50 66 L62 70 M66 64 L74 72" ${ink}/>
      <path d="M70 92 C80 96 90 96 96 92" fill="none" ${ink}/>
      <path d="M92 92 L112 82" stroke="#5a3a20" stroke-width="4" stroke-linecap="round"/>
      <path d="M106 70 H122 V84 C122 90 106 90 106 84Z" fill="#7a4a26" ${ink}/><ellipse cx="114" cy="70" rx="8" ry="3" fill="#ff8a3a"/>`,

    // 🤵 Croupier corrompu : lunettes noires, carte derrière l'oreille, billet qui dépasse
    corrompu: () => sun('#1b2a2a', '#bfe6dc') + `
      <path d="M30 140 C32 112 52 100 80 100 C108 100 128 112 130 140Z" fill="${K}" ${ink}/>
      <path d="M68 100 L80 122 L92 100Z" fill="#fff" ${ink}/><path d="M72 104 L80 98 L88 104 L80 110Z" fill="${BX}" ${ink}/>
      <rect x="98" y="114" width="20" height="12" rx="1" fill="#6fbf73" ${ink}/><text x="108" y="124" text-anchor="middle" font-size="8" font-weight="700" fill="#14472a">€</text>
      <circle cx="80" cy="64" r="30" fill="#e8b48a" ${ink}/>
      <path d="M50 58 C50 30 110 30 110 58 C104 44 56 44 50 58Z" fill="#2b1a10" ${ink}/>
      <rect x="56" y="58" width="22" height="12" rx="4" fill="${K}"/><rect x="82" y="58" width="22" height="12" rx="4" fill="${K}"/><path d="M78 63 H82" stroke="${K}" stroke-width="3"/>
      <path d="M60 61 L66 61" stroke="#fff" stroke-width="2" opacity=".7"/>
      <path d="M68 82 Q82 90 94 80" fill="none" ${ink}/>
      <g transform="translate(104 34) rotate(18)"><rect width="16" height="22" rx="2" fill="#fff" ${ink}/><text x="8" y="15" text-anchor="middle" font-size="10" font-weight="700" fill="#c4161c">A</text></g>
      ${sparkle(30, 30, 5)}`,

    // 📈 Martingale : flèche dorée qui grimpe au-dessus des piles de jetons
    martingale: () => sun('#10303e', '#bfefff') + `
      ${[0, 1, 2, 3].map(i => Array.from({ length: i + 2 }, (_, k) => `<ellipse cx="${34 + i * 30}" cy="${128 - k * 9}" rx="12" ry="5" fill="${[BX, BG, G, '#2b4a8a'][i]}" ${ink}/>`).join('')).join('')}
      <path d="M22 98 L50 80 L66 92 L98 56 L114 66 L138 30" fill="none" stroke="${K}" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M22 98 L50 80 L66 92 L98 56 L114 66 L138 30" fill="none" stroke="${G}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M124 26 L144 22 L140 42Z" fill="${G}" ${ink}/>${sparkle(30, 30, 6)}${sparkle(112, 100, 4)}`,

    // 🟢 Le zéro qui fait un câlin à ton jeton
    zero: () => sun('#0d4b2c', '#b9f5cf') + `
      <ellipse cx="80" cy="70" rx="38" ry="48" fill="#11804a" ${ink}/><ellipse cx="80" cy="70" rx="18" ry="28" fill="#0b3b2e" ${ink}/>
      ${eye(68, 48, 4.5, 1)}${eye(92, 48, 4.5, -1)}
      <circle cx="58" cy="62" r="5" fill="#ff8aa8" opacity=".7"/><circle cx="102" cy="62" r="5" fill="#ff8aa8" opacity=".7"/>
      <path d="M70 60 Q80 70 90 60" fill="none" ${ink}/>
      ${chip(80, 100, 15)}
      <path d="M44 84 C50 104 62 106 70 102 M116 84 C110 104 98 106 90 102" fill="none" stroke="#11804a" stroke-width="9" stroke-linecap="round"/>
      <path d="M44 84 C50 104 62 106 70 102 M116 84 C110 104 98 106 90 102" fill="none" ${ink} stroke-width="1.5"/>
      <path d="M30 30 C26 22 36 18 38 26 C40 18 50 22 46 30 L38 38Z" fill="#ff5c7a"/>`,

    // 🍒 Trois cerises en lunettes de soleil, ambiance disco
    cerise: () => sun('#3a0a2a', '#ffb3e6') + `
      <circle cx="80" cy="16" r="9" fill="#d8d8e8" ${ink}/>
      ${[[-4, -4], [4, -2], [-2, 4], [5, 5]].map(([x, y]) => `<rect x="${76 + x}" y="${12 + y}" width="3" height="3" fill="#fff"/>`).join('')}
      <path d="M80 26 C70 40 52 54 44 82 M80 26 C80 46 80 60 80 86 M80 26 C92 42 108 54 116 82" fill="none" stroke="#2e7d32" stroke-width="4" stroke-linecap="round"/>
      <path d="M80 26 C90 18 104 20 108 30 C96 34 88 30 80 26Z" fill="#43a047" ${ink}/>
      ${[[44, 98], [80, 104], [116, 98]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="#c4161c" ${ink}/><path d="M${x - 14} ${y - 4} h28 v6 c0 6 -12 6 -13 0 h-2 c-1 6 -13 6 -13 0z" fill="${K}"/><path d="M${x - 8} ${y + 9} q8 6 16 0" fill="none" ${ink}/><circle cx="${x - 8}" cy="${y - 10}" r="3" fill="#fff" opacity=".7"/>`).join('')}
      ${sparkle(24, 40, 6, '#ffd6f5')}${sparkle(138, 44, 5, '#ffd6f5')}`,

    // 🕵️ Main gantée qui subtilise un jeton dans une poche
    pickpocket: () => sun('#1e1e2e', '#c8c8ff') + `
      <path d="M16 140 V70 C40 64 70 66 92 72 L92 140Z" fill="#3a3a52" ${ink}/>
      <path d="M40 92 C56 86 76 88 92 94 L92 128 C74 134 56 132 40 126Z" fill="#2a2a3c" ${ink}/>
      <path d="M40 92 C56 86 76 88 92 94" fill="none" stroke="${G}" stroke-width="1.5" stroke-dasharray="3 3"/>
      ${chip(76, 84, 12)}
      <path d="M150 50 C132 46 112 56 98 70 L86 78 C80 82 82 90 90 88 L104 82 C112 80 118 84 126 82 L150 76Z" fill="${K}" ${ink}/>
      <path d="M94 74 C88 70 90 64 96 66" fill="none" stroke="#444" stroke-width="2"/>
      <path d="M96 18 C106 10 132 10 142 18 C138 30 126 30 120 24 C114 30 100 30 96 18Z" fill="${K}"/>
      ${eye(108, 20, 3.5, 2)}${eye(130, 20, 3.5, 2)}
      ${sparkle(36, 30, 5)}`,

    // 🪞 Miroir Art déco : le reflet est un joker mystère
    miroir: () => sun('#20303c', '#d8f0ff') + `
      <path d="M40 132 V62 A40 40 0 0 1 120 62 V132Z" fill="${G}" ${ink}/>
      <path d="M48 126 V64 A32 32 0 0 1 112 64 V126Z" fill="#9fc6d6" ${ink}/>
      <path d="M56 120 L104 70 M70 124 L110 84" stroke="#fff" stroke-width="6" opacity=".35"/>
      <g transform="translate(66 74) rotate(-6)"><rect width="30" height="40" rx="3" fill="${CR}" ${ink}/><text x="15" y="29" text-anchor="middle" font-family="Georgia,serif" font-size="24" font-weight="700" fill="${BX}">?</text></g>
      ${[0, 1, 2, 3, 4].map(i => `<path d="M${52 + i * 14} 18 l4 -12 l4 12z" fill="${G}" ${ink} stroke-width="1.4"/>`).join('')}
      ${sparkle(122, 40, 6)}${sparkle(38, 46, 4)}`,

    // 🛟 Bouée de sauvetage autour d'un jeton
    assurance: () => sun('#0e3a5a', '#bfe8ff') + `
      <path d="M0 116 C20 106 40 126 60 116 C80 106 100 126 120 116 C140 106 150 120 160 114 V140 H0Z" fill="#2f7fbf" ${ink}/>
      <circle cx="80" cy="70" r="44" fill="#fff" ${ink}/><circle cx="80" cy="70" r="22" fill="#0e3a5a" ${ink}/>
      ${[0, 1, 2, 3].map(i => `<path d="M80 70 L${80 + 46 * Math.cos((i * 90 - 22) * Math.PI / 180)} ${70 + 46 * Math.sin((i * 90 - 22) * Math.PI / 180)} A46 46 0 0 1 ${80 + 46 * Math.cos((i * 90 + 22) * Math.PI / 180)} ${70 + 46 * Math.sin((i * 90 + 22) * Math.PI / 180)}Z" fill="#d42a2a"/>`).join('')}
      <circle cx="80" cy="70" r="22" fill="#0e3a5a" ${ink}/><circle cx="80" cy="70" r="44" fill="none" ${ink}/>
      ${chip(80, 70, 16, G)}<text x="80" y="75" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="14" fill="${K}">50</text>`,

    // 🎩 Le Parrain : feutre, rose à la boutonnière, visage dans l'ombre
    parrain: () => sun('#1a1410', '#f2d675') + `
      <path d="M22 140 C26 108 50 94 80 94 C110 94 134 108 138 140Z" fill="#26262e" ${ink}/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${36 + i * 18} 140 L${44 + i * 14} 100" stroke="#555" stroke-width="1"/>`).join('')}
      <path d="M66 94 L80 128 L94 94Z" fill="#f3f3f3" ${ink}/><path d="M76 98 L84 98 L82 124 L78 124Z" fill="${BX}"/>
      <circle cx="108" cy="110" r="7" fill="#c4161c" ${ink}/><path d="M104 108 Q108 104 112 108" fill="none" stroke="#7a0a10" stroke-width="1.5"/>
      <path d="M58 70 C58 50 102 50 102 70 C102 88 90 96 80 96 C70 96 58 88 58 70Z" fill="#7a5a44" ${ink}/>
      <path d="M58 70 C58 60 102 60 102 70 L102 76 C90 70 70 70 58 76Z" fill="${K}" opacity=".85"/>
      <circle cx="70" cy="73" r="2.2" fill="${G2}"/><circle cx="90" cy="73" r="2.2" fill="${G2}"/>
      <path d="M68 86 Q80 82 92 86" fill="none" ${ink}/>
      <path d="M36 58 C40 50 120 50 124 58 C122 64 38 64 36 58Z" fill="${K}" ${ink}/>
      <path d="M56 56 C56 28 104 28 104 56Z" fill="${K}" ${ink}/><path d="M57 50 H103" stroke="${BX}" stroke-width="5"/>
      ${sparkle(130, 26, 6)}`,

    // 🃏 Tricheur maladroit : les as s'échappent de sa manche
    tricheur: () => sun('#3a1030', '#ffc8f0') + `
      <path d="M30 34 L50 18 L58 40 M130 34 L110 18 L102 40 M80 12 L72 34 L88 34Z" fill="${BX}" ${ink}/>
      <circle cx="50" cy="18" r="4" fill="${G}" ${ink}/><circle cx="110" cy="18" r="4" fill="${G}" ${ink}/><circle cx="80" cy="10" r="4" fill="${G}" ${ink}/>
      <path d="M44 40 C44 30 116 30 116 40 L116 46 L44 46Z" fill="${G}" ${ink}/>
      <circle cx="80" cy="70" r="28" fill="#f2d0b8" ${ink}/>
      <circle cx="70" cy="66" r="6" fill="#fff" ${ink}/><circle cx="90" cy="66" r="6" fill="#fff" ${ink}/><circle cx="72" cy="64" r="2.4" fill="${K}"/><circle cx="92" cy="64" r="2.4" fill="${K}"/>
      <path d="M68 84 Q74 78 80 84 Q86 90 92 82" fill="none" ${ink}/>
      <path d="M108 54 C112 60 112 64 108 66 C104 64 104 60 108 54Z" fill="#7fc3ff"/>
      <path d="M100 96 C116 98 128 108 134 122" fill="none" stroke="${BX}" stroke-width="14" stroke-linecap="round"/>
      ${[[118, 128, -30], [138, 104, 20], [100, 120, -60]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-8" y="-11" width="16" height="22" rx="2" fill="#fff" ${ink}/><text y="5" text-anchor="middle" font-size="11" font-weight="700" font-family="Georgia,serif" fill="${K}">A</text></g>`).join('')}
      <text x="18" y="126" font-family="Georgia,serif" font-size="13" font-style="italic" fill="${CR}">oups</text>`,

    // 🎡 Roue folle aux yeux exorbités
    roue: () => sun('#2a1450', '#e2ccff') + `
      <path d="M22 52 C18 70 22 90 32 104 M138 52 C142 70 138 90 128 104" fill="none" stroke="${G2}" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 6"/>
      <circle cx="80" cy="72" r="48" fill="${K}" ${ink}/>
      ${Array.from({ length: 12 }, (_, i) => { const a0 = i * 30 * Math.PI / 180, a1 = (i + 1) * 30 * Math.PI / 180; return `<path d="M80 72 L${80 + 44 * Math.cos(a0)} ${72 + 44 * Math.sin(a0)} A44 44 0 0 1 ${80 + 44 * Math.cos(a1)} ${72 + 44 * Math.sin(a1)}Z" fill="${['#c4161c', '#1d4b9a', G, '#11804a'][i % 4]}"/>`; }).join('')}
      <circle cx="80" cy="72" r="20" fill="${CR}" ${ink}/>
      ${eye(72, 70, 6, 2)}${eye(90, 68, 7, -3)}
      <path d="M70 84 Q80 78 92 86" fill="none" ${ink}/>
      <path d="M80 12 L74 24 H86Z" fill="${G}" ${ink}/>`,

    // 🏦 Le Banquier : haut-de-forme, monocle, sac d'or
    banquier: () => sun('#2c2412', '#ffe9a8') + `
      <path d="M96 140 C92 120 98 102 116 96 C110 90 112 84 122 84 C132 84 134 90 128 96 C146 102 152 120 148 140Z" fill="#c9a24a" ${ink}/>
      <path d="M116 96 H128" stroke="${K}" stroke-width="3"/><text x="122" y="128" text-anchor="middle" font-size="18" font-weight="700" font-family="Georgia,serif" fill="${K}">€</text>
      <path d="M14 140 C18 112 36 100 62 100 C88 100 104 112 108 140Z" fill="#20202a" ${ink}/>
      <circle cx="60" cy="70" r="26" fill="#efc9a6" ${ink}/>
      <path d="M44 82 C50 76 56 80 60 78 C64 80 70 76 76 82 C70 86 64 84 60 86 C56 84 50 86 44 82Z" fill="#e8e8e8" ${ink}/>
      <circle cx="51" cy="66" r="2.6" fill="${K}"/><circle cx="70" cy="66" r="7" fill="none" stroke="${G}" stroke-width="2.5"/><circle cx="70" cy="66" r="2.6" fill="${K}"/>
      <path d="M76 70 Q86 82 82 96" fill="none" stroke="${G}" stroke-width="1.2"/>
      <rect x="40" y="18" width="40" height="30" rx="2" fill="${K}" ${ink}/><rect x="30" y="44" width="60" height="7" rx="3" fill="${K}" ${ink}/><rect x="40" y="38" width="40" height="5" fill="${BX}"/>
      ${sparkle(132, 40, 6)}${sparkle(112, 22, 4)}`,

    // 👻 Fantôme du casino : nœud papillon et martini
    fantome: () => sun('#162a33', '#d4f4ff') + `
      <path d="M40 130 V66 C40 36 58 22 80 22 C102 22 120 36 120 66 V130 L110 120 L100 130 L90 120 L80 130 L70 120 L60 130 L50 120Z" fill="#f4f8ff" opacity=".92" ${ink}/>
      <ellipse cx="68" cy="62" rx="6" ry="9" fill="${K}"/><ellipse cx="92" cy="62" rx="6" ry="9" fill="${K}"/>
      <circle cx="70" cy="58" r="2" fill="#fff"/><circle cx="94" cy="58" r="2" fill="#fff"/>
      <path d="M72 80 Q80 86 88 80" fill="none" ${ink}/>
      <path d="M66 94 L80 100 L66 106Z M94 94 L80 100 L94 106Z" fill="${K}" ${ink}/><circle cx="80" cy="100" r="3" fill="${K}"/>
      <path d="M120 84 L146 84 L133 100Z" fill="#cfefff" opacity=".7" ${ink}/><path d="M133 100 V120 M124 122 H142" ${ink}/>
      <circle cx="136" cy="88" r="3" fill="#6fbf73" ${ink}/><path d="M118 96 C124 94 126 92 130 92" fill="none" stroke="#f4f8ff" stroke-width="7" stroke-linecap="round"/>
      ${sparkle(28, 34, 5, '#d4f4ff')}${sparkle(140, 36, 4, '#d4f4ff')}`,

    // 💎 Jackpot Éternel : diamant couronné et rayons
    jackpot: () => sun('#1a1030', '#f2d675') + `
      <path d="M48 30 L60 44 L70 26 L80 42 L90 26 L100 44 L112 30 L108 54 H52Z" fill="${G}" ${ink}/>
      <circle cx="70" cy="26" r="3" fill="#c4161c"/><circle cx="90" cy="26" r="3" fill="#1d4b9a"/><circle cx="80" cy="42" r="3" fill="#11804a"/>
      <path d="M44 66 L60 54 H100 L116 66 L80 126Z" fill="#9fe6ff" ${ink}/>
      <path d="M44 66 H116 M60 54 L70 66 L80 54 L90 66 L100 54 M70 66 L80 126 L90 66" fill="none" ${ink} stroke-width="1.6"/>
      <path d="M48 66 L76 118 L70 66Z" fill="#fff" opacity=".45"/><path d="M90 66 L84 118 L112 66Z" fill="#3fa9d6" opacity=".4"/>
      ${sparkle(30, 70, 8)}${sparkle(132, 80, 7)}${sparkle(122, 34, 5)}${sparkle(36, 116, 5)}`,
    // 🔥 Jeton en feu, lunettes noires, très sûr de lui
    serie: () => sun('#3a1408', '#ffb36b') + `
      <path d="M80 18 C96 38 112 44 108 70 C118 62 120 50 118 42 C132 60 130 96 108 112 C96 122 64 122 52 112 C30 96 28 64 44 46 C44 58 50 66 56 70 C52 48 64 34 80 18Z" fill="#ff7a1a" ${ink}/>
      <path d="M80 44 C90 58 100 62 98 80 C104 76 106 70 106 64 C114 80 110 100 96 108 C88 114 72 114 64 108 C50 98 50 80 58 70 C58 78 62 84 66 86 C64 70 70 56 80 44Z" fill="#ffd23f"/>
      ${chip(80, 92, 22, '#c4161c')}
      <path d="M64 86 H96 L94 92 C92 96 86 96 84 92 L82 88 H78 L76 92 C74 96 68 96 66 92Z" fill="${K}"/>
      <path d="M70 102 Q80 108 92 100" fill="none" ${ink}/>${sparkle(128, 30, 6)}${sparkle(30, 34, 4)}`,

    // ✌️ Deux cartes jumelles qui font le V de la victoire
    doubleur: () => sun('#14304a', '#bfe0ff') + `
      <g transform="translate(56 40) rotate(-12)"><rect width="42" height="60" rx="5" fill="${CR}" ${ink}/><text x="7" y="17" font-family="Georgia,serif" font-weight="700" font-size="15" fill="${K}">A</text><text x="21" y="42" text-anchor="middle" font-size="22" fill="${K}">♠</text></g>
      <g transform="translate(70 36) rotate(12)"><rect width="42" height="60" rx="5" fill="${CR}" ${ink}/><text x="7" y="17" font-family="Georgia,serif" font-weight="700" font-size="15" fill="#c4161c">10</text><text x="21" y="42" text-anchor="middle" font-size="22" fill="#c4161c">♥</text></g>
      ${eye(84, 70, 3.6, 1)}${eye(98, 72, 3.6, 1)}<path d="M84 82 Q92 88 100 82" fill="none" ${ink}/>
      <path d="M100 112 L94 96 C93 92 98 90 100 94 L104 104 L106 90 C107 86 112 87 112 91 L110 108 C116 106 120 110 116 116 C110 124 100 124 100 112Z" fill="#f2c19a" ${ink}/>
      <rect x="40" y="104" width="34" height="20" rx="10" fill="${G}" ${ink}/><text x="57" y="119" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="14" fill="${K}">×2</text>${sparkle(130, 40, 5)}`,

    // 🔮 Boule de cristal qui louche sur ta main
    cristal: () => sun('#2a1450', '#e0c8ff') + `
      <path d="M52 118 H108 L100 104 H60Z" fill="${G}" ${ink}/><rect x="46" y="116" width="68" height="12" rx="4" fill="${BX}" ${ink}/>
      <circle cx="80" cy="66" r="40" fill="#8a5ad8" opacity=".9" ${ink}/>
      <path d="M50 70 C60 50 84 44 102 58 C88 54 72 60 64 74 C60 82 52 82 50 70Z" fill="#c9a8ff" opacity=".7"/>
      <ellipse cx="66" cy="46" rx="10" ry="6" fill="#fff" opacity=".55" transform="rotate(-25 66 46)"/>
      ${eye(70, 70, 5, 2)}${eye(92, 70, 5, -2)}<path d="M72 86 Q82 82 90 88" fill="none" ${ink}/>
      <g transform="translate(70 92) scale(.5)"><rect width="18" height="24" rx="2" fill="#fff" ${ink}/><text x="9" y="17" text-anchor="middle" font-size="12" fill="#c4161c">♦</text></g>
      ${sparkle(128, 32, 6)}${sparkle(30, 40, 5)}${sparkle(124, 100, 4)}`,

    // 💪 Gros bras tatoué qui serre un jeton
    grosbras: () => sun('#3a2010', '#ffd8a8') + `
      <path d="M22 128 C26 104 40 92 58 90 C60 70 66 52 84 44 C100 36 118 42 122 56 C126 70 114 80 100 78 C94 78 90 74 92 68 C84 72 82 82 84 92 C104 92 116 104 118 128Z" fill="#f2b98a" ${ink}/>
      <path d="M58 90 C66 84 76 84 84 92" fill="none" ${ink}/>
      <path d="M44 112 C44 104 54 102 56 110 C58 102 68 104 68 112 C68 120 56 124 56 126 C56 124 44 120 44 112Z" fill="#e8243c" ${ink} stroke-width="1.6"/>
      <rect x="40" y="114" width="32" height="8" rx="2" fill="${CR}" ${ink} stroke-width="1.2"/><text x="56" y="121" text-anchor="middle" font-size="6.5" font-family="Georgia,serif" font-weight="700" fill="${K}">MAMAN</text>
      ${chip(112, 56, 16, '#1f8a4c')}${sparkle(30, 40, 6)}${sparkle(136, 104, 4)}`,

    // 👑 Le Roi Midas : une couronne, tout ce qu'il touche devient or
    midas: () => sun('#2c2412', '#ffe9a8') + `
      <path d="M44 60 L52 26 L66 46 L80 18 L94 46 L108 26 L116 60Z" fill="${G}" ${ink}/>
      <circle cx="80" cy="24" r="4" fill="#e8243c" ${ink} stroke-width="1.5"/><circle cx="52" cy="28" r="3" fill="#4fc3ff"/><circle cx="108" cy="28" r="3" fill="#4fc3ff"/>
      <rect x="42" y="58" width="76" height="12" rx="3" fill="${G2}" ${ink}/>
      <circle cx="80" cy="96" r="26" fill="#f6cd52" ${ink}/>
      ${eye(70, 92, 4, 0)}${eye(90, 92, 4, 0)}<path d="M68 104 Q80 114 92 104" fill="none" ${ink}/>
      <path d="M62 84 L74 88 M98 84 L86 88" ${ink}/>
      ${chip(30, 112, 12, G)}${chip(132, 108, 12, G)}${sparkle(130, 40, 7)}${sparkle(28, 44, 5)}${sparkle(116, 130, 4)}`,
    // 🧳 Touriste : valise pleine d'autocollants, appareil photo
    touriste: () => sun('#0f3a4a', '#bfeaff') + `
      <rect x="40" y="54" width="80" height="58" rx="8" fill="#c98a3c" ${ink}/><path d="M66 54 V44 H94 V54" fill="none" ${ink} stroke-width="4"/>
      <rect x="40" y="76" width="80" height="6" fill="#8a5a24"/>
      <circle cx="58" cy="66" r="8" fill="#e8243c" ${ink} stroke-width="1.5"/><rect x="88" y="88" width="20" height="14" rx="3" fill="#4fc3ff" ${ink} stroke-width="1.5"/>
      <path d="M72 92 L80 84 L88 92 L80 100Z" fill="#ffd23f" ${ink} stroke-width="1.5"/>
      ${eye(70, 64, 3.5, 1)}${eye(84, 64, 3.5, 1)}<path d="M70 72 Q77 77 86 71" fill="none" ${ink}/>
      <rect x="104" y="28" width="30" height="20" rx="4" fill="${K}" ${ink}/><circle cx="119" cy="38" r="6" fill="#4fc3ff" ${ink} stroke-width="1.5"/>${sparkle(30, 34, 6)}`,

    // ☕ Habitué : tasse fumante avec un béret, toujours à la même table
    habitue: () => sun('#2e1f14', '#ffd9a8') + `
      <path d="M52 62 H108 L102 116 C100 124 60 124 58 116Z" fill="${CR}" ${ink}/><path d="M108 74 C124 74 124 98 104 98" fill="none" ${ink} stroke-width="4"/>
      <ellipse cx="80" cy="62" rx="28" ry="6" fill="#6b3a1c" ${ink}/>
      <path d="M68 50 C62 40 74 36 68 26 M82 50 C76 40 88 36 82 26 M96 50 C90 40 102 36 96 26" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>
      <ellipse cx="80" cy="22" rx="20" ry="7" fill="${BX}" ${ink}/><circle cx="80" cy="14" r="3" fill="${BX}" ${ink}/>
      ${eye(70, 86, 3.6, 0)}${eye(90, 86, 3.6, 0)}<path d="M70 98 Q80 104 90 98" fill="none" ${ink}/>${sparkle(130, 40, 5)}`,

    // 🛒 Marchand : charrette pleine de cartes
    marchand: () => sun('#1f3a1f', '#d4f5c0') + `
      <path d="M30 60 H126 L116 100 H44Z" fill="#c98a3c" ${ink}/><circle cx="56" cy="110" r="10" fill="#6b3a1c" ${ink}/><circle cx="104" cy="110" r="10" fill="#6b3a1c" ${ink}/>
      ${[0, 1, 2].map(i => `<g transform="translate(${50 + i * 22} ${34 - (i % 2) * 6}) rotate(${-12 + i * 12})"><rect width="22" height="30" rx="3" fill="${CR}" ${ink} stroke-width="1.6"/><text x="11" y="21" text-anchor="middle" font-size="14" fill="${i === 1 ? '#c4161c' : K}">${['♠', '♥', '♣'][i]}</text></g>`).join('')}
      ${eye(70, 78, 3.5, 1)}${eye(90, 78, 3.5, 1)}<path d="M72 88 Q80 94 88 88" fill="none" ${ink}/>
      <path d="M126 60 L140 44" ${ink} stroke-width="4"/>${sparkle(30, 34, 5)}`,

    // 🎰 Collectionneur de 7 : un album rempli de 7
    collect7: () => sun('#3a0f18', '#ffc0c8') + `
      <rect x="34" y="30" width="92" height="84" rx="8" fill="#6b1e2e" ${ink}/><rect x="42" y="38" width="76" height="68" rx="4" fill="${CR}" ${ink} stroke-width="1.6"/>
      ${[[50, 44], [74, 44], [98, 44], [50, 74], [74, 74], [98, 74]].map(([x, y], i) => `<text x="${x + 10}" y="${y + 24}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="24" fill="${i % 2 ? '#c4161c' : '#d4a017'}" stroke="${K}" stroke-width="1">7</text>`).join('')}
      ${sparkle(132, 30, 7)}${sparkle(26, 110, 5)}`,

    // 🟩 Tapis Vert : un jeton qui sprinte sur le tapis
    tapis: () => sun('#0d3a2a', '#b9f5cf') + `
      <path d="M14 112 L146 112 L132 128 L28 128Z" fill="#1c7a4a" ${ink}/>
      ${chip(84, 74, 26, '#1f8a4c')}
      ${eye(76, 70, 4, 2)}${eye(92, 70, 4, 2)}<path d="M76 84 Q86 90 96 82" fill="none" ${ink}/>
      <path d="M22 60 H48 M14 74 H44 M22 88 H48" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>
      <path d="M100 98 L112 112 M68 98 L58 112" ${ink} stroke-width="4"/>${sparkle(130, 34, 6)}`,

    // 🖋️ Faussaire : plume qui recopie un ticket
    faussaire: () => sun('#2a2140', '#e0d4ff') + `
      <g transform="translate(36 46) rotate(-8)"><rect width="48" height="62" rx="4" fill="${CR}" ${ink}/><path d="M8 14 H40 M8 24 H34 M8 34 H40" stroke="${K}" stroke-width="2"/><circle cx="24" cy="48" r="7" fill="${G}" ${ink} stroke-width="1.5"/></g>
      <g transform="translate(78 42) rotate(8)"><rect width="48" height="62" rx="4" fill="${CR}" ${ink} stroke-dasharray="4 3"/><path d="M8 14 H40 M8 24 H34" stroke="${K}" stroke-width="2" opacity=".5"/></g>
      <path d="M118 20 C140 30 132 58 112 70 L104 74 L108 66 C116 50 120 36 118 20Z" fill="#f3e9d2" ${ink}/><path d="M104 74 L98 90" ${ink} stroke-width="3"/>
      ${eye(52, 70, 3.2, 1)}${eye(64, 70, 3.2, 1)}<path d="M52 80 Q58 84 64 80" fill="none" ${ink}/>${sparkle(28, 30, 5)}`,

    // 📒 Carnet de Dettes : un carnet avec des lunettes
    carnet: () => sun('#2c2412', '#ffe9a8') + `
      <rect x="44" y="26" width="72" height="92" rx="6" fill="#d4a017" ${ink}/><rect x="44" y="26" width="12" height="92" fill="#8a6418" ${ink}/>
      <rect x="64" y="40" width="44" height="16" rx="3" fill="${CR}" ${ink} stroke-width="1.5"/><text x="86" y="52" text-anchor="middle" font-size="10" font-family="Georgia,serif" font-weight="700" fill="${K}">DETTES</text>
      <circle cx="74" cy="78" r="10" fill="#fff" ${ink}/><circle cx="98" cy="78" r="10" fill="#fff" ${ink}/><path d="M84 78 H88" ${ink}/>
      <circle cx="75" cy="79" r="3.5" fill="${K}"/><circle cx="99" cy="79" r="3.5" fill="${K}"/><path d="M76 100 Q86 94 96 100" fill="none" ${ink}/>${sparkle(130, 30, 6)}`,

    // 🍾 Croupier Ivre : nœud papillon de travers, bouteille
    ivre: () => sun('#20303c', '#d8f0ff') + `
      <circle cx="72" cy="66" r="30" fill="#f2c19a" ${ink}/><path d="M42 58 C46 34 98 34 102 58 C88 50 56 50 42 58Z" fill="${K}"/>
      <path d="M58 64 L68 68 M86 68 L76 64" ${ink}/><path d="M60 82 Q72 76 84 84" fill="none" ${ink}/>
      <ellipse cx="62" cy="76" rx="5" ry="3" fill="#ff8fa3" opacity=".7"/><ellipse cx="84" cy="76" rx="5" ry="3" fill="#ff8fa3" opacity=".7"/>
      <g transform="translate(72 104) rotate(14)"><path d="M0 0 L-14 -8 L-14 8Z M0 0 L14 -8 L14 8Z" fill="${BX}" ${ink}/></g>
      <path d="M118 40 H126 V54 C134 60 134 70 134 76 V120 H110 V76 C110 70 110 60 118 54Z" fill="#2e7d32" ${ink}/><rect x="114" y="84" width="16" height="14" fill="${G2}" ${ink} stroke-width="1"/>
      <circle cx="40" cy="36" r="4" fill="#fff" opacity=".6"/><circle cx="32" cy="48" r="3" fill="#fff" opacity=".5"/>`,

    // ⚗️ Fusion : alambic qui fusionne des % en ×
    fusion: () => sun('#1a1030', '#e0c8ff') + `
      <path d="M64 30 H96 V54 L120 108 C124 118 118 124 108 124 H52 C42 124 36 118 40 108 L64 54Z" fill="#b48cff" opacity=".85" ${ink}/>
      <path d="M48 96 H112 L120 108 C124 118 118 124 108 124 H52 C42 124 36 118 40 108Z" fill="#7a3ad8" ${ink}/>
      <text x="58" y="88" font-family="Georgia,serif" font-weight="700" font-size="18" fill="#fff" stroke="${K}" stroke-width=".8">%</text>
      <text x="88" y="118" font-family="Georgia,serif" font-weight="700" font-size="22" fill="${G2}" stroke="${K}" stroke-width=".8">×</text>
      <circle cx="74" cy="70" r="4" fill="#fff" opacity=".6"/><circle cx="90" cy="60" r="3" fill="#fff" opacity=".6"/>
      ${eye(72, 106, 3.4, 1)}${eye(88, 106, 3.4, 1)}${sparkle(130, 30, 7)}${sparkle(28, 40, 5)}`,

    // 🔫 Roulette Russe : barillet et goutte de sueur
    russe: () => sun('#3a0a1a', '#ffb3c6') + `
      <circle cx="80" cy="74" r="38" fill="#8a8f99" ${ink}/>
      ${[0, 60, 120, 180, 240, 300].map(a => { const x = 80 + 22 * Math.cos(a * Math.PI / 180), y = 74 + 22 * Math.sin(a * Math.PI / 180); return `<circle cx="${x}" cy="${y}" r="8" fill="${a === 0 ? '#d4a017' : K}" ${ink} stroke-width="1.5"/>`; }).join('')}
      <circle cx="80" cy="74" r="7" fill="#5a5f69" ${ink} stroke-width="1.5"/>
      <path d="M124 40 C120 52 128 56 124 64 C118 58 118 50 124 40Z" fill="#7fd0ff" ${ink} stroke-width="1.5"/>${sparkle(28, 30, 6)}`,
  };

  const cache = {};
  return {
    has: id => !!ART[id],
    svg(id) {
      if (!ART[id]) return '';
      if (!cache[id]) cache[id] = `<svg viewBox="0 0 160 140" aria-hidden="true" preserveAspectRatio="xMidYMid slice">${ART[id]()}</svg>`;
      return cache[id];
    },
  };
})();

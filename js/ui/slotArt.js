// Symboles originaux de la machine « Les Chats des Toits » (SVG 80 × 80, style cartoon :
// gros contours, couleurs vives, reflets). Les identifiants restent ceux du moteur.
const SlotArt = (() => {
  const K = '#2a1a10';                       // contour
  const ink = (w = 3) => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

  // Lettres bombées (symboles bas) : remplissage dégradé, gros contour, reflet blanc
  const letter = (txt, c1, c2) => {
    const fs = txt.length > 1 ? 40 : 54, y = txt.length > 1 ? 56 : 60;
    return `
    <defs><linearGradient id="lg-${txt}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <text x="40" y="${y + 3}" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="${fs}" fill="${K}">${txt}</text>
    <text x="40" y="${y}" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="${fs}" fill="url(#lg-${txt})" stroke="${K}" stroke-width="4" paint-order="stroke">${txt}</text>
    <text x="40" y="${y}" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="${fs}" fill="none" stroke="#fff" stroke-width="1.2" opacity=".55" transform="translate(-1.2 -1.6)">${txt}</text>`;
  };

  // Tête de chat cartoon : joues en touffes, grands yeux brillants, museau, rougeurs
  function cat({ fur, fur2, ear, eye, muzzle = '#fff8ee', extra = '', top = '', under = '', stripes = '', eyes = null, mouth = null }) {
    return `
      ${under}
      <path d="M14 36 L12 6 L36 20 Z M66 36 L68 6 L44 20 Z" fill="${fur}" ${ink()}/>
      <path d="M18 28 L17 13 L30 21Z M62 28 L63 13 L50 21Z" fill="${ear}"/>
      <path d="M40 16 C60 16 72 28 72 44 C72 50 76 54 72 58 C70 68 58 76 40 76 C22 76 10 68 8 58 C4 54 8 50 8 44 C8 28 20 16 40 16Z" fill="${fur}" ${ink()}/>
      <path d="M40 18 C56 18 66 26 69 38 C60 30 50 27 40 27 C30 27 20 30 11 38 C14 26 24 18 40 18Z" fill="${fur2}" opacity=".55"/>
      ${stripes}
      ${eyes != null ? eyes : `<ellipse cx="29" cy="44" rx="8.5" ry="9.5" fill="#fff" ${ink(2.5)}/><ellipse cx="51" cy="44" rx="8.5" ry="9.5" fill="#fff" ${ink(2.5)}/>
      <ellipse cx="30" cy="45" rx="6" ry="7.5" fill="${eye}"/><ellipse cx="50" cy="45" rx="6" ry="7.5" fill="${eye}"/>
      <ellipse cx="30" cy="46" rx="2.6" ry="5.5" fill="${K}"/><ellipse cx="50" cy="46" rx="2.6" ry="5.5" fill="${K}"/>
      <circle cx="27.5" cy="41" r="2.6" fill="#fff"/><circle cx="47.5" cy="41" r="2.6" fill="#fff"/>`}
      <ellipse cx="18" cy="56" rx="5" ry="3" fill="#ff8fa3" opacity=".55"/><ellipse cx="62" cy="56" rx="5" ry="3" fill="#ff8fa3" opacity=".55"/>
      <path d="M40 54 C32 54 28 60 32 64 C35 67 38 66 40 64 C42 66 45 67 48 64 C52 60 48 54 40 54Z" fill="${muzzle}" ${ink(2)}/>
      <path d="M36.5 55.5 H43.5 L40 59.5Z" fill="#ff6f8f" ${ink(1.6)}/>
      ${mouth != null ? mouth : `<path d="M40 60 V62 M40 62 Q37 65 34.5 63 M40 62 Q43 65 45.5 63" fill="none" ${ink(1.6)}/>`}
      <path d="M6 54 L22 57 M7 61 L22 60 M74 54 L58 57 M73 61 L58 60" stroke="${K}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>
      ${extra}${top}`;
  }

  // ---------- Kit « goofy » des machines à grille : volume, reflets, yeux qui roulent, grandes bouches ----------
  const RG = (id, a, b, c) => `<radialGradient id="${id}" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
  const LG = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const shadow = (w = 24, y = 76) => `<ellipse cx="40" cy="${y}" rx="${w}" ry="3.4" fill="#000" opacity=".3"/>`;
  const shine = (x, y, rx, ry, a = -30, o = 0.75) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${o}" transform="rotate(${a} ${x} ${y})"/>`;
  const spark = (x, y, s = 5, c = '#fff') => `<path d="M${x} ${y - s} Q${x + s * 0.15} ${y - s * 0.15} ${x + s} ${y} Q${x + s * 0.15} ${y + s * 0.15} ${x} ${y + s} Q${x - s * 0.15} ${y + s * 0.15} ${x - s} ${y} Q${x - s * 0.15} ${y - s * 0.15} ${x} ${y - s}Z" fill="${c}"/>`;
  // œil globuleux : la pupille regarde dans la direction (dx, dy)
  const eye = (x, y, r, dx = 0, dy = 0, pupil = 0.5) => {
    const px = x + dx * r * 0.42, py = y + dy * r * 0.42;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${ink(2.4)}/><circle cx="${px}" cy="${py}" r="${r * pupil}" fill="${K}"/><circle cx="${px - r * 0.18}" cy="${py - r * 0.2}" r="${r * 0.17}" fill="#fff"/>`;
  };
  const shut = (x, y, w = 5) => `<path d="M${x - w} ${y} Q${x} ${y + w * 0.9} ${x + w} ${y}" fill="none" ${ink(2.6)}/>`;   // œil fermé (heureux)
  const happy = (x, y, w = 5) => `<path d="M${x - w} ${y + 2} Q${x} ${y - w * 0.9} ${x + w} ${y + 2}" fill="none" ${ink(2.8)}/>`; // ^ ^
  const spiral = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${ink(2.4)}/><path d="M${x} ${y} m-1.5 0 a1.5 1.5 0 1 1 3 0 a3.2 3.2 0 1 1 -6.4 0 a4.9 4.9 0 1 1 9.8 0" fill="none" stroke="${K}" stroke-width="1.6"/>`;
  // grande bouche ouverte : dents en haut, langue en bas
  const grin = (x, y, w, tongue = true) => `
      <path d="M${x - w} ${y} Q${x} ${y + w * 1.5} ${x + w} ${y} Z" fill="#6a1426" ${ink(2.4)}/>
      ${tongue ? `<path d="M${x - w * 0.5} ${y + w * 0.62} Q${x} ${y + w * 0.3} ${x + w * 0.5} ${y + w * 0.62} Q${x} ${y + w * 0.82} ${x - w * 0.5} ${y + w * 0.62}Z" fill="#ff6f8f"/>` : ''}
      <path d="M${x - w * 0.72} ${y + 0.8} H${x + w * 0.72} L${x + w * 0.62} ${y + w * 0.26} H${x - w * 0.62}Z" fill="#fff"/>`;
  const smile = (x, y, w = 5) => `<path d="M${x - w} ${y} Q${x} ${y + w} ${x + w} ${y}" fill="none" ${ink(2.4)}/>`;
  const ooh = (x, y, r = 4) => `<ellipse cx="${x}" cy="${y}" rx="${r * 0.8}" ry="${r}" fill="#6a1426" ${ink(2.2)}/>`;
  const blush = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="#ff6f8f" opacity=".6"/>`;
  const ribbon = (txt, c, size = 13) => `
      <rect x="5" y="60" width="70" height="17" rx="8.5" fill="${c}" ${ink(2.6)}/>
      <rect x="9" y="62" width="62" height="5" rx="2.5" fill="#fff" opacity=".35"/>
      <text x="40" y="73" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="${size}" fill="#fff" stroke="${K}" stroke-width="3" paint-order="stroke" letter-spacing="1">${txt}</text>`;
  // Fiole de potion avec une tête
  const flask = (n, c1, c2, c3, face) => `
      <defs>${RG('gf' + n, c1, c2, c3)}<clipPath id="cf${n}"><path d="M34 18 V30 C20 34 11 44 11 55 C11 67 23 75 40 75 C57 75 69 67 69 55 C69 44 60 34 46 30 V18Z"/></clipPath></defs>
      ${shadow(22, 77)}
      <path d="M34 18 V30 C20 34 11 44 11 55 C11 67 23 75 40 75 C57 75 69 67 69 55 C69 44 60 34 46 30 V18Z" fill="#e8f4ff" fill-opacity=".9"/>
      <g clip-path="url(#cf${n})"><rect x="0" y="40" width="80" height="40" fill="url(#gf${n})"/><path d="M0 42 Q20 36 40 42 T80 42 V48 H0Z" fill="#fff" opacity=".35"/></g>
      <path d="M34 18 V30 C20 34 11 44 11 55 C11 67 23 75 40 75 C57 75 69 67 69 55 C69 44 60 34 46 30 V18Z" fill="none" ${ink(3)}/>
      <rect x="30" y="8" width="20" height="12" rx="4" fill="#c4874a" ${ink(2.6)}/><rect x="33" y="10" width="7" height="3" rx="1.5" fill="#fff" opacity=".4"/>
      <circle cx="56" cy="8" r="3.5" fill="${c2}" ${ink(1.6)}/><circle cx="63" cy="2.5" r="2" fill="${c2}" ${ink(1.2)}/>
      ${shine(22, 46, 4, 9, 25, 0.8)}
      ${face}`;

  // Lettre bombée avec deux yeux posés dessus et une petite bouche
  const goofyLetter = (txt, c1, c2, eyesAt) => {
    const id = 'lgm' + txt, fs = txt.length > 1 ? 50 : 64;
    return `<defs>${LG(id, c1, c2)}</defs>${shadow(22)}
      <text x="40" y="76" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="${fs}" fill="${K}">${txt}</text>
      <text x="40" y="72" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="${fs}" fill="url(#${id})" stroke="${K}" stroke-width="4.5" paint-order="stroke">${txt}</text>
      <text x="40" y="72" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="${fs}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".6" transform="translate(-1.5 -2)">${txt}</text>
      ${eyesAt.map(([x, dx, dy]) => eye(x, 23, 9, dx, dy)).join('')}
      ${spark(70, 22, 5)}`;
  };

  const ART = {
    dix: () => letter('10', '#9ff0c0', '#14a05a'),
    valet: () => letter('V', '#a8d4ff', '#2a6fd6'),
    dame: () => letter('D', '#f0c4ff', '#8a3ad6'),
    roi: () => letter('R', '#ffc49a', '#e0601c'),
    as: () => letter('A', '#ffb0b8', '#d61c3a'),
    cerise: () => `
      <path d="M44 10 C38 24 28 34 24 48 M44 10 C48 26 52 36 56 48" fill="none" stroke="#3f7d20" stroke-width="4" stroke-linecap="round"/>
      <path d="M44 10 C52 2 66 4 68 13 C58 18 50 16 44 10Z" fill="#6cc04a" ${ink(2.5)}/>
      <circle cx="24" cy="56" r="15" fill="#e8243c" ${ink()}/><circle cx="56" cy="56" r="15" fill="#e8243c" ${ink()}/>
      <ellipse cx="18" cy="50" rx="5" ry="3.5" fill="#fff" opacity=".8" transform="rotate(-30 18 50)"/>
      <ellipse cx="50" cy="50" rx="5" ry="3.5" fill="#fff" opacity=".8" transform="rotate(-30 50 50)"/>`,
    sept: () => `
      <path d="M14 16 H68 L44 74 H24 L44 32 H14Z" transform="translate(0 3)" fill="${K}"/>
      <path d="M14 14 H68 L44 72 H24 L44 30 H14Z" fill="#ff3b30" stroke="#ffd23f" stroke-width="5" stroke-linejoin="round"/>
      <path d="M14 14 H68 L44 72 H24 L44 30 H14Z" fill="none" ${ink(2.5)}/>
      <path d="M19 18 H60 L58 22 H19Z" fill="#fff" opacity=".55"/>`,
    // Le matou tigré, écharpe rouge
    tigre: () => cat({ fur: '#f5952f', fur2: '#ffd08a', ear: '#ffc2a8', eye: '#7ed957',
      stripes: `<path d="M40 18 V28 M31 19 L33 28 M49 19 L47 28 M9 46 H17 M63 46 H71 M10 52 H17 M63 52 H70" stroke="#a8520f" stroke-width="3.5" stroke-linecap="round"/>`,
      extra: `<path d="M16 70 C28 78 52 78 64 70 L66 76 C52 82 28 82 14 76Z" fill="#e8243c" ${ink(2.5)}/><path d="M56 74 L62 80 L52 80Z" fill="#e8243c" ${ink(2)}/>` }),
    // Le persan tout blanc, diadème
    persan: () => cat({ fur: '#fbf7f2', fur2: '#ffffff', ear: '#ffc4d4', eye: '#f2a23a',
      under: `<path d="M8 50 C2 58 8 70 18 72 M72 50 C78 58 72 70 62 72" fill="#fbf7f2" ${ink(2.5)}/>`,
      top: `<path d="M24 22 L28 8 L35 17 L40 3 L45 17 L52 8 L56 22Z" fill="#ffd23f" ${ink(2.5)}/><circle cx="40" cy="11" r="3" fill="#4fc3ff" ${ink(1.5)}/><circle cx="29" cy="14" r="2" fill="#ff5c8a"/><circle cx="51" cy="14" r="2" fill="#ff5c8a"/>` }),
    // Le siamois, nœud papillon
    siamois: () => cat({ fur: '#f3e3c6', fur2: '#fff4dd', ear: '#5a3a26', eye: '#3fb4ff', muzzle: '#8a5a3c',
      extra: `<path d="M40 74 L28 68 L28 80Z M40 74 L52 68 L52 80Z" fill="#2a6fd6" ${ink(2.5)}/><circle cx="40" cy="74" r="4" fill="#5aa0ff" ${ink(2)}/>` }),
    // Le chat noir porte-bonheur, grelot doré
    chatnoir: () => cat({ fur: '#26222e', fur2: '#4a4458', ear: '#c46a8a', eye: '#b6f23a', muzzle: '#3a3444',
      extra: `<path d="M18 70 C30 76 50 76 62 70" fill="none" stroke="#e8243c" stroke-width="5" stroke-linecap="round"/><path d="M18 70 C30 76 50 76 62 70" fill="none" ${ink(1.5)}/>
        <circle cx="40" cy="76" r="5.5" fill="#ffd23f" ${ink(2)}/><path d="M37 77 H43" stroke="${K}" stroke-width="1.5"/><circle cx="38.5" cy="74.5" r="1.5" fill="#fff"/>` }),
    // WILD : un carton d'où un chat pointe le bout de ses oreilles
    palace: () => `
      <rect x="2" y="2" width="76" height="76" rx="14" fill="#5b2ab8" ${ink()}/>
      <rect x="6" y="6" width="68" height="34" rx="10" fill="#7a46e0" opacity=".7"/>
      <path d="M28 30 L26 16 L36 24Z M52 30 L54 16 L44 24Z" fill="#f5952f" ${ink(2.5)}/>
      <ellipse cx="40" cy="34" rx="15" ry="9" fill="#f5952f" ${ink(2.5)}/>
      <circle cx="34" cy="33" r="3.2" fill="#fff" ${ink(1.5)}/><circle cx="46" cy="33" r="3.2" fill="#fff" ${ink(1.5)}/>
      <circle cx="34.5" cy="33.5" r="1.6" fill="${K}"/><circle cx="46.5" cy="33.5" r="1.6" fill="${K}"/>
      <path d="M12 38 L22 30 H58 L68 38Z" fill="#b97a3f" ${ink(2.5)}/>
      <path d="M12 38 L4 30 L16 26 L22 30Z M68 38 L76 30 L64 26 L58 30Z" fill="#d89a5c" ${ink(2.5)}/>
      <rect x="12" y="38" width="56" height="34" rx="2" fill="#d89a5c" ${ink()}/>
      <path d="M40 38 V50" stroke="#a86a32" stroke-width="3"/>
      <text x="40" y="66" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="17" fill="#fff" stroke="${K}" stroke-width="3.5" paint-order="stroke" letter-spacing="1">WILD</text>`,
    // SCATTER : la pelote de laine
    pelote: () => `
      <path d="M58 58 C70 62 74 70 68 78" fill="none" stroke="#ff4f9a" stroke-width="4" stroke-linecap="round"/>
      <circle cx="40" cy="36" r="29" fill="#ff5ca8" ${ink()}/>
      <path d="M15 26 C30 34 52 20 67 30 M12 40 C30 48 54 34 69 44 M20 58 C34 56 52 52 64 48 M30 9 C22 28 26 52 38 64 M52 9 C60 28 58 50 46 64" fill="none" stroke="#c4246e" stroke-width="2.6"/>
      <ellipse cx="28" cy="20" rx="8" ry="5" fill="#fff" opacity=".55" transform="rotate(-30 28 20)"/>
      <rect x="6" y="58" width="68" height="18" rx="9" fill="#ffd23f" ${ink(2.5)}/>
      <text x="40" y="72" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="14" fill="#fff" stroke="${K}" stroke-width="3" paint-order="stroke" letter-spacing="1">BONUS</text>`,
    diamant: () => `
      <path d="M10 30 L24 14 H56 L70 30 L40 72Z" fill="#5fd8ff" ${ink()}/>
      <path d="M10 30 H70 M24 14 L32 30 L40 14 L48 30 L56 14 M32 30 L40 72 L48 30" fill="none" ${ink(2)}/>
      <path d="M14 30 L36 66 L32 30Z" fill="#fff" opacity=".55"/><path d="M26 17 L31 27 L36 17Z" fill="#fff" opacity=".7"/>`,
    // ===== Confiserie Céleste (bonbons à tête) =====
    meringue: () => `<defs>${RG('gmer', '#ffffff', '#fff3dc', '#e8c48e')}</defs>${shadow(22)}
      <path d="M40 6 C45 18 60 22 64 38 C68 56 57 72 40 72 C23 72 12 56 16 38 C20 22 35 18 40 6Z" fill="url(#gmer)" ${ink(3)}/>
      <path d="M22 42 C30 48 50 48 58 40 M29 26 C35 31 46 31 51 25" fill="none" stroke="#e2bf8a" stroke-width="3" stroke-linecap="round"/>
      ${shut(31, 51, 5)}${shut(49, 51, 5)}${smile(40, 59, 4)}${blush(24, 58)}${blush(56, 58)}
      ${shine(31, 20, 4, 7, 20)}${spark(64, 14, 5)}`,
    dragee: () => `<defs>${RG('gdra', '#d9f1ff', '#5fb8ff', '#2160c4')}</defs>${shadow(24)}
      <ellipse cx="40" cy="44" rx="30" ry="26" fill="url(#gdra)" ${ink(3)} transform="rotate(-12 40 44)"/>
      ${shine(25, 27, 9, 5, -30)}
      ${eye(30, 40, 8, -0.9, -0.6)}${eye(51, 37, 9.5, 0.8, 0.8, 0.45)}
      ${grin(41, 54, 10)}${spark(68, 18, 6)}`,
    caramel: () => `<defs>${LG('gcwr', '#fff2a8', '#e0a020')}${RG('gcar', '#ffd08a', '#ec8a24', '#a5480c')}</defs>${shadow(26)}
      <path d="M20 42 L3 26 L8 42 L3 58Z M60 42 L77 26 L72 42 L77 58Z" fill="url(#gcwr)" ${ink(2.6)}/>
      <path d="M7 34 L15 40 M7 50 L15 44 M73 34 L65 40 M73 50 L65 44" stroke="#c88a12" stroke-width="2"/>
      <ellipse cx="40" cy="42" rx="23" ry="21" fill="url(#gcar)" ${ink(3)}/>
      ${shine(31, 28, 7, 4, -25)}
      ${shut(32, 39, 4.5)}${eye(48, 37, 7, 0.4, 0.2)}
      ${grin(40, 49, 9)}`,
    reglisse: () => `<defs>${RG('greg', '#6a5a78', '#2b2236', '#120d18')}</defs>${shadow(26)}
      <circle cx="40" cy="42" r="31" fill="url(#greg)" ${ink(3)}/>
      <circle cx="40" cy="42" r="24" fill="none" stroke="#5a4c66" stroke-width="3"/><circle cx="40" cy="42" r="17" fill="none" stroke="#5a4c66" stroke-width="3"/>
      ${spiral(29, 36, 8)}${spiral(51, 36, 8)}
      ${grin(40, 51, 11)}
      ${shine(24, 22, 8, 4, -35, 0.45)}${spark(70, 14, 5, '#ff9ad0')}`,
    berlingot: () => `<defs><clipPath id="cpb2"><path d="M40 5 L74 66 H6Z"/></clipPath>${LG('gber', '#fff27a', '#ffb020')}</defs>${shadow(28)}
      <path d="M40 5 L74 66 H6Z" fill="url(#gber)" stroke-linejoin="round"/>
      <g clip-path="url(#cpb2)"><path d="M10 74 L44 2 M30 76 L62 10 M50 78 L78 22" stroke="#ff4f6d" stroke-width="7"/></g>
      <path d="M40 5 L74 66 H6Z" fill="none" ${ink(3)}/>
      ${eye(33, 43, 7, 0.8, 0)}${eye(48, 43, 7, -0.8, 0)}
      <path d="M31 55 Q40 61 49 55" fill="none" ${ink(2.6)}/><rect x="35.5" y="56.5" width="4" height="6" rx="1" fill="#fff" ${ink(1.6)}/><rect x="40.5" y="56.5" width="4" height="6" rx="1" fill="#fff" ${ink(1.6)}/>
      ${shine(32, 22, 3, 8, 30)}`,
    guimauve: () => `<defs>${RG('ggui', '#ffe6f2', '#ff9cc8', '#e0508e')}</defs>${shadow(26)}
      <rect x="12" y="18" width="56" height="54" rx="20" fill="url(#ggui)" ${ink(3)}/>
      <ellipse cx="40" cy="24" rx="22" ry="6" fill="#fff" opacity=".45"/>
      ${happy(30, 42, 5)}${happy(50, 42, 5)}${grin(40, 51, 13)}
      ${blush(20, 52)}${blush(60, 52)}
      <path d="M18 30 L22 28 M60 32 L64 29 M24 64 L28 66" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      ${spark(70, 12, 5)}`,
    macaron: () => `<defs>${RG('gma1', '#ffd6ea', '#ff7ab8', '#c4246e')}${RG('gma2', '#e2d0ff', '#9c6bff', '#5a2ac4')}</defs>${shadow(28)}
      <ellipse cx="40" cy="58" rx="30" ry="12" fill="url(#gma2)" ${ink(3)}/>
      <rect x="12" y="46" width="56" height="10" rx="5" fill="#fff6dc" ${ink(2.4)}/>
      <path d="M14 49 Q20 54 26 49 Q32 54 38 49 Q44 54 50 49 Q56 54 62 49 Q66 52 67 50" fill="none" stroke="#f0d49a" stroke-width="2"/>
      <ellipse cx="40" cy="36" rx="30" ry="17" fill="url(#gma1)" ${ink(3)}/>
      <path d="M24 22 L22 10 L31 16 L40 6 L49 16 L58 10 L56 22Z" fill="#ffd23f" ${ink(2.4)}/><circle cx="40" cy="12" r="2.5" fill="#ff4f6d"/>
      ${eye(30, 34, 7, 0.5, 0.4)}${eye(50, 34, 7, 0.5, 0.4)}${smile(40, 42, 6)}
      ${shine(24, 30, 6, 3, -20)}${spark(9, 20, 6)}${spark(72, 30, 5)}`,
    montgolfiere: () => `<defs><clipPath id="cpm2"><path d="M40 3 C61 3 71 17 69 31 C67 44 51 51 47 57 H33 C29 51 13 44 11 31 C9 17 19 3 40 3Z"/></clipPath>${RG('gmo', '#ffd6ea', '#ff5ca8', '#b0186a')}</defs>
      <path d="M40 3 C61 3 71 17 69 31 C67 44 51 51 47 57 H33 C29 51 13 44 11 31 C9 17 19 3 40 3Z" fill="url(#gmo)"/>
      <g clip-path="url(#cpm2)"><path d="M24 0 V60 M56 0 V60" stroke="#ffe36b" stroke-width="9" opacity=".9"/></g>
      <path d="M40 3 C61 3 71 17 69 31 C67 44 51 51 47 57 H33 C29 51 13 44 11 31 C9 17 19 3 40 3Z" fill="none" ${ink(3)}/>
      ${eye(31, 26, 7.5, 0.3, 0.5)}${eye(49, 26, 7.5, -0.3, 0.5)}${grin(40, 36, 9)}
      ${shine(22, 14, 6, 3.5, -35)}
      <path d="M33 57 L35 62 M47 57 L45 62" stroke="${K}" stroke-width="2"/>
      ${ribbon('BONUS', '#7c4dff')}${spark(7, 10, 6)}${spark(74, 46, 5)}`,
    bulle: () => `<defs>${RG('gbu', '#ffffff', '#e2b6ff', '#8a3ad6')}</defs>
      <circle cx="40" cy="40" r="34" fill="url(#gbu)" fill-opacity=".85" ${ink(3)}/>
      <circle cx="40" cy="40" r="28" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>
      ${shine(27, 22, 11, 6, -35, 0.85)}${spark(60, 58, 5)}`,

    // ===== Chats Mousquetaires =====
    epee: () => `
      <path d="M70 6 L66 6 L26 46 L34 54 L74 14 L74 10Z" fill="#e9eff8" ${ink(3)}/>
      <path d="M70 9 L32 47" stroke="#b8c4d6" stroke-width="2"/>
      <path d="M12 40 C14 26 34 24 40 40 C44 50 36 60 26 62 C30 54 28 46 20 44Z" fill="#ffcf4a" ${ink(3)}/>
      <path d="M28 52 L12 68" stroke="${K}" stroke-width="11" stroke-linecap="round"/>
      <path d="M28 52 L12 68" stroke="#8a4a1c" stroke-width="6" stroke-linecap="round"/>
      <circle cx="10" cy="70" r="6" fill="#ffcf4a" ${ink(2.5)}/>`,
    // matou tigré borgne, une rapière entre les dents
    rapiere: () => cat({ fur: '#ff9d3a', fur2: '#ffd9a0', ear: '#ffb3c0', eye: '#6be36b',
      stripes: `<path d="M34 18 L36 26 M40 17 V26 M46 18 L44 26 M10 46 L18 47 M70 46 L62 47" stroke="#c4560c" stroke-width="3" stroke-linecap="round"/>`,
      eyes: `${eye(51, 44, 9, -0.6, 0.3)}<ellipse cx="29" cy="44" rx="10" ry="9" fill="${K}"/><path d="M14 30 L44 36" stroke="${K}" stroke-width="2.5"/><path d="M24 38 L34 50" stroke="#c4560c" stroke-width="2"/>`,
      mouth: `<path d="M33 63 Q40 68 47 63" fill="none" ${ink(2)}/>`,
      extra: `<path d="M2 66 L64 58" stroke="${K}" stroke-width="8" stroke-linecap="round"/><path d="M2 66 L64 58" stroke="#e9eff8" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M60 50 C70 50 74 58 70 66 C64 62 60 60 58 58Z" fill="#ffcf4a" ${ink(2.4)}/><path d="M66 60 L76 58" stroke="#8a4a1c" stroke-width="5" stroke-linecap="round"/>` }),
    // chat au grand chapeau à plume, yeux qui louchent et moustache en croc
    chapeau: () => cat({ fur: '#e8dcc6', fur2: '#fff8ea', ear: '#ff9db0', eye: '#4fb6ff',
      eyes: `${eye(29, 44, 9.5, 0.7, -0.3)}${eye(51, 44, 9.5, -0.7, 0.4, 0.42)}`,
      mouth: `${grin(40, 61, 7)}<path d="M40 60 C34 56 26 58 24 64 C28 61 33 61 36 63 M40 60 C46 56 54 58 56 64 C52 61 47 61 44 63" fill="#6b4a2a" ${ink(1.6)}/>`,
      top: `<path d="M3 28 C18 16 62 16 77 28 C62 23 18 23 3 28Z" fill="#3a2a6a" ${ink(2.6)}/>
        <path d="M20 23 C20 4 60 4 60 23Z" fill="#4b3a8a" ${ink(2.6)}/>
        <path d="M22 18 H58" stroke="#ffcf4a" stroke-width="4.5"/><circle cx="40" cy="18" r="3" fill="#ff4f6d" ${ink(1.4)}/>
        <path d="M56 16 C66 0 78 -1 80 4 C74 6 68 12 62 21Z" fill="#ff4f6d" ${ink(2.2)}/><path d="M60 16 C66 8 72 5 77 4" fill="none" stroke="#ffb3c0" stroke-width="1.6"/>` }),
    // bourse d'or gourmande : yeux en dollars
    bourse: () => `<defs>${RG('gbo', '#e8a868', '#a5642a', '#5a300c')}</defs>${shadow(28)}
      <path d="M25 24 C13 34 8 50 12 62 C16 74 64 74 68 62 C72 50 67 34 55 24Z" fill="url(#gbo)" ${ink(3)}/>
      <path d="M25 24 C31 19 49 19 55 24 L52 13 C46 16 34 16 28 13Z" fill="#c07a38" ${ink(2.6)}/>
      <path d="M24 26 Q40 33 56 26" fill="none" stroke="#ffcf4a" stroke-width="4.5"/>
      <circle cx="29" cy="45" r="8.5" fill="#fff" ${ink(2.4)}/><circle cx="51" cy="45" r="8.5" fill="#fff" ${ink(2.4)}/>
      <text x="29" y="50.5" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="14" fill="#14a05a">$</text><text x="51" y="50.5" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="14" fill="#14a05a">$</text>
      ${grin(40, 57, 11)}
      <circle cx="68" cy="68" r="8" fill="#ffcf4a" ${ink(2.4)}/><circle cx="12" cy="70" r="6" fill="#ffe27a" ${ink(2)}/>
      ${shine(22, 38, 3.5, 8, 20, 0.45)}${spark(70, 14, 6, '#ffe27a')}`,
    engarde: () => `<defs>${LG('gvs1', '#ff6a6a', '#b3122a')}${LG('gvs2', '#6aa8ff', '#1a3a9a')}<clipPath id="cpvs"><circle cx="40" cy="36" r="30"/></clipPath></defs>
      <g clip-path="url(#cpvs)"><rect x="0" y="0" width="80" height="80" fill="url(#gvs1)"/><path d="M48 0 L36 34 L46 36 L30 80 H80 V0Z" fill="url(#gvs2)"/></g>
      <circle cx="40" cy="36" r="30" fill="none" ${ink(3.4)}/>
      <path d="M48 0 L36 34 L46 36 L30 80" fill="none" stroke="#ffe36b" stroke-width="3" clip-path="url(#cpvs)"/>
      <path d="M18 14 L60 56 M62 14 L20 56" stroke="${K}" stroke-width="8" stroke-linecap="round"/>
      <path d="M18 14 L60 56 M62 14 L20 56" stroke="#eef3fb" stroke-width="4" stroke-linecap="round"/>
      <path d="M14 50 L26 60 M66 50 L54 60" stroke="${K}" stroke-width="9" stroke-linecap="round"/><path d="M14 50 L26 60 M66 50 L54 60" stroke="#ffcf4a" stroke-width="5" stroke-linecap="round"/>
      <text x="40" y="44" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="22" fill="#fff" stroke="${K}" stroke-width="4" paint-order="stroke">VS</text>
      ${ribbon('EN GARDE !', '#ffcf4a', 10)}`,
    sceau: () => `<defs>${RG('gsc', '#ff8a8a', '#d6283f', '#7a0a1c')}</defs>
      <path d="M40 4 C52 6 55 2 63 10 C71 18 67 23 71 33 C75 45 67 49 63 57 C57 65 51 61 40 65 C29 61 23 65 17 57 C13 49 5 45 9 33 C13 23 9 18 17 10 C25 2 28 6 40 4Z" fill="url(#gsc)" ${ink(3)}/>
      <ellipse cx="40" cy="44" rx="10" ry="8" fill="#ffcf4a" ${ink(2)}/>
      <circle cx="28" cy="31" r="4.5" fill="#ffcf4a" ${ink(1.8)}/><circle cx="36" cy="25" r="4.5" fill="#ffcf4a" ${ink(1.8)}/><circle cx="44" cy="25" r="4.5" fill="#ffcf4a" ${ink(1.8)}/><circle cx="52" cy="31" r="4.5" fill="#ffcf4a" ${ink(1.8)}/>
      ${shine(22, 18, 7, 4, -35, 0.6)}
      ${ribbon('BONUS', '#2f4cb0')}${spark(72, 8, 6, '#ffe36b')}${spark(8, 48, 5, '#ffe36b')}`,

    // ===== Chaudron Magique =====
    fiole_bleue: () => flask('b', '#bfe6ff', '#4fb6ff', '#1f5fc4', `${spiral(32, 56, 6.5)}${spiral(48, 56, 6.5)}${ooh(40, 67, 3.6)}`),
    fiole_verte: () => flask('v', '#c8ffd8', '#3fd67a', '#0f7a3c', `${eye(32, 55, 6.5, 0.6, -0.5)}${eye(48, 55, 6.5, -0.6, 0.6)}${grin(40, 63, 7)}`),
    fiole_rose: () => flask('r', '#ffe0f0', '#ff6fb0', '#c01c6a', `${shut(32, 56, 4.5)}${eye(48, 55, 6.5, 0.3, 0)}${smile(40, 64, 5)}${blush(26, 63)}${blush(54, 63)}`),
    champignon: () => `<defs>${RG('gch1', '#ff9a9a', '#e8283c', '#8a0a1c')}${LG('gch2', '#fffaf0', '#f0d8b0')}</defs>${shadow(22)}
      <path d="M26 42 C23 56 23 68 28 74 H52 C57 68 57 56 54 42Z" fill="url(#gch2)" ${ink(3)}/>
      ${eye(34, 54, 6.5, 0.8, 0.4)}${eye(47, 53, 7.5, -0.4, -0.7, 0.45)}${grin(40, 63, 7)}
      <path d="M5 42 C5 18 22 5 40 5 C58 5 75 18 75 42 C62 48 18 48 5 42Z" fill="url(#gch1)" ${ink(3)}/>
      <circle cx="22" cy="26" r="6" fill="#fff" ${ink(1.8)}/><circle cx="43" cy="15" r="5" fill="#fff" ${ink(1.8)}/><circle cx="60" cy="30" r="6.5" fill="#fff" ${ink(1.8)}/><circle cx="38" cy="34" r="4" fill="#fff" ${ink(1.8)}/>
      ${shine(20, 15, 7, 3.5, -35, 0.55)}`,
    cristal: () => `<defs>${LG('gcr1', '#f0dcff', '#9b5cf5')}${LG('gcr2', '#c9a8ff', '#6a2ad6')}</defs>${shadow(26)}
      <path d="M14 36 L24 44 L27 72 H15 L8 48Z" fill="url(#gcr2)" ${ink(2.6)}/>
      <path d="M66 32 L73 46 L65 72 H52 L55 44Z" fill="url(#gcr2)" ${ink(2.6)}/>
      <path d="M40 3 L56 22 L50 72 H30 L24 22Z" fill="url(#gcr1)" ${ink(3)}/>
      <path d="M33 10 L29 24 L32 40" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".75" fill="none"/>
      ${eye(34, 40, 6, 0.3, 0.3)}${eye(47, 40, 6, 0.3, 0.3)}${smile(40, 52, 5)}${blush(30, 50)}${blush(51, 50)}
      ${spark(10, 20, 6)}${spark(70, 16, 5)}${spark(62, 66, 4)}`,
    grimoire: () => `<defs>${LG('ggr', '#8a52c6', '#3f1a6a')}</defs>
      <path d="M8 12 H58 C66 12 72 18 72 26 V58 H14 C10 58 8 56 8 52Z" fill="url(#ggr)" ${ink(3)}/>
      <path d="M18 12 V58" stroke="${K}" stroke-width="2" opacity=".5"/>
      <path d="M72 30 L58 34 L72 38 L58 42 L72 46 L58 50 L72 54" fill="#fff6dc" ${ink(2)}/>
      ${eye(42, 30, 12, 0.4, 0.2, 0.42)}
      <path d="M28 18 L32 22 M54 16 L50 21" stroke="#ffcf4a" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M26 46 Q40 54 54 46" fill="none" ${ink(2.6)}/><path d="M30 47 L32 51 L34 48 M46 48 L48 51 L50 47" fill="#fff" ${ink(1.4)}/>
      ${ribbon('BONUS', '#27c4a8')}${spark(8, 8, 6, '#ffe36b')}${spark(76, 18, 5, '#ffe36b')}`,

    // ===== Lettres « goofy » des Mousquetaires : grosses lettres qui ont des yeux =====
    'dix@mx': () => goofyLetter('10', '#b6ffd4', '#14a05a', [[28, 0.6, 0.2], [53, -0.5, 0.4]]),
    'valet@mx': () => goofyLetter('V', '#c4e2ff', '#2a6fd6', [[30, 0.7, 0.5], [50, -0.7, 0.5]]),
    'dame@mx': () => goofyLetter('D', '#f4d2ff', '#8a3ad6', [[30, -0.4, -0.5], [48, 0.6, 0.3]]),
    'roi@mx': () => goofyLetter('R', '#ffd2b0', '#e0601c', [[30, 0.5, 0.5], [48, 0.5, 0.5]]),
    'as@mx': () => goofyLetter('A', '#ffc2c8', '#d61c3a', [[32, 0.3, 0.6], [48, -0.3, 0.6]]),
    // ===== Cerises et 7 « goofy » des machines à grille =====
    'cerise@mx': () => `<defs>${RG('gce', '#ffb0b8', '#e8283c', '#8a0a1c')}</defs>${shadow(28)}
      <path d="M44 6 C38 20 28 30 24 44 M44 6 C49 22 54 32 58 44" fill="none" stroke="${K}" stroke-width="6" stroke-linecap="round"/>
      <path d="M44 6 C38 20 28 30 24 44 M44 6 C49 22 54 32 58 44" fill="none" stroke="#3f9d20" stroke-width="3" stroke-linecap="round"/>
      <path d="M44 7 C54 0 66 2 70 10 C60 14 50 12 44 7Z" fill="#6be36b" ${ink(2.2)}/>
      <circle cx="23" cy="54" r="17" fill="url(#gce)" ${ink(3)}/><circle cx="58" cy="54" r="17" fill="url(#gce)" ${ink(3)}/>
      ${eye(17, 51, 5, 0.6, -0.4)}${eye(29, 51, 5, -0.6, -0.4)}${grin(23, 60, 6)}
      ${shut(53, 51, 3.5)}${eye(64, 50, 5.5, 0.2, 0.3)}${smile(58, 61, 4)}
      ${shine(15, 44, 4, 2.5, -30)}${shine(50, 44, 4, 2.5, -30)}`,
    'sept@mx': () => `<defs>${LG('gs7', '#ff8a6a', '#c8102c')}</defs>${shadow(22)}
      <path d="M12 8 H70 V22 L44 74 H24 L50 24 H12Z" fill="url(#gs7)" ${ink(3.2)} stroke-linejoin="round"/>
      <path d="M16 11 H66" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
      <path d="M12 8 H70 V22 L44 74 H24 L50 24 H12Z" fill="none" stroke="#ffcf4a" stroke-width="1.6" transform="translate(2.5 2.5) scale(.94)"/>
      ${eye(26, 16, 6, 0.5, 0.3)}${eye(42, 16, 6.5, -0.4, 0.5, 0.45)}
      ${grin(37, 42, 7)}
      ${spark(72, 40, 6, '#ffe36b')}${spark(8, 38, 5, '#ffe36b')}`,
  };
  const cache = {};
  return {
    // theme « mx » : version goofy de certains symboles partagés (cerise, 7) sur les machines à grille
    svg(id, theme) {
      if (theme && ART[id + '@' + theme]) id = id + '@' + theme;
      if (!ART[id]) return `<span>${id}</span>`;
      if (!cache[id]) cache[id] = `<svg viewBox="0 0 80 80" aria-hidden="true" overflow="visible">${ART[id]()}</svg>`;
      return cache[id];
    },
    NAMES: { dix: '10', valet: 'Valet', dame: 'Dame', roi: 'Roi', as: 'As', cerise: 'Cerises', sept: 'Sept', chatnoir: 'Chat noir', siamois: 'Siamois', persan: 'Persan', tigre: 'Matou tigré', palace: 'Carton (Wild)', pelote: 'Pelote (Bonus)', diamant: 'Diamant',
      macaron: 'Macaron', guimauve: 'Guimauve', berlingot: 'Berlingot', reglisse: 'Roue de réglisse', caramel: 'Caramel', dragee: 'Dragées', meringue: 'Meringue', montgolfiere: 'Montgolfière (Bonus)', bulle: 'Bulle multiplicatrice',
      rapiere: 'Matou borgne', chapeau: 'Chat mousquetaire', bourse: 'Bourse d\'or', epee: 'Rapière', engarde: 'En garde ! (duel)', sceau: 'Sceau royal (Bonus)',
      fiole_bleue: 'Fiole bleue', fiole_verte: 'Fiole verte', fiole_rose: 'Fiole rose', champignon: 'Champignon', cristal: 'Cristal', grimoire: 'Grimoire (Bonus)' },
  };
})();

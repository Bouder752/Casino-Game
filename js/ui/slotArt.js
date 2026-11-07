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
  function cat({ fur, fur2, ear, eye, muzzle = '#fff8ee', extra = '', top = '', under = '', stripes = '' }) {
    return `
      ${under}
      <path d="M14 36 L12 6 L36 20 Z M66 36 L68 6 L44 20 Z" fill="${fur}" ${ink()}/>
      <path d="M18 28 L17 13 L30 21Z M62 28 L63 13 L50 21Z" fill="${ear}"/>
      <path d="M40 16 C60 16 72 28 72 44 C72 50 76 54 72 58 C70 68 58 76 40 76 C22 76 10 68 8 58 C4 54 8 50 8 44 C8 28 20 16 40 16Z" fill="${fur}" ${ink()}/>
      <path d="M40 18 C56 18 66 26 69 38 C60 30 50 27 40 27 C30 27 20 30 11 38 C14 26 24 18 40 18Z" fill="${fur2}" opacity=".55"/>
      ${stripes}
      <ellipse cx="29" cy="44" rx="8.5" ry="9.5" fill="#fff" ${ink(2.5)}/><ellipse cx="51" cy="44" rx="8.5" ry="9.5" fill="#fff" ${ink(2.5)}/>
      <ellipse cx="30" cy="45" rx="6" ry="7.5" fill="${eye}"/><ellipse cx="50" cy="45" rx="6" ry="7.5" fill="${eye}"/>
      <ellipse cx="30" cy="46" rx="2.6" ry="5.5" fill="${K}"/><ellipse cx="50" cy="46" rx="2.6" ry="5.5" fill="${K}"/>
      <circle cx="27.5" cy="41" r="2.6" fill="#fff"/><circle cx="47.5" cy="41" r="2.6" fill="#fff"/>
      <ellipse cx="18" cy="56" rx="5" ry="3" fill="#ff8fa3" opacity=".55"/><ellipse cx="62" cy="56" rx="5" ry="3" fill="#ff8fa3" opacity=".55"/>
      <path d="M40 54 C32 54 28 60 32 64 C35 67 38 66 40 64 C42 66 45 67 48 64 C52 60 48 54 40 54Z" fill="${muzzle}" ${ink(2)}/>
      <path d="M36.5 55.5 H43.5 L40 59.5Z" fill="#ff6f8f" ${ink(1.6)}/>
      <path d="M40 60 V62 M40 62 Q37 65 34.5 63 M40 62 Q43 65 45.5 63" fill="none" ${ink(1.6)}/>
      <path d="M6 54 L22 57 M7 61 L22 60 M74 54 L58 57 M73 61 L58 60" stroke="${K}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>
      ${extra}${top}`;
  }

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
  };
  const cache = {};
  return {
    svg(id) {
      if (!ART[id]) return `<span>${id}</span>`;
      if (!cache[id]) cache[id] = `<svg viewBox="0 0 80 80" aria-hidden="true">${ART[id]()}</svg>`;
      return cache[id];
    },
    NAMES: { dix: '10', valet: 'Valet', dame: 'Dame', roi: 'Roi', as: 'As', cerise: 'Cerises', sept: 'Sept', chatnoir: 'Chat noir', siamois: 'Siamois', persan: 'Persan', tigre: 'Matou tigré', palace: 'Carton (Wild)', pelote: 'Pelote (Bonus)', diamant: 'Diamant' },
  };
})();

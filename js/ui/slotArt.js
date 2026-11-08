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

  // Fiole de potion (Chaudron Magique) : liquide coloré, bouchon, bulles
  const flask = (c1, c2) => `
      <rect x="32" y="6" width="16" height="10" rx="3" fill="#b07a44" ${ink(2.5)}/>
      <path d="M34 16 V30 C20 34 12 44 12 54 C12 66 24 74 40 74 C56 74 68 66 68 54 C68 44 60 34 46 30 V16Z" fill="#eef6ff" ${ink()}/>
      <path d="M15 52 C24 46 56 46 65 52 C66 64 56 71 40 71 C24 71 14 64 15 52Z" fill="${c1}"/>
      <path d="M15 52 C24 46 56 46 65 52" fill="none" stroke="${c2}" stroke-width="2.5"/>
      <circle cx="30" cy="60" r="3" fill="#fff" opacity=".8"/><circle cx="46" cy="56" r="2" fill="#fff" opacity=".8"/><circle cx="52" cy="64" r="3.5" fill="#fff" opacity=".6"/>
      <path d="M22 44 C24 40 28 37 32 36" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>
      <path d="M34 16 V30 C20 34 12 44 12 54 C12 66 24 74 40 74 C56 74 68 66 68 54 C68 44 60 34 46 30 V16Z" fill="none" ${ink()}/>`;

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
    // ===== Confiserie Céleste =====
    macaron: () => `
      <ellipse cx="40" cy="54" rx="30" ry="13" fill="#e7609e" ${ink()}/>
      <rect x="13" y="40" width="54" height="11" rx="5.5" fill="#fff3d6" ${ink(2.5)}/>
      <path d="M14 44 Q20 49 26 44 Q32 49 38 44 Q44 49 50 44 Q56 49 62 44 Q66 47 67 45" fill="none" stroke="#f5d9a8" stroke-width="2"/>
      <ellipse cx="40" cy="33" rx="30" ry="16" fill="#ff8fc0" ${ink()}/>
      <ellipse cx="30" cy="26" rx="11" ry="5" fill="#fff" opacity=".55" transform="rotate(-12 30 26)"/>`,
    guimauve: () => `
      <defs><clipPath id="cp-guim"><rect x="10" y="27" width="60" height="26" rx="13" transform="rotate(-35 40 40)"/></clipPath></defs>
      <rect x="10" y="27" width="60" height="26" rx="13" transform="rotate(-35 40 40)" fill="#fff" ${ink()}/>
      <g clip-path="url(#cp-guim)"><path d="M6 46 L34 6 M22 58 L50 18 M38 70 L66 30 M54 80 L82 40" stroke="#ff7fb0" stroke-width="8"/></g>
      <rect x="10" y="27" width="60" height="26" rx="13" transform="rotate(-35 40 40)" fill="none" ${ink()}/>
      <ellipse cx="30" cy="38" rx="9" ry="3.5" fill="#fff" opacity=".7" transform="rotate(-35 30 38)"/>`,
    berlingot: () => `
      <defs><clipPath id="cp-berl"><path d="M40 8 L72 66 H8Z"/></clipPath></defs>
      <path d="M40 8 L72 66 H8Z" fill="#ffd23f" ${ink()}/>
      <g clip-path="url(#cp-berl)"><path d="M18 70 L46 6 M34 72 L60 14 M50 74 L74 26" stroke="#ff4f6d" stroke-width="7"/></g>
      <path d="M40 8 L72 66 H8Z" fill="none" ${ink()}/>
      <path d="M36 20 L22 50" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"/>`,
    reglisse: () => `
      <circle cx="40" cy="40" r="31" fill="#1f1a24" ${ink()}/>
      <path d="M40 40 m-8 0 a8 8 0 1 1 16 0 a14 14 0 1 1 -28 0 a20 20 0 1 1 40 0 a26 26 0 1 1 -52 0" fill="none" stroke="#5a4c66" stroke-width="4.5"/>
      <circle cx="40" cy="40" r="10" fill="#ff5ca8" ${ink(2.5)}/>
      <circle cx="37" cy="37" r="1.6" fill="#fff"/><circle cx="43" cy="39" r="1.6" fill="#ffe36b"/><circle cx="39" cy="44" r="1.6" fill="#7ec8ff"/>
      <ellipse cx="26" cy="21" rx="9" ry="4" fill="#fff" opacity=".3" transform="rotate(-30 26 21)"/>`,
    caramel: () => `
      <path d="M22 40 L6 26 L10 40 L6 54Z M58 40 L74 26 L70 40 L74 54Z" fill="#ffd9a0" ${ink(2.5)}/>
      <ellipse cx="40" cy="40" rx="20" ry="16" fill="#e68a2e" ${ink()}/>
      <path d="M26 36 Q40 28 54 36" fill="none" stroke="#ffc074" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="33" cy="33" rx="6" ry="3" fill="#fff" opacity=".55"/>`,
    dragee: () => `
      <ellipse cx="48" cy="46" rx="20" ry="14" fill="#fff" ${ink()} transform="rotate(25 48 46)"/>
      <ellipse cx="32" cy="36" rx="22" ry="15" fill="#7ec8ff" ${ink()} transform="rotate(-20 32 36)"/>
      <ellipse cx="26" cy="29" rx="8" ry="4" fill="#fff" opacity=".7" transform="rotate(-20 26 29)"/>`,
    meringue: () => `
      <path d="M40 8 C44 18 60 22 64 38 C68 56 56 70 40 70 C24 70 12 56 16 38 C20 22 36 18 40 8Z" fill="#fff6e6" ${ink()}/>
      <path d="M22 48 C32 54 50 54 60 46 M24 34 C34 40 48 40 56 32 M32 22 C38 26 44 26 48 22" fill="none" stroke="#e8cfa6" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="30" cy="30" rx="5" ry="3" fill="#fff" opacity=".9"/>`,
    montgolfiere: () => `
      <defs><clipPath id="cp-mont"><path d="M40 4 C60 4 70 18 68 32 C66 44 50 52 46 58 H34 C30 52 14 44 12 32 C10 18 20 4 40 4Z"/></clipPath></defs>
      <path d="M40 4 C60 4 70 18 68 32 C66 44 50 52 46 58 H34 C30 52 14 44 12 32 C10 18 20 4 40 4Z" fill="#ff5ca8" ${ink()}/>
      <g clip-path="url(#cp-mont)"><path d="M26 0 V60 M40 0 V60 M54 0 V60" stroke="#ffe36b" stroke-width="7"/></g>
      <path d="M40 4 C60 4 70 18 68 32 C66 44 50 52 46 58 H34 C30 52 14 44 12 32 C10 18 20 4 40 4Z" fill="none" ${ink()}/>
      <ellipse cx="26" cy="16" rx="7" ry="4" fill="#fff" opacity=".6" transform="rotate(-30 26 16)"/>
      <rect x="33" y="56" width="14" height="8" rx="2" fill="#a5642a" ${ink(2)}/>
      <rect x="6" y="60" width="68" height="17" rx="8.5" fill="#7c4dff" ${ink(2.5)}/>
      <text x="40" y="73" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="13" fill="#fff" stroke="${K}" stroke-width="3" paint-order="stroke" letter-spacing="1">BONUS</text>`,
    bulle: () => `
      <circle cx="40" cy="40" r="33" fill="#c58bff" fill-opacity=".55" ${ink(3)}/>
      <circle cx="40" cy="40" r="27" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/>
      <ellipse cx="27" cy="24" rx="10" ry="6" fill="#fff" opacity=".75" transform="rotate(-35 27 24)"/>`,

    // ===== Chats Mousquetaires =====
    rapiere: () => `
      <path d="M70 6 L66 6 L26 46 L34 54 L74 14 L74 10Z" fill="#e9eff8" ${ink(3)}/>
      <path d="M70 9 L32 47" stroke="#b8c4d6" stroke-width="2"/>
      <path d="M12 40 C14 26 34 24 40 40 C44 50 36 60 26 62 C30 54 28 46 20 44Z" fill="#ffcf4a" ${ink(3)}/>
      <path d="M28 52 L12 68" stroke="${K}" stroke-width="11" stroke-linecap="round"/>
      <path d="M28 52 L12 68" stroke="#8a4a1c" stroke-width="6" stroke-linecap="round"/>
      <circle cx="10" cy="70" r="6" fill="#ffcf4a" ${ink(2.5)}/>
      <path d="M62 12 L40 34" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>`,
    chapeau: () => cat({ fur: '#d9c3a0', fur2: '#fff3dc', ear: '#ff9db0', eye: '#4fb6ff',
      top: `<path d="M6 28 C20 18 60 18 74 28 C60 24 20 24 6 28Z" fill="#3a2a6a" ${ink(2.5)}/>
        <path d="M22 24 C22 8 58 8 58 24Z" fill="#4b3a8a" ${ink(2.5)}/>
        <path d="M24 20 H56" stroke="#ffcf4a" stroke-width="4"/>
        <path d="M54 18 C64 4 76 2 78 6 C72 8 66 14 60 22Z" fill="#ff4f6d" ${ink(2)}/>` }),
    bourse: () => `
      <path d="M26 24 C16 34 10 48 14 60 C18 72 62 72 66 60 C70 48 64 34 54 24Z" fill="#a5642a" ${ink()}/>
      <path d="M26 24 C32 20 48 20 54 24 L50 16 H30Z" fill="#c07a38" ${ink(2.5)}/>
      <path d="M26 26 Q40 32 54 26" fill="none" stroke="#ffcf4a" stroke-width="4"/>
      <circle cx="58" cy="62" r="9" fill="#ffcf4a" ${ink(2.5)}/><circle cx="66" cy="54" r="7" fill="#ffe27a" ${ink(2)}/>
      <text x="40" y="56" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="18" fill="#ffcf4a" stroke="${K}" stroke-width="3" paint-order="stroke">$</text>`,
    engarde: () => `
      <circle cx="40" cy="38" r="30" fill="#c8202c" ${ink()}/>
      <circle cx="40" cy="38" r="24" fill="none" stroke="#ffcf4a" stroke-width="3"/>
      <path d="M22 22 L58 56 M58 22 L22 56" stroke="#e9eff8" stroke-width="5" stroke-linecap="round"/>
      <path d="M22 22 L58 56 M58 22 L22 56" stroke="${K}" stroke-width="1.5" opacity=".5"/>
      <path d="M20 50 L28 58 M60 50 L52 58" stroke="#ffcf4a" stroke-width="6" stroke-linecap="round"/>
      <rect x="4" y="60" width="72" height="17" rx="8.5" fill="#ffcf4a" ${ink(2.5)}/>
      <text x="40" y="73" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="11.5" fill="#c8202c" stroke="${K}" stroke-width="2" paint-order="stroke">EN GARDE !</text>`,
    sceau: () => `
      <path d="M40 6 C52 8 54 4 62 12 C70 20 66 24 70 34 C74 46 66 50 62 58 C56 66 50 62 40 66 C30 62 24 66 18 58 C14 50 6 46 10 34 C14 24 10 20 18 12 C26 4 28 8 40 6Z" fill="#b3122a" ${ink()}/>
      <circle cx="40" cy="36" r="19" fill="#d6283f" ${ink(2)}/>
      <path d="M40 22 C34 28 34 34 40 40 C46 34 46 28 40 22Z M30 34 C30 40 34 44 40 44 C36 40 34 36 30 34Z M50 34 C50 40 46 44 40 44 C44 40 46 36 50 34Z M34 46 H46" fill="#ffcf4a" ${ink(1.6)}/>
      <rect x="6" y="60" width="68" height="17" rx="8.5" fill="#ffcf4a" ${ink(2.5)}/>
      <text x="40" y="73" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="13" fill="#fff" stroke="${K}" stroke-width="3" paint-order="stroke" letter-spacing="1">BONUS</text>`,

    // ===== Chaudron Magique =====
    fiole_bleue: () => flask('#4fb6ff', '#1f6fd6'),
    fiole_verte: () => flask('#6be39a', '#14a05a'),
    fiole_rose: () => flask('#ff8fc0', '#d6266e'),
    champignon: () => `
      <path d="M32 44 C30 56 30 66 34 70 H46 C50 66 50 56 48 44Z" fill="#fff3dc" ${ink()}/>
      <path d="M8 44 C8 22 24 10 40 10 C56 10 72 22 72 44 C60 48 20 48 8 44Z" fill="#e8283c" ${ink()}/>
      <circle cx="26" cy="28" r="5" fill="#fff" ${ink(1.5)}/><circle cx="44" cy="20" r="4" fill="#fff" ${ink(1.5)}/><circle cx="56" cy="34" r="5.5" fill="#fff" ${ink(1.5)}/><circle cx="38" cy="36" r="3.5" fill="#fff" ${ink(1.5)}/>
      <ellipse cx="22" cy="20" rx="6" ry="3" fill="#fff" opacity=".5" transform="rotate(-35 22 20)"/>`,
    cristal: () => `
      <path d="M40 4 L54 22 L48 70 H32 L26 22Z" fill="#b57bff" ${ink()}/>
      <path d="M40 4 L40 70 M26 22 L54 22" fill="none" stroke="${K}" stroke-width="1.6" opacity=".5"/>
      <path d="M16 34 L26 44 L28 70 H18 L10 46Z" fill="#8f52f0" ${ink(2.5)}/>
      <path d="M64 30 L72 44 L64 70 H52 L54 42Z" fill="#9b63f5" ${ink(2.5)}/>
      <path d="M34 14 L30 26 L34 60" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6" fill="none"/>`,
    grimoire: () => `
      <path d="M10 14 H60 C66 14 70 18 70 24 V60 H16 C12 60 10 58 10 54Z" fill="#5b2a86" ${ink()}/>
      <path d="M16 60 H70 V66 H16 C12 66 10 64 10 62Z" fill="#fff3dc" ${ink(2)}/>
      <path d="M20 14 V60" stroke="${K}" stroke-width="2" opacity=".5"/>
      <path d="M45 22 L49 32 L60 32 L51 38 L55 49 L45 42 L35 49 L39 38 L30 32 L41 32Z" fill="#ffcf4a" ${ink(2)}/>
      <rect x="6" y="60" width="68" height="17" rx="8.5" fill="#27c4a8" ${ink(2.5)}/>
      <text x="40" y="73" text-anchor="middle" font-family="'Lilita One', Impact, sans-serif" font-size="13" fill="#fff" stroke="${K}" stroke-width="3" paint-order="stroke" letter-spacing="1">BONUS</text>`,
  };
  const cache = {};
  return {
    svg(id) {
      if (!ART[id]) return `<span>${id}</span>`;
      if (!cache[id]) cache[id] = `<svg viewBox="0 0 80 80" aria-hidden="true">${ART[id]()}</svg>`;
      return cache[id];
    },
    NAMES: { dix: '10', valet: 'Valet', dame: 'Dame', roi: 'Roi', as: 'As', cerise: 'Cerises', sept: 'Sept', chatnoir: 'Chat noir', siamois: 'Siamois', persan: 'Persan', tigre: 'Matou tigré', palace: 'Carton (Wild)', pelote: 'Pelote (Bonus)', diamant: 'Diamant',
      macaron: 'Macaron', guimauve: 'Guimauve', berlingot: 'Berlingot', reglisse: 'Roue de réglisse', caramel: 'Caramel', dragee: 'Dragées', meringue: 'Meringue', montgolfiere: 'Montgolfière (Bonus)', bulle: 'Bulle multiplicatrice',
      rapiere: 'Rapière', chapeau: 'Chat mousquetaire', bourse: 'Bourse d\'or', engarde: 'En garde ! (duel)', sceau: 'Sceau royal (Bonus)',
      fiole_bleue: 'Fiole bleue', fiole_verte: 'Fiole verte', fiole_rose: 'Fiole rose', champignon: 'Champignon', cristal: 'Cristal', grimoire: 'Grimoire (Bonus)' },
  };
})();

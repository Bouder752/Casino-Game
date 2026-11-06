// Symboles originaux de la machine « Le Palace des Chats » (SVG 80 × 80, Art déco)
const SlotArt = (() => {
  const G = '#D4AF37', G2 = '#F2D675', CR = '#F3E9D2', BX = '#6B1E2E', K = '#14110F';
  const ink = 'stroke="#14110F" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';

  // Lettres Art déco (symboles bas)
  const letter = (txt, c1, c2) => `
    <defs><linearGradient id="lg-${txt}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <path d="M40 4 L76 40 L40 76 L4 40Z" fill="none" stroke="${G}" stroke-width="1.5" opacity=".6"/>
    <text x="40" y="${txt.length > 1 ? 54 : 56}" text-anchor="middle" font-family="Limelight, Georgia, serif" font-size="${txt.length > 1 ? 34 : 44}"
      fill="url(#lg-${txt})" stroke="${K}" stroke-width="2" paint-order="stroke">${txt}</text>`;

  // Tête de chat paramétrable
  function cat({ fur, ear, eye, mask, stripes, extra = '', top = '' }) {
    return `
      <path d="M16 34 L14 8 L34 22 Z M64 34 L66 8 L46 22 Z" fill="${fur}" ${ink}/>
      <path d="M19 28 L18 14 L29 22Z M61 28 L62 14 L51 22Z" fill="${ear}"/>
      <ellipse cx="40" cy="44" rx="28" ry="25" fill="${fur}" ${ink}/>
      ${mask ? `<ellipse cx="40" cy="50" rx="16" ry="14" fill="${mask}" opacity=".85"/>` : ''}
      ${stripes ? `<path d="M40 20 V30 M32 22 L34 30 M48 22 L46 30 M14 44 H22 M58 44 H66 M15 52 H22 M58 52 H65" stroke="${stripes}" stroke-width="3" stroke-linecap="round"/>` : ''}
      <ellipse cx="30" cy="42" rx="6" ry="7" fill="${eye}" ${ink}/><ellipse cx="50" cy="42" rx="6" ry="7" fill="${eye}" ${ink}/>
      <ellipse cx="30" cy="43" rx="1.8" ry="5" fill="${K}"/><ellipse cx="50" cy="43" rx="1.8" ry="5" fill="${K}"/>
      <path d="M37 53 L43 53 L40 57Z" fill="#e88aa0" ${ink} stroke-width="1.2"/>
      <path d="M40 57 Q36 62 32 60 M40 57 Q44 62 48 60" fill="none" ${ink} stroke-width="1.4"/>
      <path d="M8 50 L24 52 M8 56 L24 55 M72 50 L56 52 M72 56 L56 55" stroke="${CR}" stroke-width="1" opacity=".8"/>
      ${extra}${top}`;
  }

  const ART = {
    dix: () => letter('10', '#7fe0a8', '#11804a'),
    valet: () => letter('V', '#9cc2ff', '#1d4b9a'),
    dame: () => letter('D', '#e3b8ff', '#6a2bc4'),
    roi: () => letter('R', '#ff9aa8', BX),
    as: () => letter('A', G2, '#9c7a1e'),
    cerise: () => `
      <path d="M40 10 C34 24 26 34 22 50 M40 10 C44 26 50 36 56 50" fill="none" stroke="#2e7d32" stroke-width="3" stroke-linecap="round"/>
      <path d="M40 10 C48 4 60 6 62 14 C54 18 46 16 40 10Z" fill="#43a047" ${ink}/>
      <circle cx="22" cy="56" r="14" fill="#c4161c" ${ink}/><circle cx="56" cy="56" r="14" fill="#c4161c" ${ink}/>
      <circle cx="17" cy="50" r="3.5" fill="#fff" opacity=".75"/><circle cx="51" cy="50" r="3.5" fill="#fff" opacity=".75"/>`,
    sept: () => `
      <path d="M14 12 H66 L42 72 H24 L44 26 H14Z" fill="#d41e2a" stroke="${G}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M14 12 H66 L42 72 H24 L44 26 H14Z" fill="none" ${ink}/>
      <path d="M18 16 H60 L58 20 H18Z" fill="#ff8a8a" opacity=".6"/>`,
    chatnoir: () => cat({ fur: '#1d1d24', ear: '#c46a8a', eye: '#f2d675',
      extra: `<circle cx="50" cy="42" r="9" fill="none" stroke="${G}" stroke-width="2"/><path d="M58 46 Q66 60 62 72" fill="none" stroke="${G}" stroke-width="1"/>
        <path d="M28 70 L40 74 L28 78Z M52 70 L40 74 L52 78Z" fill="${BX}" ${ink}/><circle cx="40" cy="74" r="2.5" fill="${BX}" ${ink}/>` }),
    siamois: () => cat({ fur: '#efe0c4', ear: '#6b4a32', eye: '#4fb6ff', mask: '#6b4a32',
      extra: `${[18, 26, 34, 42, 50, 58].map((x, i) => `<circle cx="${x + 2}" cy="${70 + (i === 0 || i === 5 ? -2 : 0)}" r="3" fill="#fff" ${ink} stroke-width="1"/>`).join('')}` }),
    persan: () => cat({ fur: '#f7f4f0', ear: '#f2b8c6', eye: '#e8a33a',
      extra: `<path d="M12 46 C6 52 10 60 16 62 M68 46 C74 52 70 60 64 62" fill="none" ${ink} stroke-width="1.4"/>`,
      top: `<path d="M26 20 L30 8 L36 16 L40 4 L44 16 L50 8 L54 20Z" fill="${G}" ${ink}/><circle cx="40" cy="10" r="2.5" fill="#4fb6ff"/>` }),
    tigre: () => cat({ fur: '#e8913a', ear: '#f2c19a', eye: '#7cc96a', stripes: '#8a4a12',
      top: `<path d="M18 22 C18 10 62 10 62 22Z" fill="${K}" ${ink}/><path d="M10 24 C14 18 66 18 70 24 C64 28 16 28 10 24Z" fill="${K}" ${ink}/><path d="M20 19 H60" stroke="${BX}" stroke-width="3"/>` }),
    palace: () => `
      <rect x="4" y="4" width="72" height="72" rx="8" fill="#0B3B2E" stroke="${G}" stroke-width="2"/>
      <path d="M22 66 V30 L40 12 L58 30 V66Z" fill="${G}" ${ink}/>
      <path d="M40 12 V66 M30 66 V34 M50 66 V34" stroke="${K}" stroke-width="1.5"/>
      ${[38, 46, 54].map(y => `<rect x="26" y="${y}" width="6" height="5" fill="#fff6c0"/><rect x="48" y="${y}" width="6" height="5" fill="#fff6c0"/>`).join('')}
      <path d="M36 66 V58 A4 4 0 0 1 44 58 V66Z" fill="${BX}"/>
      <rect x="8" y="58" width="64" height="14" rx="3" fill="${BX}" stroke="${G}" stroke-width="1.5"/>
      <text x="40" y="69" text-anchor="middle" font-family="Limelight, Georgia, serif" font-size="11" fill="${G2}" letter-spacing="2">WILD</text>`,
    pelote: () => `
      <circle cx="40" cy="38" r="28" fill="${G}" ${ink}/>
      <path d="M16 28 C30 34 50 22 66 30 M14 42 C30 48 52 36 68 44 M22 60 C34 58 52 54 62 50 M30 12 C24 30 28 52 38 66 M50 12 C58 30 56 52 46 66" fill="none" stroke="#9c7a1e" stroke-width="2"/>
      <path d="M62 56 C70 64 74 70 70 76" fill="none" stroke="${G}" stroke-width="3"/>
      <rect x="10" y="62" width="60" height="14" rx="3" fill="${BX}" stroke="${G}" stroke-width="1.5"/>
      <text x="40" y="73" text-anchor="middle" font-family="Limelight, Georgia, serif" font-size="10" fill="${G2}" letter-spacing="2">BONUS</text>`,
    diamant: () => `
      <path d="M12 30 L24 16 H56 L68 30 L40 70Z" fill="#9fe6ff" ${ink}/>
      <path d="M12 30 H68 M24 16 L32 30 L40 16 L48 30 L56 16 M32 30 L40 70 L48 30" fill="none" ${ink} stroke-width="1.4"/>
      <path d="M16 30 L36 64 L32 30Z" fill="#fff" opacity=".5"/>`,
  };
  const cache = {};
  return {
    svg(id) {
      if (!ART[id]) return `<span>${id}</span>`;
      if (!cache[id]) cache[id] = `<svg viewBox="0 0 80 80" aria-hidden="true">${ART[id]()}</svg>`;
      return cache[id];
    },
    NAMES: { dix: '10', valet: 'Valet', dame: 'Dame', roi: 'Roi', as: 'As', cerise: 'Cerises', sept: 'Sept', chatnoir: 'Chat noir', siamois: 'Siamois', persan: 'Persan', tigre: 'Tigré', palace: 'Palace (Wild)', pelote: 'Pelote d\'or (Bonus)', diamant: 'Diamant' },
  };
})();

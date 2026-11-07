// Particules (canvas plein écran) : pièces qui jaillissent, pluie de jetons, confettis.
// Purement décoratif : le hasard vient de RNG.fx, jamais du générateur de la partie.
const FX = (() => {
  const cv = document.getElementById('fx');
  const ctx = cv.getContext('2d');
  const R = () => RNG.fx.next();
  let parts = [], raf = 0, dpr = 1;
  // Réglage « Effets visuels » du jeu, en plus de la préférence du système
  const level = () => (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'none' : (typeof Settings !== 'undefined' ? Settings.fx : 'full');
  const reduced = () => level() === 'none';
  const scale = n => Math.round(n * (level() === 'reduced' ? 0.3 : 1));

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  }
  addEventListener('resize', resize);
  resize();

  const CHIP = [['#f4f1e8', '#2b5cb8'], ['#c8202c', '#fff'], ['#1f8a4c', '#fff'], ['#1b1b1b', '#e9c46a'], ['#5b2a86', '#f4d35e']];
  const CONF = ['#F2D675', '#D4AF37', '#ff5d6c', '#4F86F7', '#6be39a', '#ffffff', '#c084fc'];

  function add(p) { parts.push(p); if (!raf) raf = requestAnimationFrame(tick); }

  // Pièce d'or ou jeton : un disque qui tourne sur lui-même (aplati selon cos)
  function drawCoin(p) {
    const w = Math.abs(Math.cos(p.spin)) * p.r;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.kind === 'coin') {
      ctx.fillStyle = '#8a6418';
      ctx.beginPath(); ctx.ellipse(0, p.r * 0.12, Math.max(1, w), p.r, 0, 0, 7); ctx.fill();
      const g = ctx.createLinearGradient(-p.r, -p.r, p.r, p.r);
      g.addColorStop(0, '#fff3b0'); g.addColorStop(0.45, '#f2c94c'); g.addColorStop(1, '#b8860b');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, w), p.r, 0, 0, 7); ctx.fill();
      if (w > p.r * 0.45) { ctx.strokeStyle = 'rgba(120,80,0,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.68, p.r * 0.68, 0, 0, 7); ctx.stroke(); }
    } else {
      const [face, edge] = p.colors;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(0, p.r * 0.16, Math.max(1, w), p.r, 0, 0, 7); ctx.fill();
      ctx.fillStyle = face;
      ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, w), p.r, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = p.r * 0.28; ctx.setLineDash([p.r * 0.35, p.r * 0.35]);
      ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, w * 0.82), p.r * 0.82, 0, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
  function drawConfetti(p) {
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.scale(1, Math.cos(p.spin));
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
    ctx.restore();
  }

  let last = 0;
  function tick(t) {
    const dt = Math.min(0.033, last ? (t - last) / 1000 : 0.016);
    last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const H = innerHeight;
    parts = parts.filter(p => {
      p.life -= dt;
      p.vy += p.g * dt;
      p.vx *= p.drag; p.vy *= p.kind === 'confetti' ? 0.985 : 1;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt; p.spin += p.vs * dt;
      // rebond sur le bas de l'écran pour les pièces
      if (p.kind !== 'confetti' && p.y > H - 20 && p.vy > 0 && !p.bounced) { p.vy *= -0.35; p.vx *= 0.6; p.bounced = true; }
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      (p.kind === 'confetti' ? drawConfetti : drawCoin)(p);
      return p.life > 0 && p.y < H + 60;
    });
    ctx.globalAlpha = 1;
    if (parts.length) raf = requestAnimationFrame(tick);
    else { raf = 0; last = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  return {
    // Gerbe de pièces depuis un point (gain)
    burst(x, y, n = 18, kind = 'coin') {
      if (reduced()) return;
      n = scale(Math.min(n, 80));
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (R() - 0.5) * 1.9, v = 380 + R() * 520;
        add({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1500, drag: 0.995, r: 7 + R() * 6, rot: R() * 6, vr: (R() - 0.5) * 4, spin: R() * 6, vs: 8 + R() * 14, life: 1.6 + R() * 0.8, colors: CHIP[Math.floor(R() * CHIP.length)] });
      }
    },
    // Pluie de jetons et de pièces sur tout l'écran (gros coup)
    rain(n = 70) {
      if (reduced() || level() === 'reduced') return;
      for (let i = 0; i < n; i++) {
        const kind = R() < 0.55 ? 'coin' : 'chip';
        add({ kind, x: R() * innerWidth, y: -20 - R() * innerHeight * 0.6, vx: (R() - 0.5) * 80, vy: 150 + R() * 250, g: 900, drag: 1, r: 9 + R() * 8, rot: R() * 6, vr: (R() - 0.5) * 3, spin: R() * 6, vs: 6 + R() * 10, life: 3.2, colors: CHIP[Math.floor(R() * CHIP.length)] });
      }
    },
    // Confettis (table gagnée, victoire)
    confetti(n = 140) {
      if (reduced()) return;
      n = scale(n);
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const x = side < 0 ? -10 : innerWidth + 10, y = innerHeight * (0.55 + R() * 0.3);
        const a = side < 0 ? -Math.PI / 3 - R() * 0.5 : -Math.PI * 2 / 3 + R() * 0.5, v = 700 + R() * 600;
        add({ kind: 'confetti', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 700, drag: 0.985, r: 4 + R() * 4, rot: R() * 6, vr: (R() - 0.5) * 10, spin: R() * 6, vs: 6 + R() * 10, life: 3 + R(), color: CONF[Math.floor(R() * CONF.length)] });
      }
    },
    // Arrête tout (ex. en entrant au Comptoir : rien ne doit cacher les cartes)
    clear() { parts = []; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); },
    // Point de départ : le centre d'un élément
    from(el) {
      if (!el) return [innerWidth / 2, innerHeight / 2];
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    },
  };
})();

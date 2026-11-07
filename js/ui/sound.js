// Sons synthétisés en direct (Web Audio) — aucun fichier audio
const Sfx = (() => {
  let ctx = null, master = null;
  const settings = { on: true, volume: 0.6 };
  Object.assign(settings, Storage.get('boubouzino.sound', {}));
  const save = () => Storage.set('boubouzino.sound', settings);

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.value = settings.volume;
    return ctx;
  }
  function tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, slide = 0 } = {}) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, { vol = 0.2, at = 0, freq = 3000, q = 0.8 } = {}) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + at;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (RNG.fx.next() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }
  const SOUNDS = {
    click: () => tone(900, 0.05, { type: 'triangle', vol: 0.12 }),
    deal: () => noise(0.12, { vol: 0.35, freq: 2500 }),
    flip: () => { noise(0.06, { vol: 0.25, freq: 4000 }); tone(500, 0.05, { type: 'triangle', vol: 0.05, at: 0.03 }); },
    chip: () => { tone(2400, 0.06, { type: 'triangle', vol: 0.12 }); tone(3100, 0.05, { type: 'triangle', vol: 0.08, at: 0.035 }); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.18, at: i * 0.08 })),
    bigwin: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3, { type: 'square', vol: 0.08, at: i * 0.07 })); SOUNDS.coins(); },
    lose: () => { tone(220, 0.3, { type: 'sawtooth', vol: 0.07, slide: 0.6 }); tone(165, 0.35, { type: 'sine', vol: 0.15, at: 0.12, slide: 0.7 }); },
    push: () => tone(440, 0.18, { type: 'triangle', vol: 0.12 }),
    tick: () => tone(1800, 0.025, { type: 'square', vol: 0.05 }),
    // Arrêt d'un rouleau : la note monte d'un rouleau à l'autre
    stopn: (k = 0) => { noise(0.07, { vol: 0.28, freq: 700 }); tone(196 * Math.pow(2, k * 2 / 12), 0.12, { type: 'triangle', vol: 0.18 }); },
    // Pelote posée : carillon qui monte
    scatter: (k = 0) => [0, 4, 7, 12].forEach((s, i) => tone(660 * Math.pow(2, (s + k * 3) / 12), 0.18, { type: 'sine', vol: 0.12, at: i * 0.05 })),
    // Suspense : un son qui monte pendant qu'un rouleau tourne plus longtemps
    antic: () => { tone(220, 1.6, { type: 'sawtooth', vol: 0.04, slide: 3 }); tone(330, 1.6, { type: 'triangle', vol: 0.05, slide: 3 }); },
    tier: (k = 0) => { [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * Math.pow(2, (s + k * 5) / 12), 0.25, { type: 'square', vol: 0.07, at: i * 0.06 })); SOUNDS.coins(); },
    reelstop: () => { noise(0.08, { vol: 0.3, freq: 600 }); tone(140, 0.1, { vol: 0.2 }); },
    coins: () => { for (let i = 0; i < 6; i++) tone(2000 + RNG.fx.next() * 1600, 0.08, { type: 'triangle', vol: 0.07, at: i * 0.05 }); },
    buy: () => { tone(1318, 0.09, { type: 'square', vol: 0.06 }); tone(1760, 0.25, { type: 'square', vol: 0.06, at: 0.08 }); SOUNDS.coins(); },
    // Déclenchement d'un joker dans le panneau de score : la note monte à chaque étape
    step: (k = 0) => { const f = 523 * Math.pow(2, Math.min(k, 14) / 12); tone(f, 0.09, { type: 'square', vol: 0.07 }); tone(f * 1.5, 0.12, { type: 'triangle', vol: 0.08, at: 0.03 }); },
    joker: () => { tone(880, 0.12, { type: 'triangle', vol: 0.12, slide: 1.5 }); tone(1320, 0.15, { type: 'sine', vol: 0.1, at: 0.06 }); },
    error: () => tone(160, 0.2, { type: 'square', vol: 0.06 }),
    boom: () => { tone(70, 0.6, { type: 'sine', vol: 0.5, slide: 0.5 }); tone(110, 0.45, { type: 'triangle', vol: 0.2, slide: 0.6 }); noise(0.35, { vol: 0.25, freq: 180, q: 0.6 }); setTimeout(() => SOUNDS.coins(), 150); },
    roll: () => { for (let i = 0; i < 5; i++) noise(0.05, { vol: 0.2, at: i * 0.06, freq: 1200 + i * 200 }); },
    fanfare: () => [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { type: 'square', vol: 0.07, at: i * 0.12 })),
    gameover: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, { type: 'triangle', vol: 0.15, at: i * 0.18 })),
  };
  return {
    settings,
    play(name, arg) {
      if (!settings.on || !SOUNDS[name]) return;
      try { SOUNDS[name](arg); } catch (e) { /* audio indisponible */ }
    },
    toggle() { settings.on = !settings.on; save(); return settings.on; },
    setVolume(v) { settings.volume = v; save(); if (master) master.gain.value = v; },
  };
})();

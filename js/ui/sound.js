// Sons synthétisés en direct (Web Audio) — aucun fichier audio
const Sfx = (() => {
  let ctx = null, master = null;
  const settings = { on: true, volume: 0.6, music: true };
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
  const Music = (() => {
    let timer = null, step = 0, next = 0, bus = null, mode = 'normal';
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    // Ré m7 – Sol 7 – Do maj7 – La 7 : une grille de jazz de casino
    const CH = [[62, 65, 69, 72], [67, 71, 74, 77], [60, 64, 67, 71], [57, 61, 64, 67]];
    function note(m, t, dur, type, vol) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = mtof(m);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
    }
    function hat(t, vol) {
      const len = 0.03, b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (RNG.fx.next() * 2 - 1) * (1 - i / d.length);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = b; f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = vol;
      s.connect(f); f.connect(g); g.connect(bus); s.start(t);
    }
    function tick() {
      if (!ctx) return;
      const bonus = mode === 'bonus', bpm = bonus ? 124 : 90, e = 60 / bpm / 2;
      while (next < ctx.currentTime + 0.25) {
        const bar = Math.floor(step / 8) % 4, s8 = step % 8, ch = CH[bar];
        if (s8 === 0) ch.forEach(m => note(m - 12, next, e * 7.5, 'sine', 0.035));            // nappe
        if (s8 === 0 || s8 === 4) note(ch[0] - 24, next, e * 1.8, 'triangle', 0.12);           // basse
        if (s8 === 3 || s8 === 6) ch.slice(1).forEach(m => note(m, next, e * 0.9, 'triangle', 0.025)); // accords
        hat(next, s8 % 2 ? 0.02 : 0.035);
        if (bonus) note(ch[s8 % 4] + 12, next, e * 0.8, 'square', 0.018);                      // arpège du bonus
        step++; next += e;
      }
    }
    return {
      start() {
        if (timer || !settings.music || !settings.on || !ac()) return;
        if (!bus) { bus = ctx.createGain(); bus.gain.value = 0.55; bus.connect(master); }
        next = ctx.currentTime + 0.1;
        timer = setInterval(tick, 100);
      },
      stop() { clearInterval(timer); timer = null; },
      mode(m) { mode = m || 'normal'; },
    };
  })();
  // la musique démarre au premier geste (règle des navigateurs)
  document.addEventListener('pointerdown', () => Music.start(), { once: true });
  document.addEventListener('keydown', () => Music.start(), { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) Music.stop(); else if (ctx) Music.start(); });

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
    toggle() { settings.on = !settings.on; save(); if (settings.on) Music.start(); else Music.stop(); return settings.on; },
    setVolume(v) { settings.volume = v; save(); if (master) master.gain.value = v; },
    // Musique d'ambiance : boucle lounge synthétisée (90 BPM), plus rapide et plus riche pendant un bonus
    music(mode) { Music.mode(mode); },
    setMusic(on) { settings.music = on; save(); if (on) Music.start(); else Music.stop(); },
  };
})();

// Démarrage : solde, son, décor, écran titre
(() => {
  const balEl = document.getElementById('balance');
  const resetBtn = document.getElementById('reset');
  Wallet.onChange(b => {
    balEl.textContent = Util.fmt(b);
    balEl.classList.remove('bump'); void balEl.offsetWidth; balEl.classList.add('bump');
    resetBtn.classList.toggle('pulse', b < 5 && Wallet.mode() === 'free');
    if (Run.state && Run.state.phase === 'play') UI.renderRunBar();
  });
  resetBtn.onclick = () => {
    if (confirm(`Remettre le solde à ${Util.fmt(Wallet.START)} jetons ?`)) Wallet.reset();
  };

  const snd = document.getElementById('sound');
  const paintSound = () => (snd.textContent = Sfx.settings.on ? '🔊' : '🔇');
  snd.onclick = () => { Sfx.toggle(); paintSound(); Sfx.play('click'); };
  paintSound();

  // Râtelier de jetons du croupier (décor)
  document.querySelectorAll('.rack').forEach(rack => {
    [500, 100, 25, 5, 1, 1, 5, 25, 100, 500].forEach(v => {
      const col = Util.el('div', 'rack-col');
      for (let i = 0; i < 9; i++) col.appendChild(Util.el('div', `rack-chip chip-${v}`));
      rack.appendChild(col);
    });
  });
  // Ampoules de la machine à sous
  const lights = document.getElementById('sl-lights');
  for (let i = 0; i < 28; i++) lights.appendChild(Util.el('i'));

  Cosmetics.apply();
  let saved = 'uth';
  try { saved = localStorage.getItem('casino.tab') || 'uth'; } catch (e) { /* ignore */ }
  UI.showTab(document.getElementById(saved) ? saved : 'uth');
  UI.renderMenu();
  UI.renderRunBar();
  UI.screen('menu');
})();

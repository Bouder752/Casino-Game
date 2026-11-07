// Démarrage de l'interface
(() => {
  const snd = document.getElementById('sound');
  const paintSound = () => (snd.textContent = Sfx.settings.on ? '🔊' : '🔇');
  snd.onclick = () => { Sfx.toggle(); paintSound(); Sfx.play('click'); };
  paintSound();

  // Décor : râtelier de jetons du croupier, ampoules de la machine à sous
  document.querySelectorAll('.rack').forEach(rack => {
    [500, 100, 25, 5, 1, 1, 5, 25, 100, 500].forEach(v => {
      const col = Util.el('div', 'rack-col');
      for (let i = 0; i < 9; i++) col.appendChild(Util.el('div', `rack-chip chip-${v}`));
      rack.appendChild(col);
    });
  });
  const lights = document.getElementById('sl-lights');
  for (let i = 0; i < 28; i++) lights.appendChild(Util.el('i'));

  Cosmetics.apply();
  const saved = Storage.get('casino.tab', 'bj');
  UI.showTab(document.getElementById(saved) ? saved : 'uth');
  App.attach(null);
  UI.renderMenu();
  UI.screen('menu');
  // Simulation accessible depuis la console : Sim.run(1000)
  console.info('Boubouz\'ino — simulation : Sim.run(1000) · seed : Sim.playRun("MA-SEED")');
})();

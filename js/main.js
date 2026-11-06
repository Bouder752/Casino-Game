// Navigation, solde et réinitialisation
(() => {
  const balEl = document.getElementById('balance');
  const resetBtn = document.getElementById('reset');
  Wallet.onChange(b => {
    balEl.textContent = Util.fmt(b);
    balEl.classList.remove('bump'); void balEl.offsetWidth; balEl.classList.add('bump');
    resetBtn.classList.toggle('pulse', b < 5);
  });
  resetBtn.onclick = () => {
    if (confirm(`Remettre le solde à ${Util.fmt(Wallet.START)} jetons ?`)) Wallet.reset();
  };

  const tabs = [...document.querySelectorAll('.tab')];
  function show(id) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    document.querySelectorAll('.game').forEach(g => (g.hidden = g.id !== id));
    try { localStorage.setItem('casino.tab', id); } catch (e) { /* ignore */ }
  }
  tabs.forEach(t => (t.onclick = () => show(t.dataset.tab)));
  let saved = 'uth';
  try { saved = localStorage.getItem('casino.tab') || 'uth'; } catch (e) { /* ignore */ }
  show(document.getElementById(saved) ? saved : 'uth');
})();

// Râtelier de jetons du croupier (décor)
document.querySelectorAll('.rack').forEach(rack => {
  [500, 100, 25, 5, 1, 1, 5, 25, 100, 500].forEach(v => {
    const col = Util.el('div', 'rack-col');
    for (let i = 0; i < 9; i++) col.appendChild(Util.el('div', `rack-chip chip-${v}`));
    rack.appendChild(col);
  });
});

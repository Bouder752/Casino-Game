// Petits effets « jeu » : les cartes de joker s'inclinent vers la souris et
// flottent chacune à leur rythme. Purement décoratif (hasard de RNG.fx).
(() => {
  const MAX = 14; // degrés
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('.jcard');
    if (!c || e.pointerType === 'touch') return;
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    c.style.setProperty('--ry', `${(x * MAX).toFixed(1)}deg`);
    c.style.setProperty('--rx', `${(-y * MAX).toFixed(1)}deg`);
  });
  document.addEventListener('pointerout', e => {
    const c = e.target.closest && e.target.closest('.jcard');
    if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }
  });
  // Chaque nouvelle carte reçoit un décalage d'animation : elles ne flottent pas en même temps
  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    const cards = n.classList && n.classList.contains('jcard') ? [n] : n.querySelectorAll ? n.querySelectorAll('.jcard') : [];
    cards.forEach(c => c.style.setProperty('--d', `${(-RNG.fx.next() * 3.4).toFixed(2)}s`));
  }))).observe(document.body, { childList: true, subtree: true });
})();

// Progression permanente partagée par l'interface et le moteur, et cosmétiques
const META = Engine.loadMeta();
const saveMeta = () => Storage.set('boubouzino.meta', META);

const Cosmetics = (() => {
  const FELTS = [
    { id: 'felt-vert', name: 'Vert classique', price: 0, c: ['#1c7a4a', '#0d5233', '#072d1c'] },
    { id: 'felt-bleu', name: 'Bleu Monte-Carlo', price: 4, c: ['#1f5f9c', '#123c6b', '#081c36'] },
    { id: 'felt-bordeaux', name: 'Bordeaux velours', price: 4, c: ['#8a1f2e', '#5c111d', '#2e070d'] },
    { id: 'felt-violet', name: 'Violet royal', price: 8, c: ['#5f2a96', '#3d1866', '#1d0a33'] },
    { id: 'felt-noir', name: 'Noir & or', price: 12, c: ['#2b2b2e', '#18181a', '#09090a'] },
    { id: 'felt-turquoise', name: 'Lagon', price: 8, c: ['#14857f', '#0a5753', '#042b29'] },
  ];
  const BACKS = [
    { id: 'back-bordeaux', name: 'Bordeaux', price: 0, c: ['#9e1b2a', '#d65a68', '#f3c6cb', '#7a1220'] },
    { id: 'back-bleu', name: 'Bleu royal', price: 4, c: ['#1d3f8f', '#5679d0', '#c9d7ff', '#122a63'] },
    { id: 'back-emeraude', name: 'Émeraude', price: 6, c: ['#11683f', '#3fae76', '#c4f0d8', '#0a4228'] },
    { id: 'back-noir', name: 'Noir & or', price: 10, c: ['#161616', '#8a6d2a', '#e8c66a', '#000'] },
    { id: 'back-rose', name: 'Flamant rose', price: 6, c: ['#c2457c', '#ec8ab4', '#ffe0ee', '#8e2556'] },
  ];
  const all = () => [...FELTS, ...BACKS];
  const owned = id => META.unlocked.includes(id);
  function apply() {
    const f = FELTS.find(x => x.id === META.felt) || FELTS[0];
    const r = document.documentElement.style;
    r.setProperty('--felt-1', f.c[0]); r.setProperty('--felt-2', f.c[1]); r.setProperty('--felt-3', f.c[2]);
  }
  const back = () => BACKS.find(x => x.id === META.back) || BACKS[0];
  function buy(id) {
    const it = all().find(x => x.id === id);
    if (!it || owned(id) || META.prestige < it.price) return false;
    META.prestige -= it.price;
    META.unlocked.push(id);
    saveMeta();
    return true;
  }
  function select(id) {
    if (!owned(id)) return;
    if (id.startsWith('felt')) META.felt = id; else META.back = id;
    saveMeta(); apply();
    document.querySelectorAll('.card .face.back').forEach(f => (f.innerHTML = CardArt.back()));
  }
  return { FELTS, BACKS, owned, apply, back, buy, select };
})();

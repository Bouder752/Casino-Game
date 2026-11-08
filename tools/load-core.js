// Charge le moteur (sans DOM) dans un contexte Node isolé
const fs = require('fs');
const path = require('path');
const vm = require('vm');
module.exports = function loadCore() {
  const root = path.join(__dirname, '..');
  const ctx = vm.createContext({ console, crypto: globalThis.crypto, Date, Math, JSON });
  // Les déclarations « const » de premier niveau sont partagées entre scripts d'un même contexte
  const src = require('./core-files').map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n');
  vm.runInContext(src + '\n;this.__api = { Engine, Games, Sim, RNG, CONFIG, JOKERS, JOKER_DEFS, CATALOG, Deck, BlackjackEngine, UNLOCKS, STAKES, Machines };', ctx, { filename: 'core.js' });
  return ctx.__api;
};

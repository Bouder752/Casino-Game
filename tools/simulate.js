#!/usr/bin/env node
// Usage : node tools/simulate.js [parties=1000] [seed=SIM] [jeu=mixed|bj|uth|dice|roulette|slots]
const { Sim } = require('./load-core')();
const [n = '1000', seed = 'SIM', game = 'mixed'] = process.argv.slice(2);
Sim.run(+n, { seed, game });

#!/usr/bin/env node
// Usage : node tools/simulate.js [parties=1000] [seed=SIM] [stratégie=sniper|blackjack|bj|uth|dice|roulette|slots]
const { Sim } = require('./load-core')();
const [n = '1000', seed = 'SIM', strat = 'sniper'] = process.argv.slice(2);
const opts = { seed };
if (strat === 'blackjack' || strat === 'sniper') opts.strategy = strat; else { opts.strategy = 'blackjack'; opts.game = strat; }
Sim.run(+n, opts);

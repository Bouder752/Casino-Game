// Interface : écrans (menu, jeu, shop, cosmétiques), barre de jokers, fenêtres
const UI = (() => {
  const $ = id => document.getElementById(id);
  const el = Util.el;
  let tab = 'uth';
  const GAMES = { uth: 'Hold\'em', bj: 'Blackjack', roulette: 'Roulette', slots: 'Machine', dice: 'Dice' };

  // ---------- Écrans et onglets ----------
  function screen(name) {
    ['menu', 'game', 'shop', 'cosmetics'].forEach(n => ($('screen-' + n).hidden = n !== name));
    document.body.dataset.screen = name;
    closePopover();
    window.scrollTo(0, 0);
  }
  function showTab(id) {
    tab = id;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    document.querySelectorAll('.game').forEach(g => (g.hidden = g.id !== id));
    try { localStorage.setItem('casino.tab', id); } catch (e) { /* ignore */ }
    renderConsumables();
  }
  document.querySelectorAll('.tab').forEach(t => (t.onclick = () => { Sfx.play('click'); showTab(t.dataset.tab); }));

  function refreshGames() {
    BetControls.forEach(b => b.refresh());
    Roulette.refresh(); Slots.refresh(); Dice.update(); Blackjack.refresh();
  }

  // ---------- Fenêtres, bulles, toasts ----------
  function modal(html, buttons = [], cls = '') {
    const box = $('modal-box');
    box.className = 'modal-box ' + cls;
    box.innerHTML = html;
    if (buttons.length) {
      const row = el('div', 'modal-actions');
      buttons.forEach(([label, fn, c = '']) => {
        const b = el('button', 'btn ' + c, label);
        b.onclick = () => { Sfx.play('click'); if (fn() !== false) closeModal(); };
        row.appendChild(b);
      });
      box.appendChild(row);
    }
    $('modal').hidden = false;
    return box;
  }
  function closeModal() { $('modal').hidden = true; }
  function toast(text) {
    const t = el('div', 'toast', text);
    $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  }
  function popover(anchor, html, buttons) {
    const p = $('popover');
    p.innerHTML = html;
    const row = el('div', 'pop-actions');
    buttons.forEach(([label, fn, c = '', dis]) => {
      const b = el('button', 'btn small ' + c, label);
      b.disabled = !!dis;
      b.onclick = e => { e.stopPropagation(); Sfx.play('click'); fn(); closePopover(); };
      row.appendChild(b);
    });
    if (buttons.length) p.appendChild(row);
    p.hidden = false;
    const r = anchor.getBoundingClientRect();
    const w = Math.min(280, window.innerWidth - 32);
    p.style.width = w + 'px';
    p.style.left = Math.max(16, Math.min(window.innerWidth - w - 16, r.left + r.width / 2 - w / 2)) + 'px';
    p.style.top = (r.bottom + window.scrollY + 8) + 'px';
  }
  function closePopover() { $('popover').hidden = true; }
  document.addEventListener('click', e => { if (!e.target.closest('#popover, .jcard, .ccard')) closePopover(); });

  // ---------- Cartes de joker / objets ----------
  function itemCard(id, { uid, price, onClick, disabled } = {}) {
    const d = CATALOG[id];
    const isJoker = JOKERS.includes(d);
    const e = el('div', 'jcard ' + (isJoker ? 'r-' + d.rarity : CONSUMABLES.includes(d) ? 'r-cons' : PACKS.includes(d) ? 'r-pack' : 'r-upgrade'));
    if (uid) e.dataset.uid = uid;
    e.innerHTML = `<div class="jc-icon">${d.icon}</div><div class="jc-name">${d.name}</div>` +
      (id === 'jackpot' ? `<div class="jc-badge">×${Meta.data.jackpot.toFixed(1)}</div>` : '') +
      (price !== undefined ? `<div class="jc-price">${price}</div>` : '');
    e.title = d.desc;
    if (disabled) e.classList.add('sold');
    if (onClick) e.onclick = ev => { ev.stopPropagation(); onClick(e); };
    return e;
  }
  const descHtml = id => {
    const d = CATALOG[id];
    const tag = JOKERS.includes(d) ? `<span class="tag r-${d.rarity}">${RARITY_LABEL[d.rarity]}</span>` :
      CONSUMABLES.includes(d) ? '<span class="tag r-cons">Consommable</span>' : PACKS.includes(d) ? '<span class="tag r-pack">Pack</span>' : '<span class="tag r-upgrade">Amélioration</span>';
    return `<div class="pop-title">${d.icon} ${d.name}</div>${tag}<p>${d.desc}</p>` +
      (id === 'jackpot' ? `<p class="pop-extra">Multiplicateur actuel : ×${Meta.data.jackpot.toFixed(1)}</p>` : '');
  };

  function renderJokers(container, sellable = true) {
    const st = Run.state;
    container.innerHTML = '';
    for (let i = 0; i < st.jokerSlots; i++) {
      const j = st.jokers[i];
      if (!j) { container.appendChild(el('div', 'jslot')); continue; }
      const disabled = st.boss === 'glacon' && CATALOG[j.id].rarity === 'commun' && st.phase === 'play';
      const c = itemCard(j.id, {
        uid: j.uid, onClick: node => popover(node, descHtml(j.id) + (j.id === 'miroir' ? `<p class="pop-extra">Copie : ${st.jokers[i + 1] ? CATALOG[st.jokers[i + 1].id].name : 'rien (aucun joker à droite)'}</p>` : ''), [
          ['◀', () => Run.moveJoker(j.uid, -1), '', i === 0],
          ['▶', () => Run.moveJoker(j.uid, 1), '', i === st.jokers.length - 1],
          [`Vendre (+${Math.floor(CATALOG[j.id].price / 2)})`, () => Run.sellJoker(j.uid), 'danger', !sellable],
        ]),
      });
      if (disabled) c.classList.add('frozen');
      container.appendChild(c);
    }
  }

  function renderConsumables() {
    const st = Run.state;
    const box = $('cons-slots');
    if (!st) return;
    box.innerHTML = '';
    for (let i = 0; i < st.consSlots; i++) {
      const id = st.consumables[i];
      if (!id) { box.appendChild(el('div', 'jslot small')); continue; }
      const c = itemCard(id, { onClick: node => popover(node, descHtml(id), [['Utiliser', () => useConsumable(i)], [`Vendre (+${Math.floor(CATALOG[id].price / 2)})`, () => { st.consumables.splice(i, 1); Wallet.give(Math.floor(CATALOG[id].price / 2)); Run.save(); Run.emit({ type: 'update' }); }, 'danger']]) });
      c.classList.add('ccard');
      const ctx = Casino.ctx(tab);
      if ((id === 'bonus' && !(ctx && ctx.bonusCard)) || (id === 'potdevin' && !(ctx && ctx.bribe))) c.classList.add('idle');
      box.appendChild(c);
    }
  }

  function useConsumable(i) {
    const r = Run.useConsumable(i, Casino.ctx(tab));
    if (!r.ok) { Sfx.play('error'); return toast(r.text || 'Impossible pour le moment.'); }
    if (r.text) toast(r.text);
    if (r.pickCard) cardPicker(r.pickCard, (Casino.ctx(tab) || {}).used || []);
  }
  function cardPicker(done, used) {
    const box = modal('<h2>Carte Bonus</h2><p>Choisis la carte à ajouter à ta main.</p><div class="picker"></div>', [['Annuler', () => {}]], 'wide');
    const grid = box.querySelector('.picker');
    for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) {
      const c = { rank: r, suit: s };
      const e = cardEl(c);
      const taken = used.some(u => u.rank === r && u.suit === s);
      if (taken) e.classList.add('taken');
      else e.onclick = () => { closeModal(); done(c); };
      grid.appendChild(e);
    }
  }

  // ---------- Barre d'infos de la manche ----------
  function renderRunBar() {
    const st = Run.state;
    const bar = $('run-bar');
    bar.hidden = !st;
    $('top-mode').textContent = st ? `Manche ${Math.min(st.manche, 99)}${st.manche <= Run.FINAL ? ' / ' + Run.FINAL : ' · infini'}` : 'Mode libre';
    $('reset').hidden = !!st;
    if (!st) return;
    renderJokers($('joker-slots'));
    renderConsumables();
    if (st.phase !== 'play' || !st.charges) return;
    const p = Run.profit();
    const pct = Math.max(0, Math.min(100, p / st.target * 100));
    const boss = st.boss ? BOSSES.find(b => b.id === st.boss) : null;
    const rules = (st.rules || []).map(id => WILD_RULES.find(r => r.id === id).desc);
    const charges = st.charges.any + st.charges.dice;
    $('run-info').innerHTML = `
      <div class="ri-block ri-manche"><span>Manche</span><b>${st.manche}${st.manche <= Run.FINAL ? `<small>/${Run.FINAL}</small>` : ''}</b></div>
      <div class="ri-block ri-goal">
        <span>Objectif : gagner <b>+${Util.fmt(st.target)}</b> jetons</span>
        <div class="goal-bar ${Run.objectiveMet() ? 'met' : ''}"><i style="width:${pct}%"></i></div>
        <small>${p >= 0 ? '+' : '−'}${Util.fmt(Math.abs(p))} / +${Util.fmt(st.target)}</small>
      </div>
      <div class="ri-block"><span>Tours</span><b class="${st.tours <= 2 ? 'low' : ''}">${st.tours}<small>/${st.toursMax}</small></b></div>
      <div class="ri-block"><span>Mise max</span><b>${Util.fmt(Run.maxBet('bj'))}</b></div>
      ${charges ? `<div class="ri-block"><span>Relances</span><b>${charges}</b></div>` : ''}
      ${st.golden ? '<div class="ri-chip">🪙 Jeton Doré actif</div>' : ''}
      ${st.lossStreak && Run.count('martingale') ? `<div class="ri-chip">📈 Martingale +${st.lossStreak * 25 * Run.count('martingale')} %</div>` : ''}
      ${boss ? `<div class="ri-chip boss" title="${boss.desc}">☠ ${boss.name} : ${boss.desc}</div>` : ''}
      ${rules.map(r => `<div class="ri-chip rule">🎡 ${r}</div>`).join('')}
      <div class="ri-actions">
        <button class="btn primary small" id="ri-cash" ${Run.objectiveMet() && !st.busy ? '' : 'disabled'}>Encaisser ➜ Shop</button>
      </div>`;
    $('ri-cash').onclick = () => {
      if (Run.state.busy) return toast('Termine le coup en cours.');
      Run.endManche(true);
    };
  }

  // ---------- Shop ----------
  function renderShop() {
    const st = Run.state;
    const root = $('shop');
    const next = Run.mancheCfg(st.manche);
    const sum = st.summary;
    root.innerHTML = `
      <div class="shop-head">
        <h2>Le Comptoir</h2>
        ${sum ? `<div class="shop-summary">
          <div class="ss-title">${sum.victory ? '🏆 Manche finale remportée !' : `Manche ${sum.manche} remportée`}</div>
          ${sum.lines.map(l => `<div class="ss-line"><span>${l[0]}</span><b>+${Util.fmt(l[1])}</b></div>`).join('')}
          ${sum.caught.map(n => `<div class="ss-line bad"><span>🃏 Tricheur pris la main dans le sac : ${n} confisqué</span></div>`).join('')}
        </div>` : ''}
      </div>
      <div class="shop-body">
        <div class="shop-offers">
          <div class="shop-row-title">Jokers</div>
          <div class="shop-row" id="shop-jokers"></div>
          <div class="shop-row-title">Consommables · Packs · Améliorations</div>
          <div class="shop-row" id="shop-items"></div>
        </div>
        <div class="shop-side">
          <div class="ss-bal"><span class="wallet-chip"></span>${Util.fmt(Wallet.get())}</div>
          <div class="ss-next">
            <div>Prochaine manche : <b>${st.manche}${st.manche <= Run.FINAL ? '/' + Run.FINAL : ''}</b></div>
            <div>Objectif : <b>+${Util.fmt(next.target)}</b> en ${next.tours} tours</div>
            <div>Mise max : <b>${Util.fmt(Math.round(next.maxBet * (st.upgrades.includes('vip') ? 1.5 : 1)))}</b></div>
            ${next.boss ? '<div class="boss-warn">☠ Manche du Patron</div>' : ''}
          </div>
          <button class="btn" id="shop-reroll">🔄 Relancer le shop (${st.shop.rerollCost})</button>
          <button class="btn" id="shop-slot" ${Run.slotPrice() ? '' : 'disabled'}>➕ Emplacement de joker ${Run.slotPrice() ? `(${Run.slotPrice()})` : '(max)'}</button>
          <button class="btn primary big" id="shop-next">Manche suivante ➜</button>
        </div>
      </div>
      <div class="shop-owned">
        <div class="shop-row-title">Tes jokers (${st.jokers.length}/${st.jokerSlots}) — touche un joker pour le déplacer ou le vendre</div>
        <div class="joker-slots" id="shop-owned-jokers"></div>
        <div class="shop-row-title">Consommables (${st.consumables.length}/${st.consSlots}) · Améliorations</div>
        <div class="shop-row small" id="shop-owned-items"></div>
      </div>`;
    const offer = (o, i) => itemCard(o.id, {
      price: o.sold ? 'vendu' : o.price, disabled: o.sold,
      onClick: node => { if (o.sold) return; popover(node, descHtml(o.id), [[`Acheter (${o.price})`, () => buy(i), 'primary', !Wallet.canAfford(o.price)]]); },
    });
    st.shop.offers.forEach((o, i) => $(o.kind === 'joker' ? 'shop-jokers' : 'shop-items').appendChild(offer(o, i)));
    renderJokers($('shop-owned-jokers'));
    const owned = $('shop-owned-items');
    st.consumables.forEach((id, i) => owned.appendChild(itemCard(id, { onClick: node => popover(node, descHtml(id), [['Utiliser', () => useConsumable(i)]]) })));
    st.upgrades.forEach(id => owned.appendChild(itemCard(id, { onClick: node => popover(node, descHtml(id), []) })));
    $('shop-reroll').onclick = () => Run.reroll();
    $('shop-slot').onclick = () => Run.buySlot();
    $('shop-next').onclick = () => { Sfx.play('click'); Run.nextManche(); };
  }
  function buy(i) {
    const r = Run.buy(i);
    if (r && r.pack) openPack(r.pack);
  }
  function openPack(ids) {
    const box = modal(`<h2>${ids.length > 1 ? 'Petit pack' : 'Pack mystère'}</h2><p>${ids.length > 1 ? 'Choisis un joker :' : 'Ton joker :'}</p><div class="pack-cards"></div>`, ids.length > 1 ? [['Passer', () => {}]] : []);
    const row = box.querySelector('.pack-cards');
    ids.forEach(id => {
      const wrap = el('div', 'pack-choice');
      wrap.appendChild(itemCard(id));
      wrap.appendChild(el('p', '', CATALOG[id].desc));
      const b = el('button', 'btn primary small', 'Prendre');
      b.onclick = () => { Run.addJoker(id); Sfx.play('joker'); closeModal(); };
      wrap.appendChild(b);
      row.appendChild(wrap);
    });
  }

  // ---------- Menu, cosmétiques, aide ----------
  function renderMenu() {
    $('m-continue').hidden = !Run.hasSave();
    $('m-prestige').textContent = `✦ ${Meta.data.prestige}`;
    $('m-stats').innerHTML = `Meilleure manche : <b>${Meta.data.best}</b> · Parties : <b>${Meta.data.runs}</b> · Victoires : <b>${Meta.data.wins}</b> · Jackpot Éternel : <b>×${Meta.data.jackpot.toFixed(1)}</b>`;
  }
  function renderCosmetics() {
    const root = $('cosmetics');
    const item = it => {
      const owned = Cosmetics.owned(it.id), sel = Meta.data.felt === it.id || Meta.data.back === it.id;
      const prev = it.id.startsWith('felt')
        ? `<div class="cos-felt" style="background:radial-gradient(circle at 50% 40%, ${it.c[0]}, ${it.c[1]} 60%, ${it.c[2]})"></div>`
        : `<div class="cos-back" style="background:repeating-linear-gradient(45deg, ${it.c[0]} 0 6px, ${it.c[1]} 6px 8px);border-color:${it.c[2]}"><span style="background:${it.c[3]}">B</span></div>`;
      return `<div class="cos-item ${sel ? 'sel' : ''}" data-id="${it.id}">${prev}<div class="cos-name">${it.name}</div>
        <button class="btn small ${owned ? '' : 'primary'}" ${!owned && Meta.data.prestige < it.price ? 'disabled' : ''}>${sel ? 'Équipé' : owned ? 'Équiper' : `✦ ${it.price}`}</button></div>`;
    };
    root.innerHTML = `<div class="cos-head"><h2>Cosmétiques</h2><div class="prestige-badge big">✦ ${Meta.data.prestige} prestige</div>
      <p>Le prestige se gagne en mode roguelike : ✦1 par manche remportée, ✦5 de plus pour la manche finale.</p></div>
      <h3>Tapis</h3><div class="cos-grid">${Cosmetics.FELTS.map(item).join('')}</div>
      <h3>Dos de cartes</h3><div class="cos-grid">${Cosmetics.BACKS.map(item).join('')}</div>
      <div class="cos-foot"><button class="btn big" id="cos-back">⬅ Retour</button></div>`;
    root.querySelectorAll('.cos-item').forEach(n => {
      n.querySelector('button').onclick = () => {
        const id = n.dataset.id;
        if (!Cosmetics.owned(id)) { if (!Cosmetics.buy(id)) return Sfx.play('error'); Sfx.play('buy'); }
        else Sfx.play('click');
        Cosmetics.select(id);
        renderCosmetics();
      };
    });
    $('cos-back').onclick = () => { renderMenu(); screen('menu'); };
  }
  function howTo() {
    modal(`<h2>Comment jouer</h2>
      <ul class="howto">
        <li>Tu démarres avec <b>100 jetons</b>. Chaque <b>manche</b> te donne un nombre de <b>tours</b> (une main, un tirage ou un lancer = 1 tour) pour gagner un <b>objectif</b> de jetons.</li>
        <li>Tu peux jouer aux 5 jeux comme tu veux pendant la manche, dans la limite de la <b>mise max</b>.</li>
        <li>Objectif atteint : encaisse tout de suite (bonus de 2 jetons par tour restant) ou continue à jouer. Si tes tours s'épuisent avant l'objectif, ou si tu tombes à 0, c'est perdu.</li>
        <li>Entre les manches, le <b>Comptoir</b> vend des <b>jokers</b> qui changent les règles, des consommables, des packs et des améliorations de table. L'ordre des jokers compte (le Miroir copie son voisin de droite).</li>
        <li>Toutes les 3 manches, un <b>Patron</b> impose un malus. Survis aux ${Run.FINAL} manches pour gagner, puis continue en mode infini.</li>
      </ul>`, [['Compris !', () => {}, 'primary']]);
  }

  function mancheIntro() {
    const st = Run.state;
    const boss = st.boss ? BOSSES.find(b => b.id === st.boss) : null;
    const rules = (st.rules || []).map(id => WILD_RULES.find(r => r.id === id).desc);
    modal(`<div class="intro"><div class="intro-n">Manche ${st.manche}${st.manche <= Run.FINAL ? ' / ' + Run.FINAL : ''}</div>
      <div class="intro-goal">Gagne <b>+${Util.fmt(st.target)}</b> jetons en <b>${st.tours}</b> tours</div>
      <div>Mise max : <b>${Util.fmt(Run.maxBet('bj'))}</b> · Solde : <b>${Util.fmt(Wallet.get())}</b></div>
      ${boss ? `<div class="intro-boss">☠ Manche du Patron — <b>${boss.name}</b><br>${boss.desc}</div>` : ''}
      ${rules.map(r => `<div class="intro-rule">🎡 La Roue Folle : ${r}</div>`).join('')}</div>`, [['C\'est parti !', () => {}, 'primary big']], 'intro-box');
  }

  // ---------- Événements du moteur ----------
  let jokerSoundAt = 0;
  Run.on(ev => {
    switch (ev.type) {
      case 'manche':
        screen('game'); renderRunBar(); refreshGames(); mancheIntro(); break;
      case 'update': case 'ctx':
        renderRunBar();
        if (Run.state && Run.state.phase === 'shop' && !$('screen-shop').hidden) renderShop();
        break;
      case 'shop':
        closeModal(); renderRunBar(); renderShop(); screen('shop');
        if (Run.state.summary && Run.state.summary.victory) {
          modal(`<div class="intro"><div class="intro-n">🏆 Victoire !</div><p>Tu as fait sauter la banque du Boubouz'ino en ${Run.FINAL} manches.</p><p>✦ +6 prestige</p></div>`,
            [['Continuer en mode infini', () => {}, 'primary'], ['Terminer la partie', () => { Run.clearSave(); Run.quit(); }]], 'intro-box');
        }
        break;
      case 'over': {
        const st = Run.state;
        modal(`<div class="intro"><div class="intro-n lose">Partie terminée</div><p>${st.reason}</p>
          <div class="over-stats"><div><span>Manche atteinte</span><b>${st.manche}</b></div><div><span>Coups joués</span><b>${st.stats.plays}</b></div>
          <div><span>Victoires</span><b>${st.stats.wins}</b></div><div><span>Plus gros gain</span><b>${Util.fmt(st.stats.best)}</b></div></div>
          <div class="over-jokers">${st.jokers.map(j => CATALOG[j.id].icon).join(' ')}</div></div>`,
        [['Nouvelle partie', () => { Run.newRun(); }, 'primary'], ['Menu principal', () => { Run.quit(); }]], 'intro-box');
        break;
      }
      case 'quit': renderMenu(); screen('menu'); renderRunBar(); refreshGames(); break;
      case 'toast': toast(ev.text); break;
      case 'joker': {
        document.querySelectorAll(`.jcard[data-uid="${ev.uid}"]`).forEach(n => {
          n.classList.remove('trigger'); void n.offsetWidth; n.classList.add('trigger');
          const f = el('div', 'jc-float', ev.text);
          n.appendChild(f);
          setTimeout(() => f.remove(), 1200);
        });
        if (Date.now() - jokerSoundAt > 150) { Sfx.play('joker'); jokerSoundAt = Date.now(); }
        break;
      }
    }
  });

  // ---------- Boutons du menu ----------
  $('m-new').onclick = () => {
    Sfx.play('click');
    if (Run.hasSave() && !confirm('Une partie est en cours. La remplacer par une nouvelle ?')) return;
    Run.clearSave(); Run.newRun();
  };
  $('m-continue').onclick = () => { Sfx.play('click'); Run.resume(); if (Run.state.phase === 'play') { screen('game'); renderRunBar(); refreshGames(); } };
  $('m-free').onclick = () => { Sfx.play('click'); if (Run.state) Run.quit(); Wallet.useFree(); screen('game'); renderRunBar(); refreshGames(); };
  $('m-cosmetics').onclick = () => { Sfx.play('click'); renderCosmetics(); screen('cosmetics'); };
  $('m-howto').onclick = () => { Sfx.play('click'); howTo(); };
  $('home').onclick = () => {
    if (Run.state && Run.state.busy) return toast('Termine le coup en cours avant de quitter la table.');
    Sfx.play('click');
    // La partie roguelike reste sauvegardée et peut être reprise depuis le menu
    if (Run.state) { Run.save(); Run.quit(); } else { renderMenu(); screen('menu'); }
  };

  return { screen, showTab, renderMenu, renderRunBar, toast, refreshGames };
})();

// Interface hors jeux : écrans, barre de partie, jokers, shop, prêts, fenêtres
const UI = (() => {
  const $ = id => document.getElementById(id);
  const el = Util.el;
  let tab = 'uth';
  const H = () => App.host;
  const S = () => App.host.state;
  const isRun = () => !!App.host && App.host.isRun;

  // ---------- Écrans et onglets ----------
  function screen(name) {
    ['menu', 'choose', 'game', 'shop', 'cosmetics'].forEach(n => ($('screen-' + n).hidden = n !== name));
    document.body.dataset.screen = name;
    closePopover();
    window.scrollTo(0, 0);
  }
  function showTab(id) {
    tab = id;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    document.querySelectorAll('.game').forEach(g => (g.hidden = g.id !== id));
    Storage.set('casino.tab', id);
    renderConsumables();
  }
  document.querySelectorAll('.tab').forEach(t => (t.onclick = () => { Sfx.play('click'); showTab(t.dataset.tab); }));
  const refreshGames = () => App.views().forEach(v => v.refresh && v.refresh());

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
  const closeModal = () => ($('modal').hidden = true);
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
  const closePopover = () => ($('popover').hidden = true);
  document.addEventListener('click', e => { if (!e.target.closest('#popover, .jcard')) closePopover(); });
  const report = r => { if (r && r.error) { Sfx.play('error'); toast(r.error); return false; } return true; };

  // ---------- Cartes d'objets (jokers, consommables…) ----------
  const kindCls = d => (d.kind === 'joker' ? 'r-' + d.rarity : d.kind === 'consumable' ? 'r-cons' : d.kind === 'pack' ? 'r-pack' : 'r-upgrade');
  function itemCard(id, { uid, price, onClick, disabled } = {}) {
    const d = CATALOG[id];
    const e = el('div', 'jcard ' + kindCls(d));
    if (uid) e.dataset.uid = uid;
    e.innerHTML = `<div class="jc-icon">${d.icon}</div><div class="jc-name">${d.name}</div>` +
      (id === 'jackpot' ? `<div class="jc-badge">×${META.jackpot.toFixed(1)}</div>` : '') +
      (price !== undefined ? `<div class="jc-price">${price}</div>` : '');
    e.title = d.desc(H());
    if (disabled) e.classList.add('sold');
    if (onClick) e.onclick = ev => { ev.stopPropagation(); onClick(e); };
    return e;
  }
  function descHtml(id, extra = '') {
    const d = CATALOG[id];
    const tag = d.kind === 'joker' ? `<span class="tag r-${d.rarity}">${RARITY_LABEL[d.rarity]}</span>`
      : `<span class="tag ${kindCls(d)}">${{ consumable: 'Consommable', pack: 'Pack', upgrade: 'Amélioration' }[d.kind]}</span>`;
    return `<div class="pop-title">${d.icon} ${d.name}</div>${tag}<p>${d.desc(H())}</p>${extra}`;
  }
  function jokerStateText(j) {
    const s = j.state || {};
    if (j.id === 'martingale' && s.streak) return `<p class="pop-extra">Série de pertes : ${s.streak} (+${s.streak * CONFIG.jokers.martingale.pct * 100} % au prochain gain)</p>`;
    if (j.id === 'roue' && s.rules && s.rules.length) return `<p class="pop-extra">Règle active : ${RULES[s.rules[0]].desc()}</p>`;
    if (j.id === 'molle') return `<p class="pop-extra">${s.used ? 'Déjà utilisée à cette table' : 'Prête pour cette table'}</p>`;
    if (j.id === 'miroir') { const t = H().mirrorTarget(j.uid); return `<p class="pop-extra">Copie : ${t ? t.name : 'rien (aucun joker à droite)'}</p>`; }
    return '';
  }
  function renderJokers(container) {
    const st = S();
    container.innerHTML = '';
    for (let i = 0; i < st.jokerSlots; i++) {
      const j = st.jokers[i];
      if (!j) { container.appendChild(el('div', 'jslot')); continue; }
      const c = itemCard(j.id, {
        uid: j.uid,
        onClick: node => popover(node, descHtml(j.id, jokerStateText(j)), [
          ['◀', () => H().moveJoker(j.uid, -1), '', i === 0],
          ['▶', () => H().moveJoker(j.uid, 1), '', i === st.jokers.length - 1],
          [`Vendre (+${Math.floor(JOKERS[j.id].price * CONFIG.shop.sellRatio)})`, () => { const r = H().sellJoker(j.uid); if (report(r)) { Sfx.play('coins'); App.syncBalance(); } }, 'danger', H().busy()],
        ]),
      });
      if (st.phase === 'play' && H().isJokerDisabled(j)) c.classList.add('frozen');
      container.appendChild(c);
    }
  }
  function renderConsumables() {
    if (!isRun()) return;
    const st = S(), box = $('cons-slots');
    box.innerHTML = '';
    for (let i = 0; i < st.consSlots; i++) {
      const id = st.consumables[i];
      if (!id) { box.appendChild(el('div', 'jslot small')); continue; }
      const def = CONSUMABLES[id];
      const usable = !def.capability || H().canUseCapability({ game: tab }, def.capability);
      const c = itemCard(id, {
        onClick: node => popover(node, descHtml(id), [
          ['Utiliser', () => useConsumable(i), 'primary', !usable],
          [`Vendre (+${Math.floor(def.price * CONFIG.shop.sellRatio)})`, () => { H().sellConsumable(i); App.syncBalance(); }, 'danger'],
        ]),
      });
      c.classList.add('ccard');
      if (!usable) c.classList.add('idle');
      box.appendChild(c);
    }
  }
  function useConsumable(i, card) {
    const r = H().useConsumable(i, { game: tab }, card);
    if (!r.ok) { Sfx.play('error'); return toast(r.text || 'Impossible pour le moment.'); }
    if (r.needCard) {
      const a = H().active();
      const used = a && a.id === 'uth' ? Games.get('uth').visible(a.round) : [];
      return cardPicker(c => useConsumable(i, c), used);
    }
    Sfx.play(r.sound || 'joker');
    if (r.text) toast(r.text);
    App.syncBalance();
  }
  function cardPicker(done, used) {
    const box = modal('<h2>Carte Bonus</h2><p>Choisis la carte à ajouter à ta main.</p><div class="picker"></div>', [['Annuler', () => {}]], 'wide');
    const grid = box.querySelector('.picker');
    for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) {
      const c = { rank: r, suit: s };
      const e = cardEl(c);
      if (used.some(u => sameCard(u, c))) e.classList.add('taken');
      else e.onclick = () => { closeModal(); done(c); };
      grid.appendChild(e);
    }
  }

  const TABLE_NAME = { petite: 'Petite table', grande: 'Grande table', boss: 'Table du Boss' };
  const F = () => CONFIG.progression.etagesPourGagner;
  const etageText = st => `Étage ${st.etage}${st.etage <= F() ? ' / ' + F() : ' · infini'}`;

  // ---------- Barre de partie ----------
  function renderRunBar() {
    const run = isRun();
    $('run-bar').hidden = !run;
    $('reset').hidden = run || !App.host;
    document.querySelector('.wallet').hidden = !App.host;
    $('top-mode').textContent = !App.host ? '' : run ? etageText(S()) + (S().table ? ' — ' + TABLE_NAME[S().table.type] : '') : 'Mode libre';
    if (!run) return;
    const st = S();
    renderJokers($('joker-slots'));
    renderConsumables();
    const t = st.table;
    if (st.phase !== 'play' || !t) return;
    const pct = Math.max(0, Math.min(100, t.gains / t.target * 100));
    const boss = t.boss ? BOSSES[t.boss] : null;
    const rules = H().activeRules().map(id => RULES[id].desc());
    const debt = st.debts[0];
    const tags = st.statuses.filter(x => STATUSES[x.id].tag || x.id === 'golden' || x.id === 'huissier');
    $('run-info').innerHTML = `
      <div class="ri-block ri-manche"><span>${etageText(st)}</span><b class="ri-table ${t.type}">${TABLE_NAME[t.type]}</b></div>
      <div class="ri-block ri-goal">
        <span>Gains de la table</span>
        <div class="goal-bar ${t.gains >= t.target ? 'met' : ''}"><i style="width:${pct}%"></i></div>
        <small><b>${Util.fmt(t.gains)}</b> / ${Util.fmt(t.target)}</small>
      </div>
      <div class="ri-block"><span>Mises</span><b class="${t.bets <= 2 ? 'low' : ''}">${t.bets}<small>/${t.betsMax}</small></b></div>
      <div class="ri-block"><span>Relances</span><b>${st.charges.length}</b></div>
      ${boss ? `<div class="ri-chip boss">☠ ${boss.name} : ${boss.desc()}</div>` : ''}
      ${rules.map(r => `<div class="ri-chip rule">🎡 ${r}</div>`).join('')}
      ${tags.map(x => `<div class="ri-chip">${STATUSES[x.id].icon} ${STATUSES[x.id].name}</div>`).join('')}
      ${debt ? `<div class="ri-chip debt">💳 Dette : ${Util.fmt(debt.left)} (échéance ${Util.fmt(Math.min(debt.per, debt.left))})</div>` : ''}
      <div class="ri-chip seed" title="Rejouer cette seed donne exactement la même partie">🌱 Seed ${st.seed}</div>`;
  }

  // ---------- Choix de la table (petite, grande, boss) ----------
  function renderChoose() {
    const st = S();
    const P = CONFIG.progression;
    const card = type => {
      const info = H().tableInfo(type);
      const boss = info.boss ? BOSSES[info.boss] : null;
      const tag = info.tag ? STATUSES[info.tag] : null;
      const current = info.status === 'current';
      const badge = { won: '✓ Gagnée', skipped: '⏭ Passée', upcoming: 'À venir', current: 'Maintenant' }[info.status];
      return `<div class="tcard ${type} ${info.status}">
        <div class="tc-head"><span>${TABLE_NAME[type]}</span><i>${badge}</i></div>
        <div class="tc-chip">${type === 'boss' ? '☠' : type === 'grande' ? '♦' : '♣'}</div>
        <div class="tc-goal"><small>Objectif de gains</small><b>${Util.fmt(info.target)}</b></div>
        <div class="tc-meta">${P.misesParTable} mises · ${P.relancesParTable} relances · récompense <b>${info.reward}</b></div>
        ${boss ? `<div class="tc-boss"><b>${boss.name}</b><br>${boss.desc()}</div>` : ''}
        ${tag ? `<div class="tc-tag"><span>Passer pour :</span> ${tag.icon} <b>${tag.name}</b><br><small>${tag.desc()}</small></div>` : ''}
        ${current ? `<div class="tc-actions"><button class="btn primary" data-act="play">Jouer</button>${type !== 'boss' ? '<button class="btn" data-act="skip">Passer</button>' : ''}</div>` : ''}
      </div>`;
    };
    $('choose').innerHTML = `<div class="choose-head"><h2>${etageText(st)}</h2>
        <p>Atteins l'objectif de gains de chaque table en ${P.misesParTable} mises. Seules les mises gagnantes comptent.</p></div>
      <div class="tables">${['petite', 'grande', 'boss'].map(card).join('')}</div>
      <div class="choose-foot"><span class="ri-chip seed">🌱 Seed ${st.seed}</span></div>`;
    $('choose').querySelectorAll('[data-act]').forEach(b => (b.onclick = () => {
      Sfx.play('click');
      if (b.dataset.act === 'play') { if (report(H().chooseTable())) startTableUI(); }
      else { const r = H().skipTable(); if (report(r)) { if (r.text) toast(r.text); Sfx.play('joker'); renderChoose(); App.syncBalance(); } }
    }));
  }
  function startTableUI() {
    App.views().forEach(v => v.reset && v.reset());
    enterGame();
    const t = S().table;
    if (t.boss) {
      const b = BOSSES[t.boss];
      modal(`<div class="intro"><div class="intro-n">☠ ${b.name}</div><div class="intro-boss">${b.desc()}</div>
        <div class="intro-goal">Gagne <b>${Util.fmt(t.target)}</b> jetons en <b>${t.bets}</b> mises</div></div>`, [['Affronter le boss', () => {}, 'primary big']], 'intro-box');
    }
  }

  // ---------- Shop ----------
  function renderShop() {
    const st = S();
    const nextInfo = H().tableInfo(st.tableType);
    const sum = st.summary;
    const debt = st.debts[0];
    $('shop').innerHTML = `
      <div class="shop-head">
        <h2>Le Comptoir</h2>
        ${sum ? `<div class="shop-summary">
          <div class="ss-title">${sum.victory ? '🏆 Boss final vaincu !' : `${TABLE_NAME[sum.type]} de l'étage ${sum.etage} gagnée`}</div>
          ${sum.lines.map(l => `<div class="ss-line ${l.bad || l.value < 0 ? 'bad' : ''}"><span>${l.label}</span>${l.value ? `<b>${Util.signed(l.value)}</b>` : ''}</div>`).join('')}
        </div>` : ''}
      </div>
      <div class="shop-body">
        <div class="shop-offers">
          <div class="shop-row-title">Jokers</div><div class="shop-row" id="shop-jokers"></div>
          <div class="shop-row-title">Consommables</div><div class="shop-row" id="shop-cons"></div>
          <div class="shop-row-title">Packs · Améliorations</div><div class="shop-row" id="shop-items"></div>
        </div>
        <div class="shop-side">
          <div class="ss-bal"><span class="wallet-chip"></span>${Util.fmt(H().chips())}</div>
          <div class="ss-next">
            <div>Prochaine table : <b>${TABLE_NAME[st.tableType]}</b> — ${etageText(st)}</div>
            <div>Objectif de gains : <b>${Util.fmt(nextInfo.target)}</b> en ${CONFIG.progression.misesParTable} mises</div>
            ${nextInfo.boss ? `<div class="boss-warn">☠ ${BOSSES[nextInfo.boss].name} : ${BOSSES[nextInfo.boss].desc()}</div>` : ''}
          </div>
          <button class="btn" id="shop-reroll">🔄 Relancer le shop (${st.shop.rerollCost})</button>
          <button class="btn" id="shop-slot" ${H().slotPrice() ? '' : 'disabled'}>➕ Emplacement de joker ${H().slotPrice() ? `(${H().slotPrice()})` : '(max)'}</button>
          <div class="loans">
            <div class="shop-row-title">💳 Le Prêteur</div>
            ${debt ? `<p>Dette en cours : <b>${Util.fmt(debt.left)}</b> — échéance de ${Util.fmt(Math.min(debt.per, debt.left))} prélevée à chaque table gagnée.${debt.missed ? ` ⚖️ ${debt.missed} échéance(s) manquée(s).` : ''}</p>`
              : CONFIG.loans.options.map(o => `<button class="btn small loan" data-id="${o.id}">${o.name} : +${o.amount} maintenant<br><small>${Math.round(o.amount * (1 + o.rate))} à rendre en ${o.tables} tables</small></button>`).join('')}
            <p class="hint">Échéance impayée : +${CONFIG.loans.penaltyRate * 100} % sur la part manquante et ${CONFIG.loans.penaltyBets} mises confisquées.</p>
          </div>
          <button class="btn primary big" id="shop-next">Continuer ➜</button>
        </div>
      </div>
      <div class="shop-owned">
        <div class="shop-row-title">Tes jokers (${st.jokers.length}/${st.jokerSlots}) — touche un joker pour le déplacer ou le vendre</div>
        <div class="joker-slots" id="shop-owned-jokers"></div>
        <div class="shop-row-title">Consommables (${st.consumables.length}/${st.consSlots}) · Améliorations</div>
        <div class="shop-row small" id="shop-owned-items"></div>
      </div>`;
    st.shop.offers.forEach((o, i) => {
      const box = $(o.kind === 'joker' ? 'shop-jokers' : o.kind === 'consumable' ? 'shop-cons' : 'shop-items');
      box.appendChild(itemCard(o.id, {
        price: o.sold ? 'vendu' : o.price, disabled: o.sold,
        onClick: node => { if (!o.sold) popover(node, descHtml(o.id), [[`Acheter (${o.price})`, () => buy(i), 'primary', !H().canAfford(o.price)]]); },
      }));
    });
    renderJokers($('shop-owned-jokers'));
    const owned = $('shop-owned-items');
    st.consumables.forEach((id, i) => owned.appendChild(itemCard(id, { onClick: node => popover(node, descHtml(id), [['Utiliser', () => useConsumable(i), 'primary', !!CONSUMABLES[id].inPlayOnly || !!CONSUMABLES[id].capability]]) })));
    st.upgrades.forEach(id => owned.appendChild(itemCard(id, { onClick: node => popover(node, descHtml(id), []) })));
    $('shop-reroll').onclick = () => { if (report(H().reroll())) { Sfx.play('buy'); App.syncBalance(); } };
    $('shop-slot').onclick = () => { if (report(H().buySlot())) { Sfx.play('buy'); App.syncBalance(); } };
    document.querySelectorAll('.loan').forEach(b => (b.onclick = () => { if (report(H().takeLoan(b.dataset.id))) { Sfx.play('coins'); App.syncBalance(); toast('💳 Prêt accordé. Attention aux échéances !'); } }));
    $('shop-next').onclick = () => { Sfx.play('click'); H().leaveShop(); };
  }
  function buy(i) {
    const r = H().buy(i);
    if (!report(r)) return;
    Sfx.play('buy');
    App.syncBalance();
    if (r.pack) openPack(r.pack);
  }
  function openPack(ids) {
    if (!ids.length) { toast('Le pack était vide…'); H().choosePack(null); return; }
    const box = modal(`<h2>${ids.length > 1 ? 'Petit pack' : 'Pack mystère'}</h2><p>${ids.length > 1 ? 'Choisis un joker :' : 'Ton joker :'}</p><div class="pack-cards"></div>`, ids.length > 1 ? [['Passer', () => H().choosePack(null)]] : []);
    const row = box.querySelector('.pack-cards');
    ids.forEach(id => {
      const wrap = el('div', 'pack-choice');
      wrap.appendChild(itemCard(id));
      wrap.appendChild(el('p', '', CATALOG[id].desc(H())));
      const b = el('button', 'btn primary small', 'Prendre');
      b.onclick = () => { H().choosePack(id); Sfx.play('joker'); closeModal(); };
      wrap.appendChild(b);
      row.appendChild(wrap);
    });
  }

  // ---------- Menu, cosmétiques, aide ----------
  function renderMenu() {
    $('m-continue').hidden = !Engine.hasSave();
    $('m-prestige').textContent = `✦ ${META.prestige}`;
    $('m-stats').innerHTML = `Meilleur étage : <b>${META.best}</b> · Parties : <b>${META.runs}</b> · Victoires : <b>${META.wins}</b> · Jackpot Éternel : <b>×${META.jackpot.toFixed(1)}</b>`;
  }
  function renderCosmetics() {
    const root = $('cosmetics');
    const item = it => {
      const owned = Cosmetics.owned(it.id), sel = META.felt === it.id || META.back === it.id;
      const prev = it.id.startsWith('felt')
        ? `<div class="cos-felt" style="background:radial-gradient(circle at 50% 40%, ${it.c[0]}, ${it.c[1]} 60%, ${it.c[2]})"></div>`
        : `<div class="cos-back" style="background:repeating-linear-gradient(45deg, ${it.c[0]} 0 6px, ${it.c[1]} 6px 8px);border-color:${it.c[2]}"><span style="background:${it.c[3]}">B</span></div>`;
      return `<div class="cos-item ${sel ? 'sel' : ''}" data-id="${it.id}">${prev}<div class="cos-name">${it.name}</div>
        <button class="btn small ${owned ? '' : 'primary'}" ${!owned && META.prestige < it.price ? 'disabled' : ''}>${sel ? 'Équipé' : owned ? 'Équiper' : `✦ ${it.price}`}</button></div>`;
    };
    root.innerHTML = `<div class="cos-head"><h2>Cosmétiques</h2><div class="prestige-badge big">✦ ${META.prestige} prestige</div>
      <p>Le prestige se gagne en mode roguelike : ✦${CONFIG.prestige.perBoss} par boss vaincu, ✦${CONFIG.prestige.victory} de plus pour la victoire finale.</p></div>
      <h3>Tapis</h3><div class="cos-grid">${Cosmetics.FELTS.map(item).join('')}</div>
      <h3>Dos de cartes</h3><div class="cos-grid">${Cosmetics.BACKS.map(item).join('')}</div>
      <div class="cos-foot"><button class="btn big" id="cos-back">⬅ Retour</button></div>`;
    root.querySelectorAll('.cos-item').forEach(n => {
      n.querySelector('button').onclick = () => {
        const id = n.dataset.id;
        if (!Cosmetics.owned(id)) { if (!Cosmetics.buy(id)) return Sfx.play('error'); Sfx.play('buy'); } else Sfx.play('click');
        Cosmetics.select(id);
        renderCosmetics();
      };
    });
    $('cos-back').onclick = () => { renderMenu(); screen('menu'); };
  }
  function howTo() {
    const P = CONFIG.progression;
    modal(`<h2>Comment jouer</h2>
      <ul class="howto">
        <li>Tu démarres avec <b>${P.jetonsDepart} jetons</b>. Il y a <b>${P.etagesPourGagner} étages</b>, chacun avec 3 tables : <b>petite</b>, <b>grande</b> et <b>table du Boss</b>.</li>
        <li>À chaque table, atteins l'<b>objectif de gains</b> en <b>${P.misesParTable} mises</b> maximum (une main, un tirage ou un lancer = 1 mise), sur le jeu de ton choix. Seules les mises gagnantes font avancer l'objectif : les pertes ne coûtent que des jetons.</li>
        <li>Tu as <b>${P.relancesParTable} relances</b> par table pour refaire un tirage raté sans miser à nouveau.</li>
        <li>Table gagnée : récompense, +${P.bonusParMiseRestante} par mise restante et ${P.interetsParTranche.gain} jetons d'intérêts par tranche de ${P.interetsParTranche.tranche} (${P.interetsParTranche.max} max), puis le <b>Comptoir</b>.</li>
        <li>Tu peux <b>passer</b> la petite ou la grande table pour gagner un <b>tag</b> (bonus), mais pas le Boss, qui impose une règle spéciale.</li>
        <li>Plus de mises sans l'objectif, ou plus de jetons : perdu. Bats le boss de l'étage ${P.etagesPourGagner} pour gagner, puis continue en mode infini.</li>
        <li>Les jokers s'appliquent de <b>gauche à droite</b>. Chaque gain affiche son détail. Chaque partie a une <b>seed</b> : même seed et mêmes choix = même partie.</li>
      </ul>`, [['Compris !', () => {}, 'primary']]);
  }
  function enterGame() { screen('game'); renderRunBar(); refreshGames(); }

  // ---------- Sessions ----------
  function showPhase() {
    const ph = S().phase;
    renderRunBar();
    if (ph === 'choose') { renderChoose(); screen('choose'); }
    else if (ph === 'shop' || ph === 'victory') { renderShop(); screen('shop'); if (ph === 'victory') victoryModal(); }
    else enterGame();
  }
  function startRun(seed) { App.attach(Engine.newRun({ seed, meta: META })); showPhase(); }
  function resume() {
    const h = Engine.load({ meta: META });
    if (!h) { toast('Aucune partie à reprendre.'); return renderMenu(); }
    App.attach(h);
    showPhase();
  }
  function freeMode() { App.attach(Engine.free({ meta: META })); enterGame(); }
  function victoryModal() {
    const st = S();
    Sfx.play('fanfare');
    modal(`<div class="intro"><div class="intro-n">🏆 Victoire !</div><p>Tu as fait sauter la banque du Boubouz'ino : ${CONFIG.progression.etagesPourGagner} étages vaincus.</p>
      <p>Seed : <b>${st.seed}</b> · Tables gagnées : <b>${st.stats.tablesWon}</b></p><p>✦ +${CONFIG.prestige.perBoss + CONFIG.prestige.victory} prestige</p></div>`,
    [['Continuer en mode infini', () => H().continueInfinite(), 'primary'], ['Terminer la partie', () => { Engine.clearSave(); App.attach(null); renderMenu(); screen('menu'); }]], 'intro-box');
  }

  // ---------- Événements ----------
  App.on('session', () => renderRunBar());
  App.on('change', () => {
    if (!App.host) return;
    renderRunBar();
    if (isRun() && S().phase === 'shop' && !$('screen-shop').hidden) renderShop();
  });
  App.on('table', () => renderRunBar());
  App.on('choose', () => { closeModal(); renderRunBar(); renderChoose(); screen('choose'); });
  App.on('shop', () => { closeModal(); renderRunBar(); renderShop(); screen('shop'); Sfx.play('win'); });
  App.on('victory', () => { closeModal(); renderRunBar(); renderShop(); screen('shop'); victoryModal(); });
  App.on('over', () => {
    const st = S();
    Sfx.play('gameover');
    modal(`<div class="intro"><div class="intro-n lose">Partie terminée</div><p>${st.reason}</p>
      <div class="over-stats"><div><span>Étage atteint</span><b>${st.etage}</b></div><div><span>Tables gagnées</span><b>${st.stats.tablesWon}</b></div><div><span>Coups joués</span><b>${st.stats.plays}</b></div>
      <div><span>Plus gros gain</span><b>${Util.fmt(st.stats.best)}</b></div></div>
      <p>Seed : <b>${st.seed}</b></p>
      <div class="over-jokers">${st.jokers.map(j => JOKERS[j.id].icon).join(' ')}</div></div>`,
    [['Nouvelle partie', () => startRun()], ['Rejouer cette seed', () => startRun(st.seed)], ['Menu principal', () => { App.attach(null); renderMenu(); screen('menu'); }]], 'intro-box');
  });
  App.on('toast', toast);
  App.on('flash', ({ uid, text }) => {
    document.querySelectorAll(`.jcard[data-uid="${uid}"]`).forEach(n => {
      n.classList.remove('trigger'); void n.offsetWidth; n.classList.add('trigger');
      const f = el('div', 'jc-float', text);
      n.appendChild(f);
      setTimeout(() => f.remove(), 1200);
    });
  });

  // ---------- Boutons du menu ----------
  $('m-new').onclick = () => {
    Sfx.play('click');
    if (Engine.hasSave() && !confirm('Une partie est en cours. La remplacer par une nouvelle ?')) return;
    Engine.clearSave();
    startRun($('m-seed').value.trim() || undefined);
  };
  $('m-continue').onclick = () => { Sfx.play('click'); resume(); };
  $('m-free').onclick = () => { Sfx.play('click'); freeMode(); };
  $('m-cosmetics').onclick = () => { Sfx.play('click'); renderCosmetics(); screen('cosmetics'); };
  $('m-howto').onclick = () => { Sfx.play('click'); howTo(); };
  $('home').onclick = () => {
    if (App.host && (App.host.busy() || App.isAnimating())) return toast('Termine le coup en cours avant de quitter la table.');
    Sfx.play('click');
    if (App.host) App.host.save(); // la partie reste sauvegardée et peut être reprise
    App.attach(null);
    renderMenu(); screen('menu');
  };
  $('reset').onclick = () => { if (confirm(`Remettre le solde à ${Util.fmt(CONFIG.start.freeChips)} jetons ?`)) { App.host.resetFree(); App.syncBalance(); } };

  return { screen, showTab, renderMenu, renderRunBar, toast };
})();

// Interface hors jeux : écrans, barre de partie, jokers, shop, prêts, fenêtres
const UI = (() => {
  const $ = id => document.getElementById(id);
  const el = Util.el;
  let tab = 'bj';
  const H = () => App.host;
  const S = () => App.host.state;
  const isRun = () => !!App.host && App.host.isRun;

  // ---------- Écrans et onglets ----------
  function screen(name) {
    ['menu', 'choose', 'game', 'shop', 'cosmetics', 'collection'].forEach(n => ($('screen-' + n).hidden = n !== name));
    document.body.dataset.screen = name;
    $('jsheet').hidden = true;
    // la rangée de jokers reste en bas pendant le choix de table et le jeu
    $('dock').hidden = !(isRun() && (name === 'game' || name === 'choose'));
    document.body.classList.toggle('has-dock', !$('dock').hidden);
    closePopover();
    window.scrollTo(0, 0);
  }
  function showTab(id) {
    tab = id;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    const act = App.host && App.host.active();
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('busy', !!act && act.id === t.dataset.tab && id !== t.dataset.tab));
    document.querySelectorAll('.game').forEach(g => (g.hidden = g.id !== id));
    Storage.set('casino.tab', id);
    renderConsumables();
    if (App.host) paintHud();
  }
  document.querySelectorAll('.tab').forEach(t => (t.onclick = () => { Sfx.play('click'); showTab(t.dataset.tab); }));
  const refreshGames = () => App.views().forEach(v => v.refresh && v.refresh());

  // ---------- Fenêtres, bulles, toasts ----------
  // Fenêtre modale accessible : rôle dialog, focus sur le bouton principal, Échap = bouton « esc »
  let escAction = null, lastFocus = null;
  function modal(html, buttons = [], cls = '', { esc } = {}) {
    const box = $('modal-box');
    box.className = 'modal-box ' + cls;
    box.innerHTML = html;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    const h2 = box.querySelector('h2, .intro-n');
    if (h2) { h2.id = 'modal-title'; box.setAttribute('aria-labelledby', 'modal-title'); } else box.removeAttribute('aria-labelledby');
    escAction = null;
    if (buttons.length) {
      const row = el('div', 'modal-actions');
      buttons.forEach(([label, fn, c = ''], i) => {
        const b = el('button', 'btn ' + c, label);
        const run = () => { Sfx.play('click'); if (fn() !== false) closeModal(); };
        b.onclick = run;
        // par défaut, Échap déclenche le seul bouton, ou celui désigné
        if (esc === i || (esc === undefined && buttons.length === 1)) escAction = run;
        row.appendChild(b);
      });
      box.appendChild(row);
    }
    if ($('modal').hidden) lastFocus = document.activeElement;
    $('modal').hidden = false;
    setInert(true);
    const first = box.querySelector('.modal-actions .btn.primary') || box.querySelector('button, input');
    setTimeout(() => (first || box).focus(), 30);
    if (!first) box.tabIndex = -1;
    return box;
  }
  const closeModal = () => {
    $('modal').hidden = true;
    escAction = null;
    setInert(false);
    // focus rendu à l'élément d'origine, sinon à l'action principale visible
    const back = lastFocus && document.contains(lastFocus) && lastFocus !== document.body && !lastFocus.closest('[hidden]') ? lastFocus
      : document.querySelector('.screen:not([hidden]) .btn.primary:not([disabled]), .screen:not([hidden]) button:not([disabled])');
    if (back && back.focus) back.focus();
  };
  // Pendant une fenêtre, le reste de la page est inerte (clavier et lecteurs d'écran)
  function setInert(on) {
    ['.top', '.screen', '#dock', 'footer'].forEach(sel => document.querySelectorAll(sel).forEach(n => { if (on) n.setAttribute('inert', ''); else n.removeAttribute('inert'); }));
  }
  // Tab reste dans la fenêtre ouverte
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || $('modal').hidden) return;
    const f = [...$('modal-box').querySelectorAll('button:not([disabled]), input, [tabindex="0"]')].filter(n => n.offsetParent !== null);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
  });
  // Toast, avec éventuellement un bouton (ex. « Annuler » après une vente)
  function toast(text, action) {
    const t = el('div', 'toast', text);
    if (action) {
      const b = el('button', 'btn small', action.label);
      b.onclick = () => { action.fn(); t.remove(); };
      t.appendChild(b);
      t.classList.add('with-action');
    }
    $('toasts').appendChild(t);
    const life = action ? 5000 : 2600;
    setTimeout(() => t.classList.add('out'), life);
    setTimeout(() => t.remove(), life + 500);
  }
  function popover(anchor, html, buttons) {
    $('jsheet').hidden = true;
    const p = $('popover');
    p.innerHTML = html;
    const row = el('div', 'pop-actions');
    buttons.forEach(([label, fn, c = '', dis]) => {
      const b = el('button', 'btn small ' + c, label);
      if (label.includes('<')) b.innerHTML = label;
      b.disabled = !!dis;
      b.onclick = e => { e.stopPropagation(); Sfx.play('click'); fn(); closePopover(); };
      row.appendChild(b);
    });
    if (buttons.length) p.appendChild(row);
    p.hidden = false;
    // La fiche s'ouvre au-dessus de la carte (en dessous seulement s'il n'y a pas la place)
    const r = anchor.getBoundingClientRect();
    const w = Math.min(340, window.innerWidth - 24);
    p.style.width = w + 'px';
    p.style.bottom = ''; p.style.right = '';
    p.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
    const h = p.offsetHeight, top = Math.max(70, window.innerHeight * 0.05);
    const above = r.top - h - 12 >= top;
    p.style.top = Math.max(8, above ? r.top - h - 12 : Math.min(window.innerHeight - h - 8, r.bottom + 12)) + 'px';
    p.classList.toggle('below', !above);
    // petite flèche vers la carte
    p.style.setProperty('--ax', `${Math.max(18, Math.min(w - 18, r.left + r.width / 2 - parseFloat(p.style.left)))}px`);
  }
  const closePopover = () => ($('popover').hidden = true);
  document.addEventListener('click', e => { if (!e.target.closest('#popover, .jcard')) closePopover(); });
  const report = r => { if (r && r.error) { Sfx.play('error'); toast(r.error); return false; } return true; };

  // ---------- Cartes d'objets (jokers illustrés, consommables…) ----------
  const RAR_SYM = { commun: '●', rare: '◆', legendaire: '★' };
  const kindCls = d => (d.kind === 'joker' ? 'r-' + d.rarity : d.kind === 'consumable' ? 'r-cons' : d.kind === 'pack' ? 'r-pack' : 'r-upgrade');
  const KIND_LABEL = { consumable: 'Consommable', pack: 'Pack', upgrade: 'Amélioration' };
  // Synergies (aperçu au survol d'un joker du shop) : même jeu, ou jokers qui profitent de tout
  const GAME_TAGS = ['Blackjack', 'Roulette', 'Dice', "Hold'em", 'Machine'];
  const synergic = (a, b) => {
    if (a === b) return false;
    if (['miroir', 'parrain'].includes(a) || ['miroir', 'parrain'].includes(b)) return true;
    const ta = JOKERS[a].tags || [], tb = JOKERS[b].tags || [];
    if (ta.some(t => GAME_TAGS.includes(t) && tb.includes(t))) return true;
    return (ta.includes('Multiplicateur') && tb.includes('Tous les jeux')) || (tb.includes('Multiplicateur') && ta.includes('Tous les jeux'));
  };

  function itemCard(id, { uid, price, onClick, disabled, big } = {}) {
    const d = CATALOG[id];
    const e = el('div', 'jcard ' + kindCls(d) + (big ? ' big' : ''));
    if (uid) e.dataset.uid = uid;
    e.dataset.id = id;
    const art = d.kind === 'joker' ? JokerArt.svg(id) : `<div class="jc-emoji">${d.icon}</div>`;
    const sym = d.kind === 'joker' ? RAR_SYM[d.rarity] : '';
    e.innerHTML = `<div class="jc-frame"><div class="jc-art">${art}</div><div class="jc-name">${sym ? `<i>${sym}</i> ` : ''}${d.name}</div></div>` +
      (id === 'jackpot' && uid && isRun() ? `<div class="jc-badge">×${((S().jokers.find(x => x.uid === +uid) || {}).state || {}).x ? S().jokers.find(x => x.uid === +uid).state.x.toFixed(1) : '1'}</div>` : '') +
      (price !== undefined ? `<div class="jc-price ${typeof price === 'number' && !H().canAfford(price) ? 'cant' : ''}">${typeof price === 'number' ? '<span class="wallet-chip s"></span>' : ''}${price}</div>` : '');
    e.setAttribute('aria-label', `${d.name} : ${d.desc(H(), uid && isRun() ? S().jokers.find(x => x.uid === +uid) : null)}`);
    if (d.grows) e.classList.add('grows');
    if (disabled) e.classList.add('sold');
    if (onClick) e.onclick = ev => { ev.stopPropagation(); if (e._dragged) return; onClick(e); };
    if (d.kind === 'joker') attachHover(e, id, uid);
    return e;
  }
  // Fiche détaillée : effet, rareté, prix de revente, statistiques
  function sheetHtml(id, uid) {
    const d = CATALOG[id];
    const j = uid && S().jokers ? S().jokers.find(x => x.uid === +uid) : null;
    const tag = d.kind === 'joker' ? `<span class="tag r-${d.rarity}">${RAR_SYM[d.rarity]} ${RARITY_LABEL[d.rarity]}</span>` : `<span class="tag ${kindCls(d)}">${KIND_LABEL[d.kind]}</span>`;
    let extra = '';
    if (j) {
      const st = j.stats || { earned: 0, triggers: 0 };
      extra += `<p class="pop-stat">A rapporté <b>${Util.fmt(Math.round(st.earned))}</b> jetons cette partie · déclenché ${st.triggers} fois</p>`;
      extra += jokerStateText(j);
      extra += `<p class="pop-sell">Revente : <b>${Util.fmt(H().sellValue(j))}</b> jetons</p>`;
    } else if (d.kind === 'joker') {
      const c = (META.collection && META.collection.jokers[id]) || null;
      if (c && c.owned) extra += `<p class="pop-stat">Collection : possédé ${c.owned} fois, ${c.wins} victoire(s), ${Util.fmt(Math.round(c.earned))} jetons rapportés au total</p>`;
      const syn = isRun() ? S().jokers.filter(x => synergic(id, x.id)).map(x => JOKERS[x.id].name) : [];
      if (syn.length) extra += `<p class="pop-syn">✦ Synergie avec : ${syn.join(', ')}</p>`;
    }
    return `<div class="pop-head">${d.kind === 'joker' ? `<div class="pop-art r-${d.rarity}">${JokerArt.svg(id)}</div>` : ''}
      <div><div class="pop-title r-${d.rarity || d.kind}">${d.icon} ${d.name}</div>${tag}${(d.tags || []).map(t => `<span class="tag jt">${t}</span>`).join('')}</div></div><p class="pop-desc">${d.desc(H(), j)}</p>${extra}`;
  }
  function jokerStateText(j) {
    const s = j.state || {};
    if (j.id === 'roue' && s.rules && s.rules.length) return `<p class="pop-extra">Règle active : ${RULES[s.rules[0]].desc()}</p>`;
    if (j.id === 'miroir') { const t = H().mirrorTarget(j.uid); return `<p class="pop-extra">Copie : ${t ? t.name : 'rien (aucun joker à droite)'}</p>`; }
    return '';
  }
  // Survol (souris) : fiche flottante ; dans le shop, les jokers en synergie s'illuminent
  function attachHover(e, id, uid) {
    e.addEventListener('pointerenter', ev => {
      if (ev.pointerType !== 'mouse' || e._dragging) return;
      const sh = $('jsheet');
      sh.innerHTML = sheetHtml(id, uid);
      sh.hidden = false;
      const r = e.getBoundingClientRect();
      const w = 300;
      sh.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
      const above = r.top > window.innerHeight / 2;
      sh.style.top = above ? '' : (r.bottom + 10) + 'px';
      sh.style.bottom = above ? (window.innerHeight - r.top + 10) + 'px' : '';
      if (!uid && isRun()) document.querySelectorAll('#joker-slots .jcard, #shop-owned-jokers .jcard').forEach(n => n.classList.toggle('syn', synergic(id, n.dataset.id)));
    });
    e.addEventListener('pointerleave', () => { $('jsheet').hidden = true; document.querySelectorAll('.jcard.syn').forEach(n => n.classList.remove('syn')); });
  }

  // Rangée de jokers : appui = fiche avec actions ; glisser-déposer = changer l'ordre ; appui long = fiche
  function renderJokers(container) {
    const st = S();
    container.innerHTML = '';
    for (let i = 0; i < st.jokerSlots; i++) {
      const j = st.jokers[i];
      if (!j) { container.appendChild(el('div', 'jslot')); continue; }
      const c = itemCard(j.id, { uid: j.uid, onClick: node => jokerMenu(node, j) });
      c.tabIndex = 0;
      c.setAttribute('role', 'button');
      c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jokerMenu(c, j); } };
      if (st.phase === 'play' && H().isJokerDisabled(j)) c.classList.add('frozen');
      enableDrag(c, container, j.uid);
      container.appendChild(c);
    }
  }
  function jokerMenu(node, j) {
    $('jsheet').hidden = true;
    const i = S().jokers.indexOf(j);
    popover(node, sheetHtml(j.id, j.uid), [
      ['◀', () => H().moveJoker(j.uid, -1), '', i === 0],
      ['▶', () => H().moveJoker(j.uid, 1), '', i === S().jokers.length - 1],
      [`Vendre (+${Util.fmt(H().sellValue(j))})`, () => sell(j), 'danger', H().busy()],
    ]);
  }
  function sell(j) {
    const r = H().sellJoker(j.uid);
    if (!report(r)) return;
    Sfx.play('coins'); App.syncBalance();
    toast(`${JOKERS[j.id].name} vendu (+${r.value}).`, { label: 'Annuler', fn: () => { if (report(H().undoSell())) { Sfx.play('click'); App.syncBalance(); } } });
  }
  function enableDrag(card, container, uid) {
    let sx = 0, sy = 0, ghost = null, timer = null, pid = null;
    card.addEventListener('pointerdown', ev => {
      if (ev.button > 0) return;
      sx = ev.clientX; sy = ev.clientY; pid = ev.pointerId; card._dragged = false;
      timer = setTimeout(() => { timer = null; if (!ghost) { card._dragged = true; jokerMenu(card, S().jokers.find(x => x.uid === uid)); } }, 550);
    });
    card.addEventListener('pointermove', ev => {
      if (ev.pointerId !== pid) return;
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!ghost && Math.hypot(dx, dy) > 8 && timer !== null) {
        clearTimeout(timer); timer = null;
        if (H().busy()) return;
        card._dragged = true; card._dragging = true;
        card.setPointerCapture(pid);
        ghost = card.cloneNode(true); ghost.classList.add('ghost');
        document.body.appendChild(ghost);
        card.classList.add('dragging');
        $('jsheet').hidden = true;
      }
      if (ghost) {
        const r = card.getBoundingClientRect();
        ghost.style.left = (ev.clientX - r.width / 2) + 'px';
        ghost.style.top = (ev.clientY - r.height / 2) + 'px';
        // indicateur de position
        const cards = [...container.querySelectorAll('.jcard:not(.dragging)')];
        const idx = cards.filter(n => { const b = n.getBoundingClientRect(); return b.left + b.width / 2 < ev.clientX; }).length;
        cards.forEach((n, k) => n.classList.toggle('drop-before', k === idx));
        container.classList.toggle('drop-end', idx === cards.length);
        card._dropIndex = idx;
      }
    });
    const end = () => {
      clearTimeout(timer); timer = null;
      if (ghost) {
        ghost.remove(); ghost = null;
        card.classList.remove('dragging'); card._dragging = false;
        container.querySelectorAll('.drop-before').forEach(n => n.classList.remove('drop-before'));
        container.classList.remove('drop-end');
        H().moveJokerTo(uid, card._dropIndex);
        Sfx.play('chip');
      }
      setTimeout(() => (card._dragged = false), 50);
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
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
        onClick: node => popover(node, sheetHtml(id), [
          ['Utiliser', () => useConsumable(i), 'primary', !usable],
          [`Vendre (+${Util.fmt(Math.floor(H().scale(def.price) * CONFIG.shop.sellRatio))})`, () => { H().sellConsumable(i); App.syncBalance(); }, 'danger'],
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
  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const F = () => (App.host && App.host.finalEtage ? App.host.finalEtage() : CONFIG.progression.etagesPourGagner);
  const etageText = st => `Étage ${st.etage}${st.etage <= F() ? ' / ' + F() : ' · infini'}`;

  // ---------- Barre du haut : étage, bankroll → palier, mise max, badges ----------
  // Boss « un seul jeu » : les autres onglets sont fermés (cadenas)
  function paintLocks() {
    const only = isRun() && S().phase === 'play' ? H().onlyGame() : null;
    document.querySelectorAll('.tab').forEach(t => {
      const locked = !!only && t.dataset.tab !== only;
      t.classList.toggle('locked', locked);
      t.disabled = locked;
      t.title = locked ? `Fermé : ${BOSSES[S().table.boss].name} n'ouvre que le ${Games.get(only).name}` : '';
    });
    if (only && tab !== only) showTab(only);
  }
  function renderRunBar() {
    paintLocks();
    const run = isRun();
    $('reset').hidden = run || !App.host;
    $('hud').hidden = !App.host;
    if (run) { renderJokers($('joker-slots')); renderConsumables(); }
    paintHud();
  }
  // Valeur affichée pendant que le compteur défile (pour que la barre suive les jetons)
  let shownChips = null;
  App.on('balance', v => { shownChips = v; paintMeter(); });
  function paintMeter() {
    if (!isRun()) return;
    const st = S(), t = st.table;
    const bar = $('hud-bar');
    bar.hidden = !(st.phase === 'play' && t);
    if (bar.hidden) return;
    const debt = st.debts.reduce((a, d) => a + d.left, 0);
    const chips = shownChips == null ? H().chips() : shownChips;
    const bank = chips - debt;
    const pct = Math.max(0, Math.min(100, bank / t.target * 100));
    $('hud-fill').style.width = pct + '%';
    bar.classList.toggle('danger', bank < t.target * 0.25);
    bar.classList.toggle('near', pct >= 80);
    $('hud-goal').innerHTML = t.mustWin && !t.wins ? `<span>Palier atteint</span><b class="num">Gagne 1 mise</b>` : `<span>Palier</span><b class="num">${Util.fmt(t.target)}</b>`;
    bar.title = `Bankroll ${Util.fmt(Math.floor(bank * 100) / 100)} / ${Util.fmt(t.target)}${debt ? ` (jetons − dette de ${Util.fmt(debt)})` : ''}`;
  }
  const badge = (cls, html, info) => `<button class="hbadge ${cls}" data-info="${info.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${html}</button>`;
  function paintHud() {
    const run = isRun();
    if (!App.host) return;
    if (!run) {
      $('hud-floor').innerHTML = '<b>Mode libre</b>';
      $('hud-bar').hidden = true;
      $('hud-badges').innerHTML = '';
      return;
    }
    const st = S(), t = st.table;
    const type = t ? t.type : st.tableType;
    $('hud-floor').className = 'hud-floor ' + (type || '');
    $('hud-floor').innerHTML = `<small>Étage</small><b class="num">${st.etage}${st.etage <= F() ? `<i>/${F()}</i>` : ''}</b><span>${TABLE_NAME[type] || ''}</span>`;
    paintMeter();
    const out = [];
    if (st.phase === 'play' && t) {
      out.push(badge('maxbet', `<small>Mise</small><b class="num">${Util.fmt(H().minBet())}–${Util.fmt(H().maxBet(tab))}</b>`,
        `<b>Mise minimale</b> : ${Math.round(CONFIG.progression.miseMinRatio * 100)} % du palier. <b>Mise maximale</b> : ${Math.round(H().maxBetRatio() * 100)} % du palier (cette part baisse à chaque étage : il te faut des multiplicateurs).`));
      out.push(badge('rr', `<b class="num">↻ ${st.charges.length}</b>`, `<b>Relances</b> : ${st.charges.length} pour cette table, pour refaire un tirage raté sans miser à nouveau (${CONFIG.progression.relancesParMise} par mise au plus).`));
    }
    const boss = BOSSES[st.bossId];
    if (boss) out.push(badge('boss' + (type === 'boss' ? ' now' : ''), type === 'boss' ? `☠ <span>${boss.name}</span>` : '☠', `<b>☠ ${boss.name}</b>${type === 'boss' ? '' : ' (3ᵉ table de l\'étage)'}<br>${boss.desc()}`));
    if (H().activeRules) H().activeRules().forEach(id => out.push(badge('rule', '🎡', `<b>Règle active</b><br>${RULES[id].desc()}`)));
    st.statuses.filter(x => STATUSES[x.id].tag || x.id === 'golden' || x.id === 'huissier')
      .forEach(x => out.push(badge('tag', STATUSES[x.id].icon, `<b>${STATUSES[x.id].icon} ${STATUSES[x.id].name}</b><br>${STATUSES[x.id].desc()}`)));
    const debt = st.debts[0];
    if (debt) out.push(badge('debt', `💳 <b class="num">${Util.fmt(debt.left)}</b>`, `<b>Dette</b> : ${Util.fmt(debt.left)} à rembourser (${Util.fmt(Math.min(debt.per, debt.left))} prélevés à chaque table gagnée). La dette est déduite de ta bankroll.`));
    $('hud-badges').innerHTML = out.join('');
    bindBadges();
  }
  function bindBadges() {
    $('hud-badges').querySelectorAll('.hbadge').forEach(b => (b.onclick = () => { Sfx.play('click'); popover(b, `<p>${b.dataset.info}</p>`, []); }));
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
        <div class="tc-goal"><small>Bankroll à atteindre</small><b>${Util.fmt(info.target)}</b></div>
        <div class="tc-meta">mise max <b>${Util.fmt(info.maxBet)}</b> · récompense <b>+${info.reward}</b></div>
        ${boss ? `<div class="tc-boss"><b>${boss.name}</b><br>${boss.desc()}</div>` : ''}
        ${tag ? `<div class="tc-tag"><span>Passer pour :</span> ${tag.icon} <b>${tag.name}</b><br><small>${tag.desc()}</small></div>` : ''}
        ${current ? `<div class="tc-actions"><button class="btn primary" data-act="play">Jouer</button>${type !== 'boss' ? '<button class="btn" data-act="skip">Passer</button>' : ''}</div>` : ''}
      </div>`;
    };
    $('choose').innerHTML = `<div class="choose-head"><h2>${etageText(st)}</h2>
        <p>Fais monter ta bankroll jusqu'au palier. Nombre de mises illimité : tu ne perds qu'à la faillite.</p></div>
      <div class="tables">${['petite', 'grande', 'boss'].map(card).join('')}</div>
      <div class="choose-foot"><span class="ri-chip seed">🌱 Seed ${st.seed}</span></div>`;
    $('choose').querySelectorAll('[data-act]').forEach(b => (b.onclick = () => {
      Sfx.play('click');
      if (b.dataset.act === 'play') { const r = H().chooseTable(); if (report(r)) { if (r.instant) toast('🎯 Ta bankroll dépasse déjà le palier : table gagnée !'); else startTableUI(); } }
      else { const r = H().skipTable(); if (report(r)) { if (r.text) toast(r.text); Sfx.play('joker'); renderChoose(); App.syncBalance(); } }
    }));
  }
  function startTableUI() {
    App.views().forEach(v => v.reset && v.reset());
    // mise proposée : 40 % de la mise max (≈ 10 % du palier), jamais sous la mise minimale
    BetControls.forEach(b => { if (!b.compact && Number.isFinite(b.maxFn())) b.set(Math.max(H().minBet(), Math.round(b.maxFn() * 0.4))); });
    enterGame();
    const t = S().table;
    if (t.boss) {
      const b = BOSSES[t.boss];
      modal(`<div class="intro"><div class="intro-n">☠ ${b.name}</div><div class="intro-boss">${b.desc()}</div>
        <div class="intro-goal">Atteins une bankroll de <b>${Util.fmt(t.target)}</b></div></div>`, [['Affronter le boss', () => {}, 'primary big']], 'intro-box');
    }
  }

  // ---------- Table gagnée : écran de célébration avant le Comptoir ----------
  function celebrate(next) {
    const sum = isRun() && S().summary;
    if (!sum) return next();
    document.querySelector('.win-ov')?.remove();
    const boss = sum.type === 'boss' ? BOSSES[sum.boss] : null;
    const title = sum.victory ? 'Victoire !' : boss ? 'Boss vaincu !' : 'Palier atteint !';
    const ov = el('div', 'win-ov' + (boss ? ' boss' : ''));
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', title);
    ov.innerHTML = `<div class="win-rays"></div>
      <div class="win-box">
        <div class="win-kicker">Étage ${sum.etage} · ${TABLE_NAME[sum.type]}${boss ? ` · ☠ ${boss.name}` : ''}</div>
        <div class="win-chip"><div class="logo-chip-face"><b>${sum.type === 'boss' ? '☠' : '✓'}</b></div></div>
        <h2 class="win-title">${title}</h2>
        <div class="win-bank"><span>Bankroll</span><b class="num" id="win-bank">0</b><i>/ ${Util.fmt(sum.target)}</i></div>
        <div class="win-bar"><i id="win-fill"></i></div>
        <div class="win-lines" ${sum.lines.some(l => l.value || l.bad) ? '' : 'hidden'}>${sum.lines.filter(l => l.value || l.bad).map((l, i) => `<div class="wl ${l.value < 0 || l.bad ? 'bad' : ''}" style="animation-delay:${1.1 + i * 0.35}s"><span>${l.label}</span>${l.value ? `<b class="num">${Util.signed(l.value)}</b>` : ''}</div>`).join('')}</div>
        <button class="btn primary big win-go">Au Comptoir ➜</button>
      </div>`;
    document.body.appendChild(ov);
    Sfx.play('bigwin');
    FX.confetti(160);
    setTimeout(() => FX.rain(45), 250);
    // la bankroll et la jauge se remplissent jusqu'au palier
    // la vraie bankroll (récompenses comprises) monte, remplit la jauge et déborde
    const end = Math.max(sum.target, H().bankroll()), t0 = performance.now(), dur = 1100;
    const tick = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      const b = ov.querySelector('#win-bank'); if (!b) return;
      const v = end * e;
      b.textContent = Util.fmt(Math.round(v));
      ov.querySelector('#win-fill').style.width = Math.min(100, v / sum.target * 100) + '%';
      if (v >= sum.target && !ov.classList.contains('over')) { ov.classList.add('over'); Sfx.play('step', 7); }
      if (k < 1) requestAnimationFrame(tick); else { b.classList.add('done'); Sfx.play('coins'); }
    };
    requestAnimationFrame(tick);
    const btn = ov.querySelector('.win-go');
    let gone = false;
    const go = () => { if (gone) return; gone = true; Sfx.play('click'); FX.clear(); ov.classList.add('out'); document.removeEventListener('keydown', key, true); setTimeout(() => ov.remove(), 300); next(); };
    const key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!btn.disabled) go(); } };
    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; btn.focus(); }, 900);
    btn.onclick = go;
    document.addEventListener('keydown', key, true);
  }

  // ---------- Shop ----------
  function renderShop() {
    const st = S();
    const nextInfo = H().tableInfo(st.tableType);
    const debt = st.debts[0];
    const next = H().tableTarget(st.tableType);
    $('shop').innerHTML = `
      <div class="sh-top">
        <h2>Le Comptoir</h2>
        <div class="sh-next">
          <span class="shn-bank"><span class="wallet-chip s"></span> Bankroll <b>${Util.fmt(H().bankroll())}</b></span>
          <span class="shn-arrow">➜</span>
          <span class="shn-goal">${TABLE_NAME[st.tableType]} · palier <b>${Util.fmt(next)}</b></span>
          ${nextInfo.boss ? `<span class="shn-boss" title="${BOSSES[nextInfo.boss].desc()}">☠ ${BOSSES[nextInfo.boss].name}</span>` : ''}
        </div>
      </div>
      <div class="sh-main">
        <div class="sh-jokers" id="shop-jokers"></div>
        <div class="sh-shelf">
          <div class="sh-items" id="shop-items"></div>
          <div class="sh-tools">
            <button class="btn reroll" id="shop-reroll">🔄 Relancer · <span class="wallet-chip s"></span> ${Util.fmt(st.shop.rerollCost)}</button>
            <button class="btn" id="shop-slot" ${H().slotPrice() ? '' : 'disabled'}>➕ Place de joker ${H().slotPrice() ? `· <span class="wallet-chip s"></span> ${Util.fmt(H().slotPrice())}` : '(max)'}</button>
            <button class="btn ghost" id="shop-loan">💳 ${debt ? `Dette : ${Util.fmt(debt.left)}` : 'Le Prêteur'}</button>
          </div>
        </div>
      </div>
      <div class="sh-hand">
        <div class="sh-hand-t">Ta main · ${st.jokers.length}/${st.jokerSlots} jokers <small>(touche un joker pour le déplacer ou le vendre)</small></div>
        <div class="sh-hand-row"><div class="joker-slots" id="shop-owned-jokers"></div><div class="sh-owned-items" id="shop-owned-items"></div></div>
      </div>
      <div class="shop-leave"><button class="btn primary big" id="shop-next">Table suivante ➜</button></div>`;
    const after = price => `<p class="pop-after">Après achat : bankroll <b>${Util.fmt(H().bankroll() - price)}</b> / palier <b>${Util.fmt(next)}</b></p>`;
    st.shop.offers.forEach((o, i) => {
      const card = itemCard(o.id, { big: o.kind === 'joker', disabled: o.sold, onClick: node => popover(node, sheetHtml(o.id) + (o.sold ? '' : after(o.price)), o.sold ? [] : [[`Acheter · <span class="wallet-chip s"></span> ${Util.fmt(o.price)}`, () => buy(i, node), 'primary', !H().canAfford(o.price)]]) });
      const wrap = el('div', 'offer ' + o.kind + (o.sold ? ' sold' : ''));
      wrap.appendChild(card);
      wrap.appendChild(el('p', 'offer-desc' + (o.kind === 'joker' ? '' : ' small'), CATALOG[o.id].desc(H())));
      const b = el('button', 'btn small ' + (H().canAfford(o.price) ? 'primary' : ''), '');
      b.setAttribute('aria-label', o.sold ? `${CATALOG[o.id].name} : vendu` : `Acheter ${CATALOG[o.id].name}, ${o.price} jetons`);
      b.innerHTML = o.sold ? 'Vendu' : `<span class="wallet-chip s"></span> ${Util.fmt(o.price)}`;
      b.disabled = o.sold || !H().canAfford(o.price);
      b.title = o.sold ? '' : `Acheter ${CATALOG[o.id].name}`;
      b.onclick = () => buy(i, card);
      wrap.appendChild(b);
      $(o.kind === 'joker' ? 'shop-jokers' : 'shop-items').appendChild(wrap);
    });
    renderJokers($('shop-owned-jokers'));
    const owned = $('shop-owned-items');
    st.consumables.forEach((id, i) => owned.appendChild(itemCard(id, { onClick: node => popover(node, sheetHtml(id), [['Utiliser', () => useConsumable(i), 'primary', !!CONSUMABLES[id].inPlayOnly || !!CONSUMABLES[id].capability]]) })));
    st.upgrades.forEach(id => owned.appendChild(itemCard(id, { onClick: node => popover(node, sheetHtml(id), []) })));
    $('shop-reroll').onclick = () => { if (report(H().reroll())) { Sfx.play('buy'); App.syncBalance(); } };
    $('shop-slot').onclick = () => { if (report(H().buySlot())) { Sfx.play('buy'); App.syncBalance(); } };
    $('shop-loan').onclick = () => {
      Sfx.play('click');
      const d = S().debts[0];
      const box = modal(`<h2>💳 Le Prêteur</h2>${d ? `<p>Dette en cours : <b>${Util.fmt(d.left)}</b> — ${Util.fmt(Math.min(d.per, d.left))} prélevés à chaque table gagnée.</p>`
        : `<p>Les jetons prêtés t'évitent la faillite, mais la dette est déduite de ta bankroll : elle ne fait pas avancer le palier.</p><div class="loan-row">${H().loanOptions().map(o => `<button class="btn loan" data-id="${o.id}">${o.name}<br><b>+${Util.fmt(o.amount)}</b><br><small>${Util.fmt(Math.round(o.amount * (1 + o.rate)))} à rendre en ${o.tables} tables</small></button>`).join('')}</div>`}`, [['Fermer', () => {}]]);
      box.querySelectorAll('.loan').forEach(b => (b.onclick = () => { if (report(H().takeLoan(b.dataset.id))) { Sfx.play('coins'); App.syncBalance(); closeModal(); toast('💳 Prêt accordé. Attention aux échéances !'); } }));
    };
    $('shop-next').onclick = () => {
      Sfx.play('click');
      if (S().phase === 'victory') return victoryModal();
      // confirmation si un achat est encore possible
      const free = S().jokers.length < S().jokerSlots;
      const can = S().shop.offers.filter(o => !o.sold && o.kind === 'joker' && free && H().canAfford(o.price));
      if (!can.length || !Settings.confirmShop) return H().leaveShop();
      modal(`<h2>Quitter le shop ?</h2><p>Tu peux encore t'offrir : <b>${can.map(o => CATALOG[o.id].name).join(', ')}</b>.</p><p class="hint">Cette confirmation se désactive dans les options (⚙).</p>`,
        [['Rester', () => {}], ['Quitter quand même', () => H().leaveShop(), 'primary']], '', { esc: 0 });
    };
  }
  function buy(i, node) {
    // la carte achetée s'envole vers ta main
    if (node && node.isConnected && H().canAfford(S().shop.offers[i].price)) {
      const r0 = node.getBoundingClientRect(), hand = $('shop-owned-jokers');
      if (hand) {
        const r1 = hand.getBoundingClientRect(), fly = node.cloneNode(true);
        fly.className += ' flying';
        Object.assign(fly.style, { position: 'fixed', left: r0.left + 'px', top: r0.top + 'px', width: r0.width + 'px', height: r0.height + 'px', margin: 0, zIndex: 120 });
        document.body.appendChild(fly);
        requestAnimationFrame(() => { fly.style.transform = `translate(${r1.left + 40 - r0.left}px, ${r1.top - r0.top}px) scale(.55) rotate(-12deg)`; fly.style.opacity = '.2'; });
        setTimeout(() => fly.remove(), 650);
      }
    }
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

  // Joker de départ : le premier choix de build
  function starterModal() {
    const ids = isRun() && S().starter;
    if (!ids || !ids.length) return;
    const box = modal(`<h2>Ton joker de départ</h2><p class="center">Le premier joker de ton build. Les paliers montent vite : choisis bien.</p><div class="pack-cards starter-cards"></div>`, [], 'wide starter-box', { esc: -1 });
    const row = box.querySelector('.starter-cards');
    ids.forEach((id, k) => {
      const wrap = el('div', 'pack-choice');
      wrap.style.animationDelay = `${k * 0.12}s`;
      wrap.appendChild(itemCard(id, { big: true }));
      wrap.appendChild(el('p', '', JOKERS[id].desc(H())));
      const g = (JOKERS[id].tags || []).find(t => ['Blackjack', 'Roulette', 'Dice', "Hold'em", 'Machine'].includes(t));
      wrap.appendChild(el('p', 'best-on', g ? `Meilleur au ${g}` : 'Marche partout'));
      const b = el('button', 'btn primary', 'Prendre');
      b.setAttribute('aria-label', `Prendre ${JOKERS[id].name}`);
      b.onclick = () => {
        if (!report(H().pickStarter(id))) return;
        Sfx.play('joker'); closeModal(); renderRunBar(); toast(`${JOKERS[id].icon} ${JOKERS[id].name} rejoint ta main !`);
        // on ouvre directement le jeu où ce joker brille
        const GID = { Blackjack: 'bj', Roulette: 'roulette', Dice: 'dice', "Hold'em": 'uth', Machine: 'slots' };
        if (g) showTab(GID[g]);
      };
      wrap.appendChild(b);
      row.appendChild(wrap);
    });
  }

  // ---------- Menu, cosmétiques, aide ----------
  // ---- Défi du jour : seed commune, 3 étages, carnet de tampons qui ne revient jamais à zéro ----
  const dayKey = (d = new Date()) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const weekKey = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return dayKey(x); };
  const stampsThisWeek = () => { const w = weekKey(); return (META.stamps || []).filter(k => weekKey(new Date(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6))) === w).length; };
  function checkCarnet() {
    const w = weekKey();
    if (stampsThisWeek() >= 5 && !(META.stampRewards || {})[w]) {
      (META.stampRewards = META.stampRewards || {})[w] = true;
      const name = Cosmetics.grantExclusive();
      saveMeta();
      toast(name ? `📒 Carnet complet cette semaine : « ${name} » débloqué !` : '📒 Carnet complet : +3 ✦ prestige !');
    }
  }
  // ---- Quêtes : les prochains jokers à débloquer, avec leur progression ----
  function questList(n = 3) {
    const p = META.progress || {};
    return UNLOCKS.filter(u => !(META.jokersUnlocked || []).includes(u.id)).slice(0, n)
      .map(u => ({ u, v: Math.min(u.goal, p[u.key] || 0) }));
  }
  const questHtml = ({ u, v }) => `<div class="quest"><div class="q-art">${JokerArt.svg(u.id)}</div><div class="q-body"><b>🔒 ${JOKERS[u.id].name}</b><span>${u.quest}</span><div class="q-bar"><i style="width:${v / u.goal * 100}%"></i></div><small>${v} / ${u.goal}</small></div></div>`;
  let stakePick = 0;
  function renderMenu() {
    checkCarnet();
    $('m-continue').hidden = !Engine.hasSave();
    $('m-prestige').textContent = `✦ ${META.prestige}`;
    const unlocked = JOKER_DEFS.filter(d => !UNLOCK_OF[d.id] || (META.jokersUnlocked || []).includes(d.id)).length;
    $('m-stats').innerHTML = `Meilleur étage : <b>${META.best}</b> · Parties : <b>${META.runs}</b> · Victoires : <b>${META.wins}</b> · Jokers débloqués : <b>${unlocked}</b> / ${JOKER_DEFS.length}`;
    // niveau de difficulté (après une première victoire)
    const max = META.maxStake || 0;
    stakePick = Math.min(stakePick, max);
    $('m-stake').hidden = max <= 0;
    $('m-stake').innerHTML = `<span>Difficulté :</span>${STAKES.slice(0, max + 1).map((s, i) => `<button class="stake ${i === stakePick ? 'on' : ''}" data-stake="${i}" title="${s.n} : ${s.d}" aria-label="${s.n} : ${s.d}" aria-pressed="${i === stakePick}" style="--sc:${s.c}"></button>`).join('')}<em>${STAKES[stakePick].n}</em>`;
    $('m-stake').querySelectorAll('[data-stake]').forEach(b => (b.onclick = () => { stakePick = +b.dataset.stake; Sfx.play('chip'); renderMenu(); }));
    // défi du jour
    const today = (META.daily || {})[dayKey()];
    $('m-daily-info').textContent = `· carnet ${Math.min(5, stampsThisWeek())}/5${today ? ` · record du jour : étage ${today.won ? '3 ✓' : today.best}` : ''}`;
    // quêtes
    const qs = questList();
    $('m-quests').innerHTML = qs.length ? `<div class="mq-t">Jokers à débloquer</div>${qs.map(questHtml).join('')}` : '<div class="mq-t">Tous les jokers sont débloqués !</div>';
  }
  function recordsModal() {
    const R = META.records || {}, p = META.progress || {};
    const days = Object.entries(META.daily || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
    const fmtDay = k => `${k.slice(6)}/${k.slice(4, 6)}`;
    modal(`<h2>🏅 Records</h2>
      <div class="over-stats">
        <div><span>Meilleur étage</span><b class="num">${META.best || 0}</b></div>
        <div><span>Victoires</span><b class="num">${META.wins || 0}</b></div>
        <div><span>Plus gros gain</span><b class="num">${Util.fmt(R.bestNet || 0)}</b></div>
        <div><span>Meilleur × mise</span><b class="num">×${Util.fmt(R.bestRatio || 0)}</b></div>
        <div><span>Plus gros multi</span><b class="num">×${Util.fmt(R.bestMult || 0)}</b></div>
        <div><span>Victoires d'affilée</span><b class="num">${R.bestStreak || 0}</b></div>
        <div><span>Bonus de la machine</span><b class="num">${R.bonus || 0}</b></div>
        <div><span>Sept tirés</span><b class="num">${p.sevens || 0}</b></div>
        <div><span>Difficulté max</span><b class="num">${STAKES[META.maxStake || 0].n}</b></div>
      </div>
      <h3>Défi du jour</h3>
      <p>Carnet de la semaine : <b>${Math.min(5, stampsThisWeek())} / 5</b> tampons (un tampon dès que tu bats le premier boss ; le carnet ne revient jamais à zéro, et 5 tampons dans la semaine débloquent un cosmétique exclusif).</p>
      ${days.length ? `<div class="daily-list">${days.map(([k, d]) => `<div><span>${fmtDay(k)}</span><b>${d.won ? '🏆 Gagné' : `étage ${d.best}`}</b></div>`).join('')}</div>` : '<p class="hint">Pas encore de défi joué.</p>'}`, [['Fermer', () => {}, 'primary']], 'wide');
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
        <li>À chaque table, fais monter ta <b>bankroll</b> (tes jetons, moins tes dettes) jusqu'au <b>palier</b> affiché en haut, sur le jeu de ton choix. Nombre de mises illimité, avec une mise minimale et une mise maximale qui suivent le palier.</li>
        <li>La <b>mise max</b> vaut ${Math.round(P.miseMaxRatio * 100)} % du palier : plus les paliers montent, plus tu peux miser gros.</li>
        <li>Tu as <b>${P.relancesParTable} relances</b> par table pour refaire un tirage raté sans miser à nouveau.</li>
        <li>Palier atteint : récompense (une part du palier) et ${Math.round(P.interets.taux * 100)} % d'intérêts sur tes jetons, puis le <b>Comptoir</b>. Les prix y suivent tes paliers : un joker coûte toujours une vraie part de ta bankroll.</li>
        <li>Les paliers montent de plus en plus vite et la mise max baisse en proportion : sans <b>build</b> de jokers (multiplicateurs, jokers qui grandissent, spécialistes d'un jeu), impossible d'atteindre les derniers étages.</li>
        <li>Tu peux <b>passer</b> la petite ou la grande table pour gagner un <b>tag</b> (bonus), mais pas le Boss, qui impose une règle spéciale.</li>
        <li>Tu ne perds qu'à la <b>faillite</b>. Bats le boss de l'étage ${P.etagesPourGagner} pour gagner, puis continue en mode infini.</li>
        <li>Les jokers s'appliquent de <b>gauche à droite</b>. Chaque gain affiche son détail. Chaque partie a une <b>seed</b> : même seed et mêmes choix = même partie.</li>
      </ul>`, [['Compris !', () => {}, 'primary']]);
  }
  function enterGame() { screen('game'); renderRunBar(); refreshGames(); }

  // ---------- Sessions ----------
  function showPhase() {
    const ph = S().phase;
    renderRunBar();
    if (S().pendingPack && S().pendingPack.length) setTimeout(() => openPack(S().pendingPack), 300);
    if (ph === 'choose') { renderChoose(); screen('choose'); if (Settings.tutorialDone) setTimeout(starterModal, 150); }
    else if (ph === 'shop' || ph === 'victory') { renderShop(); screen('shop'); if (ph === 'victory') victoryModal(); }
    else enterGame();
  }
  function startRun(seed, opts = {}) { App.attach(Engine.newRun({ seed, meta: META, stake: opts.daily ? 0 : stakePick, ...opts })); showPhase(); if (!Settings.tutorialDone) tutorial(); }
  function startDaily() {
    const k = dayKey();
    const go = () => { Engine.clearSave(); startRun(`JOUR-${k}`, { express: true, daily: k }); toast(`📅 Défi du ${k.slice(6)}/${k.slice(4, 6)} : 3 étages, la même partie pour tout le monde.`); };
    if (Engine.hasSave()) return modal('<h2>Défi du jour ?</h2><p>La partie en cours sera abandonnée.</p>', [['Garder ma partie', () => {}], ['Jouer le défi', go, 'primary']], '', { esc: 0 });
    go();
  }
  // Tutoriel de première partie : 3 bulles, pas un mur de texte
  function tutorial(step = 0) {
    const P = CONFIG.progression;
    const steps = [
      `<div class="tuto"><div class="tuto-n">1 / 3</div><h2>Le but</h2><p>Fais grimper ta bankroll de <b>${P.jetonsDepart}</b> à <b>${Util.fmt(H().objective(1, 'petite'))} jetons</b>, puis à des paliers toujours plus hauts.<br>Nombre de mises illimité : tu ne perds qu'à la <b>faillite</b>. La jauge en haut montre où tu en es.</p></div>`,
      `<div class="tuto"><div class="tuto-n">2 / 3</div><h2>Ta mise</h2><p>Choisis ta mise avec les <b>jetons</b> sur le rebord de la table, puis appuie sur le gros bouton doré.<br>La <b>mise max</b> grandit avec les paliers. Le bouton <b>?</b> sur le tapis donne les règles du jeu.</p></div>`,
      `<div class="tuto"><div class="tuto-n">3 / 3</div><h2>Les jokers</h2><p>Entre les tables, achète des <b>jokers</b> au Comptoir : ils boostent tes gains. Ils apparaissent en bas de l'écran ; touche-les pour voir ce qu'ils font.<br>Raté un tirage ? Une <b>relance</b> te donne une 2ᵉ chance.</p></div>`,
    ];
    modal(steps[step], step < steps.length - 1
      ? [['Passer le tutoriel', () => { Settings.set('tutorialDone', true); setTimeout(starterModal, 50); }, 'link'], ['Suivant ➜', () => { setTimeout(() => tutorial(step + 1), 0); }, 'primary']]
      : [['C\'est parti !', () => { Settings.set('tutorialDone', true); setTimeout(starterModal, 50); }, 'primary']], 'tuto-box', { esc: 0 });
  }
  function resume() {
    const h = Engine.load({ meta: META });
    if (!h) { toast('Aucune partie à reprendre.'); return renderMenu(); }
    App.attach(h);
    showPhase();
    // une main était en cours quand le jeu a été fermé : elle a été terminée prudemment
    if (h.state.pending) {
      const r = h.resumePending();
      App.syncBalance(true);
      if (r) toast(`⏸ Ta main en cours a été terminée pour toi (choix prudents) : ${Util.signed(r.net)} jetons.`);
      renderRunBar();
    }
  }
  function freeMode() { App.attach(Engine.free({ meta: META })); enterGame(); }
  // Bilan de partie : étage, tables, meilleur gain, joker MVP, seed
  const GAME_NAME = { bj: 'Blackjack', uth: 'Hold\'em', roulette: 'Roulette', slots: 'Machine', dice: 'Dice' };
  function recap(st) {
    const earned = Object.entries(st.stats.jokerEarned || {}).sort((a, b) => b[1] - a[1]);
    const mvp = earned.length && earned[0][1] > 0 ? earned[0] : null;
    const bp = st.stats.bestPlay;
    return `<div class="over-stats">
        <div><span>Étage atteint</span><b class="num">${st.etage}</b></div>
        <div><span>Tables gagnées</span><b class="num">${st.stats.tablesWon}</b></div>
        <div><span>Mises jouées</span><b class="num">${st.stats.plays}</b></div>
        <div><span>Temps</span><b class="num">${fmtTime(st.elapsed || 0)}</b></div>
        <div><span>Meilleur gain</span><b class="num">${bp ? '+' + Util.fmt(Math.round(bp.net)) : '—'}</b>${bp ? `<small>${GAME_NAME[bp.game] || ''}</small>` : ''}</div>
      </div>
      ${mvp ? `<div class="mvp"><div class="mvp-card">${itemCard(mvp[0]).outerHTML}</div><div><span>Joker MVP</span><b>${JOKERS[mvp[0]].name}</b><small>a rapporté ${Util.fmt(Math.round(mvp[1]))} jetons</small></div></div>` : ''}
      <p class="seed-line">🌱 Seed : <b>${st.seed}</b>${st.express ? ' · Défi du jour (Express)' : ''}${st.stake ? ` · ${STAKES[st.stake].n}` : ''}</p>
      ${(st.newUnlocks || []).length ? `<div class="unl"><b>🔓 Débloqué pendant cette partie :</b> ${st.newUnlocks.map(id => `${JOKERS[id].icon} ${JOKERS[id].name}`).join(', ')}</div>` : ''}
      ${questList(1).length ? `<div class="next-q"><span>Prochain joker à débloquer</span>${questHtml(questList(1)[0])}</div>` : ''}`;
  }
  function victoryModal() {
    const st = S();
    Sfx.play('fanfare');
    modal(`<div class="intro"><div class="intro-n">🏆 Victoire !</div><p>${st.express ? 'Défi du jour réussi : 3 étages vaincus !' : `Tu as fait sauter la banque du Boubouz'ino : ${CONFIG.progression.etagesPourGagner} étages vaincus.${st.stake < STAKES.length - 1 && !st.express ? ` Niveau débloqué : <b>${STAKES[Math.min(STAKES.length - 1, (st.stake || 0) + 1)].n}</b>.` : ''}`}</p>
      ${recap(st)}<p>✦ +${CONFIG.prestige.perBoss + CONFIG.prestige.victory} prestige</p></div>`,
    [['Continuer en mode infini', () => H().continueInfinite(), 'primary'], ['Terminer la partie', () => { Engine.clearSave(); App.attach(null); renderMenu(); screen('menu'); }]], 'intro-box');
  }

  // ---------- Options ----------
  const toggle = key => `<button class="btn small ${Settings[key] ? 'primary' : ''}" data-opt="${key}" data-val="1" aria-pressed="${!!Settings[key]}">Oui</button><button class="btn small ${!Settings[key] ? 'primary' : ''}" data-opt="${key}" data-val="0" aria-pressed="${!Settings[key]}">Non</button>`;
  function settingsModal() {
    const box = modal(`<h2>Options</h2>
      <div class="opt"><span>Vitesse des animations</span><div class="seg">${[1, 2, 4].map(v => `<button class="btn small ${Settings.speed === v ? 'primary' : ''}" data-speed="${v}">${v}×</button>`).join('')}</div></div>
      <div class="opt"><span>Son</span><div class="seg"><button class="btn small ${Sfx.settings.on ? 'primary' : ''}" data-snd="1">Activé</button><button class="btn small ${!Sfx.settings.on ? 'primary' : ''}" data-snd="0">Coupé</button></div></div>
      <div class="opt"><span>Volume</span><input type="range" min="0" max="1" step="0.05" value="${Sfx.settings.volume}" id="opt-vol" aria-label="Volume"></div>
      <div class="opt"><span>Texte agrandi</span><div class="seg">${toggle('bigText')}</div></div>
      <div class="opt"><span>Couleurs pour daltoniens (bleu / orange)</span><div class="seg">${toggle('colorblind')}</div></div>
      <div class="opt"><span>Confirmer avant de quitter le shop</span><div class="seg">${toggle('confirmShop')}</div></div>
      <div class="opt"><span>Tutoriel</span><div class="seg"><button class="btn small" id="opt-tuto">Revoir</button></div></div>
      <div class="opt"><span>Effets visuels</span><div class="seg">${[['full', 'Complets'], ['reduced', 'Réduits'], ['none', 'Aucun']].map(([v, l]) => `<button class="btn small ${Settings.fx === v ? 'primary' : ''}" data-fx="${v}" aria-pressed="${Settings.fx === v}">${l}</button>`).join('')}</div></div>
      <div class="opt"><span>Accepter tout seul une perte (relance proposée quelques secondes)</span><div class="seg">${toggle('autoAccept')}</div></div>
      <p class="hint">Raccourcis : Espace ou Entrée = action principale · 1 à 5 = changer de jeu · T tirer · S rester · D doubler · P séparer · C check · R relance · A accepter · J replier les jokers · Échap = fermer.</p>`, [['Fermer', () => {}, 'primary']]);
    box.querySelectorAll('[data-opt]').forEach(b => (b.onclick = () => { Settings.set(b.dataset.opt, b.dataset.val === '1'); Sfx.play('click'); settingsModal(); }));
    box.querySelector('#opt-tuto').onclick = () => { Sfx.play('click'); closeModal(); if (isRun()) setTimeout(() => tutorial(0), 50); else toast('Le tutoriel s\'affichera au début de ta prochaine partie.'); Settings.set('tutorialDone', false); };
    box.querySelectorAll('[data-fx]').forEach(b => (b.onclick = () => { Settings.set('fx', b.dataset.fx); Sfx.play('click'); settingsModal(); }));
    box.querySelectorAll('[data-speed]').forEach(b => (b.onclick = () => { Settings.setSpeed(+b.dataset.speed); Sfx.play('click'); settingsModal(); }));
    box.querySelectorAll('[data-snd]').forEach(b => (b.onclick = () => { if (Sfx.settings.on !== (b.dataset.snd === '1')) Sfx.toggle(); $('sound').textContent = Sfx.settings.on ? '🔊' : '🔇'; Sfx.play('click'); settingsModal(); }));
    box.querySelector('#opt-vol').oninput = e => Sfx.setVolume(+e.target.value);
  }

  // ---------- Collection : jokers découverts, boss battus ----------
  function renderCollection() {
    const C = META.collection || { jokers: {}, bosses: {} };
    const seen = JOKER_DEFS.filter(d => C.jokers[d.id] && C.jokers[d.id].seen);
    const beaten = BOSS_DEFS.filter(b => C.bosses[b.id]);
    const card = d => {
      const c = C.jokers[d.id];
      const lock = UNLOCK_OF[d.id] && !(META.jokersUnlocked || []).includes(d.id) ? UNLOCK_OF[d.id] : null;
      if (lock) return `<div class="col-item locked">${questHtml({ u: lock, v: Math.min(lock.goal, (META.progress || {})[lock.key] || 0) })}</div>`;
      if (!c || !c.seen) return `<div class="col-item locked"><div class="jcard r-${d.rarity}"><div class="jc-frame"><div class="jc-art locked-art">?</div><div class="jc-name">${RAR_SYM[d.rarity]} ???</div></div></div><small>Non découvert</small></div>`;
      return `<div class="col-item">${itemCard(d.id).outerHTML}<small>${c.owned ? `possédé ${c.owned}× · ${c.wins} victoire(s)<br>${Util.fmt(Math.round(c.earned))} jetons rapportés` : 'vu au Comptoir'}</small></div>`;
    };
    $('collection').innerHTML = `<div class="cos-head"><h2>Collection</h2>
        <p><b class="num">${seen.length}</b> / ${JOKER_DEFS.length} jokers découverts · <b class="num">${beaten.length}</b> / ${BOSS_DEFS.length} boss battus</p></div>
      <h3>Jokers</h3><div class="col-grid">${JOKER_DEFS.map(card).join('')}</div>
      <h3>Boss</h3><div class="boss-grid">${BOSS_DEFS.map(b => `<div class="boss-item ${C.bosses[b.id] ? '' : 'locked'}"><b>☠ ${C.bosses[b.id] ? b.name : '???'}</b><span>${C.bosses[b.id] ? b.desc() : 'Pas encore battu'}</span>${C.bosses[b.id] ? `<i>battu ${C.bosses[b.id]}×</i>` : ''}</div>`).join('')}</div>
      <div class="cos-foot"><button class="btn big" id="col-back">⬅ Retour</button></div>`;
    $('col-back').onclick = () => { renderMenu(); screen('menu'); };
  }

  // ---------- Événements ----------
  App.on('session', () => renderRunBar());
  App.on('change', () => {
    // pastille sur l'onglet du jeu où un coup est en cours
    const act = App.host && App.host.active && App.host.active();
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('busy', !!act && act.id === t.dataset.tab && tab !== t.dataset.tab));
    if (!App.host) return;
    renderRunBar();
    if (isRun() && S().phase === 'shop' && !$('screen-shop').hidden) renderShop();
  });
  App.on('table', () => renderRunBar());
  App.on('choose', () => { closeModal(); renderRunBar(); renderChoose(); screen('choose'); });
  App.on('shop', () => { closeModal(); celebrate(() => { renderRunBar(); renderShop(); screen('shop'); }); });
  App.on('victory', () => { closeModal(); celebrate(() => { renderRunBar(); renderShop(); screen('shop'); victoryModal(); FX.confetti(220); FX.rain(90); }); });
  App.on('over', () => {
    const st = S();
    Sfx.play('gameover');
    FX.rain(0);
    modal(`<div class="intro ruin"><div class="ruin-chips" aria-hidden="true">${'<i></i>'.repeat(7)}</div><div class="intro-n lose">Ruiné !</div><p>${st.reason} Étage ${st.etage}, ${st.stats.tablesWon} table(s) gagnée(s).</p>${recap(st)}</div>`,
    [['Nouvelle partie', () => startRun(), 'primary'], ['Rejouer cette seed', () => startRun(st.seed)], ['Menu principal', () => { App.attach(null); renderMenu(); screen('menu'); }]], 'intro-box');
  });
  App.on('toast', toast);
  App.on('flash', ({ uid, text }) => {
    document.querySelectorAll(`.jcard[data-uid="${uid}"]`).forEach(n => {
      n.classList.remove('trigger'); void n.offsetWidth; n.classList.add('trigger');
      const z = el('div', 'jc-zap'); n.appendChild(z); setTimeout(() => z.remove(), 600);
      const f = el('div', 'jc-float', text);
      n.appendChild(f);
      setTimeout(() => f.remove(), 1200);
    });
  });

  // ---------- Boutons du menu ----------
  const newGame = () => {
    Sfx.play('click');
    const go = () => { Engine.clearSave(); startRun($('m-seed').value.trim() || undefined); };
    if (Engine.hasSave()) return modal('<h2>Nouvelle partie ?</h2><p>La partie en cours sera abandonnée.</p>', [['Garder ma partie', () => {}], ['Nouvelle partie', go, 'primary']], '', { esc: 0 });
    go();
  };
  $('m-new').onclick = newGame;
  $('m-daily').onclick = () => { Sfx.play('click'); startDaily(); };
  $('m-records').onclick = () => { Sfx.play('click'); recordsModal(); };
  $('m-seed').onkeydown = e => { if (e.key === 'Enter') newGame(); };
  $('m-continue').onclick = () => { Sfx.play('click'); resume(); };
  $('m-free').onclick = () => { Sfx.play('click'); freeMode(); };
  $('m-cosmetics').onclick = () => { Sfx.play('click'); renderCosmetics(); screen('cosmetics'); };
  $('m-howto').onclick = () => { Sfx.play('click'); howTo(); };
  $('m-collection').onclick = () => { Sfx.play('click'); renderCollection(); screen('collection'); };
  $('settings').onclick = () => { Sfx.play('click'); settingsModal(); };
  $('home').onclick = () => {
    if (App.host && (App.host.busy() || App.isAnimating())) return toast('Termine le coup en cours avant de quitter la table.');
    Sfx.play('click');
    if (App.host) App.host.save(); // la partie reste sauvegardée et peut être reprise
    App.attach(null);
    renderMenu(); screen('menu');
  };
  $('reset').onclick = () => { if (confirm(`Remettre le solde à ${Util.fmt(CONFIG.freeChips)} jetons ?`)) { App.host.resetFree(); App.syncBalance(); } };

  // ---------- Rangée de jokers repliable ----------
  const paintDock = () => { $('dock-toggle').textContent = Settings.dockMin ? '▴ Jokers' : '▾ Jokers'; $('dock-toggle').setAttribute('aria-expanded', String(!Settings.dockMin)); };
  $('dock-toggle').onclick = () => { Settings.set('dockMin', !Settings.dockMin); paintDock(); Sfx.play('click'); };
  paintDock();

  // ---------- Règles de chaque jeu (bouton « ? » sur le tapis) ----------
  document.querySelectorAll('.rules-btn').forEach(b => (b.onclick = () => {
    Sfx.play('click');
    modal(`<div class="rules-modal">${$('rules-' + b.dataset.rules).innerHTML}</div>`, [['OK', () => {}, 'primary']], 'wide');
  }));

  // ---------- Minuteur de partie (bilan et speedrun) ----------
  setInterval(() => {
    if (!isRun() || document.hidden || !['game', 'choose', 'shop'].includes(document.body.dataset.screen)) return;
    S().elapsed = (S().elapsed || 0) + 1;
    const t = $('hud-timer');
    if (t) t.textContent = fmtTime(S().elapsed);
  }, 1000);

  // ---------- Raccourcis clavier ----------
  const KEYMAP = { t: 'hit', h: 'hit', s: 'stand', d: 'double', p: 'split', c: 'check', r: 'reroll', a: 'accept', f: 'fold' };
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') {
      if (!$('popover').hidden) return closePopover();
      if (!$('modal').hidden && escAction) { e.preventDefault(); return escAction(); }
      return;
    }
    if (document.querySelector('.win-ov, .tier-ov')) return;
    if (!$('modal').hidden) return; // une fenêtre ouverte garde la main (Entrée = bouton focalisé)
    const scr = document.body.dataset.screen;
    // Entrée / Espace sur un élément focalisé : c'est lui qui agit, pas un raccourci
    const focused = e.target && e.target.closest && e.target.closest('button, a, [tabindex], input, select, textarea');
    if ((e.key === 'Enter' || e.key === ' ') && focused) return;
    if (k === 'j' && isRun()) { $('dock-toggle').click(); return; }
    if (scr === 'choose' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const b = document.querySelector('#choose [data-act=play]'); if (b) b.click(); return; }
    if (scr === 'shop' && e.key === 'Enter') { e.preventDefault(); $('shop-next').click(); return; }
    if (scr !== 'game') return;
    if (/^[1-5]$/.test(e.key)) { const t = document.querySelectorAll('.tab')[+e.key - 1]; if (t) t.click(); return; }
    const bar = document.querySelector('.game:not([hidden]) .actions');
    if (!bar) return;
    const btns = [...bar.querySelectorAll('button:not([disabled])')];
    if ((e.key === ' ' || e.key === 'Enter') && !(e.target.tagName === 'BUTTON' && e.target !== document.body)) {
      e.preventDefault();
      const b = bar.querySelector('button.primary:not([disabled])') || btns[0];
      if (b) b.click();
      return;
    }
    // lettres : actions du moteur (Tirer, Rester, Doubler…) d'après leur libellé
    const want = { hit: /^tirer/i, stand: /^rester/i, double: /^doubler/i, split: /^séparer/i, check: /^check/i, reroll: /relancer|refaire/i, accept: /^accepter/i, fold: /coucher/i }[KEYMAP[k]];
    if (want) { const b = btns.find(x => want.test(x.textContent.trim().replace(/^[^\wÀ-ÿ]+/, ''))); if (b) { e.preventDefault(); b.click(); } }
  });

  // Petite fenêtre de confirmation réutilisable (achat de bonus…)
  const confirm = (html, label, fn) => modal(html, [['Annuler', () => {}], [label, fn, 'primary']], 'confirm-box', { esc: 0 });
  return { screen, showTab, renderMenu, renderRunBar, toast, confirm };
})();

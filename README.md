# ♠ Boubouz'ino

Casino **roguelike gratuit, avec des jetons fictifs uniquement** (aucun argent réel), en HTML/CSS/JavaScript pur.
Aucune installation : ouvrez `index.html` dans un navigateur.

## Le jeu

- **100 jetons** au départ. Chaque **manche** donne **10 tours** (une main, un tirage ou un lancer = 1 tour) pour atteindre un **objectif de gain**, avec une **mise max** qui augmente.
- Objectif atteint : encaissez (+2 jetons par tour restant) ou continuez. Tours épuisés sans l'objectif, ou faillite : partie perdue.
- Toutes les 3 manches (et à la 8e), un **Patron** impose un malus. 8 manches pour gagner, puis mode infini.
- Entre les manches, **le Comptoir** : 3 jokers + 2 consommables (tirage pondéré par rareté, jamais un joker déjà possédé), packs, améliorations, relance du shop à prix croissant, revente à 50 %, emplacements de joker supplémentaires et **le Prêteur** (prêt remboursé à chaque fin de manche, pénalité et huissier si une échéance est impayée).
- 5 jeux : **Ultimate Texas Hold'em** (avec probabilités en direct), **Blackjack** (assurance), **Roulette** (avec joueurs IA), **Machine à sous**, **Dice**. Un **mode libre** permet de jouer sans objectif.
- Chaque gain affiche son **détail** : mise → rendu brut → bonus en % → multiplicateurs → bonus fixes, joker par joker.
- Sons synthétisés (bouton 🔊), cosmétiques (tapis, dos de cartes) débloqués avec le prestige, interface jouable sur téléphone.

## Seed et rejouabilité

Tout le hasard de la partie (cartes, roulette, machine, dé, shop, patrons, événements) vient d'**un seul générateur seedé** (mulberry32, `js/core/rng.js`), dont l'état est stocké dans la partie.
Entrez une seed au menu (ou « Rejouer cette seed » en fin de partie) : **même seed + mêmes choix = même partie**.
Les animations purement décoratives utilisent une instance séparée du même générateur, pour ne jamais modifier le déroulement. Il n'y a aucun `Math.random()` dans le code.

## Équilibrage et simulation

Toutes les valeurs (objectifs, mises, tours, prix, raretés, effets des jokers, prêts, tables de paiement) sont dans **`js/core/config.js`**.

Pour mesurer l'effet d'un changement :

- **Navigateur** : ouvrez la console et tapez `Sim.run(1000)`.
- **Node** : `node tools/simulate.js 1000 [seed] [jeu]` (`jeu` = `mixed`, `bj`, `uth`, `dice`, `roulette`, `slots`).

La simulation joue des parties complètes avec une stratégie simple (blackjack de base, Dice risqué en fin de manche, achat de jokers en gardant une réserve) et affiche le taux de victoire, la manche moyenne atteinte, la répartition des manches et les jokers les plus présents dans les parties gagnées.

Tests du moteur : `node tools/test-engine.js`.

## Architecture

```
js/core/            moteur, sans DOM (fonctionne aussi sous Node)
  rng.js            générateur seedé unique
  config.js         toutes les valeurs d'équilibrage
  storage.js        localStorage protégé (try/catch)
  deck.js           cartes et sabots (données pures)
  handEval.js       évaluation des mains de poker
  odds.js           probabilités en direct du Hold'em
  modifiers.js      jokers, patrons, règles, améliorations, statuts, consommables
  engine.js         état unique sérialisable, événements, règlement, manches, shop, prêts, sauvegarde
  games/*.js        un module par jeu, même interface
  sim.js            simulation
js/ui/              interface
  app.js            session, compteur de jetons, détail animé des gains
  views/*.js        une vue par jeu (affichage et animations seulement)
  runui.js          menu, barre de partie, shop, fenêtres
  cards.js, sound.js, cosmetics.js, util.js, main.js
tools/              simulate.js, test-engine.js
```

### Jokers par événements

Chaque joker est un objet de données (id, nom, rareté, prix, description, état interne) avec des fonctions qui réagissent à des événements :
`onRoundStart`, `onRoundEnd`, `onShopEnter`, `onBetPlaced`, `onCardDrawn`, `onDraw`, `onResolve`, `onSettle`, `onWin`, `onLoss`, `onPush`, `onBankrupt`.
Les jeux ne connaissent aucun joker : ils émettent des événements et lisent des **requêtes** que les modificateurs peuvent modifier (`maxBet`, `deck.exclude`, `bj.rules`, `bj.dealerSkip`, `bj.info`, `uth.rules`, `dice.edge`, `slots.symbols`, `slots.wild`).

- Ordre déterministe : améliorations → statuts → patron → jokers de **gauche à droite**.
- Le **Miroir** se résout vers le premier joker non-miroir à sa droite (avec garde-fou anti-boucle) et garde son propre état. Le **Parrain** compte les autres jokers.
- L'état interne des jokers (série de la Martingale, règle de la Roue Folle…) est conservé entre les manches ; le multiplicateur du Jackpot Éternel est conservé entre les parties.
- Vendre un joker met fin immédiatement à ses effets (relances accordées, règle active…). La vente est bloquée pendant un coup.

### Formule des gains

```
gain brut  = rendu − mise            (après ajustements de paiement : Rouge Fidèle, Zéro Ami…)
gain final = gain brut × (1 + Σ bonus %) × Π multiplicateurs     (si gain brut > 0)
net        = gain final + Σ bonus fixes                          (Septième Ciel, Consolation, Main Molle…)
```

Chaque étape est enregistrée avec sa source et affichée au joueur.

### Ajouter un jeu

Créez `js/core/games/monjeu.js` avec `Games.register({ id, name, start, actions, act, resolve, capabilities })`, une vue dans `js/ui/views/` et une section dans `index.html`. Aucun joker n'est à modifier : les effets génériques (bonus, multiplicateurs, 7 tirés, relances, pertes…) s'appliquent automatiquement.

### Sauvegarde

Toute la partie (jetons, manche, jokers et leur état, seed et état du générateur, consommables, dettes, sabot du blackjack) tient dans un seul objet JSON, sauvegardé dans `localStorage` à chaque fin de manche et après chaque coup.

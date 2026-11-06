# ♠ Boubouz'ino

Casino **roguelike gratuit, avec des jetons fictifs uniquement** (aucun argent réel), en HTML/CSS/JavaScript pur.
Aucune installation : ouvrez `index.html` dans un navigateur.

## Le jeu

- **100 jetons** au départ, **8 étages** à franchir. Chaque étage a 3 tables : **petite table → grande table → table du Boss**.
- À chaque table, il faut atteindre un **objectif de gains** en **6 mises** maximum (une main, un tirage ou un lancer = 1 mise), sur le jeu de son choix. Seules les mises gagnantes font avancer l'objectif : une perte ne coûte que des jetons.
- **2 relances** par table pour refaire un tirage raté sans miser à nouveau (plus celles des jokers).
- Table gagnée : récompense (30 / 45 / 70), +10 par mise non utilisée, intérêts (5 jetons par tranche de 50, 25 max), puis **le Comptoir**.
- La petite et la grande table peuvent être **passées** contre un **tag** (Soldes, Turbo, Investisseur, Collectionneur, Paquet cadeau, Double ou rien). Le boss, lui, ne se passe pas et impose une règle : Croupier Avare, Directeur Pressé, Dame en Noir, Videur, Gardien Endormi, Gourmand.
- Plus de mises sans l'objectif, ou plus de jetons : perdu. Boss de l'étage 8 vaincu : **victoire**, puis mode infini (objectifs ×1,6 par étage).
- **Le Comptoir** : 3 jokers + 2 consommables (tirage pondéré par rareté, jamais un joker déjà possédé), packs, améliorations, relance du shop à prix croissant, revente à 50 %, emplacements de joker supplémentaires et **le Prêteur** (prêt remboursé à chaque table gagnée, pénalité et huissier si une échéance est impayée).
- 5 jeux : **Ultimate Texas Hold'em** (avec probabilités en direct), **Blackjack** (assurance), **Roulette** (avec joueurs IA), **Machine à sous**, **Dice**. Un **mode libre** permet de jouer sans objectif.
- Chaque gain affiche son **détail** : mise → rendu brut → bonus en % → multiplicateurs → bonus fixes, joker par joker.
- Sons synthétisés (bouton 🔊), cosmétiques (tapis, dos de cartes) débloqués avec le prestige, interface jouable sur téléphone.

## Seed et rejouabilité

Tout le hasard de la partie (cartes, roulette, machine, dé, shop, patrons, événements) vient d'**un seul générateur seedé** (mulberry32, `js/core/rng.js`), dont l'état est stocké dans la partie.
Entrez une seed au menu (ou « Rejouer cette seed » en fin de partie) : **même seed + mêmes choix = même partie**.
Les animations purement décoratives utilisent une instance séparée du même générateur, pour ne jamais modifier le déroulement. Il n'y a aucun `Math.random()` dans le code.

## Équilibrage et simulation

Toutes les valeurs sont dans **`js/core/config.js`** : la progression (`CONFIG.progression` : étages, objectifs, mises et relances par table, récompenses, intérêts, croissance infinie), les boss, les tags, les prix, les raretés, les effets des jokers, les prêts et les tables de paiement.

Pour mesurer l'effet d'un changement :

- **Navigateur** : ouvrez la console et tapez `Sim.run(1000)`.
- **Node** : `node tools/simulate.js 1000 [seed] [stratégie]` (`sniper`, `blackjack`, ou un seul jeu : `bj`, `uth`, `dice`, `roulette`, `slots`).

La simulation joue des parties complètes et affiche le taux de victoire, l'étage moyen, les tables gagnées, la répartition des étages et les jokers les plus présents dans les parties gagnées. Stratégie par défaut, « sniper » : comme seules les victoires comptent pour l'objectif, une petite mise au Dice sur un multiplicateur calibré pour finir la table en un coup ; achat de jokers en gardant une réserve.

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
  engine.js         état unique sérialisable, événements, règlement, étages et tables, shop, prêts, sauvegarde
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
`onRoundStart` / `onRoundEnd` (début / victoire d'une table), `onShopEnter`, `onBetPlaced`, `onCardDrawn`, `onDraw`, `onResolve`, `onSettle`, `onWin`, `onLoss`, `onPush`, `onBankrupt`.
Les jeux ne connaissent aucun joker : ils émettent des événements et lisent des **requêtes** que les modificateurs peuvent modifier (`maxBet`, `deck.exclude`, `bj.rules`, `bj.dealerSkip`, `bj.info`, `uth.rules`, `dice.edge`, `slots.symbols`, `slots.wild`).

- Ordre déterministe : améliorations → statuts et tags → boss → jokers de **gauche à droite**. Les boss et les tags utilisent exactement le même système d'événements que les jokers.
- Le **Miroir** se résout vers le premier joker non-miroir à sa droite (avec garde-fou anti-boucle) et garde son propre état. Le **Parrain** compte les autres jokers.
- L'état interne des jokers (série de la Martingale, règle de la Roue Folle…) est conservé d'une table à l'autre ; le multiplicateur du Jackpot Éternel est conservé entre les parties.
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

Toute la partie (jetons, étage, table en cours, jokers et leur état, tags, seed et état du générateur, consommables, dettes, sabot du blackjack) tient dans un seul objet JSON, sauvegardé dans `localStorage` à chaque fin de table et après chaque mise.

# ♠ Boubouz'ino

Casino **roguelike gratuit, avec des jetons fictifs uniquement** (aucun argent réel), en HTML/CSS/JavaScript pur.
Aucune installation : ouvrez `index.html` dans un navigateur.

## Le jeu

- **100 jetons** au départ, un **joker de départ** à choisir parmi 3, puis **8 étages** de 3 tables : **petite table → grande table → table du Boss**.
- À chaque table, il faut faire monter sa **bankroll** (jetons − dettes) jusqu'à un **palier**, sur le jeu de son choix. Nombre de mises illimité : on ne perd qu'à la **faillite**.
- Les paliers montent de plus en plus vite : 120, 150, 200 | 280, 410, 630 | … jusqu'à 450 millions au boss final (chaque table demande ×1,2 au début, ×2,7 à la fin). Une table demande toujours au moins +10 % de la bankroll de départ : une grosse avance ne fait jamais gagner une table, ni un boss, sans jouer.
- **Mise minimale** : 3 % du palier. **Mise max** : 25 % du palier à l'étage 1, puis une part de plus en plus petite (×0,85 par étage) : il faut des **multiplicateurs** de jokers pour suivre.
- **3 relances** par table (1 par mise) pour refaire un tirage raté ; chaque relance coûte 25 % de la mise (au Dice, pas de relance sous 25 % de chance). Sans réponse, une perte est acceptée toute seule au bout de 4 secondes.
- Palier atteint : écran de victoire, récompense (6 / 8 / 12 % du palier), intérêts (5 % des jetons, 6 % du palier au plus), puis **le Comptoir**.
- La petite et la grande table peuvent être **passées** contre un **tag**. Chaque boss impose une règle (jamais deux fois le même) ; 5 d'entre eux **n'ouvrent qu'un seul jeu** (Le Puriste : Blackjack, Le Requin du Poker : Hold'em, La Reine des Machines, Le Croupier Tournant : Roulette, Le Lanceur de Dés) et obligent ton build à s'adapter ; à l'étage 8, **le Patron du Casino** (gains −20 %, mise max −25 %).
- **Le Comptoir** (un seul écran) : 3 grands jokers avec leur effet lisible et un bouton d'achat direct, une étagère (consommables, pack, amélioration), relance, place de joker, le Prêteur, et ta main en bas. **Tous les prix suivent le palier visé** : un joker coûte toujours une vraie part de ta bankroll, l'aperçu « après achat : bankroll / palier » aide à décider.
- **35 jokers** pensés pour des **builds** : spécialistes d'un jeu (Blackjack : Main Molle, Compteur, Croupier Corrompu, Doubleur ; Roulette : Rouge Fidèle, Zéro Ami, Pickpocket ; Hold'em : Boule de Cristal ; Dice : Dé Pipé ; Machine : Triple Cerise), jokers pour tous les jeux, **jokers qui grandissent** (Série, Martingale, Gros Bras, Roi Midas, Jackpot Éternel, badge ▲) et **multiplicateurs** (Parrain, Tricheur, Roi Midas, Collectionneur de 7, Tapis Vert). Nouvelles stratégies : **Le Touriste** (varier les jeux), **L'Habitué** (rester sur un jeu), **Le Marchand** (plus de choix au Comptoir), **Le Faussaire** (copie de consommables), **Le Carnet de Dettes** (jouer avec les prêts), **Le Croupier Ivre** (Blackjack), **La Fusion** (les % deviennent des ×), **La Roulette Russe** (×3, mais détruit le joker à sa droite). Le Miroir copie son voisin de droite.
- 5 jeux : **Ultimate Texas Hold'em** (probabilités en direct), **Blackjack** (assurance), **Roulette** (joueurs IA), **la Machine** et **Dice**. Un **mode libre** permet de jouer sans objectif (et d'y choisir sa machine).
- **4 machines à sous**, une tirée au hasard à chaque table (jamais deux fois la même d'affilée, la même pour tout le monde au défi du jour). Sur toutes : mises 10 fois plus petites qu'aux tables, **achat du bonus à 100 × la mise**, gain max 5 000 × la mise, retour ≈ 96 % (jeu de base et achat, réglé par simulation : `node tools/rtp-machines.js chaudron`).
  - **Les Chats des Toits** : 5×3, 20 lignes, Cartons wild ×2/×3 collants pendant les tours gratuits.
  - **Confiserie Céleste** : 6×5, **paie partout** (8 bonbons identiques ou plus), cascades qui s'enchaînent souvent (près d'un gain sur deux) ; 4 Montgolfières = 10 tours gratuits avec des **bulles multiplicatrices** (×2 à ×100, environ une tous les deux tours) qui s'additionnent sur chaque cascade gagnante.
  - **Chats Mousquetaires** : 5×5, 15 lignes ; le symbole **« En garde ! »** (sur les 5 rouleaux) déclenche un **duel** et le rouleau devient WILD avec un multiplicateur (×2 à ×100) ; sur une ligne, **les multiplicateurs se multiplient** : 3, 4 ou 5 duels sur un tour, très rare mais énorme ; 3 Sceaux = 10 tours « **Duel à l'aube** » où les duels éclatent environ 4 fois plus souvent (rien ne reste collé).
  - **Chaudron Magique** : 6×6, **grappes** de 5 symboles ou plus, cascades ; une case où un symbole explose est marquée, puis devient ×2 et **double à chaque explosion** (×128 max) ; pendant les tours gratuits (3 à 6 Grimoires = 10 à 20 tours), **les cases restent**.
  - Les jokers de machine suivent : Triple Cerise (wild sur les machines à lignes, gains de cerises ×2 ailleurs), Machine dorée (un Diamant adapté à chaque machine), Septième Ciel (un 7 vaut une part de la mise du tour, pas du prix d'un bonus acheté).
- Sons synthétisés, cosmétiques débloqués avec le prestige, collection, seed, interface jouable sur téléphone.

## Panel « rejouabilité » (5 joueurs qui débattent entre eux)

5 profils (fan de roguelikes, joueuse mobile occasionnelle, joueur daltonien qui joue au clavier, streameur casino, game designer spécialisé rétention) ont joué puis débattu de ce qui donne envie de relancer une partie. Ce qui en est sorti :

- **Méta-progression** : 20 jokers au départ, 15 à débloquer par des défis visibles au menu (« Gagne 6 mises d'affilée », « Finis une table au Dice »…), 9 niveaux de difficulté (« mises ») débloqués par les victoires, écran Records (meilleur ×, plus gros gain, plus longue série, meilleure bankroll…).
- **Sessions courtes** : défi du jour (seed commune, 3 étages, carnet de tampons de la semaine sans punition si on rate un jour), mode Express en 3 étages, une main en cours est terminée prudemment au rechargement au lieu d'être perdue.
- **Premières parties qui pardonnent** : filet de sécurité une fois par partie aux étages 1-2 (+50 % du palier), aucun boss « un seul jeu » à l'étage 1, joker de départ « Meilleur au … » qui ouvre son jeu.
- **Machine** : retour ≈ 95 %, Carton garanti pendant le bonus, chat noir qui sème des wilds en jeu de base, palier « Joli gain » dès ×5, tours auto (arrêt sur bonus, à −50 % du solde, ou touche Échap/A) et turbo, fin du bonus qui montre honnêtement le × du prix payé.
- **Musique d'ambiance** synthétisée (petite grille jazzy à 90 BPM, plus rapide avec un arpège pendant le bonus), coupable dans les options, mise en pause quand l'onglet est caché.
- **Accessibilité** : clavier sans piège (focus gardé dans les fenêtres), contrastes AA sur les boutons, réglage « Effets : complets / réduits / aucun », acceptation automatique désactivable, gains annoncés aux lecteurs d'écran, jetons marqués pour les daltoniens, roulette jouable au pouce (mises rapides Rouge/Noir/Pair/… au-dessus du pli), machine entière visible sur téléphone.

## Refonte « jeu de cartes » (après 5 testeurs exigeants)

5 joueurs aux profils pointus ont testé le jeu (vétéran de Balatro, joueuse Hearthstone classée, speedrunner, streamer casino, game designer mobile). Changements principaux :

- **Équilibrage** : fin du « farm » à 1 jeton (mise minimale, bonus fixes devenus des parts de la mise, le Septième Ciel ne compte plus les décimales du Dice), fin des boss gagnés sans jouer, relances payantes, prix et récompenses proportionnels au palier. Simulation : 0 % de victoires sans joker, environ 13-16 % pour un bot qui construit un build, défaites réparties sur tous les étages.
- **Look** : police ronde et épaisse (Lilita One, Nunito), fond qui tourbillonne lentement, panneaux en ardoise à gros contours, boutons pleins colorés, jokers comme des cartes à collectionner (ils flottent, s'inclinent vers la souris, reflet au survol, holographiques pour les légendaires, rebond et nombre qui saute quand ils se déclenchent).
- **Panneau de score** : à chaque gain, GAIN (bleu) × MULTI (rouge) monte joker après joker avec une note qui grimpe, puis le total explose.
- **Gros gains par paliers** (tous les jeux) : plein écran « Gros gain » (×10), « Énorme gain » (×25), « Gain épique » (×50), « Légendaire ! » (×100), compteur qui accélère, pluie de jetons ; un clic passe.
- **La machine** : rouleaux de nuit, une seule Pelote par rouleau, Pelotes qui paient (×2 / ×10 / ×50), suspense dès 2 Pelotes (rouleaux plus lents, halo, son qui monte), arrêt avec rebond et note montante, bouton Stop, wilds collés vraiment figés pendant le bonus, lignes tracées jusqu'au dernier symbole payant puis montrées une par une, écran d'entrée et de fin du bonus, +5 tours avec 3 Pelotes pendant le bonus, lune rouge pendant le bonus, afficheurs MISE / GAIN.
- **Lisibilité** : le solde ne révèle jamais le résultat avant la fin de l'animation, jetons entiers (plus de centimes), la table tient à l'écran (cartes à la taille de l'écran, messages en surimpression), pastille sur l'onglet du jeu où une main est en cours, écran de victoire de table avec la vraie bankroll qui déborde de la jauge, écran de faillite mis en scène.

## Refonte « jeu » (après les premiers essais)

- **Moins d'infos à l'écran** : plus de panneaux latéraux ni de bandeau de conseils ; les jeux sont dans une colonne de jetons à gauche (une rangée sur téléphone), la table prend toute la place.
- **Habillage** : salle de casino (moquette, lumières floues, vignette), tables inclinées en perspective avec rebord en cuir et rail en bois, jetons en relief (cylindres), boutons « physiques » qui s'enfoncent, jauge de bankroll animée, afficheur à LED pour le Dice, roulette inclinée dans son cylindre, rouleaux ombrés de la machine, menu avec cartes en éventail 3D et jeton qui tourne, fenêtres qui basculent en 3D.
- **Table gagnée** : écran « Palier atteint ! » (ou « Boss vaincu ! ») avec rayons, jeton qui tourne, jauge qui se remplit, récompenses une à une et confettis, avant d'entrer au Comptoir.
- **Prix** : tous les prix (jokers, relance, emplacements) portent le même jeton rouge que ton solde.
- **Particules** (`js/ui/fx.js`, canvas) : gerbe de pièces et jetons à chaque gain, pluie de jetons sur les gros coups, confettis à chaque table gagnée et à la victoire. Purement décoratif (hasard de `RNG.fx`), désactivé si le système demande moins d'animations.

## Après les tests joueurs (5 profils)

Le jeu a été testé par 5 joueurs aux profils différents (ado sur mobile, joueur hardcore de roguelikes, habituée des casinos sur tablette, streamer speedrunner, designer UX daltonienne). Principales évolutions :

- **Équilibrage** : 3 relances par table (1 par mise), Dice limité à 10 % de chance, prix du shop +15 % par étage ; Parrain, Tricheur, Pickpocket et Jackpot Éternel rabotés. (Le système d'objectif de gains en 6 mises de cette époque a depuis été remplacé par les paliers de bankroll.)
- **Corrections** : sauvegarde après chaque tirage (impossible de rejouer un coup en rechargeant la page), carte cachée du croupier qui restait retournée, gains arrondis vers le haut dans la barre, vitesse 4× appliquée aux cartes, pack rouvert à la reprise, mise réajustée quand les jetons baissent.
- **Interface** : rangée de jokers repliable (touche J), tutoriel en 3 étapes, temps de jeu dans le bilan, la Machine en premier jeu, roulette verticale sur téléphone (appui long pour retirer une mise), mise tapée directement ou bouton Max, mise de roulette conservée, Hold'em enchaîné.
- **Accessibilité** : options texte agrandi et couleurs bleu/orange pour les daltoniens, symboles et hachures en plus des couleurs, cibles tactiles de 44 px, contrastes relevés, focus visible, fenêtres accessibles (Échap), annonces des résultats aux lecteurs d'écran, animations réduites si le système le demande.
- **Raccourcis clavier** : Espace/Entrée = action principale, 1 à 5 = jeux, T/S/D/P = tirer, rester, doubler, séparer, C = check, R = relance, A = accepter, J = jokers, Échap = fermer.

## Seed et rejouabilité

Tout le hasard de la partie (cartes, roulette, machine, dé, shop, patrons, événements) vient d'**un seul générateur seedé** (mulberry32, `js/core/rng.js`), dont l'état est stocké dans la partie.
Entrez une seed au menu (ou « Rejouer cette seed » en fin de partie) : **même seed + mêmes choix = même partie**.
Les animations purement décoratives utilisent une instance séparée du même générateur, pour ne jamais modifier le déroulement. Il n'y a aucun `Math.random()` dans le code.

## Équilibrage et simulation

Toutes les valeurs sont dans **`js/core/config.js`** : la progression (`CONFIG.progression` : étages, paliers de bankroll, part du palier en mise max, relances, récompenses, intérêts, croissance infinie), les boss, les tags, les prix, les raretés, les effets des jokers, les prêts et les tables de paiement.

Pour mesurer l'effet d'un changement :

- **Navigateur** : ouvrez la console et tapez `Sim.run(1000)`.
- **Node** : `node tools/simulate.js 1000 [seed] [stratégie]` (`sniper`, `blackjack`, ou un seul jeu : `bj`, `uth`, `dice`, `roulette`, `slots`).

La simulation joue des parties complètes et affiche le taux de victoire, l'étage moyen, les tables gagnées, la répartition des étages et les jokers les plus présents dans les parties gagnées. Stratégie par défaut, « build » : le bot choisit son joker de départ, joue le jeu que ses jokers favorisent (sinon le Dice en « sniper », chance calibrée pour combler l'écart en un coup), achète les jokers qui vont dans son build en gardant une réserve (option `reserve`), et prend les relances. Options : `noJokers` (aucun joker), `game` (un seul jeu). Résultat actuel : 0 % de victoires sans joker, environ 13 % pour le bot avec un build (un joueur qui choisit ses jokers fait mieux).

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
  fx.js             particules (pièces, jetons, confettis) sur un canvas
  juice.js          cartes de joker qui s'inclinent et flottent
  views/*.js        une vue par jeu (affichage et animations seulement)
  runui.js          menu, barre du haut, choix de table, shop, fenêtres
  jokerArt.js       illustrations des jokers · slotArt.js : symboles cartoon de la machine
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

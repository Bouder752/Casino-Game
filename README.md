# ♠ Boubouz'ino

Casino **roguelike gratuit, avec des jetons fictifs uniquement** (aucun argent réel), en HTML/CSS/JavaScript pur.
Aucune installation : ouvrez `index.html` dans un navigateur.

## Mode roguelike

- Vous démarrez avec **100 jetons**. Chaque **manche** donne **10 tours** (une main, un tirage ou un lancer = 1 tour) pour atteindre un **objectif de gain**, avec une **mise max** qui augmente au fil des manches.
- Objectif atteint : encaissez tout de suite (+2 jetons par tour restant) ou continuez à jouer. Tours épuisés sans l'objectif, ou faillite : partie perdue.
- Toutes les 3 manches (et à la 8e), un **Patron** impose un malus (BJ payé 6:5, mise max réduite, jokers communs gelés…).
- Survivez à **8 manches** pour gagner, puis continuez en mode infini.
- Entre les manches, **le Comptoir** (shop) propose :
  - **20 jokers** (communs, rares, légendaires) qui modifient les règles : Porte-Bonheur, Septième Ciel, Martingale, Miroir, Parrain, Tricheur Maladroit, Roue Folle, Fantôme du Casino, Jackpot Éternel…
  - **Consommables** : Carte Bonus, Jeton Doré, Boisson du Bar, Pot-de-vin, Ticket à gratter.
  - **Améliorations de table** : Table VIP, Sabot truqué, Machine dorée.
  - **Packs** : Petit pack, Pack mystère.
  - **Services** : relance du shop (5, puis +5), vente de jokers (moitié du prix), emplacements de joker supplémentaires (100/200/400).
- L'ordre des jokers compte : le **Miroir** copie le joker à sa droite.
- Gains : `gain × (1 + bonus additifs) × multiplicateurs` (Porte-Bonheur +5 %, Parrain +1 par joker, Martingale +25 % par perte, Tricheur ×2, Jackpot Éternel ×1,0 → +0,1 par victoire, conservé entre les parties).

## Les jeux

- **Ultimate Texas Hold'em** — Ante + Blind, Trips optionnel, Play 4x/3x/2x/1x, avec encart de **probabilités en direct**.
- **Blackjack** — sabot de 6 jeux, 3:2, croupier reste sur 17 souple, double, split, **assurance**.
- **Roulette** européenne — tapis de mises complet et **trois joueurs IA** autour de la table.
- **Machine à sous** — 3 rouleaux, ligne centrale, levier.
- **Dice** — tirage 0.00 à 99.99, au-dessus ou en dessous d'un seuil.

Le **mode libre** permet de jouer à tout sans objectif (solde de 1 000 jetons séparé).

## Sons et cosmétiques

- Sons synthétisés en direct (Web Audio) : distribution, retournement, jetons, roulette, rouleaux, gains, shop… Bouton 🔊 pour couper.
- **Prestige ✦** gagné en roguelike (✦1 par manche, ✦5 en plus pour la victoire) pour débloquer des **tapis** et des **dos de cartes**.

Tout est sauvegardé dans le navigateur (partie en cours, prestige, cosmétiques, Jackpot Éternel).

## Structure

```
index.html
css/style.css
js/util.js       utilitaires, contrôle de mise, piles de jetons
js/sound.js      sons synthétisés
js/meta.js       progression permanente et cosmétiques
js/wallet.js     solde (libre ou partie)
js/jokers.js     catalogue : jokers, consommables, améliorations, patrons
js/run.js        moteur roguelike + façade « Casino » utilisée par les jeux
js/cards.js      sabot, cartes françaises en SVG
js/handEval.js   évaluation des mains de poker
js/odds.js       probabilités en direct (Hold'em)
js/uth.js        Ultimate Texas Hold'em
js/blackjack.js  Blackjack
js/roulette.js   Roulette
js/slots.js      Machine à sous
js/dice.js       Dice
js/runui.js      interface : menu, barre de jokers, shop, fenêtres
js/main.js       démarrage
```

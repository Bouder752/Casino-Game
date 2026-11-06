# ♠ Casino Jetons

Jeu de casino **gratuit, avec des jetons fictifs uniquement** (aucun argent réel), en HTML/CSS/JavaScript pur.

## Jeux

- **Ultimate Texas Hold'em** — Ante + Blind, Trips optionnel, Play 4x/3x pré-flop, 2x au flop, 1x à la river. Qualification du croupier à la paire, tables de paiement Blind et Trips standard.
- **Blackjack** — sabot de 6 jeux, blackjack payé 3:2, croupier reste sur 17 souple, doubler, séparer (jusqu'à 4 mains).
- **Dice** — tirage de 0.00 à 99.99, pariez en dessous / au-dessus d'un seuil ; multiplicateur = 99 ÷ chance.

Le solde (1 000 jetons au départ) est sauvegardé dans le navigateur ; le bouton ↺ le remet à zéro.
Le hasard utilise `crypto.getRandomValues`.

## Lancer

Aucune installation : ouvrez simplement `index.html` dans un navigateur.

## Structure

```
index.html
css/style.css
js/util.js       utilitaires, contrôle de mise
js/wallet.js     solde de jetons (localStorage)
js/cards.js      sabot, mélange, rendu des cartes
js/handEval.js   évaluation des mains de poker
js/uth.js        Ultimate Texas Hold'em
js/blackjack.js  Blackjack
js/dice.js       Dice
js/main.js       navigation entre les jeux
```

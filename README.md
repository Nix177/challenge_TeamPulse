# Team Pulse

> **Tagline**: “Prendre le pouls. Ouvrir la conversation.”

Team Pulse est une application web statique accessible et éphémère, conçue pour les ateliers d'équipe synchrones se déroulant en présentiel autour d'un ordinateur ou d’une tablette partagée.

---

## 💬 Parcours & Philosophie

L'expérience accompagne le groupe à travers 3 étapes simples :
`1 sur 3 · Choisir → 2 sur 3 · Vérifier → 3 sur 3 · Terminé`

- **Langage naturel** : Interface rédigée en français simple et direct, sans jargon ni majuscules agressives.
- **Récépissé de validation** : Confirmation explicite avec comptage dynamique (`{total} réponses recueillies dans cette session`), animation neutre de point collectif et consigne de passage à la personne suivante.
- **Visualisation dynamique des données** : Courbe SVG Bézier générée en temps réel à partir des pourcentages réels des participants (`src/visualisation.js`).
- **Cartes conversationnelles** : Mise en valeur de la question d'ouverture pour la discussion collective.

---

## 🔄 Parcours Utilisateur

### 1. Mode Participant
- **Question initiale** : *« Comment te sens-tu en arrivant aujourd’hui ? »*
- **5 options canoniques (ordre exact)** :
  1. `very-difficult` — **Très difficile** (*J’aurais besoin de soutien.*)
  2. `difficult` — **Difficile** (*Quelque chose me freine.*)
  3. `mixed` — **Mitigé** (*Il y a du bon et du moins bon.*)
  4. `good` — **Bien** (*Je me sens plutôt bien.*)
  5. `very-good` — **Très bien** (*J’arrive avec beaucoup d’énergie.*)
- **Flux en 3 étapes** : Sélection d'une réponse → Vérification ("Valider ma réponse" ou "Changer de réponse") → Récépissé de confirmation ("C’est noté. Ta réponse a bien été comptée.") → "Commencer une nouvelle réponse" (remet à zéro le formulaire pour le participant suivant).

### 2. Mode Facilitateur
- Action dans l'en-tête : **« Voir les résultats »**
- **Pré-révélation** : Affiche le nombre de réponses recueillies et propose *« Afficher la répartition »*.
- **Répartition révélée** : Courbe SVG dynamique connectant les 5 nuances, statistiques agrégées, constat déterministe et question à discuter ensemble.

---

## 🔗 URLs Locales & Modes

- **Mode Normal** : `http://localhost:4173/`
- **Mode Démo** (`?demo=1`) : `http://localhost:4173/?demo=1` (affiche le badge "DÉMO" et permet de charger 16 réponses de démonstration).
- **Mode Présentation** (`?present=1`) : `http://localhost:4173/?present=1` (affiche le panneau "Voir les choix de conception").
- **Mode Combiné** : `http://localhost:4173/?demo=1&present=1`

---

## 🔒 Confidentialité & Sécurité

- **In-Memory State** : Données conservées uniquement en mémoire JavaScript.
- **Zéro Stockage & Zéro Réseau** : Aucun `localStorage`, `sessionStorage`, `cookies`, `IndexedDB`, `fetch`, `XMLHttpRequest`, ni `console.log`.
- **Réinitialisation automatique** : La fermeture ou le rechargement de la page efface instantanément toutes les réponses.

---

## 🛠️ Exécution & Tests

### Démarrer le serveur local
```bash
python -m http.server 4173
```

### Lancer la suite de tests unitaires
```bash
node --test
```

### Vérifier la syntaxe
```bash
node --check src/app.js
```

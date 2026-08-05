# Team Pulse (Living Pulse)

> **Tagline**: “Prendre le pouls. Ouvrir la conversation.”

Team Pulse est une application web statique au design **Living Pulse**, conçue pour les ateliers d'équipe synchrones se déroulant en présentiel autour d'un ordinateur ou d'une tablette partagée.

---

## 🎨 Concept & Philosophie Living Pulse

L'application accompagne une progression bienveillante :
`expression individuelle → perception collective → conversation humaine`

Elle propose un design chaleureux et éditorial :
- **Palette naturelle** : Fond canvas chaud (`#f3efe7`), cartes surface (`#fffdf9`), encres sombres (`#17231e`), accents de tons organiques (`#b65345` à `#1d766c`).
- **Visualisation dynamique des données** : Courbe SVG Bézier générée en temps réel à partir des pourcentages des participants (`src/visualisation.js`).
- **Cartes conversationnelles** : Mise en valeur de la question d'ouverture pour la discussion collective.

---

## 🔄 Parcours Utilisateur

### 1. Mode Participant
- **Question initiale** : *« Comment arrives-tu dans cette session ? »*
- **5 options canoniques (ordre exact)** :
  1. `very-difficult` — **Très difficile** (*J’aurais besoin de soutien*)
  2. `difficult` — **Difficile** (*Quelque chose me freine*)
  3. `mixed` — **Mitigé** (*Des éléments positifs et difficiles*)
  4. `good` — **Bien** (*Je peux avancer sereinement*)
  5. `very-good` — **Très bien** (*J’arrive avec beaucoup d’énergie*)
- **Flux en 3 étapes** : Sélection d'une tuile → Confirmation ("Ajouter ma réponse" ou "Modifier") → Écran de transition de remerciement → "Passer à la personne suivante" (remet à zéro le formulaire pour le participant suivant).

### 2. Mode Facilitateur
- Action dans l'en-tête : **« Espace facilitateur »**
- **Pré-révélation** : Affiche le nombre de réponses prêtes et propose *« Révéler le pouls du groupe »*.
- **Pouls révélé** : Courbe SVG dynamique connectant les 5 nuances, statistiques agrégées, constat déterministe et carte de conversation.

---

## 🔗 URLs Locales & Modes

- **Mode Normal** : `http://localhost:4173/`
- **Mode Démo** (`?demo=1`) : `http://localhost:4173/?demo=1` (affiche le badge "DÉMO" et permet de charger 16 réponses de démonstration).
- **Mode Présentation** (`?present=1`) : `http://localhost:4173/?present=1` (affiche le panneau "Derrière Team Pulse").
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

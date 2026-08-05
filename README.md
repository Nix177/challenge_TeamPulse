# Team Pulse

> **Tagline**: “Prendre le pouls. Ouvrir la conversation.”

Team Pulse est un prototype d'application web statique conçu pour les ateliers d'équipe synchrones se déroulant en présentiel autour d'un ordinateur ou d'une tablette partagée.

---

## 🎯 Raison d'être & Scénario d'usage

Lors d'un atelier d'équipe, les participants indiquent à tour de rôle comment ils arrivent dans la session. Les résultats ne sont révélés qu'à la fin et de manière globale, afin de servir de point de départ neutre et bienveillant pour une discussion humaine.

### Ce que Team Pulse N'EST PAS :
- ❌ Un outil d'évaluation RH ou de performance
- ❌ Un diagnostic de santé mentale
- ❌ Un système de surveillance ou de mesure d'engagement
- ❌ Un service de sondage persistant avec sauvegarde

---

## 🔄 Parcours Utilisateur

### 1. Mode Participant
- **Question initiale** : *« Comment arrives-tu dans cette session aujourd’hui ? »*
- **5 options canoniques (ordre exact)** :
  1. `very-difficult` — **Très difficile** (*J’aurais besoin de soutien*)
  2. `difficult` — **Difficile** (*Quelque chose me freine*)
  3. `mixed` — **Mitigé** (*Des éléments positifs et difficiles*)
  4. `good` — **Bien** (*Je peux avancer sereinement*)
  5. `very-good` — **Très bien** (*J’arrive avec beaucoup d’énergie*)
- **Flux en 3 étapes** : Sélection d'une option → Confirmation explicite ("Modifier mon choix" ou "Confirmer mon choix") → Écran de remerciement ("Merci. Ta réponse rejoint le collectif sans être associée à ton nom.") → "Participant suivant" (réinitialise le formulaire sans effacer les voix cumulées).

### 2. Mode Facilitateur
- Action secondaire en bas de page : **« Voir les résultats »**
- **Pré-révélation** : Affiche le nombre total de réponses et demande *« Prêt à découvrir le pouls du groupe ? »*
- **Révélation du pouls** : Transition visuelle (~600ms), affichage des totaux, pourcentages arrondis, répartition par barres, rythme visuel et constat déterministe.
- **Réinitialisation** : Confirmation en 2 étapes avec message d'avertissement inline (sans `window.confirm`).

---

## 🤖 Règles de Constat Déterministe (Sans IA)

Les constats et questions d'ouverture sont générés via un moteur de règles déterministe et prédictible (`src/insight.js`), selon l'ordre de priorité suivant :

1. **Règle 1 — Soutien** (`negativeShare >= 0.5`) :
   - *Constat* : « Une part importante du groupe rencontre des difficultés. »
   - *Question* : « Qu’est-ce qui pèse le plus aujourd’hui, et quel petit soutien serait immédiatement utile ? »
2. **Règle 2 — Contraste** (`negativeShare >= 0.25 && positiveShare >= 0.25`) :
   - *Constat* : « Les ressentis sont particulièrement contrastés. »
   - *Question* : « Qu’est-ce qui pourrait expliquer que les personnes vivent cette situation différemment ? »
3. **Règle 3 — Préservation** (`positiveShare >= 0.55`) :
   - *Constat* : « Le ressenti général est plutôt positif. »
   - *Question* : « Qu’est-ce qui fonctionne bien actuellement et que le groupe devrait préserver ? »
4. **Règle 4 — Amélioration ciblée** (Fallback) :
   - *Constat* : « Aucun ressenti ne domine clairement. »
   - *Question* : « Quel petit changement concret pourrait améliorer la prochaine session ? »

---

## 🔗 Modes d'URL & URLs Locales

- **Mode Normal** : `http://localhost:4173/`
- **Mode Démo** (`?demo=1`) : `http://localhost:4173/?demo=1` (affiche le badge "Mode démo" et permet de charger 16 réponses types).
- **Mode Présentation** (`?present=1`) : `http://localhost:4173/?present=1` (affiche le panneau escamotable "Derrière le prototype").
- **Mode Combiné** : `http://localhost:4173/?demo=1&present=1`

---

## 🔒 Confidentialité & Cycle de Vie des Données

- **Strict In-Memory State** : Toutes les données résident exclusivement dans la mémoire volatile JavaScript (`src/app.js`).
- **Zéro Stockage & Zéro Réseau** : Aucun `localStorage`, `sessionStorage`, `cookies`, `IndexedDB`, `serviceWorker`, `fetch`, `XMLHttpRequest`, ni `console.log` de votes.
- **Réinitialisation automatique** : Dès que la page est rechargée ou fermée, toutes les réponses sont immédiatement effacées.

---

## ♿ Accessibilité (A11y) & Responsive

- Compatible avec la navigation 100% au clavier (`Tab`, `Shift+Tab`, `Space`, `Enter`).
- Focus visible renforcé et gestion explicite du focus après transition de vue (`focusCardHeading()`).
- Zone `aria-live="polite"` pour l'annonce des changements de vue aux lecteurs d'écran.
- Target size minimale des boutons > 44×44 CSS pixels (labels à 56px, boutons à 48px).
- Layout 100% responsive testé dès 320 CSS pixels de largeur et compatible avec un zoom navigateur à 200%.
- Prise en compte de `prefers-reduced-motion: reduce`.

---

## 🛠️ Lancer le Projet & les Tests Locaux

### 1. Démarrer le serveur web local
```bash
python -m http.server 4173
```
Puis ouvrez `http://localhost:4173/` dans votre navigateur.

### 2. Exécuter les tests unitaires et de confidentialité
```bash
node --test
```

### 3. Exécuter le contrôle de syntaxe JavaScript
```bash
node --check src/app.js
```

---

## 💡 Contrôle de l'IA & Décisions Techniques

L'utilisation de règles déterministes plutôt qu'un modèle de langage (LLM) au moment de l'exécution garantit :
1. **Sécurité et zéro hallucination** : Aucun risque de générer des conseils inappropriés ou pseudomédictaux.
2. **Confidentialité totale** : Aucune donnée ne quitte le navigateur vers une API externe.
3. **Instantanéité et fonctionnement hors-ligne** : Aucune dépendance réseau, temps de réponse nul.

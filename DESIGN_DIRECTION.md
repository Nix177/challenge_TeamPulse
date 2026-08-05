# Living Pulse — Refined Design Direction Document

## 1. Product Refinements
The **Living Pulse** redesign has been refined for maximum clarity, natural French copywriting, and concrete participant handoff:
- **Plain-Language Standard**: Replaced all abstract/jargon UI labels (`EXPRESSION INDIVIDUELLE`, `RÉPONSE AJOUTÉE`, `RÉSULTATS COLLECTIFS`, `Session éphémère`, `Espace facilitateur`) with conversational, natural French (`1 sur 3 · Choisir`, `Comment te sens-tu en arrivant aujourd’hui ?`, `Réponses non conservées`, `Voir les résultats`).
- **Concrete Submission Receipt**: Replaced decorative thank-you screen with a clear receipt displaying total collected count, neutral point-joining animation, explicit handoff instruction, and single primary action.
- **3-Breakpoint Option Continuum**:
  - **Desktop (>= 1000px)**: 5 connected tiles on 1 horizontal scale.
  - **Tablet (640–999px)**: 5-point compact scale with single active description region below.
  - **Mobile (< 640px)**: Vertical list showing label and supporting text together.
- **Data-Driven Visualization**: Smooth cubic Bézier SVG curve generated dynamically from actual percentages (`src/visualisation.js`).

## 2. Palette & Tokens
```css
--canvas: #f3efe7;
--canvas-deep: #e9e2d7;
--surface: #fffdf9;
--surface-raised: #ffffff;
--ink: #17231e;
--ink-soft: #59655f;
--ink-faint: #54615b; /* > 4.5:1 WCAG AA contrast */
--line: #d9d4ca;

--accent: #126a5a;
--accent-strong: #0c5145;
--accent-soft: #dcece6;

--tone-1: #b65345; /* Très difficile */
--tone-2: #d0784d; /* Difficile */
--tone-3: #bd9b3f; /* Mitigé */
--tone-4: #4f9270; /* Bien */
--tone-5: #1d766c; /* Très bien */

--danger: #a63f3f;
```

## 3. Exact Interface Copy (Centralized in `src/copy.js`)
- **Brand**: Title `Team Pulse`, Tagline `Prendre le pouls. Ouvrir la conversation.`, Header status `Réponses non conservées`, Facilitator action `Voir les résultats`.
- **Voting**: `1 sur 3 · Choisir`, `Comment te sens-tu en arrivant aujourd’hui ?`, `Continuer`, `Aucun nom n’est demandé.`
- **Confirmation**: `2 sur 3 · Vérifier`, `Tu confirmes cette réponse ?`, `Valider ma réponse`, `Changer de réponse`.
- **Receipt**: `3 sur 3 · Terminé`, `C’est noté.`, `Ta réponse a bien été comptée.`, `1 réponse recueillie dans cette session` / `{total} réponses recueillies dans cette session`, `Tu peux maintenant passer l’appareil à la personne suivante.`, `Commencer une nouvelle réponse`.
- **Pre-Reveal**: `1 réponse a été recueillie.` / `{total} réponses ont été recueillies.`, `Afficher la répartition`.
- **Revealed**: `Répartition du groupe`, `Les réponses`, `Ce qu’on peut observer`, `Question à discuter ensemble`.
- **Persistent Privacy**: `Aucun nom n’est demandé. Les réponses ne quittent pas cette page et disparaissent lorsqu’elle est rechargée.`

# Project Brief — Team Pulse

Tagline: “Prendre le pouls. Ouvrir la conversation.”

## Product Overview
Team Pulse is a warm, accessible static web prototype for synchronous team workshops on one shared device. Participants successively express how they arrive in the session. Results are revealed afterward only in aggregate to start a human conversation.

The application follows a 3-step participant flow:
`1 sur 3 · Choisir → 2 sur 3 · Vérifier → 3 sur 3 · Terminé`

It is NOT:
- An HR assessment or performance evaluation tool
- A mental health diagnostic tool
- A surveillance system or engagement score
- A persistent survey service

## Visual System & Composition
- **Warm Editorial Canvas**: Canvas `#f3efe7`, Surface `#fffdf9`, Ink `#17231e`, Accent `#126a5a`.
- **Responsive 5-Choice Scale**:
  - **Desktop (>= 1000px)**: 5 choices on one connected horizontal continuum with subtle rhythm line.
  - **Tablet (640–999px)**: Compact 5-point scale with active description box below.
  - **Mobile (< 640px)**: Vertical list showing label and supporting text together.
- **Submission Receipt**: Concrete receipt screen displaying total collected count, neutral point-joining animation, handoff instruction, and single primary action.
- **Data-Driven Visualization**: Smooth cubic Bézier SVG curve generated dynamically from actual participant percentages (`src/visualisation.js`).
- **Pure Ephemeral Memory**: Zero web storage, zero network APIs, zero tracking.

## Canonical Options (Exact Order)
1. `very-difficult` — Label: “Très difficile” — Text: “J’aurais besoin de soutien.”
2. `difficult` — Label: “Difficile” — Text: “Quelque chose me freine.”
3. `mixed` — Label: “Mitigé” — Text: “Il y a du bon et du moins bon.”
4. `good` — Label: “Bien” — Text: “Je me sens plutôt bien.”
5. `very-good` — Label: “Très bien” — Text: “J’arrive avec beaucoup d’énergie.”

## Deterministic Observation Rules
- `negativeShare` = (`very-difficult` + `difficult`) / total
- `positiveShare` = (`good` + `very-good`) / total

Rules (in exact priority order):
1. **Rule 1 — support**: `negativeShare >= 0.5`
   - Observation: “Une part importante du groupe rencontre des difficultés.”
   - Prompt: “Qu’est-ce qui pèse le plus aujourd’hui, et quel petit soutien serait immédiatement utile ?”
2. **Rule 2 — contrast**: `negativeShare >= 0.25 && positiveShare >= 0.25`
   - Observation: “Les ressentis sont particulièrement contrastés.”
   - Prompt: “Qu’est-ce qui pourrait expliquer que les personnes vivent cette situation différemment ?”
3. **Rule 3 — preserve**: `positiveShare >= 0.55`
   - Observation: “Le ressenti général est plutôt positif.”
   - Prompt: “Qu’est-ce qui fonctionne bien actuellement et que le groupe devrait préserver ?”
4. **Rule 4 — small improvement**: Fallback
   - Observation: “Aucun ressenti ne domine clairement.”
   - Prompt: “Quel petit changement concret pourrait améliorer la prochaine session ?”

## URL Modes
- `?demo=1`: Shows "DÉMO" badge and demo data button ("Charger l’exemple"). Demo counts: Very difficult: 1, Difficult: 2, Mixed: 4, Good: 6, Very good: 3 (Total = 16).
- `?present=1`: Shows expandable panel "Voir les choix de conception".
- `?demo=1&present=1`: Combines both.
- Normal mode: neither badge nor presentation panel exists.

## Persistent Privacy Text
“Aucun nom n’est demandé. Les réponses ne quittent pas cette page et disparaissent lorsqu’elle est rechargée.”

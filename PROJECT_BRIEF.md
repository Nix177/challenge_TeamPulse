# Project Brief — Team Pulse (Living Pulse Redesign)

Tagline: “Prendre le pouls. Ouvrir la conversation.”

## Product Overview
Team Pulse is a warm, contemporary static web application designed for synchronous workshops on one shared laptop or tablet. Participants successively express how they arrive in the session. Results are revealed afterward in aggregate to start a human conversation.

The **Living Pulse** redesign elevates the product experience:
`individual expression → collective perception → human conversation`

It is NOT:
- An HR assessment tool
- An employee performance tool
- A mental health diagnostic tool
- A surveillance system
- An engagement score
- A persistent survey service

## Visual Concept & Architecture
- **Warm Editorial Palette**: Canvas `#f3efe7`, Canvas deep `#e9e2d7`, Surface `#fffdf9`, Ink `#17231e`, Accent `#126a5a`.
- **Tone Accents**: Tone 1 (`#b65345`), Tone 2 (`#d0784d`), Tone 3 (`#bd9b3f`), Tone 4 (`#4f9270`), Tone 5 (`#1d766c`).
- **Data-Driven Visualization**: Generates a smooth cubic Bézier SVG curve mapped dynamically from actual participant percentages (`src/visualisation.js`).
- **Pure Ephemeral Memory**: Zero web storage, zero network APIs, zero tracking.

## Canonical Options (Exact Order)
1. `very-difficult` — Label: “Très difficile” — Text: “J’aurais besoin de soutien”
2. `difficult` — Label: “Difficile” — Text: “Quelque chose me freine”
3. `mixed` — Label: “Mitigé” — Text: “Des éléments positifs et difficiles”
4. `good` — Label: “Bien” — Text: “Je peux avancer sereinement”
5. `very-good` — Label: “Très bien” — Text: “J’arrive avec beaucoup d’énergie”

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

Zero responses: show no observation and explain that the group must first contribute.

## URL Modes
- `?demo=1`: Shows "DÉMO" badge and demo data button ("Charger l'exemple"). Demo counts: Very difficult: 1, Difficult: 2, Mixed: 4, Good: 6, Very good: 3 (Total = 16).
- `?present=1`: Shows expandable panel "Derrière Team Pulse".
- `?demo=1&present=1`: Combines both.
- Normal mode: neither badge nor presentation panel exists.

## Privacy Wording
“Aucune réponse n’est enregistrée ni envoyée. Les résultats disparaissent lorsque la page me rechargée.”

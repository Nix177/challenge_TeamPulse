# Architectural & Design Decisions — Team Pulse

## Decision 1: Submission Receipt & Participant Handoff
- **Rationale**: Replaces decorative thank-you screen with a concrete receipt state displaying total collected count (`{total} réponses recueillies dans cette session`), neutral point-joining animation (350–550ms), handoff instruction, and single primary action.
- **Privacy Assurance**: The individual choice is never displayed after validation, never uses chosen option colors on receipt, and never leaks choice to the next participant.

## Decision 2: 3-Breakpoint Option Continuum
- **Rationale**: Replaces 5 narrow full-text cards on tablet screens with 3 responsive strategies:
  - **Desktop (>= 1000px)**: 5 connected tiles on 1 horizontal scale.
  - **Tablet (640–999px)**: 5-point compact scale with single active description region below.
  - **Mobile (< 640px)**: Vertical list showing label and supporting text together.

## Decision 3: Plain-Language Copy & Prohibited Jargon Filter
- **Rationale**: Centralizes natural French copy in `src/copy.js`. Eliminates all-uppercase decorative headings (`EXPRESSION INDIVIDUELLE`, `RÉPONSE AJOUTÉE`, `RÉSULTATS COLLECTIFS`) and product-design jargon in favor of plain conversational French.

## Decision 4: Data-Driven SVG Curve Generation (`src/visualisation.js`)
- **Rationale**: Cubic Bézier curve calculated dynamically from the 5 participant percentages. Tested in `tests/visualisation.test.mjs`.

## Decision 5: Ephemeral Memory State & Privacy Bounds
- **Rationale**: Pure JS memory state. Zero web storage, zero network APIs, zero tracking. Page reload resets all workshop data.

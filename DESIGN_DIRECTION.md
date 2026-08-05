# Living Pulse — Design Direction Document

## 1. Current Visual Weaknesses
- **Generic SaaS Aesthetic**: Standard white floating card on a grey background with standard royal blue buttons.
- **Form-in-a-Box Feel**: Narrow 800px layout that feels like a generic web survey rather than an intentional workshop tool.
- **Static Visualization**: Fixed SVG pulse line that did not reflect actual percentage data.
- **Abrupt Transition**: Sparse thank-you screen that felt like an abrupt end rather than a calm transition between participants.

## 2. The Living Pulse Concept
The redesign transforms the experience into **Living Pulse**, embodying a progression from:
`individual expression → collective perception → human conversation`

It feels:
- **Warm & Editorial**: Natural warm canvas (`#f3efe7`), organic tones, rich typography.
- **Contemporary & Calm**: Subtle contrast, restrained shadows, generous breathing room.
- **Credible & Purposeful**: High-touch digital product suitable for adults in professional transition.

## 3. Palette & Typography System
```css
--canvas: #f3efe7;
--canvas-deep: #e9e2d7;
--surface: #fffdf9;
--surface-raised: #ffffff;
--ink: #17231e;
--ink-soft: #59655f;
--ink-faint: #7b8580;
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
- **Typography Stack**: High-quality system font stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`).
- **Hierarchy**: Small uppercase eyebrows (`letter-spacing: 0.08em`), strong main headings, soft supporting text.

## 4. Page Composition & Responsive Strategy
- **Desktop (1080–1180px)**: Expanded max-width layout. The 5 canonical options are displayed as 5 horizontally aligned, connected tiles forming a visual emotional continuum.
- **Tablet / Intermediate (768–1024px)**: Adaptive grid layout with ample spacing.
- **Mobile (320–480px)**: Single column vertical layout with min 48–56px touch targets.

## 5. Interaction, Motion & Visualization Principles
- **Data-Driven Visualization**: Generates a smooth SVG cubic Bézier curve (`generatePulseSvgPath`) mapped directly to the 5 actual percentages.
- **Restrained Motion**: Reveal animation runs in <700ms. Respects `prefers-reduced-motion`.
- **Keyboard & Screen Reader Accessibility**: Native radio buttons, explicit focus management, ARIA live region (`aria-live="polite"`), and non-color-only text indicators.

## 6. Exact Interface Copy
- **Header**: "Team Pulse", "Prendre le pouls. Ouvrir la conversation.", "Session éphémère", "Espace facilitateur" / "Retour au vote".
- **Voting**: Eyebrow "EXPRESSION INDIVIDUELLE", Heading "Comment arrives-tu dans cette session ?", Button "Continuer", Microcopy "Ta réponse ne sera associée à aucun nom."
- **Confirmation**: Eyebrow "CONFIRMATION", Heading "Est-ce bien ce que tu veux partager ?", Buttons "Ajouter ma réponse" / "Modifier".
- **Thank-you**: Eyebrow "RÉPONSE AJOUTÉE", Heading "Merci d’avoir pris le temps de répondre.", Button "Passer à la personne suivante".
- **Pre-Reveal**: Eyebrow "RÉSULTATS COLLECTIFS", Heading "{total} réponses sont prêtes à être révélées.", Button "Révéler le pouls du groupe".
- **Revealed Results**: Eyebrow "LE POULS DU GROUPE", Heading "Voici ce que le groupe a partagé.", Sections "La répartition", "À OBSERVER", "POUR OUVRIR LA CONVERSATION", Buttons "Revenir au vote" / "Réinitialiser la session".
- **Reset**: Heading "Effacer toutes les réponses ?", Buttons "Effacer les réponses" / "Conserver la session".
- **Privacy Notice**: "Aucune réponse n’est enregistrée ni envoyée. Les résultats disparaissent lorsque la page est rechargée."

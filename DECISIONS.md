# Architectural Decisions & Trade-offs — Team Pulse

## Decision 1: Pure Ephemeral State in JavaScript Memory
- **Rationale**: To enforce strict privacy and zero persistence, no browser storage (`localStorage`, `sessionStorage`, `cookies`, `IndexedDB`) or network APIs (`fetch`, `XHR`) are used.
- **Trade-off**: Reloading the page resets all workshop data, which is explicitly aligned with the core privacy specification.

## Decision 2: Pure Vanilla ESM Architecture (Zero Dependencies)
- **Rationale**: No external libraries or build tools needed. Ensures fast loading, complete security, and standard Node test runner compatibility (`node --test`).
- **Trade-off**: Requires writing modular vanilla DOM rendering logic in `app.js` without UI frameworks.

## Decision 3: Deterministic Rule Engine for Insights
- **Rationale**: Replaces AI/LLM calls with a transparent, predictable priority-based rules engine (`insight.js`).
- **Trade-off**: Standardized prompts rather than generative text, ensuring strict safety, zero hallucination, zero latency, and zero remote API dependence.

## Decision 4: Accessible Custom Radio Controls
- **Rationale**: Native `<input type="radio">` wrapped inside standard `<label>` and `<fieldset>`/`<legend>` elements to preserve keyboard accessibility, screen reader semantics, and focus management. Abstract SVG symbols are aria-hidden.

## Decision 5: Reveal Animation Timing & Reduced Motion
- **Rationale**: Reveal duration is capped at ~600ms (<700ms requirement) and uses standard CSS transitions. Respects `prefers-reduced-motion` by disabling animation when set.

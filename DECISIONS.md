# Architectural & Design Decisions — Team Pulse (Living Pulse)

## Decision 1: Living Pulse Visual System
- **Rationale**: Replaces generic SaaS blue-grey floating cards with a warm, editorial canvas (`#f3efe7`), organic tone accents (`#b65345` through `#1d766c`), and strong typographic hierarchy.
- **Trade-off**: Requires custom CSS variable design tokens and careful contrast checks to ensure WCAG AA compliance.

## Decision 2: Data-Driven SVG Curve Generation (`src/visualisation.js`)
- **Rationale**: Replaces static decorative pulse SVGs with a dynamic cubic Bézier curve calculated directly from the 5 participant percentages.
- **Trade-off**: Requires dedicated unit tests (`tests/visualisation.test.mjs`) to verify mathematical correctness, zero-value handling, and path string validity without NaN values.

## Decision 3: Centralized Copy Module (`src/copy.js`)
- **Rationale**: Centralizes all user-facing French text to ensure exact wording compliance and zero text duplication across views.
- **Trade-off**: Adds a small internal module while significantly improving maintainability.

## Decision 4: Pure Ephemeral In-Memory State
- **Rationale**: Enforces absolute privacy bounds. No `localStorage`, `sessionStorage`, `cookies`, `IndexedDB`, `fetch`, or `XHR` are used.
- **Trade-off**: Page reloads clear all data, which strictly aligns with the ephemeral workshop design.

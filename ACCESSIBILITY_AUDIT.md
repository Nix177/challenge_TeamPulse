# Accessibility Audit — Team Pulse

This document outlines the accessibility evaluation for Team Pulse (Multi-Device Session Architecture).

---

## 1. Verified Accessibility Features
- **Keyboard Navigation**: Participant joining, room code entry, option selection, confirmation, receipt, facilitator creation, copy actions, dashboard controls, close room, reveal results, and delete room operate 100% via standard keyboard (`Tab`, `Shift+Tab`, `Space`, `Enter`).
- **Visible Focus**: Clear high-contrast focus rings (`outline: 3px solid var(--accent)` / `box-shadow: var(--shadow-focus)`) are enforced across code inputs, option tiles, buttons, header links, and copy actions.
- **Focus Management**: Programmatic focus restoration (`focusCardHeading()`) places focus on newly presented headings (`<h2>`, `<legend>`) after every view transition.
- **Touch Target Sizes**: All interactive option tiles (`min-height: 170px`), buttons (`min-height: 48px`), and inputs meet or exceed the minimum 44 × 44 CSS pixels requirement.
- **ARIA Live Region**: Screen reader announcements (`announce()`) broadcast room join, vote confirmation, copy code/link actions, session closure, and deletion events politely.
- **Responsive Layout**: Verified fluid responsiveness at **360 × 800 (mobile)**, **768 × 1024 (tablet)**, and **1140–1440px (desktop)** without horizontal scrollbars.
- **WCAG AA Contrast**: Text colors (`--ink`, `--ink-soft`, `--ink-faint` `#54615b`) achieve > 4.5:1 contrast ratio against `--surface` and `--canvas`.

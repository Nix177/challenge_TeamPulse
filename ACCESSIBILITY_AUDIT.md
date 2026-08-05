# Accessibility Audit — Team Pulse

This document outlines the accessibility evaluation of Team Pulse.

---

## 1. Verified in Browser & Code Execution
- **Keyboard Navigation**: Complete participant voting, verification, submission receipt, and facilitator flows operate 100% via standard keyboard (`Tab`, `Shift+Tab`, `Space`, `Enter`).
- **Visible Focus**: Clear high-contrast focus rings (`outline: 3px solid var(--accent)` / `box-shadow: var(--shadow-focus)`) are enforced across option tiles, buttons, header links, and details summaries.
- **Focus Restoration**: Programmatic focus restoration (`focusCardHeading()`) places focus on newly presented headings (`<h2>`, `<legend>`) after every view transition.
- **Touch Target Sizes**: All interactive option tiles (`min-height: 170px`), buttons (`min-height: 48px`), and header links (`min-height: 44px`) meet or exceed the minimum 44 × 44 CSS pixels requirement.
- **Responsive Layout**: Verified fluid responsiveness at **360 × 800 (mobile)**, **768 × 1024 (tablet)**, and **1140–1440px (desktop)** without horizontal scrollbars or clipped visualization text.
- **WCAG AA Contrast**: Text colors (`--ink`, `--ink-soft`, `--ink-faint` `#54615b`) achieve > 4.5:1 contrast ratio against `--surface` and `--canvas`.
- **Reduced Motion**: Point-joining receipt animations and SVG path transitions fall back cleanly when `prefers-reduced-motion: reduce` is enabled.

---

## 2. Inferred from Code Inspection
- **Form Semantics**: Canonical voting options are structured inside a standard `<fieldset class="options-fieldset">` with an explicit `<legend>`.
- **Native Radio Controls**: Native `<input type="radio">` controls are bound to explicit `<label>` elements.
- **ARIA Live Region**: View state updates trigger announcements in a polite live region (`<div id="aria-announce" aria-live="polite">`). `formatSubmissionLiveAnnounce(total)` announces vote submission and total count.
- **Color Independence**: Visual distribution bars and data-driven SVG curves include explicit textual representations (`Count (Percentage%)`).
- **Decorative SVGs**: Abstract option glyphs and graphic elements include `aria-hidden="true"`.

---

## 3. Unverified (Requires Human Screen Reader Evaluation)
- **Screen Reader Voice Testing**: Physical verification with NVDA, JAWS, VoiceOver, or TalkBack on actual hardware.
- **Voice Control Software**: Testing with Dragon NaturallySpeaking or Apple Voice Control.

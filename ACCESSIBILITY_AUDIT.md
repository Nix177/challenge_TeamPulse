# Accessibility Audit — Team Pulse

This document outlines the accessibility evaluation of the Team Pulse static web prototype. It clearly distinguishes between **Verified in Browser**, **Inferred from Code Inspection**, and **Unverified (Requires Human Screen Reader)**.

---

## 1. Verified in Browser & Code Execution
- **Keyboard Navigation**: Complete participant flow (radio selection, confirmation, next participant) and facilitator flow (revealing results, resetting session) operate entirely via standard keyboard (`Tab`, `Shift+Tab`, `Space`, `Enter`).
- **Visible Focus**: Clear, high-contrast focus rings (`outline` / `box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.35)`) are applied across all interactive elements (`input[type="radio"]`, `.btn`, `.btn-link`, `.skip-link`, `.presentation-summary`).
- **Focus Movement & Restoration**: Focus is programmatically managed after view transitions (`focusCardHeading()`), placing keyboard focus directly on the newly presented card heading (`<h2>`, `<legend>`) or main container.
- **Target Sizes**: All interactive buttons (`.btn`, `.option-label`, `.btn-link`) have a minimum CSS pixel dimensions exceeding **44 × 44 pixels** (labels are 56px high, buttons are 48px high).
- **Responsive Layout**: Tested and verified usable from **320 CSS pixels** width up to ultra-wide desktop screens without horizontal scrollbar or clipping.
- **Browser Zoom**: Supports **200% browser zoom** seamlessly due to fluid CSS layout and system font stacks (`system-ui`).
- **Reduced Motion**: Reveal animations respect `prefers-reduced-motion: reduce` by setting `transition: none !important;` on distribution bars.

---

## 2. Inferred from Code Inspection
- **HTML Semantics & Landmarks**: Document uses valid HTML5 semantic tags (`<header role="banner">`, `<main id="main-content" role="main">`, `<footer role="contentinfo">`).
- **Document Language**: Declarative `<html lang="fr">` attribute is present on the root element.
- **Form Semantics**: Canonical option choices are enclosed inside a standard `<fieldset class="options-fieldset">` with a prominent `<legend>` asking the initial question.
- **Native Input Controls**: Native `<input type="radio">` controls are bound to explicit `<label>` elements via matching `for` and `id` attributes.
- **ARIA Live Region**: View state updates trigger announcements in an polite live region (`<div id="aria-announce" aria-live="polite">`).
- **Color Independence**: Distribution bars include explicit textual representations (`Count (Percentage%)`), ensuring data comprehension without relying on color or bar widths alone.
- **Decorative SVGs**: Abstract option visual symbols and decorative pulse rhythm lines include `aria-hidden="true"`.

---

## 3. Unverified (Requires Human Screen Reader Evaluation)
- **Screen Reader Voice Testing**: Physical verification with NVDA, JAWS, VoiceOver, or TalkBack on actual hardware.
- **Voice Control Software**: Testing with Dragon NaturallySpeaking or Apple Voice Control.
- **Braille Displays**: Refreshable Braille display output formatting verification.

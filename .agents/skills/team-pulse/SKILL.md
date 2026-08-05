---
name: team-pulse
description: Standard workflow skill for building, testing, auditing, and releasing the Team Pulse prototype.
---

# Team Pulse Development Skill

This skill defines the complete process for maintaining Team Pulse:

1. **Implementation & Scope**:
   - Maintain pure vanilla ESM architecture in `src/`.
   - Preserve zero-storage, zero-network privacy bounds.
   - Follow canonical options and deterministic insight rules.

2. **Automated Testing**:
   - Run `node --check` on all JavaScript files.
   - Run `node --test` for unit and privacy test suites.

3. **Browser Verification**:
   - Serve using `python -m http.server 4173`.
   - Verify participant voting, facilitator results, reveal animation, reset flow, demo mode (`?demo=1`), presentation mode (`?present=1`), keyboard accessibility, and 320px responsive rendering.

4. **Auditing & Documentation**:
   - Request code and experience reviews.
   - Update `DECISIONS.md`, `ACCESSIBILITY_AUDIT.md`, and `QA_REPORT.md`.

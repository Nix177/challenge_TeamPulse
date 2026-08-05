# Team Pulse Build & Verification Workflow

Autonomous sequence for Team Pulse development and release verification:

1. **Inspect**: Inspect workspace state and existing files.
2. **Plan**: Write or update `implementation_plan.md` artifact.
3. **Implement**: Build or refine code (`index.html`, `styles.css`, `src/`).
4. **Test**: Execute syntax checks (`node --check`) and unit tests (`node --test`).
5. **Browser Verify**: Launch local HTTP server and execute browser scenario suite.
6. **Audit**: Invoke read-only `code-auditor` and `experience-auditor` subagents.
7. **Correct**: Apply verified fixes for identified defects.
8. **Retest**: Re-run full automated and browser test suites.
9. **Release Verdict**: Produce `QA_REPORT.md` and declare final verdict (READY FOR DEMO / NOT READY FOR DEMO).


# AERIS — Permanent Engineering Rules

PROJECT: AERIS — Urban Air Quality Assistant

QUALITY TARGETS
- Code Quality: 99/100
- Security: 98/100
- Efficiency: 100/100
- Testing: 99/100
- Accessibility: 96/100
- Problem Statement Alignment: 99/100

These are targets, not self-awarded scores.

ENGINEERING RULES
1. Use strict TypeScript. Avoid `any`.
2. Build reusable, modular components.
3. Separate UI, API, and business logic.
4. Validate external data using Zod.
5. Never expose secret keys to the browser.
6. Handle loading, error, empty, and stale states.
7. Add meaningful automated tests for new logic.
8. Meet WCAG 2.2 AA where applicable.
9. Avoid unnecessary dependencies and API requests.
10. Never silently use simulated air-quality data.
11. Always display data source, timestamp, and units.
12. Do not invent medical claims or exposure statistics.
13. Preserve the approved frontend design.
14. Do not rewrite unrelated working code.
15. Keep documentation synchronized with changes.

QUALITY GATE
Before completing each milestone:
- Run ESLint.
- Run TypeScript type checking.
- Run relevant Vitest tests.
- Run the production build.
- Run Playwright for affected user workflows.
- Review security and accessibility implications.

If a check fails, fix it before declaring success.

FINAL REPORT
Provide:
- Files changed
- Features implemented
- Tests executed and their results
- Security and accessibility checks
- Known issues and limitations
- Remaining work

Never claim tests passed without executing them.
Never claim a quality score was achieved without
an actual measurement.

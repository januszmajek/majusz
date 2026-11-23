<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Theme Follows Device

- **Plan**: context/changes/theme-follows-device/plan.md
- **Scope**: Phases 1–2 of 2 (full plan), self-review before the author's manual checks
- **Date**: 2026-11-23
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS (automated); manual 1.4–1.10 and 2.2 pending with the author |

Evidence (Playwright + system Chromium against `astro preview` of `dist/`, 18/18 checks, no
console or page errors):
- Fresh visit follows the device; click → `.dark`, `aria-pressed="true"`, `localStorage.theme = dark`.
- Stored choice is applied by the inline head script alone (bundled scripts blocked) and is
  already set when `<body>` starts parsing: no flash.
- Stored choice beats a device change; with no stored choice the site follows the device live
  and `aria-pressed` stays in sync.
- A second tab follows both ways at once; an invalid stored value is ignored.
- Keyboard: Tab reaches the toggle after the wordmark; Enter and Space toggle; the settled focus
  outline is 2px `--primary`, as on the wordmark.
- Throwing `localStorage` (blocked storage): the toggle still switches the page.
- 360px wide: wordmark and toggle on one line, no horizontal scroll.
- Built HTML has the toggle on every page and references no React runtime.

## Findings

### F1 — Toggle tap target is 36px

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/site/ThemeToggle.astro (`size="icon-lg"`)
- **Detail**: 36×36px meets WCAG 2.5.8 (24px minimum) but is under the 44px touch guideline.
  It sits alone at the right of the header, so mis-taps are unlikely.
- **Fix**: If it feels small on the phone (manual 1.10), switch to a 44px box (`size-11`).
- **Decision**: DEFERRED to the author's phone check

### F2 — Unused React client chunk in `dist/_astro/`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: dist/_astro/client.*.js (from `@astrojs/react`)
- **Detail**: The React integration emits its client entry (~220 KB) even though no page
  references it, so visitors never download it. It existed before this change (same hash on the
  previous commit).
- **Fix**: None now; revisit only if a deploy-size budget appears.
- **Decision**: ACCEPTED (pre-existing, not shipped to visitors)

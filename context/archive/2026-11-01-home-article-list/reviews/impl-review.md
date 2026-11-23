<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Home Article List

- **Plan**: context/changes/home-article-list/plan.md
- **Scope**: Phases 1–2 of 2 (full plan)
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
| Success Criteria | PASS |

Notes:
- Plan adherence: steps 1–3 match their contracts (`newestFirst` with an `en` base-sensitivity
  collator, non-mutating; home wiring via `render(entry)` → `minutesRead`; `Entry.summary`
  dropped). Step 4 (wordmark leads home, hidden intro title, wordmark hover) is an
  author-requested addendum written into the plan before it landed, so it is not drift.
- Scope: the nav/back-link removal touches the site shell, beyond the original plan, but is
  recorded in plan step 4, `design.md` (Header, Article, type scale) and roadmap S-05.
- Safety: static output, no user input, no new dependencies. `hover:` is Tailwind v4's
  hover-capable-only variant, matching `.quiet:hover`'s `@media (hover: hover)`; the global
  `:focus-visible` outline covers the wordmark for keyboards.
- Success criteria: `npm test` (131 passed), `npm run build` (complete), empty-state grep (ok)
  re-run on 2026-11-23. Manual 1.4–1.8 and 2.2 were confirmed by the author in this session;
  1.7 is marked superseded by step 4.

## Findings

### F1 — Type scale still lists a visible home title

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/foundation/design.md:37
- **Detail**: The type-scale row "Home and About title" still implies a visible home title,
  while Layouts → Home now says the title is screen-reader only.
- **Fix**: Rename the row to "About title" and note that home's title is screen-reader only.
- **Decision**: FIXED

### F2 — Footer and page title still use "majusz"

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/site/SiteFooter.astro:7, src/layouts/Layout.astro:16
- **Detail**: The wordmark now reads "Janusz Majek", but the footer says `© 2026 majusz` and the
  default `<title>` is `majusz.com` (articles: `<title> · majusz.com`). The domain in `<title>`
  is reasonable; the footer's bare `majusz` is now the only place that name appears as a brand.
- **Fix**: Change the footer to `© 2026 Janusz Majek` (and `design.md` → Footer); keep
  `majusz.com` in `<title>`.
- **Decision**: FIXED

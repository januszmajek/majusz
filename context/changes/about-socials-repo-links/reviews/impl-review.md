<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: About, Socials and Repo Links

- **Plan**: context/changes/about-socials-repo-links/plan.md
- **Scope**: Phases 1–2 of 3 (Phase 3, GitHub metadata, runs at push time with the author's approval)
- **Date**: 2026-11-23
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS (one justified deviation, F1) |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS (automated + author's manual checks; Phase 3 applied at push) |

Evidence (Playwright + system Chromium against `astro preview` of `dist/`, 360px and 1024px,
light and dark, on `/`, `/about/` and a missing URL):
- No horizontal scroll anywhere; at 360px the wordmark, `about` and the toggle share one line.
- `about` has `aria-current="page"` and the foreground color on `/about/` only; muted elsewhere.
- About: one `h1`, title "About · majusz.com", its own meta description; Elsewhere links point
  to github.com/januszmajek, linkedin.com/in/janusz-majek/, x.com/janusz_majek (all `rel="me"`)
  and the repo (no `rel`); none opens a new tab; all use the prose accent.
- Footer on every page reads `© 2026 Janusz Majek · source ↗`; `source` is muted, turns the
  accent on hover, and on keyboard focus shows the 2px accent outline.
- Tab order: wordmark → about → theme toggle → Elsewhere links → footer source.
- No console errors except the expected 404 on the missing-URL page.
- `npm test` (131 tests) and `npm run build` pass; README paths and commands exist.

## Findings

### F1 — Header compares the path without a trailing slash

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Adherence
- **Location**: src/components/site/SiteHeader.astro
- **Detail**: The plan said the header needed no change, but the build serves About at
  `/about/`, so `aria-current` would have been `"true"` instead of `"page"`. The header now strips
  one trailing slash (never the root `/`) before comparing. Dev (`/about`) and build (`/about/`)
  both mark the page.
- **Decision**: ACCEPTED

### F2 — No "Left for slices" entry for S-06 in design.md

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Adherence
- **Location**: context/foundation/design.md
- **Detail**: The plan asked to strike the S-06 entry "if one exists"; none does, so nothing was
  struck. The About and Footer paragraphs describe the built behavior.
- **Decision**: ACCEPTED

## Author's review (2026-11-23)

The author asked for three fixes, landed in `5ad3c01`: the `↗` after external links is now
0.7em (`.ext-arrow`); list stars are sized in their own font, so they centre on the first line
(measured: star centre equals first-line centre on every item, including a wrapping one) and sit
on the shared left edge; every profile shows its muted `@handle` instead of X alone in brackets.
Phase 3 ran with the push: `gh repo view` shows the description and `https://majusz.com`.

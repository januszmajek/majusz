<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Site Performance Implementation Plan

- **Plan**: context/changes/site-performance/plan.md
- **Scope**: All phases (1-5 of 5)
- **Date**: 2026-11-24
- **Verdict**: REJECTED (round 1) → APPROVED (round 2, after fixes in b0b7563)
- **Findings**: 1 critical, 4 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | FAIL |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

Automated: `npm test` 138 passed; `npm run build` ok; `npm run check:dist` 36 passed, 3 skipped (images, no articles). Manual rows 1.5-1.7, 2.4-2.8, 3.5-3.6, 4.4-4.5, 5.5-5.6 pending (author); 1.5, 1.6 and 4.4 have agent evidence in the phase reports but stay unchecked until the author confirms.

## Findings

### F1 — Immutable CSS goes stale when the math font subset changes

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: public/_headers:6-9 with src/integrations/math-font.ts:99-105
- **Detail**: `math-font.ts` rewrites `/fonts/latin-modern-math.woff2` to `…?v=<hash>` inside the built `/_astro/*.css` after Vite named it, so the CSS file name does not change when the glyph set does. With `/_astro/*` now `immutable` for a year, returning readers keep the old CSS and the old subset; a new formula symbol renders in a fallback or as tofu.
- **Fix A ⭐ Recommended**: Move the math `@font-face` out of `prose.css` into an inline `<style>` in `Layout.astro` and have `math-font.ts` rewrite the URL in the built HTML (cached 60 s) instead of CSS; add a dist test that no `/_astro/*.css` contains `latin-modern-math` or `?v=`.
  - Strength: Hashed CSS never changes after hashing; HTML already turns over within 60 s.
  - Tradeoff: ~150 bytes more per page head.
  - Confidence: HIGH — the integration already reads every built HTML file.
  - Blind spot: None significant.
- **Fix B**: Rename the rewritten CSS file and update every HTML reference.
  - Strength: Keeps the rule in CSS.
  - Tradeoff: Re-implements asset hashing by hand; fragile.
  - Confidence: MED.
  - Blind spot: Other references (preloads, prefetch) to the CSS name.
- **Decision**: FIXED (Fix A): math @font-face inline in Layout.astro; math-font.ts versions the URL in HTML; tests/dist/math-font.test.ts

### F2 — Image plugin marks remote and root-absolute images

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/markdown/image-priority.ts:34-52
- **Detail**: Remote (`https://…`) and `/…` images are not processed by Astro's image service, so they ship a stray `priority` attribute and `sizes` without `srcset`, and they use up the one priority slot.
- **Fix**: Skip images whose `src` matches `^(?:[a-z][a-z0-9+.-]*:|//|/)`; add tests.
- **Decision**: FIXED: remote, protocol-relative and root-absolute images skipped; 4 unit tests

### F3 — Hydration check fails on article text mentioning `client:load`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: tests/dist/navigation.test.ts (hydration regex)
- **Detail**: The regex scans the whole HTML; `<code>client:load</code>` in an article would block the deploy.
- **Fix**: Keep the `<astro-island` check; drop the text regex (or limit it to tag attributes).
- **Decision**: FIXED: text regex removed, `<astro-island` check kept

### F4 — Prefetched HTML can outlive a deploy's CSS

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: public/_headers:1-2 with astro.config.mjs prefetch
- **Detail**: Chromium keeps prefetched documents up to ~5 minutes; if a deploy changes the CSS hash in that window, a click renders HTML that asks for a CSS file the new deploy no longer serves.
- **Fix**: Accept and document in infrastructure.md (single-author site, rare deploys, one shared stylesheet; a reload fixes it).
- **Decision**: ACCEPTED: documented in infrastructure.md (Cache headers)

### F5 — Prefetch not proven by the navigation test

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: tests/dist/navigation.test.ts:37-41
- **Detail**: Accepts zero or one external script, so prefetch being switched off passes.
- **Fix**: Require exactly one external `/_astro/` script whose file contains Astro's prefetch code.
- **Decision**: FIXED: exactly one external /_astro/ script containing `astroPrefetch`

### F6 — JS budget ignores inline module scripts

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: tests/dist/budgets.test.ts
- **Detail**: Motif and toggle inline modules (~4.4 KB raw) are not counted; an inlined prefetch would measure 0.
- **Fix**: Count external and inline module script bodies (brotli); re-set the budget from the measurement.
- **Decision**: FIXED: JS budget counts external + inline module scripts (3,058 B measured → 3,500 B)

### F7 — Original-width variant still ships

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: tests/dist/images.test.ts:32
- **Detail**: Astro always adds the image's original width to the srcset, so a 4000 px photo ships a 4000w file; the column `sizes` keeps browsers from choosing it.
- **Fix**: Document in the test comment and plan that the original stays in the srcset and `sizes` is the guard.
- **Decision**: FIXED: documented in images.test.ts comment

### F8 — CI builds no article pages

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: tests/dist/*
- **Detail**: `content/articles/` is empty, so images tests skip and article links/budgets are unchecked until the first article. Planned behaviour.
- **Fix**: Accept; the suite covers articles automatically once one exists.
- **Decision**: ACCEPTED: planned; suite covers articles once one exists

### F9 — Malformed `%` in an href crashes the link test

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: tests/dist/links.test.ts (decodeURIComponent)
- **Detail**: `URIError` aborts the run instead of naming the link.
- **Fix**: Catch it and report the href as a broken link.
- **Decision**: FIXED: URIError reported as a broken link

## Round 2 (2026-11-24, after b0b7563)

- **Verdict**: APPROVED — no critical findings, no warnings.
- **Checks**: `npm test` 142 passed; `npm run build` ok; `npm run check:dist` 41 passed, 3 skipped (images, no articles). Scratch copy with mock articles: math subset 36 glyphs, 14.5 KB, versioned only in HTML; budgets pass (head 6,103 / 7,000 B, CSS 9,325 / 11,000 B brotli).
- **Round-1 decisions verified as applied**: F1, F2, F3, F5, F6, F7, F9 fixed; F4, F8 accepted.
- **Observations (not worth fixing now)**:
  - `math-font.ts` replaces the font path anywhere in a page, so an article quoting `/fonts/latin-modern-math.woff2` in code would show `?v=…`. Very unlikely.
  - The link check fails a hand-written `/about/` or `https://majusz.com/about/` link in an article, though Workers would redirect it. That is the stated rule; resolved wikilinks and `.md` links never end in `/`.
  - `dist/_astro/client.*.js` (React runtime, unreferenced) still ships in the deploy; pre-existing.
  - A local lab variant that shows math without `Layout.astro` would lose Latin Modern Math (variants are gitignored; none exist here).

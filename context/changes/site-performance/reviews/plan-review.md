<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Site Performance Implementation Plan

- **Plan**: context/changes/site-performance/plan.md
- **Mode**: Deep
- **Date**: 2026-11-24
- **Verdict**: REVISE → SOUND after fixes (round 1); round 2: SOUND, no findings
- **Findings**: 1 critical, 3 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | FAIL |
| Plan Completeness | WARNING |

## Grounding
Grounding: 11/11 paths ✓, 4/4 symbols ✓, brief↔plan ✓. Deep verification in a scratch copy (build, wrangler dev): build.format 'file' output ✓, Workers routing 307 → /about ✓, `! Cache-Control` detach ✓ (without it CSS gets both values), prefetch is one external ~1.1 KB gz module ✓, hast `priority`/`sizes` reach getImage ✓, breakpoints ✓, two Iosevka preloads ✓, speculationrules emitted verbatim ✓.

## Findings

### F1 — `npm test` would run the dist/ suite before the build

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1 §4 (dist/ check)
- **Detail**: There is no vitest config; Vitest 5's default include `**/*.{test,spec}.?(c|m)[jt]s?(x)` picks up `tests/dist/**`. CI runs `npm test` (deploy.yml:29) before the build (:31), so a fresh checkout fails. The plan claimed the default stays unchanged.
- **Fix**: Add `vitest.config.ts` limiting `npm test` to `src/**/*.test.ts`; `vitest.dist.config.ts` includes only `tests/dist/**`.
- **Decision**: FIXED

### F2 — Current-page normalisation misses `/index.html`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 §2
- **Detail**: With file format the build pathname is `/about.html`, `/index.html` for home. "Strip `.html`" alone gives `/index`.
- **Fix**: Specify `pathname.replace(/(\/index)?\.html$/, '') || '/'`, then the trailing-slash strip.
- **Decision**: FIXED

### F3 — "First image" state and block position underspecified

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 4 §1
- **Detail**: A module-level "first image seen" flag leaks across documents (and had no effect in a test build); an element visitor on `img` does not know its top-level block index.
- **Fix**: Factory plugin with per-document state (as Astro's heading-ids plugin, satteri-processor.js:67-90); position = index of the image's top-level ancestor among the root's children (0-2 qualify).
  - Strength: Deterministic per file; matches Astro's own pattern.
  - Tradeoff: Slightly more plugin code than image-width.ts.
  - Confidence: HIGH — the factory pattern is in the installed processor.
  - Blind spot: Exact Sätteri API for reaching the root/ancestor left to the implementer.
- **Decision**: FIXED

### F4 — Link check must target `<a href>` only

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 §4
- **Detail**: "Every same-origin href" includes `<link href="/favicon.svg">`, which the `/x → x.html` rule would wrongly fail.
- **Fix**: Check `<a href>` only; static files (`/favicon.*`) are out of the rule.
- **Decision**: FIXED

### F5 — design.md Header paragraph also says "medium weight"

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 3 §1
- **Detail**: `design.md:133` ("foreground color and medium weight only") is not in the list of edits.
- **Fix**: Add it to Phase 3 §1; also note the redirect status is 307 in Phase 1 manual checks.
- **Decision**: FIXED

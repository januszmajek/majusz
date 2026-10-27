<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Visual Direction (F-01), focus on folder structure and component split

- **Plan**: context/changes/visual-direction/plan.md
- **Scope**: Phase 4 of 5 (uncommitted working tree)
- **Date**: 2026-10-27
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | WARNING |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

Structure that is right as is: `src/components/site/` for shell pieces, `src/components/ui/` reserved for shadcn,
`src/config/nav.ts` as the single nav list (S-06 extends it), `src/layouts/Layout.astro` as the only
document shell, production code never imports from `lab/`. Automated checks 4.1–4.4 pass; manual 4.5–4.9 pending.

## Findings

### F1 — Type scale repeated as arbitrary class strings

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: src/pages/index.astro:7, src/pages/404.astro:7, src/components/site/SiteHeader.astro:12-14
- **Detail**: The page-title style `text-[clamp(1.5rem,4vw,1.875rem)] leading-[1.15] font-semibold tracking-[-0.015em]` is copied into both pages, and the wordmark/nav size `text-[1.25rem] … sm:text-[1.375rem]` twice in the header. Phase 5 (Intro, PageLayout, ArticleLayout, ArticleList) would copy the design.md scale again into 4+ files, so a scale change means a grep-and-replace.
- **Fix A ⭐ Recommended**: Put the design.md scale in `@theme` as named text tokens (`--text-page-title`, `--text-article-title`, `--text-nav`, `--text-body`, `--text-meta`, each with `--line-height`/`--letter-spacing`/`--font-weight` sub-vars) and use `text-page-title` etc.
  - Strength: design.md's typography table maps one-to-one to tokens; one place to change, Tailwind-native.
  - Tradeoff: Responsive sizes (wordmark 1.25→1.375rem) still need a `sm:` variant or a clamp.
  - Confidence: HIGH — Tailwind v4 supports `--text-*--line-height` etc. in `@theme`.
  - Blind spot: Haven't checked that sub-var names don't clash with shadcn's `tailwind.css`.
- **Fix B**: A `PageTitle.astro` component used by pages and Phase 5 layouts.
  - Strength: Also owns the `<h1>` semantics.
  - Tradeoff: Doesn't cover non-heading uses (meta, nav, body); adds a component per text style.
  - Confidence: MED.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A (text-<role> tokens in @theme; --size-chrome steps at 40rem)

### F2 — Motif.astro bundles markup, orbit math and two renderers in 308 lines

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: src/components/site/Motif.astro:57-307
- **Detail**: One inline `<script>` holds the RNG, the ISS orbit model and readout formatting (pure functions), the graticule painter, the ASCII-sky painter and the lifecycle (idle start, resize, visibility, reduced motion, theme observer). The pure parts can't be imported or tested on their own; editing one sky means scrolling through the other.
- **Fix**: Keep `Motif.astro` as canvas + styles + `<script>import { startMotif } from './motif/start'</script>`; move logic to `src/components/site/motif/` (`rng.ts`, `orbit.ts`, `graticule.ts`, `ascii.ts`, `start.ts`). Astro bundles imported TS in component scripts, so output stays a single module.
  - Strength: Pure `orbit.ts`/`rng.ts` become unit-testable when the m3 test rollout adds a runner; each sky is one file.
  - Tradeoff: Five small files for code that rarely changes; a few hundred bytes of module glue at most.
  - Confidence: MED — benefit grows only if the motif is touched again (game milestone, S-07 polish).
  - Blind spot: Not measured whether the split changes the emitted script size.
- **Decision**: FIXED (motif/{rng,orbit,frame,ascii,graticule,start}.ts)

### F3 — Theme script inline in Layout although S-07 replaces it

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: src/layouts/Layout.astro:28-36
- **Detail**: S-07 (or an earlier toggle) rewrites this script to read a stored choice and must keep it in sync with the toggle component; inline in the layout it mixes with fonts and meta.
- **Fix**: Extract to `src/components/site/ThemeScript.astro` (`<script is:inline>`), rendered in `<head>` before `<Font>`.
- **Decision**: FIXED (ThemeScript.astro)

### F4 — Prose styles live inside global.css

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/styles/global.css:116-165
- **Detail**: global.css mixes tokens, base styles, chrome helpers and ~50 lines of `.prose`; S-01/S-03/S-04 will add images, callouts, code themes and tables to `.prose`, growing it further.
- **Fix**: Move `.prose` rules to `src/styles/prose.css` and `@import "./prose.css"` from global.css; tokens and base stay in global.css.
- **Decision**: FIXED (src/styles/prose.css)

### F5 — Layout gained an unplanned `current` prop

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/layouts/Layout.astro:12
- **Detail**: Plan contract is `{ title?: string; description?: string }`. `current?: string` was added to drive `aria-current` in the header; justified but undocumented.
- **Fix**: Accept; note it in change.md Notes so Phase 5 layouts pass it through.
- **Decision**: ACCEPTED (noted in change.md)

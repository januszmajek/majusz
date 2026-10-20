<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Visual Direction (F-01)

- **Plan**: context/changes/visual-direction/plan.md
- **Mode**: Deep
- **Date**: 2026-10-20
- **Verdict**: REVISE → SOUND after triage
- **Findings**: 0 critical, 2 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | WARNING |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding
8/8 paths ✓, 4/4 symbols ✓ (`fonts` config, `Font` in `astro:assets`, `injectRoute`, `command`), brief↔plan ✓, Progress↔Phase ✓

## Findings

### F1 — Lab "Shipped" variant can't embed production layouts

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Phases 4–5
- **Detail**: `Layout.astro` renders the whole document and `ArticleLayout`/`PageLayout` wrap it, so the lab page would nest one document inside another, and the production theme script would fight the lab's theme switch.
- **Fix A ⭐ Recommended**: Split document (`Layout`) from `SiteShell`; the lab renders `SiteShell` in its own document.
- **Fix B**: `overlay` slot in `Layout` for lab chrome.
- **Decision**: FIXED (differently) — the lab became a Storybook-style separate app (`npm run lab`, own config in `lab/`, port 4322) whose harness frames variant pages in an iframe and sets the theme on it; production layouts stay unchanged.

### F2 — Baseline control stops being plain shadcn after Phase 4

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW
- **Dimension**: Blind Spots
- **Location**: Phase 2
- **Detail**: `lab/lab.css` imported `global.css`, which Phase 4 changes to the chosen tokens.
- **Fix**: Baseline keeps its own copy of shadcn's default tokens.
- **Decision**: FIXED

### F3 — Phase 1 claims inaccurate

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Completeness
- **Location**: Phase 1
- **Detail**: "Look as before" can't hold after Tailwind preflight; shadcn's Astro setup may need the alias first.
- **Fix**: Reword the manual check; use shadcn's ready-made setup script, setting the alias first if its docs require it.
- **Decision**: FIXED (plus: prefer shadcn's own setup script over hand wiring)

### F4 — Vacuous and non-runnable checks

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Completeness
- **Location**: Phases 2–5
- **Detail**: `git status --porcelain` never shows ignored files; "`ls dist` lists only…" is not runnable.
- **Fix**: `test -z "$(git ls-files lab/variants lab/content)"`; `find dist -name '*.html'` equals `index.html` + `404.html`.
- **Decision**: FIXED

### F5 — Lab route contract omits getStaticPaths

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Blind Spots
- **Location**: Phase 2
- **Detail**: A dynamic route in a static project needs `getStaticPaths`, dev included.
- **Fix**: `[page].astro` exports `getStaticPaths` over variants × pages.
- **Decision**: FIXED

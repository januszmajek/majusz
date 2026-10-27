<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Visual Direction (F-01)

- **Plan**: context/changes/visual-direction/plan.md
- **Scope**: Phase 2 of 5
- **Date**: 2026-10-20
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Lab silently moves off port 4322 when the port is taken

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: lab/astro.config.mjs:14
- **Detail**: With `npm run labt` running, `npm run lab` started on localhost:4323 instead of failing, so check 2.4 (`curl localhost:4322`) fails and the AGENTS.md / plan port is wrong without warning. Verified during review.
- **Fix**: Add `strictPort: true` to the lab's `server` config so a busy port is an error, not a silent move.
- **Decision**: PENDING

### F2 — Mock articles read as the author's real first-person statements

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: lab/content/side-projects.md:1, lab/content/weekly-review.md:1
- **Detail**: Both files are tracked in a public repo read by recruiters and are written in the first person with `source: https://majusz.com/...` and `author: [[Majusz]]` (e.g. a 1–5 project rating system, "People ask if I let an AI agent do these reviews"). Nothing in the files marks them as mock text.
- **Fix**: Change the tag from `notes` to `mock` in both files so they are visibly marked as lab mock data.
- **Decision**: PENDING

### F3 — Implementation choices not yet in the plan

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: lab/astro.config.mjs:16, lab/pages/index.astro:138
- **Detail**: `--ignore-lock` and the `?url` stylesheet rule are now in the plan, but three smaller choices are not: the Astro dev toolbar is disabled in the lab; `?v=` holds the variant name rather than the PICKER.md index (`?v=2`), so links survive new variants; and the page / home-state / theme pills stack above the variant picker instead of sharing one pill.
- **Fix**: Add one sentence on each to Phase 2 step 3 of the plan.
- **Decision**: PENDING

### F4 — Theme applies after load; in-frame navigation doesn't sync the harness

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: lab/pages/index.astro:145
- **Detail**: `.dark` is set on the frame's `<html>` in its `load` handler, so dark mode briefly shows the light page on each switch. Links inside a variant (e.g. header "About") navigate the iframe but leave the pills and URL on the old page. Both are lab-only and match the plan's contract.
- **Fix**: Accept for now; revisit if the flash gets in the way of judging dark variants.
- **Decision**: PENDING

### F5 — Lab TypeScript is never type-checked

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: lab/lib/data.ts, lab/pages/v/[variant]/[page].astro:17
- **Detail**: `npm run build` never touches `lab/`, and the repo has no `typescript` / `astro check`, so type errors in the lab only show up at runtime in dev. `[page].astro` also types the glob as `{ default: any }`.
- **Fix**: Accept; AGENTS.md says no checker exists yet. Note it for the future quality-gates work (m3l3).
- **Decision**: PENDING

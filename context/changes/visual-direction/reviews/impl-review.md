<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Visual Direction (F-01)

- **Plan**: context/changes/visual-direction/plan.md
- **Scope**: Full plan (Phases 1–5 of 5); Phases 2 and 4 were reviewed earlier and their decided items are not raised again
- **Date**: 2026-10-27
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 6 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

Automated checks re-run on 2026-10-27, all passing:
- `npm run build` passes and builds only `dist/404.html` and `dist/index.html`.
- `dist/` has no third-party font hosts and contains 16 self-hosted woff2 files.
- `dist/index.html` links a CSS file.
- `git ls-files lab/variants` is empty and `lab/variants` is ignored.
- `design.md` has 5 `## ` sections.

Manual rows are all checked. Each one cites a phase commit, and the author's earlier triage of the Phase 4 reviews backs them up.

## Findings

### F1 — Home nav link announced as "current page" on articles

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/site/SiteHeader.astro:20 (triggered by src/layouts/ArticleLayout.astro:17)
- **Detail**: `ArticleLayout` passes `current="articles"`, and the header renders `aria-current="page"` on the `/` link. On an article page, screen readers therefore announce the home link as the current page. Because the link represents a section, the correct value is `aria-current="true"`.
- **Fix**: In SiteHeader, use `'page'` when `Astro.url.pathname === item.href` and `'true'` otherwise for a section match. The visual highlight stays the same.
- **Decision**: FIXED (aria-current "page" on exact path, "true" on section match)

### F2 — Box-drawing rule text read aloud in year headings

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/styles/global.css:159 (used by src/components/home/ArticleList.astro:28)
- **Detail**: The CSS-generated text in `.rule::after` (about 190 `─` characters) becomes part of the accessible name. The year `<h2>` is announced as "2026 ─────…", and the LOG/EOF rules have the same problem. The `✦` bullet in `prose.css` and `hr::after "- - -"` are read aloud the same way.
- **Fix**: Add empty alt text to the generated content, `content: "────…" / "";`, and do the same for the `✦` and `- - -` pseudo-elements.
- **Decision**: FIXED (empty alt text on .rule, ✦ and hr content; plain declaration kept first as fallback)

### F3 — Phase 5 components use raw sizes instead of `text-<role>` tokens

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: src/layouts/ArticleLayout.astro:19, src/components/home/EmptyState.astro:8, src/components/home/ArticleList.astro:40
- **Detail**: AGENTS.md says to use `text-<role>` tokens and not raw sizes. Three Phase 5 components break that rule. The back link uses `text-base leading-none`, although design.md lists "Back link 1rem / leading 1" as a role. The empty-state teaser uses `text-sm`, a size that isn't on the design scale. The list row title uses `leading-[1.4]` with no size role. All three were copied from the picked variant.
- **Fix**: Add `--text-back` and `--text-list-title` tokens (size + line-height) to `global.css`, pick an existing role for the teaser, and record any new role in design.md's type table.
  - Strength: Keeps the "tokens only" rule true, so S-05 and S-01 don't copy the raw values onward.
  - Tradeoff: Two more tokens, and the type table in design.md grows.
  - Confidence: HIGH — the Phase 4 review F1 fixed the same pattern this way.
  - Blind spot: The teaser's intended size isn't in design.md, so the author has to pick its role.
- **Decision**: FIXED (text-back and text-list-title tokens; teaser uses text-meta; design.md type table updated)

### F4 — About caps prose at 38rem; design.md says 65ch

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/layouts/PageLayout.astro:15
- **Detail**: The whole page is wrapped in `max-w-[38rem]`. design.md:46 says only summaries and intros cap at 38rem and that prose runs at 65ch, and design.md:150 says About is "same title style as home, then prose". The wrapper copies the picked variant, so the lab shows no difference and the doc is the side that's out of date.
- **Fix**: Add "About body capped at 38rem" to design.md's About section. If the author wants 65ch, drop the wrapper instead.
- **Decision**: FIXED (design.md records the 38rem About cap)

### F5 — Article meta tags not lowercased

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/layouts/ArticleLayout.astro:24
- **Detail**: design.md says the `date · n min · tag` meta line is lowercase. Tags are printed as written in frontmatter, so a tag like `Obsidian` shows with its capital.
- **Fix**: Add `lowercase` to the meta `<p>`.
- **Decision**: FIXED (`lowercase` on the meta line)

### F6 — Block code renders at ~0.805rem, not 0.875rem

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/styles/prose.css:38
- **Detail**: `.prose code { text-[0.92em] }` also matches the `<code>` inside `<pre>` (`text-sm`), so block code renders at 0.92 × 0.875 ≈ 0.805rem. design.md specifies 0.875rem.
- **Fix**: Change the selector to `.prose :not(pre) > code` for the 0.92em size, or add `.prose pre code { font-size: inherit; }`.
- **Decision**: FIXED (0.92em only on inline code)

### F7 — `button.tsx` vendored but unused by any tracked file

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/ui/button.tsx
- **Detail**: The only consumer is the gitignored `lab/variants/flight-deck/ThemeToggle.tsx`. Phase 3 allowed adding primitives during rounds, but in a public clone the file looks like dead code, and AGENTS.md says primitives are "added only when used". It is presumably meant for the S-07 toggle.
- **Fix**: Add a change.md note that it is reserved for the S-07 toggle. Alternatively, delete it and re-add it in S-07.
- **Decision**: FIXED (change.md note: kept for the S-07 toggle)

### F8 — AGENTS.md Project Structure doesn't list the Phase 5 pieces

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: AGENTS.md:27-40
- **Detail**: S-01, S-05 and S-06 agents will look for `ArticleLayout`, `PageLayout`, `src/components/home/` and `src/lib/date.ts`, but Project Structure names only `Layout.astro` and `site/`.
- **Fix**: Add one bullet: "`src/layouts/ArticleLayout.astro` / `PageLayout.astro` and `src/components/home/` (Intro, ArticleList, EmptyState) are the page layouts slices fill; no routes yet."
- **Decision**: FIXED (AGENTS.md Project Structure bullet)

### F9 — Small hygiene leftovers

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: lab/lib/data.ts:2, lab/lib/data.ts:118, scripts/subset-fonts.mjs:14, repo root
- **Detail**:
  - `data.ts:2` still says "Everything under lab/content/ is local-only", but that folder is tracked.
  - `data.ts:118` has a doc comment that is no longer attached to anything ("Variant folder names").
  - `subset-fonts.mjs` fetches `fontsource/...@latest`, so a re-run can silently change the glyphs.
  - Untracked `pnpm-lock.yaml` and `pnpm-workspace.yaml` sit in the root of an npm repo, one `git add -A` away from being committed.
- **Fix**:
  - Correct both comments in `data.ts`.
  - Pin the Fontsource version in `SOURCE`.
  - Delete the pnpm files after checking they are stray.
- **Decision**: FIXED (data.ts comments corrected; Fontsource pinned to 5.3.0; stray pnpm files deleted)

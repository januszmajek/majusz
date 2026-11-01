<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Diagrams and Math

- **Plan**: context/changes/diagrams-and-math/plan.md
- **Scope**: Phases 1–3 of 3 (full plan)
- **Date**: 2026-11-01
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

Automated: `npm test` passes (12 files, 119 tests); `npm run build` passes (the expected Vite warning about the unresolved `/fonts/latin-modern-math.woff2`). The scratch-article criteria (1.3, 1.4, 2.3, 2.4, 3.3, 3.4) were not re-run in this review. All Manual rows are checked in the plan's Progress.

## Triage summary

- Fixed: F1 (Fix A), F2, F3 (accurate error instead of the planned split), F4, F5, F6, F7, F8, F9 (9)
- After fixes: `npm test` passes (12 files, 125 tests), and `npm run build` passes. A scratch article with callout `$$x$$`, a diagram in a callout and a `$` in a link URL built as expected, and was then removed.

## Findings

### F1 — A rejected `$…$` span shows raw markdown to readers

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/math.ts:128
- **Detail**: When a span fails Obsidian's whitespace rule, the code swaps it for its source slice as a `text` node. Sätteri has already parsed everything between the two `$` as one math string, so any markdown inside comes out literally. Probed through the full pipeline: `Pay $ 5 for **bold** and $ 6` → `<p>Pay $ 5 for **bold** and $ 6</p>`. Code spans, links and entities between the two `$` come out the same way (the second agent probed those). Obsidian renders this text normally, and before this change the site did too. The build doesn't fail, so this breaks the "readers never see raw syntax" rule without warning, and two prices in one paragraph are common in blog prose. The test only covers `$5 and $6 money`, which has no markdown inside.
- **Fix A ⭐ Recommended**: Fail the build when a rejected slice contains inline-markdown characters (`*`, `_`, `` ` ``, `[`, `<`, `&`, `~`, `=`), and tell the author to write `\$`. Add tests for each.
  - Strength: Matches the plan's existing rule that source the site can't show faithfully fails the build. It's a few lines in the existing rejection branch.
  - Tradeoff: The author has to escape prices in paragraphs that also hold markdown, which Obsidian doesn't require.
  - Confidence: HIGH — the rejection branch already holds the source slice.
  - Blind spot: A slice that contains a `\` escape (`$ a \$ b $`) also comes out raw. Decide whether `\` belongs in the character set.
- **Fix B**: Render rejected text faithfully. Tokenize `$` yourself in `text` nodes (as `highlight.ts` does for `==`) instead of using Sätteri's inline math, or re-parse the slice as inline markdown.
  - Strength: Matches Obsidian exactly, with no extra escaping for the author.
  - Tradeoff: Sätteri would parse markdown inside TeX (`*`, `_`, `\,` would get mangled). That's why the plan uses `features.math`, so this is a redesign of Phase 1.
  - Confidence: LOW — not probed; it could reopen the TeX-escaping problem.
  - Blind spot: How Sätteri splits text nodes around emphasis that crosses a `$`.
- **Decision**: FIXED (Fix A): `inlineSyntax` check in the rejection branch (`*`, `_`, `` ` ``, `[`, `<`, `&`, `~`, `\`), tests and a README build-failure line

### F2 — `$$x$$` directly under a callout header stays raw

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/math.ts:81-87 (`wholeDisplay`)
- **Detail**: `math` runs before `callouts` (see F6). At that point the `[!note]` line and the `$$x$$` line are still one paragraph, so `$$x$$` isn't the paragraph's only content. It gets rejected and kept as text. Probed: `> [!note]⏎> $$x$$` → `<div class="callout-content"><p>$$x$$</p></div>`. Obsidian shows display math here. Neither the guard nor the build catches it. The tests only cover the multi-line `$$` block inside a callout.
- **Fix**: In `wholeDisplay`, accept a paragraph whose first line is a callout marker (`[!type]…` text, then a break) and whose remaining content is only `$$…$$`. Add the test case.
  - Strength: Small, local change. It keeps the plugin order the source-position reads depend on.
  - Tradeoff: `math` has to know callout marker syntax, which couples it to `callouts`.
  - Confidence: MED — Sätteri's node shape for the marker line plus the break isn't probed yet.
  - Blind spot: A foldable marker (`[!note]-`) or a title holding inline nodes.
- **Decision**: FIXED: `calloutDisplay` in math.ts moves the `$$x$$` line out of a callout's first paragraph as a display block (only for a blockquote's first paragraph, only the line right under the title); tests cover foldable and titled markers and the not-a-callout cases

### F3 — A `$…$` span crossing a `%%` comment fails the build with a false "Unclosed %%"

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/comments.ts:59 (regression caused by `features.math` in astro.config.mjs)
- **Detail**: `comments` counts `%%` only in `text` nodes, and an `inlineMath` node now hides the `%%` inside it. Probed: `Price %%old: $5%% now $x$ ok` and `I paid $5 %% was $6? %% today` both throw `Unclosed %% comment`. Obsidian strips comments first, so both notes are valid there. The author gets a misleading error, and nothing leaks.
- **Fix**: In `comments.ts`, count `%%` in each `inlineMath` node's source slice (it already has `position: true` and `ctx.source`). If one sits inside, split the node back to text so comment stripping sees it. Add a test.
  - Strength: Fixes the problem where it starts. Comments are meant to run before every other plugin.
  - Tradeoff: `comments.ts` gets knowledge of math nodes.
  - Confidence: MED — the split into text has to keep source offsets for `math`.
  - Blind spot: The display-math (`math` node) variant isn't probed.
- **Decision**: FIXED (differently): the planned split would leave a later `$x$` as raw text, so comments.ts now fails with an accurate `%% comment inside $…$` error and a `\$` hint. Test and README line added

### F4 — The `$` pairing check reads link destinations and inline HTML

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/math.ts:93-109 (`obsidianPairs`)
- **Detail**: The check scans the block's raw source and blanks only code spans. Probed: `See [link](https://e.com/?a=$1) and $5 then $ x$` fails with "Obsidian reads this as math". That may be a false positive. It only fires in a paragraph that also has a rejected span.
- **Fix**: Blank link/image destinations and `html` nodes by their mdast offsets before pairing, as is done for code spans.
- **Decision**: FIXED: `destination()` plus `html` offsets feed an `opaque` list that `obsidianPairs` blanks. Tests cover a link, an image and an attribute `$`. (The probe example `$5 then $ x$` was a true Obsidian pair, so the build still correctly fails on it.)

### F5 — `$$a⏎b$$` fails the build (an unplanned rule)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/lib/markdown/math.ts:149
- **Detail**: Text right after the opening `$$` fails with "put $$ on its own line". The plan only calls for failing an unclosed `$$`. The code header and `content/README.md` document the rule, but Obsidian accepts this form.
- **Fix**: Record it in the plan as an addendum (a deliberate fail-safe rule).
- **Decision**: FIXED: recorded in plan.md "Addendum (implementation review, 2026-11-01)"

### F6 — Plugin order and diagram accent token differ from the plan, which doesn't record them

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: astro.config.mjs (mdastPlugins), src/styles/global.css (`--diagram-accent`)
- **Detail**: The order is `[comments, math, callouts, …]`, where the plan has math after `inlineTags`. It moved because `callouts` drops the source positions `math` reads. `--pele-accent` is `--diagram-accent` (dark `#5cc27a`), not `--primary`, because of a 4.39:1 contrast miss. The code comments and design.md explain both, but the plan doesn't. F2 is caused by the order change.
- **Fix**: Add a plan addendum that records both deviations and why.
- **Decision**: FIXED: recorded in plan.md "Addendum (implementation review, 2026-11-01)"

### F7 — Centred wide display math may clip on the left

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/styles/prose.css:173-175
- **Detail**: `math.tml-display { display:block; width:100% }` sits inside a `text-center` scroll region. A centred block formula wider than its box can overflow to the left, and a scroll region can't reach that part. This is unverified. Manual 1.7 checked an `align` block, but a long single-line formula wasn't checked.
- **Fix**: Check a long one-line formula on a phone. If it clips, use `width: max-content; min-width: 100%` on `math.tml-display`.
- **Decision**: FIXED: applied `width: max-content; min-width: 100%` before any phone check. Checked on a phone with a long one-line formula, inside and outside a callout: it scrolls, nothing clips.

### F8 — A diagram inside a callout doesn't stand out from it

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/styles/prose.css (`.prose .diagram`; compare the callout `pre` override at prose.css:102-104)
- **Detail**: `.diagram` uses `bg-card`, the same surface as the callout behind it. Code blocks in callouts switch to `bg-background`, and diagrams don't.
- **Fix**: Mirror the `pre` override for `.callout .diagram` (background and `--pele-bg`). Check that contrast still holds on `--background`.
- **Decision**: FIXED: added `.prose .callout .diagram` (bg-background, `--pele-bg: var(--background)`). diagram-contrast.test.ts now checks both surfaces in both themes, and they pass.

### F9 — The roadmap still shows S-04 as in progress

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/foundation/roadmap.md:48, :144
- **Detail**: The table says `in-progress` and the S-04 section says `Status: planning`. They disagree with each other, and both are stale now that the change is implemented.
- **Fix**: Set both to `done` when the change is archived, or now. Make sure they agree.
- **Decision**: FIXED: the table and the section both say `done`.

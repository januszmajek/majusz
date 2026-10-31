<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Callouts, code and tables

- **Plan**: context/changes/callouts-code-tables/plan.md
- **Scope**: Phases 1–3 of 3 (full plan)
- **Date**: 2026-10-31
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

Automated checks re-run on 2026-10-31: `npm test` passed (8 files, 82 tests), `npm run build` passed,
and the built HTML has no `github-dark` class and no inline `background-color` on `pre`. Every
test case the plan listed exists. Manual rows are all checked; the matching CSS and docs are in the diff.

## Findings

### F1 — Split highlight in a callout title renders raw `==`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/obsidian-guard.ts:62
- **Detail**: The split-highlight check runs only on `paragraph`, `heading` and `tableCell`. A callout title is a custom `calloutTitleInner` node, so the check never sees it, and each text node (`==a`, ` b==`) passes the regex alone. `> [!note] **==a** b==\n> body` builds and renders `<span class="callout-title-inner"><strong>==a</strong> b==</span>`. Readers see raw syntax, which breaks the AGENTS.md hard rule. The same text in the callout body fails the build as intended.
- **Fix**: Run `splitHighlight` on callout title nodes too, for example from a root-level walk that matches `type === 'calloutTitleInner'`, and add a test.
- **Decision**: FIXED — guard walks `calloutTitleInner` nodes in `before`; test in callouts.test.ts (fails without the fix)

### F2 — File-layout deviations not recorded in the plan

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/callouts-code-tables/plan.md:156, :287
- **Detail**: (a) The plan names a new `src/lib/markdown/obsidian-guard.test.ts`. No such file exists. The three planned cases (`**==a** b==` fails, `==**a**==` passes, `![a ==b==](x.png)` fails) sit in `describe('guard')` in `src/lib/markdown/highlight.test.ts:58-71`. (b) The plan names `flight-deck-light.ts` and `flight-deck-dark.ts`, each with a default-exported `ThemeRegistration`. The code has one `shiki/flight-deck.ts` with named exports `flightDeckLight`/`flightDeckDark`, typed from Astro's `ShikiConfig`. Both are reasonable, and design.md and AGENTS.md describe the real layout. The plan doesn't, so it's wrong as a reference.
- **Fix**: Add a short deviation note to the plan's Phase 1 §3 and Phase 3 §1, or move the guard tests into their own file to match.
- **Decision**: FIXED — deviation notes added to plan Phase 1 §3 and Phase 3 §1

### F3 — `[!WARNING]` title stays upper case

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/markdown/callouts.ts:60
- **Detail**: The default title capitalizes only the first letter, as written: `> [!WARNING]` gets the title "WARNING". The plan asked for exactly that ("capitalized as written"). Obsidian, as I recall (not checked here), shows "Warning" for GitHub-style upper-case alerts, which authors often paste. `data-callout` is already lower-cased, so only the visible title differs.
- **Fix**: If Obsidian parity is confirmed, build the default title from the lower-cased type (`Warning`) and update the plan line and the test.
- **Decision**: FIXED — Obsidian help confirms title case and a case-insensitive type; default title lower-cases the rest; plan line and test updated

### F4 — Backslash escapes don't stop `==` or `%%`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/highlight.ts:16, src/lib/markdown/comments.ts:46
- **Detail**: `a \==b== c` renders `<mark>b</mark>` and `a \%%b%% c` hides `b`, because both plugins read the unescaped text value. An author has no way to show a literal `==x==` or `%%` outside code. Nothing raw leaks, and code spans still work, so this is about matching Obsidian, not safety.
- **Fix**: Leave as is, and note in content/README.md that backticks are the way to show the syntax.
- **Decision**: FIXED — content/README.md says to use backticks to show the syntax; a backslash doesn't escape it

### F5 — Stale comments: prose.css header, roadmap status

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/styles/prose.css:2, context/foundation/roadmap.md:47
- **Detail**: The prose.css header still says "Later slices add images, callouts, code and tables here", but S-03 added the last three. The roadmap row for S-03 still says `in-progress` while change.md says implemented; that's probably left for archive, as with S-02.
- **Fix**: Trim the prose.css header to "Later slices add images here." The roadmap status updates at archive.
- **Decision**: FIXED — prose.css header trimmed; roadmap S-03 status left for /10x-archive

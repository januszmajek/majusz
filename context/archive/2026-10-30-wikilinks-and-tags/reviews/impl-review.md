<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Wikilinks and Tags

- **Plan**: context/changes/wikilinks-and-tags/plan.md
- **Scope**: All phases (1–3 of 3)
- **Date**: 2026-10-31
- **Verdict**: NEEDS ATTENTION → resolved in triage (9 fixed, 1 accepted; 47 tests)
- **Findings**: 0 critical, 5 warnings, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

Automated: `npm test` 40/40 pass; `npm run build` passes. All manual rows have evidence: 1.5, 1.6, 2.5 and 3.3 were checked in the browser, and the user confirmed 3.4.
Known, reported deviations (not findings): basename-only display text, nested heading → last heading, tests via `createSatteriMarkdownProcessor`, no `vitest.config.ts`, `{ loadIndex, loadAttachments }` factory, inline tags skip link text.

## Findings

### F1 — Reference-style and query-string `.md` links leak the unpublished note's path

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/obsidian-links.ts:30, :120
- **Detail**: The `link` visitor only sees inline links whose URL has no `?`. Reproduced: `[ref]\n\n[ref]: private/Secret%20plans.md` → `<a href="private/Secret%20plans.md">ref</a>`; `[t](private/Secret.md?x=1)` → `<a href="private/Secret.md?x=1">`. Each leaks the folder and file name into a broken link. Published targets written these ways stay broken too. This is the privacy rule the slice exists for.
- **Fix A ⭐ Recommended**: Allow and drop `?…` in `noteLink`. Resolve `definition` nodes the same way: rewrite the URL when the note is published. When it isn't, collect the identifier in `before` (walk the root for definitions), unwrap the matching `linkReference`s to their children, and remove the definition.
  - Strength: Every `.md` link form follows the same rule; the privacy promise in content/README.md holds.
  - Tradeoff: Adds two visitors and a pre-scan of definitions, which makes this the plugin's most complex part.
  - Confidence: MED — `before` gets the root, but walking a lazy tree for definitions hasn't been tried here yet.
  - Blind spot: Case/whitespace normalization of reference identifiers must match Sätteri's.
- **Fix B**: Allow `?…` in `noteLink`; fail the build on any `definition` whose URL is a relative `.md`, naming the file ("use an inline link or a wikilink").
  - Strength: Small and safe: nothing can leak, and the guard pattern already exists.
  - Tradeoff: Reference links to articles never work; a rare but legal markdown form fails the build.
  - Confidence: HIGH — one visitor plus a throw.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A (simplified: removing an unpublished definition is enough, since Sätteri renders a reference without one as its text; query strings dropped; 2 tests added)

### F2 — A wikilink inside link text produces nested `<a>`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/obsidian-links.ts:87
- **Detail**: Reproduced: `[x [[Other note]] y](https://e.com)` → `<a href="https://e.com">x <a href="/other-note">Other note</a> y</a>`. That is invalid HTML; browsers split the outer link. inline-tags.ts already skips link parents.
- **Fix**: When an ancestor is a `link`/`linkReference`, replace the wikilink with its label text only (no `<a>`).
- **Decision**: FIXED (inside link text a wikilink renders as its label; test added)

### F3 — Article index misses frontmatter that Astro accepts, so links to a published article become plain text

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/article-index.ts:11
- **Detail**: The index regex rejects a UTF-8 BOM, leading blank lines and `--- ` with a trailing space; Astro's (`@astrojs/internal-helpers/dist/frontmatter.js:11`) accepts them. The article publishes, but every wikilink to it silently renders as plain text. The reviewer verified this on the index side.
- **Fix**: Match Astro's frontmatter regex: optional BOM, leading whitespace lines, trailing spaces after the `---` fences.
- **Decision**: FIXED (index uses Astro's YAML frontmatter pattern; BOM and leading-blank-line tests added)

### F4 — Degenerate wikilinks show stray syntax, a folder name, or vanish

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/obsidian-links.ts:34-40
- **Detail**: `displayText` falls back to the raw target. `[[#^block]]` → `#^block`; `[[#]]` → `#`; `[[private/]]` → `private/`, a folder name (contradicts README "Folder paths are never shown"); `[[ ]]` → empty, so the text disappears. Readers see broken syntax, and the build passes.
- **Fix**: When the name and heading part are empty (no alias), throw `Wikilink "[[…]]" in content/articles/<note>.md has no note name`, the same message format as the guard.
- **Decision**: FIXED (a wikilink with no alias and no name or heading fails the build naming the file; README updated)

### F5 — Inline tags ignore escapes and the whitespace rule after formatting

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/inline-tags.ts:12
- **Detail**: Sätteri passes unescaped text, so `\#notatag` and `&#35;x` become tag spans and the author can't write a literal `#word` outside backticks. `^` matches at every text-node start, so `**x**#tag` and `[[Other note]]#tag` are tagged, though Obsidian requires whitespace before the `#`. The plan's contract says "start of a text node" literally, so the plan itself was imprecise.
- **Fix A ⭐ Recommended**: Enable `options: { position: true }` and check the source character before each `#`: it must be a line start or whitespace, and never `\`.
  - Strength: Matches Obsidian for both escapes and adjacency; one check covers both.
  - Tradeoff: Relies on position offsets, and smart punctuation and entities shift text against the source, so it needs care with the offset maths.
  - Confidence: MED — position data exists in Sätteri, but this plugin hasn't used it yet.
  - Blind spot: Entities (`&#35;`) have no `#` at that source offset; that needs its own test.
- **Fix B**: Accept and document: in content/README.md, say to write `` `#word` `` for a literal hash word.
  - Strength: No code; the cases are rare in prose.
  - Tradeoff: Leaves a mismatch with Obsidian.
  - Confidence: HIGH.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A (source positions: a line start or whitespace is required before `#`; `\#`, `&#35;`, `&#x23;` and `&num;` are not tags; README notes `\#word`)

### F6 — `[[x]]` in image alt text or a link title reaches the HTML

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/obsidian-guard.ts:13-15
- **Detail**: `![alt [[Other note]]](photo.png)` passes with alt `alt [[Other note]]`. This gap predates the change, but the new comment claims obsidian-links "renders every well-formed one".
- **Fix**: Also run the inline patterns over `image.alt` and `link.title` in the guard, and soften the comment.
- **Decision**: FIXED (guard also checks image alt/title and link titles; comment corrected; test added)

### F7 — Index includes dotfiles and crashes on a directory named `*.md`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/article-index.ts:16-18
- **Detail**: Astro's glob skips `.x.md`, but `readdirSync` returns it, so `[[.x]]` links to a 404. A directory `sub.md` throws `EISDIR` without naming a file.
- **Fix**: Use `readdirSync(dir, { withFileTypes: true })` and skip non-files and names starting with `.`.
- **Decision**: FIXED (index reads only regular, non-hidden .md files; test added)

### F8 — `slug: ""` gives a misleading "title has no letters" error

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/content.config.ts:15-19
- **Detail**: `articleId` returns `''` for an empty slug. `generateId` treats it as missing and throws the title error for a fine title. Before this change, `''` reached the schema, which failed on the slug regex. The plan said to keep the existing error paths.
- **Fix**: In `generateId`, return `id` when `data.slug != null` (even if empty) so the schema reports the bad slug.
- **Decision**: FIXED (an empty slug reaches the schema again; verified with a build: "slug: Invalid string")

### F9 — Escaped `\[[Other note]]` still becomes a link

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/markdown/obsidian-links.ts:87
- **Detail**: Escapes are gone by the time text reaches the plugin, so literal `[[x]]` is only possible in code. Nothing leaks (unpublished names stay plain text).
- **Fix**: One line in content/README.md: show `[[x]]` literally with backticks.
- **Decision**: FIXED (content/README.md: put `[[x]]` in backticks to show it as written)

### F10 — `articleId`/`generateId` parity tested only indirectly

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/slug.test.ts:9-40
- **Detail**: The plan asked for a parity test against `generateId`. Parity holds by construction (`generateId` calls `articleId`), but `generateId` can't be imported in Vitest (`astro:content`), so its own error paths are untested.
- **Fix**: Accept as is; parity is structural.
- **Decision**: ACCEPTED (parity is structural: generateId calls articleId; Vitest cannot import astro:content)

# Callouts, code and tables Implementation Plan

## Overview

Roadmap S-03: a visitor reads callouts, `==highlights==`, syntax-highlighted code blocks and
tables as Obsidian shows them, in both themes and on a phone, and `%%comments%%` are hidden.
The work adds in-repo Sätteri plugins (comments, highlights, callouts, a table wrapper), a
Flight deck Shiki theme pair, the matching `prose.css` rules, a tighter raw-syntax guard and
the author/design docs.

## Current State Analysis

Probed with `createSatteriMarkdownProcessor` on 2026-10-31:

- **Tables already parse.** Sätteri's GFM is on by default; alignment arrives as inline
  `style="text-align: …"` on `th`/`td`. There is no table CSS, and a wide table overflows the 65ch
  column (and the phone viewport).
- **Code is already highlighted** by Astro's default Shiki (`github-dark`): `<pre
  class="astro-code github-dark" style="background-color:#24292e;color:#e1e4e8; overflow-x:
  auto;" tabindex="0" data-language="ts">`. The inline background overrides `.prose pre`'s
  `bg-card`, and the colors ignore light mode. `design.md` → "Left for slices" leaves the code
  theme for both themes to S-03.
- **Callouts render as a blockquote with raw text** (`<blockquote><p>[!warning]- Title …`),
  **highlights as raw `==`**, **comments as raw `%%`**. `src/lib/markdown/obsidian-guard.ts`
  fails the build on all three today (`%%`, the `==x==` regex, and `[!type]` as a blockquote's
  first text), so no article can use them yet.
- **Split syntax crosses node boundaries.** `==hi **b**==` becomes `text("==hi ")`,
  `strong`, `text("==")`; a `%%` comment with a blank line inside spans several paragraphs. The
  existing plugins (`inline-tags.ts`, `obsidian-links.ts`) only rewrite one `text` node at a
  time, and the guard's highlight regex misses the split case (noted in the guard and the
  roadmap).
- Plugin wiring lives in `astro.config.mjs` (`mdastPlugins: [obsidianLinks, inlineTags,
  readingTime, obsidianGuard]`, `hastPlugins: [imageWidth]`); plugins are separate mdast passes in
  order, imported by relative path, tested by rendering through `createSatteriMarkdownProcessor`
  (`src/lib/markdown/*.test.ts`).
- Sätteri custom nodes: a parent node with `children` renders through `data.hName` (default
  `div`) and `data.hProperties` (`satteri/dist/types.d.ts`, `Custom`); `inline-tags.ts` already
  uses this. The mdast context offers `replaceNode`, `removeNode`, `wrapNode`, `insertBefore/After`,
  `parent`, `indexOf`, `textContent`, and `options: { position: true }` for source offsets.
- `content/articles/` is empty; `content/README.md` already warns that `%%comments%%` stay
  public in the repo.

## Desired End State

An article may use callouts (all Obsidian types and aliases, custom titles, foldable `+`/`-`,
nested, unknown types), `==highlights==` (including around inline formatting), fenced code with
a language, GFM tables and `%%comments%%` (inline, multi-line, across paragraphs). Each renders
in the Flight deck look in both themes and on a 375px phone without sideways page scroll.
Comments never reach the HTML or the reading time. Anything the site still can't render (an
unclosed `%%`, a highlight split across nesting levels) fails the build with the file and a
snippet. Verified by `npm test`, `npm run build`, and a scratch note checked in both themes on
desktop and a phone.

### Key Discoveries:

- Shiki config flows from `markdown.shikiConfig` in `astro.config.mjs` into Sätteri's
  `createHighlightFn(syntaxHighlight, shikiConfig)` (`@astrojs/markdown-satteri/dist/satteri-processor.js:150`),
  which passes `themes` and `defaultColor`; theme objects are accepted in place of names.
- `obsidian-guard.ts:31` (callout regex) is fully subsumed once callouts render every
  `[!type]`-opened blockquote; `%%` and the `==` regex stay useful as a backstop for image alt
  text and link titles, which no rendering plugin reads.
- `reading-time.ts` counts `text` nodes in `after`; comments must be gone before it runs.
- `obsidian-links.ts` throws on a missing embedded image; a comment holding `![[draft.png]]`
  must not reach it, so comments run first.
- Plugin test pattern: `src/lib/markdown/inline-tags.test.ts` (render with `syntaxHighlight:
  false`, compare exact HTML).

## What We're NOT Doing

- No per-type callout colors: one monochrome callout look; the type shows through its icon and
  title (design.md's one-accent rule).
- No copy button or language label on code blocks; no client JS in prose.
- No line numbers, line highlighting or `title="…"` rendering from code-fence meta (Obsidian
  shows none).
- No hiding to end of note for an unclosed `%%` (it fails the build instead).
- Diagrams (` ```mermaid `) and math stay S-04; a mermaid fence renders as a code block until then.
- No note embeds (still guarded), no Obsidian plugin syntaxes (Dataview, etc.).
- No change to the inline-code style beyond what the code theme needs.

## Implementation Approach

Follow the S-02 pattern: one small plugin per syntax in `src/lib/markdown/`, each with a header
comment stating the Obsidian rule it implements, tested by rendering exact HTML. Mdast order:
`comments` → `callouts` → `highlight` → `obsidianLinks` → `inlineTags` → `readingTime` →
`obsidianGuard`. Comments first so hidden content is never resolved, counted or guarded;
callouts before highlight and links so title text is still plain `text` nodes the later passes
treat like any other. Styling goes in `src/styles/prose.css` with theme tokens only. The code
theme is two hand-written Shiki theme objects keyed to the site palette, emitted as
`--shiki-light`/`--shiki-dark` CSS variables (`defaultColor: false`) and switched by `.dark`.

## Critical Implementation Details

**Comment ranges are source ranges.** Obsidian strips comments before parsing markdown, so a
comment can open in one paragraph and close in another, or open inside `**bold**`. Pair `%%`
delimiters found in `text` nodes in document order (code and inline code are separate node
types, so a `%%` in backticks is never a delimiter), then remove everything whose source
position lies inside each pair: trim the text nodes that hold a delimiter, remove whole nodes in
between, and drop containers (paragraph, list item, blockquote) left empty. This needs
`options: { position: true }`. Nodes inside a comment are removed even when they hold code.

**Highlights pair among siblings only.** `==` delimiters pair within one phrasing parent's
children (paragraph, heading, table cell, emphasis, link text, …); the content between them,
whatever node types, becomes a `mark` node. Obsidian's rule for a valid pair (non-space right
after the opener and right before the closer, as in the guard's existing regex) decides which
`==` are delimiters; an unmatched `==` stays text (`a == b`). A highlight crossing nesting levels
(`**==a** b==`) can't be paired among siblings: the guard catches it by matching the highlight
regex against `ctx.textContent()` of each phrasing parent that has no `mark` covering it.

**Shiki background.** With `defaultColor: false`, Shiki emits only CSS variables, so the `pre`
keeps `.prose pre`'s `bg-card`; token colors must reach ≥4.5:1 against `--card` in their theme,
which is the test in Phase 3.

## Phase 1: Comments and highlights

### Overview

Hide `%%comments%%` everywhere Obsidian hides them and render `==highlights==` as `<mark>`,
including the split cases, with the guard catching what can't render.

### Changes Required:

#### 1. Comments plugin

**File**: `src/lib/markdown/comments.ts` (new), `src/lib/markdown/comments.test.ts` (new)

**Intent**: Remove Obsidian comments from the tree before any other plugin sees them, so their
text, links and embeds never reach the page, the reading time or the link resolver. An opening
`%%` with no closer fails the build with the file and a snippet (same message shape as the
guard's `fail`).

**Contract**: `export const comments` (mdast plugin, `name: 'comments'`, `options: { position:
true }`). Behaviour per the Critical Implementation Details. Tests cover: inline
`a %%b%% c` → `a  c` collapsing to one paragraph; `%%` around `**bold**` and a link; a block
comment on its own lines; a comment spanning a blank line (two paragraphs removed); a comment
inside a list item, table cell and blockquote; a whole paragraph comment leaving no empty `<p>`;
`%%` in inline code and a fenced block stays as written; a wikilink to a missing note and an
embed of a missing image inside a comment don't fail; an unclosed `%%` throws naming the file;
reading time excludes comment words.

#### 2. Highlight plugin

**File**: `src/lib/markdown/highlight.ts` (new), `src/lib/markdown/highlight.test.ts` (new)

**Intent**: Render `==text==` as `<mark>`, as Obsidian does, including a highlight wrapping
inline formatting, code or links.

**Contract**: `export const highlight` (mdast plugin, `name: 'highlight'`); emits a custom
parent node `{ type: 'highlight', data: { hName: 'mark' }, children }`. Tests: `==a==`;
`==**bold**==` and `==a *b* c==`; `==see `x`==`; `==[[Published]]==` still becomes a link
(run with obsidianLinks after it); two highlights in one paragraph; highlight in a heading and a
table cell; `a == b` and `x ==` stay text; `==` in inline code stays.

#### 3. Guard

**File**: `src/lib/markdown/obsidian-guard.ts`, a guard test file
(`src/lib/markdown/obsidian-guard.test.ts`, new)

**Intent**: Keep `%%` and the `==` regex as backstops (alt text, link titles, anything left
unrendered) with comments updated to say S-03 renders them; add the phrasing-parent check for a
highlight split across nesting levels; leave the callout regex until Phase 2.

> **Deviation (impl review)**: the guard tests live in a `describe('guard')` block in
> `src/lib/markdown/highlight.test.ts`, beside the highlight pipeline they need; no
> `obsidian-guard.test.ts` was created. The split check also covers callout titles (custom
> `calloutTitleInner` nodes), tested in `callouts.test.ts`.

**Contract**: header comment updated; new check fails on `**==a** b==` and passes on
`==**a**==` after the highlight plugin ran. Tests for both, plus `![a ==b==](x.png)` still
failing.

#### 4. Wiring and style

**File**: `astro.config.mjs`, `src/styles/prose.css`

**Intent**: Register `comments` first and `highlight` before `obsidianLinks`; update the
pipeline comment. Style `mark` in the theme: accent at low alpha behind foreground text,
no padding change to line height.

**Contract**: `mdastPlugins: [comments, highlight, obsidianLinks, inlineTags, readingTime,
obsidianGuard]`; `.prose mark` uses `--primary` tint and `text-foreground` (body-text contrast
stays ≥ 4.5:1 on the tint in both themes).

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Build passes: `npm run build`
- A scratch article with an unclosed `%%` fails `npm run build` naming the file

#### Manual Verification:

- Scratch note with inline, block and multi-paragraph comments shows none of the comment text on
  the dev server
- Highlights, including `==**bold**==`, read clearly in light and dark themes

**Implementation Note**: After completing this phase and all automated verification passes,
pause here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Phase 2: Callouts

### Overview

Render Obsidian callouts in a monochrome Flight deck look, foldable ones as `<details>`.

### Changes Required:

#### 1. Callouts plugin

**File**: `src/lib/markdown/callouts.ts` (new), `src/lib/markdown/callouts.test.ts` (new)

**Intent**: Turn a blockquote whose first paragraph opens with `[!type]` into Obsidian-shaped
callout markup: type lowercased into `data-callout`, optional `+`/`-` fold marker, title = rest
of the first line (inline formatting kept), else the type in title case, as Obsidian does
(`[!faq]` → "Faq", `[!WARNING]` → "Warning"). The rest of the first paragraph and following
blocks become the content. Unknown types render the same way (CSS falls back to the note icon).
Nested callouts work because every blockquote is visited.

**Contract**: `export const callouts` (mdast plugin, `name: 'callouts'`), run after `comments`,
before `highlight`. Markup (custom parent nodes with `hName`/`hProperties`):
- static: `<div class="callout" data-callout="warning"><div class="callout-title"><span
  class="callout-icon" aria-hidden="true"></span><span class="callout-title-inner">…</span></div><div
  class="callout-content">…</div></div>`
- foldable: same classes on `<details class="callout" data-callout="…" [open]>` with
  `<summary class="callout-title">`; `+` → `open`, `-` → closed.
- no `callout-content` when there's no body.

Type regex matches the guard's (`^\[![^\]\s]+\]`). Tests: each fold state; custom title with
`*em*` and a wikilink; default title; title-only callout; multi-paragraph body with a list and a
code block; nested callout; unknown type `[!recipe]`; a plain blockquote untouched; `[!note]`
not at the start stays text (and the guard's other checks still apply).

#### 2. Callout style and icons

**File**: `src/styles/prose.css`

**Intent**: One look for every type: hairline border, `--card` background, title row in Iosevka
with a muted icon; body in the normal prose rhythm. Icons are lucide SVGs (ISC, attribution
comment) applied as a CSS `mask` on `.callout-icon` with `background-color: currentColor`, one
per Obsidian type family and its aliases (note; abstract/summary/tldr; info; todo;
tip/hint/important; success/check/done; question/help/faq; warning/caution/attention;
failure/fail/missing; danger/error; bug; example; quote/cite), note's icon as the default.
Foldable summary shows a fold chevron, a visible focus ring (`--ring`), and no default marker.

**Contract**: `.prose .callout`, `.callout-title`, `.callout-icon`, `.callout-content`,
`[data-callout="…"]` selectors; works inside the existing `.prose > * + *` spacing; reduced
motion respected if the chevron animates.

#### 3. Guard and wiring

**File**: `src/lib/markdown/obsidian-guard.ts`, `astro.config.mjs`

**Intent**: Remove the callout regex and its blockquote check (every `[!type]`-opened blockquote
now renders); register `callouts`.

**Contract**: `mdastPlugins: [comments, callouts, highlight, obsidianLinks, inlineTags,
readingTime, obsidianGuard]`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Build passes: `npm run build`

#### Manual Verification:

- Scratch note with each callout family, a foldable `-`/`+`, a nested and an unknown type looks
  right in light and dark themes, desktop and phone
- A folded callout opens and closes with mouse and keyboard, with a visible focus ring

**Implementation Note**: After completing this phase and all automated verification passes,
pause here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Phase 3: Code, tables and docs

### Overview

Theme highlighted code to the site in both themes, make tables readable and scrollable on a
phone, and record the new syntax and looks in the docs.

### Changes Required:

#### 1. Flight deck Shiki themes

**File**: `src/lib/markdown/shiki/flight-deck-light.ts`, `src/lib/markdown/shiki/flight-deck-dark.ts`
(new), `astro.config.mjs`

**Intent**: Two small Shiki theme objects built on the palette: foreground default, muted for
comments and punctuation, the theme accent for keywords, and one or two extra hues for strings
and constants, all hex. Configure `markdown.shikiConfig: { themes: { light, dark },
defaultColor: false }` so blocks carry only CSS variables.

**Contract**: each module default-exports a Shiki `ThemeRegistration` (`name`, `type`,
`colors`, `tokenColors`). Relative imports only (no `@/`).

> **Deviation (impl review)**: one module, `src/lib/markdown/shiki/flight-deck.ts`, builds both
> themes from a shared `theme()` factory and exports them by name (`flightDeckLight`,
> `flightDeckDark`), typed from Astro's `ShikiConfig['themes']`; same fields as planned.

#### 2. Code CSS

**File**: `src/styles/prose.css`

**Intent**: `.prose pre.astro-code` keeps `bg-card` and the border; token spans read
`var(--shiki-light)` and, under `.dark`, `var(--shiki-dark)`; keep horizontal scroll and the
existing focus behaviour (`tabindex="0"` from Shiki gets the `--ring` focus style).

**Contract**: selectors on `.astro-code` and its `span` descendants; inline code unchanged.

#### 3. Contrast test

**File**: `src/lib/markdown/shiki/contrast.test.ts` (new)

**Intent**: Fail if any token color in either theme drops below 4.5:1 against that theme's
`--card`, so later theme tweaks can't regress readability.

**Contract**: reads every `foreground` in each theme; `--card` values as in `global.css`
(oklch → sRGB converted in the test, or hard-coded hex with a comment pointing at `global.css`).
Also asserts an unknown fence language renders as plain text without throwing (render through
`createSatteriMarkdownProcessor` with the themes).

#### 4. Table scroll wrapper

**File**: `src/lib/markdown/table-scroll.ts` (new), `src/lib/markdown/table-scroll.test.ts`
(new), `astro.config.mjs`

**Intent**: Wrap every `table` in a horizontally scrollable, keyboard-focusable region so a
wide table scrolls by itself and the page never scrolls sideways; the table keeps its semantics.

**Contract**: hast plugin `name: 'table-scroll'`; output `<div class="table-scroll"
tabindex="0" role="region" aria-label="Table"><table>…</table></div>`;
`hastPlugins: [imageWidth, tableScroll]`. Tests: wrapper present; alignment styles kept; a
`\|`-escaped wikilink alias in a cell (`[[Note\|alias]]`) resolves as a link.

#### 5. Table CSS

**File**: `src/styles/prose.css`

**Intent**: Hairline rows in `--border`, header row in Iosevka at medium weight, body in Aile,
comfortable cell padding, numbers and code not wrapped mid-token; the wrapper gets the `--ring`
focus style and no visible frame of its own.

**Contract**: `.prose .table-scroll`, `.prose table`, `th`, `td` rules; inline alignment from
GFM still wins.

#### 6. Docs

**File**: `content/README.md`, `context/foundation/design.md`, `AGENTS.md`

**Intent**: Author how-to: callouts (types, fold, title), `==highlight==`, `%%comments%%`
(hidden on the page, public in the repo, unclosed fails), code fences with a language, tables;
add the new build failures (unclosed `%%`, highlight split across formatting levels). Design:
strike the S-03 line in "Left for slices" and describe the callout, highlight, code-theme (with
token colors and contrast) and table looks. AGENTS.md: list the new plugins in the
`src/lib/markdown/` entry.

**Contract**: sections "Links and tags" → extend or add "Formatting"; "When the build fails"
list; design.md "Left for slices" + a new subsection under Layouts → Article.

### Success Criteria:

#### Automated Verification:

- Unit tests pass, including the contrast test: `npm test`
- Build passes: `npm run build`
- Built HTML for the scratch note has no `github-dark` class or inline `background-color` on
  `pre`

#### Manual Verification:

- Code blocks (ts, bash, json, an unknown language) read well in both themes and match the site
- A wide table scrolls inside its region on a 375px phone; the page doesn't scroll sideways; the
  region is reachable and visibly focused with Tab
- `content/README.md` reads correctly as the author's how-to

**Implementation Note**: After completing this phase and all automated verification passes,
pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- One test file per plugin, rendering exact HTML through `createSatteriMarkdownProcessor`
  (`syntaxHighlight: false` except the code tests), with the plugins it interacts with in
  pipeline order.
- Edge cases decided in planning: unclosed `%%` fails; `**==a** b==` fails; unknown callout type
  renders as note; foldable `-`/`+`; comments hide wikilinks/embeds without resolving them;
  reading time excludes comments; token contrast ≥ 4.5:1.

### Integration Tests:

- `npm run build` with a scratch article using every syntax (removed before commit;
  `content/articles/` stays as the author left it).

### Manual Testing Steps:

1. Add a scratch note using every S-03 syntax to `content/articles/`, run
   `npm run dev -- --background`.
2. Check it in light and dark (system setting), at desktop width and on a phone (`npm run devt`).
3. Tab through: folded callouts, code blocks and table regions show focus and work with keyboard.
4. Remove the scratch note before committing.

## Performance Considerations

All rendering happens at build time; the only page cost is CSS (callout icon masks, a few KB)
and Shiki's per-token CSS variables. No client JS is added.

## Migration Notes

None: no article uses these syntaxes yet (the guard forbade them).

## References

- Roadmap item: `context/foundation/roadmap.md` → S-03
- Prior slice: `context/archive/2026-10-30-wikilinks-and-tags/plan.md`
- Plugin pattern: `src/lib/markdown/inline-tags.ts`, `src/lib/markdown/obsidian-links.ts`
- Guard: `src/lib/markdown/obsidian-guard.ts`
- Design tokens: `context/foundation/design.md`, `src/styles/global.css`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Comments and highlights

#### Automated

- [x] 1.1 Unit tests pass: `npm test` — def68d1
- [x] 1.2 Build passes: `npm run build` — def68d1
- [x] 1.3 A scratch article with an unclosed `%%` fails `npm run build` naming the file — def68d1

#### Manual

- [x] 1.4 Scratch note with inline, block and multi-paragraph comments shows none of the comment text on the dev server — def68d1
- [x] 1.5 Highlights, including `==**bold**==`, read clearly in light and dark themes — def68d1

### Phase 2: Callouts

#### Automated

- [x] 2.1 Unit tests pass: `npm test` — 1964fb7
- [x] 2.2 Build passes: `npm run build` — 1964fb7

#### Manual

- [x] 2.3 Scratch note with each callout family, a foldable `-`/`+`, a nested and an unknown type looks right in light and dark themes, desktop and phone — 1964fb7
- [x] 2.4 A folded callout opens and closes with mouse and keyboard, with a visible focus ring — 1964fb7

### Phase 3: Code, tables and docs

#### Automated

- [x] 3.1 Unit tests pass, including the contrast test: `npm test` — 8edf5b9
- [x] 3.2 Build passes: `npm run build` — 8edf5b9
- [x] 3.3 Built HTML for the scratch note has no `github-dark` class or inline `background-color` on `pre` — 8edf5b9

#### Manual

- [x] 3.4 Code blocks (ts, bash, json, an unknown language) read well in both themes and match the site — 8edf5b9
- [x] 3.5 A wide table scrolls inside its region on a 375px phone; the page doesn't scroll sideways; the region is reachable and visibly focused with Tab — 8edf5b9
- [x] 3.6 `content/README.md` reads correctly as the author's how-to — 8edf5b9

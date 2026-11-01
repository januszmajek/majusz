# Diagrams and Math Implementation Plan

## Overview

Roadmap slice S-04: a visitor reads diagrams and math as Obsidian 1.15 shows them, and the article
still reads on a phone in under 2 seconds (PRD FR-009, NFR `prd.md:185`). Everything renders at
build time with no client JS:

- math becomes MathML (Temml) under Obsidian's own `$` rules, set in Latin Modern Math cut down at
  build time to the glyphs the articles use;
- ```` ```mermaid ```` fences become inline SVG (Pele, the renderer Obsidian 1.15 uses), themed by
  the site's tokens, with internal links resolved like wikilinks.

Source the site can't show faithfully fails the build, in the same way as an unclosed `%%`.

## Current State Analysis

- `astro.config.mjs:61` calls `satteri()` with no `features`, so `features.math` is off.
  - `$x$` and `$$…$$` reach readers as raw text, and TeX escapes get mangled (`\,` → `,`).
  - `obsidian-guard.ts` has no `$` pattern. This breaks the hard rule today, though
    `content/articles/` is empty, so no reader has seen it.
- A ```` ```mermaid ```` fence renders as a Shiki code block, as S-03 left it.
- With `features.math` on, Sätteri parses more loosely than Obsidian (probed on the installed
  satteri 0.10.5, with `position: true`):

  | Source | Sätteri node (source slice) | Obsidian reading view |
  |---|---|---|
  | `a $x$ b` | `inlineMath` (`$x$`) | inline math |
  | `$5 and $6 c` | `inlineMath` (`$5 and $`) + text `6 c` | text |
  | `Para $$x$$ mid` | `inlineMath` (`$$x$$`) | text |
  | `$$x$$` as a whole paragraph | `inlineMath` (`$$x$$`) | display math |
  | `$$⏎\int x⏎$$` | `math` (slice ends with `$$`) | display math |
  | `$$⏎unclosed⏎⏎more para` | `math`, swallowing the rest of the document | (broken) |
  | `> $$⏎> y⏎> $$` | `math` (slice `$$⏎> y⏎> $$`) | display math |

- Replacing an mdast node with `{ type: 'html', value }` passes raw HTML through (probed).
- User hast plugins run after Shiki (`satteri-processor.js:198-207`). So the mermaid fence has to
  be caught in mdast, before highlighting.
- `math` is Shiki's default excluded language.
- `reading-time.ts` counts `text` nodes only, so rendered math and diagrams add no words.
- No `context/foundation/lessons.md` exists.

## Desired End State

An article can hold the following, and each renders as described:

- **Inline `$…$`** renders as MathML in the text flow.
- **Display math** (a `$$` block, or a paragraph that is only `$$…$$`) renders as a block that
  scrolls sideways in its own region when it's wider than a phone.
- **A mermaid fence** renders as an SVG diagram:
  - in the site's colours in both themes, set in Iosevka;
  - at its natural width, scrolling sideways in its own region;
  - with `internal-link` nodes going to published articles, and as plain text for unpublished
    notes.

The build fails, naming the file, on:

- an unclosed `$$`;
- invalid TeX;
- invalid mermaid;
- a `$` the site would pair differently from Obsidian after rejecting a whitespace-padded `$…$`.

The production build writes `dist/fonts/latin-modern-math.woff2` holding only the glyphs the
built pages use, about 8–20 KB, with its MATH table. The CSS references it as
`/fonts/latin-modern-math.woff2?v=<hash>`. The dev server serves the full font at the same path.

Verify with `npm test`, then `npm run build` on a scratch article that uses every case, then
the manual checks in light and dark, on desktop and on a phone.

### Key Discoveries:

- `features: { math: true }` merges over Sätteri's gfm and smartypants defaults
  (`satteri-processor.js:187,210-215`). `inlineMath` and `math` are mdast node types
  (`satteri/dist/types.d.ts:12-17`).
- The source-position pattern to follow: `comments.ts:117-121` (`options: { position: true }`,
  `ctx.source`, a `fail()` that shows a source snippet).
- The link resolution to reuse: `resolveNoteLink` and `loadArticleIndex` in
  `src/lib/markdown/article-index.ts`, behind a factory as in `createObsidianLinks`
  (`obsidian-links.ts`), so tests inject an index.
- The scroll-region pattern to copy: `table-scroll.ts` (focusable, `role="region"`, named), styled
  as `.prose .table-scroll` in `prose.css`.
- The contrast-test pattern: `src/lib/markdown/shiki/contrast.test.ts`. It reads oklch tokens
  from `global.css` and computes WCAG contrast.
- Temml 0.14.0 facts:
  - `renderToString(tex, { displayMode, throwOnError: true })` throws `ParseError`.
  - `\ce`, `\dv` and `\abs` work in core, with no contrib import.
  - `align` throws outside display mode.
  - It emits explicit Unicode for `\mathbb` / `\mathbf` (`ℝ`, `𝐯`). A bare `<mi>x</mi>` is drawn
    by the browser from the math-italic code point (U+1D465), so the font subset needs those
    code points.
- Temml's `Temml.woff2` (9 KB) holds only `\mathscr` script capitals. Latin Modern Math isn't on
  npm; it comes from GUST (GUST Font License).
- `subset-font` (already a devDependency) keeps the MATH table when subsetting a math font
  (verified with STIX Two Math and Noto Sans Math: 8 KB for a typical page's glyphs, 19 KB for a
  broad set).
- Pele 1.13.0 facts:
  - `render(src, { idPrefix, fontFamily, measurer, … })` is sync and returns `{ svg }`. It throws
    `PeleError` with a line-pointing message.
  - `idPrefix` prefixes the `accTitle`/`accDescr` ids; without a prefix they're the fixed
    `pele-title` / `pele-desc`.
  - `class X internal-link` wraps the label in
    `<a class="internal-link" href="<label>" data-href="<label>" rel="noopener">`.
  - The root `<svg>` carries `--_bg:var(--pele-bg,#fff)` and siblings for `fg`, `muted`, `line`,
    `surface`, `surface-alt`, `border`, `accent`, `radius`, `font` and `font-mono`, with an
    inline `max-width:100%`.

## What We're NOT Doing

- No client-side Mermaid or MathJax, no zoom or pan on diagrams (Obsidian's needs JS), and no
  diagram types beyond what Pele renders.
- No math inside diagram labels (Pele's `math` option).
- No `Temml.woff2` roundhand font: `\mathscr` renders in Latin Modern Math's script, like
  `\mathcal`.
- No red in-place error rendering, as Obsidian does: invalid TeX or mermaid fails the build.
- No re-pairing of `$` the way Obsidian might. A leftover `$` that would pair fails the build and
  the author escapes it (`\$`).
- No math in image alt text or link titles. Obsidian doesn't render it there either, so it stays
  as written.
- No note embeds; obsidian-guard still fails on them.
- No TeX `\href` / `\url` (Temml `trust: false`). They fail the build as invalid TeX.
- No change to the Iosevka subsets or to `scripts/subset-fonts.mjs`.

## Implementation Approach

This follows the S-02/S-03 pattern: one small mdast plugin per syntax in `src/lib/markdown/`, each
with a header comment stating the Obsidian rule it implements, wired by relative import in
`astro.config.mjs`, with no `@/` imports. Each is tested by rendering exact HTML through
`createSatteriMarkdownProcessor`.

Both new plugins emit raw `html` nodes from mdast:

- for math, this lets the `$` rule check and the rendering share one plugin;
- for diagrams, it keeps the fence away from Shiki.

The mdast order becomes `comments → callouts → highlight → obsidianLinks → inlineTags → math →
diagrams → readingTime → obsidianGuard`. Comments run first, so a commented-out formula or
diagram never renders or fails.

The math font is an Astro integration (`src/integrations/math-font.ts`) with two hooks:

- in dev, a middleware serves the vendored full font;
- after the build, it scans `dist/**/*.html` for `<math>` content, subsets the vendored font to
  those glyphs, writes `dist/fonts/latin-modern-math.woff2`, and adds a content-hash `?v=` to the
  font URL in the built CSS.

It runs inside `npm run build`, so publishing is still only adding a `.md` file.

## Critical Implementation Details

**Rejecting math needs the source, not the node value.** Sätteri trims the inner whitespace
(`$5 and $` has the value `5 and `), so the Obsidian rule has to be checked against
`ctx.source.slice(start, end)`. Rules:

- No whitespace right after the opening `$` or right before the closing `$`.
- `$$…$$` counts as display only when it is the paragraph's only non-whitespace content.
- A rejected node is replaced by a `text` node holding its source slice.

When a paragraph had a rejection, run Obsidian's single-`$` pairing over that paragraph's source.
Skip `\$`, `$$` and code spans. If it finds a pair that the site doesn't render, fail the build
with a snippet and suggest `\$`.

**An unclosed `$$` is detected from the `math` node's source slice.** Its last line, with the
blockquote or list prefixes (`>`, indentation) removed, isn't a closing `$$` fence.

**The font URL must survive Vite.**
- `prose.css` declares `@font-face { font-family: "Latin Modern Math"; src:
  url("/fonts/latin-modern-math.woff2") format("woff2"); font-display: swap; }`.
- The path doesn't exist in `public/`, so Vite leaves the absolute URL unchanged and may warn at
  build. That's expected; don't add the file to `public/`, or the full font ships.
- `astro:build:done` then rewrites that exact URL string in `dist/_astro/*.css`.
- If no built page contains `<math>`, write no font and leave the CSS alone. The URL is never
  fetched without a `<math>` element.

**Italic mapping in the glyph collector.**
- A `<mi>` holding a single Latin or Greek letter without `mathvariant="normal"` is drawn from the
  Mathematical Italic block: Latin `a`–`z` / `A`–`Z` → U+1D44E / U+1D434, with the hole at `h` →
  U+210E; Greek → U+1D6FC / U+1D6E2.
- Collect both the plain and the italic code point. The MATH table keeps stretchy variants
  through hb-subset's glyph closure.
- The integration checks that the subset still holds a `MATH` table and throws if it doesn't.

## Phase 1: Math rendering

### Overview

Turn on Sätteri's math parser and add `src/lib/markdown/math.ts`. It enforces Obsidian's `$`
rules, renders with Temml, wraps display math in a scroll region, and fails the build on source
it can't show faithfully. The font comes in Phase 2; until then math falls back to the system
`math` font.

### Changes Required:

#### 1. Dependency

**File**: `package.json`

**Intent**: Add Temml as a runtime dependency, pinned exactly, since it's used at build time by
the markdown pipeline like `yaml` and `github-slugger`.

**Contract**: `"temml": "0.14.0"` (exact, no caret).

#### 2. Math plugin

**File**: `src/lib/markdown/math.ts`

**Intent**: Render `inlineMath` and `math` nodes as Obsidian's reading view does, and fail the
build instead of showing broken math.

**Contract**:
- Exports `math` (an `MdastPlugin`, `options: { position: true }`) with `inlineMath` and `math`
  visitors that replace nodes through `ctx.replaceNode`.
- Inline: `<math>` from `temml.renderToString(value, { throwOnError: true })`, as an `html` node.
- Display (a `math` node, or a whole-paragraph `$$x$$` replacing its paragraph): Temml with
  `displayMode: true`, wrapped as
  `<div class="math-display" tabindex="0" role="region" aria-label="Formula">…</div>`.
- Rejected per the Critical details: becomes a `text` node of the source slice.
- Failures throw an `Error` naming `content/articles/<file>` with a snippet, as `comments.ts`
  does:
  - unclosed `$$` → `Raw Obsidian syntax in <file>: "<snippet>"`;
  - Temml `ParseError` → `Invalid math in <file>: "<tex>": <temml message>`;
  - ambiguous `$` → `Raw Obsidian syntax in <file>: "<snippet>"`, telling the author to write
    `\$`.
- The header comment states the Obsidian rules and the failure cases.

#### 3. Tests

**File**: `src/lib/markdown/math.test.ts`

**Intent**: Pin each rule with exact-ish HTML. Assert structure such as `<math`, the wrapper and
the text, not Temml's full markup, so a Temml patch release doesn't break tests.

**Contract**: The processor is built with `features: { math: true }`, `mdastPlugins: [math]` and
`syntaxHighlight: false`. Cases:
- `a $x$ b` → inline `<math>`.
- `$5 and $6 money` → plain text `$5 and $6 money`.
- `$ x $` → text.
- `Para $$x$$ mid` → text `Para $$x$$ mid`.
- `$$x$$` alone, and `- $$x$$` alone in a list item → display wrapper.
- A `$$` block, including inside a blockquote and a callout → display wrapper.
- Unclosed `$$` → throws, naming the snippet.
- `$\frac{1}$` → throws `Invalid math`.
- `$$⏎\begin{align}a&=b\\c&=d\end{align}⏎$$` → renders.
- `$\ce{H2O}$`, `$\dv{f}{x}$` and `$\abs{x}$` → render.
- `$5 and $6 money$` → throws (ambiguous `$`).
- `\$5 and \$6 money\$` → text, no throw.
- `` `$x$` `` → inline code.
- Reading time ignores the formula's words. This is covered by the existing node-type rule, so
  one assertion is enough.

#### 4. Wiring

**File**: `astro.config.mjs`

**Intent**: Turn on the parser and add the plugin after `inlineTags`, before `readingTime`.
Update the plugin-order comment.

**Contract**: `satteri({ features: { math: true }, mdastPlugins: [comments, callouts, highlight,
obsidianLinks, inlineTags, math, readingTime, obsidianGuard], hastPlugins: [...] })`.

#### 5. Styles

**File**: `src/styles/prose.css`

**Intent**: Give math Temml's base MathML rules and a display block that scrolls sideways like
tables, and inherits text colour in both themes.

**Contract**:
- Temml's `math` reset rules: font-style, line-height, `font-feature-settings: "dtls" off`,
  `math.tml-display { display: block; }`. They're taken from `Temml-Latin-Modern.css`, without
  its `@font-face` rules.
- `.prose math { font-family: "Latin Modern Math", math; }`.
- `.prose .math-display`: `overflow-x-auto`, vertical rhythm as for `pre`, centred formula, and a
  focus ring as for `.table-scroll`.

#### 6. Author docs

**File**: `content/README.md`

**Intent**: Tell the author how math works here and what fails the build.

**Contract**:
- "Formatting" gets a **Math** bullet: `$x$` inline with no spaces inside the `$`; `$$` on its
  own lines for display; `\$` for a dollar sign; `\ce`, `\dv` work.
- "When the build fails" adds: an unclosed `$$`, invalid TeX, and a `$` that Obsidian would read
  as math after a rejected one (escape it as `\$`).

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Build passes: `npm run build`
- A scratch article with an unclosed `$$` fails `npm run build`, naming the file
- A scratch article with `$\frac{1}$` fails `npm run build` with `Invalid math`

#### Manual Verification:

- Scratch article: inline and display math (fraction, sum, integral, matrix, `align`, `\ce`)
  render as formulas in light and dark themes, with nothing raw on the page
- `$5 and $6` and mid-paragraph `$$x$$` show as text, matching Obsidian 1.15 on the same note
- A long `align` block scrolls sideways on a phone (`npm run devt`) without the page scrolling;
  the region takes keyboard focus

**Implementation Note**: After completing this phase and all automated verification passes, pause
here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Phase 2: Math font

### Overview

Self-host Latin Modern Math, cut at build time to the glyphs the built pages use, behind a
versioned URL. In dev, serve the full font.

### Changes Required:

#### 1. Vendored font

**File**: `src/assets/fonts/math/latinmodern-math.woff2` and
`src/assets/fonts/math/GUST-FONT-LICENSE.txt`

**Intent**: Commit the source font once, converted from GUST's `latinmodern-math.otf` to woff2
(full glyph set, MATH table kept), with its license. It's only ever served whole by the dev server
and subset by the build.

**Contract**:
- The woff2 holds a `MATH` table.
- `src/assets/fonts/LICENSE.md`, or a README line beside the font, records where it came from and
  how it was converted.
- Nothing imports it through Vite, so it never lands in `dist/` whole.

#### 2. Glyph collector and integration

**File**: `src/integrations/math-font.ts`

**Intent**: An Astro integration that keeps the math font tiny, with no publish step.

**Contract**:
- Exports `collectMathGlyphs(html: string): string`, which returns the unique characters inside
  `<math>…</math>`: entities decoded, tags stripped, plus the italic mapping from Critical
  details.
- Exports `mathFont(): AstroIntegration` with two hooks:
  - `astro:server:setup` serves the vendored file at `/fonts/latin-modern-math.woff2` with
    `Content-Type: font/woff2`.
  - `astro:build:done` reads every `dist/**/*.html` and collects glyphs. If there are none, it
    stops. Otherwise it subsets with `subset-font` (`targetFormat: 'woff2'`), throws if the
    subset lacks a `MATH` table, writes `dist/fonts/latin-modern-math.woff2`, and replaces
    `/fonts/latin-modern-math.woff2` with `/fonts/latin-modern-math.woff2?v=<first 8 hex of
    sha256>` in `dist/_astro/*.css`.
- It throws if no CSS file held the URL, so a renamed path can't silently ship an unversioned
  font.
- Imported by relative path from `astro.config.mjs`, with no `@/` imports.

**File**: `package.json`

**Intent**: The integration uses `subset-font` during `npm run build`. CI runs `npm ci`, which
installs devDependencies, so it can stay in `devDependencies`. Check that, and move it only if the
build fails without it.

**Contract**: No change unless the check fails.

#### 3. Tests

**File**: `src/integrations/math-font.test.ts`

**Intent**: Pin glyph collection, including the italic mapping, and the subset's MATH table.

**Contract**:
- `collectMathGlyphs` on Temml output for `x + \mathbb{R} + h + \alpha`: includes `+`, `ℝ`, `x`,
  U+1D465, U+210E and U+1D6FC; excludes text outside `<math>`.
- `<mi mathvariant="normal">x</mi>` adds no italic code point.
- Entities such as `&lt;` decode.
- Subsetting the vendored font to a small sample gives a woff2 under 30 KB that still has a MATH
  table.

#### 4. Wiring and styles

**File**: `astro.config.mjs`, `src/styles/prose.css`

**Intent**: Register the integration, and declare the `@font-face` the integration versions.

**Contract**:
- `integrations: [react(), mathFont()]`.
- `@font-face { font-family: "Latin Modern Math"; src: url("/fonts/latin-modern-math.woff2")
  format("woff2"); font-display: swap; }`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Build passes: `npm run build`
- With a scratch math article, `dist/fonts/latin-modern-math.woff2` exists and is under 30 KB, and
  `grep -r "latin-modern-math.woff2?v=" dist/_astro/*.css` matches
- With no math in any article, the build writes no `dist/fonts/latin-modern-math.woff2`

#### Manual Verification:

- On the production build (`npm run preview`), formulas render in Latin Modern Math and the
  network panel shows only the small versioned font
- On a real Android phone and an iPhone, integrals, sums, stretchy brackets and Greek render in
  Latin Modern Math, with no missing glyph boxes
- In dev, the same formulas render in the full font

**Implementation Note**: After completing this phase and all automated verification passes, pause
here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Phase 3: Diagrams and docs

### Overview

Render mermaid fences with Pele at build time:
- themed by site tokens and set in Iosevka;
- at natural width in a scroll region, with an accessible name;
- with internal links resolved like wikilinks.

Then record the slice in design.md, AGENTS.md and the author's README.

### Changes Required:

#### 1. Dependency

**File**: `package.json`

**Intent**: Add Pele, pinned exactly: it was published on 2026-10-31 and is early access.

**Contract**: `"pele": "1.13.0"` (exact).

#### 2. Diagrams plugin

**File**: `src/lib/markdown/diagrams.ts`

**Intent**: Turn each ```` ```mermaid ```` code node into a themed, accessible inline SVG before
Shiki sees it. Obsidian's internal links follow the wikilink rule: published → its URL;
unpublished → plain text, with no private note name in any attribute.

**Contract**:
- Exports `createDiagrams({ loadIndex })` and `diagrams` (wired with
  `loadArticleIndex(content/articles/)`), as in `obsidian-links.ts`.
- The `code` visitor acts when `node.lang === 'mermaid'`.
- `render(value, { idPrefix: \`diagram-${n}-\`, fontFamily: <Iosevka stack>, measurer:
  <monospace 0.5em per character> })`. `n` counts per document in `ctx.data`.
- The SVG keeps its natural width: drop Pele's inline `max-width:100%`, through an option if Pele
  has one, else by rewriting the string.
- Every `<a class="internal-link" … data-href="X">…</a>` is processed as follows:
  - X is entity-decoded, then `resolveNoteLink(X, index)` is called;
  - a published note gets `<a class="internal-link" href="/slug#heading">…</a>`, with
    `data-href` removed;
  - an unpublished note has the `<a>` unwrapped and its inner content kept.
- With no `aria-labelledby` (no `accTitle`), the root `<svg>` gets `role="img"` and
  `aria-label="<Type> diagram"`, the type taken from Pele's `pele-<type>` class.
- Output: an `html` node,
  `<div class="diagram" tabindex="0" role="region" aria-label="Diagram">…svg…</div>`.
- `PeleError` → throws `Invalid diagram in <file>: <pele message>`.
- The header comment states the Obsidian rule (Pele = Obsidian 1.15) and the link rule.

#### 3. Tests

**File**: `src/lib/markdown/diagrams.test.ts`

**Intent**: Pin rendering, ids, links, accessibility and failure.

**Contract**:
- A flowchart → `<div class="diagram"…><svg` with no Shiki markup.
- Two diagrams in one document → no duplicate `id` values, and the `diagram-1-` and `diagram-2-`
  prefixes present.
- `class A internal-link` with label `Other note` and an injected index holding it → `href="/<id>"`.
- The same note absent from the index → no `<a>`, the label text kept, and `Other note` in no
  attribute.
- A label `Other note#Some heading` → `href="/<id>#some-heading"`.
- No `accTitle` → `aria-label="Flowchart diagram"`; with `accTitle` → `aria-labelledby` points to
  a prefixed id.
- `graph TD⏎  A -->` → throws `Invalid diagram`.
- ```` ```js ```` stays a code block.
- The natural width is kept (no `max-width:100%` in the output).

#### 4. Theme tokens and contrast test

**File**: `src/styles/global.css`, `src/styles/prose.css`,
`src/lib/markdown/diagram-contrast.test.ts`

**Intent**:
- Map `--pele-*` to site tokens so one SVG follows the `.dark` switch.
- Present the diagram on the same surface as code blocks (card, border).
- Check the token pairs for readable contrast in both themes.

**Contract**:
- `.prose .diagram`: `overflow-x-auto`, `bg-card`, a border and padding as for `pre`, and a focus
  ring as for `.table-scroll`.
- Inside it, the `--pele-*` variables are assigned:
  - `--pele-bg: var(--card)`, `--pele-fg: var(--foreground)`,
    `--pele-muted: var(--muted-foreground)`;
  - `--pele-accent: var(--primary)`, `--pele-font` / `--pele-font-mono`: Iosevka;
  - `--pele-line`, `--pele-border`, `--pele-surface` and `--pele-surface-alt`: existing tokens,
    or new plain-oklch `--diagram-*` tokens added to both `:root` and `.dark` in `global.css`
    (no `color-mix`, so the test can read them).
- The test reads the resolved oklch values per theme, as `shiki/contrast.test.ts` does, and
  asserts:
  - fg and muted ≥ 4.5:1 against bg, surface and surface-alt;
  - line, border and accent ≥ 3:1 against bg and surface.
- If Pele draws text on accent fills, assert fg on accent ≥ 4.5:1 as well.

#### 5. Wiring

**File**: `astro.config.mjs`

**Intent**: Add `diagrams` after `math`, before `readingTime`, and update the plugin comment to
cover both new plugins and the font integration.

**Contract**: `mdastPlugins: [comments, callouts, highlight, obsidianLinks, inlineTags, math,
diagrams, readingTime, obsidianGuard]`.

#### 6. Docs

**File**: `content/README.md`, `context/foundation/design.md`, `AGENTS.md`

**Intent**: Record the slice for the author, the design record and future agents.

**Contract**:
- `content/README.md` "Formatting" gets a **Diagrams** bullet:
  - ```` ```mermaid ```` as in Obsidian 1.15;
  - `class X internal-link` links a published note, and an unpublished one shows as text;
  - wide diagrams scroll on a phone.
- `content/README.md` "When the build fails" adds invalid mermaid.
- `design.md` "Left for slices": strike "Diagrams and math — S-04" with a "Done:" line pointing
  to Article layout entries for:
  - display math (centred, scrolls sideways, Latin Modern Math);
  - diagrams (card surface and border, site tokens, Iosevka, natural width, scroll region).
- `AGENTS.md` Project Structure covers:
  - `math.ts` and `diagrams.ts` in the markdown plugin list;
  - `src/integrations/math-font.ts` (per-build math font subset, dev middleware);
  - the vendored `src/assets/fonts/math/` source font: never served whole, never via `public/`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test` (diagrams, diagram contrast, plus all earlier suites)
- Build passes: `npm run build`
- A scratch article with an invalid mermaid fence fails `npm run build` with `Invalid diagram`,
  naming the file
- The built scratch page's HTML has no `data-href` and no unpublished note name

#### Manual Verification:

- Flowchart, sequence, class, state, gantt and pie diagrams read clearly in light and dark themes,
  and match Obsidian 1.15's layout of the same note
- A wide flowchart on a phone scrolls sideways inside its region, and the page doesn't
- An internal-link node to a published article navigates; one to an unpublished note is plain text
- A screen reader announces a diagram by its `accTitle`, or "Flowchart diagram" without one
- README, design.md and AGENTS.md read correctly

**Implementation Note**: After completing this phase and all automated verification passes, pause
here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- `math.test.ts`: the Obsidian `$` rules (whitespace, mid-paragraph `$$`, whole-paragraph `$$`),
  the unclosed `$$`, invalid TeX, the ambiguous leftover `$`, escapes, code spans, containers
  (list, blockquote, callout), and the extensions (`\ce`, `\dv`, `\abs`, `align`).
- `math-font.test.ts`: glyph collection with the italic mapping and `mathvariant="normal"`, entity
  decoding, and a subset that keeps its MATH table under 30 KB.
- `diagrams.test.ts`: rendering, unique ids, links resolved, unwrapped and with a heading, the
  accessible name, the failure, non-mermaid fences, natural width.
- `diagram-contrast.test.ts`: `--pele-*` token pairs in both themes.

### Integration Tests:

- `npm run build` on a scratch article using every case. It's removed before commit, and
  `content/articles/` stays as the author left it. Each failure case is checked with its own
  scratch file.

### Manual Testing Steps:

1. Add a scratch note using every S-04 syntax to `content/articles/` and run
   `npm run dev -- --background`. Open the same note in Obsidian 1.15 next to it.
2. Check light and dark (system setting), desktop width, and a phone (`npm run devt`, a real
   Android and an iPhone).
3. Tab through: display-math and diagram regions take focus and scroll with the keyboard.
4. `npm run build && npm run preview`: the network panel shows one small versioned math font, only
   on the math page.
5. Remove the scratch note before committing.

## Performance Considerations

All rendering happens at build time, and no client JS is added. Page cost:
- the math subset, about 8–20 KB, fetched only on pages with math, `font-display: swap`;
- MathML markup;
- about 2 KB of inline SVG per diagram;
- a few lines of CSS.

Temml and Pele add a few ms per formula or diagram to the build. The integration's subset step
adds well under a second.

## Migration Notes

None: `content/articles/` is empty, so no published article changes.

## References

- Research: `context/changes/diagrams-and-math/research.md` (author decisions on 2026-10-31,
  Pele internal-link probe)
- Plugin and test patterns: `src/lib/markdown/comments.ts`, `obsidian-links.ts`,
  `table-scroll.ts`, `inline-tags.test.ts`, `shiki/contrast.test.ts`
- Prior plan: `context/archive/2026-10-31-callouts-code-tables/plan.md` (pipeline order, guard
  discipline, review findings F1/F4/F5)
- Pele choice: `context/archive/2026-10-27-publish-first-article/plan.md:76-77,493`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Math rendering

#### Automated

- [x] 1.1 Unit tests pass: `npm test`
- [x] 1.2 Build passes: `npm run build`
- [x] 1.3 A scratch article with an unclosed `$$` fails `npm run build`, naming the file
- [x] 1.4 A scratch article with `$\frac{1}$` fails `npm run build` with `Invalid math`

#### Manual

- [x] 1.5 Scratch article: inline and display math render as formulas in light and dark, nothing raw
- [x] 1.6 `$5 and $6` and mid-paragraph `$$x$$` show as text, matching Obsidian 1.15
- [x] 1.7 A long `align` block scrolls sideways on a phone; the region takes keyboard focus

### Phase 2: Math font

#### Automated

- [ ] 2.1 Unit tests pass: `npm test`
- [ ] 2.2 Build passes: `npm run build`
- [ ] 2.3 With a scratch math article, the font subset exists under 30 KB and the CSS URL is versioned
- [ ] 2.4 With no math in any article, the build writes no math font

#### Manual

- [ ] 2.5 Production build: formulas in Latin Modern Math, only the small versioned font fetched
- [ ] 2.6 Real Android phone and iPhone: integrals, sums, stretchy brackets and Greek render with no missing glyphs
- [ ] 2.7 In dev, the same formulas render in the full font

### Phase 3: Diagrams and docs

#### Automated

- [ ] 3.1 Unit tests pass: `npm test`
- [ ] 3.2 Build passes: `npm run build`
- [ ] 3.3 A scratch article with an invalid mermaid fence fails `npm run build` with `Invalid diagram`
- [ ] 3.4 The built scratch page has no `data-href` and no unpublished note name

#### Manual

- [ ] 3.5 Six diagram types read clearly in both themes and match Obsidian 1.15's layout
- [ ] 3.6 A wide flowchart scrolls sideways on a phone; the page doesn't
- [ ] 3.7 Internal-link nodes: published navigates, unpublished is plain text
- [ ] 3.8 A screen reader announces diagrams by `accTitle` or "Flowchart diagram"
- [ ] 3.9 README, design.md and AGENTS.md read correctly

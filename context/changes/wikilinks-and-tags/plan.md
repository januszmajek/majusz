# Wikilinks and Tags Implementation Plan

## Overview

Roadmap slice S-02 (US-01, FR-009). A visitor can follow a `[[wikilink]]` to another published
article, sees a wikilink to an unpublished note as plain body text, sees an image embed
(`![[photo.png]]`) as the image, and sees tags as Obsidian shows them. The same link rules apply
to the relative markdown links (`[text](Other%20note.md)`) the site vault writes by default, which
today render as broken links. Note embeds (`![[Other note]]`) stay out of v1 and keep failing the
build. The slice also introduces Vitest, the repo's first test runner, so the "nothing private
leaks, nothing looks broken" rule has a regression net.

## Current State Analysis

- Markdown runs through Sätteri with three in-repo plugins wired in `astro.config.mjs:43`:
  mdast `readingTime`, `obsidianGuard`; hast `imageWidth`. `features.wikilinks` is off.
- `src/lib/markdown/obsidian-guard.ts:10-14` fails the build on any text node containing `![[` or
  `[[`. Today no article can contain a wikilink or embed at all.
- Sätteri's built-in `features.wikilinks` is unusable for this slice (probed on 0.10.5): it turns
  `[[Other note]]` into a plain `link` node with `url: "Other note"` and no marker, so a plugin
  can't tell it from a normal link; `![[Some note]]` becomes an `<img>`; `![[photo.png|300]]` gets
  `alt: "300"`. It stays off.
- Article URLs are the `slug` property or the slugified title, never the file name
  (`src/content.config.ts:13-20`, `src/lib/slug.ts`). Obsidian resolves a wikilink by **file
  name**. Resolution therefore needs a file-name → slug index of `content/articles/*.md`.
- The site vault writes markdown links (`.obsidian/app.json`: `useMarkdownLinks: true`,
  `newLinkFormat: "relative"`). A link between two articles made in the site vault is
  `[text](Other%20note.md)`, which renders today as `href="Other%20note.md"`: a broken link.
- User mdast plugins run before Astro's image collection (`createCollectImagesPlugin`), and user
  hast plugins before the image marker and heading ids
  (`node_modules/@astrojs/markdown-satteri/dist/satteri-processor.js:200-209`). An `image` node a
  plugin inserts is optimized like any markdown image; `imageWidth` already turns `alt|300` into
  a width.
- Heading ids come from `github-slugger` over the heading text (`satteri-processor.js:67-83`).
- Property tags already show in the meta line as `date · n min · tag · tag`
  (`src/layouts/ArticleLayout.astro:28`); the author keeps that look. Inline `#tag` in the body
  renders as literal text.
- No test runner exists; CI (`.github/workflows/deploy.yml`) runs `npm ci` then `npm run build`.

## Desired End State

- `[[Other note]]`, `[[other note]]`, `[[Other note.md]]` and `[Other](Other%20note.md)` link to
  `/<other-note-slug>` when `content/articles/Other note.md` exists. Link text is as written: the
  alias if any, else the target as typed.
- `[[Other note#Some heading]]` links to `/<slug>#some-heading`; text `Other note > Some heading`.
  `[[#Some heading]]` links to `#some-heading` in the same article.
- A link to a note not in `content/articles/` renders as plain body text (alias, else name, with
  `Name > Heading` for heading links); no `<a>`, no styling difference.
- `![[photo.png]]` and `![[photo.png|300]]` render as the optimized image from
  `content/attachments/`; a missing file fails the build naming the article.
- `![[Other note]]` (note embed) still fails the build; so does any unconsumed `[[`.
- Inline `#rust` and `#obsidian/plugins` render as muted Iosevka `#tag` spans, not links; the meta
  line is unchanged.
- `npm test` runs Vitest over the plugins and CI runs it before the build.

### Key Discoveries:

- `ctx.replaceNode(node, MdastContent[])` exists on the mdast visitor context
  (`node_modules/satteri/dist/mdast/mdast-visitor.d.ts:91`), so a `text` visitor can split a text
  node into text/link/image nodes.
- `yaml` and `github-slugger` are in `node_modules` only transitively; this slice adds them as
  direct dependencies instead of relying on hoisting.
- `astro.config.mjs` imports plugins by relative path; plugin files must keep relative imports
  (not `@/`), and so must anything they import.
- The guard checks `text` nodes only, so `[[x]]` inside backticks or code blocks is untouched and
  must stay untouched by the new plugin too.

## What We're NOT Doing

- Note embeds (`![[Other note]]`), block references as anchors (`[[Note#^id]]` links to the page,
  not the block), footnotes, canvas: PRD FR-009 / Non-Goals.
- Tag pages, tag links, or merging inline tags into the meta line.
- Changing the meta line's tag look (`· rust · obsidian` stays).
- Resolving by article title or `aliases` property: only the file name, as Obsidian does.
- Failing or warning the build on unresolved wikilinks: unpublished is a normal state.
- Failing on a `#heading` the target doesn't have: the link lands at the page top.
- Sätteri's `features.wikilinks`.
- Live re-resolution in the dev server when another article is added (the linking page updates on
  its next re-render or restart; builds are always fresh).

## Implementation Approach

One mdast plugin, `src/lib/markdown/obsidian-links.ts`, owns everything a note points at: it
splits `[[…]]` / `![[…]]` out of text nodes and rewrites relative `.md` link nodes, resolving both
through one resolver built from an article index. It runs first in `mdastPlugins`, so the guard
afterwards only sees what wasn't consumed (malformed `[[`, note embeds). Inline tags are a
separate small mdast plugin. The resolver and index take their inputs as arguments so Vitest can
drive them with fixture maps; the default export wires them to `content/articles` and
`content/attachments`.

## Critical Implementation Details

- **Slug parity.** The index and `generateId` must compute the same id. Move the
  "`slug` property, else `toSlug(title)`" rule into one exported helper in `src/lib/slug.ts`, use
  it from both, and keep `src/lib/slug.ts` free of `@/` imports. If the two drift, a wikilink
  points at a 404, which is the failure this slice exists to prevent.
- **Plugin order.** `mdastPlugins: [obsidianLinks, inlineTags, readingTime, obsidianGuard]`. The
  guard must run after both, or it fails on syntax they would have rendered.
- **Privacy.** Unpublished link text is the alias or the note name. The plugin must never emit
  the target's path, a `title` attribute, or any `data-*` naming it beyond that visible text.

## Phase 1: Test harness and link resolution

### Overview

Add Vitest and the CI step, extract the shared slug rule, build the article index and resolver,
and render wikilinks and relative `.md` links as links or plain text.

### Changes Required:

#### 1. Test runner

**File**: `package.json`, `vitest.config.ts` (only if defaults don't pick up `src/**/*.test.ts`),
`.github/workflows/deploy.yml`

**Intent**: Add Vitest as a dev dependency and an `npm test` script (`vitest run`); add
`yaml` and `github-slugger` as direct dependencies. CI runs `npm test` after `npm ci` and before
`npm run build`.

**Contract**: `npm test` exits non-zero on a failing test; the workflow gains one `run: npm test`
step and nothing else changes (no token, deploy or trigger edits).

#### 2. Shared slug rule

**File**: `src/lib/slug.ts`, `src/content.config.ts`

**Intent**: Export one helper that returns an article's id from its frontmatter (`slug`, coerced
to string, else `toSlug(title)`), and make `generateId` call it, keeping its existing error
messages.

**Contract**: `articleId(data: { slug?: unknown; title?: unknown }): string | undefined`;
`undefined` when there is no usable title, so `generateId` keeps its current error paths.

#### 3. Article index and resolver

**File**: `src/lib/markdown/article-index.ts`

**Intent**: Read `content/articles/*.md`, parse each frontmatter with `yaml`, and map lowercase
file name (no `.md`) → article id. Provide a resolver that takes a link target as written and
returns either a URL or "unpublished".

**Contract**:
- `loadArticleIndex(dir: URL): Map<string, string>`; read on each call (cheap; keeps dev close to
  fresh).
- `resolveNoteLink(target: string, index: Map<string, string>): { href: string } | null`.
  `target` is decoded, trimmed, may carry `.md`, a folder path (basename is used), and a
  `#heading` or `#^block` suffix. `#heading` → `/<id>#<github-slugger slug of heading>` (fresh
  slugger per call); `#^block` → `/<id>`; `""` + `#heading` (same article) → `#<slug>`.
  `null` = not published.

#### 4. Links plugin

**File**: `src/lib/markdown/obsidian-links.ts`

**Intent**: Turn wikilinks in text nodes into `link` nodes or plain `text` nodes, and rewrite
relative `.md` `link` nodes the same way, using the resolver.

**Contract**:
- `text` visitor: matches `(?<!!)\[\[([^\[\]|]+?)(?:\|([^\[\]]+?))?\]\]` and replaces the node
  with the split pieces via `ctx.replaceNode`. Display text: alias, else the target without `.md`,
  with `#Heading` shown as ` > Heading` and `#^block` dropped. Embeds (`![[`) are left for phase 2.
- `link` visitor: only URLs with no scheme and no leading `/` whose decoded path ends in `.md`
  (optionally followed by `#…`). Resolved → set `url`; unpublished → replace the link with its
  children. All other links untouched.
- Exported for tests as a factory taking an index; the default export loads the real index.

#### 5. Wiring and guard

**File**: `astro.config.mjs`, `src/lib/markdown/obsidian-guard.ts`

**Intent**: Run the links plugin first; keep the guard's `[[` and `![[` patterns, re-commented as
the safety net for anything the links plugin didn't consume (malformed wikilinks, and after
phase 2, note embeds). Update the config comment about `features.wikilinks`.

**Contract**: `mdastPlugins` order as in Critical Implementation Details (inline tags join in
phase 3).

#### 6. Tests

**File**: `src/lib/markdown/obsidian-links.test.ts`, `src/lib/slug.test.ts`

**Intent**: Run `markdownToHtml` from `satteri` with the plugin and a fixture index, and assert
the HTML.

**Contract**: cases at minimum: resolved `[[Other note]]`; case-insensitive `[[other NOTE]]`;
`[[Other note.md]]`; alias; `#Heading` with Polish characters (`#Zażółć gęślą`) matching Astro's
heading id; same-page `[[#Heading]]`; `#^block`; unpublished plain and aliased (assert no `<a>`
and no target path in output); unpublished heading link text `Name > Heading`;
`[x](Other%20note.md)` resolved and unpublished; `https://x.y/a.md` untouched; `[[x]]` in inline
code untouched; unclosed `[[x` left for the guard; `articleId` parity with `generateId` for a
`slug: 2026` number and a title-only note.

### Success Criteria:

#### Automated Verification:

- Tests pass: `npm test`
- Build passes: `npm run build`
- A temporary article linking a second temporary article (wikilink, aliased wikilink, `.md`
  link, heading link) and an unpublished note builds, and `dist/` HTML shows the resolved hrefs
  and plain text; both files are removed before commit
- A temporary article with an unclosed `[[x` still fails the build naming the file

#### Manual Verification:

- In the dev server, a resolved wikilink looks like any other prose link and an unpublished one
  is indistinguishable from body text, in both themes
- A heading wikilink scrolls to the heading

**Implementation Note**: After completing this phase and all automated verification passes,
pause here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Phase 2: Image embeds

### Overview

Render `![[photo.png]]` and `![[photo.png|300]]` as images from `content/attachments/`; note
embeds keep failing the build.

### Changes Required:

#### 1. Embed handling in the links plugin

**File**: `src/lib/markdown/obsidian-links.ts`

**Intent**: Extend the text visitor to `![[…]]`. A target with an image extension becomes an
`image` node; anything else is left as text so the guard fails on it.

**Contract**:
- Image extensions: `png`, `jpg`, `jpeg`, `webp`, `gif`, `svg`, `avif` (case-insensitive).
- The file is found by basename, case-insensitively, in `content/attachments/` (listed once per
  render); the node's `url` is `../attachments/<actual file name>`, URL-encoded, relative to the
  article, as pasted markdown images are.
- Not found → throw `Image "<name>" in content/articles/<note>.md: no such file in
  content/attachments/` (same file-naming as the guard).
- Pipe parts: a trailing all-digit part is the width; another part is the alt text; no alt →
  empty alt. Emit `alt` as `text|300` (or `|300`) so the existing `imageWidth` hast plugin applies
  the width and keeps rejecting `|300x200`.

#### 2. Guard comment

**File**: `src/lib/markdown/obsidian-guard.ts`

**Intent**: The `![[` pattern now means note embeds only (out of v1, PRD FR-009); say so.

**Contract**: patterns unchanged.

#### 3. Tests

**File**: `src/lib/markdown/obsidian-links.test.ts`

**Intent**: Cover embeds with a fixture attachments list.

**Contract**: cases: `![[photo.png]]` → `<img>` with `../attachments/photo.png`;
`![[Photo.PNG]]` matching `photo.png`; `![[photo.png|300]]` width via `imageWidth`;
`![[photo.png|A cat]]` alt; `![[photo.png|A cat|300]]`; `![[photo with space.jpg]]` encoded;
missing image throws; `![[Other note]]` left as text (and the guard then throws).

### Success Criteria:

#### Automated Verification:

- Tests pass: `npm test`
- Build passes: `npm run build`
- A temporary article with `![[x.png]]` and `![[x.png|300]]` (temporary image in
  `content/attachments/`) builds and `dist/` HTML has optimized webp `<img>` with srcset and the
  capped width; removed before commit
- A temporary article with `![[Some note]]` fails the build naming the file

#### Manual Verification:

- An embedded photo looks the same as a pasted markdown image on a phone and desktop

**Implementation Note**: After completing this phase and all automated verification passes,
pause here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Phase 3: Inline tags and docs

### Overview

Render inline `#tag` as a muted tag span and update the author and agent docs.

### Changes Required:

#### 1. Inline tags plugin

**File**: `src/lib/markdown/inline-tags.ts`, `astro.config.mjs`

**Intent**: Split text nodes on Obsidian inline tags and wrap each in a span, so the body shows
`#rust` as a tag instead of a stray hash.

**Contract**:
- A tag is `#` at the start of a text node or after whitespace, followed by
  `[\p{L}\p{N}_/-]+` containing at least one non-digit (so `#123` and `a#b` are not tags), as in
  Obsidian. Heading markers and code are not text nodes, so they are unaffected.
- Output: an inline node rendering `<span class="tag">#rust</span>` (via `data.hName` /
  `hProperties` if Sätteri honors them, else a hast plugin keyed on a marker; choose whichever
  Sätteri supports).
- Not a link; text unchanged, so reading time counts it as before.

#### 2. Tag style

**File**: `src/styles/prose.css`

**Intent**: `.prose .tag` in Iosevka, muted foreground, no background or border, same size as
the surrounding text.

**Contract**: one rule; no new tokens.

#### 3. Tests

**File**: `src/lib/markdown/inline-tags.test.ts`

**Contract**: cases: `#rust`, `#obsidian/plugins`, Polish `#zażółć`, start of paragraph, `#123`
not a tag, `a#b` not a tag, `#tag` inside inline code untouched, URL fragment
`https://x.y/#a` untouched.

#### 4. Docs

**File**: `content/README.md`, `context/foundation/design.md`, `AGENTS.md`

**Intent**:
- `content/README.md`: wikilinks and `.md` links work between articles; links to notes that
  aren't in `articles/` show as plain text **with the note's name visible**, so alias them
  (`[[Private|text]]`) if the name is private; image embeds `![[photo.png]]` work (`|300`, `|alt`);
  note embeds still fail the build. Update the "It fails on" list.
- `context/foundation/design.md`: strike the S-02 line in "Left for slices" with what was decided
  (unpublished = body text, meta tags unchanged, inline `#tag` muted Iosevka).
- `AGENTS.md`: `npm test` in Commands; Coding Style no longer says no test runner; markdown
  plugins list includes links and inline tags.

**Contract**: prose edits to the named sections only.

### Success Criteria:

#### Automated Verification:

- Tests pass: `npm test`
- Build passes: `npm run build`

#### Manual Verification:

- Inline tags read as tags, not stray hashes, in both themes
- `content/README.md` reads correctly as a publish how-to for wikilinks, embeds and the
  private-name warning

**Implementation Note**: After completing this phase and all automated verification passes,
pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- Plugins run through `satteri`'s `markdownToHtml` on markdown strings with fixture indexes; the
  cases are listed per phase.
- Privacy edge: every unpublished case asserts no `<a>` and no path or `.md` in the output.

### Integration Tests:

- `npm run build` with temporary fixture articles per phase, inspected in `dist/`, then removed
  (`content/articles/` is empty today and must stay so unless the author adds an article).

### Manual Testing Steps:

1. Dev server: an article linking a published and an unpublished note; check both themes.
2. Click a heading wikilink; it scrolls to the heading.
3. Embedded image on a phone width.
4. Inline tags in a paragraph.

## Performance Considerations

The index reads every article's frontmatter once per rendered article: O(n²) small file reads,
negligible for a personal blog's article count. Cache by directory mtime only if builds slow
down.

## Migration Notes

None. No article exists yet (`content/articles/` is empty), and every syntax this slice renders
fails the build today.

## References

- Roadmap: `context/foundation/roadmap.md` (S-02)
- PRD: `context/foundation/prd.md` FR-009, §Business Logic
- Prior slice: `context/archive/2026-10-27-publish-first-article/plan.md`
- Guard: `src/lib/markdown/obsidian-guard.ts`; image width: `src/lib/markdown/image-width.ts`
- Plugin order: `node_modules/@astrojs/markdown-satteri/dist/satteri-processor.js:178-230`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Test harness and link resolution

#### Automated

- [x] 1.1 Tests pass: `npm test` — d76ffce
- [x] 1.2 Build passes: `npm run build` — d76ffce
- [x] 1.3 Temporary linked articles build with resolved hrefs and plain-text unpublished links — d76ffce
- [x] 1.4 Unclosed `[[x` still fails the build naming the file — d76ffce

#### Manual

- [x] 1.5 Resolved link looks like a prose link, unpublished like body text, both themes — d76ffce
- [x] 1.6 Heading wikilink scrolls to the heading — d76ffce

### Phase 2: Image embeds

#### Automated

- [x] 2.1 Tests pass: `npm test`
- [x] 2.2 Build passes: `npm run build`
- [x] 2.3 Temporary embed article builds with optimized, width-capped images
- [x] 2.4 Note embed `![[Some note]]` fails the build naming the file

#### Manual

- [x] 2.5 Embedded photo looks like a pasted markdown image on phone and desktop

### Phase 3: Inline tags and docs

#### Automated

- [ ] 3.1 Tests pass: `npm test`
- [ ] 3.2 Build passes: `npm run build`

#### Manual

- [ ] 3.3 Inline tags read as tags in both themes
- [ ] 3.4 `content/README.md` reads correctly for wikilinks, embeds and the private-name warning

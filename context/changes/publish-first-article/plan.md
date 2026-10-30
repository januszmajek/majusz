# Publish First Article Implementation Plan

## Overview

Roadmap slice S-01 (north star), covering US-02, FR-011 and FR-010. The author adds a finished
Obsidian note and its images to a dedicated site vault and runs Obsidian Git "commit-and-sync". A
few minutes later majusz.com serves the note as an article page at `/<slug>` with its images,
publish date and reading time. The vault is a clone of this repo, as kepano does it. The publish
flow ends with publishing the author's real hello post from the phone.

## Current State Analysis

- **No content pipeline.** There is no content collection, no `content/` folder and no route that
  renders markdown. `src/pages/` holds only `index.astro` (placeholder) and `404.astro`.
- **`ArticleLayout.astro` is ready but unused.** Props: `title`, `date`, `readingMinutes`,
  `summary?`, `tags?` (`src/layouts/ArticleLayout.astro:7-14`). It already renders the back link,
  the meta line and the `.prose` body.
- **`isoDate()` formats dates in UTC** (`src/lib/date.ts:2`). Obsidian's `date: 2026-10-27` parses
  to UTC midnight, so the two match.
- **Images have one rule:** `.prose img { h-auto max-w-full }` (`src/styles/prose.css:46`). Image
  sizing is left to S-01 (`context/foundation/design.md`, "Left for slices").
- **`astro.config.mjs` has no `markdown`, `image` or `prerenderConflictBehavior` config.**
- **CI already does what publishing needs.** It builds every push, deploys `master`, and fails on
  files over 20 MB (`.github/workflows/deploy.yml:27-46`). The author gets failure notifications.
- **Astro 7.3.8 defaults matter here.** Sätteri is the default markdown processor. Remark/rehype
  plugins aren't used. The content config lives in `src/content.config.ts`, and `z` comes from
  `astro/zod` (research.md §Astro 7.3.8 content pipeline).

## Desired End State

**Publishing:**
- A note in `content/articles/` with valid `title`, `date` and `summary` properties builds into
  `dist/<slug>/index.html`, rendered through `ArticleLayout`.
- Images linked from `content/attachments/` are optimized: webp, srcset, width/height, lazy
  loading.
- The meta line shows `YYYY-MM-DD · N min`.

**The build fails (exit 1, file named) on bad input:**
- a missing or invalid property;
- a missing image;
- raw Obsidian syntax (`[[`, `![[`, `%%`, `==x==`, `> [!type]`) outside code;
- two articles with the same slug;
- a slug that clashes with a static page.

A failed build never deploys, so the live site stays as it was.

**The repo opens as an Obsidian vault.** It is set to standard markdown links, relative paths,
attachments in `content/attachments`, strict line breaks, code folders excluded from search and graph (they stay visible in the file
explorer), an article template,
and Obsidian Git with a conventional commit message and no interval sync.

**Live result:** the author's hello post, published from the iPhone, is live at
`https://majusz.com/<slug>` within 5 minutes of commit-and-sync.

### Key Discoveries:

- **Slug override:** `generateId` receives the raw frontmatter `data`, so a `slug` property can
  override the title-derived id (`node_modules/astro/dist/content/loaders/glob.js:19-38`).
- **Duplicate ids** only fail the build when `prerenderConflictBehavior: 'error'` is set;
  otherwise Astro only logs a warning (`glob.js:116-130`).
- **A guard that throws during rendering** fails the build only with `deferRender: true`; otherwise
  Astro writes an empty page and exits 0 (research.md §Raw-syntax guard, tested).
- **Sätteri mdast plugins** can set `ctx.data.astro.frontmatter.minutesRead`, which the route
  reads from `render(entry).remarkPluginFrontmatter` (research.md §Reading time, tested).
- **Image paths:** Astro optimizes relative markdown images, including `%20`-encoded names. A
  missing image fails the build with `ImageNotFound` (research.md §Images, tested).
- **Obsidian on iOS** cannot open a subfolder as a vault, so the vault is the whole repo
  (research.md §Vault layout).

## What We're NOT Doing

- **Home article list and empty state:** that's S-05. Until then the hello post is reachable only
  by its URL.
- **Wikilinks, tags display and the unpublished-link rule:** S-02. Tags are parsed and passed to
  the layout's meta line, but S-02 owns how they look.
- **Callouts, highlighting, code theme and tables styling:** S-03. Diagrams (Pele) and math:
  S-04. Until then the guard fails the build on unsupported Obsidian syntax.
- **Drafts:** no `draft` property. Drafts stay in the private Sync vault, and only finished notes
  enter the site vault.
- **Image captions:** none, matching Obsidian.
- **Engine and site:** no switch to `unified()`, and no Sätteri plugin is published as a package.
- **Repos:** no separate content repo and no git submodule.
- **No new publish step.** Commit-and-sync is the "add the file" act. No CI or Cloudflare changes.
- **No test runner.** Verification is `npm run build` plus deliberate-break checks, the repo's only
  check (AGENTS.md).
- **No hello post content from the agent.** The author writes it; the agent only verifies the
  output.

## Implementation Approach

- **Content and routing.** A `glob()` collection over `content/articles/*.md` with a Zod schema. A
  `generateId` derives an ASCII kebab slug from `slug ?? title`. A root dynamic route
  `src/pages/[slug].astro` renders each entry through `ArticleLayout`.
- **Rendering.** Sätteri gets two small in-repo mdast plugins: reading time and a raw-syntax guard.
  `deferRender: true` makes guard failures fail the build, and
  `prerenderConflictBehavior: 'error'` does the same for duplicate slugs and route clashes.
- **Vault.** The Obsidian vault config is committed so phone and desktop behave the same.
- **Order.** Phases go data and route → rendering rules → vault → live publish. Each phase leaves
  `npm run build` green with zero articles, which is the launch state.

## Critical Implementation Details

- **Transliteration:** `ł`/`Ł` have no Unicode decomposition. NFD plus stripping combining marks
  turns `ż` into `z` but leaves `ł` unchanged, so map `ł→l` explicitly before slugging. The result
  must match `^[a-z0-9]+(-[a-z0-9]+)*$`. A `slug` property that doesn't match fails the schema. A
  title that slugs to an empty string (all punctuation or emoji) fails the build with the file
  named.
- **Route clash:** a static page always wins over `[slug]`. An article titled "About" would be
  silently hidden once S-06 adds `about.astro`. Verify that `prerenderConflictBehavior: 'error'`
  catches a slug equal to a static route (try `slug: 404`). If it doesn't, `getStaticPaths` must
  throw when a slug matches a top-level `src/pages` file name, read via `import.meta.glob`, not a
  hard-coded list.
- **Empty collection:** with zero articles `getStaticPaths` returns `[]`. The build must still pass,
  and Astro's "collection is empty" warning is acceptable.
- **Guard scope:** check text nodes only. Code and inline code are separate node types, so an
  article *about* Obsidian syntax can show `[[x]]` in backticks.

## Phase 1: Content collection and article route

### Overview

Notes in `content/articles/` become pages at `/<slug>`, with optimized images and schema
validation.

### Changes Required:

#### 1. Content folders

**File**: `content/articles/.gitkeep`, `content/attachments/.gitkeep`

**Intent**: Create the two vault folders the loader and Obsidian point at. Both are flat: all
articles in one folder, all attachments in another.

**Contract**: Articles are `content/articles/<any name>.md`. Images are
`content/attachments/<file>`, linked from notes as `../attachments/<file>` (Obsidian's relative
format).

#### 2. Collection

**File**: `src/content.config.ts` (new)

**Intent**: Define the `articles` collection, so the properties the PRD requires are enforced at
build time.

**Contract**:
- Loader: `glob({ base: './content/articles', pattern: '*.md', deferRender: true, generateId })`.
- Schema: `title: string` (non-empty), `date: z.coerce.date()`, `summary: string` (non-empty),
  `tags: string[]` (default `[]`), `slug?:` matching `^[a-z0-9]+(-[a-z0-9]+)*$`.
- `generateId` returns `data.slug` if set. Otherwise it returns the transliterated, slugified
  `data.title`, and throws with the entry path if that is empty.
- Imports: `z` from `astro/zod`, `glob` from `astro/loaders`.

#### 3. Slug helper

**File**: `src/lib/slug.ts` (new)

**Intent**: Turn a title into an ASCII kebab slug, handling Polish letters (`Zażółć gęślą jaźń` →
`zazolc-gesla-jazn`).

**Contract**: `toSlug(title: string): string`. It lowercases, maps `ł→l`, applies NFD and strips
combining marks, turns every run of non `[a-z0-9]` characters into one `-`, and trims `-`. No new
dependency.

#### 4. Article route

**File**: `src/pages/[slug].astro` (new)

**Intent**: Render each article at the site root through `ArticleLayout`.

**Contract**: `getStaticPaths` maps `getCollection('articles')` to `{ params: { slug: entry.id } }`.
The page calls `render(entry)` and passes `title`, `date`, `summary`, `tags` and
`readingMinutes` to `ArticleLayout`. Reading time comes from `remarkPluginFrontmatter.minutesRead`
(set in Phase 2); until then default it to `1`.

#### 5. Astro config

**File**: `astro.config.mjs`

**Intent**: Turn on responsive image output and make slug conflicts fail the build.

**Contract**: Add `image: { layout: 'constrained', responsiveStyles: true }` and
`prerenderConflictBehavior: 'error'`. If the route-clash check above shows the conflict flag
doesn't cover static pages, add the `getStaticPaths` throw instead.

### Success Criteria:

#### Automated Verification:

- `npm run build` passes with zero articles (only `.gitkeep` files in `content/`)
- With a temporary note (title `Zażółć gęślą jaźń`, an image in `content/attachments/`), the build
  writes `dist/zazolc-gesla-jazn/index.html`, and its `<img>` has a `.webp` srcset with width and
  height
- The build exits 1 for a temporary note missing `summary`, and for one with `date: 27.10.2026`
- The build exits 1 for two temporary notes with the same title, and for a note with `slug: 404`
- The build exits 1 for a temporary note linking a missing image
- All temporary notes and images are deleted, and `git status` shows none of them

#### Manual Verification:

- In `npm run dev`, a temporary article page looks right on the article layout at phone and
  desktop widths, in both themes

**Implementation Note**: After this phase passes automated verification, pause for the human's
manual confirmation before the next phase.

---

## Phase 2: Markdown pipeline (reading time and raw-syntax guard)

### Overview

Reading time is counted from the note's text. Unsupported Obsidian syntax fails the build instead
of reaching readers. Images get their article styling.

### Changes Required:

#### 1. Reading-time plugin

**File**: `src/lib/markdown/reading-time.ts` (new)

**Intent**: Count words in prose (Polish and English), skipping code blocks, and expose minutes to
the route.

**Contract**:
- A Sätteri mdast plugin named `reading-time`. It sets `ctx.data.astro.frontmatter.minutesRead` to
  `max(1, round(words / 200))`.
- Words are segments where `Intl.Segmenter(undefined, { granularity: 'word' })` reports
  `isWordLike`, over text outside `code` nodes (fenced and inline).

#### 2. Raw-syntax guard plugin

**File**: `src/lib/markdown/obsidian-guard.ts` (new)

**Intent**: Enforce "readers never see raw Obsidian syntax" (AGENTS.md hard rule, PRD guardrail)
for syntax no slice supports yet.

**Contract**:
- A Sätteri mdast plugin with a `text` visitor. It throws `Raw Obsidian syntax in <file>:
  "<snippet>"` when a text node contains `[[`, `![[`, `%%`, `==…==`, or starts a blockquote with
  `[!type]`.
- Code nodes are never checked.
- Later slices remove patterns from this list as they add support. Each pattern gets a one-line
  comment naming the slice that will handle it (S-02 wikilinks, S-03 callouts and highlight).

#### 3. Processor config

**File**: `astro.config.mjs`

**Intent**: Register both plugins on Sätteri, Astro 7's default processor.

**Contract**: `markdown: { processor: satteri({ mdastPlugins: [readingTime, obsidianGuard] }) }`,
with `satteri` imported from `@astrojs/markdown-satteri`. If the import doesn't resolve without
it, add `@astrojs/markdown-satteri` to `package.json` at the version astro pins (0.4.3).
`features.wikilinks` stays off. Without it `[[x]]` is a plain text node the guard catches; turning
it on would create links instead.

#### 4. Image styling

**File**: `src/styles/prose.css`

**Intent**: Display article images as blocks across the prose width, with the prose rhythm, and
no captions, matching Obsidian.

**Contract**: Extend the `.prose img` rule: display block, at most 100% of the prose measure, and
the responsive `height: auto` preserved alongside Astro's `responsiveStyles`. Keep the existing
comment style.

#### 5. Route reads reading time

**File**: `src/pages/[slug].astro`

**Intent**: Use the plugin's value instead of the Phase 1 default.

**Contract**: `readingMinutes = remarkPluginFrontmatter.minutesRead`.

### Success Criteria:

#### Automated Verification:

- `npm run build` passes with zero articles
- A temporary note with 1,000 prose words (half Polish) plus a 300-word code block shows `5 min`
  in the meta line of `dist/<slug>/index.html` (`7 min` would mean code was counted)
- The build exits 1, naming the file, for temporary notes containing each of: `[[Other]]`,
  `![[x.png]]`, `%%hidden%%`, `==mark==`, `> [!note]`
- The build passes for a temporary note with `` `[[x]]` `` in inline code and `[[x]]` in a fenced
  code block
- All temporary notes are deleted, and `git status` shows none of them

#### Manual Verification:

- A temporary article with a wide photo and a tall screenshot looks right at phone and desktop
  widths in both themes

**Implementation Note**: Pause for manual confirmation before the next phase.

---

## Phase 3: Site vault configuration and docs

### Overview

Opening the repo in Obsidian gives a vault that writes notes the site can build, keeps the code out of search,
and commits with messages that fit the public history. The docs describe the publish flow.

### Changes Required:

#### 1. Obsidian vault settings

**File**: `.obsidian/app.json`, `.obsidian/core-plugins.json`, `.obsidian/templates.json` (new)

**Intent**: Commit the settings that make notes portable (research.md §Obsidian settings) so the
phone and desktop vaults match.

**Contract**:
- Wikilinks off (`useMarkdownLinks: true`) and `newLinkFormat: "relative"`.
- Attachments in `content/attachments`; new notes in `content/articles`.
- `strictLineBreaks: true` and `alwaysUpdateLinks: true`.
- `userIgnoreFilters` covering `src/`, `context/`, `lab/`, `public/`, `scripts/`, `node_modules/`
  and `dist/`. This excludes them from search, graph and the quick switcher only; they stay visible
  in the file explorer, and no hider plugin is added.
- The core Templates plugin enabled, with its folder set to `content/templates`.
- Verify the key names against the Obsidian version on the author's machine.

#### 2. Article template

**File**: `content/templates/article.md` (new)

**Intent**: Start every note with the properties the schema requires.

**Contract**: Frontmatter with `title: "{{title}}"`, `date: {{date:YYYY-MM-DD}}`, `summary: ""` and
`tags: []`, plus a comment-free empty body. It sits outside `content/articles/`, so it is never
built.

#### 3. Obsidian Git settings

**File**: `.obsidian/plugins/obsidian-git/data.json` (new), `.obsidian/community-plugins.json` (new)

**Intent**: Pushes stay deliberate (every push deploys), and commit subjects follow the repo's
Conventional Commits rule (AGENTS.md "Commits").

**Contract**:
- Auto commit-and-sync interval 0.
- Pull on startup.
- Commit message `docs(articles): sync from {{hostname}}` (verify the placeholder against the
  installed plugin; never a `{{numFiles}} files` form, which reads "1 files").
- Auto-commit include paths set to `content/` only (supported since 2.42.0). Vault settings change
  only through a deliberate desktop git commit.
- Only `data.json` is committed. The plugin code (`main.js`, `manifest.json`, `styles.css`) is
  gitignored and installed from the marketplace on each device. The token is never committed
  (Obsidian secrets since 2.42.0).

#### 4. Gitignore

**File**: `.gitignore`

**Intent**: Keep Obsidian's per-device state and plugin code out of the public repo.

**Contract**: Ignore `.obsidian/*` with an allowlist: `!.obsidian/app.json`,
`!.obsidian/core-plugins.json`, `!.obsidian/templates.json`, `!.obsidian/community-plugins.json`,
and `!.obsidian/plugins/obsidian-git/data.json` (un-ignore `plugins/` and `plugins/obsidian-git/`
first, then ignore their other contents). Per-device files (`workspace*.json`, `appearance.json`,
`graph.json`, `hotkeys.json`, plugin code) stay out of the public repo.

#### 5. Docs

**Files**: `AGENTS.md`, `content/README.md` (new), `context/foundation/design.md`

**Intent**: Record the new structure and rules for agents, and give the author a phone-readable
publish how-to inside the vault.

**Contract**:
- **AGENTS.md:**
  - Project Structure gains `content/` (vault folders, template) and `.obsidian/` (committed vault
    config), and `src/lib/markdown/` (Sätteri plugins).
  - The line "Obsidian markdown plugins are planned" becomes: Sätteri is the markdown processor,
    and the in-repo plugins live in `src/lib/markdown/`.
  - Add: the guard's pattern list shrinks only when a slice adds rendering for that syntax.
- **`content/README.md`:**
  - One-time setup: separate desktop clone, phone clone via Obsidian Git, fine-grained PAT for
    this repo only with an expiry, Image Converter optional. Git author email set to the GitHub
    `@users.noreply.github.com` address on both devices.
  - Publish steps: move the finished note from the private vault, add images with location
    stripped (iOS share sheet Options → Location off, or Image Converter with metadata removal),
    check before commit-and-sync, then commit-and-sync. Pushed history is public and permanent.
  - What a failed build means.
  - Renaming a published title: set `slug` to the old one.
- **`design.md`, "Left for slices":** mark images as done (block, full measure, no captions).

### Success Criteria:

#### Automated Verification:

- `npm run build` passes with zero articles
- `git check-ignore .obsidian/workspace.json .obsidian/appearance.json .obsidian/plugins/obsidian-git/main.js`
  lists all three, and `git check-ignore .obsidian/app.json .obsidian/plugins/obsidian-git/data.json`
  lists neither
- `.obsidian/app.json` parses as JSON and contains `"useMarkdownLinks": true` and
  `"strictLineBreaks": true`

#### Manual Verification:

- Opening a fresh clone in desktop Obsidian, the code folders are absent from search and the
  quick switcher
- Inserting the template creates a note with the four properties
- A pasted image lands in `content/attachments/` with a `../attachments/…` markdown link
- A commit from Obsidian Git uses the conventional subject

**Implementation Note**: Pause for manual confirmation before the next phase.

---

## Phase 4: Hello post, end to end (manual)

### Overview

The author sets up the vault on both devices and publishes a short real hello post with one photo
from the iPhone. This proves the north star live.

### Changes Required:

#### 1. Hello post

**File**: `content/articles/<author's choice>.md`, `content/attachments/<photo>` (written by the
author)

**Intent**: The first real article; it also verifies the full flow.

**Contract**: About 150 words with valid properties, from the template. The agent does not write
the content.

### Success Criteria:

#### Automated Verification:

- The deploy workflow run for the phone's commit succeeds (`gh run list --workflow deploy.yml
  --limit 1`)
- `curl -s -o /dev/null -w '%{http_code}' https://majusz.com/<slug>` prints 200, and
  `curl -s https://majusz.com/<slug>` contains the title, the date and `min`

#### Manual Verification:

- The desktop vault (a separate clone, not the dev checkout) and the iPhone vault (Obsidian Git
  clone, fine-grained PAT) are both set up and pull cleanly
- Before commit-and-sync, the photo has no GPS data (location stripped on the phone; confirm in
  the iOS photo info or with `exiftool -gps:all` on a desktop copy before it is pushed)
- The post goes live within 5 minutes of commit-and-sync on the iPhone
- On the phone, the live page shows the photo, `YYYY-MM-DD · N min`, and no raw Obsidian syntax
- The commit subject on `master` follows the conventional format

---

## Testing Strategy

### Unit Tests:

- None; there is no test runner (AGENTS.md). `toSlug` and the reading-time count are checked
  through build output in Phases 1–2.

### Integration Tests:

- Deliberate-break builds with temporary notes for:
  - schema failures (missing property, bad date, bad `slug`);
  - a missing image;
  - a duplicate slug and a route clash;
  - each guarded syntax;
  - code-block exemptions.
- Each check is one `npm run build` with an expected exit code.

### Manual Testing Steps:

1. Phase 1–2 temporary articles in `npm run dev` at 375px and desktop, in light and dark.
2. Obsidian desktop: open a fresh clone, then try the template, paste an image, and commit.
3. iPhone: clone, write the hello post with one photo, commit-and-sync, open the live URL within 5
   minutes.

## Performance Considerations

- Images are served as responsive webp with lazy loading, which serves the "under 2 s on a phone"
  NFR.
- Sätteri plugins add negligible build time.
- Originals stay in the repo. Image Converter, or resizing before adding, keeps the phone clone
  small. The CI 20 MB check stays the backstop.

## Migration Notes

None. There is no existing content.

## References

- Research: `context/changes/publish-first-article/research.md`
- Layout: `src/layouts/ArticleLayout.astro:7-31`
- Roadmap: `context/foundation/roadmap.md` S-01
- Pele (S-04 diagrams): https://obsidian.md/changelog/2026-10-22-desktop-v1.15.0/

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Content collection and article route

#### Automated

- [x] 1.1 `npm run build` passes with zero articles — 48cf4b2
- [x] 1.2 Temporary Polish-titled note with an image builds to `dist/zazolc-gesla-jazn/index.html` with a webp srcset and width/height — 48cf4b2
- [x] 1.3 Build exits 1 for a missing `summary` and for `date: 27.10.2026` — 48cf4b2
- [x] 1.4 Build exits 1 for a duplicate title and for `slug: 404` — 48cf4b2
- [x] 1.5 Build exits 1 for a missing image — 48cf4b2
- [x] 1.6 Temporary notes and images removed; `git status` clean of them — 48cf4b2

#### Manual

- [x] 1.7 Temporary article page looks right at phone and desktop widths in both themes — 48cf4b2

### Phase 2: Markdown pipeline (reading time and raw-syntax guard)

#### Automated

- [x] 2.1 `npm run build` passes with zero articles — 9d0422f
- [x] 2.2 1,000 prose words plus a 300-word code block shows `5 min` — 9d0422f
- [x] 2.3 Build exits 1 for each of `[[Other]]`, `![[x.png]]`, `%%hidden%%`, `==mark==`, `> [!note]` — 9d0422f
- [x] 2.4 Build passes with `[[x]]` in inline and fenced code — 9d0422f
- [x] 2.5 Temporary notes removed; `git status` clean of them — 9d0422f

#### Manual

- [x] 2.6 Wide and tall images look right at phone and desktop widths in both themes — 9d0422f

### Phase 3: Site vault configuration and docs

#### Automated

- [x] 3.1 `npm run build` passes with zero articles
- [x] 3.2 `git check-ignore` ignores per-device files and plugin code, keeps the allowlisted config
- [x] 3.3 `.obsidian/app.json` is valid JSON with `useMarkdownLinks` and `strictLineBreaks` true

#### Manual

- [ ] 3.4 Fresh clone in desktop Obsidian: code folders absent from search and quick switcher
- [ ] 3.5 Inserting the template creates a note with the four properties
- [x] 3.6 Pasted image lands in `content/attachments/` with a `../attachments/…` link
- [ ] 3.7 Commit from Obsidian Git uses the conventional subject

### Phase 4: Hello post, end to end (manual)

#### Automated

- [ ] 4.1 Deploy workflow run for the phone commit succeeds
- [ ] 4.2 `curl` of the live URL returns 200 with title, date and `min`

#### Manual

- [ ] 4.3 Desktop vault clone and iPhone vault (Obsidian Git, fine-grained PAT) set up and pulling cleanly
- [ ] 4.4 Photo has no GPS data before commit-and-sync
- [ ] 4.5 Live within 5 minutes of commit-and-sync from the iPhone
- [ ] 4.6 Live page on the phone shows photo, date, reading time, no raw syntax
- [ ] 4.7 Commit subject on `master` is conventional

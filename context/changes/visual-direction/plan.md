# Visual Direction (F-01) Implementation Plan

## Overview

Make the site's visual direction concrete by letting the author pick among whole-site variants
rendered side by side in a local design lab, then record the pick and ship it as the base
design: React, Tailwind and shadcn installed, both-theme tokens, self-hosted fonts, the site
shell with the signature motif, and the page layout components that S-01, S-05 and S-06 fill
with content.

## Current State Analysis

From `frame.md` (authoritative, not re-investigated):

- The site is a bare placeholder: `system-ui`, two centered lines (`src/layouts/Layout.astro`,
  `src/pages/index.astro`, `src/pages/404.astro`). No font, color or motif is recorded anywhere.
- The author converges by **seeing rendered variants side by side**, and judges the complete look
  (type, color, motif, page structure) as one, on **home with the article list and the article
  page**, in **both themes**. Placeholder and 404 can't show whether the vibe works.
- Author inputs: clean "space explorer" vibe with pre-Liquid-Glass Apple clarity; ASCII used
  somewhere; a slowly moving night-sky starfield; a font the author is fairly sure about; 2
  stand-in articles: original mock text modeled on two stephango.com clippings (same
  structure, own words), tracked in `lab/content/` and never deployed. Third-party text never
  enters the repo, because it is public.
- The author's `prototype` skill (`.claude/skills/prototype/SKILL.md`) is the required
  comparison tool. It is author-invoked only (`disable-model-invocation: true`), defaults to one
  piece per run, puts its surface in `/prototypes/<slug>` (would deploy) and promotes the winner
  immediately. All three defaults need overriding here.

Codebase facts:

- Astro 7.3.8, static output, npm, `astro/tsconfigs/strict`. Only dependency: `astro`.
- Astro 7 has a stable top-level `fonts` config (`node_modules/astro/dist/types/public/config.d.ts:2894`)
  that downloads font files at build time and serves them from the site's own origin.
- Astro accepts `--config <file>` and a `srcDir` override, so a second config can run a
  separate dev app from the same repo, sharing `tsconfig.json` (the `@/*` alias), `public/`,
  integrations and `node_modules`, while `npm run build` (main config, `srcDir: src`) never sees it.
- CI deploys from a git checkout on push to `master` (`.github/workflows/deploy.yml`), so
  gitignored files can never reach production.
- `npm run devt` serves the dev server on the Tailscale address; the lab gets the same pattern (`npm run labt`) so it can be judged on the
  author's phone.

## Desired End State

1. React, Tailwind v4 and shadcn/ui are installed and documented in `AGENTS.md`.
2. A design lab, run like Storybook with its own command (`npm run lab`, separate dev server
   on port 4322, separate config in `lab/`), shows whole-site variants (home, article, About)
   with a picker, a page switch, home states 0 / 2 / 12 articles, and a light/dark switch. Its
   tooling and mock content are committed; variants are gitignored. It is never built or
   deployed, and stays as a playground for later design questions.
3. The chosen direction is written down in `context/foundation/design.md`.
4. majusz.com shows the placeholder home and 404 inside the new shell (nav, footer, motif),
   with self-hosted fonts, both palettes and the device's theme applied.
5. Article, home-list (with empty state), intro and prose-page layout components exist in
   `src/`, and in the lab they render the stand-in content to match the chosen variant.

Verify: `npm run build` passes and `dist/` contains no lab output and no third-party font
URLs; the author confirms the live site and the lab "Shipped" variant match the pick in both
themes on desktop and phone.

### Key Discoveries:

- Tailwind v4 automatic source detection skips gitignored paths, so classes used only in
  `lab/variants/` are not generated unless the variant's stylesheet declares `@source` for it.
- Production layouts render a whole HTML document (head, fonts, theme script). The lab harness
  therefore shows each variant page in an `<iframe>`, the way Storybook frames stories, so
  production layouts can be previewed unchanged and the harness controls stay outside them.
- shadcn/ui expects class-based dark mode (`.dark` on `<html>`) and CSS variables named
  `--background`, `--foreground`, `--primary`, `--radius` and so on, mapped through `@theme inline`.
- `AGENTS.md` currently says "React, shadcn/ui, and Obsidian markdown plugins are planned but
  not installed". It must be updated in the same commit that installs them.
- PRD Open Question 1 (flat vs grouped home list) becomes visible in the lab's 12-entry state,
  so the pick can settle it.

## What We're NOT Doing

- No content pipeline, frontmatter parsing, reading-time calculation or article routes (S-01).
- No real home intro copy, real empty-state copy or article sorting (S-05). The live home stays
  the placeholder inside the new shell.
- No About page route, About copy, social links, GitHub link or README (S-06). Nav lists only
  destinations that exist on the live site.
- No theme toggle and no remembered theme choice (S-07). F-01 only follows the device setting.
- No callout, code-block, table, diagram or math styling (S-03, S-04).
- No cap on exploration rounds (author's choice; see the risk in Phase 3).
- Stand-in articles never enter `src/`, `public/` or the build, and no third-party article
  text enters git history.
- No Google Fonts or any other third-party font CDN on the live site.

## Implementation Approach

Install the target stack first so every lab variant is built from real Tailwind and shadcn
pieces, which means the winner is already in production form and each direction is judged
against the generic shadcn look (shipped in the lab as a "Baseline" control variant). The lab
is a separate Astro dev app with its own config and `npm run lab` script, like Storybook: the
main config and build never include it, and its variants are gitignored.
Exploration is author-driven through
`/prototype` with the overrides above. Once the author picks, the direction is recorded first,
then shipped in two steps: the shell and tokens go live, then the page layout components land
without routes, verified in the lab against the chosen variant.

## Critical Implementation Details

**Stand-in content stays original.** `lab/content/` is tracked and holds only mock text the
project owns; never paste another author's article there. `lab/variants/` is gitignored, and
after every phase `git ls-files lab/variants` must print nothing.

**Lab is separate by construction, not by convention.** The lab runs from its own config with
`srcDir: './lab'` and a separate `outDir`/`cacheDir`; the main `astro.config.mjs` is untouched
and its `srcDir` stays `src`, so `npm run build` cannot pick up lab pages. Production code
never imports from `lab/`; the lab imports from `src/` through the `@/*` alias.

**Theme without a flash.** The `.dark` class must be set by an inline (`is:inline`) script in
`<head>` before first paint, following `prefers-color-scheme` and its change event. No storage
is used: remembering a choice belongs to S-07.

**Motif must not cost the 2-second budget.** The starfield (wherever the pick places it) is a
plain script in an Astro component, not a React island. It starts after the content has
rendered (idle callback or after `load`), draws nothing under `prefers-reduced-motion: reduce`
except an optional static frame, pauses on `visibilitychange`, caps device pixel ratio, and
causes no layout shift.

## Phase 1: Stack install

### Overview

Install React, Tailwind v4 and shadcn/ui so the lab and the shipped design share one toolset.
The placeholder pages keep working and look the same.

### Changes Required:

#### 1. Integrations and dependencies

**File**: `package.json`, `package-lock.json`, `astro.config.mjs`

**Intent**: Add the React integration and Tailwind v4 (Vite plugin) using ready-made setup
scripts, not hand wiring: shadcn's Astro setup if it covers an existing Astro project
(check its Astro installation docs at implementation time), otherwise the official Astro
installers (`npx astro add react`, `npx astro add tailwind`).

**Contract**: `astro.config.mjs` gains `integrations: [react()]` and the `@tailwindcss/vite`
plugin. Output stays static.

#### 2. Global stylesheet and shadcn init

**File**: `src/styles/global.css`, `components.json`, `tsconfig.json`, `src/lib/utils.ts`

**Intent**: Initialize shadcn/ui with its own CLI (`npx shadcn@latest init` or the setup
script from step 1), which writes the default token set, `@theme inline` mapping and the
`cn()` helper. If its Astro docs require the `@/*` alias in `tsconfig.json` before `init`,
add it first.

**Contract**: `global.css` holds `@import "tailwindcss"`, the `dark` custom variant keyed to
`.dark`, and shadcn's default `:root` / `.dark` variables (replaced with the chosen values in
Phase 4). `tsconfig.json` keeps extending `astro/tsconfigs/strict` and adds `baseUrl` + `@/*`.
shadcn primitives are added to `src/components/ui/` only when a variant or layout uses them.

#### 3. Layout picks up the stylesheet

**File**: `src/layouts/Layout.astro`

**Intent**: Import `global.css` so Tailwind and the tokens apply; keep the placeholder's
centered look for now.

**Contract**: No prop changes.

#### 4. Agent instructions

**File**: `AGENTS.md`

**Intent**: Replace the "planned but not installed" rule: React, Tailwind and shadcn/ui are
installed; Obsidian markdown plugins are still not. Add `src/styles/`, `src/components/ui/`
(shadcn primitives, added with `npx shadcn add`) to Project Structure.

**Contract**: Hard rules list and Project Structure section.

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- `dist/index.html` links a generated stylesheet: `grep -q '\.css' dist/index.html`
- `package.json` lists `react`, `react-dom`, `@astrojs/react`, `tailwindcss`, `@tailwindcss/vite`

#### Manual Verification:

- Home and 404 render without errors under `npm run dev` (typography reset by Tailwind preflight and shadcn base styles is expected)

**Implementation Note**: After automated verification passes, pause for the author's manual
confirmation before Phase 2.

---

## Phase 2: Design lab harness

### Overview

A Storybook-style design lab: its own dev app started with `npm run lab`, running beside (not
inside) the main site, where whole-site variants can be flipped through full size, on desktop
and on the phone, with the stand-in content. Ships with one control variant, "Baseline"
(shadcn's default look), so every later direction is compared against the generic template the
PRD rules out.

### Changes Required:

#### 1. Ignore variants

**File**: `.gitignore`

**Intent**: Keep variants and lab build/cache output out of git, while the lab tooling
(config, harness) and the mock content are committed.

**Contract**: entries `/lab/variants/`, `/lab/dist/`, `/lab/.astro/`.

#### 2. Lab app and command

**File**: `lab/astro.config.mjs`, `package.json`, `AGENTS.md`

**Intent**: A second Astro config that reuses the main one (React, Tailwind and, after
Phase 4, fonts) and points it at the lab, plus scripts to run it, like `storybook dev`.

**Contract**:
- `lab/astro.config.mjs` spreads the main config and overrides `srcDir: './lab'`,
  `outDir: './lab/dist'`, `cacheDir: './lab/.astro'`, `server.port: 4322`. Root stays the repo
  root, so `tsconfig.json` (`@/*`), `public/` and `node_modules` are shared.
- `package.json` scripts: `lab` → `astro dev --config lab/astro.config.mjs --ignore-lock`, and
  `labt` → the same with `--host 100.93.203.96` for the phone (mirrors `devt`). `--ignore-lock`
  lets it run beside the site's dev server, which holds Astro's per-project lock.
- The main `astro.config.mjs` is not changed by this phase.
- `AGENTS.md` Commands gains `npm run lab` (and how to stop it); Project Structure gains `lab/`
  with the note that variants and content are local-only.

#### 3. Harness

**File**: `lab/pages/index.astro`, `lab/pages/v/[variant]/[page].astro`, `lab/variants/baseline/`

**Intent**: The harness page (`/`) frames one variant page at a time, full size, in an
`<iframe>`, with neutral chrome around it:

- the variant picker, copied verbatim from `.claude/skills/prototype/PICKER.md`;
- a second pill with the same picker styles for page (Home / Article / About), home state
  (0 / 2 / 12 articles) and theme (light / dark).

**Contract**:
- Variant pages live at `/v/<variant>/<page>`, where `<page>` is `home-0`, `home-2`,
  `home-12`, `article-<slug>` (one per stand-in) or `about`. `[page].astro` exports
  `getStaticPaths` (required for dynamic routes in a static project, dev included) that lists
  every variant folder (via `import.meta.glob` over `lab/variants/*/`) × every page.
- The harness keeps its state in the URL query (`?v=…&page=…&theme=…`) so a reload or the
  phone keeps its place; switching swaps the iframe `src`, with no animation.
- Theme: the harness sets or removes `.dark` on the iframe's `<html>` after each load
  (same origin), so it works for any variant, including production layouts.
- Each variant is a folder `lab/variants/<name>/` with `Home.astro`, `Article.astro`,
  `About.astro` that each render a whole document with the variant's own stylesheet, all
  receiving the same stand-in data. Variant stylesheets declare `@source` for their folder
  (see Key Discoveries).
- Baseline's stylesheet carries its own copy of shadcn's default tokens and does not import
  `src/styles/global.css`, so it stays the plain shadcn control after Phase 4 changes the
  global tokens.

#### 4. Stand-in data

**File**: `lab/content/*.md`, `lab/content/list.ts`

**Intent**: The 2 stand-in articles are original mock text modeled on two stephango.com
clippings (a long one with headings, lists, a code block and links; a short one), with
Obsidian Web Clipper properties, rendered through Astro's markdown import. `title`, `date` /
`published` / `created`, `summary` / `description` and `tags` are read. `list.ts` adds 10 plausible entries
(titles, dates, summaries in the author's interest areas) for the 12-entry state. Until the
author drops the articles in, the lab shows a one-line note where they would render.

**Contract**: Article data shape `{ title, date, summary, tags[], readingMinutes, Content }`.
This is the lab's own shape, not the S-01 content schema.

### Success Criteria:

#### Automated Verification:

- Build passes and contains no lab output: `npm run build && ! find dist -path '*/v/baseline*' | grep -q .`
- Variants are ignored: `git check-ignore -q lab/variants/baseline/Home.astro`
- Nothing from variants is tracked: `test -z "$(git ls-files lab/variants)"`
- Lab app serves the harness and Baseline: with `npm run lab` running, `curl -sf localhost:4322/` and `curl -sf localhost:4322/v/baseline/home-2` succeed

#### Manual Verification:

- Picker, page, home-state and theme switches work on desktop and on the phone via `npm run labt`
- The 2 stand-in articles render in the Baseline variant

**Implementation Note**: Variants link their stylesheet with a `?url` import, not a plain
import; a plain import leaks every variant's CSS into every variant page through the shared
glob. Pause for confirmation before Phase 3.

---

## Phase 3: Exploration and direction record

### Overview

Author-driven. I propose round 1, the author runs `/prototype`, rounds repeat until the author
picks, then the pick is written down. No cap on rounds.

### Changes Required:

#### 1. Round 1 directions

**File**: `context/changes/visual-direction/directions.md`

**Intent**: Three directions drafted from the author's inputs, each with a name, one stated
axis and what it does with type, color, starfield placement, ASCII and page structure.
Starting proposal: "Mission control" (ASCII-heavy, terminal-like structure), "Observatory"
(quiet Apple-like clarity, starfield-led), "Star chart" (editorial typography, motif as
diagram lines). The author edits or swaps them before any variant is built. No stand-in
content goes in this file.

**Contract**: Markdown list of directions, edited by the author; committed.

#### 2. `/prototype` rounds (run by the author)

**File**: `lab/variants/<name>/` (gitignored)

**Intent**: The author starts each round with `/prototype` and a brief that applies these
overrides to the skill's defaults:

- surface is the existing lab app (`lab/variants/<name>/`, served by `npm run lab`), not `/prototypes/<slug>`;
- one variant = the whole site (Home, Article, About on the shared stand-in data), in both themes;
- variants use Tailwind and shadcn primitives, keeping Baseline in the picker as the control;
- no "keep"/promote step: the pick is recorded in step 3 and shipped in Phases 4–5.

Later rounds use `riff <variant>`. Adding a shadcn primitive to `src/components/ui/` during a
round is allowed (vendored, unused by production pages until Phase 4).

**Contract**: Each round leaves its variants in the lab; earlier variants may be deleted at the
author's call.

#### 3. Direction record

**File**: `context/foundation/design.md`, `AGENTS.md`, `context/foundation/prd.md`,
`context/foundation/roadmap.md`

**Intent**: Write down the chosen variant as the contract for every later slice:
- typography: families (with licence allowing self-hosting), weights, scale, line length;
- colors: light and dark token values in shadcn variable names, contrast-checked (AA);
- motif: starfield placement, density, motion and reduced-motion behavior; where ASCII appears;
- layouts: home (intro, list, empty state, flat or grouped), article (title block, meta,
  prose width, tags), About; navigation and footer;
- what is left for slices (callouts, code, tables, diagrams, toggle).

Link it from `AGENTS.md` next to the PRD and tech-stack. Mark PRD Open Question 1 resolved with
a pointer to `design.md` (and the roadmap S-05 unknown likewise).

**Contract**: New foundation doc; one-line edits in the others.

### Success Criteria:

#### Automated Verification:

- `context/foundation/design.md` exists and covers typography, colors (both themes), motif and
  the three page layouts: `grep -c '^## ' context/foundation/design.md` ≥ 4
- No variants tracked: `test -z "$(git ls-files lab/variants)"`

#### Manual Verification:

- Author has picked a variant in the lab and approves `design.md` as describing it

**Implementation Note**: Open-ended by the author's choice. If rounds run past roughly
2026-10-31, raise it, since Phases 4–5 and the slices that depend on F-01 still need to fit
before the 2026-11-08 target.

---

## Phase 4: Ship base design

### Overview

Put the chosen tokens, fonts, shell and motif live on the placeholder home and 404.

### Changes Required:

#### 1. Tokens and base styles

**File**: `src/styles/global.css`

**Intent**: Replace the shadcn defaults with the chosen light and dark values from
`design.md`; add base typography and the article prose styles (headings, paragraphs, lists,
links, blockquotes, images, inline code) as specified there.

**Contract**: Same variable names; prose styles scoped under one class (e.g. `.prose`) that
S-01 and S-06 apply.

#### 2. Self-hosted fonts

**File**: `astro.config.mjs`, `src/layouts/Layout.astro`

**Intent**: Load the chosen families through Astro's `fonts` config so files are downloaded at
build time and served from majusz.com; preload the body font.

**Contract**: `fonts: [{ provider, name, cssVariable, weights, … }]`; `<Font cssVariable=… preload />`
in `<head>`; `global.css` maps the CSS variables to the font tokens.

#### 3. Site shell and motif

**File**: `src/layouts/Layout.astro`, `src/components/site/SiteHeader.astro`,
`src/components/site/SiteFooter.astro`, `src/components/site/Starfield.astro` (or the motif
component `design.md` names), `src/config/nav.ts`

**Intent**: The layout becomes the real shell: `<head>` with fonts, stylesheet and the inline
theme script; header with the wordmark and nav; `<main>` slot; footer; the motif placed per
`design.md`. Nav entries come from one list and only include destinations live on the site
(today: home), so S-06 adds About, socials and GitHub by adding entries.

**Contract**: `Layout` props stay `{ title?: string }` plus optional `description`. `.dark` set
on `<html>` before first paint from `prefers-color-scheme`. Motif rules in Critical
Implementation Details.

#### 4. Pages adopt the shell

**File**: `src/pages/index.astro`, `src/pages/404.astro`

**Intent**: Placeholder and 404 content restyled inside the shell; copy unchanged.

**Contract**: No new routes.

#### 5. Roadmap note

**File**: `context/foundation/roadmap.md`

**Intent**: Note on S-07 that following the device theme landed in F-01; S-07 keeps the manual
toggle and remembering the choice.

**Contract**: S-07 Outcome/Risk lines only.

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- No third-party font hosts in output: `! grep -rqE 'fonts\.(googleapis|gstatic)\.com|fontshare' dist`
- Font files are self-hosted: `find dist -name '*.woff2' | grep -q .`
- Only the site's pages are built: `find dist -name '*.html' | sort` prints exactly `dist/404.html` and `dist/index.html`

#### Manual Verification:

- Home and 404 match the chosen variant in light and dark (switch the OS theme), with no theme flash on load
- On the phone (`npm run devt`, then on majusz.com after deploy) text is readable and the motif doesn't stutter
- With reduced motion enabled the starfield doesn't move
- Every interactive element is reachable and visible with the keyboard only
- Text contrast meets WCAG AA in both themes (browser devtools contrast check)

**Implementation Note**: Pause for the author's confirmation before Phase 5. Pushing to
`master` deploys this phase.

---

## Phase 5: Page layout components

### Overview

The layouts from `design.md` as components with no routes, so S-01, S-05 and S-06 only plug
in content. Verified in the lab against the chosen variant with the stand-in data.

### Changes Required:

#### 1. Article layout

**File**: `src/layouts/ArticleLayout.astro`

**Intent**: Article page in the shell: title block, publish date, reading time, tags, prose body.

**Contract**: Props `{ title: string; date: Date; readingMinutes: number; summary?: string; tags?: string[] }`
plus default slot for the rendered body. It formats the date; it does not compute reading time.

#### 2. Home pieces

**File**: `src/components/home/Intro.astro`, `src/components/home/ArticleList.astro`,
`src/components/home/EmptyState.astro`

**Intent**: Intro block (copy via slot), the article list in the chosen structure (flat or
grouped per `design.md`), and the teaser empty state (copy via slot).

**Contract**: `ArticleList` props `{ entries: { title: string; href: string; date: Date; summary?: string }[] }`,
rendered in the given order (sorting is S-05's job); renders nothing for an empty array so the
caller shows `EmptyState`.

#### 3. Prose page layout

**File**: `src/layouts/PageLayout.astro`

**Intent**: Layout for text pages such as About: title plus prose body in the shell.

**Contract**: Props `{ title: string; description?: string }` plus default slot.

#### 4. "Shipped" variant in the lab

**File**: `lab/variants/shipped/` (gitignored)

**Intent**: A lab variant built only from the production components above with the stand-in
data, so the author can flip between it and the chosen variant on every page, home state and
theme.

**Contract**: Its pages render the production layouts as whole documents (framed by the
harness iframe); imports from `src/` only; no styles of its own.

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- No new routes and no lab output: `find dist -name '*.html' | sort` prints exactly `dist/404.html` and `dist/index.html`
- Nothing tracked from variants: `test -z "$(git ls-files lab/variants)"`

#### Manual Verification:

- In the lab, "Shipped" and the chosen variant look the same for Home (0 / 2 / 12), Article and About, in both themes, on desktop and phone
- Article stand-ins read comfortably on the phone (line length, size, spacing)

**Implementation Note**: After this phase F-01 is done; `/10x-archive visual-direction` can
close it and flip the roadmap item.

---

## Testing Strategy

### Unit Tests:

- None; no test runner exists and this change adds no logic beyond date formatting. `npm run build`
  is the gate (per `AGENTS.md`).

### Integration Tests:

- The shell commands in each phase's Automated Verification (build, only site pages in
  `dist/`, no third-party fonts, nothing tracked under `lab/variants`).

### Manual Testing Steps:

1. `npm run lab`, open `localhost:4322`, flip variants, pages, home states and themes.
2. `npm run labt`, repeat on the phone over Tailscale.
3. After the Phase 4 push, check majusz.com on the phone in both OS themes and with reduced motion.
4. Tab through home and 404 with the keyboard only.

## Performance Considerations

The article page must show readable content in under 2 seconds on an average phone connection.
Fonts are self-hosted with the body font preloaded; the motif runs after content renders, is
vanilla JS with no React island, and pauses when hidden. Phase 4's phone check covers it; a
Lighthouse mobile run against `npm run preview` is a useful extra check before pushing.

## Migration Notes

None. No content exists yet. Rollback is the usual path in `AGENTS.md` (revert plus redeploy).

## References

- Frame brief: `context/changes/visual-direction/frame.md`
- Prototype skill: `.claude/skills/prototype/SKILL.md`, `.claude/skills/prototype/PICKER.md`
- Roadmap item: `context/foundation/roadmap.md` F-01; dependants S-01, S-03 – S-07
- PRD: `context/foundation/prd.md` §Vision, §Success Criteria, NFRs, Open Question 1
- Current pages: `src/layouts/Layout.astro`, `src/pages/index.astro`, `src/pages/404.astro`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Stack install

#### Automated

- [x] 1.1 Build passes: `npm run build` — 0f2930c
- [x] 1.2 `dist/index.html` links a generated stylesheet — 0f2930c
- [x] 1.3 `package.json` lists react, react-dom, @astrojs/react, tailwindcss, @tailwindcss/vite — 0f2930c

#### Manual

- [x] 1.4 Home and 404 render without errors under `npm run dev` — 0f2930c

### Phase 2: Design lab harness

#### Automated

- [x] 2.1 Build passes and contains no lab output — e940b98
- [x] 2.2 Variants are ignored by git — e940b98
- [x] 2.3 Nothing from variants is tracked — e940b98
- [x] 2.4 Lab app serves the harness and Baseline — e940b98

#### Manual

- [x] 2.5 Picker, page, home-state and theme switches work on desktop and phone — e940b98
- [x] 2.6 The 2 stand-in articles render in the Baseline variant — e940b98

### Phase 3: Exploration and direction record

#### Automated

- [x] 3.1 `context/foundation/design.md` exists and covers typography, colors, motif and layouts
- [x] 3.2 No variants tracked

#### Manual

- [x] 3.3 Author has picked a variant and approves `design.md`

### Phase 4: Ship base design

#### Automated

- [x] 4.1 Build passes — 882fe6f
- [x] 4.2 No third-party font hosts in output — 882fe6f
- [x] 4.3 Font files are self-hosted — 882fe6f
- [x] 4.4 Only the site's pages are built — 882fe6f

#### Manual

- [x] 4.5 Home and 404 match the chosen variant in light and dark, no theme flash
- [x] 4.6 Readable on the phone, motif doesn't stutter
- [x] 4.7 Starfield doesn't move under reduced motion
- [x] 4.8 Keyboard-only navigation works
- [x] 4.9 Text contrast meets WCAG AA in both themes

### Phase 5: Page layout components

#### Automated

- [ ] 5.1 Build passes
- [ ] 5.2 No new routes and no lab output
- [ ] 5.3 Nothing tracked from variants

#### Manual

- [ ] 5.4 "Shipped" matches the chosen variant on every page, home state and theme
- [ ] 5.5 Article stand-ins read comfortably on the phone

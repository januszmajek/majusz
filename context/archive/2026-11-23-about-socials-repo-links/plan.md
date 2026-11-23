# About, Socials and Repo Links Implementation Plan

## Overview

Close roadmap S-06 (PRD US-01, FR-004, FR-005, FR-006): visitors can open an About page from the
header, reach the author's GitHub, LinkedIn and X profiles and the site's public repo, and the
repo itself is presentable to recruiters (README, license, GitHub description). This is the
last slice of the v1 milestone.

## Current State Analysis

- `src/config/nav.ts` exports an empty `nav`; its comment says S-06 adds About there.
  `SiteHeader.astro` renders `<nav>` only when `nav` has items, marking the current item with
  `aria-current` and `font-medium text-foreground` (others `quiet text-muted-foreground`).
- `src/layouts/PageLayout.astro` (title + `.prose` body, 38rem, `current` prop) exists and is
  unused; it is built for About.
- `src/components/site/SiteFooter.astro` shows `© {year} Janusz Majek`; `design.md` → Footer
  specifies `© 2026 Janusz Majek · source ↗` (the `source ↗` link is missing).
- `design.md` → About: same title style as home, prose with a bio and an "Elsewhere" list of
  social and repo links, capped at 38rem. Nav items are lowercase (`about`).
- `README.md` is `# majusz`; there is no `LICENSE`. Fonts carry their own licenses
  (`src/assets/fonts/LICENSE.md` OFL, `src/assets/fonts/math/` GUST).
- The GitHub repo `januszmajek/majusz` is public with no description or homepage. History is
  76 Conventional Commits; author name varies (`jmajek` / `Janusz Majek`, same email) and is
  left as is (rewriting pushed `master` is not worth it).

## Desired End State

- Header on every page: wordmark left; `about` then the theme toggle right. On `/about`,
  `about` is marked current (`aria-current="page"`).
- `/about` shows the title "About", two or three short draft paragraphs (who the author is,
  why the site exists, what to expect), then an "Elsewhere" list: GitHub, LinkedIn, X, and the
  site's source on GitHub. The author rewrites the copy later.
- Footer on every page: `© {year} Janusz Majek · source ↗`, `source` linking to the repo.
- All external URLs come from one module, `src/config/links.ts`.
- The repo has a concise technical README and an MIT `LICENSE` for the code; article content is
  stated as all rights reserved; fonts keep their own licenses.
- The GitHub repo shows a description and `https://majusz.com` as its homepage.

### Key Discoveries:

- `src/config/nav.ts:10` is the one place to add About; the header needs no change.
- `PageLayout.astro` already passes `current` through to `Layout` → `SiteHeader`.
- `404.astro` shows the site's link style: `press text-primary underline-offset-[0.2em]
  hover:underline focus-visible:underline`; inside `.prose`, links are styled by `prose.css`.
- Social URLs (author-supplied, 2026-11-23): `https://github.com/januszmajek`,
  `https://www.linkedin.com/in/janusz-majek/` (the `?locale=pl` parameter dropped),
  `https://x.com/janusz_majek` (`@janusz_majek`). Repo: `https://github.com/januszmajek/majusz`.

## What We're NOT Doing

- No social icons in the header and no share buttons (design.md: nav is `about` only).
- No CV link (PRD: deferred past v1), no email link.
- No `target="_blank"`: external links open in the same tab, marked with `↗`.
- No history rewrite to unify commit author names.
- No final About copy: the draft is the author's to replace.
- No "instant navigation" (parked roadmap item, planned after this slice).

## Implementation Approach

Data first (`links.ts`), then the page, nav entry and footer link that read it; then the repo's
own presentation and docs; then the GitHub metadata, which is outside git and runs only when the
author approves the push.

## Phase 1: About page and links

### Overview

The About page, its nav entry and the footer's source link, all fed by one links module.

### Changes Required:

#### 1. Links module

**File**: `src/config/links.ts` (new)

**Intent**: One source for every external URL the site shows.

**Contract**: exports `socials` (ordered list of `{ id, label, href }` for GitHub, LinkedIn, X;
X's label may show the handle `@janusz_majek`) and `repo` (`{ label, href }` for the site's
source). Short file comment: only profiles the author actively uses (PRD FR-005).

#### 2. Nav entry

**File**: `src/config/nav.ts`

**Intent**: Show `about` in the header on every page.

**Contract**: `nav = [{ id: 'about', label: 'about', href: '/about' }]`; update the file comment
(S-06 landed).

#### 3. About page

**File**: `src/pages/about.astro` (new)

**Intent**: The About page with draft copy and the Elsewhere list.

**Contract**: uses `PageLayout` with `title="About"`, `current="about"` and a one-sentence
`description`. Body: 2–3 short draft paragraphs in the author's voice, consistent with the home
intro and PRD (builds software, writes to think, the site is where that lands; no CV talk), then
an `h2` "Elsewhere" and a list rendered from `socials` followed by `repo`
(e.g. "source of this site"). Each link has `rel="me"` for profiles (not for the repo) and a
trailing `↗`, decorative (`aria-hidden`). Same tab.

#### 4. Footer source link

**File**: `src/components/site/SiteFooter.astro`

**Intent**: Match design.md's footer: `© {year} Janusz Majek · source ↗`.

**Contract**: `source` links to `repo.href`, styled as muted text that turns the accent on hover
and focus like other quiet links; `↗` decorative.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Build passes: `npm run build`
- About is built with every link: `dist/about/index.html` exists and contains
  `github.com/januszmajek`, `linkedin.com/in/janusz-majek`, `x.com/janusz_majek` and
  `github.com/januszmajek/majusz`
- Every page has the nav entry and the footer source link: `grep -L 'href="/about"' dist/index.html dist/404.html dist/about/index.html` and `grep -L 'github.com/januszmajek/majusz' dist/index.html dist/404.html` print nothing

#### Manual Verification:

- `about` in the header on every page; marked current on `/about` only
- About reads well in both themes and on a phone; Elsewhere links open the right profiles
- Footer `source ↗` opens the repo; hover and keyboard focus look like the rest of the chrome
- Phone header still fits one line with `about` and the toggle

**Implementation Note**: After completing this phase and all automated verification passes,
pause here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Phase 2: Repo presentation and docs

### Overview

Make the repo presentable and keep the project docs true.

### Changes Required:

#### 1. README

**File**: `README.md`

**Intent**: A one-screen technical README for visitors and recruiters.

**Contract**: sections: what it is (personal blog, link to https://majusz.com); stack (Astro 7
static, Tailwind v4, shadcn/ui rendered statically, Sätteri markdown with in-repo plugins,
Cloudflare Workers via GitHub Actions); publishing (an Obsidian vault folder: add one `.md` plus
images and push; link `content/README.md`); develop (`npm install`, `npm run dev`, `npm test`,
`npm run build`; Node ≥ 22.12); layout (short tree of `src/`, `content/`, `context/`); how it is
built (planned and implemented in small changes with AI agents, docs under `context/`; 1–2
sentences); license (code MIT, article content all rights reserved, fonts under their own
licenses). No badges or screenshots. Delete `README.md.scaffold` only if it is the starter
leftover with nothing to merge.

#### 2. License

**File**: `LICENSE` (new), `package.json`

**Intent**: Make the code license explicit.

**Contract**: MIT text, `Copyright (c) 2026 Janusz Majek`; `package.json` gets `"license": "MIT"`.

#### 3. Docs

**Files**: `context/foundation/design.md`, `AGENTS.md`, `context/foundation/roadmap.md`

**Intent**: Record what was built.

**Contract**: design.md → About and Footer describe the built page and link (same tab, `↗`,
`rel="me"`, links from `src/config/links.ts`); "Left for slices" S-06 entry struck through with
a Done note if one exists. AGENTS.md → Project Structure mentions `about.astro` and
`src/config/links.ts`, and drops "unused so far" from `PageLayout`. Roadmap S-06 unknown
("which socials, About copy") resolved: GitHub, LinkedIn, X; copy is a draft the author replaces.

### Success Criteria:

#### Automated Verification:

- Tests and build still pass: `npm test && npm run build`

#### Manual Verification:

- README reads well on GitHub and its commands work
- design.md, AGENTS.md and the roadmap match what was built

---

## Phase 3: GitHub metadata

### Overview

Set the repo's public description and homepage. Outward-facing, outside git: run only when the
author approves the push; no commit.

### Changes Required:

#### 1. Repo settings

**Intent**: The repo page shows what it is and links the site.

**Contract**: `gh repo edit januszmajek/majusz --description "Personal blog of Janusz Majek: Astro, published from an Obsidian vault" --homepage https://majusz.com`.

### Success Criteria:

#### Automated Verification:

- `gh repo view januszmajek/majusz --json description,homepageUrl` shows both values

#### Manual Verification:

- The repo page on GitHub looks presentable (description, homepage, README)

---

## Testing Strategy

### Unit Tests:

- None new: the change is static markup and config; the build greps cover it.

### Integration Tests:

- `npm run build`, then the `dist/` greps above.

### Manual Testing Steps:

1. Open `/`, an article, `/about` and a missing URL: `about` in the header, `source ↗` in the footer.
2. On `/about`, follow every Elsewhere link.
3. Both themes, phone width, keyboard Tab through header, page links and footer.

## Performance Considerations

One more static page and a few links; no JS.

## References

- Roadmap: `context/foundation/roadmap.md` → S-06
- PRD: FR-004, FR-005, FR-006
- Design: `context/foundation/design.md` → Header, Footer, About
- Layout: `src/layouts/PageLayout.astro`; nav: `src/config/nav.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: About page and links

#### Automated

- [x] 1.1 Unit tests pass: `npm test` — 6e715b7
- [x] 1.2 Build passes: `npm run build` — 6e715b7
- [x] 1.3 About is built with every link — 6e715b7
- [x] 1.4 Every page has the nav entry and the footer source link — 6e715b7

#### Manual

- [x] 1.5 `about` in the header on every page; current on `/about` only — 6e715b7
- [x] 1.6 About reads well in both themes and on a phone; links open the right profiles — 6e715b7
- [x] 1.7 Footer `source ↗` opens the repo; hover and focus match the chrome — 6e715b7
- [x] 1.8 Phone header still fits one line — 6e715b7

### Phase 2: Repo presentation and docs

#### Automated

- [x] 2.1 Tests and build still pass: `npm test && npm run build` — 9fc8e63

#### Manual

- [x] 2.2 README reads well on GitHub and its commands work — 9fc8e63
- [x] 2.3 design.md, AGENTS.md and the roadmap match what was built — 9fc8e63

### Phase 3: GitHub metadata

#### Automated

- [x] 3.1 `gh repo view` shows the description and homepage

#### Manual

- [x] 3.2 The repo page on GitHub looks presentable

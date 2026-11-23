# Home Article List Implementation Plan

## Overview

Replace the "Coming soon" placeholder home with the real home page (roadmap S-05; PRD US-01,
FR-001–FR-003): a short introduction, then every article newest first under year rules, or the
`LOG` teaser empty state when `content/articles/` has no articles. The components were built to
`design.md` in F-01; this change gives them data, an order rule and copy.

## Current State Analysis

- `src/pages/index.astro` renders a hard-coded `majusz.com` / "Coming soon." block.
- `src/components/home/Intro.astro` (title + paragraph via slots), `ArticleList.astro` (flat list
  under UTC year rules, keeps the order it is given and renders nothing for zero entries) and
  `EmptyState.astro` (`LOG` rule, copy via slot) already exist and match `design.md` → Layouts →
  Home. Nothing uses them yet.
- The `articles` collection (`src/content.config.ts`) has `title`, day-only `date` (UTC
  midnight), `summary`, `tags`, `slug`; `entry.id` is the URL slug (`/<id>`).
- Reading time only exists after `render(entry)` (`remarkPluginFrontmatter.minutesRead`, set by
  `src/lib/markdown/reading-time.ts`), as `src/pages/[slug].astro` does.
- `content/articles/` holds only `.gitkeep`, so the empty state is what ships first.
- The empty-state copy is fixed by `design.md`: `> 0 entries. First transmission pending.`
- `Layout.astro` takes `title` (default `majusz.com`), `description` and `current`; the nav's
  `articles` item points to `/`.

## Desired End State

- `/` shows the intro (title "Janusz Majek", one plain sentence) and either the year-grouped list
  of every article, newest date first, same-date articles by title A→Z, each row linking to
  `/<id>` with date and `n min`; or, with no articles, the `LOG` rule and the teaser line.
- Articles dated in the future are listed like any other (no hiding, no build failure).
- The home `<meta name="description">` is the intro sentence; `<title>` stays `majusz.com`.
- The order rule lives in one tested pure helper; `content/README.md` tells the author how
  same-day articles are ordered.

### Key Discoveries:

- `ArticleList.astro:1-3` leaves sorting to the caller; `years` is derived from entry order, so
  sorted input gives years newest first too.
- `ArticleList.astro:11-12` carries an unused `summary` field "kept for S-05's data"; the list
  never shows summaries (`design.md` → Home), so S-05 drops it.
- `[slug].astro:13-16` is the pattern for `render(entry)` and reading `minutesRead`.
- `src/lib/date.ts` is the precedent for small pure helpers in `src/lib/` with UTC semantics.

## What We're NOT Doing

- No photo/avatar in the intro.
- No time-of-day in `date`; same-day order is title A→Z only.
- No hiding or rejecting future-dated articles; no scheduled rebuilds.
- No summaries, tags or pagination in the list; no separate archive page (PRD FR-008 removed).
- No Astro container render tests; page wiring is checked by the build and manually.
- No change to the empty-state component or its copy beyond passing the design's line.
- About, socials, repo link (S-06) and theme toggle (S-07).

## Implementation Approach

Keep the decision (order) in a pure, tested function and the page as thin wiring: load the
collection, sort, render each entry for its reading time, map to `ArticleList`'s `Entry`, and
branch to `EmptyState` on zero entries.

## Phase 1: Home page wiring

### Overview

Sort helper with its test, then the home page using the existing home components.

### Changes Required:

#### 1. Article order helper

**File**: `src/lib/articles.ts` (new), `src/lib/articles.test.ts` (new)

**Intent**: One place for the home list order the author decided: newest `date` first, then
title A→Z for the same day, so the order never depends on file names or loader order.

**Contract**: a generic, non-mutating sort over anything with `{ title: string; date: Date }`
(e.g. `newestFirst<T extends { title: string; date: Date }>(items: T[]): T[]`). Date compared by
time value; title tie-break with `localeCompare` (locale `en`, case-insensitive base sensitivity)
so "astro" and "Astro" don't split on case. No `astro:content` import, so Vitest runs it plainly.
Tests: different dates → newest first; same date → A→Z ("Astro tips" before "Zig notes"); case
doesn't change order; a future date sorts first; input array is not mutated; empty in → empty out.

#### 2. Home page

**File**: `src/pages/index.astro`

**Intent**: Replace the placeholder with `Intro` + `ArticleList`, or `Intro` + `EmptyState` when
there are no articles.

**Contract**: `getCollection('articles')` → `newestFirst` over `entry.data` → for each entry
`render(entry)` and read `remarkPluginFrontmatter.minutesRead` → `Entry { title, href: '/' + id,
date, readingMinutes }`. Intro title `Janusz Majek`; paragraph "I build software and write down
what I learn doing it: notes on tools, code and the odd side project." (author may rewrite in
review). Empty state slot: `0 entries. First transmission pending.` (`EmptyState` adds the `> `).
`Layout` gets `current="articles"` and `description` = the intro sentence (keep it in one
constant so the two can't drift).

#### 3. Drop the unused summary field

**File**: `src/components/home/ArticleList.astro`

**Intent**: Remove `Entry.summary` and its "kept for S-05" comment; the list never shows it.

**Contract**: `Entry` becomes `{ title; href; date; readingMinutes? }`.

#### 4. Wordmark leads home (added 2026-11-23, after manual review)

**Files**: `src/config/nav.ts`, `src/components/site/SiteHeader.astro`,
`src/layouts/ArticleLayout.astro`, `src/pages/index.astro`, `src/styles/global.css`

**Intent**: The author dropped the `articles` nav item and the article's `< articles` back link:
home is the list of every article, so the wordmark is the one way back. The wordmark reads
`Janusz Majek` instead of `majusz`.

**Contract**: `nav` is empty until S-06 adds `about`; the header renders no `<nav>` while it is
empty. No page passes `current="articles"`. `ArticleLayout` starts with the title; the unused
`text-back` token is removed. The wordmark turns the accent on hover, like a home list title.
The home intro hides its "Janusz Majek" title visually (`Intro hideTitle`, `sr-only`) so the
name isn't shown twice; the page keeps its `h1`. `design.md` (type scale, Header, Home,
Article) and roadmap S-05 record the decision.

### Success Criteria:

#### Automated Verification:

- Unit tests pass, including the new `src/lib/articles.test.ts`: `npm test`
- Build passes with no articles: `npm run build`
- Built home shows the empty state: `grep -q "First transmission pending" dist/index.html`

#### Manual Verification:

- With `content/articles/` empty, `/` in dev shows the intro and the `LOG` rule with `> 0 entries. First transmission pending.`, in light and dark
- With temporary articles (copy `lab/content/side-projects.md` in twice with dates in two different years, plus two sharing a date; do not commit them), `/` shows years newest first, rows newest first, same-day titles A→Z, `n min` on each row, and each row opens its article
- On a narrow phone width the date and reading time share a line above the title; hovering a title turns it the accent
- The `articles` nav item is marked current on `/`; an article's `< articles` back link returns to the list

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Docs

### Overview

Record the order rule for the author and mark S-05's design items done.

### Changes Required:

#### 1. Author how-to

**File**: `content/README.md`

**Intent**: Tell the author where an article appears: on the home list, newest `date` first,
same-day articles by title A→Z; a future date is shown as written.

**Contract**: a short paragraph in the Publish section (or next to the properties step).

#### 2. Design doc

**File**: `context/foundation/design.md`

**Intent**: Mark "Home intro copy and whether it includes a photo — S-05" done (name title, one
line, no photo) and note the same-day title order under Layouts → Home. (The "Left for slices"
entry was struck through with Phase 1 step 4; still add the order note under Layouts → Home.)

**Contract**: "Left for slices" entry struck through with a "Done:" note, matching earlier ones.

#### 3. Agent guide

**File**: `AGENTS.md`

**Intent**: Keep the project map true: the home is no longer a placeholder and the home
components are used.

**Contract**: the `src/pages/` bullet (home renders intro + article list or empty state) and the
layouts bullet (`index.astro` uses `src/components/home/`); mention `src/lib/articles.ts`.

### Success Criteria:

#### Automated Verification:

- Tests and build still pass: `npm test && npm run build`

#### Manual Verification:

- README wording reads clearly to the author; design.md and AGENTS.md match what was built

---

## Testing Strategy

### Unit Tests:

- `src/lib/articles.test.ts`: date order, same-day title A→Z, case-insensitivity, future date
  first, no mutation, empty input.

### Integration Tests:

- `npm run build` with the empty collection, plus the `dist/index.html` grep for the empty state.

### Manual Testing Steps:

1. `npm run dev -- --background`; open `/` with no articles: intro + `LOG` teaser.
2. Add temporary articles (two years, one shared date); check order, years, reading times, links.
3. Check phone width and both themes; remove the temporary articles; `npx astro dev stop`.

## Performance Considerations

The home page renders every article once more at build time for its reading time. Build-only
cost, negligible at the PRD's expected volume.

## References

- Roadmap: `context/foundation/roadmap.md` → S-05
- Design: `context/foundation/design.md` → Layouts → Home, ASCII elsewhere
- Render pattern: `src/pages/[slug].astro:13-16`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Home page wiring

#### Automated

- [x] 1.1 Unit tests pass, including the new `src/lib/articles.test.ts`: `npm test` — a1fae1a
- [x] 1.2 Build passes with no articles: `npm run build` — a1fae1a
- [x] 1.3 Built home shows the empty state: `grep -q "First transmission pending" dist/index.html` — a1fae1a

#### Manual

- [x] 1.4 Empty `/` shows intro and `LOG` teaser in light and dark — a1fae1a
- [x] 1.5 Temporary articles: years and rows newest first, same-day A→Z, reading times, working links — a1fae1a
- [x] 1.6 Narrow width layout and accent hover — a1fae1a
- [x] 1.7 Nav current on `/`; article back link returns to the list — superseded: author dropped both (Changes Required → 4) — a1fae1a
- [x] 1.8 Header shows `Janusz Majek` and no nav, turns the accent on hover and leads home from an article; home shows no visible name title; articles start at the title — a1fae1a

### Phase 2: Docs

#### Automated

- [x] 2.1 Tests and build still pass: `npm test && npm run build`

#### Manual

- [x] 2.2 README, design.md and AGENTS.md read clearly and match what was built

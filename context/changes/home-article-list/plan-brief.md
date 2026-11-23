# Home Article List — Plan Brief

> Full plan: `context/changes/home-article-list/plan.md`

## What & Why

The home page is the site's only way to browse articles and the page every shared link lands
on (roadmap S-05; PRD US-01, FR-001–FR-003). It needs a short introduction and every article
newest first, and it has to look intentional with zero articles, since the site launches empty.

## Starting Point

`src/pages/index.astro` is a "Coming soon" placeholder. The `Intro`, `ArticleList` (year-grouped,
caller-sorted) and `EmptyState` (`LOG` teaser) components already exist to `design.md`, unused.
`content/articles/` is empty.

## Desired End State

`/` shows "Janusz Majek" with one plain sentence, then all articles grouped by year, newest
first, each with date and reading time; or `> 0 entries. First transmission pending.` under a
`LOG` rule when there are none.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Same-date order | Title A→Z (case-insensitive) | Deterministic without a new property; easy to explain to the author. |
| Future-dated articles | Shown as written | Publishing stays "add a .md and push", with no scheduled rebuilds. |
| Intro | Name title + one plain line, no photo | Matches design.md's title + paragraph; recruiters see who wrote it. |
| Intro copy | "I build software and write down what I learn doing it: notes on tools, code and the odd side project." | Starting draft; the author may rewrite in review. |
| Testing | Pure sort helper + Vitest; page via build + manual | Fits the existing Vitest setup and pins the tie-break rule. |
| `Entry.summary` | Dropped | The list never shows summaries. |

## Scope

**In scope:** sort helper + test, home page wiring, meta description, README/design/AGENTS docs.

**Out of scope:** photo, time-of-day dates, hiding future posts, summaries/tags/pagination in
the list, render tests, About/socials (S-06), theme toggle (S-07).

## Architecture / Approach

`index.astro`: `getCollection('articles')` → `newestFirst` (`src/lib/articles.ts`) →
`render(entry)` for `minutesRead` → `ArticleList` entries, or `EmptyState` when empty, below
`Intro`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Home page wiring | Tested order helper; real home with list or empty state | Non-empty list is only checked manually with temporary articles |
| 2. Docs | README order rule; design.md and AGENTS.md updated | Docs drifting from the built copy |

**Prerequisites:** S-01 and F-01 done (they are).
**Estimated effort:** one short session.

## Open Risks & Assumptions

- The intro sentence is a draft; final wording is the author's.
- Rendering every article on the home page at build time costs build time only.

## Success Criteria (Summary)

- An empty site shows the intro and the teaser, not an empty-looking page.
- With articles, the list is newest first by year, same-day by title, and every row opens its article.

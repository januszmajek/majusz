---
project: majusz
version: 1
status: draft
created: 2026-10-18
updated: 2026-10-30
prd_version: 3
main_goal: quality
top_blocker: time
milestone_id: v1-public-blog
milestone_seq: 1
milestone_status: open
---

# Roadmap: majusz

> Derived from `context/foundation/prd.md` (v3) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: v1 public blog** — Status: open

- **Intent:** majusz.com goes from placeholder to a working personal blog with a distinctive, consistent look: the author can publish an Obsidian note by adding a file, and a visitor from X or a job application lands on a home page with an introduction and the article list, plus About, socials and the repo, with articles rendered cleanly in their device theme.
- **Source materials:** `context/foundation/prd.md` (v3)
- **Done when:** every F-NN and S-NN below is `done`.
- **Scope anchors:** FR-001 – FR-011 (FR-008 removed in PRD v3, merged into FR-002), US-01, US-02, plus the visual-design line in §Vision and §Success Criteria. The game (FR-012, US-03) is explicitly the next milestone per the PRD; search (FR-013) and newsletter (FR-014) are deferred.

## Vision recap

The site exists to make the author start writing: a public place for articles beyond a private Obsidian journal, which doubles as proof of building things outside the day job for recruiters arriving from X or job applications. Publishing must stay as simple as adding a finished `.md` file and its images, and readers must never see raw or broken Obsidian syntax. The look is simple and clean, in the spirit of zthreee.com and stephango.com, but distinctive enough not to read as a generic blog template; the home page is the article list.

## North star

**S-01: Author adds a finished note and its images, and it appears as a live article page** — the core purpose is writing, and the PRD says publishing must work from day one; every other slice either displays articles or wraps the site around them.

> "North star" here means the smallest end-to-end slice whose delivery proves the product works — placed as early as its prerequisites allow, because everything else only matters if this does.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-01 | visual-direction | (foundation) the site's visual direction, page layouts (home, article, About) and navigation are decided, and the base design (type, colors for both themes, spacing, layout) is live on the existing pages | — | §Vision (visual reference), §Success Criteria (distinctive look), NFR contrast | done |
| S-01 | publish-first-article | author can add a note + images and see it as an article page with date and reading time | — | US-02, FR-011, FR-010 | done |
| S-02 | wikilinks-and-tags | visitor can follow wikilinks between published articles, sees unpublished ones as plain text, sees image embeds, and sees tags | S-01 | US-01, FR-009 | done |
| S-03 | callouts-code-tables | visitor can read callouts, highlights, syntax-highlighted code and tables as Obsidian shows them, with comments hidden | S-01, F-01 | US-01, FR-009 | proposed |
| S-04 | diagrams-and-math | visitor can read diagrams and math as Obsidian shows them, fast on a phone | S-01, F-01 | US-01, FR-009 | proposed |
| S-05 | home-article-list | visitor lands on a home page with a short introduction and all articles newest first, or a teaser empty state | S-01, F-01 | US-01, FR-001, FR-002, FR-003 | proposed |
| S-06 | about-socials-repo-links | visitor can open About, the author's active socials and the public GitHub repo from the navigation | F-01 | US-01, FR-004, FR-005, FR-006 | proposed |
| S-07 | theme-follows-device | visitor sees the site in their device's dark/light theme and can switch it | F-01 | US-01, FR-007 | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Publish and read | `S-01` → `S-02` → `S-03` → `S-04` | Quality bias: wikilink safety (no private leaks) right after the north star, heavier rendering last; joins Stream B at `S-03`. |
| B | Look and shell | `F-01` → `S-07` → `S-06` → `S-05` | Runs alongside Stream A from the start; the design is decided once, then inherited by every page. `S-05` joins Stream A at `S-01`. |

## Baseline

What's already in place in the codebase as of `2026-10-18` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** partial — static site with a placeholder home, a 404 page and one shared layout (`src/pages/`, `src/layouts/Layout.astro`); no article content, markdown extensions or UI component library yet.
- **Backend / API:** absent — by design; the site is static output.
- **Data:** absent — no article content yet; markdown files in the repo will be the only data.
- **Auth:** absent — forbidden by the PRD (no login, admin or accounts).
- **Deploy / infra:** present — Cloudflare Workers static assets on majusz.com, deployed on push to `master` by `.github/workflows/deploy.yml`; rollback drilled.
- **Observability:** partial — deploy-failure notifications only (commit `91e39ca`); visitor analytics forbidden by the PRD.
- **Note:** `README.md` is a bare title; FR-006 requires a presentable README before the repo is linked (covered by S-06).

## Foundations

Deploy is already present. Article content handling and the "no raw Obsidian syntax" check are introduced inside S-01, the first slice that needs them.

### F-01: Visual direction

- **Outcome:** (foundation) the site's visual direction, the layouts of the home, article and About pages, and the navigation are decided, and the base design (typography, colors for both themes, spacing, layout) is live on the existing placeholder and 404 pages. May span several sessions, each its own change under this item; F-01 is done when the last one lands.
- **Change ID:** visual-direction
- **PRD refs:** §Vision (visual references zthreee.com and stephango.com, distinctive look), §Success Criteria (one consistent, distinctive design), NFR "readable with sufficient contrast in both dark and light themes"
- **Unlocks:** S-03, S-04, S-05, S-06, S-07 — each builds its UI inside this design instead of inventing its own and being restyled later.
- **Prerequisites:** —
- **Parallel with:** S-01, S-02
- **Blockers:** —
- **Unknowns:**
  - The author's design direction, discussed until it's concrete enough to apply. — Owner: author. Block: no (settled while planning F-01).
  - Page layouts and navigation for home, article and About. — Owner: author. Block: no (settled while planning F-01).
- **Risk:** sequenced early because every page inherits it and a late redesign touches every slice. Scope cap: this sets the base design and layouts only; each slice still builds its own parts (callouts, code blocks, the home list) within it, so "remarkable" doesn't turn into open-ended polish against the time risk. If these sessions surface a new page or content type, it goes into the PRD and becomes its own slice; it is not built inside F-01.
- **Status:** done

## Slices

### S-01: Publish the first article

- **Outcome:** author can add a finished note (title, date and summary in its properties) plus its images, and it appears as its own article page showing the images, publish date and reading time, with no other manual step.
- **Change ID:** publish-first-article
- **PRD refs:** US-02, FR-011, FR-010
- **Prerequisites:** —
- **Parallel with:** F-01, S-06, S-07
- **Blockers:** —
- **Unknowns:**
  - How does a finished note and its images get added from a phone without adding a publish step? — Owner: author. Block: no.
  - What happens when a note is missing a required property (title/date/summary)? — Owner: author. Block: no.
- **Risk:** everything else consumes the articles this slice produces; it also sets the "never raw syntax" check that S-02–S-04 extend, and must keep publish-to-live within the 5-minute NFR. Runs alongside F-01 with plain styling; the article page picks up the base design when F-01 lands.
- **Status:** done

### S-02: Wikilinks and tags

- **Outcome:** visitor can follow a `[[wikilink]]` to another published article, sees a wikilink to an unpublished note as plain text, sees an image embed (`![[photo.png]]`) as the image, and sees the article's tags as Obsidian shows them.
- **Change ID:** wikilinks-and-tags
- **PRD refs:** US-01, FR-009
- **Prerequisites:** S-01
- **Parallel with:** F-01, S-03, S-04, S-05, S-06, S-07
- **Blockers:** —
- **Unknowns:** —
- **Risk:** this is the Business Logic rule ("nothing private leaks, nothing looks broken"); sequenced right after the north star because a wrong wikilink is a privacy and credibility failure, not a cosmetic one. Note embeds (`![[Other note]]`) stay out of v1 (PRD FR-009), so S-01's raw-syntax guard (`src/lib/markdown/obsidian-guard.ts`) must keep failing the build on them; only the image-embed and wikilink patterns leave the guard here.
- **Status:** done

### S-03: Callouts, code and tables

- **Outcome:** visitor can read callouts, highlights (`==mark==`), code blocks with syntax highlighting, and tables, displayed as Obsidian shows them, in both themes and on a phone; `%%comments%%` are hidden, as in Obsidian.
- **Change ID:** callouts-code-tables
- **PRD refs:** US-01, FR-009
- **Prerequisites:** S-01, F-01
- **Parallel with:** S-02, S-04, S-05, S-06, S-07
- **Blockers:** —
- **Unknowns:** —
- **Risk:** callouts are the most common Obsidian syntax that renders as raw text when unsupported; split from S-04 because these are light and the phone-speed risk lives elsewhere. S-01's raw-syntax guard checks text nodes one at a time, so a highlight split by inline formatting (`==**bold**==`) slips past it today; S-03's highlight support must cover that case. `%%comments%%` are hidden from the page but stay in the public repo's markdown, so they must never hold anything private.
- **Status:** proposed

### S-04: Diagrams and math

- **Outcome:** visitor can read diagrams and math displayed as Obsidian shows them, and the article is still readable on a phone in under 2 seconds.
- **Change ID:** diagrams-and-math
- **PRD refs:** US-01, FR-009
- **Prerequisites:** S-01, F-01
- **Parallel with:** S-02, S-03, S-05, S-06, S-07
- **Blockers:** —
- **Unknowns:** —
- **Risk:** the heaviest rendering features and the main threat to the 2-second phone NFR; last in Stream A so a page-weight problem can't hold up the rest. First candidate to trim if time runs short.
- **Status:** proposed

### S-05: Home page with the article list

- **Outcome:** visitor lands on a home page with a short, catchy introduction and all articles listed newest first, or a teaser empty state when none exist. There is no separate Blog page.
- **Change ID:** home-article-list
- **PRD refs:** US-01, FR-001, FR-002, FR-003
- **Prerequisites:** S-01, F-01
- **Parallel with:** S-02, S-03, S-04, S-06, S-07
- **Blockers:** —
- **Unknowns:**
  - Introduction copy and whether it includes a photo and/or name. — Owner: author. Block: no.
  - ~~Is the list flat (like stephango.com) or grouped by year or tag?~~ Resolved 2026-10-27: flat, newest first, grouped by year (`context/foundation/design.md`); no S-02 prerequisite.
- **Risk:** this is the page every shared link lands on and now the only way to browse articles; it must look intentional with zero articles, since the PRD accepts launching empty, and stay readable as the list grows.
- **Status:** proposed

### S-06: About, socials and repo links

- **Outcome:** visitor can open the About page, the author's actively used social profiles and the site's public GitHub repo from the navigation; the repo has a presentable README.
- **Change ID:** about-socials-repo-links
- **PRD refs:** US-01, FR-004, FR-005, FR-006
- **Prerequisites:** F-01
- **Parallel with:** S-01, S-02, S-03, S-04, S-05, S-07
- **Blockers:** —
- **Unknowns:**
  - Which social profiles count as actively used, and About page copy. — Owner: author. Block: no.
- **Risk:** linking the repo exposes code and history to recruiters, so the README and clean history are part of this slice, not an afterthought. The navigation and About page are built in F-01's design, so they aren't restyled later.
- **Status:** proposed

### S-07: Theme follows the device

- **Outcome:** visitor sees the site in their device's dark or light theme by default and can switch it manually, with readable contrast and keyboard access in both.
- **Change ID:** theme-follows-device
- **PRD refs:** US-01, FR-007
- **Prerequisites:** F-01
- **Parallel with:** S-01, S-02, S-03, S-04, S-05, S-06
- **Blockers:** —
- **Unknowns:**
  - Is the manual choice remembered across visits? Remembering it must not involve tracking cookies. — Owner: author. Block: no.
- **Risk:** F-01 defines both color schemes and already follows the device setting (inline head script, no storage); this slice adds the manual toggle and remembering the choice. Landing it right after F-01 means S-03–S-05 are checked against both themes from the start.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | visual-direction | Decide the visual direction and ship the base design | yes | Run `/10x-plan visual-direction`; starts with the design discussion |
| S-01 | publish-first-article | Publish an Obsidian note as an article page | yes | Run `/10x-plan publish-first-article` |
| S-02 | wikilinks-and-tags | Resolve wikilinks safely and show tags | no | Needs S-01 |
| S-03 | callouts-code-tables | Render callouts, highlighted code and tables | no | Needs S-01, F-01 |
| S-04 | diagrams-and-math | Render diagrams and math within the phone speed budget | no | Needs S-01, F-01 |
| S-05 | home-article-list | Home page with introduction, article list and empty state | no | Needs S-01, F-01 |
| S-06 | about-socials-repo-links | About page, social links, repo link and README | no | Needs F-01 |
| S-07 | theme-follows-device | Device dark/light theme with manual toggle | no | Needs F-01 |

## Open Roadmap Questions

1. ~~**Home article list: flat (like stephango.com) or grouped by year or tag?** (FR-002)~~ — Resolved 2026-10-27: flat, newest first, grouped by year (`context/foundation/design.md`).
2. **Game: does it keep any score or leaderboard?** Storing scores or player names would conflict with "no visitor data". — Owner: author. Block: none in this milestone (game milestone).

## Parked

- **Separate Blog / archive page** — Why parked: PRD v3 removed FR-008; the home page is the article list.
- **Game (FR-012, US-03)** — Why parked: PRD makes it the first milestone right after launch; opens as M-2.
- **Search (FR-013)** — Why parked: PRD defers it until roughly 15+ posts.
- **Newsletter (FR-014)** — Why parked: PRD defers it until there are a few articles; hosted service, no emails stored on the site.
- **CV link on About** — Why parked: PRD §Non-Goals, deferred past v1.
- **In-site editor, admin area or login** — Why parked: PRD §Non-Goals; publishing happens outside the site.
- **Visitor accounts, comments or reactions** — Why parked: PRD §Non-Goals; site is public and read-only, discussion happens on X.
- **Full Obsidian parity and plugin functionality** — Why parked: PRD §Non-Goals; only the FR-009 features.
- **RSS feed** — Why parked: PRD §Non-Goals; skipped entirely.
- **Multiple languages, other authors** — Why parked: PRD §Non-Goals.
- **Visitor statistics / analytics, cookie banner** — Why parked: PRD §Non-Goals (non-functional).

## Milestone History

## Done

- **F-01: (foundation) the site's visual direction, the layouts of the home, article and About pages, and the navigation are decided, and the base design (typography, colors for both themes, spacing, layout) is live on the existing placeholder and 404 pages. May span several sessions, each its own change under this item; F-01 is done when the last one lands.** — Archived 2026-10-27 → `context/archive/2026-10-18-visual-direction/`. Lesson: —.
- **S-01: author can add a finished note (title, date and summary in its properties) plus its images, and it appears as its own article page showing the images, publish date and reading time, with no other manual step.** — Archived 2026-10-30 → `context/archive/2026-10-27-publish-first-article/`. Lesson: —.
- **S-02: visitor can follow a `[[wikilink]]` to another published article, sees a wikilink to an unpublished note as plain text, sees an image embed (`![[photo.png]]`) as the image, and sees the article's tags as Obsidian shows them.** — Archived 2026-10-30 → `context/archive/2026-10-30-wikilinks-and-tags/`. Lesson: —.

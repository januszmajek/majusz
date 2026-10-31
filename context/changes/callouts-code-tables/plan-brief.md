# Callouts, code and tables — Plan Brief

> Full plan: `context/changes/callouts-code-tables/plan.md`

## What & Why

Roadmap S-03 (PRD FR-009, US-01): articles can use Obsidian callouts, `==highlights==`,
syntax-highlighted code and tables, shown as Obsidian shows them in both themes and on a phone,
with `%%comments%%` hidden. Today the raw-syntax guard forbids callouts, highlights and comments
outright, so the author can't use some of the most common Obsidian syntax at all.

## Starting Point

Tables already parse (GFM) but are unstyled and overflow on phones. Code is already highlighted
by Astro's default Shiki theme (`github-dark`), whose inline colors ignore the site palette and
light mode. Callouts, highlights and comments render raw and fail the build.

## Desired End State

All five syntaxes render in the Flight deck look in both themes, at desktop and 375px widths,
with no client JS. Comments never reach the page or the reading time. What still can't render
(an unclosed `%%`, a highlight split across formatting levels) fails the build naming the file.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Callout colors | Monochrome; type shown by icon and title | Keeps design.md's one-accent-per-theme rule. |
| Callout header | Lucide icon per type family + title (default: capitalized type) | Closest to Obsidian without color; icons as CSS masks, no SVG in markup. |
| Foldable callouts | Native `<details>` (`-` closed, `+` open) | Obsidian behaviour with zero JS and built-in accessibility. |
| Unknown callout type | Render as note, title from the type | Matches Obsidian; author can invent types. |
| Code theme | Custom Flight deck light/dark Shiki pair, CSS variables | Code looks part of the design; contrast tested ≥ 4.5:1 on `--card`. |
| Code extras | Highlighting only (no copy button, no label) | Stays static; matches Obsidian's reading view. |
| Unclosed `%%` | Fail the build | A typo can't silently truncate a published article. |
| Wide tables | Scrollable, focusable wrapper (hast plugin) | Page never scrolls sideways; the table keeps its semantics. |

## Scope

**In scope:** comments, highlight, callouts and table-scroll plugins; Shiki theme pair; prose
CSS for all five; guard updates; author how-to, design.md and AGENTS.md updates.

**Out of scope:** per-type callout colors; copy button, language label, line numbers, fence
titles; diagrams and math (S-04); note embeds; Obsidian plugin syntax.

## Architecture / Approach

Mdast pipeline becomes `comments → callouts → highlight → obsidianLinks → inlineTags →
readingTime → obsidianGuard`; hast becomes `imageWidth → tableScroll`. Comments run first and
work on source ranges, so they hide content across formatting and paragraphs before anything
resolves or counts it. Highlights pair `==` among siblings of one phrasing parent; the guard
checks each parent's text for highlights split across nesting levels. Shiki emits
`--shiki-light`/`--shiki-dark` variables, which `prose.css` switches via `.dark`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Comments and highlights | `%%` hidden everywhere, `==` as `<mark>`, guard backstop | Cross-node source-range removal leaving empty or broken containers |
| 2. Callouts | All types, titles, fold, nesting, monochrome look with icons | Splitting the title line from body inside the first paragraph |
| 3. Code, tables and docs | Flight deck code theme, scrollable tables, docs | Picking token hues that pass 4.5:1 on `--card` in both themes |

**Prerequisites:** S-01 and F-01 done (they are); S-02 done, so wikilinks in titles/cells work.
**Estimated effort:** ~2–3 sessions across 3 phases.

## Open Risks & Assumptions

- Assumes Sätteri's mdast context can remove and replace nodes across siblings with source
  positions as needed for comments; the probe showed the APIs exist, not the exact edge cases.
- Assumes Shiki accepts theme objects through `markdown.shikiConfig.themes` in this Astro version.
- Manual checks need a scratch note in `content/articles/`, which must be removed before commit.

## Success Criteria (Summary)

- A note using every S-03 syntax builds and reads cleanly in both themes on desktop and phone.
- No raw `[!type]`, `==`, `%%` or unthemed code appears on any page; comments never do.
- `npm test` (including the code-contrast test) and `npm run build` pass.

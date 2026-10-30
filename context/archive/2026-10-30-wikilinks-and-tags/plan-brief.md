# Wikilinks and Tags — Plan Brief

> Full plan: `context/changes/wikilinks-and-tags/plan.md`

## What & Why

Roadmap slice S-02. Articles written in Obsidian can link to each other, embed images and carry
tags, and readers see them as Obsidian shows them. A link to a note that isn't published shows as
plain text, so nothing private leaks and nothing looks broken (PRD FR-009, Business Logic).

## Starting Point

Any `[[wikilink]]` or `![[embed]]` fails the build today (`obsidian-guard.ts`). The site vault
writes markdown links (`useMarkdownLinks: true`), and a link between articles,
`[x](Other%20note.md)`, renders as a broken link. Property tags already show in the meta line.
There is no test runner.

## Desired End State

Wikilinks and relative `.md` links to published articles go to their page, with heading anchors.
Links to unpublished notes read as plain body text. `![[photo.png|300]]` shows the optimized
image. Inline `#tag` reads as a muted tag. Note embeds still fail the build. `npm test` (Vitest)
guards all of it in CI.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Resolution | File name, case-insensitive, optional `.md` | Same as Obsidian, so a link that works in the vault works on the site |
| Heading links | `/slug#heading` via github-slugger; text `Note > Heading` | Matches Obsidian and Astro's heading ids; a missing heading lands at the top, not broken |
| Published link text | As written (alias, else target) | What the author sees in Obsidian is what readers see |
| Unpublished link | Alias, else name, as body text; no warning | PRD's plain-text rule; README warns that the name is visible |
| `.md` markdown links | Same rules as wikilinks | Closes a broken-link hole the vault config creates |
| Inline `#tag` | Muted Iosevka span, not added to meta | Looks like Obsidian; the meta line stays the author's deliberate list |
| Meta-line tags | Unchanged (`· rust · obsidian`) | Author's choice; already designed |
| Sätteri `features.wikilinks` | Stays off; own mdast plugin | Built-in output can't tell a wikilink from a link and mangles embeds |
| Testing | Add Vitest + CI step | The privacy rule needs a regression net, reused by S-03/S-04 |

## Scope

**In scope:** wikilinks (alias, heading, same-page, block-ref to page), relative `.md` links,
image embeds with `|alt` and `|300`, inline tags, Vitest + CI, publish README, design.md and
AGENTS.md updates.

**Out of scope:** note embeds, block anchors, tag pages or links, resolution by title/aliases,
build warnings for unresolved links, dev-server live re-resolution.

## Architecture / Approach

A new mdast plugin `obsidian-links.ts` runs first. It uses an index of `content/articles/*.md`
(lowercase file name → article id, built with a slug helper shared with `generateId`) and splits
`[[…]]`/`![[…]]` text into link, text or image nodes. It also rewrites relative `.md` links. Image
nodes then flow through the existing `imageWidth` plugin and Astro's image pipeline. A small
`inline-tags.ts` plugin wraps `#tag`. The guard runs last as a safety net for unconsumed `[[` and
note embeds.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Test harness and links | Vitest + CI, shared slug rule, index, wikilinks and `.md` links | Index/URL slug drift → links to 404 |
| 2. Image embeds | `![[photo.png\|300]]` as optimized images; note embeds still fail | Inserted image nodes must reach Astro's image collection |
| 3. Inline tags and docs | `#tag` spans, README/design/AGENTS updates | Sätteri support for custom inline elements (`hName`) |

**Prerequisites:** S-01 done (it is).
**Estimated effort:** ~2–3 sessions across 3 phases.

## Open Risks & Assumptions

- Assumes Sätteri honors `data.hName`/`hProperties` for the tag span. If not, a hast plugin keyed
  on a marker is the fallback (named in the plan).
- An unaliased link to an unpublished note shows that note's name publicly. Only the README
  warning mitigates it.
- In the dev server, a page linking an article added later updates only on its next re-render.

## Success Criteria (Summary)

- A reader can click from one article to another, including to a heading, and never hits a broken
  link or sees `[[` syntax.
- A link to a private note is just words in the sentence.
- Embedded photos look the same as pasted ones, and inline tags read as tags.

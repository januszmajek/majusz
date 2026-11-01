# Diagrams and Math — Plan Brief

> Full plan: `context/changes/diagrams-and-math/plan.md`
> Research: `context/changes/diagrams-and-math/research.md`

## What & Why

Roadmap slice S-04 (PRD FR-009): a visitor can read diagrams and math as Obsidian 1.15 shows
them, and the article still reads on a phone in under 2 seconds. Today math reaches readers as
raw, escape-mangled text, which breaks the "never raw syntax" rule, and mermaid fences show as
code.

## Starting Point

The site uses the Sätteri pipeline with in-repo mdast plugins. Math parsing is off, and the guard
has no `$` pattern. Sätteri's math parser exists but is looser than Obsidian's: `$5 and $6` would
become a formula, and an unclosed `$$` swallows the rest of the article. `content/articles/` is
empty, so nothing published changes.

## Desired End State

- `$x$` and `$$…$$` render as MathML in Latin Modern Math, cut at build time to the glyphs
  actually used (about 8–20 KB, only on pages with math).
- ```` ```mermaid ```` fences render as inline SVG in the site's colours and Iosevka. They follow
  dark/light mode and scroll sideways on a phone, and internal links resolve like wikilinks.
- Source the site can't show faithfully fails the build, naming the file.
- No client JS is added.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Diagram renderer | Pele (Obsidian 1.15) | Sync, no DOM, themeable through CSS vars; matches FR-009's "latest Obsidian" | Research |
| `$` strictness | Match Obsidian: padded `$…$` and mid-paragraph `$$` stay text | The site must not show math where Obsidian shows text | Research |
| Wide diagrams on a phone | Scroll sideways in a region | Same as tables; stays legible | Research |
| Diagram internal links | Wikilink rule: published → URL, else plain text | No broken links, no private names leaked | Research |
| Math renderer | Temml (MathML) | Lightest; real, selectable text | Research |
| Math font | Latin Modern Math, subset per build to the glyphs used, versioned URL | ~8 KB instead of 120–400 KB; no publish step | Plan |
| Unclosed `$$` | Fail the build | Otherwise half the article becomes one formula | Plan |
| Invalid TeX or mermaid | Fail the build | Never ship a red error box | Plan |
| `$` that would re-pair after a rejection | Fail the build, suggest `\$` | Can't silently differ from Obsidian | Plan |
| Wide display math | Scroll region | One overflow rule across the site | Plan |
| TeX extensions | Core + mhchem + physics (all in Temml core) | `\ce`, `\dv`, `\abs` work | Plan |
| Diagram look | Site tokens + Iosevka, on the code-block surface | Native in both themes; exact text measuring | Plan |
| Testing | Plugin HTML tests + diagram contrast test | Logic, plus readability in both themes | Plan |

## Scope

**In scope:**
- `math.ts`, `diagrams.ts` (mdast) and the `math-font` Astro integration
- the vendored Latin Modern Math (GUST license)
- prose styles and diagram tokens
- tests
- updates to the README, design.md and AGENTS.md

**Out of scope:**
- client-side rendering, and zoom or pan
- math in diagram labels
- `\mathscr` roundhand
- in-place error rendering
- re-pairing `$` like Obsidian
- note embeds
- TeX `\href`

## Architecture / Approach

The mdast order is `comments → callouts → highlight → obsidianLinks → inlineTags → math →
diagrams → readingTime → obsidianGuard`.

- **`math.ts`** checks Obsidian's `$` rules against source positions and renders with Temml into
  raw `html` nodes. Display math goes in a scroll region.
- **`diagrams.ts`** catches `code[lang=mermaid]` before Shiki. It renders with Pele (a per-diagram
  `idPrefix`, natural width), rewrites `internal-link` anchors through `resolveNoteLink`, and adds
  an accessible name.
- **The `math-font` integration** serves the full font in dev. After the build, it collects glyphs
  from `<math>` in `dist/`, including the browser's math-italic code points, writes a subset with
  its MATH table checked, and versions its URL in the built CSS.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Math rendering | Obsidian-faithful `$` rules, Temml MathML, fail-fast errors, scroll region | Edge cases in the `$`-rule source checks (containers, escapes) |
| 2. Math font | Per-build Latin Modern Math subset, dev middleware, versioned URL | Missing glyphs on a real phone; Vite leaving the URL untouched |
| 3. Diagrams and docs | Pele SVG, themed and accessible, links resolved; docs updated | Pele is a day-old early-access release; token contrast in dark mode |

**Prerequisites:**
- S-01 and F-01 done (they are);
- GUST's `latinmodern-math.otf` downloaded and converted once;
- Obsidian 1.15 available to compare against.

**Estimated effort:** about 3 sessions, one per phase.

## Open Risks & Assumptions

- **Whole-paragraph `$$x$$`.** It's assumed that a paragraph made only of `$$x$$` is display math
  in Obsidian's reading view, and that `$$` inside a longer paragraph, even on its own line, is
  text. Phase 1's manual check compares this against Obsidian 1.15.
- **Pele 1.13.0** was published on 2026-10-31. It's pinned exactly; an upgrade is a deliberate
  change.
- **hb-subset's MATH glyph closure** is assumed to keep stretchy variants. The integration checks
  for the table, and real phones check the look.
- **Vite and the font URL.** Vite is expected to leave the absolute `/fonts/…` URL unresolved,
  with only a warning. If it fails the build instead, the `@font-face` moves to a `<style>` in the
  article layout.

## Success Criteria (Summary)

- A note with formulas and mermaid diagrams looks like it does in Obsidian 1.15, in both themes,
  on a phone.
- Nothing raw or broken reaches a reader: bad math or diagram source stops the build with the
  file named.
- A math page adds only a small font and no JS, so the 2 s phone budget holds.

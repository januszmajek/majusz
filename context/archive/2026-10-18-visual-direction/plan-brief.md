# Visual Direction (F-01) — Plan Brief

> Full plan: `context/changes/visual-direction/plan.md`
> Frame brief: `context/changes/visual-direction/frame.md`

## What & Why

> **The actual problem to plan around is**: the author can only make the direction concrete by
> seeing whole-site variants (typography, colors, signature motif and page structure together)
> side by side on realistic home-with-list and article pages, and F-01 currently asks for a
> decision in words, checked on placeholder pages that can't show the vibe.

Deciding the base design before S-03–S-07 still avoids restyling every slice later.

## Starting Point

A two-line placeholder home and 404 on plain Astro 7 with `system-ui`. Nothing about the
direction is recorded; React, Tailwind and shadcn are planned but not installed.

## Desired End State

The author has picked a direction by flipping through whole-site variants in a local lab, on
desktop and phone, in both themes. The pick is written down in `context/foundation/design.md`.
majusz.com shows the placeholder inside the new shell (fonts, palettes, nav, starfield), and
article, home-list and About layout components are ready for S-01, S-05 and S-06 to fill.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| How to converge | Side-by-side rendered variants, chosen by the author | The author decides by seeing, not by discussing | Frame |
| Comparison tool | Author's `/prototype` skill, with surface, scope and promote step overridden | Required by the author; its defaults would deploy borrowed content | Frame |
| Variant scope | Whole site per variant (home, article, About) | The whole look is judged together | Plan |
| Home states in lab | 0 / 2 / 12 articles | Proves launch-day empty state and a grown list | Plan |
| Round cap | None | Author's call; flagged as a time risk | Plan |
| Stack | React + Tailwind v4 + shadcn installed in Phase 1, before the lab | Winner is already in production form; each direction is judged against the shadcn look | Plan |
| Lab surface | Storybook-style separate app: `npm run lab` (port 4322), own config in `lab/`, variants framed in an iframe; tooling and original mock articles committed, variants gitignored; kept afterwards | Never in the main build; previews production layouts unchanged; reusable for later design work | Plan review |
| Round 1 directions | Proposed by Claude, edited by the author | Quick start while the author steers | Plan |
| Fonts | Self-hosted via Astro 7 `fonts` config | No visitor IP sent to Google, fast with preload | Plan |
| Starfield placement | Decided in the lab, with fixed performance rules | Placement is judged visually; the 2-second budget is not negotiable | Plan |
| What ships | Shell + tokens live; article/home/About layout components without routes | Slices only plug in content | Plan |
| Live home after F-01 | Placeholder inside the new shell | Intro and empty-state copy stay in S-05 | Plan |
| Theme | Follows device via `.dark` set before paint; no toggle | Toggle and memory stay in S-07 | Plan |

## Scope

**In scope:** stack install, design lab, exploration rounds, `design.md`, tokens for both
themes, self-hosted fonts, header/footer/nav/motif shell, prose styles, article / home-list /
empty-state / intro / prose-page components.

**Out of scope:** content pipeline and article routes (S-01), intro copy and sorting (S-05),
About route, socials, GitHub link, README (S-06), theme toggle (S-07), callouts/code/tables
(S-03), diagrams/math (S-04).

## Architecture / Approach

`lab/` is a separate Astro dev app (`lab/astro.config.mjs` reuses the main config with
`srcDir: './lab'`), started with `npm run lab` like Storybook. Its harness frames one variant
page at a time in an iframe and sets the theme on it; variants (`lab/variants/`, gitignored; the mock
stand-ins live in tracked `lab/content/`) are whole documents with their own Tailwind/shadcn
stylesheet; a "Baseline" control keeps its own copy of plain shadcn tokens. After the pick,
`design.md` is the contract; `src/styles/global.css` carries the tokens in shadcn's variable
names; `Layout.astro` becomes the shell; layout components live in `src/layouts/` and
`src/components/home/`. A "Shipped" lab variant renders the production components with the
stand-ins for a side-by-side check.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Stack install | React, Tailwind v4, shadcn; placeholder unchanged | Installer changes to tsconfig/config conflict with strict TS |
| 2. Design lab | `npm run lab` app with picker, page/home-state/theme switches, Baseline | Lab content leaking into the site build |
| 3. Exploration + record | Author's pick and `context/foundation/design.md` | No round cap; can eat the v1 window |
| 4. Ship base design | Tokens, fonts, shell, motif live on home and 404 | Starfield or fonts hurt the 2-second phone budget |
| 5. Page layouts | Article, home-list, empty state, intro, prose page components | Drifting from the picked variant |

**Prerequisites:** none; Phase 2 ships 2 original mock articles modeled on stephango.com clippings.
**Estimated effort:** ~4 sessions for Phases 1, 2, 4 and 5, plus as many exploration rounds as
the author wants in Phase 3.

## Open Risks & Assumptions

- No round cap: if exploration runs past ~2026-10-31, the 2026-11-08 v1 target gets tight for
  S-03, S-05, S-06 and S-07, which all wait on F-01.
- The chosen font must have a licence that allows self-hosting.
- Following the device theme moves from S-07 into F-01; S-07 shrinks to the toggle and memory.
- Lab tooling and mock content are committed, but variants live only on this machine; losing
  them loses the reference variants, while `design.md` stays the record.
- `/prototype` must be started by the author, with the overrides in Phase 3, step 2.

## Success Criteria (Summary)

- The author picked a direction by seeing it, and `design.md` describes it.
- majusz.com looks like that direction in both themes on desktop and phone, with no third-party
  font requests and no lab content in the build and no third-party article text in git.
- S-01, S-05 and S-06 can build pages by passing content into ready layouts.

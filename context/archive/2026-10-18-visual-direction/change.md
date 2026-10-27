---
change_id: visual-direction
title: Visual direction
status: archived
created: 2026-10-18
updated: 2026-10-27
archived_at: 2026-10-27T15:23:11Z
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

- 2026-10-20 (Phase 2): the author chose to track `lab/content/` with original mock articles
  modeled on two stephango.com clippings (same structure, own text), instead of keeping
  third-party stand-ins gitignored. Only `lab/variants/` stays ignored. `plan.md` and
  `plan-brief.md` were updated to match; the "nothing tracked" checks (2.2, 2.3, 3.2, 5.3)
  now cover `lab/variants/` only.
- 2026-10-27 (Phase 4): `Layout` takes an optional `current` prop (nav item `id`) on top of
  the planned `{ title?, description? }`, to set `aria-current` in the header. Phase 5 layouts
  pass it through. After the Phase 4 review: type scale as `text-<role>` tokens in
  `global.css`, `.prose` in `src/styles/prose.css`, theme script in `ThemeScript.astro`,
  motif logic in `src/components/site/motif/`.
- 2026-10-27 (Phase 4, second review): Fontsource ships Iosevka only as the whole font
  (~1 MB per face, ~4 MB per page), which broke the 2-second NFR. The author chose to subset
  it: `scripts/subset-fonts.mjs` (dev dependency `subset-font`) writes ~25 KB faces to
  `src/assets/fonts/`, loaded with Astro's local font provider instead of Fontsource
  (`design.md` updated). Also: Aile 400 preloaded, motif redraws capped at 30fps, sky sized
  to `100lvh`.
- 2026-10-27 (Phase 5): `ArticleList` entries take an optional `readingMinutes` beyond the
  planned `{ title, href, date, summary? }`, since `design.md` shows reading time on every
  row. `summary` is accepted but not shown (design's row is date · title · time).
- 2026-10-27 (full review): `src/components/ui/button.tsx` was added during exploration for the
  picked variant's theme toggle (lab-only). No production page uses it yet; it is kept for the
  S-07 toggle, which `design.md` specifies as a shadcn `Button` (ghost, icon).

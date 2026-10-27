---
change_id: visual-direction
title: Visual direction
status: impl_reviewed
created: 2026-10-18
updated: 2026-10-27
archived_at: null
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

# Site Performance — Plan Brief

> Full plan: `context/changes/site-performance/plan.md`
> Research: `context/changes/site-performance/research.md`

## What & Why

Moving between majusz.com's own pages should be instant, and a first visit on a phone must show
readable content in under 2 seconds without the first getting slower (roadmap S-08, PRD v4 NFRs).
Most readers arrive from X on phones, and the 2-second promise matters most when a post spreads.

## Starting Point

The first visit already passes (Lighthouse mobile 98-100, FCP 1.0-1.8 s), but every internal link
costs a `307` redirect, hashed CSS and fonts are revalidated on each page view, 16 font faces are
declared on every page, and an article's first image loads lazily. There is no prefetch and
nothing in CI checks the built pages.

## Desired End State

A click opens the next page at once: prerendered in Chrome, prefetched into a 60 s cache in Safari
and Firefox, no animation. No link redirects, hashed assets are cached for a year, pages declare 8
font faces with 3 preloaded, and the leading article image loads first. `npm run check:dist`
fails CI when links, headers, scripts, fonts or page-chrome budgets drift.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Instant nav in Chromium | Inline Speculation Rules, prerender `moderate` | Zero JS, instant click, nothing before first paint | Research |
| Instant nav in Safari/Firefox | Astro prefetch `viewport` + HTML `max-age=60` | Only way to skip the round trip without a client router; 60 s keeps the 5-min publish NFR | Plan |
| Client router / view transitions | None, no animation | ClientRouter adds first-visit weight; author wants no transition | Research / Plan |
| Redirect fix | `build.format: 'file'`, `trailingSlash: 'never'` | No link changes; fits the coming `/en/` `/pl/` routing | Research |
| Asset caching | `public/_headers`: `/_astro/*`, `/fonts/*` immutable 1 year | Hashed/versioned URLs never change | Research |
| Fonts | Keep Aile; both families 400 + 600 only; preload Iosevka 400, 600, Aile 400 | Half the files; everything on the first screen preloaded | Plan |
| Images | webp only, no source cap; first image near the top gets priority; `sizes` = column; widths ≤ 1400 | Publishing stays "add a file"; fixes the lazy LCP and desktop over-fetch | Plan |
| Guarding | `npm run check:dist` after build in CI; Lighthouse by hand | Deterministic CI; time regressions caught at phase checks | Plan |

## Scope

**In scope:**
- Build format, cache headers, Speculation Rules, Astro prefetch, theme script for prerender/bfcache
- Font weights 400/600 (design.md change), preloads, removing 8 font files
- Image priority/sizes hast plugin, breakpoints cap
- `tests/dist/` suite with link, header, navigation, font, image and budget checks; CI step
- Docs: AGENTS.md, infrastructure.md, design.md

**Out of scope:**
- ClientRouter, view transitions, AVIF, source image caps, Lighthouse CI
- Motif loop changes, CSS inlining, Early Hints, removing React integration
- Two languages (separate change)

## Architecture / Approach

Static output stays static. Workers static assets serve exact-URL `.html` files with headers from
`public/_headers`. `Layout.astro` carries an inline speculation rule and Astro's prefetch module;
the inline theme script re-applies itself on activation and bfcache restore. A Sätteri hast plugin
sets image priority and sizes before Astro's image marker. A separate Vitest config reads `dist/`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. No redirects, cached assets | Exact URLs, `_headers`, `dist/` link/header check in CI | `_headers` merge producing duplicate `Cache-Control` |
| 2. Instant navigation | Prerender in Chrome, prefetch elsewhere, theme-safe | Stale theme on a prerendered page |
| 3. Fonts at 400 and 600 | 8 faces, 3 preloads, design.md updated | Look change at 600 (wordmark) |
| 4. Images | Leading image eager/high, column `sizes`, widths ≤ 1400 | Plugin props not reaching Astro's image (verified in source) |
| 5. Budgets, measurement, docs | Budgets in `check:dist`, Lighthouse before/after, docs | Budgets too tight for future work |

**Prerequisites:** S-01 to S-07 done (they are); a real Android phone and iPhone for manual checks.
**Estimated effort:** ~3-4 sessions across 5 phases.

## Open Risks & Assumptions

- Safari/Firefox instant clicks depend on the link being visible long enough to prefetch; a very
  fast tap right after load still waits one edge round trip (~100 ms).
- `content/articles/` is empty, so article checks in CI skip until the first article; mock articles
  are used for measurement only.
- Assumes `wrangler dev` applies `_headers` like production; the production curl in 1.7 confirms.

## Success Criteria (Summary)

- Clicking between home, About and an article feels instant on Chrome Android and iPhone Safari.
- Heavy mock article: FCP ≤ 1.8 s, LCP ≤ 2.0 s on Lighthouse mobile; home and About no worse.
- CI fails if a link redirects, caching drifts, JS/hydration appears, or the page chrome grows.

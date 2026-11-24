# Site Performance Implementation Plan

## Overview

Make moving between majusz.com's own pages instant and the first visit lighter, without adding
weight before first paint or a publish step (roadmap S-08, PRD v4 NFRs at
`context/foundation/prd.md:185-186`). Chromium prerenders the next page through inline
Speculation Rules; Safari and Firefox get Astro's viewport prefetch plus a 60-second browser cache
on HTML. The first visit loses the redirect on every internal link, revalidation of hashed
assets, half the font files and the lazy-loaded LCP image. A `dist/` check in CI keeps it that
way, also for the coming two-language routing.

## Current State Analysis

From `context/changes/site-performance/research.md` (measured 2026-11-24):

- Lighthouse mobile: prod home FCP 1.0 s / LCP 1.3 s, `/about` 1.1 s / 1.4 s, heavy mock article
  (local) 1.8 s / 2.2 s. TBT 0, CLS 0. The first visit already meets the 2-second NFR for text;
  image-led articles sit near the limit.
- Every internal link (`/about`, `/<slug>`, wikilinks) gets `307 → /…/` because the build emits
  `about/index.html` and Workers' default `html_handling` adds the slash (~800 ms on `/about`).
- `/_astro/*` (CSS, fonts) and HTML are all `public, max-age=0, must-revalidate`; no
  `public/_headers`.
- No prefetch, no Speculation Rules, no client router. Pages ship no external JS; three inline
  scripts (theme, motif, toggle).
- 16 font faces (Iosevka and Aile × 400/500/600/700 × normal/italic), 32 inline `@font-face`
  rules (~7 KB) in every page's `<head>`. Two preloads (Iosevka 400, Aile 400); the header's 600
  and 700 are found late.
- Markdown images: webp srcset, all `loading="lazy"` including the first, `sizes` from the image
  width (`100vw` below it) while the prose column is ~41.5rem.
- CI (`.github/workflows/deploy.yml:27-41`): `npm test` → `npm run build` → 20 MB file check →
  deploy. Nothing checks the built pages.

## Desired End State

- A click on any internal link in Chrome (desktop and Android) shows the next page at once
  (prerendered); in Safari and Firefox a visible link's page is already in the HTTP cache, so the
  click renders without a network wait. No navigation animation.
- No internal link answers with a redirect; hashed assets are cached for a year; HTML is fresh
  within 60 s of a deploy.
- Each page declares 8 font faces (400/600 × normal/italic × 2 families) and preloads three:
  Iosevka 400, Iosevka 600, Aile 400.
- An article's first image near the top loads eagerly at high priority; images request a variant
  sized to the column, never 2048w for a 664 px slot.
- `npm run check:dist` (after `npm run build`, also in CI) fails on: an internal link without a
  matching file, wrong cache rules, any hydration or unexpected JS, more than three preloads or
  eight faces, and `<head>`/CSS/JS over budget.
- Lighthouse mobile on the heavy mock article: FCP ≤ 1.8 s and LCP ≤ 2.0 s; home and About no
  worse than today.

### Key Discoveries:

- `astro/dist/assets/internal.js:104-125` (Astro 7.3.8): `getImage` honours `priority`
  (→ `loading=eager`, `decoding=sync`, `fetchpriority=high`) and keeps a provided `sizes`
  (`sizes ||=`). The Sätteri image marker passes every `<img>` property to `getImage`
  (`@astrojs/markdown-satteri/dist/satteri-processor.js:100-115`), so a hast plugin can set both.
- With `build.format: 'file'`, `Astro.url.pathname` ends in `.html` during the build;
  `src/components/site/SiteHeader.astro:10-11` compares paths and must handle it.
- Cloudflare `_headers` rules that match the same path are merged (values comma-joined); a later
  rule removes an inherited header with `! Cache-Control` before setting its own.
- `src/lib/markdown/image-width.ts` is the pattern for a hast plugin that edits `<img>` before
  Astro's marker; `src/lib/markdown/table-scroll.test.ts` is the pattern for testing one through
  `createSatteriMarkdownProcessor`.
- `src/lib/markdown/shiki/flight-deck.ts:44` asks for `bold` (700); with only 600 present the
  browser picks 600 (nearest heavier face), no synthesis.

## What We're NOT Doing

- No ClientRouter and no View Transitions (no navigation animation, author's choice).
- No AVIF, no cap on source image size or dimensions; the existing 20 MB CI check stays the only
  size guard (publishing stays "add a file").
- No Lighthouse in CI; Lighthouse runs by hand at phase verification and its numbers are recorded
  in the plan.
- No above-the-fold detection for images: priority goes to the first image only when it is among
  the first three top-level blocks of the article body; later images stay lazy.
- No change to the motif's 30 fps loop, no CSS inlining (`build.inlineStylesheets` stays default),
  no Early Hints, no removal of the `react()` integration or the unused `client.*.js`.
- No dropping Iosevka Aile; no two-language routing (separate future change).
- No `wrangler deploy`; deploy stays push-to-master.

## Implementation Approach

Configuration first (phase 1), because it removes the biggest per-click costs and the redirect
would otherwise waste every prefetch. Navigation next (phase 2), then the page-weight work (fonts,
images). The `dist/` check starts in phase 1 with link and header assertions and grows a budget
section in phase 5, set from numbers measured after phases 1-4. Measurements use the research
method: a scratchpad copy of the repo with the `lab/content/` mock articles and realistic photos
in `content/articles/` (never committed), built and served with `npx astro preview`, Lighthouse 12
mobile preset with simulated throttling.

## Critical Implementation Details

- **Header merging:** `/*` sets HTML's `Cache-Control: public, max-age=60`; `/_astro/*` and
  `/fonts/*` must first detach it (`! Cache-Control`) and then set
  `public, max-age=31536000, immutable`, or hashed files get both values.
- **Prerender and the theme:** a prerendered page runs the head theme script at prerender time.
  Re-apply the theme on `prerenderingchange` and on `pageshow` with `persisted` (bfcache), so a
  toggle between prerender and activation never shows the old theme. The script stays inline,
  first in `<head>`, before paint.
- **Prefetch needs fresh HTML:** Astro's Safari/Firefox fallback is `fetch()` into the HTTP cache;
  it only saves the round trip while the HTML is within `max-age`, which is why phase 1's 60 s
  rule comes before phase 2.

## Phase 1: No redirects, cached assets

### Overview

Serve every page at its link's exact URL and give hashed assets a long cache, and add the `dist/`
check that guards both.

### Changes Required:

#### 1. Build format

**File**: `astro.config.mjs`

**Intent**: Emit `about.html`, `<slug>.html` instead of `about/index.html`, so Workers serves
`/about` with no redirect and every existing link stays as written.

**Contract**: `build: { format: 'file' }`, `trailingSlash: 'never'`. `index.html` and `404.html`
stay at the root; `prerenderConflictBehavior: 'error'` unchanged.

#### 2. Current-page matching

**File**: `src/components/site/SiteHeader.astro`

**Intent**: Keep `aria-current="page"` working when the build pathname is `/about.html`.

**Contract**: the build pathname carries the extension (`/about.html`, home `/index.html`);
normalise with `pathname.replace(/(\/index)?\.html$/, '') || '/'` and then the existing
trailing-slash strip (dev serves `/about`) before comparing to `item.href`; update the comment at
lines 10-11.

#### 3. Cache headers

**File**: `public/_headers` (new)

**Intent**: HTML cached 60 s in the browser (fresh well inside the 5-minute publish NFR, long
enough for prefetch); hashed `/_astro/*` and the `?v=`-versioned `/fonts/*` cached for a year.

**Contract**:
```
/*
  Cache-Control: public, max-age=60

/_astro/*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable
```
Favicons fall under `/*` (60 s). Never `no-store` (bfcache).

#### 4. `dist/` check

**Files**: `tests/dist/links.test.ts`, `tests/dist/headers.test.ts`, `vitest.config.ts` (new),
`vitest.dist.config.ts` (new), `package.json`

**Intent**: A Vitest suite that reads the built `dist/` and fails when an internal link would
redirect or 404, or when the cache rules drift. Separate from `npm test`, which runs before the
build in CI.

**Contract**: script `check:dist` = `vitest run --config vitest.dist.config.ts` (includes
`tests/dist/**/*.test.ts` only; fails with a clear message if `dist/` is missing). There is no
Vitest config today and Vitest's default include would pick up `tests/dist/**`, so `npm test`
(which CI runs before the build) gets a `vitest.config.ts` with `include: ['src/**/*.test.ts']`,
the scope AGENTS.md already documents. Links: every same-origin `<a href>` in every
`dist/**/*.html` (ignoring `#…`, external, `mailto:`; `<link>`/`<script>` sources are not links)
maps to an existing file (`/` → `index.html`, `/x` → `x.html`, `#fragment` stripped) and none
ends in `/` or `.html`. Headers: `dist/_headers` exists and parses to the three rules above.

#### 5. CI

**File**: `.github/workflows/deploy.yml`

**Intent**: Run the `dist/` check right after the build, before the size check and deploy.

**Contract**: new step `- run: npm run check:dist` after `- run: npm run build`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass and do not include `tests/dist/`: `npm test`
- Build passes and emits `dist/about.html` and `dist/_headers`: `npm run build`
- `dist/` check passes: `npm run check:dist`
- `dist/` check fails on a deliberate break (a link written as `/about/`), then passes again

#### Manual Verification:

- `npx wrangler dev` (local, no deploy): `curl -sI localhost:8787/about` is `200` with
  `max-age=60`; `/about/` and `/about.html` answer `307 → /about`; a `/_astro/*.css` URL carries
  `max-age=31536000, immutable` only once
- Nav highlights `about` on the About page in `npm run dev` and in the built site
- After the push deploys: `curl -sI https://majusz.com/about` is `200`, no `307`; a new deploy is
  visible within 60 s on a second load

**Implementation Note**: After completing this phase and all automated verification passes, pause
here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Phase 2: Instant navigation

### Overview

Prerender likely next pages in Chromium, prefetch visible links everywhere else, and keep the
theme right on prerendered and bfcache-restored pages.

### Changes Required:

#### 1. Speculation Rules

**File**: `src/layouts/Layout.astro`

**Intent**: Chromium prerenders a same-origin page as the reader moves toward its link
(`moderate`: hover on desktop, viewport heuristics on mobile), so the click is instant. Zero JS;
other browsers ignore it.

**Contract**: an inline `<script type="speculationrules">` in `<head>` after the fonts:
```json
{ "prerender": [{ "where": { "and": [
    { "href_matches": "/*" },
    { "not": { "href_matches": "/_astro/*" } },
    { "not": { "href_matches": "/fonts/*" } },
    { "not": { "selector_matches": "[rel~=nofollow],[data-no-prerender]" } }
  ] }, "eagerness": "moderate" }] }
```
No `prefetch` rule (Astro's prefetch covers it; avoids double fetches).

#### 2. Astro prefetch

**File**: `astro.config.mjs`

**Intent**: Safari and Firefox fetch the HTML of every link in the viewport during idle time, so a
click is served from the 60 s HTTP cache.

**Contract**: `prefetch: { prefetchAll: true, defaultStrategy: 'viewport' }`. Astro degrades to
`tap` on Save-Data/2G on its own. The prefetch module is the only external script on any page.

#### 3. Theme under prerender and bfcache

**File**: `src/components/site/ThemeScript.astro`

**Intent**: Re-apply the stored or device theme when a prerendered page is activated and when a
page is restored from bfcache.

**Contract**: inside the existing IIFE, after `apply()`: listen once for `prerenderingchange`
when `document.prerendering`, and for `pageshow` with `event.persisted`. Existing `matchMedia` and
`storage` listeners unchanged. Update the header comment.

#### 4. `dist/` check

**File**: `tests/dist/navigation.test.ts`

**Intent**: Guard the navigation setup.

**Contract**: every page has exactly one `script[type=speculationrules]` whose JSON has a
`prerender` rule with `eagerness: "moderate"`; no `astro-island` and no `client:` hydration
markers; the only external `<script src>` is Astro's prefetch module.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Build passes: `npm run build`
- `dist/` check passes: `npm run check:dist`

#### Manual Verification:

- Chrome desktop, DevTools → Application → Speculative loads: hovering `about` prerenders it;
  the click is instant
- Chrome Android (real phone): scrolling the home list prerenders article pages; tapping opens
  them at once
- iPhone Safari: tapping a visible link opens without a visible load (prefetched); no flash
- Theme: open home, let `/about` prerender, toggle the theme, click `about`: About shows the new
  theme; Back restores home in the new theme (bfcache, DevTools → Back/forward cache: eligible)
- Reduced motion and the motif: a prerendered page's motif starts on activation, not before

**Implementation Note**: After completing this phase and all automated verification passes, pause
here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Phase 3: Fonts at 400 and 600

### Overview

Cut both families to 400 and 600 (normal and italic) and preload the three faces every page shows
first.

### Changes Required:

#### 1. Design contract

**File**: `context/foundation/design.md`

**Intent**: Record the new weights before changing the look (AGENTS.md: change the doc first).

**Contract**: Typography: weights 400 and 600, normal and italic; preloaded Iosevka 400,
Iosevka 600, Aile 400. Scale table: wordmark 700 → 600; nav current 500 → 600; Layouts → Header:
"foreground color and medium weight only" → semibold; Layouts → Tables: header row "at medium
weight" → semibold.

#### 2. Weights in CSS and markup

**Files**: `src/styles/global.css`, `src/components/site/SiteHeader.astro`, `src/styles/prose.css`

**Intent**: No rule asks for 500 or 700.

**Contract**: `--text-wordmark--font-weight: 600` (`global.css:49`); nav current `font-medium` →
`font-semibold` (`SiteHeader.astro:27`); table header `font-medium` → `font-semibold`
(`prose.css:153`). Shiki's `bold` stays (resolves to 600).

#### 3. Font registration and files

**Files**: `astro.config.mjs`, `scripts/subset-fonts.mjs`, `src/assets/fonts/`

**Intent**: Register and keep only the 400 and 600 faces.

**Contract**: the `iosevka()` helper's weights `[400, 600]`; `WEIGHTS` in `subset-fonts.mjs`
`[400, 600]`; delete `*-500-*.woff2` and `*-700-*.woff2` (8 files). `LICENSE.md` unchanged.

#### 4. Preloads

**File**: `src/layouts/Layout.astro`

**Intent**: Preload what the first screen of every page uses: Iosevka 400 (meta, list, nav),
Iosevka 600 (wordmark, titles), Aile 400 (intro, summary, body).

**Contract**: `<Font cssVariable="--font-iosevka" preload={[{weight:'400',style:'normal'},{weight:'600',style:'normal'}]} />`;
Aile unchanged. Update the comment at lines 31-32.

#### 5. `dist/` check

**File**: `tests/dist/fonts.test.ts`

**Intent**: Guard the font set.

**Contract**: per page, at most 8 `@font-face` rules with a `/_astro/fonts/` source, no
`font-weight` 500 or 700 among them, and exactly 3 `rel=preload as=font` links.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Build passes: `npm run build`
- `dist/` check passes: `npm run check:dist`
- `src/assets/fonts/` holds exactly 8 Iosevka woff2 files plus `math/` and `LICENSE.md`

#### Manual Verification:

- Header, titles, h2/h3, `strong`, callout titles, table headers look right at 600 in both
  themes, desktop and phone
- Code blocks with bold/italic tokens render without faux bold or faux italic

**Implementation Note**: After completing this phase and all automated verification passes, pause
here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Phase 4: Images

### Overview

Give an article's leading image high priority and make every full-width image request a variant
that fits the column.

### Changes Required:

#### 1. Image priority and sizes plugin

**File**: `src/lib/markdown/image-priority.ts` (new), wired in `astro.config.mjs` `hastPlugins`
after `imageWidth`

**Intent**: The first `<img>` that sits in one of the first three top-level blocks of the article
body gets `priority` (Astro turns it into `loading=eager`, `decoding=sync`, `fetchpriority=high`).
Every `<img>` without an explicit width (no `|300`) gets `sizes` for the prose column. Relative
imports only (AGENTS.md).

**Contract**: sets the hast properties `priority: true` and
`sizes: "(min-width: 46rem) 41.5rem, calc(100vw - 2.5rem)"`; never touches an image that already
has `width` from `imageWidth`, beyond priority. One priority image per document at most. State is
per document: export a factory (`() => plugin`, as Astro's heading-ids plugin in
`node_modules/@astrojs/markdown-satteri/dist/satteri-processor.js:67-90`), never a module-level
flag, which leaks across files. "Block position" is the index of the image's top-level ancestor
among the document root's children; indices 0-2 qualify. Verified in a scratch build: the props
reach `getImage` and no stray `priority` attribute is emitted.

#### 2. Widths cap

**File**: `astro.config.mjs`

**Intent**: Stop generating variants no reader can use (column ~664 px; 2× desktop ≈ 1328,
3× phone ≈ 1170).

**Contract**: `image.breakpoints: [640, 750, 828, 1080, 1280, 1400]`.

#### 3. Tests

**Files**: `src/lib/markdown/image-priority.test.ts`, `tests/dist/images.test.ts`

**Intent**: Pin the rule and the built result.

**Contract**: unit (Sätteri processor, as in `table-scroll.test.ts`): first image in block 1 gets
`priority`; an image first appearing in block 4 gets none; only one priority per document; a
`|300` image keeps its width and gets no column `sizes`. `dist/`: no `<img>` in any page has a
srcset width above 1400 except an image's own original when smaller; at most one
`fetchpriority="high"` per page. Skips cleanly when no article exists (`content/articles/` is
empty today).

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Build passes: `npm run build`
- `dist/` check passes: `npm run check:dist`

#### Manual Verification:

- In the scratchpad copy with mock articles: the heavy article's first image is `eager` +
  `fetchpriority=high`, later ones `lazy`; desktop DevTools shows a ≤1400w variant chosen for
  the column
- Lighthouse mobile on the heavy mock article: no "LCP image was lazily loaded" warning

**Implementation Note**: After completing this phase and all automated verification passes, pause
here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Phase 5: Budgets, measurement and docs

### Overview

Lock the measured weight in as budgets, record before/after numbers, and document the new rules.

### Changes Required:

#### 1. Budgets

**File**: `tests/dist/budgets.test.ts`

**Intent**: Fail the build when the chrome of a page grows, so later work (two languages)
inherits the limits.

**Contract**: budgets set from the values measured after phase 4 plus ~15% headroom, written as
named constants at the top of the file with the measured value in a comment: `<head>` raw bytes
per page; total CSS brotli bytes per page; total external JS brotli bytes per page (prefetch
module only); count of preloads (3) and font faces (8). HTML body size is not budgeted (it grows
with the article).

#### 2. Measurement record

**File**: `context/changes/site-performance/plan.md` (this file, Progress notes)

**Intent**: Before/after Lighthouse numbers for home, About and the heavy mock article, using the
research method, so the result is checked against the NFRs.

**Contract**: a short table under Phase 5's Progress rows: FCP, LCP, Speed Index, weight.

#### 3. Docs

**Files**: `AGENTS.md`, `context/foundation/infrastructure.md`, `context/foundation/design.md`,
`content/README.md` (only if image advice changes)

**Intent**: Future agents know the rules.

**Contract**: AGENTS.md Commands: `npm run check:dist` after build (CI runs it); Project Structure:
`public/_headers` cache policy, `build.format: 'file'` (links never end in `/`), Speculation
Rules + prefetch in `Layout.astro`, `tests/dist/`. infrastructure.md: cache headers and the 60 s
HTML freshness. design.md: navigation has no transition animation.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Build passes: `npm run build`
- `dist/` check passes, budgets included: `npm run check:dist`
- A budget fails on a deliberate break (an extra preload), then passes again

#### Manual Verification:

- Lighthouse mobile, heavy mock article: FCP ≤ 1.8 s, LCP ≤ 2.0 s; home and About no worse than
  the baseline (FCP 1.0/1.1 s, LCP 1.3/1.4 s on prod)
- Production after deploy: clicks between home, About and an article feel instant on Chrome
  Android and iPhone Safari

**Implementation Note**: After completing this phase and all automated verification passes, pause
here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `image-priority.test.ts`: block position rule, one priority per document, `|300` images.

### Integration Tests:

- `tests/dist/*.test.ts` over the built site: links resolve without redirects, `_headers` rules,
  speculation rules present, no hydration, font set, image widths and priority, budgets.

### Manual Testing Steps:

1. `npx wrangler dev`: curl status and cache headers for `/about`, `/about/`, `/_astro/*`.
2. Chrome desktop and Android: speculative loads panel, instant clicks.
3. iPhone Safari: instant clicks on visible links.
4. Theme toggle after a prerender; Back/forward cache eligibility.
5. Lighthouse mobile before/after on the scratchpad copy with mock articles.

## Performance Considerations

Every change here runs after first paint (prerender, prefetch) or removes work before it (no
redirect, no revalidation, fewer faces, an eager LCP image). The only first-visit addition is
Astro's prefetch module (~1.5 KB gz, loaded as a module, not render-blocking). Prefetch data cost
on a phone is bounded by the visible links (~5-10 KB each); the browser and Astro back off under
Save-Data.

## Migration Notes

- URLs do not change: `/about` and `/<slug>` stay; `/about/` now redirects to `/about` instead of
  the reverse. No external links point at slashed URLs today (no articles are published).
- Rollback: revert the commits; the deploy pipeline redeploys. No data to migrate.

## References

- Related research: `context/changes/site-performance/research.md`
- Hast plugin pattern: `src/lib/markdown/image-width.ts:13-28`
- Plugin test pattern: `src/lib/markdown/table-scroll.test.ts`
- Astro image options: `node_modules/astro/dist/assets/internal.js:104-125`
- Cloudflare headers: https://developers.cloudflare.com/workers/static-assets/headers/
- Speculation Rules: https://developer.chrome.com/docs/web-platform/prerender-pages
- Astro prefetch: https://docs.astro.build/en/guides/prefetch/

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: No redirects, cached assets

#### Automated

- [x] 1.1 Unit tests pass: `npm test` — c09b947
- [x] 1.2 Build passes and emits `dist/about.html` and `dist/_headers` — c09b947
- [x] 1.3 `dist/` check passes: `npm run check:dist` — c09b947
- [x] 1.4 `dist/` check fails on a deliberate break (a link written as `/about/`), then passes again — c09b947

#### Manual

- [ ] 1.5 `wrangler dev`: `/about` 200 with 60 s cache, slashed and `.html` URLs redirect to it, `/_astro/*` immutable once
- [ ] 1.6 Nav highlights `about` on the About page in dev and in the build
- [ ] 1.7 Production: `/about` is 200 with no 307; a new deploy is visible within 60 s

### Phase 2: Instant navigation

#### Automated

- [x] 2.1 Unit tests pass: `npm test` — 7bb0437
- [x] 2.2 Build passes: `npm run build` — 7bb0437
- [x] 2.3 `dist/` check passes: `npm run check:dist` — 7bb0437

#### Manual

- [ ] 2.4 Chrome desktop: hovering `about` prerenders it; the click is instant
- [ ] 2.5 Chrome Android: scrolling the home list prerenders articles; taps open at once
- [ ] 2.6 iPhone Safari: tapping a visible link opens without a visible load
- [ ] 2.7 Theme toggled after a prerender shows on the activated page and on Back (bfcache eligible)
- [ ] 2.8 A prerendered page's motif starts on activation

### Phase 3: Fonts at 400 and 600

#### Automated

- [x] 3.1 Unit tests pass: `npm test`
- [x] 3.2 Build passes: `npm run build`
- [x] 3.3 `dist/` check passes: `npm run check:dist`
- [x] 3.4 `src/assets/fonts/` holds exactly 8 Iosevka woff2 files plus `math/` and `LICENSE.md`

#### Manual

- [ ] 3.5 600 weights look right in header, titles, headings, `strong`, callouts, tables, both themes
- [ ] 3.6 Code blocks show no faux bold or faux italic

### Phase 4: Images

#### Automated

- [ ] 4.1 Unit tests pass: `npm test`
- [ ] 4.2 Build passes: `npm run build`
- [ ] 4.3 `dist/` check passes: `npm run check:dist`

#### Manual

- [ ] 4.4 Mock heavy article: first image eager and high priority, later lazy; ≤1400w variant on desktop
- [ ] 4.5 Lighthouse: no "LCP image was lazily loaded" warning

### Phase 5: Budgets, measurement and docs

#### Automated

- [ ] 5.1 Unit tests pass: `npm test`
- [ ] 5.2 Build passes: `npm run build`
- [ ] 5.3 `dist/` check passes, budgets included: `npm run check:dist`
- [ ] 5.4 A budget fails on a deliberate break (an extra preload), then passes again

#### Manual

- [ ] 5.5 Lighthouse mobile: heavy article FCP ≤ 1.8 s and LCP ≤ 2.0 s; home and About no worse than baseline
- [ ] 5.6 Production: clicks between pages feel instant on Chrome Android and iPhone Safari

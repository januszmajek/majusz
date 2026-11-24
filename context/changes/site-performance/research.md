---
date: 2026-11-24T18:00:10+01:00
researcher: Claude (Opus 5.5)
git_commit: 319181980f9acaf2e3a00b3c49ad750c58b431a3
branch: master
repository: januszmajek/majusz
topic: "Instant page-to-page navigation and a sub-2-second first visit (S-08)"
tags: [research, codebase, performance, navigation, speculation-rules, caching, fonts, images, cloudflare-workers]
status: complete
last_updated: 2026-11-24
last_updated_by: Claude (Opus 5.5)
---

# Research: Instant page-to-page navigation and a sub-2-second first visit (S-08)

**Date**: 2026-11-24T18:00:10+01:00
**Researcher**: Claude (Opus 5.5)
**Git Commit**: 3191819 (local, not yet pushed, so no permalinks)
**Branch**: master
**Repository**: januszmajek/majusz

## Research Question

Roadmap S-08 / PRD v4 NFRs (`context/foundation/prd.md:185-186`): moving between the site's own
pages (home, articles, About) should feel instant, with no visible loading, and a first visit on a
phone with an average mobile connection must show readable content in under 2 seconds; the first
must not slow the second. Which techniques achieve this on this static Astro 7 site on Cloudflare
Workers static assets, what does the site cost today, and what constrains the choice (images,
fonts, theme script, no-JS rules, publishing stays "add a `.md` file")?

## Summary

1. **The first visit already passes.** Lighthouse mobile (simulated slow 4G, 4x CPU) scores
   98-100 on every page: production home FCP 1.0 s / LCP 1.3 s, `/about` FCP 1.1 s / LCP 1.4 s,
   a heavy mock article (images, math, mermaid) FCP 1.8 s / LCP 2.2 s locally. TBT 0, CLS 0. Text
   is readable under 2 s everywhere; the only page near the limit is an article whose first
   element is an image, and that is because the image is lazy-loaded.
2. **Two delivery defects cost more than any navigation trick would save**, and both hit every
   click:
   - **Every internal link redirects.** Links are written `/about`, `/<slug>`; the build emits
     `about/index.html` (default `build.format: 'directory'`), and Workers' default
     `html_handling: auto-trailing-slash` answers `307 → /about/`. Lighthouse estimates 800 ms on
     `/about`.
   - **Hashed assets are revalidated on every page view.** `/_astro/*` (CSS, fonts) is served
     `public, max-age=0, must-revalidate` (the Workers default); there is no `public/_headers`.
     Each navigation sends a conditional request per CSS file and font.
3. **Instant navigation, recommended stack (zero JS):** inline Speculation Rules (prerender
   `moderate`, prefetch `eager`) for Chromium, native cross-document View Transitions in CSS for a
   smooth swap in Chrome and Safari 18.2+, plus the two fixes above. Skip ClientRouter. The gap:
   **iOS Safari and Firefox do not support Speculation Rules** (Safari had none in a stable release
   through 27.2; Firefox has only an intent to prototype), so on an iPhone a click is still one
   HTML round trip (~5 KB, served from the edge in ~60-110 ms TTFB). Making it truly instant there
   needs Astro's prefetch script (~1.5 KB gz) and a short browser `max-age` on HTML, which trades
   against freshness after publishing.
4. **First-visit improvements left on the table:** LCP image is `loading="lazy"` with no
   `fetchpriority`; image `sizes` says `100vw` although the column is capped at ~664 px (desktop
   fetches 1668-2048w files); header weights 600/700 are discovered late (only the 400s are
   preloaded); ~7 KB of `@font-face` CSS is inlined into every HTML page; one 52 KB (9.7 KB gz)
   render-blocking stylesheet; the math font is an HTML → CSS → font chain.
5. **No performance check exists in CI.** Nothing guards page weight or first-visit speed, and
   the coming two-language work will change routing. A byte-budget test on `dist/` is the reusable
   guard; Lighthouse in CI is optional.

## Detailed Findings

### Baseline measurements

Built in a scratchpad copy with three mock articles from `lab/content/` (`content/articles/` is
empty in the repo). Test photos were generated noise (~700 KB JPEGs), so image byte numbers are
pessimistic; real photos at 828w are roughly 60-120 KB.

| Page | HTML raw | brotli | Notes |
|---|---|---|---|
| home | 18.6 KB | 4.6 KB | ~8.6 KB of each page is `<head>`, 7.0 KB of it inline `@font-face` |
| about | 17.6 KB | 4.6 KB | |
| heavy article | 40.1 KB | 9.9 KB | 3 images, math, mermaid (3.9 KB SVG), callouts, table, code |
| plain long article | 26.9 KB | 7.7 KB | |

| Lighthouse mobile run | Score | FCP | LCP | Speed Index | Weight |
|---|---|---|---|---|---|
| local home | 100 | 1.2 s | 1.5 s | 1.2 s | 119 KiB |
| local heavy article | 98 | 1.8 s | 2.2 s | 1.8 s | 242 KiB |
| prod home | 100 | 1.0 s | 1.3 s | 1.0 s | 121 KiB |
| prod `/about` | 100 | 1.1 s | 1.4 s | 1.1 s | 147 KiB |

- Heavy article LCP breakdown: TTFB 451 ms, load delay 1,201 ms (the lazy image), load 27 ms,
  render 499 ms. Flags: "LCP image was lazily loaded" (−350 ms), render-blocking CSS (−300 ms).
- Home LCP is the intro `<p>`; nearly all of it is render delay waiting on CSS and fonts.
- Main thread ~0.5-0.6 s, script ~50 ms.
- Production delivery: HTTP/2 and HTTP/3 (`alt-svc h3`), zstd by default (br/gzip on request),
  `cf-cache-status: HIT`, warm TTFB 60-112 ms for HTML from Cloudflare WAW, TCP ~11 ms, TLS ~33 ms.
- `astro preview` sends `no-cache`, so local runs say nothing about caching.
- Raw data: Lighthouse JSON in the session scratchpad (not kept in the repo).

### Navigation path today

- Links: wordmark `/` (`src/components/site/SiteHeader.astro:15`), nav `/about`
  (`src/config/nav.ts:10`), article rows `/${entry.id}` (`src/pages/index.astro:21`,
  `src/components/home/ArticleList.astro:32-34`), wikilinks and `.md` links `/${id}${heading}`
  (`src/lib/markdown/article-index.ts:50-53`, `src/lib/markdown/obsidian-links.ts:124,137,144`),
  mermaid links (`src/lib/markdown/diagrams.ts:42-49`). None end in `/`.
- No `trailingSlash`, `build.format`, `prefetch`, `data-astro-prefetch` or Speculation Rules
  anywhere (`astro.config.mjs`). `SiteHeader.astro:10-11` already normalises the trailing slash for
  the current-page highlight because "the build serves `/about` as `/about/`".
- `wrangler.jsonc:5-8`: `assets.directory`, `not_found_handling: "404-page"`; no `html_handling`,
  no `run_worker_first`. Production: `/about` → `307 /about/`.
- Fix options (Cloudflare html-handling docs,
  https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/):
  - `build.format: 'file'` (+ `trailingSlash: 'never'`): `about.html` is served at `/about` with no
    redirect and no link changes. Smallest change; matches every link generator above.
  - `trailingSlash: 'always'` and rewrite every link generator to add `/`.
  - `assets.html_handling: "drop-trailing-slash"` with the directory build.

### Caching and headers

- `public/` holds only favicons (`public/favicon.ico`, `public/favicon.svg`); no `_headers`,
  no `_redirects`. Production sends `public, max-age=0, must-revalidate` on HTML, `/_astro/*.css`,
  `/_astro/fonts/*.woff2` and the favicon; a font returned `304` on revalidation.
- Workers static assets read `_headers` from the assets directory (100 rules, 2,000 chars per
  line; values for the same header are comma-joined, so avoid duplicate `Cache-Control` rules)
  (https://developers.cloudflare.com/workers/static-assets/headers/). Proposed:
  ```
  /_astro/*
    Cache-Control: public, max-age=31536000, immutable
  ```
  `/fonts/latin-modern-math.woff2?v=<sha8>` is versioned by query
  (`src/integrations/math-font.ts:99-107`), so it can get the same rule.
- HTML: keep revalidation (publishing must be live within 5 minutes, `prd.md:186-187`). A short
  browser `max-age` (60-300 s) is only worth it if the Safari prefetch fallback is added (below).
  Never `no-store`: it breaks bfcache.
- Early Hints: a zone setting; docs don't say it applies to Workers static assets, and it is
  skipped when the HTML is ready immediately (edge HIT). Low value.

### Instant navigation options

Sources: https://docs.astro.build/en/guides/prefetch/,
https://developer.chrome.com/docs/web-platform/prerender-pages,
https://caniuse.com/wf-speculation-rules, https://caniuse.com/cross-document-view-transitions,
https://docs.astro.build/en/guides/view-transitions/.

- **Speculation Rules (inline JSON, no JS).** Prerender renders the next page in a hidden tab, so
  the click is instant. Eagerness on mobile: `moderate` = viewport heuristics (500 ms after scroll
  stops, large links near the last tap); `eager` = 50 ms after a link enters the viewport. Mobile
  limits for eager/moderate: 6 prefetches, 2 prerenders (FIFO). The browser turns it off under
  Save-Data, low-battery energy saver, memory pressure, or the "Preload pages" setting off. Support:
  Chrome/Edge (prerender since 138) incl. Android; **not Safari/iOS, not Firefox**. Runs after
  load; never blocks the first paint. Suggested rule:
  ```json
  { "prerender": [{ "where": { "and": [{ "href_matches": "/*" },
        { "not": { "href_matches": "/_astro/*" } },
        { "not": { "selector_matches": "[rel~=nofollow],[data-no-prerender]" } }] },
      "eagerness": "moderate" }],
    "prefetch": [{ "where": { "href_matches": "/*" }, "eagerness": "eager" }] }
  ```
- **Astro `prefetch`** (`hover`/`tap`/`viewport`/`load`, `prefetchAll`). ~1.5 KB gz external
  module. Uses `<link rel=prefetch>`; Safari falls back to `fetch(..., {priority:'low'})`, which
  only helps if the HTML is fresh in the HTTP cache (with `max-age=0, must-revalidate` Safari still
  revalidates). On `saveData`/2g it degrades to `tap`. `experimental.clientPrerender` (Speculation
  Rules via JS, `immediate` by default) is still experimental in 7.3.8.
- **Native cross-document View Transitions** (`@view-transition { navigation: auto; }`): zero JS,
  Chrome/Edge 126+, Safari/iOS 18.2+, Firefox partial from 144. Smooths the swap; does not remove
  the network wait. Needs a reduced-motion opt-out to respect `design.md` motion rules.
- **ClientRouter**: ~5.3 KB gz, forces `prefetchAll`, needs `astro:after-swap` re-application of
  the theme, re-binding of the motif canvas and toggle module scripts, and the route announcer.
  Astro's docs say it "will increasingly become unnecessary". Adds weight to the first visit,
  which the NFR forbids. Not recommended.
- **bfcache**: the site has no `unload` handlers, no `no-store`, nothing holding it out today;
  keep it that way (https://web.dev/articles/bfcache).

| Option | Chrome Android | iOS Safari | Firefox | JS | First-visit cost |
|---|---|---|---|---|---|
| No redirect + immutable `_astro` | −1 RTT per click, no revalidations | same | same | 0 | less |
| Speculation Rules prerender moderate + prefetch eager | instant | none | none | 0 | 0 before paint; up to 6 small prefetches after |
| Cross-document View Transitions | smooth | smooth (18.2+) | partial | 0 | 0 |
| Astro prefetch `tap`/`hover` + HTML `max-age` 60-300 s | marginal (already prerendered) | near-instant | near-instant | 1.5 KB gz | small; stale up to max-age after publish |
| ClientRouter | instant-ish | instant-ish | instant-ish | ~5.3 KB gz + script rework | +5 KB, theme/motif rework |

### Theme script under prerender and bfcache

- `src/components/site/ThemeScript.astro:8-31`: blocking inline IIFE; reads `localStorage.theme`,
  else `prefers-color-scheme`, toggles `.dark`; listens to the media query and `storage` events.
- A prerendered page runs this script at prerender time. If the reader toggles the theme after the
  prerender, the shown page may carry the old theme. The `storage` listener probably covers a
  toggle in another document (prerenders are same-origin documents), but this is unverified. A
  safe addition (inferred, not from docs):
  ```js
  if (document.prerendering) document.addEventListener('prerenderingchange', apply, { once: true });
  addEventListener('pageshow', (e) => { if (e.persisted) apply(); });
  ```
- `src/components/site/ThemeToggle.astro:28-48` binds once per document (fine without
  ClientRouter). The motif boots on `load`/idle (`src/components/site/Motif.astro:60-68`) and
  pauses while `document.hidden` (`src/components/site/motif/start.ts:65-69`), so a hidden
  prerender should not animate.

### Fonts

- 16 subset faces, ~25-28 KB each (`src/assets/fonts/`, `scripts/subset-fonts.mjs:18-32`),
  registered in `astro.config.mjs:25-39,75-78`. Preloaded: Iosevka 400 and Aile 400 only
  (`src/layouts/Layout.astro:31-34`); the earlier review capped preloads at two
  (`context/archive/2026-10-18-visual-direction/reviews/impl-review-phase-4-r2.md:72-80`).
- Faces fetched: home 4 (~104 KB: 400 + Iosevka 600/700 for the header), About 5, heavy article 7
  + math font (~193 KB). Weights: 600 titles/`strong` (`src/styles/global.css:56-68`), 700 the
  wordmark (`global.css:49`), 500 nav current item and table headers.
- `<Font>` inlines 32 `@font-face` rules into every page (~7 KB raw); with immutable caching that
  repeated CSS is the one font cost that cannot be cached.
- CLS stays 0 thanks to size-adjusted fallbacks.

### Images

- `astro.config.mjs:51-52`: `image: { layout: 'constrained', responsiveStyles: true }` → webp,
  srcset (640…2048 + original), width/height, `loading="lazy"` on every image including the
  first. Embeds go through the same pipeline (`src/lib/markdown/obsidian-links.ts:56-67`);
  `|300` widths via `src/lib/markdown/image-width.ts:13-28`.
- Observed `sizes="(min-width: 2400px) 2400px, 100vw"` while the column is `max-w` ~41.5rem, so
  desktop picks 1668/2048w for a ~664 px slot (~2.5x over-fetch).
- Guards: only CI's 20 MB per-file check (`.github/workflows/deploy.yml:34-41`); the author doc
  asks for JPEG/PNG/WebP, no HEIC (`content/README.md:46`). Originals stay in the repo; only
  variants ship. A hast plugin (like `image-width.ts`) can mark the first image eager +
  `fetchpriority="high"` and set `sizes` to the column width, keeping publishing to "add a file".
  AVIF is an option (`image.service`/formats), at build-time cost.

### CSS and other weight

- One global stylesheet, `Layout.*.css`, 52 KB raw / 9.7 KB gz / 8.6 KB br, render-blocking on
  every page (`src/styles/global.css:4-7` imports `tailwindcss`, `tw-animate-css`,
  `shadcn/tailwind.css`, `prose.css`). `build.inlineStylesheets` is the default `'auto'` (inlines
  only sheets under 4 KB). Inlining with `'always'` saves one RTT on the first visit but makes
  every page re-download the CSS; with immutable caching and prerender, external is better for
  navigation. Trimming unused CSS (e.g. `tw-animate-css`) is the cheaper lever; not audited.
- `dist/_astro/client.*.js` (React runtime, ~220 KB) is built but referenced by no page; accepted
  earlier as "not shipped to visitors"
  (`context/archive/2026-11-23-theme-follows-device/reviews/impl-review.md:48-58`).
- Inline SVG (mermaid) and MathML are small (~4 KB and ~1 KB in the heavy mock).
- The canvas motif runs a 30 fps rAF loop for the whole visit (`motif/start.ts:52-63`): no effect
  on first paint (starts after load, TBT 0), some CPU/battery on phones. Outside the NFRs.

## Code References

- `astro.config.mjs:45` - integrations (`react()`, `mathFont()`); no `prefetch`/`build`/`trailingSlash`
- `astro.config.mjs:51-52` - image layout config (webp, srcset, lazy)
- `astro.config.mjs:75-78` - font families via Astro Fonts API
- `wrangler.jsonc:5-8` - assets config; no `html_handling`
- `src/layouts/Layout.astro:22-42` - head order, two font preloads, ThemeScript, Motif
- `src/components/site/ThemeScript.astro:8-31` - pre-paint theme script
- `src/components/site/ThemeToggle.astro:28-48` - toggle module script
- `src/components/site/Motif.astro:60-68` - motif boot after load/idle
- `src/components/site/motif/start.ts:52-69` - 30 fps loop, pause when hidden/reduced motion
- `src/components/site/SiteHeader.astro:10-27` - trailing-slash normalisation, nav links
- `src/config/nav.ts:10` - `/about` without trailing slash
- `src/pages/index.astro:21` - article hrefs `/${entry.id}`
- `src/lib/markdown/article-index.ts:50-53` - wikilink hrefs
- `src/lib/markdown/image-width.ts:13-28` - per-image width plugin (model for an LCP/sizes plugin)
- `src/integrations/math-font.ts:86-107` - math font subset + `?v=` versioning
- `src/styles/global.css:4-7,158-173` - CSS imports, transitions, reduced motion
- `.github/workflows/deploy.yml:27-41` - CI: test, build, 20 MB file check; no perf check

## Architecture Insights

- The site is static HTML, edge-cached, zero hydration; every page shares one CSS file and the
  same font set. That makes the cheapest wins configuration (format, headers) rather than code.
- Zero-JS, progressive-enhancement options (Speculation Rules, CSS View Transitions) fit the
  project's rules (no hydration, scripts only where unavoidable) and cost nothing before first
  paint; they also degrade to plain links.
- Markdown-side fixes belong in `src/lib/markdown/` as hast plugins with relative imports, keeping
  publishing to "add a file".
- A `dist/` byte-budget test (HTML, CSS, fonts per page type) would be the reusable guard for the
  two-language work, which will change routing.

## Historical Context (from prior changes)

- `context/archive/2026-10-18-visual-direction/change.md:24-29` - full Fontsource faces (~1 MB each)
  broke the 2 s NFR; subset faces adopted.
- `context/archive/2026-10-18-visual-direction/reviews/impl-review-phase-4-r2.md:72-80` - preload
  Iosevka 400 + Aile 400, cap of two preloads.
- `context/archive/2026-10-18-visual-direction/plan.md:116-121` - motif as a plain script, idle
  start, pause when hidden, DPR cap.
- `context/archive/2026-10-31-diagrams-and-math/research.md:100-135` - Temml (MathML) and Pele
  (build-time SVG) chosen as the lightest, no client JS.
- `context/archive/2026-10-31-diagrams-and-math/plan-brief.md:113` - "the 2 s phone budget holds"
  was reasoned, not measured; no Lighthouse result was ever recorded before this research.
- `context/archive/2026-10-27-publish-first-article/plan.md:476-482` - responsive webp + lazy as
  the image answer to the 2 s NFR; CI 20 MB check as backstop.
- `context/archive/2026-11-23-theme-follows-device/plan.md:61,185-190` - prefetch/ClientRouter
  parked; "a ClientRouter must re-apply the theme after each page swap".
- `context/foundation/design.md:10-12` - nothing over ~150 ms on the input path, transform/opacity
  only; relevant to any view-transition animation.
- `context/foundation/infrastructure.md:134` - any Worker code brings request/CPU limits; stay
  static-assets only.

## Related Research

- `context/archive/2026-10-31-diagrams-and-math/research.md`
- `context/archive/2026-10-27-publish-first-article/research.md`

## Open Questions

1. **How much does iOS Safari matter?** Speculation Rules give instant clicks only in Chromium.
   Instant on iPhone needs Astro prefetch (~1.5 KB gz) plus a short HTML `max-age` (staleness up to
   that many seconds after a publish), or ClientRouter (rejected). Otherwise iPhone gets "fast"
   (one ~5 KB edge round trip, no redirect, cached assets) plus a smooth view transition.
2. **Trailing-slash fix:** `build.format: 'file'` (no link changes, recommended) vs
   `trailingSlash: 'always'`. Pick with the coming `/en/`/`/pl/` routing in mind.
3. **View transition style:** a plain cross-fade or none, and its duration against `design.md`'s
   motion rules; needs a `design.md` entry.
4. **Header fonts:** preload Iosevka 700/600 too (breaks the two-preload cap) or change the
   wordmark/title weights to reuse a preloaded face (a design change).
5. **Budgets and checks:** which per-page budgets (HTML, CSS, fonts, LCP image) to enforce in a
   `dist/` test, and whether to add Lighthouse to CI (needs Chromium in the runner).
6. **Images:** AVIF in addition to webp? A build-failing cap on source dimensions/bytes, or only
   the existing 20 MB backstop plus build-time resizing?
7. Not measured: real photos, production article pages (none published yet), other regions,
   real-device timing.

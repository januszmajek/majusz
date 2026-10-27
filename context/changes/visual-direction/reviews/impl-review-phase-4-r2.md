<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Visual Direction (F-01), round 2

- **Plan**: context/changes/visual-direction/plan.md
- **Scope**: Phase 4 of 5 (uncommitted working tree on 3f9d8b8), second round after the fixes from `impl-review-phase-4.md`
- **Date**: 2026-10-27
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

### Round-1 fixes verified

- **F1 type-scale tokens**: correct. Both `@theme inline` blocks compile, and the built CSS has
  `.text-wordmark{font-size:var(--size-chrome);line-height:var(--tw-leading,1);letter-spacing:var(--tw-tracking,-.01em);font-weight:var(--tw-font-weight,700)}`.
  `text-nav`, `text-page-title`, `text-body`, `text-fine` and the prose `text-h2`/`text-h3`
  come out the same way. `--size-chrome` steps from 1.25rem to 1.375rem at `@media (width>=40rem)`.
  Tailwind only emits tokens that are used, so `article-title`, `lead` and `meta` are missing
  from the CSS until Phase 5 uses them. That is expected. There is no clash with
  `shadcn/tailwind.css`, and no sidebar or chart tokens are left in the output.
- **F2 motif split**: behavior is the same as the picked `lab/variants/flight-deck/Motif.astro`.
  The orbit RNG is seeded with 7 and draws `u0, node0, met0` in the same order. The sky RNG is
  seeded with 42 and draws `depth, x, y, ch` in the same order. The motif starts after `load`
  and then `requestIdleCallback`, falling back to `setTimeout` at 200ms. `visibilitychange`
  pauses it and resets `last` so time doesn't jump. Under reduced motion it draws one static
  frame and starts no rAF. DPR is capped at 2. A MutationObserver on `html.class` re-reads
  `.dark`, `--motif` and the font, then redraws. The mask alphas are 0.2 in light and 0.35 in
  dark. It is hidden under `prefers-contrast: more`. The bundle is one inline module script.
  The variant needed `active()` and an `update()` in the observer, and dropping them is
  correct here because the site has a single canvas that is always active.
- **F3 ThemeScript**: an `is:inline` IIFE that runs before the `<Font>` styles and the
  stylesheet. It uses no storage and follows the `change` event.
- **F4 prose.css**: imported from `global.css`, and every `@apply` resolves. The output
  contains `.prose`, the headings, links, `✦` bullets, `ol ::marker`, blockquote,
  code/pre at 0.875rem/1.5, `hr::after "- - -"` and `img`. The rules sit in
  `@layer components`, so the layer order is intact.
- **F5 `current` prop**: accepted and recorded in change.md. The header sets `aria-current="page"`.

### Structure, safety and scope

- Structure is sound. `src/components/site/` holds the shell pieces and
  `src/components/site/motif/` holds the pure modules (rng, orbit, frame, ascii, graticule,
  start). `src/config/nav.ts` is the single nav list. Production code never imports from `lab/`.
- Safety: `src`, `dist` HTML and the inline scripts contain no third-party URLs, no
  `localStorage`/`sessionStorage`/cookie use and no `fetch`. The React `client.*.js` is
  emitted but no page references it.
- Scope: there is no theme toggle, no About route and no GitHub/"source ↗" link. The footer
  leaves that link out on purpose for S-06. Nav lists only `articles` → `/`.
  `git ls-files lab/variants` is empty.

### Success criteria

| Check | Result |
|---|---|
| 4.1 `npm run build` | PASS (2 pages, 16 font files copied) |
| 4.2 no third-party font hosts in `dist` | PASS |
| 4.3 `*.woff2` in `dist` | PASS (16 files) |
| 4.4 `find dist -name '*.html' \| sort` | PASS: `dist/404.html`, `dist/index.html` |
| 4.5–4.9 manual | Pending author confirmation |

## Findings

### F1 — Preload targets Iosevka 400, not the reading font

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/layouts/Layout.astro:31-32
- **Detail**: The plan says "preload the body font", and the 2-second budget applies to readable article content. design.md sets long reading (article body, summaries, intro) in Iosevka Aile. The layout preloads only Iosevka 400 normal. On the live pages that face only renders the footer line and the canvas labels: the wordmark is 700, the current nav item is 500, the h1 is 600, and the "Coming soon" paragraph uses Aile 400. The metric-adjusted fallbacks limit the visible shift, but the one preload goes to the least visible face.
- **Fix**: Add `preload={[{ weight: '400', style: 'normal' }]}` to the `--font-iosevka-aile` `<Font>`. Drop the Iosevka 400 preload or switch it to 600 (titles). Keep at most two preloads.
- **Decision**: FIXED (Aile 400 preloaded too; fonts subset to ~25 KB per face, see change.md — the 1 MB Fontsource faces were the larger issue)

### F2 — Motif redraws the full canvas every frame for sub-pixel motion

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/site/motif/start.ts:51-56
- **Detail**: `tick` clears and repaints a viewport canvas at up to 2× DPR on every rAF (60–120Hz), for motion of ~0.7px/s in light and ~2px/s in dark. It doesn't affect load because it starts after idle. On phones, though, it is continuous GPU and battery work for drift too slow to see. The same code runs in the picked variant, so this is not a regression. It is relevant to manual check 4.6.
- **Fix**: Skip frames when less than ~1/30s has passed since the last draw (accumulate `time` as now), or leave it as is if 4.6 shows no stutter or heat.
- **Decision**: FIXED (redraws capped at 30fps)

### F3 — Mobile toolbar resize rebuilds the sky (plausible)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/site/motif/start.ts:39-49, 68-71
- **Detail**: Any canvas resize reallocates the canvas and calls `buildSky(width, height)`. Glyph `y` is `random() * height`, so a height change stretches every glyph vertically, and the graticule re-centers on `height / 2`. If the fixed `inset: 0` canvas tracks the dynamic viewport when the mobile browser toolbar collapses on scroll (as it does on iOS Safari), the sky jumps a little. This is not verified on a device. Check it during 4.6.
- **Fix**: If it shows up, size `.sky` to `100lvh` (or ignore height-only changes below ~120px in the ResizeObserver).
- **Decision**: FIXED (.sky height 100lvh)

### F4 — AGENTS.md doesn't point at prose.css or the `text-<role>` rule

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: AGENTS.md:30
- **Detail**: Project Structure still describes `global.css` as "Tailwind and the shadcn theme tokens". The rules S-01/S-03/S-06 need (prose styles live in `src/styles/prose.css`, and layouts use `text-<role>` tokens instead of raw sizes) are recorded only in CSS comments and change.md, so the next agent can miss them and reintroduce arbitrary sizes.
- **Fix**: Extend the `global.css` bullet: "plus the `text-<role>` type scale (use it, not raw sizes); `.prose` lives in `src/styles/prose.css`."
- **Decision**: FIXED (AGENTS.md: text-<role> tokens, prose.css, src/assets/fonts)

# Design

The visual contract for majusz.com, picked by the author in the design lab
(`visual-direction`, rounds 1–6, approved 2026-10-27; reasoning in
`context/changes/visual-direction/directions.md`). The chosen variant is **Flight deck**:
a calm console layout in one left-aligned column, set in Iosevka, with a slowly drifting ASCII
sky at night. Every later slice builds inside this document; change it before changing
the look.

Craft rules from `directions.md` ("Apple craft rules") apply everywhere: flat opaque
surfaces, no glass or heavy shadows, one accent, `rem` sizing, press feedback on press,
nothing over ~150ms on the input path, `transform`/`opacity` animation only.

## Typography

| Role | Family | Licence |
| --- | --- | --- |
| Chrome, headings, lists, meta, code | Iosevka (monospace) | SIL OFL 1.1 |
| Long reading (article body, summaries, intro) | Iosevka Aile (quasi-proportional) | SIL OFL 1.1 |

- Self-hosted through Astro's `fonts` config from Fontsource, `latin` subset, weights 400,
  500, 600, 700, normal and italic. No third-party font host at runtime.
- Fallbacks: `ui-monospace, monospace` for Iosevka; `ui-sans-serif, system-ui, sans-serif`
  for Aile. `font-optical-sizing: auto` on prose.

Scale (root 16px; sizes in `rem`, tracking by size, leading shrinks as size grows):

| Element | Size | Weight | Leading | Tracking | Family |
| --- | --- | --- | --- | --- | --- |
| Wordmark `majusz` | 1.25rem → 1.375rem from 40rem | 700 | 1 | -0.01em | Iosevka |
| Nav items `articles` `about` | same as wordmark, lowercase | 500 current / 400 others | 1 | -0.01em | Iosevka |
| Article title | clamp(1.75rem, 4.5vw, 2.25rem) | 600 | 1.12 | -0.02em | Iosevka |
| Home and About title | clamp(1.5rem, 4vw, 1.875rem) | 600 | 1.15 | -0.015em | Iosevka |
| Prose h2 / h3 | 1.375rem / 1.125rem | 600 | 1.2 | -0.01em | Iosevka |
| Back link `< articles` | 1rem, lowercase | 400 | 1 | 0 | Iosevka |
| Article summary | 1.125rem | 400 | 1.5 | 0 | Aile |
| Article body | 1.0625rem | 400 | 1.6 | 0 | Aile |
| Article meta `date · n min · tag` | 0.8125rem, lowercase, tabular | 400 | 1.4 | +0.01em | Iosevka |
| List dates, reading time, rules, footer | 0.75rem | 400 | — | +0.01em | Iosevka |
| Code (inline / block) | 0.92em / 0.875rem | 400 | — / 1.5 | 0 | Iosevka |

- Prose measure: 65ch of Aile (~41.5rem); summaries and intros cap at 38rem.
- Headings differ by size and weight only: no `#`, no glyph before them.
- Chrome is lowercase (wordmark, nav, back link, meta); article titles and prose keep normal
  case.

## Colors

shadcn variable names (`src/styles/global.css`, `:root` / `.dark`). Values in `oklch`.

| Token | Light: Cleanroom | Dark: Flight deck |
| --- | --- | --- |
| `--background` | oklch(0.99 0.002 250) #fbfcfd | oklch(0.155 0.008 150) #0a0d0a |
| `--foreground` | oklch(0.16 0.008 250) #0b0e11 | oklch(0.9 0.02 145) #d6e2d6 |
| `--card` (code background) | oklch(0.955 0.004 250) | oklch(0.19 0.01 150) |
| `--muted-foreground` | oklch(0.48 0.01 250) | oklch(0.67 0.025 150) #8b9a8d |
| `--primary` (accent) | oklch(0.55 0.19 42) #c63a00, International Orange | #2a8d4a, phosphor green |
| `--border` | foreground at 13% | foreground at 13% |
| `--motif` (ASCII sky) | oklch(0.3 0.01 250) | oklch(0.97 0.01 250) |

Light is "cleanroom": spacecraft-assembly white with the orange of space suits and launch
hardware. Dark is Mission control's near-black with phosphor green.

Contrast (WCAG 2.x), checked:

| Pair | Light | Dark |
| --- | --- | --- |
| Text on background | 18.86 | 14.58 |
| Muted on background | 6.35 | 6.61 |
| Link on background | 5.11 | 4.66 |
| Link vs body text (links are color-only at rest) | 3.69 | 3.14 |
| Link on code background | 4.60 | 4.36 (below 4.5; only a link wrapping inline code) |

- One accent per theme: links, focus rings, `::selection` (accent background, background-color
  text).
- Theme change eases background and color over 300ms; none under reduced motion.

## Motif

**Light: graticule.** A full-page fixed canvas behind the content: a flat lat/lon grid that
pans with one virtual satellite, drawn in `--motif` (`oklch(0.3 0.01 250)`).

- Grid every 20° at 200px (10px per degree), dotted 1px hairlines (1px dash, 4px gap) at
  alpha 0.15. Parallels snap to whole pixels; meridians pan unrounded, so they glide.
- The satellite follows an ISS-like orbit (inclination 51.64°, altitude 408–418 km, period
  ~92.7 min) in real time from a seeded start. The grid is centered on its longitude, so it
  pans east to west at ~0.7px/s.
- Degree labels on the outer edges only, 10px at alpha 0.25, uppercase hemispheres (`30°N`,
  `45°W`): latitudes down the left edge, longitudes along the bottom, fading out before the
  column. Shown only when the side margin is at least 150px.
- Telemetry in the bottom-right corner (`lat`, `lon`, `alt`, `v`, `t+`), 11px on a 16px
  line at alpha 0.32, its longest line 16px from the right edge. Readings step every 5s, so
  digits never tick visibly. Shown only when the side margin is at least 180px.
- Labels and telemetry knock the grid out behind them (4px clear), as on a printed chart.
- Behind the text column it fades to 20% (horizontal mask).

The rules below apply to both motifs.

**Dark: ASCII sky.** A full-page fixed canvas behind the content, drawing sparse
monospace glyphs `. · + *` in `--motif`.

- Density ~0.3 glyphs per 10,000px²; size 10–15px and alpha 0.25–0.6 by depth.
- Drifts sideways at ~2px/s × depth: too slow to track. No twinkle.
- Behind the text column it fades to 35% (horizontal mask), so body text never sits on it at
  full strength.

Both motifs:

- Always full-page, on every page.
- Starts after the page has loaded and the browser is idle; pauses when the tab is hidden;
  still under `prefers-reduced-motion: reduce`; hidden under `prefers-contrast: more`.
- Seeded and deterministic (same sky on every load). Vanilla canvas, no dependency.

**ASCII elsewhere.** Section rules are `LABEL ────` in box-drawing characters (year groups on
home, `EOF` above the footer). Article list bullets are a small `✦`, the only place it
appears. The empty home state reads `> 0 entries. First transmission pending.` under a `LOG`
rule.

## Layouts

One column, max 48rem (`max-w-3xl`) with 1.25rem side padding. The wordmark, page content,
article title and prose, and the `EOF` rule all share one left edge on every page and width.

**Header (every page).** Wordmark `majusz` on the left; `articles`, `about` and the theme
toggle on the right, space between. No border under it. The current page is marked by
foreground color and medium weight only (no glyph).

**Footer (every page).** A left-aligned `EOF ────` rule closes the main content, then
`© 2026 majusz · source ↗` in 0.75rem muted.

**Home.**
- Intro: title (1.5–1.875rem) and one Aile paragraph, capped at 38rem, tight above the list.
- List: flat newest first, grouped under year rules (`2026 ────`). One row per article: date
  (0.75rem muted) · title · reading time right-aligned (`6 min`). On narrow screens the date
  and time share a line above the title.
- Hover changes the title to the accent; no row background, no cards.
- Empty state: `LOG` rule plus the teaser line above.

**Article.**
- `< articles` back link (1rem muted), then the title, the meta line directly under it, then
  the summary in muted Aile.
- Prose at 65ch from the shared left edge. `✦` bullets for unordered lists, muted numerals
  for ordered lists, hairline left border for blockquotes, `- - -` for rules.
- Links: accent color at rest, underline on hover and focus. Same rule in both themes.

**About.** Same title style as home, then prose (bio, an "Elsewhere" list of social and repo
links).

**Theme toggle.** shadcn `Button` (ghost, icon), lucide Sun/Moon, after the last nav item.
Accessible name "Dark theme" with `aria-pressed`. Applies `.dark` before first paint from the
stored choice, else the system preference; stores the choice locally (no cookie, no
tracking). Building it on the site is S-07's job; this is its look.

## Left for slices

- Images in articles (sizing, captions) — S-01.
- Wikilink styling (unpublished notes render as plain body text) and tag display — S-02.
- Callouts, code syntax-highlighting theme (both themes), tables — S-03.
- Diagrams and math — S-04.
- Theme toggle behavior and wiring — S-07.
- Home intro copy and whether it includes a photo — S-05.
- The game's look — its own milestone.

# Round 1 directions

Draft for the first `/prototype` round. Edit, swap or drop any of them before the round runs.
Each direction is one whole site (Home, Article, About) in both themes, compared against
Baseline (plain shadcn) in the lab.

Shared by all three, from the author's inputs (`frame.md`):

- Vibe: clean "space explorer", with the clear, calm UX of pre-Liquid-Glass Apple: flat
  surfaces, crisp type, no glass blur, no heavy shadows.
- A slowly drifting night-sky starfield somewhere on the site; ASCII used somewhere.
- The author's font is Iosevka (OFL, self-hostable). Round 1 gives each direction a different
  cut of it: Mission control uses Iosevka (mono) with Iosevka Aile for long reading,
  Observatory uses Iosevka Aile throughout, Star chart uses Iosevka Etoile with Iosevka for
  labels. The "e.g." fonts below were placeholders.
- Starfield rules, whatever the placement: vanilla canvas, starts after content renders,
  pauses when hidden, still under reduced motion, never under body text at full contrast.

## Apple craft rules (all directions)

From the `apple-design` skill, so every variant is built to the same bar and the round
compares directions, not execution. Its translucent-material guidance is out: the target is
pre-Liquid-Glass.

**Typography**

- Tracking depends on size, never one value: display ~`-0.02em`, headings ~`-0.01em`, body
  `0`, small meta and labels ~`+0.01em`.
- Leading shrinks as size grows: display ~`1.05–1.1`, headings ~`1.2`, article body ~`1.6`.
- Build hierarchy from size, weight and leading together; emphasize with weight, not more size.
- Sizes and spacing in `rem`, so the reader's text-size setting scales the whole layout.
- `font-optical-sizing: auto` when the face supports it. A custom font needs a reason; the
  author's font is that reason, so it gets a role and the rest stays plain.
- Article measure ~60–70ch.

**Restraint and wayfinding**

- Every element earns its place: one accent color, hierarchy from order, spacing and contrast,
  not decoration.
- Nav labels name what's behind them ("Articles", "About"), and the current page is marked.
  Every page answers "where am I, how do I get back".
- Flat, opaque surfaces: hairline borders or spacing for separation, no `backdrop-filter`, no
  glass, no heavy shadows.

**Feedback**

- Links and buttons react on press, not release (e.g. `:active` scale `0.97` in `100ms
  ease-out`, or an instant color change), and hover styles only under `(hover: hover)`.
- No delays on the input path: no transition over ~150ms on anything the reader triggers.

**Motion and the starfield**

- Animate only `transform` and `opacity`, on `requestAnimationFrame`.
- The sky drifts too slowly to track, with low-opacity stars. No twinkle or loop near one
  cycle per 5s (0.2 Hz), which Apple flags as a vestibular trigger.
- A full-viewport moving background is also on Apple's caution list. A direction that fills the
  page with sky (Observatory) keeps the motion barely perceptible and fades it behind text.
- Theme changes ease rather than jump in brightness.
- `prefers-reduced-motion: reduce`: the sky is still, and transitions become short cross-fades
  or nothing. `prefers-contrast: more`: solid backgrounds behind text and defined borders.

## 1. Mission control

- **Axis:** structure. The site reads like a calm terminal or flight console.
- **Type:** monospace for chrome, meta and headings (e.g. JetBrains Mono, IBM Plex Mono); a
  plain sans or the author's font for article body so long reads stay comfortable.
- **Color:** near-black with phosphor-green or amber accent in dark; paper white with ink
  black and the same accent, darkened, in light. One accent only.
- **Starfield:** a thin band behind the header, like a viewport window above the console.
- **ASCII:** heavy. Box-drawing frames around the intro and list, an ASCII wordmark, `>`
  prompts for nav items, `[tag]` brackets, `---` rules.
- **Structure:** home is a dense log: date, title and reading time on one line per entry,
  grouped by year. Article has a status-line header (date · min · tags) and a narrow column.

## 2. Observatory

- **Axis:** atmosphere. Quiet Apple-like clarity, with the sky as the main visual.
- **Type:** one humanist or grotesk sans for everything (e.g. Inter, SF-like, or the author's
  font), large and airy headings, generous line height.
- **Color:** deep navy-black sky in dark, soft blue-grey dawn in light; white or ink text,
  one cool accent (ice blue or violet) for links.
- **Starfield:** full-page background on home and About, fading out behind the article body
  so reading stays plain.
- **ASCII:** light. One small ASCII constellation or orbit as the home intro mark; nowhere
  else.
- **Structure:** home is a short centered intro over the sky, then a flat list of cards with
  title, summary and date. Article is a single centered column with a big title block.

## 3. Star chart

- **Axis:** typography. Editorial, print-like, with the motif drawn as chart lines.
- **Type:** a serif for headings and body (e.g. Newsreader, Source Serif, or the author's
  font), small-caps or mono for meta.
- **Color:** warm off-white paper and ink in light; ink-blue night paper with cream text in
  dark. Accent is a single red or gold "plotting" color.
- **Starfield:** sparse, slower stars only in the margins, joined by thin constellation
  lines that connect list items on home.
- **ASCII:** medium. ASCII coordinates and small glyphs (`✦`, `+`, `·`) as section markers,
  and an ASCII footer chart.
- **Structure:** home is an index: big date column on the left, titles on the right, flat
  newest first. Article has a wide title spread, a narrow measure (~65ch) and margin notes for
  meta.

## Brief for the author to run

Paste this as one `/prototype` call (edit it to match any changes above):

```
/prototype Whole-site look for majusz.com: Mission control, Observatory, Star chart from
context/changes/visual-direction/directions.md, judged against the existing Baseline.
My font: iosevka.
Overrides to the skill defaults:
- Surface is the existing design lab (npm run lab / labt, port 4322): put each variant in
  lab/variants/<name>/ with Home.astro, Article.astro and About.astro, following
  lab/variants/baseline/ (whole documents, props from lab/lib/data.ts, stylesheet linked with
  ?url and declaring @source "./"). Do not create /prototypes or touch src/pages.
- One variant = the whole site (home 0/2/12, both articles, About) in light and dark (.dark
  on <html>).
- Use Tailwind and shadcn primitives (add to src/components/ui/ with npx shadcn add if
  needed). Keep Baseline in the picker.
- No keep/promote step: I record the pick in context/foundation/design.md afterwards.
- Load the apple-design skill and apply the "Apple craft rules" section of directions.md to
  every variant. Ignore its translucent-material guidance: the target is pre-Liquid-Glass
  (flat, no blur).
```

Later rounds: `/prototype riff <variant>` with the same overrides.

# Round 2 directions

From the author's round 1 feedback. Structure has converged on Mission control with parts of
the other two; round 2 settles color and background. Two variants, identical structure and
light mode, different dark palette. Baseline and the round 1 variants stay in the picker.

| Variant | Dark mode | Light mode |
| --- | --- | --- |
| `flight-deck` | Mission control's near-black and green accent | Strong blue sky with clouds |
| `flight-deck-navy` | Observatory's deep navy-black sky | Strong blue sky with clouds |

## Kept from round 1

- **Mission control:** the drifting night sky with its slow sideways motion, now behind the
  whole page, not a header band; ASCII rules, with `EOF` closing each article; the green
  accent, also used for text selection (`::selection`); its overall shape, layout and list.
- **Observatory:** the dark-mode navy colors (in `flight-deck-navy`); no hard line between
  the top nav and the content.
- **Star chart:** the top nav layout and style, minus its orange/yellow; the tight intro
  block above the article list, with a smaller title; small stars as bullets in article
  lists.

## Dropped from round 1

- `#` before headings, and any star or symbol before heading text: headings differ by size
  and weight only.
- Mission control's wordmark style, its light-mode colors and the hover background on list
  rows.
- Cards anywhere.
- Every round 1 light mode.
- Observatory's undersized wordmark and its constellation logo (not redone).
- Star chart's dotted footer logo, margin-only stars and off-center article column.
- Underlined links: links are marked by color alone.

## Shared structure

- **Nav:** wordmark "majusz" on the left at a confident size, nav items on the right, space
  between. No border under the nav.
- **Home / articles:** the intro block sits tight above the list; the intro title is smaller
  than in Star chart. The list follows Mission control (one line per entry: date, title,
  reading time, grouped by year), with no row background on hover; hover changes color only.
- **Article:** a centered column (~65ch). Headings get no prefix. List bullets are small
  stars. An ASCII `EOF` rule ends the article.
- **Links:** accent color only, no underline. The link color must reach 3:1 against the
  body text as well as AA against the background (WCAG 1.4.1); if it can't, add an underline
  on hover and focus only.

## Light mode: blue sky

- Reference: an illustration the author shared (saturated cobalt sky, cream halftone-grained
  cumulus clouds, a few white stars, white type). It is third-party art: a reference only,
  never copied or committed.
- Saturated cobalt/ultramarine full-page background with white or cream text. Clouds are
  generated in code (canvas or SVG noise, optional halftone/grain texture), mostly low on the
  page and at the edges, drifting as slowly as the stars. A few faint stars may stay visible.
- Readability: behind the article column the sky calms (clouds fade out, a flatter blue), so
  body text never sits on clouds at full contrast. Text meets AA everywhere.

## Background comparison

Both variants put the sky behind the whole page, including articles. Each also offers the
alternative from Observatory, sky only at the top of the article fading into a plain
background, through a lab-only toggle or URL query (e.g. `?sky=top`), so both can be judged
on the same variant.

## Brief

```
/prototype riff mission-control
Round 2 from context/changes/visual-direction/directions.md ("Round 2 directions"): build
flight-deck and flight-deck-navy exactly as specified there. This is a convergence round:
the two variants deliberately share structure and light mode and differ in the dark palette
only; ignore the skill's "differ only in color = one direction" rule. Same overrides as
round 1 (lab surface, whole site in both themes, Tailwind/shadcn, no keep/promote, Apple
craft rules). Reuse lab/lib/Starfield.astro and the Iosevka fonts from lab/astro.config.mjs.
```

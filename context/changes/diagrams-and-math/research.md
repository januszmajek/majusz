---
date: 2026-10-31T22:35:19+01:00
researcher: Claude (Opus 5.5) for Janusz Majek
git_commit: 21f404ab5b318f5c11f5badcfc575e91a7901f9d
branch: master
repository: januszmajek/majusz
topic: "S-04 diagrams-and-math: how to render Obsidian diagrams and math within the 2 s phone budget"
tags: [research, codebase, markdown, satteri, math, diagrams, pele, temml, obsidian-guard]
status: complete
last_updated: 2026-10-31
last_updated_by: Claude (Opus 5.5)
last_updated_note: "Added the author's answers to the open questions"
---

# Research: diagrams and math (S-04)

**Date**: 2026-10-31T22:35:19+01:00
**Researcher**: Claude (Opus 5.5) for Janusz Majek
**Git Commit**: 21f404ab5b318f5c11f5badcfc575e91a7901f9d
**Branch**: master
**Repository**: januszmajek/majusz

## Research Question

What does roadmap slice S-04 need? The outcome to deliver is: "visitor can read diagrams and math displayed as Obsidian shows them, and the article is still readable on a phone in under 2 seconds" (`context/foundation/roadmap.md:136`, PRD FR-009 and the NFR at `prd.md:185`). The questions are:

- What does Obsidian actually do?
- What does the current pipeline do with this syntax today?
- Which rendering approach fits the Sätteri-only, static, no-client-JS architecture?

## Summary

- **Both features can be rendered fully at build time, with zero client JS and no browser in CI.**
  - **Math**: turn on Sätteri's built-in `features.math` parser and render each node with **Temml** (MathML Core output). Temml is sync, has no dependencies, and adds about 3 KB gz of CSS. KaTeX is the heavier fallback.
  - **Diagrams**: render ```` ```mermaid ```` fences with **Pele**, the MIT library Obsidian 1.15 uses in place of Mermaid. Its `render()` is sync and needs no DOM. It outputs inline SVG themed through `--pele-*` CSS variables, so the site's `.dark` switch works without re-rendering. The S-01 plan already chose Pele for S-04 (`context/archive/2026-10-27-publish-first-article/plan.md:76-77,493`).
- **Today the pipeline doesn't guard math at all.**
  - With `features.math` off, `$x$` and `$$…$$` reach readers as raw text, and the backslash escapes inside them are mangled (`\,` comes out as `,`).
  - `obsidian-guard.ts` has no `$` pattern, so the build doesn't fail. That breaks the hard rule, although `content/articles/` is empty, so no reader has seen it yet.
  - A mermaid fence renders as a Shiki code block, as S-03 intended (`context/archive/2026-10-31-callouts-code-tables/plan.md:76`).
- **Sätteri's math parsing is looser than Obsidian's, and that's the main thing to get right.**
  - `$5 and $6` becomes inline math; in Obsidian it stays text.
  - `$$x$$` in the middle of a paragraph becomes inline math; Obsidian's reading view shows it as text.
  - An unclosed `$$` swallows the rest of the article as display math.
- **Where the plugins go is constrained by pipeline order.** User hast plugins run *after* Shiki (`node_modules/@astrojs/markdown-satteri/dist/satteri-processor.js:203-206`). So a mermaid fence must be caught in an mdast plugin on `code` nodes, or excluded from highlighting. Math fences are already excluded from Shiki: `math` is the default excluded language.

## Detailed Findings

### What Obsidian does (the target)

**Math**
- Obsidian renders math with MathJax (TeX input). Inline math uses `$…$` and display math uses `$$…$$`.
- Inline math needs no whitespace right after the opening `$` and right before the closing `$`. So `$5 and $6` is text, and `\$` escapes a dollar sign.
- `align`, `cases`, `\tag` and `\ce{}` (mhchem) all work.
- In reading view, `$$` only renders when it's on its own line or wraps a block. Mid-paragraph it stays text. Display math is centred.
- Sources:
  - https://obsidian.md/help/Editing+and+formatting/Advanced+formatting+syntax
  - https://forum.obsidian.md/t/inline-math-allow-white-spaces-before-closing-dollar-signs/63551
  - https://forum.obsidian.md/t/discrepancy-between-handling-of-math-blocks-in-live-preview-and-reading-view/44319
- Not confirmed: whether Obsidian ships MathJax 3 or 4.

**Diagrams**
- ```` ```mermaid ```` fences are Obsidian's only native diagram syntax.
- Obsidian 1.15.0 (early access, 2026-10-22) swapped Mermaid for **Pele**, which accepts Mermaid 12.1 syntax. Diagrams there follow the theme through `--pele-*` / `--mermaid-*` variables and can be zoomed and panned. Sources:
  - https://obsidian.md/changelog/2026-10-22-desktop-v1.15.0/
  - https://github.com/obsidianmd/pele
- The public 1.14.5 build still uses Mermaid.
- Nodes with the `internal-link` class become note links.

### Current pipeline behaviour (probed against the installed `satteri` 0.10.5)

- The processor is wired in [`astro.config.mjs:61`](https://github.com/januszmajek/majusz/blob/21f404ab5b318f5c11f5badcfc575e91a7901f9d/astro.config.mjs#L61):
  - mdast: `comments, callouts, highlight, obsidianLinks, inlineTags, readingTime, obsidianGuard`
  - hast: `imageWidth, tableScroll`
  - No `features` are passed.
- `features.math` defaults to false (`node_modules/satteri/dist/compile.d.ts:111-118`).
  - With it off, `$$\n\int_0^1 x\,dx\n$$` renders as `<p>$$ \int_0^1 x,dx $$</p>`: the text is raw and the `\,` escape is gone.
  - With it on:
    - Inline math becomes `<code class="language-math math-inline">`.
    - Display math becomes `<pre><code class="language-math math-display">`.
    - In mdast, these are `inlineMath` and `math` nodes (`satteri/dist/types.d.ts:12-17`).
    - `singleDollarTextMath: false` turns off single-dollar math.
- Probe results with math on:

  | Input | Sätteri | Obsidian |
  |---|---|---|
  | `$5 and $6 money` | `<code math-inline>5 and </code>6 money` | text |
  | `Price $ 5 and $6` | inline math, inner space trimmed | text |
  | `Para with $$x$$ inline` | inline math | text (reading view) |
  | Unclosed `$$` | the rest of the document becomes display math | (same in the editor) |
  | `\$5` | literal `$5` | literal `$5` |
  | `` `$y$` `` | inline code | inline code |

- `@astrojs/markdown-satteri` merges `features` from `satteri({ features })` over its gfm and smartypants defaults (`satteri-processor.js:187,210-215`). So enabling math is a one-line config change.
- Plugin order inside the processor (`satteri-processor.js:198-207`):
  - The user's mdast plugins run, then image collection.
  - Then Shiki highlighting runs (skipping `math` and any `excludeLangs`), then the user's hast plugins.
  - A hast plugin therefore sees `pre > code.language-math` untouched, but a mermaid fence it sees is already highlighted.
- `obsidian-guard.ts:14-27` covers `![[`, `[[`, `%%` and `==…==` only. Once math is enabled, math content sits in its own node types and never reaches `text`. So the guard will only see `$` that failed to parse. Under Sätteri's loose rules, that is almost never.
- `reading-time.ts:12-14` counts only `text` nodes, so math and diagram source are already left out of the word count.

### Math rendering options

| | Temml 0.14.0 | KaTeX 0.19.1 | MathJax 4.1.3 |
|---|---|---|---|
| Output | MathML Core | HTML + MathML | SVG / CHTML |
| Client cost | ~2.8 KB gz CSS, optional 9.4 KB woff2 | ~3.6 KB gz CSS + ~60 KB of fonts on a typical page | SVG: heavy markup; CHTML: fonts |
| Sync, pure JS | yes, no deps (verified locally) | yes | async `init` |
| `\ce` | built in | contrib extension | extension |

- Native MathML is Baseline: Chrome/Edge 109+, Firefox and Safari.
- MathJax SVG would look closest to Obsidian, but it's the heaviest option and needs async setup.
- Temml is the lightest option and its output is close in quality.
- Temml output inherits `currentColor`, so both themes work without extra CSS.
- **Fonts**: the Iosevka subset (`scripts/subset-fonts.mjs:19-31`) has no Greek, ∑, ∫, √ or ∞. Math glyphs come from either:
  - Temml's Latin Modern woff2, which costs about 9 KB but has to be self-hosted, since the site uses no third-party font host;
  - or the system math font. Android has no guaranteed system math font; see Open Questions.

### Diagram rendering options

- **Pele 1.13.0 (build time, no browser)**
  - Covers 33 diagram types (flowchart, sequence, class, state, ER, gantt, pie, mindmap, timeline, gitGraph, C4, sankey, architecture, kanban and more).
  - `render()` is sync, takes 2–7 ms per diagram, and needs no DOM.
  - The output SVG declares `--_bg:var(--pele-bg,#fff)`, `--pele-fg`, `-muted`, `-line`, `-surface`, `-surface-alt`, `-border`, `-accent`, `-radius`, `-font`, `-font-mono` (verified locally). Mapping these to the `:root` / `.dark` tokens in `prose.css` makes one SVG serve both themes.
  - Options: `idPrefix` (needed when an article has more than one diagram), `fontFamily`, a pluggable `measurer` (Iosevka is monospaced, so about 0.5 em per character works), and `math`.
  - Invalid syntax throws `PeleError`, which can fail the build the same way the guard does.
  - Risks: the package was published on 2026-10-31, so pin the version. It matches Obsidian 1.15's look, not classic Mermaid.
- **mermaid-cli / mermaid-isomorphic + Playwright (build time)**
  - Highest fidelity to upstream Mermaid.
  - Needs about 150 MB of Chromium in CI and adds an estimated 30–60 s per build.
  - Colours are hard-coded hex, so it needs two SVGs per diagram or CSS overrides.
  - Keep it only as a fallback.
- **Client-side Mermaid 12.x**
  - Hundreds of KB to about 1.5 MB gz, plus layout shift and a re-render on theme change.
  - Visitors without JS see raw source, which breaks the "never show raw syntax" rule.
  - Rejected.
- **beautiful-mermaid**: only 6 diagram types. Rejected.
- **Accessibility**: Pele emits `role`, `aria-*`, `<title>` and `<desc>` from `accTitle` / `accDescr`.
  - Its default ID is the fixed `pele-title`, so the plugin must pass a per-diagram `idPrefix`.
  - Without `accTitle` an SVG has no accessible name, so the plugin should add an `aria-label` fallback, for example the diagram type.

## Code References

- [`astro.config.mjs:51-62`](https://github.com/januszmajek/majusz/blob/21f404ab5b318f5c11f5badcfc575e91a7901f9d/astro.config.mjs#L51-L62): plugin order comment, `shikiConfig`, the `satteri()` call where `features: { math: … }` and the new plugins go.
- [`src/lib/markdown/obsidian-guard.ts:14-27`](https://github.com/januszmajek/majusz/blob/21f404ab5b318f5c11f5badcfc575e91a7901f9d/src/lib/markdown/obsidian-guard.ts#L14-L27): guard patterns. They need a `$` / `$$` backstop for whatever the math plugin rejects, for example the unclosed or mid-paragraph cases if they're turned back into text.
- [`src/lib/markdown/reading-time.ts:12-14`](https://github.com/januszmajek/majusz/blob/21f404ab5b318f5c11f5badcfc575e91a7901f9d/src/lib/markdown/reading-time.ts#L12-L14): counts `text` nodes only, so math and diagram source are already excluded.
- `node_modules/@astrojs/markdown-satteri/dist/satteri-processor.js:126-147,198-215`: highlight exclusions and the order of mdast, highlight and hast plugins.
- `node_modules/@astrojs/internal-helpers/dist/markdown.js:1`: the default excluded languages are `["math"]`.
- `node_modules/satteri/dist/compile.d.ts:85-118`: the `math` / `singleDollarTextMath` feature options.
- [`src/styles/prose.css:92-133`](https://github.com/januszmajek/majusz/blob/21f404ab5b318f5c11f5badcfc575e91a7901f9d/src/styles/prose.css#L92-L133): `pre` / Shiki theme switching. The `--pele-*` mapping and the display-math block styles go here.
- [`src/components/site/ThemeScript.astro`](https://github.com/januszmajek/majusz/blob/21f404ab5b318f5c11f5badcfc575e91a7901f9d/src/components/site/ThemeScript.astro): toggles the `.dark` class on `<html>`. CSS variables are enough; nothing needs re-rendering.
- [`scripts/subset-fonts.mjs:19-31`](https://github.com/januszmajek/majusz/blob/21f404ab5b318f5c11f5badcfc575e91a7901f9d/scripts/subset-fonts.mjs#L19-L31): the Iosevka subset ranges, which have no Greek and no math operators.
- [`src/lib/markdown/inline-tags.test.ts`](https://github.com/januszmajek/majusz/blob/21f404ab5b318f5c11f5badcfc575e91a7901f9d/src/lib/markdown/inline-tags.test.ts): the model for plugin tests through `createSatteriMarkdownProcessor`.
- `content/README.md:64-80,87-103`: the author's "Formatting" and "When the build fails" sections, which need math and diagram entries.

## Architecture Insights

- **Build-time only.** S-03 kept prose rendering free of client JS (`context/archive/2026-10-31-callouts-code-tables/plan.md:72,415`). Temml and Pele both keep that, so the 2 s NFR is mostly a bytes question: about 2 KB of inline SVG per diagram and about 3 KB of math CSS. The roadmap's "first to trim" risk (`roadmap.md:143`) mostly goes away.
- **One file per syntax**, with a header comment stating the Obsidian rule it follows, wired by relative import in `astro.config.mjs`, with no `@/` imports (AGENTS.md).
  - Likely files: `src/lib/markdown/math.ts`, which fixes Obsidian's `$` rules on `inlineMath` / `math` using source positions (`options: { position: true }`, as callouts do) and renders with Temml; and `src/lib/markdown/diagrams.ts`, which turns `code[lang=mermaid]` into a Pele SVG.
  - Both can work in mdast by emitting raw HTML. Rendering math in mdast lets the `$`-rule fix and the rendering share one plugin. Rendering diagrams in mdast avoids the Shiki ordering problem.
- **Guard discipline**: each slice removes or adds guard patterns for what it renders, and walks custom nodes (S-03 review F1). Rendering errors (Temml `ParseError`, `PeleError`) should fail the build with the same `Raw Obsidian syntax in content/articles/<file>` shape the guard uses.
- **Theming through tokens only**: Shiki uses `--shiki-light/dark` and `.dark`, and Pele should get the same treatment via `--pele-*`. A contrast test in the style of `shiki/contrast.test.ts` could check the Pele token pairs in both themes.

## Historical Context (from prior changes)

- `context/archive/2026-10-27-publish-first-article/plan.md:76-77,493` and `plan-brief.md:37,59`: Pele was chosen for S-04 diagrams early on ("works the same on either engine"). That plan also said the guard would fail the build on unsupported syntax until S-04, which turned out not to be true for math.
- `context/archive/2026-10-27-publish-first-article/research.md:224-227`: "math and diagrams … would need Sätteri equivalents, and the ecosystem is young". Sätteri now ships the math parser itself.
- `context/archive/2026-10-31-callouts-code-tables/plan.md:76`: mermaid stays a code block until S-04. Its `reviews/impl-review.md` findings are relevant here:
  - F1: the guard must walk custom nodes.
  - F4: escapes; tell the author to use backticks.
  - F5: stale header comments.
- `context/foundation/design.md:182`: "Diagrams and math — S-04" is still open under "Left for slices". Its look needs a design.md entry (display-math alignment, diagram surface and border, phone overflow).

## Related Research

- `context/archive/2026-10-27-publish-first-article/research.md`: engine choice (Sätteri vs `unified()`).

## Open Questions

1. **Pele (Obsidian 1.15 early access) or Mermaid (public 1.14.5)?** FR-009 says "latest version at implementation time", and S-01 already chose Pele. Confirm with the author that the early-access look counts.
2. **How strict should math parsing be?** Should the site match Obsidian's `$` whitespace rule, and its reading view for mid-paragraph `$$` (plain text), by turning those nodes back into text? Or should it accept Sätteri's looser parsing and document it in `content/README.md`? Turning them back needs source positions, because Sätteri trims the inner space.
3. **Which math font?** Self-host Temml's Latin Modern woff2 (about 9 KB, only on pages with math), or rely on system math fonts? Android's coverage needs a real-device check.
4. **Temml or KaTeX?** Temml is lighter and uses native MathML; KaTeX renders the same in every browser. Compare visually against Obsidian on a sample note in both themes.
5. **Diagrams on a phone**: wide flowcharts at 375 px. Scale down (`max-width:100%`, Pele's default) or scroll horizontally like tables (`table-scroll.ts`)? Obsidian's zoom and pan would need JS and is probably out of scope.
6. **Obsidian `internal-link` nodes in diagrams**: resolve them through `article-index.ts` like wikilinks, or treat them as out of scope and guard them?
7. **Should math also render inside diagram labels** (Pele's `math` option)? Probably out of scope.

## Follow-up: author decisions (2026-10-31)

1. **Pele**: yes. The Obsidian 1.15 (early access) look is the target.
2. **`$` strictness**: match Obsidian. Inline math with whitespace inside its delimiters, and mid-paragraph `$$…$$`, render as plain text.
3. **Math font**: self-hosted (Temml's Latin Modern woff2, served from majusz.com).
4. **Wide diagrams on a phone**: scroll horizontally like tables (`table-scroll.ts`), not scaled down.
5. **`internal-link` nodes in diagrams**: match Obsidian. In scope, with the same rule as wikilinks: a link to a published article goes to its URL, and a link to an unpublished note is plain text.

On question 2, matching Obsidian means turning `inlineMath` back into text when the source has whitespace right after the opening `$` or right before the closing `$` (`$5 and $6`, `$ x $`), and when a `$$…$$` sits in the middle of a paragraph. This needs source positions. Sätteri's looser parsing would turn those into formulas on the site even though Obsidian shows them as text.

### Pele `internal-link` output (probed 2026-11-01, pele 1.13.0)

- `class A internal-link` renders with or without a `classDef`, with no error.
- The node's label is wrapped in `<a class="internal-link" href="Other note" data-href="Other note" rel="noopener">`.
  - The `href` is the raw node label, so on the site it's a broken relative link.
  - For an unpublished note, the private note name ends up in an `href` attribute.
- So the diagrams plugin must rewrite every Pele `<a class="internal-link">`. It resolves the label through `article-index.ts` (the wikilink rule in `obsidian-links.ts`): a published article gets `href="/<slug>"`, and anything else has the `<a>` unwrapped so only the `<text>` stays.
  - This works on the SVG string or by parsing it. The plan picks one.
  - Tests: a published target, an unpublished target, and a label with `|` alias or `#heading` syntax, if Obsidian supports those in diagram links.

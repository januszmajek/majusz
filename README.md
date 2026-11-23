# majusz

The personal blog of Janusz Majek, live at <https://majusz.com>.

## Stack

- [Astro](https://astro.build) 7, static output.
- Tailwind CSS v4 and shadcn/ui, rendered to static HTML: no React ships to the browser.
- Markdown through Sätteri, Astro's default processor, with in-repo plugins
  (`src/lib/markdown/`) for Obsidian syntax: wikilinks, callouts, highlights, math as MathML
  via Temml, mermaid diagrams as inline SVG, and Shiki code highlighting. Obsidian syntax the
  site can't render fails the build.
- Deployed to Cloudflare Workers static assets by GitHub Actions
  (`.github/workflows/deploy.yml`) on every push to `master`.

## Publishing

`content/` is the publish side of an Obsidian vault. Publishing an article means adding one
`.md` file to `content/articles/` plus its images to `content/attachments/`, and pushing.
There is no other step. See [`content/README.md`](content/README.md).

## Develop

Requires Node 22.12 or newer.

```sh
npm install
npm run dev     # dev server at http://localhost:4321
npm test        # Vitest
npm run build   # static build to dist/
```

## Layout

```text
src/       pages, layouts, components, styles and the markdown plugins
content/   articles, images and the article template (the Obsidian vault)
context/   product, stack and design docs, and every change's plan
lab/       design lab: a separate dev app for comparing variants, never deployed
public/    files served as-is (favicons)
```

## How it is built

The site is planned and implemented in small changes with AI coding agents. Product, stack
and design decisions and each change's plan live under [`context/`](context/).

## License

- Code: MIT, see [`LICENSE`](LICENSE).
- Article content in `content/`: © Janusz Majek, all rights reserved.
- Fonts keep their own licenses: Iosevka under the SIL Open Font License
  (`src/assets/fonts/LICENSE.md`), Latin Modern Math under the GUST Font License
  (`src/assets/fonts/math/GUST-FONT-LICENSE.txt`).

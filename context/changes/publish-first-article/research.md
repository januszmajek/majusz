---
date: 2026-10-27T22:08:17+01:00
researcher: Claude (Opus 5.5)
git_commit: 641450b90895c009c82c20a4e541d115fa79cc82
branch: master
repository: januszmajek/majusz
topic: "S-01 publish-first-article: from an Obsidian note to a live article page, kepano-style"
tags: [research, codebase, content-collections, obsidian, obsidian-git, images, reading-time, astro-7, satteri]
status: complete
last_updated: 2026-10-27
last_updated_by: Claude (Opus 5.5)
---

# Research: S-01 publish-first-article

**Date**: 2026-10-27T22:08:17+01:00
**Researcher**: Claude (Opus 5.5)
**Git Commit**: 641450b
**Branch**: master
**Repository**: januszmajek/majusz

## Research Question

How should S-01 turn a finished Obsidian note and its images into a live article page with date
and reading time, with no extra publish step, from a phone or a PC? The author wants to publish the
way kepano does on stephango.com: a dedicated vault for the site, pushed to GitHub with the
Obsidian Git plugin, and the static site builds itself.

Author input (2026-10-27):
- The private vault uses Obsidian Sync. This site should use git, like kepano does.
- Use a dedicated site vault.

## Summary

- **Publish path.** A dedicated vault that is a second clone of this repo. The author runs Obsidian
  Git "commit-and-sync". The push to `master` runs the existing workflow (build, then Cloudflare
  deploy), so the article is live in minutes. Nothing new is needed in CI or in Cloudflare.
- **The vault must be the whole repo.** iOS Obsidian can't open a subfolder as a vault. Obsidian
  Git on mobile needs `.git` at the vault root.
- **Content collection.** No content collection exists yet. S-01 creates `src/content.config.ts`
  with a `glob()` loader and a Zod schema: `title`, `date`, `summary`, optional `tags`.
- **Missing or bad property.** The build fails (exit 1) and names the file. The site already live
  keeps serving, and the author already gets GitHub Actions failure notifications. Verified by a
  test build.
- **Images.** In Obsidian, turn off "Use [[Wikilinks]]", set the link format to relative path, and
  save attachments next to the note. Every image is then a standard markdown image, which Astro 7
  optimizes (webp, srcset, width/height). Tested, including `%20`-encoded `Pasted image …` names.
- **The default markdown engine is Sätteri, not remark.** This is the biggest surprise. remark and
  rehype plugins (the "Obsidian markdown plugins" the stack assumed) only run after switching to
  `processor: unified()` from `@astrojs/markdown-remark`. Sätteri has its own mdast-plugin API and a
  built-in `wikilinks` feature. Reading time and the raw-syntax guard work as small Sätteri plugins
  (tested). S-01 has to pick the processor, because S-02 to S-04 inherit it.
- **A guard that throws only fails the build with `deferRender: true`** on the loader. Without it,
  Astro logs `[ERROR]`, writes an empty page and exits 0.

## Detailed Findings

### What already exists in the codebase

- **`ArticleLayout.astro` is ready to receive an entry.** Its props are `title`, `date`,
  `readingMinutes`, `summary?` and `tags?`. It renders the back link, title, meta line and summary,
  and puts the body in `.prose`
  ([src/layouts/ArticleLayout.astro:7-31](https://github.com/januszmajek/majusz/blob/641450b90895c009c82c20a4e541d115fa79cc82/src/layouts/ArticleLayout.astro#L7-L31)).
  The reading time comes from the caller, which in S-01 is the route.
- **`isoDate()` formats dates in UTC**
  ([src/lib/date.ts:2](https://github.com/januszmajek/majusz/blob/641450b90895c009c82c20a4e541d115fa79cc82/src/lib/date.ts#L2)).
  Obsidian's `date: 2026-10-27` parses to `2026-10-27T00:00:00Z`, so the two match.
- **`ArticleList.Entry` already has the fields S-05 will fill from the collection**: `title`,
  `href`, `date`, `summary?` and `readingMinutes?`
  ([src/components/home/ArticleList.astro:7-14](https://github.com/januszmajek/majusz/blob/641450b90895c009c82c20a4e541d115fa79cc82/src/components/home/ArticleList.astro#L7-L14)).
  The collection's field names should line up with it.
- **`.prose img` only sets `h-auto max-w-full`**
  ([src/styles/prose.css:78](https://github.com/januszmajek/majusz/blob/641450b90895c009c82c20a4e541d115fa79cc82/src/styles/prose.css#L78)).
  Sizing and captions are S-01's (design.md, "Left for slices").
- **No route uses the layouts yet.** The home page is still the placeholder
  ([src/pages/index.astro](https://github.com/januszmajek/majusz/blob/641450b90895c009c82c20a4e541d115fa79cc82/src/pages/index.astro)).
  The article list on the home page belongs to S-05.
- **CI already builds every push and deploys `master`.** It also fails on any file over 20 MB
  ([.github/workflows/deploy.yml:27-46](https://github.com/januszmajek/majusz/blob/641450b90895c009c82c20a4e541d115fa79cc82/.github/workflows/deploy.yml#L27-L46)),
  and the author has failure notifications on (`context/deployment/deploy-plan.md:85,96`).
- **The lab's mock note shows the shape Obsidian writes** (`lab/content/weekly-review.md`): YAML
  frontmatter with `published` and `description` (Web Clipper names), `tags` as a list, and an
  `author: "[[Majusz]]"` wikilink in a property. The article template should use the PRD's names
  (`title`, `date`, `summary`) instead.

### Astro 7.3.8 content pipeline (checked against `node_modules`, test builds in `/tmp`)

**Collection setup.**
- The config goes in `src/content.config.ts`. `src/content/config.ts` is legacy-only.
- Imports: `defineCollection` and `render` from `astro:content`, `glob` from `astro/loaders`, and
  `z` from `astro/zod` (Zod v4). Importing `z` from `astro:content` is deprecated.
- Don't use `entry.slug` or `entry.render()`; they exist only behind
  `legacy.collectionsBackwardsCompat`.

**How the entry id is built** (`node_modules/astro/dist/content/loaders/glob.js:19-38`).
- A frontmatter `slug` wins. Otherwise each path segment goes through github-slugger, so
  `My First Post.md` becomes `my-first-post`.
- With a folder per article, the id contains a slash (`my-first-post/my-first-post`). A
  `[slug].astro` route then fails. Either use a rest route `[...slug]`, or set `generateId` to use
  the last segment.

**Excluding vault folders.**
- The glob uses tinyglobby with `dot: false`, so `.obsidian/` is skipped.
- A leading `!` in a pattern works as an ignore, e.g. `!templates/**` (tested).

**Schema failures** (tested). Any failure throws `InvalidContentEntryDataError` and the build exits
1 with the file's location.
- A missing `summary` gives `summary: Required`.
- `27.10.2026` and `2026-13-45` both fail. The error for the second is confusing.
- `z.coerce.date()` accepts both unquoted and quoted dates; `z.date()` rejects quoted ones.
- `tags` from Obsidian is a YAML list, which `z.array(z.string())` handles.

**Images** (tested).
- `![alt](./b.png)` and `![a](Pasted%20image%2020261027.png)` next to the note both get optimized.
- With `image: { layout: 'constrained', responsiveStyles: true }` the output has webp, a srcset,
  width/height and lazy loading.
- A missing image fails the build with `ImageNotFound`.
- A raw space in a path doesn't parse, but Obsidian URL-encodes paths, so this doesn't come up.
- Output names keep the spaces (`/_astro/Pasted%20image….webp`). Not tested on Workers.

**Obsidian `![[…]]` syntax on Sätteri** (`features: { wikilinks: true }`, tested).
- `![[img.png]]` becomes an optimized image.
- `![[img.png|300]]` loses the width and gets `alt="300"`.
- `[[Other Note]]` becomes `<a href="Other%20Note">`, a broken link. That violates the hard rule.
  S-02 owns wikilinks.

**Markdown processor** (`node_modules/astro/dist/types/public/config.d.ts:2513`).
- Sätteri (`@astrojs/markdown-satteri` 0.4.3, bundled with astro) is the default.
- `markdown.remarkPlugins`, `markdown.rehypePlugins` and `markdown.gfm` are deprecated.
- remark/rehype plugins (`@flowershow/remark-wiki-link`, `remark-obsidian`, `rehype-callouts`, …)
  need `@astrojs/markdown-remark` and `processor: unified({...})`. The package is an optional peer
  and is not installed.

**Reading time** (tested). A Sätteri mdast plugin sets
`ctx.data.astro.frontmatter.minutesRead` from `ctx.textContent(root)`, and the route reads it from
`render(entry).remarkPluginFrontmatter`. Code blocks count as words unless `code` nodes are
skipped. Computing it from `entry.body` instead would count URLs and frontmatter-free raw markdown.

**Raw-syntax guard** (tested). A Sätteri plugin's `text` visitor that throws on `[[`, `![[`, `%%`,
`==x` or `[!note]`.
- Code and inline code are separate node types, so they're never checked.
- It fails the build only with `deferRender: true` on the glob loader. Otherwise the error is
  logged, the page is written empty, and the build exits 0.
- Fallback that also fails the build (tested): check `post.rendered.html` in `getStaticPaths` and
  throw.

### Publishing flow: kepano's way, adapted (web sources, 2026-10)

**Obsidian Git** ([Vinzent03/obsidian-git](https://github.com/Vinzent03/obsidian-git)) is at 2.42.0
(2026-10-18).
- Mobile has been under active repair: binary/image writes fixed in 2.38.4, corrupted packfiles in
  2.39.0, a conflict UI in 2.41.0, and in 2.42.0 tokens moved into Obsidian secrets plus
  include/exclude paths for auto-commit.
- The README still calls mobile "very unstable". It runs on isomorphic-git (no SSH, no
  submodules), and memory caps the repo size; reported crashes start around 3–5k files or 200 MB
  (unverified).
- This repo has about 90 tracked files and a ~3.3 MiB `.git`, far under that.
- Desktop uses native git and is reliable.

**Auth on iPhone.** A fine-grained PAT for this repo only, with Contents read/write and Metadata
read, and an expiry date. Revoke it if the phone is lost.

**Vault layout.**
- The vault is the whole repo, because iOS can't open a subfolder as a vault.
- Hide code with Settings → Files & links → Excluded files (`src/components`, `src/layouts`,
  `context`, `lab`, …).
- On desktop, open a separate clone of the repo as the vault, not the dev checkout, so a sync never
  commits half-finished code.
- Commit `.obsidian/` so the phone gets the same settings. Gitignore `.obsidian/workspace*.json`
  (churn).
- A separate content-only repo would need a cross-repo dispatch and a second token, so it was
  rejected.

**Obsidian settings.**
- "Use [[Wikilinks]]" off.
- New link format: relative path.
- Attachments: same folder as the note, or an `images/` subfolder.
- A core Templates template for new articles with `title`, `date: {{date:YYYY-MM-DD}}`, `summary`
  and `tags`.
- Obsidian Git: auto-sync interval 0 (off), so every push stays deliberate and each push deploys.
  Pull on startup.

**Commit messages.** Obsidian Git's default `vault backup: {{date}}` would break the repo's commit
rules (AGENTS.md: lowercase Conventional Commits, no junk subjects on `master`). Set it to something
like `docs(articles): publish {{numFiles}} files`.

**Drafts.** Every committed file is public on GitHub, whatever the site hides.
- Recommended: write drafts in the private Sync vault, then move the finished note and its images
  into the site vault. On iOS the move goes through the Files app (On My iPhone → Obsidian); not
  tested.
- A `draft: true` property would still publish the text in the repo, so it isn't needed in v1.

**Images from the phone.**
- Obsidian doesn't support HEIC.
- The [Image Converter](https://github.com/xRyul/obsidian-image-converter) plugin converts, resizes
  and renames on paste. Its mobile support is unverified.
- iPhone originals carry GPS/EXIF data, and the repo is public. Re-encoding probably strips it
  (unverified). Check a test image with `exiftool` before relying on that.
- The build optimizes the served images, but the originals stay in the repo.

**Permalink Opener** ([kepano/obsidian-permalink-opener](https://github.com/kepano/obsidian-permalink-opener))
opens the note's live or local URL from a `permalink`/`slug` property, for comparing draft and live.
It's optional.

**Fallbacks.** Working Copy (push needs Pro, a one-time purchase) or uploading on github.com.

## Code References

- `src/layouts/ArticleLayout.astro:7-31`: article props and render; reading time comes from the caller
- `src/components/home/ArticleList.astro:7-14`: `Entry` shape for S-05
- `src/lib/date.ts:2`: UTC ISO date
- `src/styles/prose.css:78`: current image rule
- `astro.config.mjs`: no `markdown` or `image` config yet; fonts and React only
- `.github/workflows/deploy.yml:27-46`: build check, 20 MB guard, deploy on `master`
- `wrangler.jsonc:5-11`: static assets, `404-page`, previews off
- `.gitignore:1-3`: `.agents` and `.claude` ignored; `.obsidian/workspace*.json` needs adding
- `lab/content/weekly-review.md:1-11`: an Obsidian-shaped note (Web Clipper property names)
- `node_modules/astro/dist/content/loaders/glob.js:19-38`: id generation
- `node_modules/astro/dist/types/public/config.d.ts:2513`: Sätteri is the default processor

## Architecture Insights

- **One shared pipeline.** S-01 sets up the markdown pipeline (processor, plugins, guard) that
  S-02 to S-04 extend. The processor choice is the decision with the widest reach in this slice.
  - Staying on Sätteri: native, fast, the default. The guard and reading time are already proven.
    Callouts, math and diagrams for S-03/S-04 would need Sätteri equivalents, and the ecosystem is
    young.
  - Switching to `unified()` now: the remark/rehype Obsidian ecosystem. Costs one more dependency
    and it's no longer the default path.
- **"Fail loud, keep serving"** handles bad input: schema errors, missing images, raw syntax. A
  failed build never reaches Cloudflare, so the live site is untouched and the author is notified.
  This answers the roadmap unknown about a missing property without a skip-and-hide mode, which
  could silently drop an article.
- **The publish step stays "add a file".** Adding a note and images, then commit-and-sync, is the
  same act as "adding the file". It doesn't break the hard rule against other publish steps.
- **The tech stack assumed remark-style plugins**, and AGENTS.md says "Obsidian markdown plugins
  are planned". On Astro 7 that means either a processor switch or Sätteri plugins. The plan should
  state which, and update `tech-stack.md`/AGENTS.md wording if needed.

## Historical Context (from prior changes)

- `context/archive/2026-10-18-visual-direction/`: designed the article page layout and left image
  sizing and captions to S-01 (`design.md`, "Left for slices").
- `context/foundation/infrastructure.md:116,124,131,165-168`: risks of a failed build silently
  blocking publishing, a 25 MiB image failing the deploy, and preview URLs leaking drafts. The
  mitigations (CI build on every push, 20 MB check, previews off, failure notifications) are
  already in place.

## Related Research

None. This is the first `research.md` in the repo.

## Open Questions

1. **Article URL.** `/<slug>` (kepano style; the lab note's `source` is
   `https://majusz.com/weekly-review`) or `/articles/<slug>`? Root slugs can collide with `about`,
   `404` and future pages. A build check could catch that.
2. **Slug source.** The filename slugified by default, or an optional `slug` property? Renaming a
   published note changes its URL unless `slug` is set.
3. **Folder per article or flat.** Either `articles/<slug>.md` with `articles/<slug>/` or
   `images/` for images, or `articles/<slug>/<slug>.md`. A folder per article is tidier for images,
   but needs `generateId` or a rest route.
4. **Processor.** Sätteri with small in-repo plugins, or `unified()` for the remark ecosystem.
   Decide in the plan with S-03/S-04 in view.
5. **Content folder location.** Under `src/content/articles/`, or a top-level `content/articles/`
   that is easier to find in the vault on the phone?
6. **Reading-time rule.** 200 wpm, and should code count?
7. **Phone-flow verification.** Obsidian Git clone, a fine-grained PAT, and a commit-and-sync from
   the iPhone are manual steps only the author can do. Also check Image Converter on mobile and
   EXIF stripping. These belong in the plan's Manual rows.

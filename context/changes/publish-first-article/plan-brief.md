# Publish First Article — Plan Brief

> Full plan: `context/changes/publish-first-article/plan.md`
> Research: `context/changes/publish-first-article/research.md`

## What & Why

This is roadmap S-01, the north star: a finished Obsidian note and its images become a live article
page with its date and reading time, and there is no publish step beyond adding the file. Publishing
works the way kepano does it: a dedicated vault that is a clone of this repo, then Obsidian Git
commit-and-sync. The push to `master` deploys the site.

## Starting Point

- No content collection, `content/` folder or article route exists yet.
- `ArticleLayout.astro`, `isoDate()` and the `.prose` styles are ready and unused.
- CI already builds every push and deploys `master`.
- Astro 7.3.8 uses Sätteri as its markdown processor by default.

## Desired End State

- A note in `content/articles/` with `title`, `date` and `summary` is served at `/<slug>`, with
  optimized images, `YYYY-MM-DD · N min`, and no raw Obsidian syntax.
- Bad input fails the build loudly and the live site keeps serving. Bad input means a missing
  property, a missing image, unsupported syntax, a duplicate slug, or a route clash.
- The repo opens as a ready-made Obsidian vault on the desktop and the iPhone.
- The author's real hello post is live, published from the phone.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Publish path | Dedicated vault = whole repo clone, Obsidian Git commit-and-sync | Matches kepano. iOS can't open a subfolder as a vault | Research + author |
| URL | `/<slug>` at the root | kepano style, short links for X | Author |
| Slug | From `title`, transliterated to ASCII (`zazolc-gesla-jazn`), optional `slug` pins it | Clean shareable links, and shared links survive title edits | Plan |
| Folders | `content/articles/` (flat) + `content/attachments/` at repo root | One tap from the vault root on the phone; writing is separate from code | Plan |
| Markdown engine | Sätteri, plus two in-repo plugins | Default and already tested; Pele (S-04) works the same on either engine | Plan |
| Reading time | `Intl.Segmenter` words, 200 wpm, code skipped, min 1 | Works for Polish and English with nothing to install | Plan |
| Line breaks | "Strict line breaks" on in the vault | The editor shows what the site renders, with no site code | Plan |
| Bad input | Fail the build (`deferRender`, `prerenderConflictBehavior: 'error'`) | The live site stays as it was and the author is already notified | Research |
| Drafts | Kept in the private Sync vault, no `draft` property | Anything committed is public on GitHub | Research |
| Commits from Obsidian | `docs(articles): sync from {{hostname}}`, interval sync off, auto-commit limited to `content/` | Every push deploys, and public history must stay conventional | Research |
| First article | A short real hello post with one photo | Closes S-01 live, without a throwaway test post in public history | Author |
| Captions | None | Matches Obsidian | Plan |

## Scope

**In scope:**
- Content collection and schema, slug generation, the `[slug]` route, responsive images.
- Reading-time and raw-syntax guard plugins.
- Committed `.obsidian/` config, an article template and gitignore rules.
- AGENTS.md, design.md and a `content/README.md` publish how-to.
- The hello post, published from the iPhone.

**Out of scope:**
- The home list and empty state (S-05).
- Wikilinks and tags display (S-02).
- Callouts, code theme and tables (S-03).
- Diagrams (Pele) and math (S-04).
- Drafts, captions, a `unified()` switch, a separate content repo, a test runner.

## Architecture / Approach

```
iPhone/desktop Obsidian vault (repo clone)
  content/articles/*.md + content/attachments/*
      │  Obsidian Git commit-and-sync → push master
      ▼
GitHub Actions: astro build
  glob loader → Zod schema → generateId(slug ?? toSlug(title))
  Sätteri + reading-time + obsidian-guard (deferRender: fails the build on raw syntax)
  src/pages/[slug].astro → ArticleLayout
      │  build OK → wrangler deploy          build fails → nothing deploys, author notified
      ▼
majusz.com/<slug>
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Collection and route | `/<slug>` pages, schema, slugs, optimized images, conflict errors | The conflict flag may not cover static routes, which needs a fallback check |
| 2. Markdown pipeline | Reading time, raw-syntax guard, image styling | Sätteri plugin API is 0.x |
| 3. Vault config and docs | `.obsidian/` settings, template, Obsidian Git config, docs | Obsidian setting key names vary by version |
| 4. Hello post end to end | First real article live from the iPhone | Obsidian Git on iOS is "very unstable"; fallback is Working Copy |

**Prerequisites:** Obsidian Git installed on both devices, a fine-grained PAT for this repo, and the
author's hello post text and photo.

**Estimated effort:** about 2 sessions for Phases 1–3, plus the author's time for Phase 4.

## Open Risks & Assumptions

- Obsidian Git on iOS may crash or corrupt the clone. The repo is small (about 90 files), and the
  fallback is Working Copy or a github.com upload.
- Phone photos can carry GPS data into the public repo. Location is stripped on the phone before
  commit-and-sync; history is permanent once pushed.
- Nothing links to the hello post until S-05 ships the home list.

## Success Criteria (Summary)

- The author publishes from the iPhone by adding a note and photo, and it's live within 5 minutes.
- Readers see a clean article with images, date and reading time, and never raw Obsidian syntax.
- Bad notes fail the build with the file named, and the live site is unaffected.

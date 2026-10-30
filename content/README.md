# Publishing

This repo is the site vault. Every note in `articles/` becomes a page at `majusz.com/<slug>`.
Pushing to `master` deploys. There is no other step.

**Everything you push is public, forever.** The repo is public on GitHub, and its history keeps
deleted files. That includes `%%comments%%`: once the site hides them, they stay readable in
the source. Anything in a note is public, shown on the page or not.

## Folders

- `articles/` — one `.md` per article, flat. Only this folder is built.
- `attachments/` — images. Pasting an image puts it here.
- `templates/` — the article template.

## One-time setup

**Desktop**

1. Clone the repo into a new folder. Not the dev checkout: a sync would commit half-done code.
2. Open that folder as a vault in Obsidian. Trust the author to enable plugins.
3. Install **Git** (Obsidian Git) from Community plugins. Its settings come from the repo.
4. In that clone: `git config user.email <id>+<user>@users.noreply.github.com`.

**iPhone**

1. Create a GitHub fine-grained token: this repo only, Contents read/write, Metadata read,
   with an expiry date. Revoke it if the phone is lost.
2. Create an empty vault. Install **Git** (Obsidian Git).
3. Run "Clone an existing remote repo" with the HTTPS URL and the token. Restart Obsidian.
4. Obsidian Git settings: author name and the same `@users.noreply.github.com` email.
5. Optional: **Image Converter**, set to strip metadata and shrink photos.

## Publish

1. Open the site vault. It pulls on startup; wait for it.
2. Write in the private vault. When the note is finished, move it into `articles/`.
   On iPhone: Files app → On My iPhone → Obsidian.
3. Check the properties: `title`, `date` (`YYYY-MM-DD`), `summary`. `tags` is optional.
   New notes: insert the template "article".
4. Add images with location stripped:
   - iOS share sheet → Options → Location off, or
   - Image Converter with metadata removal.
   - Use JPEG, PNG or WebP. HEIC does not work.
5. Use standard image links, `![alt](../attachments/photo.jpg)`. Pasting does this for you.
   Images fill the text width. To show one smaller, add a width: `![alt|300](…)`. Width only;
   `|300x200` fails the build.
6. Check before you sync. Open Source Control: only your note and its images should be listed.
   Commit-and-sync commits every changed file in the vault, not just `content/`.
7. Run **Commit-and-sync**. The page is live in a few minutes.

## The URL

- The URL is the title, lowercased, accents dropped: "Zażółć gęślą jaźń" → `/zazolc-gesla-jazn`.
- Set a `slug` property to choose it: lowercase letters, digits and single hyphens.
- **Renaming a published title changes its URL.** Set `slug` to the old one to keep it.

## When the build fails

GitHub notifies you. Nothing deploys, so the live site stays as it was.
The Actions log names the file. Fix it and commit-and-sync again.

It fails on:

- a missing or invalid property (no `summary`, a date like `27.10.2026`, a bad `slug`);
- an image that isn't there (wrong path or name);
- raw Obsidian syntax the site can't show yet: wikilinks, embeds, `%%comments%%`,
  `==highlights==`, callouts. Use plain markdown, or put it in backticks;
- two articles with the same slug;
- a slug that clashes with a page, like `404`.

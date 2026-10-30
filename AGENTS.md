# Repository Guidelines

majusz.com is a single-author personal blog built with plain Astro 7 (npm, static
output). Product, stack and design decisions live in `@context/foundation/prd.md`,
`@context/foundation/tech-stack.md` and `@context/foundation/design.md`. If a change
contradicts any of them, stop and ask
before changing the code or the doc.

## Hard rules

- Never add login, admin, editor, or comment pages, and never collect visitor data
  (accounts, emails, analytics, tracking cookies). The site is public and read-only.
- Publishing an article is only ever adding a `.md` file plus its images. Do not
  introduce any other required publish step.
- A `[[wikilink]]` to an unpublished note renders as plain text. Readers must never
  see raw or broken Obsidian syntax.
- React, Tailwind v4, and shadcn/ui are installed (`@package.json`). Markdown goes through
  Sätteri (Astro's default processor) with in-repo plugins in `src/lib/markdown/`; no
  remark/rehype or Obsidian plugin packages exist. Never assume one does.
- `src/lib/markdown/obsidian-guard.ts` fails the build on Obsidian syntax the site can't
  render. Remove a pattern only in the slice that adds rendering for that syntax; note
  embeds (`![[note]]`) stay guarded in v1.
- Deploy target is Cloudflare Workers with static assets, not Pages
  (`@wrangler.jsonc`, `@context/foundation/infrastructure.md`). Pushing to `master`
  deploys through `@.github/workflows/deploy.yml`, the only deploy path; never
  connect Workers Builds.
- Running `wrangler deploy` or `wrangler rollback`, editing the custom domain, or
  touching API tokens needs explicit human approval.
- Never edit files under `context/archive/`.

## Project Structure

- `src/pages/` holds the placeholder home, `404.astro` (served for missing URLs) and
  `[slug].astro`, one page per article from the `articles` collection (`src/content.config.ts`).
- `content/` is the publish side of the Obsidian vault: `articles/` (flat, one `.md` per
  article, the only folder built), `attachments/` (images), `templates/` (article template)
  and `README.md` (the author's publish how-to). `src/lib/slug.ts` derives URLs from titles.
- `.obsidian/` is the committed vault config; `.gitignore` allowlists the shared files and
  keeps per-device state and plugin code out.
- `src/lib/markdown/` holds the Sätteri plugins (reading time, raw-syntax guard, `|300` image width), wired in
  `astro.config.mjs`.
- `src/styles/global.css` holds Tailwind, the shadcn theme tokens (`:root` / `.dark`) and the
  type scale as `text-<role>` tokens (`text-page-title`, `text-body`, …); use those, not raw
  sizes. `src/styles/prose.css` styles article and page bodies (`.prose`).
- `src/layouts/Layout.astro` is the site shell (fonts, theme script, header, footer, motif);
  its pieces live in `src/components/site/`, nav entries in `src/config/nav.ts`.
- `src/layouts/ArticleLayout.astro`, `PageLayout.astro` and `src/components/home/` (Intro,
  ArticleList, EmptyState) are the page layouts slices fill; only `[slug].astro` uses one
  (`ArticleLayout`) so far.
  `src/lib/date.ts` formats dates (UTC).
- `src/components/ui/` holds shadcn primitives, added only when used with
  `npx shadcn add <name>`; `src/lib/utils.ts` holds `cn()`.
- `lab/` is the design lab, a separate dev app (own config, port 4322) that frames
  whole-site variants side by side; it is never built or deployed. `lab/variants/` is
  gitignored and local-only. `lab/content/` holds original mock articles; never put
  other authors' text there, the repo is public. Variants link their stylesheet via `?url` and declare `@source`.
- `src/assets/fonts/` holds subset Iosevka woff2 files (OFL, `LICENSE.md`); regenerate with
  `node scripts/subset-fonts.mjs`, never swap in full Fontsource files (~1 MB per face).
- `public/` is served as-is (favicons).
- `context/` holds workflow docs: `foundation/` contracts, `changes/<change-id>/` plans.
  `changes/bootstrap-verification/` is the bootstrapper's run log and has no `change.md`
  by design; it is not a change, so leave it alone.
- `*.scaffold` files are unmerged starter leftovers, not sources of truth.

## Commands

- `npm run dev -- --background` — start the dev server in agent sessions; manage it
  with `npx astro dev stop|status|logs`.
- `npm run lab` (`npm run labt` for the phone over Tailscale) — design lab at
  `localhost:4322`, beside the site's dev server. It is not tracked by `astro dev stop`;
  stop it with Ctrl+C, or run it as a background task and stop that.
- `npm run build` — static build to `dist/`. It is currently the only check (CI runs
  it on every push); run it before committing.
- `npx wrangler versions list` / `npx wrangler deployments list` — deploy history.
- `npx wrangler rollback <version-id> --message "<reason>"` — rollback (approval
  needed); also revert the bad commit, or the next push redeploys it.

## Coding Style

TypeScript runs under `astro/tsconfigs/strict` (`@tsconfig.json`). No linter,
formatter, test runner, or CI exists yet.

## Commits

- Use lowercase Conventional Commits `type(scope): subject` as in `git log`
  (`feat`, `fix`, `chore`, `refactor`, `docs`). Phase commits use
  `<type>(<change-id>): <phase title> (p<N>)`; other commits scope by area
  (`foundation`, `roadmap`, `deploy`, `agents`, `site`, `dev`).
- The GitHub repo is linked from the site (PRD FR-006) and read by recruiters. Squash
  fixup commits before pushing to `master`; never push subjects like `wip`, `fix`,
  `test`, or a bare word.

## Project instructions

Before starting a task, select the relevant entries below, read their linked
rule files, and follow the applicable guidance. Read additional rule files only
when the task needs them. These links are references, not automatic imports.

When using an installed skill, read its `SKILL.md` and any references required
by that skill. Follow the user's requested scope; a lesson workflow is not a
requirement to perform unrelated setup steps.

The linked `.agents/` files are local-only (gitignored) and absent from public
clones; if a link does not resolve, continue without it.

### Lesson rules by task

| Task | Rules |
| --- | --- |
| Idea shaping, project initialization, and PRD | [m1l1](.agents/10x-lesson-rules/m1l1.md) |
| Tech stack and starter selection | [m1l2](.agents/10x-lesson-rules/m1l2.md) |
| Project scaffolding and bootstrap | [m1l3](.agents/10x-lesson-rules/m1l3.md) |
| Agent onboarding, instruction review, and recurring lessons | [m1l4](.agents/10x-lesson-rules/m1l4.md) |
| Deployment platform research and deployment planning | [m1l5](.agents/10x-lesson-rules/m1l5.md) |
| Roadmap and milestone planning | [m2l1](.agents/10x-lesson-rules/m2l1.md) |
| Change setup, implementation planning, plan review, and execution | [m2l2](.agents/10x-lesson-rules/m2l2.md) |
| Implementation review and finding triage | [m2l3](.agents/10x-lesson-rules/m2l3.md) |
| Codebase research, external documentation, and problem framing | [m2l4](.agents/10x-lesson-rules/m2l4.md) |
| Worktrees, parallel work, and autonomous execution | [m2l5](.agents/10x-lesson-rules/m2l5.md) |
| Test strategy and phased test rollout | [m3l1](.agents/10x-lesson-rules/m3l1.md) |
| Test design, behavior verification, and TDD | [m3l2](.agents/10x-lesson-rules/m3l2.md) |
| Quality gates, agent hooks, Git hooks, and CI checks | [m3l3](.agents/10x-lesson-rules/m3l3.md) |
| Browser testing and E2E workflows | [m3l4](.agents/10x-lesson-rules/m3l4.md) |

### Maintenance

Skills are installed in `.agents/skills/`. Detailed lesson rules stay in
`.agents/10x-lesson-rules/`; keep this file as a short index.
Preserve this index when updating skills or rules. The 10x CLI can insert or
replace its managed rules block when rules are applied; save updated lesson
rules separately and update these links as needed.

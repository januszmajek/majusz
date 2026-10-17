# Repository Guidelines

majusz.com is a single-author personal blog built with plain Astro 7 (npm, static
output). Product and stack decisions live in `@context/foundation/prd.md` and
`@context/foundation/tech-stack.md`. If a change contradicts either, stop and ask
before changing the code or the doc.

## Hard rules

- Never add login, admin, editor, or comment pages, and never collect visitor data
  (accounts, emails, analytics, tracking cookies). The site is public and read-only.
- Publishing an article is only ever adding a `.md` file plus its images. Do not
  introduce any other required publish step.
- A `[[wikilink]]` to an unpublished note renders as plain text. Readers must never
  see raw or broken Obsidian syntax.
- React, shadcn/ui, and Obsidian markdown plugins are planned but not installed
  (`@package.json`). Never assume one exists.
- Deploy target is Cloudflare Workers with static assets, not Pages
  (`@wrangler.jsonc`, `@context/foundation/infrastructure.md`). Pushing to `master`
  deploys through `@.github/workflows/deploy.yml`, the only deploy path; never
  connect Workers Builds.
- Running `wrangler deploy` or `wrangler rollback`, editing the custom domain, or
  touching API tokens needs explicit human approval.
- Never edit files under `context/archive/`.

## Project Structure

- `src/pages/` holds the placeholder home and `404.astro` (served for missing URLs).
- `public/` is served as-is (favicons).
- `context/` holds workflow docs: `foundation/` contracts, `changes/<change-id>/` plans.
- `*.scaffold` files are unmerged starter leftovers, not sources of truth.

## Commands

- `npm run dev -- --background` — start the dev server in agent sessions; manage it
  with `npx astro dev stop|status|logs`.
- `npm run build` — static build to `dist/`. It is currently the only check (CI runs
  it on every push); run it before committing.
- `npx wrangler versions list` / `npx wrangler deployments list` — deploy history.
- `npx wrangler rollback <version-id> --message "<reason>"` — rollback (approval
  needed); also revert the bad commit, or the next push redeploys it.

## Coding Style

TypeScript runs under `astro/tsconfigs/strict` (`@tsconfig.json`). No linter,
formatter, test runner, or CI exists yet.

## Commits

- Use lowercase `type: subject` as in `git log` (`doc:`, `chore:`), one space after
  the colon.
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

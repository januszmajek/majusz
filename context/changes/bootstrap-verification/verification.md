---
bootstrapped_at: 2026-10-15T07:22:50Z
starter_id: astro
starter_name: Astro
project_name: majusz
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
starter_id: astro
package_manager: npm
project_name: majusz
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: false
    conventions: false
    docs_current: true
    can_judge_agent: false
  has_auth: false
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

### Why this stack

A solo author shipping a minimal personal blog in about three weeks, with no accounts, no database and no visitor data, needs a content-first framework rather than a full-stack SaaS starter. Plain Astro was chosen over the general web default (10x Astro Starter) because that default's Supabase database and auth are explicitly ruled out by the PRD, while Astro treats markdown posts living in the repo as first-class content and serves static pages that load fast on phones and survive a viral spike on Cloudflare Pages at no cost, using the majusz.com domain already registered there. The author's hard requirements of React and shadcn/ui are met through Astro's React integration, which also hosts the post-launch in-browser game as an interactive island; Obsidian-flavored rendering (callouts, wikilinks, diagrams, math, syntax highlighting) is expected to come from markdown plugins. All four agent-friendly gates pass and bootstrapper confidence is verified. The self-check left official-starter, conventions and agent-judgment unconfirmed, so the generated agent instructions should spell out Astro, React-island and shadcn/ui conventions. CI runs on GitHub Actions with auto-deploy on merge to main, matching the PRD's publish-by-adding-a-file flow.

## Pre-scaffold verification

| Signal      | Value                                          | Severity | Notes                                                                                   |
| ----------- | ---------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| npm package | create-astro v5.2.6 published 2026-10-08       | fresh    | resolved from cmd_template (`npm create astro`)                                          |
| GitHub repo | withastro/astro last pushed 2026-10-15         | fresh    | card.docs_url is `https://docs.astro.build` (not GitHub); repo inferred as withastro/astro |

Local toolchain at run time: Node v22.14.0, npm 10.9.2 (scaffold declares `engines.node >=22.12.0`).

## Scaffold log

**Resolved invocation**: `npm create astro@latest -- .bootstrap-scaffold --template basics --install --git --yes`
**Strategy**: subdir-then-move
**Exit code**: 0
**Files moved**: 9 top-level entries (astro.config.mjs, node_modules/, package.json, package-lock.json, public/, src/, tsconfig.json, .vscode/, plus .gitignore merged)
**Conflicts (.scaffold siblings)**: AGENTS.md.scaffold, CLAUDE.md.scaffold, README.md.scaffold
**.gitignore handling**: append-merged (scaffold lines appended under `# from astro`; no duplicates with existing lines)
**.bootstrap-scaffold cleanup**: deleted

Move log:

```
dropped: .git/ (nested repo from --git; cwd .git kept)
append-merged: .gitignore
sidelined: AGENTS.md -> AGENTS.md.scaffold
moved: astro.config.mjs
sidelined: CLAUDE.md -> CLAUDE.md.scaffold
moved: node_modules
moved: package.json
moved: package-lock.json
moved: public
sidelined: README.md -> README.md.scaffold
moved: src
moved: tsconfig.json
moved: .vscode
removed: .bootstrap-scaffold/
```

Adjustments beyond the conflict matrix (noted for audit-trail completeness):

- **Nested `.git/` dropped.** The card's `--git` flag initialised a repo inside `.bootstrap-scaffold/`. The cwd already had its own `.git/`, so the scaffold's repo (one initial commit by create-astro) was deleted rather than sidelined as `.git.scaffold`.
- **Package name fixed.** create-astro derived `"name": "bootstrap-scaffold"` from the temp directory; it was rewritten to `"majusz"` (the hand-off `project_name`) in `package.json` and `package-lock.json`.
- **Symlink retargeted.** The scaffold ships `CLAUDE.md` as a relative symlink to `AGENTS.md`; after sidelining, `CLAUDE.md.scaffold` was retargeted to `AGENTS.md.scaffold` so it does not point at the user's `AGENTS.md`.

Smoke check: `npm run build` exited 0 (astro v7.3.8, 1 page built); `dist/` and `.astro/` removed afterwards.

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW (0 INFO)
**Direct vs transitive**: 0/0/0/0 direct of total 0/0/0/0 (1 direct dependency: astro; 259 total, 84 optional)

#### CRITICAL findings

None.

#### HIGH findings

None.

#### MODERATE findings

None.

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint                                   | Value                 |
| -------------------------------------- | --------------------- |
| bootstrapper_confidence                | verified              |
| quality_override                       | false                 |
| path_taken                             | custom                |
| self_check_answers.typed               | true                  |
| self_check_answers.from_official_starter | false               |
| self_check_answers.conventions         | false                 |
| self_check_answers.docs_current        | true                  |
| self_check_answers.can_judge_agent     | false                 |
| team_size                              | solo                  |
| deployment_target                      | cloudflare-pages      |
| ci_provider                            | github-actions        |
| ci_default_flow                        | auto-deploy-on-merge  |
| has_auth                               | false                 |
| has_payments                           | false                 |
| has_realtime                           | false                 |
| has_ai                                 | false                 |
| has_background_jobs                    | false                 |

Not yet set up (out of scope for the bootstrap step): React integration and shadcn/ui (`npx astro add react`), markdown plugins for Obsidian-flavored rendering, Cloudflare Pages adapter/config, GitHub Actions workflow.

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.

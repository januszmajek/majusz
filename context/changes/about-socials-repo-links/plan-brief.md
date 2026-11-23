# About, Socials and Repo Links — Plan Brief

> Full plan: `context/changes/about-socials-repo-links/plan.md`

## What & Why

Roadmap S-06 (PRD FR-004–006), the last slice before v1: visitors can open an About page and
reach the author's GitHub, LinkedIn and X and the site's public repo. Because recruiters will
open that repo, it has to be presentable (README, license, GitHub description).

## Starting Point

The header already renders nav items from `src/config/nav.ts` (empty today), and
`PageLayout.astro` waits unused for About. The footer lacks design.md's `source ↗` link. The
README is one line, there is no LICENSE, and the GitHub repo has no description.

## Desired End State

`about` sits in the header on every page. `/about` has a short draft bio and an "Elsewhere" list
(GitHub, LinkedIn, X, site source). Every footer ends with `· source ↗`. The repo has a concise
technical README, an MIT license for code, and a description plus homepage on GitHub.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Socials | GitHub, LinkedIn, X | Profiles the author actively uses (PRD FR-005) |
| About copy | Draft written now, author rewrites later | Matches the plan to replace all copy at the end |
| README | Concise, technical, one screen | Presentable to recruiters without upkeep burden |
| License | Code MIT, articles all rights reserved, fonts own licenses | Code is reusable, writing stays the author's |
| External links | Same tab, `↗` marker, `rel="me"` on profiles | Matches design.md's `source ↗`; no new-tab surprises |
| URLs | One module `src/config/links.ts` | About and footer share one source |
| GitHub metadata | Set via `gh repo edit` at push time, with approval | Outward-facing change outside git |
| Commit author names | Left as is | Rewriting pushed `master` isn't worth it |

## Scope

**In scope:** links module, About page, nav entry, footer source link, README, LICENSE,
`package.json` license, design.md / AGENTS.md / roadmap updates, GitHub description + homepage.

**Out of scope:** header social icons, CV or email links, final About copy, history rewrite,
instant navigation.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. About page and links | `/about`, nav entry, footer `source ↗` | Phone header crowding with `about` + toggle |
| 2. Repo presentation and docs | README, LICENSE, docs in step | README drifting from real commands |
| 3. GitHub metadata | Repo description and homepage | Outward-facing; runs only on approval |

**Prerequisites:** F-01 (done).
**Estimated effort:** one short session.

## Open Risks & Assumptions

- About copy is a draft in the author's voice; it will be replaced.
- LinkedIn URL is stored without `?locale=pl`.

## Success Criteria (Summary)

- From any page a visitor reaches About, each social profile and the repo in one click.
- The repo page on GitHub reads as finished: description, homepage, README, license.

# Frame Brief: Visual direction (F-01)

> Framing step before /10x-plan. This document captures what is *actually*
> at issue, separated from what was initially assumed.

## Reported Observation

The site is a bare placeholder (`system-ui`, two centered lines; `src/layouts/Layout.astro`,
`src/pages/index.astro`, `src/pages/404.astro`). The PRD wants it "simple, clean and
distinctive … doesn't read as a generic blog template" (`prd.md` §Success Criteria), and says
"the author has a direction in mind" (`prd.md` §Vision). That direction is not written down
anywhere in the repo, and the author says it is not yet concrete.

## Initial Framing (preserved)

- **Stated cause or approach** (roadmap F-01): the direction, the home/article/About layouts
  and the navigation must be decided up front, because every page inherits them and a late
  redesign touches every slice.
- **Proposed direction** (roadmap F-01): one foundation change that "starts with the design
  discussion", settles the direction "until it's concrete enough to apply", and ships the base
  design (type, both-theme colors, spacing, layout) live on the existing placeholder and 404 pages.
- **Pre-dispatch narrowing**: leading concern is *direction not concrete*. Author: "I have some
  specific elements in mind that are rather specific but in total view it might change. Plus I
  have the vibe/motive/aesthetic which I want to follow and want help to reach it."

## Dimension Map

1. **Capture gap** — the elements and vibe exist only in the author's head; nothing records them.
2. **Convergence method** — the elements are concrete one by one, but the whole only settles once
   seen; a decide-in-words-then-apply flow locks choices before the author can judge them.
3. **Validation canvas** ← touches initial framing — F-01 is "done" when the design is live on
   placeholder + 404, but those pages can't show whether the vibe works.
4. **Scope bundling** ← initial framing — direction, three page layouts, nav and both palettes in
   one decision, for pages (article, home list, About) that don't exist yet.
5. **No stopping rule** — "distinctive" and "concrete enough to apply" have no test, so the
   discussion has no natural end.

## Hypothesis Investigation

Investigated inline (repo surface is ~6 files plus foundation docs; no sub-agents warranted).

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| 1. Capture gap | No font, color or motif named in `prd.md`, `shape-notes.md`, `tech-stack.md`, `roadmap.md`; shape-notes:49,59 cite only zthreee.com; roadmap F-01 Unknowns lists the direction as open | STRONG (but a symptom of 2: capturing words won't make it concrete) |
| 2. Convergence method | Author: total view "might change"; past changes of mind came from "seeing it first and side by side variants"; elements are typography + signature motif, which are judged visually | STRONG |
| 3. Validation canvas | Placeholder/404 hold one `h1` + one `p` (`index.astro`, `404.astro`); author says the vibe must show on "home with list and article page"; neither exists yet (S-01 ready, S-05 proposed) | STRONG |
| 4. Scope bundling | Roadmap F-01 outcome bundles direction + layouts + nav + palettes; S-05/S-06 Unknowns (intro copy, About copy, flat vs grouped list) are still open. Yet the late-restyle rationale holds: S-03–S-07 all list F-01 as prerequisite | WEAK as cause (the bundling is reasonable; the issue is how it's validated, see 3) |
| 5. No stopping rule | `prd.md`:62 criterion is qualitative; roadmap says "discussed until it's concrete enough to apply" | WEAK on its own; resolved by 2 (author chooses between rendered variants) |

## Narrowing Signals

- Author converges by **seeing rendered variants side by side**, not by talking it through. So the
  problem is mainly dimension 2, not just a missing write-up (1).
- The specific elements are **typography and a signature motif**. Both are visual and site-wide,
  which is the part F-01 rightly owns before slices build on it.
- The vibe can only be judged on **home with the article list and the article page**. That rules
  placeholder + 404 out as the place where F-01 is judged (dimension 3).
- Author pushback on the first reframe: seeing font + motif is not enough; they need to see
  **colors and the whole idea of the website** together. The specific elements are type + motif,
  but what gets judged is the complete look (type, color, motif, page structure) as one.

## Author Inputs (recorded for /10x-plan, not decisions)

- **Vibe:** clean, "space / space-explorer", with the clear, intuitive UX of pre-Liquid-Glass Apple.
- **Specific elements:** ASCII used somewhere (form open); a night-sky background like the one
  the author remembers in Grok's chat, where dots read as stars and move a little (couldn't confirm
  Grok's current UI; the memory is what matters). Fairly sure about the font; the motif is still loose.
- **Whole look stays open:** "I have to see how it looks together, maybe I will change my mind."
  More inspiration from popular sites may come later.
- **Themes:** dark and light must both be visible to judge a variant.
- **Stand-in content:** the author will supply the text of 2 internet articles. They are someone
  else's work, so they're for local exploration only and must not be committed to the public repo
  or deployed.
- **Process:** the author wants a tool or service to compare styles and mix the best parts into
  our own, and will add styling skills (not in the repo yet) to help.
- **Possible tools (unverified, for the plan to evaluate):** tweakcn (live shadcn theme editor:
  colors, fonts, light/dark, exports Tailwind CSS vars), Realtime Colors (palette + fonts on a sample
  site, has a blog template; reports disagree on dark-mode preview). Neither covers ASCII, the
  starfield or page structure, so whole-site variants need a custom render.
- **Required comparison tool:** the author wants the project's `prototype` skill
  (`.claude/skills/prototype/SKILL.md`, not `mattpocock-skills:prototype`) used to build and pick
  variants, in this change and in later design choices. Constraints the plan must handle:
  - The skill sets `disable-model-invocation: true`, so only the author can start it (`/prototype …`).
  - It narrows a brief to one piece per run; here one run must cover a whole page's look (type,
    color, motif, structure), e.g. the article page, then home with the list.
  - Its default in-project surface (`/prototypes/<slug>`) would sit in `src/pages/` and deploy on
    push to `master`, publishing the borrowed stand-in articles; the surface must stay out of the
    build and out of git.
  - Its "promote on selection" step integrates the winner immediately; F-01 records the chosen
    direction before shipping it as the base design.

## Cross-System Convention

Common design practice (prior knowledge, not project evidence): explore direction on
representative content (style tiles, side-by-side comps) before codifying tokens, and design with
real or realistic content, not lorem or empty pages. The reframe follows that convention.
Constraint to carry forward: shadcn/ui is a planned hard requirement (`tech-stack.md`, not
installed per `AGENTS.md`), and its default look is close to the "generic template" the PRD rules
out. The direction, especially the typography and motif, has to survive it being added later.

## Reframed (or Confirmed) Problem Statement

> **The actual problem to plan around is**: the author can only make the direction concrete by
> seeing whole-site variants (typography, colors, signature motif and page structure together)
> side by side on realistic home-with-list and article pages, and F-01 currently asks for a
> decision in words, checked on placeholder pages that can't show the vibe.

The initial framing's *why* holds: deciding the base design before S-03–S-07 avoids restyling.
What breaks is the *how*: a text discussion followed by applying tokens to placeholder + 404
would lock choices the author expects to revise once seen, and its done criterion can't confirm
the look is distinctive. F-01 really has two jobs: (a) narrow the direction through visual
comparison on stand-in content for the pages that matter, then (b) write down the chosen
direction and ship it as the base design.

## Confidence

**HIGH** — repo evidence (nothing recorded, placeholder canvas is two lines) plus three decisive
author signals (converges by seeing variants; elements are visual; judged on home + article)
matching common design practice.

## What Changes for /10x-plan

The plan should start with visual exploration: side-by-side whole-site variants (type, colors,
motif, structure) on representative home-with-list and article content, chosen by the author. Writing the
direction down and shipping tokens comes after that, and "done" should be judged on those
representative pages, not only placeholder + 404. Keep the roadmap's scope cap: no real content
pipeline (S-01) or real home list (S-05) gets built inside F-01.

## References

- Source files: `src/layouts/Layout.astro`, `src/pages/index.astro`, `src/pages/404.astro`
- Foundation: `context/foundation/prd.md` §Vision, §Success Criteria (line 62), NFR contrast;
  `context/foundation/roadmap.md` F-01, S-05, S-06, S-07; `context/foundation/shape-notes.md`:49,59;
  `context/foundation/tech-stack.md` (shadcn/ui requirement)
- Related research: none (`research.md` absent)
- Investigation tasks: none spawned; inline reads

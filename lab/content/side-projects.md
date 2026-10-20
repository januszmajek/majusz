---
title: "How I run my side projects"
source: "https://majusz.com/side-projects"
author:
  - "[[Majusz]]"
published:
created: 2026-10-20
description: "My setup for side projects outside the day job. One repo per idea, a short plan before any code, and a log that keeps me honest about what actually shipped."
tags:
  - "notes"
---
I build things after work: small tools, a game I keep restarting, and this site. This is how I keep those projects moving without turning them into a second job. It favors small steps and written plans over motivation.

A side project is mostly a folder of plans and a git history. That matters because it means the project survives my attention span. If I drop something for three months, the [plan and the log](https://majusz.com/project-log) tell me exactly where I stopped and why.

None of this is a rule for anyone else. It is one way to keep side projects alive. Borrow what fits.

## Project template

1. [Copy my starter repo](https://github.com/januszmajek) or start from an empty folder.
2. Add a `context/` folder with a one-page idea note.
3. Write the first plan before writing any code.

## Tools I use

- [Astro](https://astro.build/) for anything that is mostly pages and text.
- [Obsidian](https://obsidian.md/) for notes, plans and drafts, synced to my phone.
- [Tailscale](https://tailscale.com/) to open the dev server on my phone from the couch.
- [Cloudflare Workers](https://workers.cloudflare.com/) to host static sites for free.
- [GitHub Actions](https://github.com/features/actions) so a push to `master` is the only deploy step.

## Personal rules

Rules I try to keep for every project:

- One repo per idea.
- No code before a written plan.
- Ship something visible in the first week.
- Keep the commit history readable.
- Write down why, not only what.
- Use `YYYY-MM-DD` dates everywhere.
- Rate finished projects on a 1–5 scale.
- Keep [one list of next steps](https://majusz.com/weekly-review) per week.

Having the same routine for every project removes the "how do I start" question, and the energy goes into the idea instead. For example, every plan has the same headings, so I never stare at an empty page. Make your own routine, write it down, and change it when it stops helping.

## Folders and structure

I keep very little structure. Most of my projects are small and short-lived, and a deep folder tree costs more than it saves. I want to start typing, not decide where a file belongs.

I avoid nested folders. I rarely browse the file tree. I mostly jump with search, or follow links between notes.

Most of the organizing happens in the `status` property of each plan. A single overview note lists every project by status, so I can see what is active at a glance.

**Most project notes live in the repo itself**, next to the code. Ideas, plans, decisions and logs go there. If a note sits in the repo, I know it belongs to that project and nowhere else.

Two shared folders I keep outside any repo:

- **Ideas** for things I might build one day. One note per idea, named after the idea, e.g. `Plant watering bot.md`.
- **Reading** for articles and docs I saved while researching.

Three folders exist only to keep clutter out of sight:

- **Assets** for screenshots, sketches and exported images.
- **Logs** for the weekly logs, all named `YYYY-MM-DD.md`. Each one links to the projects it mentions.
- **Templates** for plan and log templates.

Two folders appear in my starter repo for clarity. In a real project their contents would sit at the top level.

- **Examples** contains a sample plan and log.
- **Docs** contains notes on how the starter works.

## Links

I link a lot. Every plan links to the idea it came from, and every log links to the plans it touched. Many links point to notes that don't exist yet. Those *empty links* are useful because they show what I meant to write down and never did.

A log entry for a week might look like this:

```
Finished the deploy pipeline for [[majusz.com]] and tried [[Tailscale]] for phone testing. Paused [[Game prototype 3]] because the art took over. Next: write the plan for [[Design lab]] ...
```

The site, the tool and the prototype each link to notes in their own repos or in **Ideas**. In those notes I keep the status, the decisions and what is left. The design lab link is still empty, so it reminds me there is a plan to write. Saved articles I mention go in **Reading**, because I didn't write them.

Over time the links show how one project led to the next, and which ideas kept coming back.

## Weekly logs and random restarts

Weekly logs and the occasional random restart are how I stop projects from quietly dying.

During the week I write short notes whenever I finish or block on something. A hotkey creates a note named `YYYY-MM-DD HHmm`, and I add a few words about what happened.

On Sunday I fold those notes into the weekly log. Once a month I read the four weekly logs and write a short summary, and once a year I read the summaries (using [this checklist](https://majusz.com/yearly-review)). The result is a timeline I can read at any level of detail, from one evening to a whole year.

Every few months I pick a paused project at random and spend one evening on it. I open its plan, read the last log, and decide: restart, shrink, or archive. Sometimes the old idea turns out better than whatever I was doing instead. It is also a good moment to clean up notes that no longer match my rules.

People ask if I let an AI agent do these reviews for me. I don't. The review is where I learn what I actually care about. [Thinking it through is the point](https://majusz.com/why-write).

## Plans and templates

Every project starts from a [plan template](https://github.com/januszmajek). Templates let me skip the blank page and make sure I write down the things future me will search for. Each plan has [properties](https://help.obsidian.md/properties) at the top for things like:

- **Dates** — started, paused, shipped
- **Scope** — goal, non-goals, first visible milestone
- **Stack** — language, framework, hosting
- **Links** — repo, live URL, related ideas
- **Rating** — more on this below

A few rules for properties:

- Use the same property names across projects, so I can compare them, e.g. `stack` is the same field everywhere, which lets me list every project that used Astro.
- Keep templates small enough to combine, e.g. *Plan* and *Release* are separate templates that can live in one note.
- Prefer short names, e.g. `start` instead of `start‑date`.
- Use a `list` property whenever a field might ever hold more than one value.

The [template folder](https://github.com/januszmajek) lists every property and its type (`date`, `number`, `text`, and so on).

## Rating system

Every finished or archived project gets a `rating` from 1 to 5:

- 5 — **Proud**, still use it, would show it to anyone
- 4 — **Solid**, does the job, a few rough edges
- 3 — **Fine**, worked once, not worth maintaining
- 2 — **Weak**, shipped but shouldn't have
- 1 — **Abandoned**, learned something, nothing to show

Why five? I don't need fine detail for side projects. I mostly need to know which ones were worth the evenings.

## Publishing to the web

This site is built from the same kind of repo. Articles start as Obsidian notes, and publishing one means adding a markdown file to the repo. A [static site generator](https://astro.build/) turns the notes into pages, and a push to `master` puts them online.

The setup took a few evenings, mostly because I wanted full control over how the pages look. If you don't need that, [Obsidian Publish](https://obsidian.md/publish) gets you most of the way with no code at all.

For this site, a GitHub Action builds the pages and deploys them to [Cloudflare Workers](https://workers.cloudflare.com/). I check every change on my phone over Tailscale before I push, so I see the page the way most readers will.

The design is my own, built in a small design lab inside the repo. You can read [the source](https://github.com/januszmajek/majusz) to see how it fits together. Other good options for a site like this are [Hugo](https://gohugo.io/), [Eleventy](https://www.11ty.dev/), [Quartz](https://quartz.jzhao.xyz/) and [Jekyll](https://jekyllrb.com/).

## Related writing

- [Why I write in public](https://majusz.com/why-write)
- [Small plans beat big motivation](https://majusz.com/small-plans)
- [What a project log is for](https://majusz.com/project-log)
- [Questions for the end of a year](https://majusz.com/yearly-review)
- [How I review my week](https://majusz.com/weekly-review)

---
project: "majusz"
version: 3
status: draft
created: 2026-10-15
context_type: greenfield
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: false
---

# majusz — Product Requirements

## Vision & Problem Statement

- **Core purpose / insight:** The site's purpose is to make me start writing, because writing makes you truly think about something. The portfolio angle (job applications, X) and the game are nice additions that add motivation and benefits; they are not the main purpose.
- **Pain:** No place of my own to publish articles about things I like or find interesting, and nothing public that shows I build things beyond my 8–16 job.
- **Person:** Me, as the author (primary). Readers who find the site through social media (X), who are the same audience as hiring managers/recruiters (secondary).
- **Moment:** (a) When I want to write about something beyond private journaling. (b) When I share a post on X, or attach a link to a job application form.
- **Cost today:** For job hunting I only have a CV. For writing I only have a private Obsidian journal. I don't write articles yet, I don't publish my journal, and the Obsidian content will not be shared.
- **Game:** A fun surprise on the site that shows skill. It's inspired by the "destroy the website" idea for mikr.us (https://destroy.spritefusion.com/?url=mikr.us).
- **Visual reference:** Minimal personal sites/blogs: https://www.zthreee.com/ and https://stephango.com/ (home page is the article list). Simple and clean, but with a distinctive look that stands out from most blogs rather than reading as a generic template. The author has a direction in mind; it is discussed and pinned down before the rest of the UI is built.
- **Timing:** Target v1 by 2026-11-08 (about 3 weeks). This is a soft target, not a hard deadline. Work happens partly during work hours, not only after hours.
- **Scale:** Dozens to a hundred visitors expected. At 100× (a post going viral on X, ~10k visitors in a day) the rule doesn't change. The risk is that the "readable in under 2 seconds" promise breaks exactly when the most people are watching.
- **Socrates (empty blog at launch):** Counter-argument considered: "a site with an impressive game and zero posts reads as started-and-abandoned to a recruiter." Resolution: it's fine to launch with the introduction + an About page and no posts (the game follows as the first post-launch milestone). Writing and publishing posts must work from day one, and an empty blog shows a proper empty state. An empty blog at launch does not bother the author.

## User & Persona

### Primary persona
Me, the author. I want a public outlet for writing that goes beyond private journaling.

### Secondary persona
Readers arriving from social media (X), including hiring managers/recruiters arriving from a job application link.

## Success Criteria

**MVP flow (locked, scoped down).**

Visitor's first visit:
1. Clicks a link from X or a job application and lands on majusz.com.
2. Sees a short introduction and the list of articles, newest first (or a teaser empty state when there are none).
3. Navigation: About · Game (post-launch) · Socials. The home page is the blog; there is no separate Blog page.
4. Opens an article and reads it, displayed the way Obsidian would show it.

Author's first publish:
1. Has a finished `.md` file.
2. Adds it, and the site turns it into an article page.
3. Shares it on X manually. The site does not notify anyone or post anywhere.

Scope decision: v1 = introduction, article list on the home page, article pages from markdown, About, socials, empty state. **The game** is in the PRD and tasks as the first milestone right after launch. **Newsletter** and **blog search** are deferred until after launch.

### Primary
- majusz.com is live with introduction, article list, About and socials. Adding one `.md` file (plus its images) results in a correctly displayed article page with no other manual steps.
- Publishing is fast: from a finished `.md` file to a live article takes a few minutes of author effort at most.
- The link is used for real: majusz.com has been attached to at least one job application or shared on X.
- The site looks simple, clean and distinctive: every page shares one consistent visual design in both themes, and it doesn't read as a generic blog template.

### Secondary
- The first real article is published within a few weeks of launch.
- The game goes live soon after launch.
- Someone (a recruiter or reader) mentions the site, a post, or the game.

### Guardrails
- Articles display correctly: a published article never shows broken or raw Obsidian syntax to readers.
- Fast and readable on phones (most visitors come from X).
- No visitor data collected in v1: no accounts, no emails, no stats.
- Publishing stays effortless: never more than adding a file, and it's as easy from a phone as from a PC.
- (Game milestone) The game works well and behaves like the referenced example (https://destroy.spritefusion.com/?url=mikr.us), including on mobile.
- (Newsletter, once added post-launch) The email newsletter works without accidents. Note: this supersedes "no visitor data collected" only when the newsletter ships.

## User Stories

### US-01: Visitor from X lands on the site and reads an article

- **Given** a visitor who clicked a majusz.com link on X or in a job application
- **When** they land on the home page
- **Then** they see a short, catchy introduction, the list of articles newest first (or a teaser empty state when there are none), and navigation to About, the GitHub repo and socials

#### Acceptance Criteria
- Opening an article shows it displayed the way Obsidian would show it (the listed features), with its publish date and reading time
- Wikilinks to unpublished notes show as plain text, never as broken links
- The site appears in the visitor's device theme (dark/light)
- Works and reads well on a phone

### US-02: Author publishes a finished article

- **Given** the author has a finished note written in Obsidian, with title, date and summary in its properties, plus any images it uses
- **When** they add the `.md` file and its images (from a PC or a phone)
- **Then** the article appears on the site as its own page and at the top of the home page's article list, with no other manual steps

#### Acceptance Criteria
- Takes a few minutes of author effort at most
- Adding images is as easy as adding the `.md` file
- No raw or broken Obsidian syntax is visible to readers

### US-03: Visitor plays the game on the page they're reading (post-launch milestone)

- **Given** a visitor on any page of majusz.com (home, an article…), on desktop or on a phone
- **When** they deliberately start the game from the navigation
- **Then** they can destroy the page in front of them, like the reference game (https://destroy.spritefusion.com/?url=mikr.us)

#### Acceptance Criteria
- The game never starts without a deliberate visitor action
- On a phone it's playable with touch controls
- Reloading the page restores it

## Functional Requirements

### Home & navigation
- FR-001: Visitor can see a short, catchy introduction on the home page. Priority: must-have
  > Socrates: Counter-argument considered: "the home bio becomes the About page, just shorter."
  > Resolution: kept, but reshaped as a short introduction, not a bio. Maybe a photo and/or my
  > name, plus one or two catchy sentences about me, this site, or the writing that encourage the
  > visitor to stay.
- FR-002: Visitor can see the list of all articles on the home page, newest first. The home page is the blog; there is no separate archive page. Priority: must-have
  > Socrates: Counter-argument considered: "at launch the list is empty, so the home page's main
  > block starts empty." Resolution: kept. Home must look good without articles. The short
  > introduction (FR-001) plus a "content soon" style message carries it at launch.
- FR-003: Visitor sees a teaser empty state when no articles exist yet (e.g. "first post coming soon"). Priority: must-have
  > Socrates: Counter-argument considered: "a plain 'no posts yet' draws attention to the
  > emptiness." Resolution: the empty state becomes a teaser rather than a bare notice.
- FR-004: Visitor can open the About page. Priority: must-have
  > Socrates: Counter-argument considered: "About should be a CV-style page for recruiters."
  > Resolution: kept as an About page with more text than the home introduction, but still not
  > much. A link to a CV may be added later; not in v1.
- FR-005: Visitor can reach the author's actively used social profiles from the navigation. Priority: must-have
  > Socrates: Counter-argument considered: "a link to an inactive profile looks abandoned."
  > Resolution: only profiles the author actually uses are linked.
- FR-006: Visitor can open the site's public GitHub repository from a visible link. Priority: must-have
  > Socrates: Counter-argument considered: "recruiters may open the repo, and unfinished or messy
  > code and history are public." Resolution: kept. The repo must be presentable (README, clean
  > history) as a condition of linking it.
- FR-007: Visitor sees the site in their device's dark or light theme by default and can switch it manually. Priority: must-have
  > Socrates: Counter-argument considered: "a bare toggle ignores what the visitor already set on
  > their device." Resolution: follow the device setting by default, with a toggle to override it.

### Articles
- FR-008: (Removed in v3, merged into FR-002.) There is no separate Blog or archive page; the home page is where the article list lives.
  > Socrates (v1): Counter-argument considered: "once posts pile up, a flat list is hard to browse."
  > Resolution (v1): a Blog page with grouping. Superseded in v3: the home page holds the full
  > list, like https://stephango.com/. Whether that list is grouped was Open Question 1 (resolved: grouped by year, see `design.md`).
- FR-009: Visitor can read an article displayed as Obsidian (latest version at implementation time) displays these features: images, code blocks with syntax highlighting, tables, callouts, [[wikilinks]] between posts, diagrams, math, tags. Obsidian features released after implementation are not added. Priority: must-have
  > Socrates: Counter-arguments considered: (1) "full Obsidian parity (note embeds, block
  > references, footnotes, canvas…) is too big for 3 weeks"; (2) "the vault is private, so a
  > [[wikilink]] to an unpublished note has nowhere to go"; (3) "community plugin output isn't part
  > of Obsidian itself." Resolution: v1 is limited to the listed features, not full parity. A
  > wikilink to an unpublished note shows as plain text, never as a broken link. No Obsidian plugin
  > functionality on the site.
- FR-010: Visitor can see each article's publish date and estimated reading time. Priority: must-have
  > Socrates: Counter-argument considered: "visible dates expose long gaps between posts."
  > Resolution: kept. Dates help readers judge whether a post is still relevant, and gaps are
  > accepted as normal for a personal blog.
- FR-011: Author can publish an article by adding its markdown file together with any images it uses, from a PC or a phone. Title, date and summary come from the note's Obsidian properties. Priority: must-have
  > Socrates: Counter-arguments considered: (1) "an article with images isn't one file";
  > (2) "publishing from a phone only works if the finished file is on the phone"; (3) "title and
  > date have to come from somewhere." Resolution: adding images must be as easy as adding the
  > `.md`. Phone publishing assumes the finished note is available on the phone. Title, date and
  > summary come from the note's Obsidian properties.

### After launch
- FR-012: Visitor can deliberately start the game from the navigation and play it, on desktop and on a phone with touch controls. Priority: nice-to-have (first post-launch milestone; in PRD and tasks)
  > Socrates: Counter-arguments considered: (1) "the reference game is a desktop experience;
  > phones have no keyboard"; (2) "accidentally 'destroying' the page costs a reader their
  > article"; (3) "which page gets destroyed?" Resolution: touch controls are designed from the
  > start. The game only starts on a deliberate visitor action. The game destroys the page the
  > visitor is currently on (home, an article…), like the reference game; reloading restores it.
- FR-013: Visitor can search articles. Priority: nice-to-have (deferred)
  > Socrates: Counter-argument considered: "with a few posts, the home page list plus browser search
  > is enough." Resolution: deferred until there are many posts (roughly 15+).
- FR-014: Visitor can subscribe to an email newsletter and receive an email when a new article is published. Priority: nice-to-have (deferred)
  > Socrates: Counter-arguments considered: (1) "nobody subscribes to an empty blog"; (2) "an RSS
  > feed is free and collects no data"; (3) "storing emails brings back personal data and GDPR
  > obligations." Resolution: stays deferred until there are a few articles. When added, it uses a
  > free hosted newsletter service, so majusz.com itself stores no emails, plus a short privacy note.
  > RSS was considered and skipped entirely (not in v1, not later).

## Non-Functional Requirements

- A visitor on a phone with an average mobile connection sees readable article content in under 2 seconds.
- A published article is visible on majusz.com within 5 minutes of the author adding the file.
- The site is usable on the latest two major versions of the mainstream browsers, on desktop and mobile, at both phone and desktop widths.
- Text is readable with sufficient contrast in both dark and light themes, and every page can be used with a keyboard only.
- No personal data about visitors is collected in v1: no accounts, no emails, no visitor statistics, and so no cookie banner.
- A published article never shows raw or broken Obsidian syntax to readers.

## Business Logic

The site turns a note the author deliberately added into a clean public article, showing anything it points to that isn't published (other notes) as plain text, so nothing private leaks and nothing looks broken.

Inputs: a finished Obsidian note (with title, date and summary in its properties) and the images it uses, added by the author. Only notes the author deliberately adds become public; the rest of the Obsidian vault stays private.

Output: an article page where the supported Obsidian features (images, code blocks with syntax highlighting, tables, callouts, wikilinks, diagrams, math, tags) appear as Obsidian shows them, and no raw or broken syntax is visible. A `[[wikilink]]` to another published article becomes a link to it; a wikilink to an unpublished note shows as plain text.

How readers encounter it: articles are presented newest first, all of them in the list on the home page (there is no separate Blog page). Each article's date comes from its properties and its reading time is worked out from the note's text.

> Note: the author's own framing. The value of the site is the writing itself; this rule is what keeps publishing safe and effortless, which serves the core purpose (start writing).

## Access Control

- **Visitors:** Fully public. No accounts, no sign-up. Anyone can read posts and play the game.
- **Author:** Only me. I publish by adding a markdown file. Nothing else creates or changes content.
- **No author interface on the site:** no editor, no login page, no admin area. There is nothing on majusz.com that lets anyone write to it.
- **Socrates (in-site editor):** Counter-argument considered: "an editor on a public site with public code needs protecting, and any login page is a surface strangers can find." Resolution: the in-site editor was dropped entirely. Publishing happens outside the site, which also removes the login problem.

## Non-Goals

### Functional
- **No in-site editor, admin area, or login.** Publishing happens by adding files outside the site, so there is no write surface on majusz.com.
- **No visitor accounts.** The site is fully public and read-only.
- **No full Obsidian parity and no Obsidian plugin functionality.** Only the listed features are supported. Obsidian features released after implementation are not added.
- **No RSS feed.** Considered and skipped entirely.
- **No comments or reactions.** These would bring accounts, moderation and spam. Discussion happens on X.
- **No multiple languages.** There is no language switch, and each post is in whatever language it was written in.
- **No other authors.** No guest posts or co-authors; it's a single-author site.
- **Deferred past v1:** newsletter (FR-014, hosted service, once there are a few posts), search (FR-013, at roughly 15+ posts), CV link on About, and the game (FR-012, first post-launch milestone).

### Non-functional
- **No visitor data in v1:** no statistics/analytics, no emails, no cookie banner.

## Open Questions

1. ~~**Home article list: flat (like stephango.com) or grouped by year or tag?** (FR-002)~~ — Resolved 2026-10-27: flat, newest first, grouped by year (`context/foundation/design.md`, Layouts).
2. **Game: does it keep any score or leaderboard?** It wasn't ruled out. Storing scores or player names would conflict with "no visitor data". — Owner: author. Resolve when the game milestone is planned.

<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Publish First Article

- **Plan**: context/changes/publish-first-article/plan.md
- **Scope**: Phases 1–4 of 4 (full plan)
- **Date**: 2026-10-30
- **Verdict**: NEEDS ATTENTION (all findings fixed in triage)
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Evidence

- `npm run build` with zero articles: exit 0, 2 pages built.
- `git check-ignore`: `workspace.json`, `appearance.json` and `obsidian-git/main.js` are ignored; `app.json` and `obsidian-git/data.json` are not.
- `.obsidian/app.json`: `useMarkdownLinks` and `strictLineBreaks` are both `true`.
- `gh run list --workflow deploy.yml`: the last 3 runs succeeded, including the phone-side `docs(articles): publish photo changes`.
- `curl https://majusz.com/test-from-phone`: 404. The test post was removed by the force-push, and `content/articles/` is empty.
- Phases 1–2 deliberate-break checks were not re-run here. They rely on the recorded SHAs 48cf4b2 and 9d0422f, and the code they check is unchanged since.

## Findings

### F1 — Lenient date coercion misreads Polish DD.MM.YYYY dates

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/content.config.ts:25
- **Detail**: `z.coerce.date()` passes strings to `new Date()`, which is lenient. `27.10.2026` fails as the plan tested, because 27 is not a valid month. But `01.02.2026` (1 February in Polish order) parses as 2 January in local time, which shows as `2026-01-01` in UTC on a CET machine. `10/27/2026` is also accepted. So a Polish-style date with a day ≤ 12 builds green with the wrong date. content/README.md tells the author that "a date like 27.10.2026" fails, which suggests every dotted date fails.
- **Fix**: Accept only a YAML date or a strict `YYYY-MM-DD` string, e.g. `z.union([z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).pipe(z.coerce.date())`.
  - Strength: Makes the README's promise true. Obsidian's date property writes unquoted `YYYY-MM-DD`, which YAML already parses to a Date, so the normal path is unchanged.
  - Tradeoff: Rejects full timestamps (`2026-10-27T10:00`) unless they are allowed explicitly.
  - Confidence: MED — the Date branch depends on Astro's frontmatter YAML parsing timestamps, which `z.coerce.date()` hides today; verify with a quoted and an unquoted date.
  - Blind spot: Haven't checked how Astro's zod version handles `.pipe` with `coerce`.
- **Decision**: FIXED — `date` accepts a YAML date or a `YYYY-MM-DD` string; verified: unquoted and quoted ISO build, `01.02.2026`, `10/27/2026`, `27.10.2026` exit 1, zero-article build passes

### F2 — Hello post not published; Phase 4 evidence no longer exists

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: context/changes/publish-first-article/plan.md (Phase 4, Desired End State)
- **Detail**: The plan's live result is "the author's hello post, published from the iPhone, is live at `https://majusz.com/<slug>`". Instead, the flow was verified with a test post, which was then force-pushed away. `/test-from-phone` now returns 404, and `content/articles/` is empty. Progress rows 4.1–4.7 are `[x]` with no SHA. change.md records this honestly, but the plan still describes the hello post as delivered.
- **Fix A ⭐ Recommended**: Add a plan addendum: Phase 4 was verified with `/test-from-phone` (results from change.md), and the hello post moves to an ordinary publish outside this change.
  - Strength: Matches the author's recorded decision, and the flow itself was proven (deploy in 34 s, GPS-free photo).
  - Tradeoff: The north-star slice closes with no article live on the site.
  - Confidence: HIGH — change.md already states the decision.
  - Blind spot: S-05 (home list) assumes at least one real article exists to test against.
- **Fix B**: Keep the change at `implementing` until the hello post is live, then re-run 4.1/4.2 and add its SHA.
  - Strength: The plan's end state becomes literally true, with evidence that still exists.
  - Tradeoff: Archiving waits on writing.
  - Confidence: HIGH — mechanical once the post exists.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A — plan.md `## Addenda` records the test-post verification; hello post moved to an ordinary publish

### F3 — Unplanned additions recorded only in change.md

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/lib/markdown/image-width.ts, astro.config.mjs:46, src/styles/prose.css:49, .obsidian/app.json:17-19
- **Detail**: Not in the plan: the `|300` image-width hast plugin (0b375ca), the `CLAUDE.md.scaffold` symlink removal (c7831c6), `.prose img + img` spacing, and `AGENTS.md`/`CLAUDE.md`/`README.md` in `userIgnoreFilters`. All are benign and well commented, and AGENTS.md, design.md and content/README.md were updated for them. But the plan, the review ground truth, does not mention them.
- **Fix**: Add a short "Addenda" section to plan.md listing them.
- **Decision**: FIXED — listed under plan.md `## Addenda` (Out of plan, kept)

### F4 — Obsidian Git commit message differs from plan contract

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: .obsidian/plugins/obsidian-git/data.json:2-3
- **Detail**: The plan says `docs(articles): sync from {{hostname}}`. The implementation uses `docs(articles): publish`. Both are conventional and the actual one arguably reads better, but the plan was not updated.
- **Fix**: Update the Phase 3 §3 contract line in plan.md to `docs(articles): publish`.
- **Decision**: FIXED — plan.md Phase 3 §3 contract now says `docs(articles): publish`

### F5 — Personal email in force-pushed phone commits

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: N/A (GitHub remote, iPhone Obsidian Git settings)
- **Detail**: change.md notes that the phone commits used the author's personal email. The force-push removed them from `master`, but GitHub keeps force-pushed commits reachable by SHA, and the push event in the events API references them. The note says the phone "must use" the noreply address, but it doesn't confirm the setting was changed.
- **Fix**: Confirm the iPhone Obsidian Git author email is the `@users.noreply.github.com` address. If the exposure matters, ask GitHub Support to purge the dangling commits.
- **Decision**: FIXED — author confirmed the iPhone commits as the noreply address; noted in change.md

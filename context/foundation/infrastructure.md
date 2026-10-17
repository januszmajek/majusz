---
project: majusz
researched_at: 2026-10-17
recommended_platform: Cloudflare Workers (static assets)
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript / JavaScript
  framework: Astro 7.3.8 (static output, no adapter)
  runtime: Node >= 22.12 at build time; static files served from Cloudflare's edge
---

## Recommendation

**Deploy on Cloudflare Workers with static assets.**

It is the only candidate that passes all five agent-friendly criteria and stays at $0 under any traffic: static asset requests are free and unlimited, so a viral post on X costs nothing and cannot pause the site. The author asked for a free option, already knows Cloudflare, and already has majusz.com hosted there, so the custom domain needs no DNS records pointing elsewhere. Use **Workers with static assets, not Cloudflare Pages**: since 2025-04-08 Cloudflare directs new projects to Workers and puts all new feature work there, and the Astro Cloudflare adapter (v13 and later) no longer deploys to Pages. This supersedes the `deployment_target: cloudflare-pages` hint in `tech-stack.md`.

Interview answers that shaped the scoring:
- **Persistent connections:** don't know yet. The site is static today, so no platform was filtered out.
- **Cost:** must be free. Platforms with no free custom-domain tier, or with hard caps a spike would hit, were penalized.
- **Familiarity:** Cloudflare.
- **Reach:** a single region is fine.
- **Managed services:** external providers are fine.

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Free for majusz.com |
|---|---|---|---|---|---|---|
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | Yes. Unlimited static traffic, $0 |
| Vercel | Pass | Pass | Pass | Pass | Partial | Yes. 100 GB/month; going over pauses the site |
| Render | Pass | Partial | Pass | Pass | Pass | Mostly. 5 GB/month bandwidth |
| Netlify | Pass | Pass | Pass | Pass | Pass | Shaky. 300 credits/month, 15 per deploy |
| Fly.io | Pass | Partial | Pass | Pass | Partial | No. No free tier |
| Railway | Pass | Partial | Pass | Partial | Partial | No. Free plan allows no custom domain |

**Cloudflare Workers (static assets).**
- **Runtime:** a static Astro build needs no adapter. A `wrangler.jsonc` with an `assets` block pointing at `./dist` is enough.
- **CLI:** wrangler 4.151.1 covers deploy (`wrangler deploy`), rollback (`wrangler rollback`, last 100 versions), history (`wrangler versions list`) and logs (`wrangler tail`).
- **Free tier:**
  - Static asset requests are free and unlimited.
  - 20,000 files per version, 25 MiB per file.
  - 3,000 Workers Builds minutes/month.
- **Agent docs:** `llms.txt`, `llms-full.txt` and a markdown version of every page.
- **MCP:** remote servers at `mcp.cloudflare.com/mcp` and `docs.mcp.cloudflare.com/mcp`, with no beta label.
- **Score:** all five criteria pass.

**Vercel.**
- **Strengths:** a static Astro build deploys with no setup on Hobby (100 GB transfer, 1M CDN requests per month), and every PR gets a preview.
- **Gaps:**
  - Hobby has no overage billing; going over can pause the project for up to 30 days.
  - The plan is for non-commercial use only. A personal blog qualifies, but advertising paid services would not.
  - Rollback on Hobby only reaches the previous deployment.
  - Vercel MCP has been in public beta since 2025-08-04, so MCP scores Partial.
  - The custom domain needs DNS-only (grey cloud) records at Cloudflare.

**Render.**
- **Strengths:** static sites are free on a global CDN. It has `llms.txt`, an MCP server that has been GA since 2025-08-21, deploy hooks, and a rollback API.
- **Gaps:**
  - The plan change of 2026-04-23 cut free bandwidth to 5 GB/month. Going over with no card on file spins the site down until next month.
  - The CLI has no rollback command.
  - Managed scores Partial because free services spin down and free Postgres expires after 30 days.

**Netlify.**
- **Strengths:** passes all five criteria. Astro 7 has had day-one support since 2026-06-22, and it has `llms.txt` and an official MCP server.
- **Cost model is the problem:**
  - The Free plan has 300 credits/month, and each production deploy costs 15. About 20 article publishes a month use up the credits on deploys alone.
  - Bandwidth costs 20 credits/GB, so one viral day could pause every site on the account.
  - Free plans cannot buy more credits.
- **Ranking:** placed below Render because publishing articles, the site's main action, directly uses up the free allowance.

**Fly.io.**
- **Model:** runs a container (nginx or Caddy serving `dist/`), with no edge CDN.
- **Cost:** new organizations get no free tier, only a trial of 2 hours or 7 days, then a card. About $0.10–2.50/month.
- **Gaps:**
  - Rollback is manual (`fly deploy --image <old>`).
  - The MCP commands are marked experimental.
  - Auto-stop adds cold starts.

**Railway.**
- **Model:** a container host.
- **Cost:** the Free plan ($1 credit/month) allows no custom domain, so the real minimum is Hobby at $5/month.
- **Gaps:**
  - Rollback is dashboard-only.
  - Its config-as-code files (`railway.json` and `railway.toml`) stop being read on 2026-12-01.
  - The remote MCP is in "public testing".

### Shortlisted Platforms

#### 1. Cloudflare Workers with static assets (Recommended)

- **Criteria:** passes all five.
- **Cost:** stays free whatever the traffic, which protects the PRD's "readable in under 2 s" promise exactly when a post goes viral.
- **Fit:** the domain is already there, the author knows the platform, and server-side code (a newsletter endpoint, game scores, Durable Objects) can be added later on the same platform without moving.

#### 2. Vercel

- **Strengths:** equally easy for a static Astro site, and free at expected traffic.
- **Why it ranked second:**
  - Hobby pauses the project instead of billing when limits are exceeded.
  - Hobby rollback is limited to the previous deployment.
  - The MCP integration is still beta.
  - The domain would need records pointing away from Cloudflare.

#### 3. Render

- **Strengths:** free static hosting with good agent tooling (llms.txt, GA MCP).
- **Why it ranked third:** the 5 GB/month bandwidth cap is the first thing a viral post would exhaust, and without a card on file that takes the site offline until next month.

## Anti-Bias Cross-Check: Cloudflare Workers (static assets)

### Devil's Advocate — Weaknesses

1. **The plan names the wrong product.** `tech-stack.md` and the bootstrap notes say *Cloudflare Pages*. Pages gets no new features, and the Astro Cloudflare adapter (v13 and later) no longer deploys to it. As soon as the site needs server code (newsletter FR-014, a game score), a Pages setup is a dead end.
2. **The adapter version conflicts with the installed Astro.** The latest `@astrojs/cloudflare` (14.4.0) requires `astro ^7.4.0`, and the project is on 7.3.8, so `astro add cloudflare` fails or forces an unplanned upgrade. A static site does not need the adapter, so the trap only matters once server code is added.
3. **A failed build silently blocks publishing.** The author publishes by pushing a `.md` file, even from a phone. If an Obsidian note breaks a markdown plugin, the build fails and the article never goes live. Cloudflare does not notify anyone about a build that never reached it.
4. **Preview URLs are public.** Worker Previews launched on 2026-09-22 with no GA or beta label. A draft pushed to a PR branch gets a public `workers.dev` URL, which breaks the PRD rule that nothing private leaks.
5. **There is almost nothing to observe.** Static asset requests never invoke Worker code, so `wrangler tail` stays silent. Diagnosing a 404 or header problem means inspecting the build output, not logs.

### Pre-Mortem — How This Could Fail

Following `tech-stack.md`, the site goes up on Cloudflare Pages through the dashboard's git integration, and launch is smooth. In month two the newsletter is added and needs a small server endpoint. The current adapter cannot deploy to Pages, and an older adapter would mean downgrading Astro. A weekend goes into migrating to Workers. During the migration a GitHub Actions workflow with `wrangler deploy` is added, but the Workers Builds git integration is never disconnected. Every merge now deploys twice, and sometimes an older build finishes last and overwrites the newer one.

Then the author adds a 30 MB phone photo to an article. It exceeds the 25 MiB per-file limit, the deploy fails, and nobody notices because the failure email goes to an unread inbox. The article already shared on X returns a 404 for two days. Meanwhile a draft pushed to a branch for a preview turns up in search results through its public preview URL.

None of these failures are Cloudflare outages. They come from an outdated product choice, two competing deploy paths, unchecked image sizes and no alert on a failed build.

### Unknown Unknowns

- **Workers, not Pages, for new projects.** Pages is not deprecated, but all new investment goes to Workers. The guidance dates from Cloudflare's 2025-04-08 post, and the Pages docs (updated 2026-08-25) say "Start new projects with Workers."
- **File limits per deploy:** 20,000 files and 25 MiB per file. Full-resolution phone photos and videos can exceed the per-file limit and fail the whole deploy.
- **The 404 page needs configuring.** Without `not_found_handling: "404-page"` in the assets config, missing URLs return Cloudflare's default response instead of the site's own 404 page.
- **Attaching the custom domain creates DNS records.** Existing apex or `www` records for majusz.com (parking or redirects) conflict and must be removed first.
- **The free profile changes once Worker code runs.** A pure-asset site is unlimited. As soon as Worker code runs on requests (middleware, an endpoint), the free plan's 100k requests/day and 10 ms CPU limits apply. Workers Logs moves to new Observability pricing on 2026-12-01.

## Operational Story

- **Preview deploys:** off for the MVP. Worker Previews (`wrangler preview`, launched 2026-09-22, stability unlabeled) creates public `workers.dev` URLs. Enable it only for branches that never contain unpublished notes, or put Cloudflare Access in front of preview hostnames.
- **Secrets:**
  - Two GitHub Actions repository secrets: `CLOUDFLARE_API_TOKEN` (created from the "Edit Cloudflare Workers" token template, scoped to the one account) and `CLOUDFLARE_ACCOUNT_ID`.
  - Only the repo owner can read or replace them.
  - To rotate, create a new token in the Cloudflare dashboard, update the GitHub secret, then revoke the old token.
  - The static site itself has no runtime secrets.
- **Rollback:**
  - Find the earlier version with `npx wrangler versions list`, then run `npx wrangler rollback <version-id> --message "<reason>"`. It takes effect in seconds.
  - Only the last 100 versions are available.
  - There are no data caveats, since there is no database.
  - The next merge to `master` deploys again, so revert the bad commit too.
- **Approval:**
  - A human merging to `master` is the production gate, and CI deploys the merge.
  - An agent may build locally and run `wrangler versions list`, `wrangler deployments list` and `wrangler whoami` unattended.
  - Running `wrangler deploy` or `wrangler rollback` against production, editing the custom domain, or creating, rotating or revoking API tokens needs explicit human approval.
- **Logs:**
  - Build and deploy logs are in GitHub Actions; read them with `gh run list --workflow <deploy workflow>` and `gh run view <run-id> --log`.
  - Deployment history comes from `npx wrangler deployments list`.
  - `npx wrangler tail --format pretty` only shows something if Worker code runs. Pure asset hits are not logged.
  - For docs and account state, an agent can use the Cloudflare MCP servers (`mcp.cloudflare.com/mcp`, `docs.mcp.cloudflare.com/mcp`).

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Deploying to Pages per `tech-stack.md` leads to a dead end when server code is needed | Devil's advocate | H | M | Deploy as a Worker with static assets from day one; update the `deployment_target` hint in `tech-stack.md` to Workers |
| Installing the latest `@astrojs/cloudflare` (14.4.0) conflicts with Astro 7.3.8 | Devil's advocate | M | M | Don't add the adapter while the site is static; when server code is needed, upgrade Astro to ≥ 7.4 first or pin adapter 14.3.4 |
| A failed build silently blocks an article from going live | Devil's advocate | M | H | Run `npm run build` in CI on every push, and turn on GitHub Actions failure notifications to an inbox or phone the author reads |
| Workers Builds and GitHub Actions both deploy, so an older build can overwrite a newer one | Pre-mortem | M | M | Use exactly one deploy path (GitHub Actions + `cloudflare/wrangler-action@v4`); don't connect the Workers Builds git integration |
| An image over 25 MiB fails the whole deploy | Unknown unknowns | M | H | Add a CI check that fails early and names any file in the content over ~20 MB, and resize phone photos before publishing |
| A public preview URL exposes an unpublished draft | Devil's advocate | L | H | Keep Worker Previews off for the MVP; never push unpublished notes to any branch; use Cloudflare Access if previews are needed |
| Missing pages return Cloudflare's default response instead of the site's 404 | Unknown unknowns | H | L | Set `not_found_handling: "404-page"` in `wrangler.jsonc` and ship `src/pages/404.astro` |
| Existing DNS records for majusz.com block attaching the custom domain | Unknown unknowns | M | L | Check DNS records in the zone before the first deploy and remove conflicting apex/`www` records |
| Adding Worker code later brings in request and CPU limits and new logging pricing (2026-12-01) | Unknown unknowns | L | L | Review the free-plan limits when the newsletter or game milestone adds server code |
| Worker Previews behavior changes (new feature, stability unlabeled) | Research finding | L | L | Don't depend on previews for the MVP; revisit when Cloudflare labels it GA |

## Getting Started

1. **Install wrangler as a dev dependency:** `npm i -D wrangler@4` (4.151.1 at research time). The static site needs no Astro adapter, and `npm run dev` stays plain Astro.
2. **Add `wrangler.jsonc` at the repo root.** It needs:
   - `name: "majusz"`
   - a current `compatibility_date`
   - `assets: { directory: "./dist", not_found_handling: "404-page" }`
   - a custom-domain route, `routes: [{ pattern: "majusz.com", custom_domain: true }]`

   Remove any conflicting apex DNS records in the majusz.com zone first. Keep the assets setting in the config file, not the beta `--assets` flag.
3. **Do a first manual deploy:** `npx wrangler login`, then `npm run build && npx wrangler deploy`. Check that the site loads at the `workers.dev` URL and at majusz.com.
4. **Set up CI:**
   - Add the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.
   - Add a GitHub Actions workflow that runs on push to `master`, uses Node 22, runs `npm ci && npm run build`, then deploys with `cloudflare/wrangler-action@v4`.
   - Don't also connect Workers Builds.
5. **Practise a rollback once before launch:** `npx wrangler versions list`, then `npx wrangler rollback <previous-id>`. Then turn on GitHub Actions failure notifications.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)

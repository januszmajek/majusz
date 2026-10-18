# First deploy: majusz.com on Cloudflare Workers (static assets)

## Context

`infrastructure.md` picked **Cloudflare Workers with static assets** (not Pages), deployed from GitHub Actions with `cloudflare/wrangler-action@v4` as the *only* deploy path. `tech-stack.md` already says `deployment_target: cloudflare-workers`, `ci_default_flow: auto-deploy-on-merge`, so the two docs agree and nothing needs re-deciding.

Current state (checked read-only):
- Plain Astro 7.3.8, static, no adapter. No `wrangler`, no `.github/`, no `src/pages/404.astro`.
- Home page is still the "Astro Basics" starter.
- `majusz.com` and `www.majusz.com` resolve to nothing → no conflicting DNS records to remove.
- wrangler not logged in on this machine. `gh` is logged in as `januszmajek` with `repo` + `workflow` scopes; repo is public, default branch `master`.
- Latest: `wrangler@4.151.1`, `cloudflare/wrangler-action` v4.1.3.

Decisions from you: **minimal placeholder** page goes live (not the starter); **apex only** (`majusz.com`, no `www`).

Lesson m1l5 asks for the approved plan to be persisted at `context/deployment/deploy-plan.md` as the audit trail.

## Steps

### 1. Site content (minimal, so nothing embarrassing goes public)
- `src/pages/index.astro` → one-line "majusz.com — coming soon" inside `Layout`.
- `src/layouts/Layout.astro` → `<title>` becomes `majusz.com` (prop with that default).
- New `src/pages/404.astro` → short "Page not found" + link home (required by `not_found_handling: "404-page"`).
- Delete now-unused starter files `src/components/Welcome.astro` and `src/assets/*.svg`; update the matching line in `AGENTS.md` Project Structure.

### 2. Wrangler config
- `npm i -D wrangler@4` (pins 4.151.1 in the lockfile). No Astro adapter.
- New `wrangler.jsonc`:
  ```jsonc
  {
    "$schema": "node_modules/wrangler/config-schema.json",
    "name": "majusz",
    "compatibility_date": "2026-10-17",   // if wrangler rejects it as too new, use the latest date it reports
    "assets": { "directory": "./dist", "not_found_handling": "404-page" },
    "routes": [{ "pattern": "majusz.com", "custom_domain": true }],
    "preview_urls": false                  // infra: Worker Previews off for MVP (public URLs)
  }
  ```
  `workers_dev` stays default (on) so the `*.workers.dev` URL can be checked.
- `.gitignore`: add `.wrangler/`.
- `package.json` scripts: add `"deploy": "astro build && wrangler deploy"` (manual/emergency path; CI is the normal path).

### 3. 🔒 Manual gate — Cloudflare login (you)
Run `! npx wrangler login` (browser OAuth). I then run `npx wrangler whoami` to confirm the account and read the account ID.

### 4. First manual production deploy (approved by approving this plan)
`npm run build` → `npx wrangler deploy`. Wrangler creates the Worker and the `majusz.com` custom domain (DNS record + cert).

### 5. CI: `.github/workflows/deploy.yml`
- Triggers: `push` (all branches) + `workflow_dispatch`. `permissions: contents: read`. `concurrency: { group: deploy-production, cancel-in-progress: false }` so an older build can't finish last.
- Job: checkout → `actions/setup-node` (Node 22, npm cache) → `npm ci` → `npm run build` → size guard (fail and name any file in `dist/` over 20 MB, ahead of Cloudflare's 25 MiB limit) → `cloudflare/wrangler-action@v4` with `apiToken`/`accountId` secrets, **only when** `github.ref == 'refs/heads/master'`.
- Every branch push gets a build check (infra risk: failed build silently blocks publishing); only `master` deploys. Workers Builds git integration is **not** connected.

### 6. 🔒 Manual gate — secrets (you)
- In Cloudflare dashboard: create API token from the **"Edit Cloudflare Workers"** template, scoped to your one account (and the majusz.com zone).
- `! gh secret set CLOUDFLARE_API_TOKEN` (prompts for the value, so the token never enters this conversation).
- I run `gh secret set CLOUDFLARE_ACCOUNT_ID --body <id from whoami>`.

### 7. Docs alignment
- `AGENTS.md`: the hard-rule line says wrangler and GitHub Actions are "not installed" → change to installed; add `npm run deploy`, `wrangler versions list`/`rollback` to Commands (rollback/deploy still need human approval, per infra Approval section).
- `context/deployment/deploy-plan.md`: this plan + an outcome log (Worker URL, version IDs, CI run ID, rollback drill result).

### 8. Commit + push to `master` (triggers CI deploy)
Two commits, lowercase style:
- `feat: placeholder home and 404 page`
- `chore: deploy to cloudflare workers via github actions` (wrangler, config, workflow, gitignore, AGENTS.md)
Push → watch with `gh run watch`.

### 9. Rollback drill (infra Getting Started #5; harmless now — placeholder content)
`npx wrangler versions list` → `npx wrangler rollback <manual-deploy-version> --message "rollback drill"` → verify site still up → `gh workflow run deploy.yml` to return to the CI-built version.

### 10. Final doc commit
`doc: first deploy plan and log` (deploy-plan.md with outcomes) → push (also proves a second CI deploy works).

## Verification
- `npm run build` passes locally; `dist/404.html` exists.
- `curl -sI https://majusz.<subdomain>.workers.dev/` → 200.
- `curl -sI https://majusz.com/` → 200 (cert can take a few minutes on first attach).
- `curl -s -o /dev/null -w '%{http_code}' https://majusz.com/does-not-exist` → 404, body is our 404 page.
- `gh run list --workflow deploy.yml` → green; `npx wrangler deployments list` shows the CI deployment.
- Push of a non-master branch is not part of this run (would only be a build check).

## Known risks / leftovers for you
- If CI's custom-domain step fails with an auth error, the token needs extra zone permission (add **Zone → Workers Routes: Edit** / **DNS: Edit** for majusz.com) — I'll report the exact error rather than broaden it myself.
- Turn on failure notifications: GitHub → Settings → Notifications → Actions → "Only notify for failed workflows".

## Outcome log

- **2026-10-17 — manual deploy (step 4):** `wrangler deploy` from the author's machine. Worker `majusz` created in account `d0394269a42f77e33879567f76ad6292`, custom domain `majusz.com` attached. Version `19f66e77-602c-450f-a448-9c8a3b529869`. Home 200, `/does-not-exist` 404 with the site's own page. No `workers.dev` URL was printed (the account's `workers.dev` subdomain may not be set up); not needed.
- **Other Worker in the account** (`perfect-training-planner`) was not touched; `majusz.com` is the only custom domain.
- **compatibility_date** is `2026-10-12`, the newest date wrangler 4.151.1 (workerd 1.20261012) supports.
- **Secrets:** `CLOUDFLARE_ACCOUNT_ID` set from `wrangler whoami`. `CLOUDFLARE_API_TOKEN` from the "Edit Cloudflare Workers" template, scoped to the one account and the `majusz.com` zone. Pitfall: `gh secret set` run through Claude Code's `!` has no TTY and stores an empty value; run it in a real terminal or pipe the value in.
- **2026-10-18 — first CI deploy (step 8):** run `39103965424` failed on the first attempt (empty token, see pitfall), passed on re-run after the token was set. Version `b0096144-9254-40f1-8d9b-adf8b426f3a8`. Home 200, 404 page 404. The token's template permissions were enough for the custom-domain route.
- **2026-10-18 — doc push:** run `39104210073` green (second CI deploy).
- **2026-10-18 — rollback drill (step 9):** done by the author (the agent's sandbox blocks `wrangler rollback` against production). 06:31 UTC `wrangler rollback 19f66e77-602c-450f-a448-9c8a3b529869 --message "rollback drill"`, then 06:32 `gh workflow run deploy.yml` (run `39104382782`, green) restored the CI build as version `c7c67121-8b92-4a08-85d8-aeaf0d35f79a`.
- **GitHub Actions failure notifications:** turned on by the author.
- **Open:** `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19; watch the next CI run.

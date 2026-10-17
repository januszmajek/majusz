---
starter_id: astro
package_manager: npm
project_name: majusz
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers
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
---

## Why this stack

A solo author shipping a minimal personal blog in about three weeks, with no accounts, no database and no visitor data, needs a content-first framework rather than a full-stack SaaS starter. Plain Astro was chosen over the general web default (10x Astro Starter) because that default's Supabase database and auth are explicitly ruled out by the PRD, while Astro treats markdown posts living in the repo as first-class content and serves static pages that load fast on phones and survive a viral spike on Cloudflare Workers with static assets at no cost (see `infrastructure.md`), using the majusz.com domain already registered there. The author's hard requirements of React and shadcn/ui are met through Astro's React integration, which also hosts the post-launch in-browser game as an interactive island; Obsidian-flavored rendering (callouts, wikilinks, diagrams, math, syntax highlighting) is expected to come from markdown plugins. All four agent-friendly gates pass and bootstrapper confidence is verified. The self-check left official-starter, conventions and agent-judgment unconfirmed, so the generated agent instructions should spell out Astro, React-island and shadcn/ui conventions. CI runs on GitHub Actions with auto-deploy on merge to main, matching the PRD's publish-by-adding-a-file flow.

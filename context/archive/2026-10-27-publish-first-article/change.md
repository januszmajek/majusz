---
change_id: publish-first-article
title: Publish first article
status: archived
created: 2026-10-27
updated: 2026-10-30
archived_at: 2026-10-30T22:42:39Z
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

- 2026-10-30, Phase 4: verified end to end with a test post from the iPhone (live at
  `/test-from-phone`, 200 with title, date and `1 min`, deploy 34 s, screenshot without GPS).
  The author then removed the test commits with a force-push, so 4.x has no commit to cite;
  the real hello post comes later as an ordinary publish.
- The iPhone clone failed until `c7831c6` removed the `CLAUDE.md.scaffold` symlink: Obsidian
  Git on iOS cannot check out symlinks. Keep symlinks out of the repo.
- Out of plan, from the phone test: `0b375ca` renders Obsidian's `![alt|300](…)` width.
- Phone commits used the author's personal email; the phone's commit author must use the
  GitHub noreply address. Fixed: the iPhone's Obsidian Git now commits as the noreply address
  (confirmed by the author at impl review, 2026-10-30).

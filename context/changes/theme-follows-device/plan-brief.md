# Theme Follows Device — Plan Brief

> Full plan: `context/changes/theme-follows-device/plan.md`

## What & Why

Roadmap S-07 (PRD FR-007): visitors already get their device's dark or light theme; now they
can switch it with a button and the site remembers the choice. It closes the last design piece
F-01 left open, without cookies or shipping React.

## Starting Point

An inline head script sets `.dark` from `prefers-color-scheme` before first paint, and every
theme-dependent part (tokens, code, diagrams, motif canvas) already reacts to that class. The
shadcn `Button` and lucide icons are installed but unused.

## Desired End State

A ghost sun/moon button at the right of the header on every page. Clicking it switches the
theme instantly; the choice is stored in `localStorage`, applied before paint on every later
visit, always wins over the device, and syncs to other open tabs. It works by keyboard and
screen reader, and still works (unremembered) when storage is blocked.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Memory | Stored choice always wins over the device | Author prefers predictability once a theme is picked |
| Build | shadcn `Button` rendered statically + tiny inline script | Keeps design.md's look with zero React in the browser |
| Icon | Current theme (sun in light, moon in dark), CSS `dark:` swap | shadcn's mode-toggle convention; no icon flash before JS |
| Tabs | Other tabs follow at once (`storage` event) | Consistent theme across tabs for ~3 lines |
| Storage | `localStorage` key `theme` | Nothing leaves the device; matches design.md and the no-cookie rule |
| Instant navigation | Out of S-07; parked as its own roadmap item | Separate concern; the toggle stays compatible with it |

## Scope

**In scope:** stored choice + device fallback in the head script, tab sync, `ThemeToggle`
component in the header, design.md / AGENTS.md updates, parked roadmap item.

**Out of scope:** a "system" third state, cookies, React hydration, prefetch/ClientRouter, any
color or motif change.

## Architecture / Approach

`ThemeScript` (inline, in `<head>`) decides the theme: stored value, else the device; device
changes apply only while nothing is stored; `storage` events re-apply. `ThemeToggle` renders
shadcn `Button` + lucide icons to plain HTML; its inline script flips `.dark`, stores the value
and syncs `aria-pressed`. Everything else already follows `.dark`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Theme toggle | Working, remembered, tab-synced toggle in the header | Theme flash if the stored choice is read too late |
| 2. Docs | design.md, AGENTS.md, parked roadmap item | Docs drifting from built behavior |

**Prerequisites:** F-01 (done).
**Estimated effort:** one short session.

## Open Risks & Assumptions

- Once a visitor clicks, the site no longer follows the device for them (accepted by the author).
- A future ClientRouter must re-apply the theme after each page swap (noted in the parked item).

## Success Criteria (Summary)

- The toggle switches the theme instantly and the choice survives reloads with no flash.
- Keyboard and screen-reader users can use it; blocked storage breaks nothing.
- No React runtime added to the built site.

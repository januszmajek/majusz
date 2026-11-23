# Theme Follows Device Implementation Plan

## Overview

Add the manual theme switch (roadmap S-07; PRD US-01, FR-007). The site already follows the
device's dark/light setting; this change adds a sun/moon button in the header that switches the
theme, remembers the choice locally and keeps other open tabs in step. Nothing is sent anywhere
and no React runs in the browser.

## Current State Analysis

- `src/components/site/ThemeScript.astro` is an inline `<head>` script that sets `.dark` on
  `<html>` from `prefers-color-scheme` before first paint and follows changes. Its comment
  reserves the stored manual choice for S-07.
- Everything theme-dependent keys off `.dark`: tokens (`src/styles/global.css` `.dark`, the
  `dark` custom variant), code and diagrams (`src/styles/prose.css`), and the motif canvas,
  which watches the class with a `MutationObserver` (`src/components/site/motif/start.ts:79-80`).
  Toggling the class is enough; nothing else needs wiring.
- `src/components/site/SiteHeader.astro` has the wordmark on the left and renders `<nav>` only
  when `src/config/nav.ts` has entries (none until S-06).
- `src/components/ui/button.tsx` is the shadcn `Button` (base-ui primitive, `ghost` variant,
  `icon` sizes). No page uses it yet. `lucide-react` and `@astrojs/react` are installed; no page
  has a `client:*` island, so the site ships no React runtime today.
- `design.md` → Theme toggle: shadcn `Button` (ghost, icon), lucide Sun/Moon, after the last nav
  item, accessible name "Dark theme" with `aria-pressed`, applied before first paint from the
  stored choice else the system preference, stored locally (no cookie, no tracking).
- `html` has a 300 ms background/color transition, disabled under `prefers-reduced-motion`.

## Desired End State

- Every page shows a ghost icon button at the right of the header. It shows a sun in light and a
  moon in dark (shadcn's mode-toggle convention: the icon is the current theme), switching with
  shadcn's rotate/scale animation, which is skipped under reduced motion.
- Clicking it (or Enter/Space when focused) switches the theme immediately and stores the choice
  in `localStorage` under `theme` (`light` | `dark`).
- On any later page load the stored choice is applied before first paint, so there is no flash,
  and it **always wins** over the device setting; with no stored choice the site follows the
  device, live, as today.
- Other open tabs switch at once when the choice changes.
- If storage is unavailable (private mode, blocked), the button still switches the current page;
  nothing throws.
- The button's accessible name is "Dark theme"; `aria-pressed` is `true` in dark.

### Key Discoveries:

- `ThemeScript.astro:7-14` is the single place that decides the theme; `motif/start.ts:80`
  already re-renders on class changes.
- `SiteHeader.astro` wraps `<nav>` in `nav.length > 0`; the toggle sits outside that condition
  so it shows with an empty nav.
- An Astro page can render a React component with no `client:*` directive: it becomes plain HTML
  and ships no JS, keeping the shadcn markup and classes.
- The icon swap can be pure CSS via the `dark:` variant, so the right icon shows before any
  script runs.

## What We're NOT Doing

- No "follow device" third state and no way to clear the stored choice from the UI (author's
  decision: the stored choice always wins once set).
- No cookies, no server-side theme, no analytics on toggling.
- No React island / hydration.
- No prefetching or ClientRouter ("instant navigation" is parked in the roadmap as its own item);
  the toggle should not get in its way, but this change does not add it.
- No changes to theme colors, the motif or code/diagram themes.

## Implementation Approach

Keep the decision in the head script (it must run before paint) and the button as static
shadcn markup plus a few lines of behavior. The script owns three rules: stored choice if
present, else the device; follow device changes only while nothing is stored; follow
`storage` events from other tabs. The button script flips `.dark`, writes the choice and keeps
`aria-pressed` in sync.

## Critical Implementation Details

- **Timing & lifecycle**: the stored choice must be read in the existing inline head script,
  before the stylesheet paints; reading it in a deferred/module script would flash the device
  theme first. Every `localStorage` access is wrapped in `try/catch`.
- **State sequencing**: the device-change listener must check for a stored choice at the time
  of the change, not at load, so a click made after load stops device changes from overriding
  it.

## Phase 1: Theme toggle

### Overview

Stored choice in the head script, tab sync, and the header button.

### Changes Required:

#### 1. Head script

**File**: `src/components/site/ThemeScript.astro`

**Intent**: Apply the stored choice before first paint, fall back to the device, and keep tabs
in step.

**Contract**: `localStorage` key `theme`, values `light` | `dark`; any other value is ignored
(treated as no choice). Theme = stored value, else `prefers-color-scheme`. A
`prefers-color-scheme` change applies only while no valid value is stored. A `storage` event for
key `theme` re-applies (a removed key falls back to the device). All storage access in
`try/catch`. Update the file comment (S-07 has landed).

#### 2. Toggle button

**File**: `src/components/site/ThemeToggle.astro` (new)

**Intent**: The header's sun/moon button, rendered from the shadcn `Button` as static HTML,
with a small inline script for the click.

**Contract**: `Button` from `@/components/ui/button` with `variant="ghost"` and an icon size that
fits the 1.25–1.375rem chrome type, no `client:*` directive; `type="button"`,
`aria-label="Dark theme"`, `aria-pressed` kept equal to `.dark` on `<html>` (set on load and
after every switch, including ones from another tab or the device). lucide `Sun` and `Moon`,
`aria-hidden`, swapped by `dark:` classes with shadcn's rotate/scale transition, no transition
under `prefers-reduced-motion`. Click: flip `.dark`, store the new value (`try/catch`). Focus
ring follows the site's `:focus-visible` accent outline.

#### 3. Header placement

**File**: `src/components/site/SiteHeader.astro`

**Intent**: Show the toggle at the right of the header on every page, after the nav when the
nav has items.

**Contract**: the right-hand side is the nav (when non-empty) followed by `ThemeToggle`; the
wordmark stays left with space between. Narrow screens keep one header line.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Build passes: `npm run build`
- Every built page has the toggle and no React runtime: `grep -l 'aria-label="Dark theme"' dist/index.html dist/404.html` lists both, and no React runtime ships: `! grep -rl "react-dom" dist/_astro/ dist/*.html`

#### Manual Verification:

- Click switches theme instantly in both directions; icon shows sun in light, moon in dark
- Reload and open another page: the chosen theme stays, with no flash of the other theme
- With a stored choice, changing the device theme does not change the site; with storage cleared, the site follows the device live
- Two tabs: switching in one switches the other at once
- Keyboard: Tab reaches the button with the accent focus ring; Enter and Space toggle; screen reader announces "Dark theme, toggle button, pressed/not pressed"
- Private window: toggle works on the page, nothing breaks
- Header on a phone width: wordmark left, button right, one line; button easy to tap

**Implementation Note**: After completing this phase and all automated verification passes,
pause here for manual confirmation from the human that the manual testing was successful before
proceeding to the next phase.

---

## Phase 2: Docs

### Overview

Record the toggle's behavior and the parked follow-up.

### Changes Required:

#### 1. Design doc

**File**: `context/foundation/design.md`

**Intent**: Describe the built behavior and close the slice item.

**Contract**: Theme toggle section: icon = current theme (shadcn convention), stored choice
(`localStorage` `theme`) always wins over the device once set, tabs sync, storage failures are
harmless. Header line mentions the toggle without the `articles` item. "Left for slices": strike
"Theme toggle behavior and wiring — S-07" with a "Done:" note.

#### 2. Agent guide

**File**: `AGENTS.md`

**Intent**: Keep the project map true.

**Contract**: the site-shell bullet names `ThemeScript` (theme before paint, stored choice) and
`ThemeToggle` (static shadcn button, no hydration), and notes that shadcn components may be
rendered without `client:*` to ship no JS.

#### 3. Roadmap

**File**: `context/foundation/roadmap.md`

**Intent**: Keep "instant navigation" (prefetch of linked pages, maybe ClientRouter) as a
separate future item, as the author decided.

**Contract**: a `## Parked` bullet: "Instant navigation (prefetch every linked page, maybe
ClientRouter)" with why: decided 2026-11-23 during S-07 planning, to plan as its own slice after
S-06; a ClientRouter must re-apply the theme after each page swap.

### Success Criteria:

#### Automated Verification:

- Tests and build still pass: `npm test && npm run build`

#### Manual Verification:

- design.md, AGENTS.md and the roadmap entry match what was built

---

## Testing Strategy

### Unit Tests:

- None new: the logic is a few lines of inline script that must run before paint and cannot
  import modules; it is covered by the build checks and the manual matrix below.

### Integration Tests:

- `npm run build`, then the `dist/` greps for the toggle on every page and no React chunk.

### Manual Testing Steps:

1. `npm run dev`; toggle on `/` and on an article, in both directions.
2. Reload; open another page; check no flash.
3. Change the device theme with and without a stored choice (clear `localStorage` in DevTools).
4. Two tabs side by side; toggle in one.
5. Keyboard and screen reader pass; private window; phone width.

## Performance Considerations

The button is static HTML plus a few hundred bytes of inline script; no React or extra request.
The icon swap is CSS, so there is no layout shift or icon flash.

## References

- Roadmap: `context/foundation/roadmap.md` → S-07
- Design: `context/foundation/design.md` → Theme toggle, Header
- Head script: `src/components/site/ThemeScript.astro`
- Motif theme hook: `src/components/site/motif/start.ts:79-80`
- shadcn Button: `src/components/ui/button.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Theme toggle

#### Automated

- [x] 1.1 Unit tests pass: `npm test` — 09c505f
- [x] 1.2 Build passes: `npm run build` — 09c505f
- [x] 1.3 Every built page has the toggle and no React runtime — 09c505f

#### Manual

- [x] 1.4 Click switches theme both ways; sun in light, moon in dark — 09c505f
- [x] 1.5 Choice survives reload and navigation with no flash — 09c505f
- [x] 1.6 Stored choice beats device changes; without one the site follows the device live — 09c505f
- [x] 1.7 Two tabs stay in step — 09c505f
- [x] 1.8 Keyboard and screen reader: focus ring, Enter/Space, "Dark theme" pressed state — 09c505f
- [x] 1.9 Private window: works, nothing breaks — 09c505f
- [x] 1.10 Phone width header: one line, easy to tap — 09c505f

### Phase 2: Docs

#### Automated

- [x] 2.1 Tests and build still pass: `npm test && npm run build` — 59cf76f

#### Manual

- [x] 2.2 design.md, AGENTS.md and the roadmap entry match what was built — 59cf76f

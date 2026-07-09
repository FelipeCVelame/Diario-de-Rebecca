# Design Guidelines: Diário da Rebecca

**Document Version:** 1.0
**Date:** 2026-07-09
**Status:** Living document

<!-- DOC_KIND: reference -->
<!-- DOC_ROLE: canonical -->
<!-- READ_WHEN: Read when you need the color tokens, typography, or accessibility rules before touching UI/CSS. -->
<!-- SKIP_WHEN: Skip when you only need business/functional scope or backend behavior. -->
<!-- PRIMARY_SOURCES: styles.css, app.js, docs/project/architecture.md -->

<!-- SCOPE: Visual design system (color tokens, typography, spacing), component conventions, WCAG 2.1 AA accessibility rules ONLY. -->
<!-- DO NOT add here: Functional requirements → requirements.md, System architecture → architecture.md -->

<!-- NO_CODE_EXAMPLES: This document lists tokens and rules, not CSS implementations. For exact values, see styles.css. -->

## Quick Navigation

- [Docs Hub](../README.md)
- [Architecture](architecture.md)
- [Requirements](requirements.md)

## Agent Entry

| Signal | Value |
|--------|-------|
| Purpose | Documents the existing visual design system and accessibility rules — glassmorphism, dark-only, hand-made duotone icons. |
| Read When | You're adding or changing UI and need the existing tokens/conventions instead of inventing new ones. |
| Skip When | You only need business scope or backend/sync behavior. |
| Canonical | Yes |
| Next Docs | [Architecture](architecture.md) |
| Primary Sources | `styles.css`, `app.js`, `docs/project/architecture.md` |

---

## 1. Design System Overview

Glassmorphism, **dark-only** (no light theme yet — see [Requirements §7](requirements.md#7-out-of-scope-this-phase)).
Frosted-glass surfaces (`--glass*` tokens + `--blur: 26px`) over a near-black background, with each
event category getting its own accent color used consistently across buttons, chips, and charts.

Icons are a hand-made **duotone SVG set** (`ICONS` object in `app.js`, 24×24 viewBox) — solid shape
+ translucent layers in the same `currentColor`, chosen over emoji because emoji render
inconsistently across platforms/fonts and previously caused visual misalignment in the button grid.

---

## 2. Color Tokens

All colors are CSS custom properties defined once in `styles.css` (`:root`) — never hardcode a
color in a component; reference the token.

### 2.1 Base

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#08080d` | Page background |
| `--text` | `#f4f4f8` | Primary text |
| `--muted` | `#9d9bb0` | Secondary text |
| `--muted-2` | `#7d7b92` | Tertiary text — deliberately lightened from an earlier `3.98:1` contrast ratio to `4.5:1` against `--bg` to meet WCAG AA |
| `--accent` / `--accent-2` | `#9a9bff` / `#8ab4ff` | Primary accent, focus rings, gradients |

### 2.2 Glass Surfaces

| Token | Value |
|-------|-------|
| `--glass` | `rgba(255,255,255,0.04)` |
| `--glass-2` | `rgba(255,255,255,0.06)` |
| `--glass-brd` | `rgba(255,255,255,0.08)` |
| `--glass-brd-2` | `rgba(255,255,255,0.14)` |
| `--blur` | `26px` |

### 2.3 Category Colors

Each event category has a `base` / `-bg` (fill) / `-brd` (border) / `-glow` (shadow) quartet, used
consistently for that category's button, chip, and chart bars:

| Category | Base | Meaning |
|----------|------|---------|
| `--c-wake` | `#f2b866` (amber) | Wake events |
| `--c-food` | `#58cc93` (green) | Milk/meal events |
| `--c-diaper` | `#5aa9f2` (blue) | Diaper changes |
| `--c-nap` | `#b49bf5` (violet) | Naps |
| `--c-night` | `#8189e8` (indigo) | Night sleep |
| `--c-sick` | `#f08a8a` (red) | Illness |
| `--c-appt` | `#4fd6c0` (teal) | Appointments |

**Rule:** when adding a new event category, add its own `--c-*` / `--c-*-bg` / `--c-*-brd` /
`--c-*-glow` token set rather than reusing another category's color — color is how users tell
categories apart at a glance in the trends charts and calendar.

---

## 3. Typography

System font stack (no webfont download, fastest LCP):
`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.

No separate type-scale token set exists yet — sizes are set per-component in `styles.css`. If the
UI grows, consider extracting a `--fs-*` scale rather than continuing per-component sizing.

---

## 4. Layout & Spacing

- `--radius: 18px` — standard corner radius for cards/buttons.
- `--nav-h: 62px` — bottom navigation bar height; `--safe-b`/`--safe-t` use `env(safe-area-inset-*)` for notch/home-indicator safe areas on iOS.
- Event button grid: text is always rendered **below** the icon (not beside it) for visual consistency across all tiles, including the trailing odd-count tile, which spans the full grid width instead of being cut to half-width (see the `.btn-grid > .evt-btn:last-child:nth-child(odd)` rule).

---

## 5. Accessibility (WCAG 2.1 AA)

A manual accessibility pass has already been applied; the rules below are the result and must be
preserved in future changes.

| Rule | Implementation |
|------|------------------|
| **Contrast (AA, 4.5:1 for text)** | `--muted-2` was deliberately lightened from `3.98:1` to `4.5:1` against `--bg` — see the inline comment in `styles.css` next to the token. Any new low-emphasis text color must be checked against `--bg`/`--glass` the same way before shipping. |
| **Touch targets (≥44px)** | Interactive tiles (event buttons, calendar cells, nav items) use a `min-height: 104px` (event grid) or equivalent padding to clear the 44px minimum — verify with `getBoundingClientRect()` in the browser preview, not just visual inspection, since padding/line-height can silently shrink the hit area. |
| **Visible focus (`:focus-visible`)** | Buttons, timeline items, calendar cells, and any `[tabindex]` element get a custom focus ring (`box-shadow` with `--accent-soft` + `--accent`, not the browser's default blue outline) — see `styles.css` around the `:focus-visible` rules. Never remove `outline` without providing this replacement. |
| **Grid alignment** | A `min-width: 0` fix is applied where CSS Grid `1fr` tracks were growing asymmetrically because text content's intrinsic min-content width overrode the fr-unit sizing — watch for this whenever a grid item contains unbreakable text. |

**When adding new interactive UI:** reuse the existing `:focus-visible` selector list (add the new
element's selector to it) rather than introducing a second, inconsistent focus style.

---

## 6. Icons

`ICONS` (object in `app.js`) is the single source of truth for all icons — hand-drawn duotone SVGs,
24×24 viewBox, using `currentColor` so each icon inherits its surrounding chip's category color.
`svgIcon(name, cls)` renders one; `hydrateIcons(root)` hydrates all `[data-icon]` placeholders under
a root element. Add new icons here rather than pulling in an icon font/library — the whole set is a
few KB and ships with zero extra dependencies.

---

## Maintenance

**Last Updated:** 2026-07-09

**Update Triggers:**
- A new `--c-*` category token set is added
- A new accessibility fix is applied (add it to Section 5's table)
- A light theme is introduced (this doc currently assumes dark-only)

**Verification:**
- [ ] Every `--c-*`/`--glass*`/base token listed here still exists in `styles.css`
- [ ] Section 5's rules still match the live CSS (contrast ratio, touch target sizes, focus selectors)

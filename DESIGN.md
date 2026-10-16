# Design direction

Recorded from the existing dashboard and the owner's request to keep its look during the 2026-10 redesign. Confirm or edit; this file is the reference for future UI work.

## Identity

- Personal stats dashboard for Eventernote users: live-event history, read like a fan's logbook rather than a business report.
- Calm, data-first, dark by default with a working light theme. The numbers are the content; chrome stays quiet.

## Dials

ENERGY 1 / RHYTHM 2 / MOTION 1

- ENERGY 1: no hero, no decoration; the user's own numbers carry the page.
- RHYTHM 2: consistent card grid, broken by the receipt preview and the section headings.
- MOTION 1: hover and state transitions only. No entrance animations, no loops.

## Palette

- Neutral gray scale from the Park UI preset (`neutral`) for surfaces and text.
- One accent: Park `blue`. Used for the primary action (Print receipt), the active section indicator, selected controls, progress, and "your attendance" figures. Not used for ordinary stat values.
- Chart series: single accent for one-series charts (monthly bars, share bars, heatmap scale). The cumulative-artist line chart needs up to 10 distinguishable series, so it uses a fixed categorical set; legends stay neutral text.
- Text colors must pass WCAG AA: `fg.subtle`, `fg.error`, solid blue buttons and `colorPalette.text` are tuned in `panda.config.ts` for that. Form controls use `border.control` (3:1 boundary).

## Typography

- System UI stack for the dashboard: fast, readable in Japanese and Latin, matches the user's OS.
- BIZ UDGothic only on the receipt: a monospaced Japanese gothic that keeps half-width Latin and full-width kana aligned, like thermal-printer output.
- Sentence case for labels. No uppercase tracking in the dashboard; uppercase is reserved for the receipt, where it imitates printer type.

## Components

- Cards are flat with a subtle border; elevation (shadow) is reserved for things that float above the page: drawers, popovers, the receipt preview.
- Icons: Lucide, because it ships with the project and every icon sits next to a text label or has an aria-label. Icons mark actions (print, save, theme, sign out, external link, info), never decorate headings.
- Every number that needs context gets an info popover that opens on tap, click or keyboard.
- Mobile: header scrolls away and only the section nav stays pinned; tap targets are at least 44 px below the `md` breakpoint.

## Receipt

- Mirrors the Receiptify / Eventer Receipt references the owner supplied: title, period, item table, totals, QR to the report.
- Only real data is printed. No invented order, card or auth numbers.

## Share image

- 1080 × 1350 gig poster, not a dashboard export: total shows as the headline, a calendar heatmap (daily for ranges up to about 13 months, one row per year by week beyond that), top artists set as a festival lineup sized by rank, the remaining numbers written as sentences with the figures in the accent colour, venues as one line, QR to the report bottom right.
- Dashed rules echo the receipt's perforation. The uppercase tracked "LINEUP" label is the one deliberate exception to sentence case, borrowed from gig-poster typography.
- Every number is real; facts whose data is missing are left out rather than shown as zero.

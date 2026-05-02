---
name: loading-skeleton
description: Create skeleton loading placeholders that match the final content's layout. Use when the user asks for "skeleton", "shimmer", or to "improve loading state".
---

# Loading Skeleton

Skeletons reduce perceived latency. Use them when the final layout is known and stable. For unknown durations or one-shot mutations, prefer a spinner.

## Building blocks

- A `Skeleton` primitive in `components/ui/skeleton.tsx`: a `View` with `bg-muted/20` (or `bg-border` in dark) and a Reanimated shared-value driving `opacity` between 0.5 → 1 over ~1.2s ease-in-out, looped.
- Compose into row variants that mirror the real component:
  - `SubscriptionRowSkeleton` — circle (logo) + two stacked bars (name, price).
  - `AnalyticsCardSkeleton` — title bar + chart-shaped block.

## Rules

- Match the real row's height and padding exactly so the page doesn't shift on data arrival.
- Render 5–8 skeleton rows for lists; one for cards.
- Respect reduced motion: when `useReducedMotion()` is true, hold opacity at 0.7 instead of pulsing.
- Never delay rendering the skeleton — it must appear within the same frame as the loading state.

## Anti-patterns

- Don't shimmer text content with random widths — use 60–80% of container width per bar to look intentional.
- Don't use a spinner *and* a skeleton on the same surface.

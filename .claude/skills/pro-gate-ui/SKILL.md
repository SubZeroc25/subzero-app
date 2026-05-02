---
name: pro-gate-ui
description: Apply the SubZero Pro-tier UI gating pattern (lock icon, upgrade CTA, Pricing modal trigger) consistently. Use when the user asks to "gate this feature", "add Pro lock", or wires up a feature listed as Pro in design.md.
---

# Pro Gate UI

Per `design.md` Pro Gating section:
- Free: 1 scan/month, 10 subscription limit, basic charts.
- Pro: Unlimited everything, export, manual add, savings insights.
- Gate checks happen at service level; UI shows lock icons + upgrade CTA.

## Component pattern

For a Pro-only action button:
- Show the action label normally.
- If user is on Free, append a `lock-closed` icon (Expo vector icons) sized 14pt at `text-muted`.
- On press: do not perform the action — open the Pricing modal via `router.push('/pricing')`.

For a Pro-only section (e.g. Potential Savings card):
- Render the card with a blurred/dimmed preview (50% opacity overlay using `bg-surface/60`).
- Center an unlock pill: "Unlock with Pro" → opens Pricing modal.
- Do not fetch the underlying Pro data on Free.

For a Pro-limited list (e.g. Subscriptions beyond 10 on Free):
- Render the first 10 normally.
- Render an inline upgrade row at position 11: "Upgrade to see all X subscriptions".

## State source

User plan lives on `UserProfile.plan` ('free' | 'pro'). Read via the existing user query hook — never call the API directly. Cache invalidation on plan change is handled centrally; do not duplicate.

## Copy

- Action gate tooltip: "Pro feature"
- Section overlay: "Unlock with Pro"
- Pricing CTA in modal: "Upgrade to Pro"
- Stripe is not live — pressing Upgrade shows a "Coming Soon" toast (per design.md).

## Hard rules

- Never silently no-op a Pro action — always route to Pricing.
- Never expose the data behind a Pro gate (don't fetch and hide; don't fetch and dim).
- Never localize lock icon to one screen — use the same primitive everywhere.

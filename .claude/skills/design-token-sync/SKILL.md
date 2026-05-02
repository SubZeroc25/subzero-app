---
name: design-token-sync
description: Keep SubZero design tokens consistent across design.md, theme.config.js, tailwind.config.js, constants/theme.ts, and global.css. Use when the user changes a color/token, asks to "add a token", "update palette", or wants to verify the palette matches the design spec.
---

# Design Token Sync

The single source of truth is `theme.config.js`. The design palette also appears in `design.md` (table) and `constants/theme.ts`. Tailwind reads from `theme.config.js` automatically.

## When invoked

1. Read `theme.config.js`, `design.md` (Color Palette section), `constants/theme.ts`, `tailwind.config.js`, `global.css`.
2. Diff the palettes — flag any token that disagrees in light/dark hex, name, or coverage.
3. Propose a unified set of changes; apply only after confirming with the user when the change is non-trivial.
4. After edits, run `pnpm check` to confirm types still pass.

## Adding a token

- Add to `theme.config.js` with both `light` and `dark` swatches.
- Add the row to the `design.md` Color Palette table with usage description.
- Mirror in `constants/theme.ts` if the token is consumed from JS (not just className).
- Tailwind picks it up automatically via `tailwind.config.js`.

## Hard rules

- Never introduce a token that lacks both light and dark swatches.
- Never use raw hex in component files — always reference the token via Tailwind class or `themeColors`.
- Naming is lowercase, single word (`primary`, `surface`), matching the existing convention.

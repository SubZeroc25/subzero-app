---
name: dark-mode-check
description: Verify a screen or component renders correctly in both light and dark themes. Use when the user asks to "check dark mode", "test light/dark", or after a UI change that touched color classes.
---

# Dark Mode Check

The app uses NativeWind's `dark:` variant strategy with `darkMode: "class"` and a `data-theme` attribute on `:root`.

## Procedure

1. Open the target file. List every class that sets a color (`bg-*`, `text-*`, `border-*`, `divide-*`, `placeholder-*`, `ring-*`).
2. For each, confirm a corresponding `dark:` variant exists or the token itself resolves to both swatches via `var(--color-*)`. Tokens defined in `theme.config.js` resolve automatically — but `bg-foreground` (token DEFAULT) is correct, `bg-foreground-light` is wrong because it pins the light value in dark mode.
3. Check borders: cards/dividers using `border-border` must remain visible against `bg-surface` in both themes.
4. Check states: pressed/hover/disabled states must also pass dark.
5. Check images, icons, and SVGs: any explicit fill needs a dark counterpart, usually via `currentColor` + a parent text color class.

## Manual verification

If the dev server is running, instruct the user to toggle the theme via the Profile screen → Dark mode toggle (or set `data-theme="dark"` on `<html>` in web devtools) and visually verify.

## Hard rules

- Never use `text-foreground-light` or other pinned-side variants in component code.
- Avoid `dark:` overrides that contradict the token — if you find yourself writing `bg-surface dark:bg-[#000]`, fix the token instead.

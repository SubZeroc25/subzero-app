---
name: icon-splash-gen
description: Generate or update the app icon, adaptive icon, and splash screen assets for Expo. Use when the user asks to "update the icon", "regenerate splash", or changes the app branding.
---

# Icon & Splash Generation

Expo reads icon/splash config from `app.config.ts`. Source assets live under `assets/images/`.

## Required assets

- `icon.png` — 1024×1024, square, no transparency, no rounded corners (Expo applies them).
- `adaptive-icon.png` — 1024×1024 foreground, transparent background, safe zone is the inner 66% circle.
- `splash-icon.png` — 1024×1024 (or larger) centered logo on transparent.
- `favicon.png` — 48×48 for web.

## Procedure

1. Read `app.config.ts` to confirm asset paths and `backgroundColor` settings.
2. If the source artwork exists in Figma/Canva, use the corresponding skill (`figma-import` / `canva-export`) to fetch the master.
3. Place processed PNGs under `assets/images/` with the names above.
4. Verify `app.config.ts` references match. Splash `backgroundColor` must equal `theme.config.js`'s `surface.light` (or `background.light` if dark-on-light).
5. Run `npx expo prebuild --clean` only if the user is on a bare workflow — otherwise reload Metro.

## Hard rules

- Never bake the SubZero wordmark into the adaptive-icon foreground beyond the safe zone — it'll be cropped on Android.
- Splash background must match in light and dark; if a dark variant is required, configure `splash.dark` in `app.config.ts`.
- Never commit PSD/AI source files — only the exported PNGs.

---
name: screen-scaffold
description: Scaffold a new SubZero screen following the project's Expo Router + NativeWind + ScreenContainer conventions. Use when the user asks to "create a screen", "add a route", or names one of the screens from design.md (Landing, Auth, Onboarding, Dashboard, Subscriptions, Analytics, Profile, Pricing, Scan Flow).
---

# Screen Scaffold

Files live under `app/` using Expo Router file-based routing. Tabs go under `app/(tabs)/`, modals are top-level routes with `presentation: 'modal'`.

## Process

1. Locate the spec for the screen in `design.md` (sections 1–9). If the user names a screen not in the spec, ask whether to extend `design.md` first.
2. Inspect `components/screen-container.tsx` and an existing screen (e.g. an entry under `app/(tabs)/`) to match conventions.
3. Create the route file. Use:
   - `ScreenContainer` for the outer wrapper (handles safe area + theme background).
   - NativeWind className strings — never inline `style={{...}}` for colors/spacing that have a token.
   - `useColorScheme` from React Native only when a value can't be expressed as a Tailwind `dark:` variant.
4. Wire navigation: if it's a tab, add the tab entry; if it's a modal, register it in the parent `_layout.tsx`.
5. Stub data access via tRPC hooks (`@trpc/react-query`) — do not hardcode fetch calls.
6. Add an empty state, loading state, and error state — see `empty-state-designer` skill.

## Conventions

- File names are kebab-case; the route segment matches.
- Default export is the screen component; named exports for sub-sections only when reused.
- Pro-gated UI uses the `pro-gate-ui` pattern.
- Every list uses `FlatList` with stable `keyExtractor`.

## Hard rules

- No raw hex colors. No inline shadows — use Tailwind shadow utilities.
- Tap targets ≥ 44pt. Text contrast must meet WCAG AA in both themes.

---
name: responsive-layout
description: Adapt SubZero screens for tablet and web breakpoints (the app runs on iOS, Android, and web via react-native-web). Use when the user asks to "make responsive", "support tablet", or "fix web layout".
---

# Responsive Layout

Web is a first-class target — `pnpm dev` runs Expo for web on port 8081. NativeWind supports standard Tailwind breakpoints on web; on native, use `useWindowDimensions`.

## Breakpoints

- `sm` 640px — large phone landscape / small tablet portrait
- `md` 768px — tablet portrait
- `lg` 1024px — tablet landscape / small laptop
- `xl` 1280px — desktop

## Patterns

- **Phone-first**: write the mobile layout, then add `md:` overrides.
- **Max width**: content surfaces (forms, list pages) cap at `max-w-2xl` and center with `mx-auto` on web/tablet.
- **Two-column on tablet**: Dashboard cards flex-wrap and grow to two columns at `md`.
- **Modal as sheet on mobile, dialog on web**: use Expo Router's `presentation: 'modal'` mobile, and a centered overlay component on web (gate with `Platform.OS === 'web' && width >= 768`).
- **Tab bar to side rail on web**: at `lg`, swap bottom tabs for a left-side rail. Implement as a custom navigator only if the user prioritizes web — otherwise leave as-is.

## Native-side dimensions

```
const { width } = useWindowDimensions();
const isTablet = width >= 768;
```

Don't read `Dimensions.get('window')` synchronously — it doesn't update on rotation.

## Hard rules

- Never assume portrait. Test at 375×812, 768×1024, 1280×800 minimum.
- Never use percentage widths greater than 100 (`w-full` is fine; `w-[120%]` breaks on web).
- Never set fixed pixel heights for content surfaces — let them flex.

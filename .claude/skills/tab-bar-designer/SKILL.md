---
name: tab-bar-designer
description: Design or modify the bottom tab bar (Dashboard, Subscriptions, Analytics, Profile). Use when the user asks to "customize tab bar", "change tab icons", or "add/remove a tab".
---

# Tab Bar Designer

The app uses `@react-navigation/bottom-tabs` via Expo Router under `app/(tabs)/_layout.tsx`. Haptic feedback is provided by `components/haptic-tab.tsx`.

## Tab inventory (from design.md)

1. Dashboard — `home` icon
2. Subscriptions — `repeat` or `list` icon
3. Analytics — `bar-chart-2` icon
4. Profile — `user` icon

## Conventions

- Icons from `@expo/vector-icons` (Feather is the default family).
- Active color: `primary` token; inactive: `muted`.
- Background: `surface`; top border: `border` token.
- Use `HapticTab` as `tabBarButton` for tactile feedback.
- Labels visible by default; hide only if explicitly asked.
- Safe-area inset is handled by `react-native-safe-area-context`.

## Adding a tab

1. Confirm with the user — design.md currently specifies four tabs only.
2. Update design.md Navigation Structure section.
3. Add the route file under `app/(tabs)/`.
4. Add the `<Tabs.Screen>` entry in `_layout.tsx` with icon, label, and `tabBarAccessibilityLabel`.

## Hard rules

- Never exceed 5 tabs — beyond that, switch to a drawer or "More" tab.
- Never use emoji as tab icons.
- Active state must be distinguishable without color (e.g. filled vs outline icon variant) for color-blind users.

---
name: component-scaffold
description: Create a reusable themed UI component for SubZero following the project's NativeWind + tokenized convention. Use when the user asks to "make a component", "extract X into a component", or "add a reusable Y".
---

# Component Scaffold

Reusable primitives go in `components/ui/`. Feature-specific composites go in `components/`. Reference `components/subscription-card.tsx` and `components/screen-container.tsx` for the established style.

## Process

1. Decide placement: primitive (Button, Chip, Badge) → `components/ui/`; feature (SubscriptionCard, RenewalRow) → `components/`.
2. Search for existing similar components before creating a new one — prefer extending.
3. Write the component as a function component with a typed `Props` interface above it.
4. Style with NativeWind classes; thread `className` through `cn()` from `lib/` (or `tailwind-merge` directly) so callers can override.
5. Support both light and dark themes via `dark:` variants — never branch on `useColorScheme` for color choice.
6. Export named (not default) for primitives so they tree-shake cleanly.

## Required surface

- `className?: string` for layout overrides
- Forward `ref` if it wraps a touchable or input
- `accessibilityLabel`/`accessibilityRole` where the role is non-obvious
- `testID` only if the component is targeted in tests

## Hard rules

- No business logic inside `components/ui/` — primitives stay pure.
- No imports from `app/` or `server/` — components must be reusable across routes.
- No raw hex; tokens only.

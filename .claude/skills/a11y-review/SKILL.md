---
name: a11y-review
description: Run an accessibility review on a screen or component — labels, roles, contrast, tap targets, focus order. Use when the user asks for "a11y review", "accessibility check", or before merging UI changes.
---

# Accessibility Review

## Checklist per screen/component

1. **Labels**: every `Pressable`, `TouchableOpacity`, icon-only button has `accessibilityLabel`. Decorative images have `accessibilityElementsHidden` or `aria-hidden`.
2. **Roles**: use `accessibilityRole` of `button`, `link`, `header`, `image`, `tab`, etc. — do not let RN guess.
3. **State**: toggles use `accessibilityState={{ selected, disabled, checked }}`. Loading buttons announce `accessibilityState={{ busy: true }}`.
4. **Tap targets**: minimum 44×44pt. Inspect `hitSlop` on small icons.
5. **Contrast**: token combinations must meet WCAG AA (4.5:1 body, 3:1 large/UI). Quick check pairs:
   - `text-foreground` on `bg-surface` ✓
   - `text-muted` on `bg-surface` — verify in both themes
   - `text-primary` on `bg-surface` — verify in both themes
6. **Focus order**: forms use `returnKeyType` and `onSubmitEditing` to chain; modals trap focus and restore it on close.
7. **Dynamic type**: text scales with system font size — never use `allowFontScaling={false}` unless there's a documented reason.
8. **Reduced motion**: animations check `useReducedMotion()` from Reanimated and degrade gracefully.
9. **Screen reader copy**: error states must be announced (use `accessibilityLiveRegion="polite"` on the message).

## Output

Produce a punch list grouped by severity (blocker / serious / minor). Fix only after the user confirms scope.

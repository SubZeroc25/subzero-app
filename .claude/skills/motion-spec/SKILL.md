---
name: motion-spec
description: Define and implement motion (transitions, gestures, micro-interactions) using react-native-reanimated and gesture-handler. Use when the user asks to "animate", "add transition", "polish motion", or specifies an interaction like swipe-to-cancel.
---

# Motion Spec

The project uses `react-native-reanimated` v4 and `react-native-gesture-handler` v2.

## Standard durations

- Tap feedback: 80–120ms ease-out
- Card press: 150ms ease-out (scale 0.98)
- Screen transitions: native stack defaults — don't override unless the design requires it
- Modal presentation: 250–300ms ease-out
- Skeleton pulse: 1200ms ease-in-out, looped
- Success confirmation: 200ms scale + 400ms hold + 200ms fade

## Easing

Use Reanimated's `Easing.out(Easing.cubic)` for entries, `Easing.in(Easing.cubic)` for exits. Never use linear except for indeterminate progress.

## Gestures (e.g. Subscriptions swipe actions)

- Use `Gesture.Pan()` with `activeOffsetX` to avoid hijacking vertical scroll.
- Reveal action threshold ~75% of action width; snap with `withSpring({ damping: 18, stiffness: 180 })`.
- Always provide a non-gesture equivalent (long-press menu) for accessibility.

## Reduced motion

Wrap entrance animations in `useReducedMotion()` checks; when true, set `duration: 0` or skip the animation entirely while preserving the final state.

## Hard rules

- Never animate layout-affecting properties on the JS thread — use `useSharedValue` + `useAnimatedStyle`.
- Never block user input behind a decorative animation.
- Cap concurrent animations on a screen; long lists must virtualize before animating row entry.

---
name: design-review
description: Review pending UI changes against design.md, the design tokens, and SubZero's UX conventions. Use when the user asks for "design review", "review my UI changes", or before merging a UI PR.
---

# Design Review

A design review is read-only by default — produce a report, then apply fixes only after the user agrees.

## Inputs

1. `git diff origin/main...HEAD -- 'app/**' 'components/**' 'global.css' 'tailwind.config.js' 'theme.config.js' 'design.md'`
2. `design.md` (full spec)
3. `theme.config.js` (token source of truth)

## Review dimensions

1. **Spec conformance**: each new/changed screen matches its `design.md` section. Flag missing elements (CTAs, copy, states) or undocumented additions.
2. **Token discipline**: no raw hex; no inline color styles; spacing on the Tailwind scale. (Run the `theme-audit` skill for depth.)
3. **Light/dark parity**: every color class has a working dark counterpart. (Run `dark:mode-check`.)
4. **States**: every list/data surface has loading, empty, error states. (See `empty-state-designer`.)
5. **Pro gating**: Pro-only features follow the gate pattern. (See `pro-gate-ui`.)
6. **Accessibility**: labels, roles, contrast, tap targets. (See `a11y-review`.)
7. **Motion**: animations follow the duration/easing standards. (See `motion-spec`.)
8. **Responsiveness**: web/tablet layout holds. (See `responsive-layout`.)
9. **Component reuse**: new code reaches for existing primitives in `components/ui/` before inventing.
10. **Dead code**: removed UI cleaned up; no orphaned styles or imports.

## Output

Markdown report with sections per dimension. Each finding: `file:line — issue — suggested fix — severity (blocker/serious/minor)`. End with a one-paragraph summary verdict.

## Hard rules

- Never auto-apply fixes during a review — always wait for the user to triage.
- Never mark a PR ready to ship if any blocker is open.

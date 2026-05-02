---
name: figma-import
description: Convert a Figma frame, component, or page into a SubZero React Native screen or component. Use when the user shares a figma.com URL, references a Figma file, or asks to "import from Figma".
---

# Figma Import

Use the Figma MCP server (tools prefixed `mcp__53b1fd6f-...`).

## URL parsing

- `figma.com/design/:fileKey/:fileName?node-id=:nodeId` → convert `-` to `:` in the nodeId
- `figma.com/design/:fileKey/branch/:branchKey/...` → use `branchKey` as fileKey
- `figma.com/board/...` → FigJam, use `get_figjam` instead

## Workflow

1. Call `get_design_context` with `fileKey` and `nodeId`. Treat the returned React+Tailwind code as a *reference*, not the final output.
2. Call `get_screenshot` for visual confirmation.
3. Adapt to this project's stack:
   - React → React Native primitives (`View`, `Text`, `Pressable`, `Image` from `expo-image`).
   - Tailwind classes → NativeWind (most carry over; flex/grid require translation).
   - Map design tokens to `theme.config.js` tokens — never paste raw hex.
   - Replace generic components with project primitives in `components/ui/` and `components/`.
4. If the design references images/icons, call `upload_assets` (or `get_metadata`) to retrieve them, then place them under `assets/images/` with kebab-case filenames.
5. Code Connect: if `get_design_context` returns mapped components, use those mappings instead of regenerating.

## Hard rules

- Never use `position: absolute` from the Figma output for full-screen layout — translate into flex.
- Never paste pixel values for spacing without rounding to the Tailwind scale.
- Never import an image without an `accessibilityLabel` (or mark it decorative).
- Confirm with the user before creating a new top-level route from a Figma frame.

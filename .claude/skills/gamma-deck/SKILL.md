---
name: gamma-deck
description: Generate a Gamma presentation, document, or webpage describing SubZero's design, screens, or pitch. Use when the user asks to "make a Gamma", "create a deck", or "build a pitch presentation".
---

# Gamma Deck

Use the Gamma MCP server (tools prefixed `mcp__f0aab211-...`).

## Capabilities

- `generate` — create a new Gamma from a prompt.
- `read_gamma` — read an existing Gamma by file ID.
- `get_themes` / `get_folders` — discover styling and placement options.
- Gamma cannot edit existing Gammas — never promise edits. Direct the user to the Gamma editor for refinements.

## Workflow for "build a SubZero pitch deck"

1. Read `design.md` to ground the deck in actual app structure.
2. Decide format: presentation (default for pitches), document (for spec writeups), webpage (for landing previews).
3. Outline the deck before generating:
   - Title: SubZero — Track Every Subscription. Save Every Dollar.
   - Problem
   - Solution (AI inbox scanning)
   - Screens walkthrough (Dashboard, Subscriptions, Analytics)
   - Pro tier
   - Privacy
   - Ask
4. Call `generate` with the outline. Only pass optional parameters (theme, folder) when the user explicitly asked.

## Hard rules

- Keep optional params minimal — Gamma's defaults are good.
- Never claim to edit an existing Gamma; reference the editor instead.
- Don't include fabricated metrics or testimonials.

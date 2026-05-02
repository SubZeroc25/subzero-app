---
name: canva-export
description: Generate or update a Canva design representing a SubZero screen, marketing asset, or onboarding flow. Use when the user asks to "create a Canva", "export to Canva", or shares a Canva URL.
---

# Canva Export

Use the Canva MCP server (tools prefixed `mcp__8ad210d4-...`).

## Common operations

- New design from a prompt: `generate-design` (or `generate-design-structured` for multi-section docs).
- Existing Canva by URL: `resolve-shortlink` to get the design ID, then `get-design`/`get-design-content`.
- Export as PNG/PDF: `get-export-formats` then `export-design`.
- Edits: `start-editing-transaction` → `perform-editing-operations` → `commit-editing-transaction`. Always `cancel-editing-transaction` if you abort.

## Workflow for "make a marketing slide for the SubZero dashboard"

1. Read `design.md` for the relevant screen and palette.
2. `generate-design-structured` with explicit sections matching `design.md`.
3. Override colors via the brand kit: `list-brand-kits` → apply.
4. Export PNG; save under `assets/marketing/` if the user wants it committed.

## Hard rules

- Always commit or cancel an editing transaction — never leave one open.
- Confirm before committing edits to a design that already has a public share link — the user may have collaborators.
- Don't upload sensitive screenshots (real subscription data, real emails) — use placeholder data from `design.md`.

---
name: theme-audit
description: Audit the codebase for off-token color, spacing, or typography usage. Use when the user asks to "audit theme", "find raw hex", "check token usage", or before a design review.
---

# Theme Audit

## What to scan

1. Raw hex literals in `app/`, `components/`, `lib/`, `hooks/`:
   ```
   grep -rn -E '#[0-9a-fA-F]{3,8}\b' app components lib hooks --include='*.{ts,tsx}'
   ```
   Allow only inside `theme.config.js`, `constants/theme.ts`, and SVG glyph fills that map to tokens by reference.

2. Inline `style={{ color: ... }}`, `style={{ backgroundColor: ... }}`, `style={{ borderColor: ... }}` — these bypass NativeWind and usually indicate a missing token usage.

3. Magic spacing: `padding: 13`, `marginTop: 7`, etc. Tailwind spacing scale (`p-1`, `p-2`, `p-3`, `p-4`, `p-6`, `p-8`) should cover ~all cases.

4. Font sizes outside Tailwind's `text-xs` … `text-4xl` scale.

5. Light/dark parity: every component using a token-bearing class should have or inherit a corresponding dark variant. Spot-check by greping for `bg-` and `text-` classes and verifying matching `dark:` siblings exist nearby in the same component.

## Output format

Produce a table: `file:line | issue | suggested replacement`. Group by severity (raw hex > inline style > magic spacing > missing dark variant).

Apply fixes only after the user reviews the table.

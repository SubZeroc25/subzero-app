# SubZero Design Skills — Usage Guide

This repo ships **22 design skills** under `.claude/skills/`. They give Claude
expert design behavior for UI/UX, branding, image generation, slides, and print.

There are **two places** you can use them, and each has its own setup:

1. **Here, in Claude Code** (this coding environment) — *already active, zero setup*
2. **In regular chat at claude.ai** — *upload the zip bundles once*

---

## 1. Using them in Claude Code (here)

**Setup: none.** Any skill folder placed under `.claude/skills/<name>/SKILL.md`
is auto-discovered at the start of every session on this repo. Because they're
committed to git, they load in every future session and for anyone who clones
the repo.

**How to trigger a skill:** just describe the task. Claude reads each skill's
`description` and invokes the matching one automatically. You don't call a
function — you say what you want. Examples:

| You say… | Skill that fires |
|---|---|
| "Redesign the SubZero landing screen so it doesn't look templated" | `frontend-design` / `design-taste-frontend` |
| "Give the dashboard a minimalist editorial look" | `minimalist-ui` |
| "Make it feel like an expensive agency site" | `high-end-visual-design` |
| "Build a design-token system for the app" | `design-system` |
| "Design an App Store feature banner" | `banner-design` |
| "Generate mobile screen concepts for the scan flow" | `imagegen-frontend-mobile` |
| "Create a brand kit / logo system for SubZero" | `brandkit` / `brand` |
| "Turn this screenshot into code" | `image-to-code` |
| "Make a pitch deck about SubZero" | `slides` |
| "Design a poster / print piece" | `canvas-design` |
| "Audit the current UI and upgrade it" | `redesign-existing-projects` |

You can also **name a skill explicitly**: *"Use the `industrial-brutalist-ui`
skill on the analytics screen."*

> Tip: several skills overlap. If you want a specific aesthetic, name the skill.
> If you just want "good design," describe the goal and let Claude pick.

---

## 2. Using them in regular claude.ai chat

Regular chat doesn't read this repo, so you upload the skills once as **Custom
Skills**. (Requires a plan with Skills enabled — Pro/Max/Team/Enterprise — and
the Code Execution / Skills capability turned on.)

**Steps:**
1. Download the bundle Claude sent you: `subzero-design-skills-for-claude-ai.zip`
2. Unzip it — you get **22 individual `.zip` files**, one per skill.
3. In claude.ai: **Settings → Capabilities → Skills → Upload skill**.
4. Upload each skill's `.zip` (upload only the ones you want — you don't need all 22).
5. In any chat, the uploaded skills activate automatically when your request
   matches, exactly like above. You can also say *"use the minimalist-ui skill."*

> Each zip contains the skill folder with `SKILL.md` at its root — that's the
> format claude.ai expects. Upload the per-skill zips, **not** the master archive.

**Regenerate the upload bundles anytime** (from the repo root):
```bash
cd .claude/skills
for d in */; do n="${d%/}"; zip -qr "/tmp/${n}.zip" "$n"; done
```

---

## The 22 skills

### Core taste / anti-generic frontend
- **frontend-design** — distinctive, intentional visual direction; avoids templated defaults. *(Anthropic)*
- **design-taste-frontend** — anti-slop landing pages/portfolios/redesigns; infers direction, audit-first. *(Taste v2)*
- **design-taste-frontend-v1** — original v1 of the above, kept for backward compatibility.
- **high-end-visual-design** — "expensive agency" fonts/spacing/shadows/animation; blocks cheap defaults.
- **gpt-taste** — elite UX + advanced GSAP motion, AIDA structure, editorial typography, bento grids.

### Aesthetic variants
- **minimalist-ui** — clean editorial, warm monochrome, flat bento, muted pastels.
- **industrial-brutalist-ui** — Swiss print × military terminal; rigid grids, extreme type contrast.
- **stitch-design-taste** — generates `DESIGN.md` files enforcing premium anti-generic UI (for Google Stitch).

### Systems & implementation
- **ui-ux-pro-max** — the big one: 50+ styles, 161 palettes, 57 font pairings, 99 UX guidelines, 10 stacks (incl. React Native).
- **ui-styling** — shadcn/ui + Tailwind + accessible components, dark mode, themes.
- **design-system** — 3-layer design tokens (primitive→semantic→component), specs, slide gen.
- **design** — omnibus: logos (55 styles), corporate identity, mockups, banners, icons, social photos.
- **redesign-existing-projects** — audits an existing UI, removes generic AI patterns, upgrades to premium.
- **image-to-code** — generates a design image, analyzes it, then builds the site to match.

### Brand
- **brand** — brand voice, visual identity, messaging frameworks, consistency checks.
- **brandkit** — premium brand-guideline boards, logo systems, identity decks.
- **banner-design** — social/ads/web/print banners, many art directions, AI visuals.

### Image generation (produces images, not code)
- **imagegen-frontend-web** — one horizontal reference image *per section* of a site.
- **imagegen-frontend-mobile** — premium app-native mobile screen concepts in phone mockups.

### Output / print / decks
- **slides** — strategic HTML presentations with Chart.js and design tokens.
- **canvas-design** — original poster/print art as `.png`/`.pdf` (ships with 81 fonts). *(Anthropic)*
- **full-output-enforcement** — bans placeholders/truncation; forces complete code output.

---

## Provenance & safety

- Sources are recorded in `skills-lock.json` (frontend-design → `anthropics/claude-code`;
  ui-* / design* / brand / banner / slides → `nextlevelbuilder/ui-ux-pro-max-skill`;
  the Taste suite → `leonxlnx/taste-skill`). `canvas-design` is Anthropic's example skill.
- These are **third-party skills that run with full agent permissions**. The only
  network calls in their scripts are benign (Pexels stock photos, Google Fonts).
- Update the CLI-managed skills later with: `npx skills update`.
- Some `imagegen-*` / logo features expect an image-gen API key (e.g. Gemini/AI Studio)
  and will no-op without one — the design guidance still applies.

# Web Design Skills

A curated set of web-design and motion skills for client and brand work
(Geo-Nim, Mama Luna, SHUM, O2C). Each subdirectory is a self-contained Claude
Code skill (`SKILL.md` + supporting references) and is auto-discovered when
working in this repo.

## What's installed

### Agency pipeline — from `lotfb86/web-design-skills`
Interconnected design pipeline skills plus a shared reference library.

- `frontend-design` — distinctive, production-grade UI generation
- `responsive-design` — responsive layout patterns
- `web-design-guidelines` — UI code review / accessibility audit
- `theme-factory` — theme system for artifacts (slides, docs, landing pages)
- `website-rebuild` — full multi-phase website rebuild pipeline
- `local-business-rebuild` — rebuild pipeline tuned for local businesses
- `azerbaijan-website-build` — tri-lingual site build for AZ businesses
- `design-system-generator` — generates a structured `DESIGN.md`
- `00-design-references/` — shared library of real brand design systems
  (Stripe, Apple, Linear, Nike, Airbnb, Notion, …). Referenced by the
  pipeline skills above; not a skill itself (no `SKILL.md`).

### HTML artifact design — from `jiji262/claude-design-skill`
- `claude-design` — expert designer for HTML artifacts (decks, landing pages,
  prototypes, posters); strong anti-generic-AI-aesthetics rules.

### Builder stack — from `tenfoldmarc/website-builder-setup`
- `website-builder-setup` — UI/UX Pro Max + Framer Motion + 21st.dev components.

### Spec-first design — from `xiaopu-ai/web-design`
- `web-design` — produces an editable `DESIGN.md` from a PRD / reference URL /
  screenshot before any code.

### 3D, animation & scroll — from `freshtechbro/claudedesignskills`
`aframe-webxr`, `animated-component-libraries`, `animejs`, `babylonjs-engine`,
`barba-js`, `blender-web-pipeline`, `gsap-scrolltrigger`,
`lightweight-3d-effects`, `locomotive-scroll`, `lottie-animations`,
`modern-web-design`, `motion-framer`, `pixijs-2d`, `playcanvas-engine`,
`react-spring-physics`, `react-three-fiber`, `rive-interactive`,
`scroll-reveal-libraries`, `skill-creator`, `spline-interactive`,
`substance-3d-texturing`, `threejs-webgl`, `web3d-integration-patterns`.

## Not included (and why)

- **anthropics/claude-code `frontend-design` plugin** — the official skill is
  already available in the environment.
- **travisvn/awesome-claude-skills**, **ComposioHQ/awesome-claude-skills** —
  curated directories to browse, not installable skills.

Each source repo's `LICENSE` (where provided) is retained inside its skill
directory for attribution.

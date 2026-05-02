# SubZero Designer Skills

Skills tailored to designing and refining SubZero's UI. Each is a folder with a `SKILL.md` that Claude Code picks up automatically.

## Roster

### Tokens & themes
- **design-token-sync** — keep `design.md`, `theme.config.js`, `constants/theme.ts`, Tailwind, and `global.css` aligned
- **theme-audit** — find raw hex, inline styles, magic spacing, missing dark variants
- **dark-mode-check** — verify dark/light parity for a screen or component

### Scaffolding
- **screen-scaffold** — new Expo Router screen with ScreenContainer + NativeWind conventions
- **component-scaffold** — new themed primitive in `components/ui/` or feature component in `components/`
- **icon-splash-gen** — regenerate app icon, adaptive icon, splash, favicon
- **tab-bar-designer** — design or modify the bottom tab bar

### States & motion
- **empty-state-designer** — empty/loading/error states with consistent copy
- **loading-skeleton** — skeleton placeholders matching final row shape
- **motion-spec** — durations, easing, gestures via Reanimated

### UX patterns
- **pro-gate-ui** — apply the Free/Pro gating pattern from `design.md`
- **a11y-review** — labels, roles, contrast, tap targets, focus order
- **responsive-layout** — tablet and web breakpoints (react-native-web)

### Design tools (MCP)
- **figma-import** — convert a Figma frame to a SubZero screen/component
- **canva-export** — generate or update a Canva design
- **gamma-deck** — generate a Gamma presentation/document/webpage

### Review
- **design-review** — read-only audit of pending UI changes against `design.md` and the token system

## How they're used

Claude reads the `description` frontmatter in each `SKILL.md` and invokes the matching skill when its triggers are mentioned. Each skill is self-contained — refer to them from CLAUDE.md if you want to bias behavior further.

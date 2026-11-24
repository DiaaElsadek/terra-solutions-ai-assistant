# Visual Direction & Design Decisions — Terra Solutions Assistant

## 1. Visual Direction ("Obsidian Briefing Desk")

Inspired by **Terra Solutions** (`terrasolutions.me` — corporate dark obsidian & gold BPO/CX identity in Egypt serving medical/aesthetic clinics) paired with high-craft enterprise workspace ergonomics (restrained density, clear typographic hierarchy, scannable tables, zero decorative fluff):

- **Core Aesthetic:** Matte Obsidian & Brushed Bronze. Deep ink surfaces (`#0D0B07`, `#161209`, `#221C10`) anchor long call-center shifts comfortably without eye glare, while warm metallic gold (`#CBB36A`, `#D8C088`, `#EAE0C3`) directs attention strictly to brand marks, active states, headings, verified highlights, and primary actions.
- **Explicit Exclusions:** Zero purple/indigo AI gradients, zero glassmorphic rainbow blobs, zero bouncing dot loaders, zero emoji interface icons (Lucide icons exclusively), and zero nested card sprawl.

---

## 2. Color Roles & Semantic Palette

| Token / Role | Hex / Value | Usage |
| --- | --- | --- |
| Primary Surface | `#0D0B07` | App shell, sidebar, canvas backdrop |
| Elevated Surface | `#161209` | Composer container, briefing panels, modals, drawer |
| Interactive Surface | `#221C10` | Active rows, table headers, subtle hover surfaces |
| Primary Gold | `#CBB36A` | Primary CTAs, Terra logo mark, active focus, active border |
| Warm Light Text | `#EAE0C3` | Assistant reading body & high-legibility tabular data |
| Secondary Muted Text | `#CFC5AE` | Supporting metadata, descriptions, placeholders |
| Subdued Bronze | `#9A7E3F` | Section captions, group labels, subtle dividers |
| Semantic `success` | Emerald tint (`emerald-500/12`) | Verified AED prices, confirmed positive availability |
| Semantic `warning` | Amber tint (`amber-500/12`) | Missing data notices, clinic exclusions, verification checks |
| Semantic `danger` | Crimson tint (`red-500/12`) | Contradictory source alerts, prohibited actions, critical restrictions |
| Semantic `info` | Sky tint (`sky-500/12`) | Medical specialist referral guidance, contextual instructions |

---

## 3. Typography & Bilingual Hierarchy

- **Fonts:** `Inter` (`--font-sans`) for crisp bilingual reading and UI controls; `Space Grotesk` (`--font-display`) for section headings, product names, and tabular metrics.
- **Bilingual RTL/LTR Rules:**
  - Assistant responses automatically apply `dir="rtl"` for Arabic, `dir="ltr"` for English, and `dir="auto"` for mixed turns.
  - Logical CSS spacing (`ps-*`, `pe-*`, `ms-*`, `me-*`, `text-start`, `text-end`, `border-s-*`) ensures identical visual polish in Arabic and English without hardcoded left/right shifts.
  - Numbers, prices (`AED`), and dosages use `font-mono tabular-nums` for vertical table scanning during calls.

---

## 4. Layout & Workspace Architecture

1. **Sidebar (`w-72` Desktop / Slide-Over Mobile):** Clean obsidian panel anchored with the SVG Terra Solutions wordmark (`Terra Assistant`), full-width primary **New Chat** button, shortcut-indexed search (`/`), subtle date-grouped history rows (`Today`, `Yesterday`, `Previous 7 Days`), accessible inline rename/delete controls, and local session footer.
2. **Main Header (`h-14`):** Shows expand button when collapsed, compact Terra mark, active conversation title, quiet **Internal Knowledge** pill, **Knowledge Catalog** drawer trigger, and **Clear Chat** action — zero AI provider/model clutter.
3. **Reading Canvas (`max-w-[50rem]`):**
   - Employee turns appear right-aligned cleanly in compact `#CBB36A` gold-ink pills.
   - **Terra Assistant** responses adopt a clean **editorial briefing layout** (`max-w-none` across the reading column with a subtle gold left indicator bar, crisp Lucide icon header, restrained metric tiles, hairline comparison tables, and a **collapsible Sources tray** showing exact sheet + Excel cell coordinates + direct Google Sheets deep link + live cell inspector).
4. **Grounded Composer:** Docked cleanly at bottom (`bg-background/95`), rounded-xl `#161209` container, auto-expanding multiline textarea with Arabic/English bilingual placeholder, keyboard shortcut hint (`Enter` send / `Shift+Enter` newline), and calm Stop/Send control.

---

## 5. Motion Choreography & Accessibility

- **Durations:** Micro-presses `120ms`; state transitions & message fade-in `180ms` (`cubic-bezier(0.22, 1, 0.36, 1)`); Knowledge Catalog drawer transition `260ms`.
- **`prefers-reduced-motion`:** All non-essential transitions and subtle loading shimmer bars disable automatically via CSS media query.
- **Contrast & Keyboard:** Visible `2px` `--ring` focus outlines on all interactive controls, semantic `<header>`, `<main>`, `<aside>`, `<nav>`, `aria-live="polite"` log regions, and non-color-only status icons (`CheckCircle2`, `AlertTriangle`, `ShieldAlert`, `Info`).


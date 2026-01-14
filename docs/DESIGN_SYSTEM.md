# Design System: Thalamus Glassmorphism

**Scope:** UI/UX Standards  
**Theme:** "Deep Space" / "Cyber-Physical"

## 1. Philosophy
The design system reflects the **Sophia Code** ethos: transparency, depth, and structural integrity. The "Glass" aesthetic is not just stylistic; it represents the transparency of the governance layer overlaying the "Deep Space" of the underlying protocol.

## 2. Color Palette

### Base Layers
| Token | Hex Value | Usage |
|-------|-----------|-------|
| `bg-background` | `#0A0E27` | Main application background (Deep Space). |
| `bg-glass-surface` | `rgba(255, 255, 255, 0.05)` | Card backgrounds, panels. |
| `border-glass-border` | `rgba(255, 255, 255, 0.1)` | Subtle defining edges. |

### Accents & Semantics
| Token | Hex Value | Usage |
|-------|-----------|-------|
| `text-accent` | `#00D9FF` | Primary actions, verified badges, active states. |
| `text-green-400` | `#4ADE80` | High Trust Score (>90), Success. |
| `text-yellow-400` | `#FACC15` | Medium Trust Score (70-89), Warning. |
| `text-red-400` | `#F87171` | Low Trust Score (<70), Danger, Critical Alerts. |

## 3. Typography
**Font Family:** Inter (`sans-serif`)

- **Headings:** Bold, often used with `bg-clip-text` and gradients.
- **Body:** Regular/Medium. High contrast for readability against dark backgrounds.
- **Monospace:** Used for Hash IDs, Code Snippets (Consolas/Monaco).

## 4. Component Library

### GlassCard
The fundamental building block.
- **Backdrop Blur:** `12px` (Standard), `24px` (Overlay/Modal).
- **Border:** 1px solid white at 10% opacity.
- **Hover:** Slight scale (`scale-[1.01]`) and brightness increase (`bg-white/8`).

### Buttons
- **Primary:** Glass background, Accent border, Hover glow.
- **Secondary:** Transparent, muted text, white hover.

### Trust Indicators
- **Score:** Numeric percentage with color coding.
- **Verified:** Checkmark icon in Accent color.

## 5. Layout Grid
- **Desktop:** 12-column equivalent (Flex/Grid). Max-width `1280px`.
- **Mobile:** Single column, 100% width cards. `px-4` margins.

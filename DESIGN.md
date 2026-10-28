# Design System: Hongo Study (日本語スタディ)

## 1. Visual Theme & Atmosphere
A restrained, contemplative Japanese editorial atmosphere designed for high-focus language acquisition. The spatial density is **Balanced Academic (Density 5)**, avoiding both clutter and frivolous emptiness. The layout uses **Asymmetric Tension (Variance 7)** — pairing bold kanji glyphs against structured Latin typography, drawing inspiration from contemporary Tokyo print design and minimalist stationery. Motion is **Subtle & Tactile (Motion 6)** with spring-damped physics for card flipping and micro-press states.

- **Vibe:** Clean, tangible, contemplative, modern-Kyoto aesthetic
- **Tone:** Encouraging, scholarly, clear, devoid of anime tropes or AI cliches

---

## 2. Color Palette & Roles

| Semantic Role | Token Name | Hex Code | Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Light** | `washi-paper` | `#FAF8F5` | Warm, non-fatiguing paper backdrop (Light mode) |
| **Canvas Dark** | `sumi-canvas` | `#121316` | Deep Japanese soot-black foundation (Dark mode) |
| **Surface Light** | `pure-surface` | `#FFFFFF` | Elevated cards, dialogs, inputs |
| **Surface Dark** | `sumi-surface` | `#1A1C22` | Dark mode container and module background |
| **Primary Accent** | `torii-red` | `#D33827` | Single intentional accent for CTAs, kanji badges, active state |
| **Accent Wash** | `sakura-wash` | `#FCEEEF` | Subtle crimson background tint for badges & formula boxes |
| **Accent Dark Wash**| `sakura-dark` | `#2D191D` | Crimson background tint in dark mode |
| **Text Primary** | `sumi-ink` | `#191A1E` | High-contrast body & header text |
| **Text Muted** | `slate-fog` | `#64748B` | Supporting explanations, romaji subtitles, metadata |
| **Text Dark Mode** | `moon-white` | `#EDF1F5` | Primary text on dark backgrounds |
| **Structural Border**| `whisper-line` | `rgba(226, 232, 240, 0.8)` | Subtle 1px framing lines |
| **Success Feedback**| `matcha-green` | `#2E7D47` | Correct answer highlight, mastered state |

> **Banned:** No AI purple/blue neon glows. No saturated gradient text. No pure pitch-black (`#000000`).

---

## 3. Typographic Architecture

Bilingual typography pairing authentic Japanese character anatomy with clean European geometric proportions:

- **Kanji & Display Headlines:** `'Shippori Mincho', 'Zen Kaku Gothic New', serif`
  - High-agency Japanese typeface with authentic brush-cut stroke terminations. Used for kanji focal points, chapter titles, and hero callouts.
- **UI & Latin Body:** `'Plus Jakarta Sans', system-ui, sans-serif`
  - Crisp geometric sans-serif for Indonesian explanations, menu items, button labels, and descriptions. Max line-length: `65ch`.
- **Furigana & Pronunciation (`<ruby>`, `<rt>`):**
  - Set to `0.55em`, positioned with zero baseline distortion, colored in `slate-fog` for low cognitive friction.
- **Metadata, Romaji & Formulas:** `'JetBrains Mono', monospace`
  - Applied to romaji transcriptions, grammar formulas (`A は B です`), and question counters.
- **Banned:** `Inter`, `Times New Roman`, `Georgia`, system default Chinese fallbacks (SimSun/PingFang) for Japanese kanji.

---

## 4. Component Stylings

### Buttons
- **Primary:** Background `torii-red` (`#D33827`), text `white`, rounded `9999px` (pill) or `0.875rem`. Tactile push feedback via `:active { transform: translateY(1px); }`. No neon drop shadows.
- **Secondary / Ghost:** 1px border `whisper-line`, surface `white`, hover border `torii-red` with subtle tint.
- **Quiz Options:** Minimum `48px` touch height. Left-aligned label with prominent monospace key index (`A`, `B`, `C`, `D`). On hover: `2px` border shift, on select: solid `sakura-wash` fill with `torii-red` indicator.

### Cards & Flashcards
- **Bento & Feature Cards:** Rounded corners (`1.25rem` / `20px`), subtle border (`1px solid #E2E8F0`), flat elevation with smooth hover transform (`translateY(-3px)`).
- **Kanji Focus Card:** Asymmetric character highlight; large display kanji (`text-7xl` to `text-8xl`) with radical breakdown and kana stroke annotations.
- **Vocabulary Rows & Tables:** Zebra-free, clean hairline dividers (`1px solid #F1F5F9`), interactive row highlight with left indicator bar on hover.

### Form Inputs & Search
- Standard label above input, rounded `0.875rem`, border `#CBD5E1`.
- Focus ring: `2px solid #D33827` with 0px blur ring (clean architectural line, no fuzzy glow).

---

## 5. Layout Principles

- **No Generic 3-Equal Cards:** Feature rows use asymmetric Bento grids (1 wide anchor module + 2 stacked utility modules) to establish clear reading hierarchy.
- **Strict Mobile Collapse:** All multi-column grids collapse to clean single-column below `768px` (`md`).
- **Touch Ergonomics:** All touch targets maintain at least `44px` height with generous padding.
- **Spatial Separation:** No elements overlap. Clear negative space (`clamp(2rem, 5vw, 5rem)`) between content sections.
- **Full Viewport Handling:** Use `min-h-[100dvh]` rather than `h-screen` to prevent iOS mobile viewport shift.

---

## 6. Motion & Micro-Interactions

- **Spring-Damped Transitions:** `cubic-bezier(0.16, 1, 0.3, 1)` for snappy yet weighted interactions.
- **Card Hover:** Subtle translate `-2px` to `-4px` with box-shadow dissipation (`0 12px 24px -6px rgba(25, 26, 30, 0.08)`).
- **Furigana Toggle:** Instant opacity switch (`transition: opacity 0.15s ease`) without re-flowing layout dimensions.
- **Performance:** Transitions strictly bound to `transform` and `opacity`.

---

## 7. Anti-Patterns (Banned AI Slop)

1. **No Emojis** as UI iconography — use authentic Japanese kanji glyphs (e.g. `問` for quiz, `単` for vocab, `文` for grammar) or clean SVG icons.
2. **No Generic Blue/Purple Gradients** — stick strictly to the calibrated Washi & Torii Red palette.
3. **No 3-Column Identical Feature Grids** — break uniformity with visual hierarchy.
4. **No Fabricated Statistics** — removed fake `100% Akurasi` or arbitrary percentages.
5. **No AI Copywriting Buzzwords** — avoid "Unleash", "Elevate", "Next-gen"; use concise, helpful Indonesian instructional text.
6. **No Pure Black (`#000000`)** — always use deep charcoal (`#121316` / `#191A1E`).


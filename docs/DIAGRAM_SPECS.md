# Diagram Specifications

Use these specs to create diagrams in Eraser.io (or any diagramming tool). These are **diagram descriptions**, not image generation prompts.

---

## Brand / Style Guide

- **Background:** Dark (#0A0E27) or white
- **Accent color:** #00D9FF (cyan)
- **Text:** High contrast, clean sans-serif
- **Style:** Minimal, professional, no clip art

---

## 1. Three-Layer Architecture

**Purpose:** Show authority separated from labor

```
┌─────────────────────────────────────────────────────────────┐
│                        COGNEXA                              │
│                   (System of Thought)                       │
│  • Artifact lifecycle    • Intents, Gates, Contracts        │
│  • Transition rules      • Provable outcomes                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        SOPHIA                               │
│                  (Governance Authority)                     │
│  • Enforces gates        • Verifies intent                  │
│  • Locks artifacts       • Escalates to humans              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXECUTION ENGINES                         │
│                       (The Labor)                           │
│  • UI / CLI / Agents     • Runs AFTER approval              │
│  • Produces outputs      • Always subordinate               │
└─────────────────────────────────────────────────────────────┘
```

**Key callout:** Arrow labels should say "governs" not "calls"

---

## 2. Artifact Lifecycle

**Purpose:** Show the governed flow from idea to outcome

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  INTENT  │───▶│   GATE   │───▶│ CONTRACT │───▶│EXECUTION │───▶│  VERIFY  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │               │
     ▼               ▼               ▼               ▼               ▼
  "What &         "May we        "Terms of       "The work      "Did it
   Why?"         proceed?"       the work"       happens"       match?"
```

**Key callout:** Each transition requires explicit approval

---

## 3. Problem vs. Solution (Side-by-Side)

**Purpose:** Contrast unverified AI work with governed execution

| Unverifiable Work | Governed Execution |
|-------------------|-------------------|
| Intent implicit | Intent = artifact |
| Decisions undocumented | Decision points explicit |
| Assumptions hidden | Constraints enforceable |
| No audit trail | Full traceability |
| "The model said so" | Provable chain |

**Visual suggestion:** Two panels, left = chaotic/scattered nodes, right = clean linear flow

---

## 4. Community → Sophia → Implementation

**Purpose:** Show how the open commons feeds enterprise use

```
┌─────────────────────────────────────────────┐
│          COGNEXA COMMUNITY                  │
│            (Open Commons)                   │
│   Reusable artifacts • Public review        │
│   Templates • Standards • Anti-patterns     │
└─────────────────────────────────────────────┘
                    │
                    │ "shared starting points"
                    ▼
┌─────────────────────────────────────────────┐
│              SOPHIA                         │
│       (Local / Enterprise)                  │
│   Enforces locally • Adds org policy        │
│   Audits • Escalates • Adapts               │
└─────────────────────────────────────────────┘
                    │
                    │ "governs execution"
                    ▼
┌─────────────────────────────────────────────┐
│        LOCAL IMPLEMENTATIONS                │
│   Teams • Agents • CI/CD • Tools            │
│   Work only after approval                  │
└─────────────────────────────────────────────┘
```

---

## 5. Gate Enforcement (Zero Trust Example)

**Purpose:** Show how a gate becomes a security control

```
┌──────────────┐
│ User Action  │  (e.g., Copy Code)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    GATE      │  "Acknowledge risk?"
│   (Sophia)   │
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌──────┐ ┌──────┐
│ALLOW │ │BLOCK │
└──────┘ └──────┘
   │
   ▼
┌──────────────┐
│   RECORD     │  Decision logged to Knowledge Fabric
└──────────────┘
```

**Key callout:** "Friction is a control"

---

## 6. Artifact Taxonomy (2×2)

**Purpose:** Show what artifacts live in the community

```
┌─────────────────────┬─────────────────────┐
│      INTENTS        │       GATES         │
│  Frame work before  │  Decision points    │
│  execution begins   │  that must pass     │
├─────────────────────┼─────────────────────┤
│     CONTRACTS       │    STANDARDS &      │
│  Terms of the work  │   ANTI-PATTERNS     │
│  PRDs, TRDs, etc.   │  Lessons learned    │
└─────────────────────┴─────────────────────┘
```

---

## Usage Notes

1. **Eraser.io** is best for flowcharts and architecture diagrams
2. For banners/social images with mascots, use Figma or an image tool
3. Export at 2x for crisp GitHub rendering
4. Use PNG with transparent or dark background

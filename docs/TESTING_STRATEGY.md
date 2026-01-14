# Testing Strategy

**Objective:** Ensure high reliability and regression resistance for the Sophia Code Community interface.

## 1. Testing Pyramid

### Level 1: Static Analysis (Pre-commit)
- **Tool:** TypeScript + ESLint
- **Scope:** Type correctness, syntax errors, unused variables, hook rules.
- **Coverage:** 100% of files.

### Level 2: Component Unit Tests (Recommended)
- **Tool:** Vitest + React Testing Library
- **Scope:** Individual components (`GlassCard`, `ArtifactCard`).
- **Focus:**
    - Rendering correctness.
    - Props verification.
    - Conditional logic (e.g., showing "Verified" badge).
    - Event handling (e.g., clicking "Copy" triggers callback).

### Level 3: Integration Tests
- **Tool:** Vitest
- **Scope:** Feature flows (`App.tsx` integration).
- **Focus:**
    - Modal interactions (Zero Trust Guardrail flow).
    - Data flow from Mock Data to UI.

### Level 4: End-to-End (E2E) Tests (Future)
- **Tool:** Playwright or Cypress
- **Scope:** Critical User Journeys (CUJs).
- **Scenarios:**
    1.  User loads dashboard.
    2.  User filters artifacts.
    3.  User clicks "Copy" -> Warning Modal appears -> User confirms.
    4.  Clipboard content verified.

## 2. Test Plan for MVP

| Feature | Test Case | Type | Priority |
|---------|-----------|------|----------|
| **Rendering** | App loads without crashing | Integration | P0 |
| **Data Display** | Artifacts render correct titles/scores | Unit | P0 |
| **Security** | Copy button triggers Warning Modal | Integration | P0 |
| **Design** | Layout is responsive (mobile/desktop) | Manual | P1 |

## 3. Running Tests (Future)
*Pending implementation of Vitest*

```bash
npm run test        # Run unit/integration tests
npm run test:ui     # Open test UI
npm run test:coverage # Generate coverage report
```

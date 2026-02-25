# Sophia v2 — Output App Quality Standards

## Purpose

This document defines the quality standards that all apps built by Sophia must meet. These standards are enforced through governance policies evaluated at sprint completion and final acceptance gates.

The goal: every app Sophia builds should look and feel like it was produced by a Fortune 500 engineering team.

---

## Design System Requirements

### Mandatory Design System

Every app MUST use a declared design system. Ad-hoc styling is a governance violation.

**Supported Design Systems (Phase 1):**

| System | Framework | When to Use |
|--------|-----------|-------------|
| shadcn/ui | React/Next.js | Default for React apps |
| Radix UI | React/Next.js | When more primitive control needed |
| Material UI | React | When Material Design is specified |
| Chakra UI | React | When rapid prototyping is priority |

The design system is declared in `requirements.yaml` under `quality.design_system` and enforced from scaffold time.

### Design System Enforcement Rules

1. **No inline styles** — All styling must use the declared system's patterns (Tailwind classes for shadcn, styled props for Chakra, etc.)
2. **No custom colors** — All colors must come from the design system's theme/palette
3. **No magic numbers** — Spacing, sizing, and typography must use design system tokens
4. **No direct DOM manipulation** — All UI changes through component props and state
5. **Component reuse** — If a design system component exists for the pattern, use it. Don't build custom.

### Policy Check

```yaml
# policies/ui-standards.yaml
name: ui-standards
description: Enforce design system adherence in built apps
severity: error
rules:
  - id: no-inline-styles
    description: No inline style attributes in JSX/TSX
    pattern: 'style=\{.*\}'
    file_types: [tsx, jsx]
    on_violation: error

  - id: no-hex-colors
    description: No hardcoded hex/rgb colors outside theme
    pattern: '#[0-9a-fA-F]{3,8}|rgb\(|rgba\('
    file_types: [tsx, jsx, css]
    exclude: ['tailwind.config.*', 'theme.*', 'globals.css']
    on_violation: error

  - id: no-magic-spacing
    description: No hardcoded pixel values for spacing
    pattern: 'margin:\s*\d+px|padding:\s*\d+px|gap:\s*\d+px'
    file_types: [tsx, jsx, css]
    exclude: ['globals.css']
    on_violation: warning

  - id: design-system-imports
    description: UI components must import from design system
    check: component_imports_from_design_system
    on_violation: error
```

---

## Component Quality Requirements

### Every View Must Include

| State | Description | Required? |
|-------|-------------|-----------|
| **Default** | Normal state with data | Yes |
| **Loading** | Skeleton/spinner while data fetches | Yes |
| **Empty** | No data available (not an error) | Yes |
| **Error** | Something went wrong | Yes |
| **Partial** | Some data loaded, some failed | Recommended |
| **Offline** | No network connection (if applicable) | If PWA |

### Policy Check

The Reviewer agent checks at sprint boundary that every data-fetching component handles all required states. Missing states are flagged as errors.

```typescript
// GOOD: All states handled
export function TaskList() {
  const { data, isLoading, error } = useTasks();

  if (isLoading) return <TaskListSkeleton />;
  if (error) return <ErrorState message="Failed to load tasks" retry={refetch} />;
  if (data.length === 0) return <EmptyState icon={TaskIcon} message="No tasks yet" action={{ label: "Create task", onClick: onCreateTask }} />;

  return <TaskGrid tasks={data} />;
}

// BAD: Only handles happy path
export function TaskList() {
  const { data } = useTasks();
  return <TaskGrid tasks={data} />;  // Crashes on undefined, no loading, no empty
}
```

---

## Responsive Design

### Breakpoints

All apps must be responsive across three breakpoints minimum:

| Breakpoint | Min Width | Target |
|-----------|-----------|--------|
| Mobile | 0px | Phone portrait |
| Tablet | 768px | Tablet portrait / phone landscape |
| Desktop | 1024px | Desktop / laptop |

### Responsive Requirements

1. **No horizontal scroll** on any breakpoint
2. **Touch targets** minimum 44x44px on mobile
3. **Navigation** adapts (hamburger menu on mobile, sidebar on desktop)
4. **Tables** become cards or scrollable on mobile
5. **Forms** stack vertically on mobile
6. **Images** are responsive (next/image or equivalent)
7. **Typography** scales appropriately (not just smaller)

### Policy Check

```yaml
rules:
  - id: responsive-meta
    description: Viewport meta tag must be present
    check: html_has_viewport_meta
    on_violation: error

  - id: responsive-images
    description: Images must use responsive patterns
    pattern: '<img(?!.*(?:next/image|responsive|srcSet))'
    file_types: [tsx, jsx]
    on_violation: warning
```

### E2E Responsive Testing

Playwright tests run at all three breakpoints:

```typescript
const viewports = [
  { width: 375, height: 812, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1440, height: 900, name: 'desktop' },
];

for (const vp of viewports) {
  test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('homepage renders correctly', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('main')).toBeVisible();
      // No horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(vp.width);
    });
  });
}
```

---

## Accessibility (WCAG AA)

### Mandatory Requirements

| Criterion | Description | How Enforced |
|-----------|-------------|--------------|
| **1.1.1** | All images have alt text | Policy check + axe-core |
| **1.3.1** | Semantic HTML (headings, landmarks, lists) | axe-core audit |
| **1.4.3** | Color contrast ratio >= 4.5:1 (text), 3:1 (large text) | axe-core audit |
| **1.4.4** | Text resizable to 200% without loss | E2E viewport test |
| **2.1.1** | All functionality keyboard accessible | E2E keyboard navigation test |
| **2.4.1** | Skip navigation link present | Policy check |
| **2.4.2** | Pages have descriptive titles | Policy check |
| **2.4.7** | Focus indicator visible | axe-core + visual check |
| **3.1.1** | Page language declared | Policy check |
| **3.3.1** | Error identification (form validation) | Component state check |
| **3.3.2** | Labels for form inputs | axe-core audit |
| **4.1.2** | ARIA roles correct | axe-core audit |

### Enforcement

1. **Build time**: Builder agent uses semantic HTML and ARIA attributes by default
2. **Sprint review**: Reviewer agent checks for common a11y issues
3. **Final acceptance**: Full axe-core audit on every page at every breakpoint

### Keyboard Navigation Test

```typescript
test('all interactive elements reachable by keyboard', async ({ page }) => {
  await page.goto('/');

  // Tab through all interactive elements
  const interactive = await page.locator(
    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ).all();

  for (let i = 0; i < interactive.length; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName + (el?.id ? '#' + el.id : '');
    });
    // Verify focus is visible and on an interactive element
    expect(focused).not.toBe('BODY');
  }
});
```

---

## Performance

### Lighthouse Targets

| Category | Minimum Score | Target Score |
|----------|:------------:|:------------:|
| Performance | 85 | 90+ |
| Accessibility | 90 | 95+ |
| Best Practices | 90 | 95+ |
| SEO | 85 | 90+ |

### Performance Rules

1. **No unoptimized images** — Use next/image or equivalent with proper sizing
2. **No render-blocking resources** — CSS and JS appropriately loaded
3. **Code splitting** — Route-based at minimum
4. **Caching headers** — Static assets cached appropriately
5. **No layout shifts** — CLS < 0.1 (explicit dimensions on images, skeleton loaders)
6. **Fast interaction** — INP < 200ms (no blocking main thread)

### Bundle Size Policy

```yaml
rules:
  - id: bundle-size
    description: JavaScript bundle must not exceed threshold
    check: bundle_size_check
    thresholds:
      initial_js: 200kb    # gzipped
      initial_css: 50kb    # gzipped
      per_route_js: 100kb  # gzipped per lazy-loaded route
    on_violation: warning   # warn, not block (optimization is iterative)
```

---

## Error Handling UX

### User-Facing Errors Must Include

1. **What happened** — Clear, non-technical description
2. **What the user can do** — Actionable next step (retry, contact support, go back)
3. **Error identity** — A reference code for support/debugging (not a stack trace)

### Error Component Pattern

```typescript
interface ErrorStateProps {
  title?: string;           // Default: "Something went wrong"
  message: string;          // What happened
  action?: {
    label: string;          // "Try again", "Go back", etc.
    onClick: () => void;
  };
  errorCode?: string;       // Reference code for debugging
}

// Usage
<ErrorState
  message="We couldn't load your tasks. This might be a temporary issue."
  action={{ label: "Try again", onClick: refetch }}
  errorCode="TASK-LOAD-001"
/>
```

### What Users Must NOT See

- Stack traces
- Internal error messages (e.g., "ECONNREFUSED")
- Database errors
- Raw HTTP status codes without context
- Empty pages with no explanation

---

## Form Standards

### Every Form Must Include

1. **Labels** for every input (visible, not just placeholder)
2. **Validation** with inline error messages
3. **Submit button** with loading state during submission
4. **Error summary** at form top when server-side validation fails
5. **Success feedback** after successful submission (toast, redirect, or inline)
6. **Keyboard support** — form submits on Enter, focus moves logically

### Form Validation Pattern

```typescript
// Client-side with immediate feedback
<FormField
  name="email"
  label="Email address"
  type="email"
  required
  error={errors.email?.message}    // Shows inline error
  placeholder="you@example.com"
/>

// NOT this:
<input type="email" placeholder="Email" />  // No label, no error, placeholder as label
```

---

## Visual Consistency Checklist

Applied by the Reviewer agent at sprint boundary:

- [ ] All pages use the same layout structure (sidebar, header, content area)
- [ ] Typography hierarchy is consistent (h1-h6 sizes, weights, colors)
- [ ] Button styles are consistent (primary, secondary, ghost, destructive)
- [ ] Spacing between sections is consistent (uses design system tokens)
- [ ] Color usage is consistent (same semantic colors for same purposes)
- [ ] Icon style is consistent (same icon library throughout)
- [ ] Loading patterns are consistent (same skeleton/spinner approach)
- [ ] Error patterns are consistent (same error component/format)
- [ ] Toast/notification patterns are consistent
- [ ] Modal/dialog patterns are consistent

---

## Quality Gate Summary

| Gate | Quality Checks | Blocking? |
|------|---------------|-----------|
| **Sprint Completion** | Design system adherence, component states, responsive basics, a11y basics | Yes |
| **Final Acceptance** | Full Lighthouse audit, full a11y audit, E2E at all breakpoints, visual consistency, security scan | Yes |

Any quality check failure at Final Acceptance blocks delivery and creates an escalation with specific findings and remediation guidance.

# Contributing Guidelines

Thank you for your interest in contributing to the **Sophia Code Community**. As a Thalamus Enterprise Standard project, we maintain strict guidelines to ensure security, stability, and code quality.

## 1. Development Process

### Branching Strategy
We follow a simplified **Trunk-Based Development** workflow:

- `main`: Production-ready code. Protected.
- `feature/description`: For new features (e.g., `feature/governance-voting`).
- `fix/issue-id`: For bug fixes (e.g., `fix/header-alignment`).
- `chore/description`: For maintenance (e.g., `chore/dependency-updates`).

### Pull Request Lifecycle
1.  Create a branch from `main`.
2.  Implement changes ensuring strict type safety.
3.  Run local verification (`npm run build`).
4.  Open PR with the **PR Template** filled out.
5.  Require **2 approvals** from Core Maintainers.
6.  Squash and merge.

## 2. Code Standards

### TypeScript
- **No `any`**: Explicitly define types or use `unknown` with guards.
- **Interfaces over Types**: Use `interface` for object definitions for better error messages and extensibility.
- **Strict Mode**: `strict: true` must remain enabled in `tsconfig.json`.

### React & Hooks
- **Functional Components**: Use `React.FC` or typed props patterns.
- **Custom Hooks**: Encapsulate logic in `src/hooks`. UI components should primarily handle rendering.
- **Prop Drilling**: Avoid >2 levels. Use Composition or Context/Zustand.

### Styling (Tailwind)
- Use standard spacing tokens (e.g., `p-4`, not `p-[17px]`).
- Use configured colors (`bg-background`, `text-accent`) rather than hex codes.
- Extract complex component classes into smaller components, not `@apply` (keep CSS minimal).

## 3. Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests or correcting existing tests
- `chore:` Changes to the build process or auxiliary tools

**Example:** `feat(artifact): add trust score visualization`

## 4. Definition of Done (DoD)

- [ ] Builds without warnings.
- [ ] No strict type errors.
- [ ] UI matches Design System specs (Glassmorphism).
- [ ] Sensitive actions include "Zero Trust" guardrails.
- [ ] Documentation updated if applicable.

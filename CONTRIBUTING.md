# Contributing to Cognexa

Thank you for your interest in contributing to Cognexa. This project is more than a codebase; it is a reference implementation for a new standard of governed, AI-assisted work. As such, we adhere to a strict philosophy and a disciplined development process.

## 1. The Core Philosophy: Correctness Over Speed

Cognexa does not optimize for speed alone. **It optimizes for correctness, clarity, and defensibility.**

We believe that the current "move fast and break things" approach is incompatible with high-assurance systems. Contributions should reflect this principle. A change that makes the system faster but less auditable is a regression. A change that introduces "magic" or removes explicit user intent will be rejected. We are building a system to prevent accidental progress.

## 2. Development Process

### Branching Strategy
We follow a simplified **Trunk-Based Development** workflow:

- `main`: Production-ready code. Protected.
- `feature/description`: For new features (e.g., `feature/artifact-visualization`).
- `fix/issue-id`: For bug fixes (e.g., `fix/gate-enforcement-logic`).
- `chore/description`: For maintenance (e.g., `chore/update-dependencies`).

### Pull Request Lifecycle
1.  Create a branch from `main`.
2.  Implement changes, adhering to the code standards below.
3.  Ensure the project builds without errors (`npm run build`).
4.  Open a Pull Request, filling out the PR template completely. Clearly state the **intent** of your change.
5.  All PRs require **2 approvals** from Core Maintainers.
6.  Changes are squashed and merged into `main`.

## 3. Code Standards

### TypeScript
- **No `any`**: This is non-negotiable. Use `unknown` with type guards if a type is not known.
- **Interfaces for Artifacts**: Use `interface` for defining the core artifacts (`Intent`, `Gate`, etc.) for extensibility.
- **Strict Mode**: `strict: true` must always be enabled in `tsconfig.json`.

### React & Hooks
- **Functional Components**: All components must be functional components with hooks.
- **Isolate Logic**: Business logic should be encapsulated in custom hooks (`src/hooks`). UI components should be as "dumb" as possible, focusing on rendering and user events.
- **No Prop Drilling**: Avoid passing props more than 2 levels deep. Use Composition, Context, or a state management library (Zustand) for shared state.

### Styling (Tailwind)
- **Use Tokens**: All styling must use the pre-defined tokens in `tailwind.config.js`. Do not use arbitrary values (e.g., `p-[17px]`).
- **No `@apply`**: Do not use `@apply` in CSS files. Build complex styles by creating smaller, composed React components. This keeps our CSS layer minimal and our component layer expressive.

## 4. Commit Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This is essential for our automated changelog generation and versioning.

- `feat:` A new feature that adds value to the end-user.
- `fix:` A bug fix.
- `docs:` Documentation only changes.
- `style:` Changes that do not affect the meaning of the code.
- `refactor:` A code change that neither fixes a bug nor adds a feature.
- `perf:` A code change that improves performance.
- `test:` Adding missing tests or correcting existing tests.
- `chore:` Changes to the build process or auxiliary tools.

**Example:** `feat(governance): implement gate enforcement modal for copy action`

## 5. Definition of Done (DoD)
A contribution is considered "done" only when it meets all of the following criteria:
- [ ] The code builds without warnings or errors.
- [ ] All TypeScript strict checks pass.
- [ ] The UI matches the Design System specifications.
- [ ] Any new governance-related feature is documented in `docs/ARCHITECTURE.md`.
- [ ] The commit messages follow the Conventional Commits standard.

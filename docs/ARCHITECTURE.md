# Architecture Reference

**Version:** 1.0.0  
**Status:** Approved for MVP  
**Last Updated:** 2024-01-14

## 1. Executive Summary

The **Sophia Code Community** platform is a high-assurance governance interface designed to facilitate the discovery, verification, and usage of cryptographic artifacts (Intents, Gates, Contracts). The system adheres to the **Thalamus Enterprise Standards**, prioritizing security ("Zero Trust"), component modularity, and strict type safety.

## 2. System Overview

### 2.1 High-Level Context
The application serves as the frontend presentation layer for the Sophia Network. It interacts with a mock backend (MVP) which will be replaced by a decentralized registry and a federated GraphQL API in the production phase.

### 2.2 Architectural Pattern
We utilize a **Component-Based Architecture** powered by React 18, leveraging **Atomic Design principles** for UI organization.

- **Presentation Layer:** React + Tailwind CSS (Glassmorphism)
- **Data Layer:** TypeScript Data Models (currently Mock Data, transitioning to TanStack Query)
- **Security Layer:** Client-side "Guardrails" and "Governance Gates"

## 3. Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Core** | React 18 | Industry standard, concurrent rendering capabilities. |
| **Language** | TypeScript 5.x | Strict type safety for financial/governance data. |
| **Build System** | Vite | High-performance dev server and optimized production bundles. |
| **Styling** | Tailwind CSS 3.x | Utility-first, configured for "Deep Space" design tokens. |
| **State** | Local (MVP) -> Zustand | Minimal boilerplate, scalable global state. |
| **Network** | Mock -> TanStack Query | Caching, deduplication, and optimistic updates. |

## 4. Directory Structure Strategy

The codebase follows a `feature-based` grouping combined with strict `layer` separation:

```
src/
├── components/         # View Layer
│   ├── ui/             # Atomic, dumb components (Buttons, Cards)
│   ├── layout/         # Structural components (Shells, Grids)
│   └── features/       # Smart, domain-aware components (ArtifactCard)
├── hooks/              # Logic Layer (Encapsulated behavior)
├── lib/                # Infrastructure Layer (API clients, Utils)
├── store/              # State Layer (Global store definitions)
└── types/              # Domain Layer (Shared Interface Definitions)
```

## 5. Key Design Decisions (ADRs)

### ADR-001: Tailwind for Design System
- **Decision:** Use Tailwind CSS with custom configuration for Thalamus Glassmorphism.
- **Context:** CSS-in-JS adds runtime overhead. Utility classes provide consistency and smaller bundle sizes.
- **Consequence:** Strict adherence to `tailwind.config.js` tokens is required. Magic numbers in classes are forbidden.

### ADR-002: Zero Trust UI Patterns
- **Decision:** Implement explicit friction (modals) before sensitive actions (e.g., Copy Code).
- **Context:** Users must be cognitively aware of security risks when interacting with governance artifacts.
- **Consequence:** "Copy Code" is not immediate; it requires a confirmed intent action.

## 6. Data Flow

1.  **Read:** Component requests data -> Hook (Mock/Query) -> Data Provider -> Component
2.  **Write:** Component triggers action -> Validation Layer -> Mutation Hook -> Optimistic UI Update -> Server Sync

## 7. Scalability & Performance

- **Code Splitting:** Route-based splitting (via React Router/Vite).
- **Asset Optimization:** SVGs for iconography, WebP for future imagery.
- **Render Optimization:** Memoization of expensive governance graph visualizations (future).

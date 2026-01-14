<div align="center">
  <img src="https://github.com/TheMethodArq/sophia-community/assets/1/08658e48-e87f-410a-9d95-4eb84e55e429" alt="Cognexa Logo" width="180" />
  
  <h1>Cognexa</h1>
  <h3>A Cognitive Governance System</h3>

  <p>
    <a href="https://github.com/TheMethodArq/sophia-community/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License" />
    </a>
    <a href="https://github.com/TheMethodArq/sophia-community/blob/main/docs/ARCHITECTURE.md">
      <img src="https://img.shields.io/badge/Thalamus-Enterprise%20Standard-0A0E27?style=flat-square&labelColor=00D9FF&color=0A0E27" alt="Thalamus Enterprise Standard" />
    </a>
    <a href="#">
      <img src="https://img.shields.io/badge/Status-Reference%20Implementation-success?style=flat-square" alt="Status: Reference Implementation" />
    </a>
  </p>
</div>

---

## 1. The Problem: Unverifiable Work in the Age of AI

Modern work is increasingly performed by a mix of humans and AI, but **decisions, intent, and accountability are scattered, implicit, and unverifiable.**

This leads to:
-   **Runaway Scope:** Projects that drift endlessly from their original purpose.
-   **Hallucinated Decisions:** AI-generated work with no traceable justification.
-   **Broken Trust:** Outcomes that cannot be audited, defended, or repeated.

Current AI tooling often collapses three distinct roles into one—deciding what to do, doing the work, and validating the result. This collapse is a recipe for chaos.

## 2. The Solution: Cognexa

**Cognexa** is a cognitive governance system designed to solve this problem. It enforces a governed lifecycle where:
-   **Intent** is explicit.
-   **Decisions** are recorded.
-   **Execution** is constrained.
-   **Outcomes** are provable.

It achieves this by explicitly separating **authority** from **labor**.

### Sophia: The Governance Authority
If Cognexa is the mind, **Sophia** is the faculty of judgment. She lives inside Cognexa and serves as the conservative, decision-making authority. Sophia does not execute work. She governs the conditions under which work is *allowed* to happen by enforcing **Gates** and locking **Intent**.

### Execution Engines: The Labor
Execution engines (CLI tools, IDE agents, human contributors) perform the work, but only *after* Sophia has verified the intent and approved the transition. They are always subordinate to governance.

---

## 3. This Repository: A Reference Implementation

This project is the first open-source reference implementation of a **Cognexa-compliant Execution Engine**. It demonstrates how to build a high-assurance, secure, and scalable AI interface that respects the separation of concerns.

-   **Zero Trust by Default:** The "Security Warning" modal is a direct manifestation of Sophia enforcing a governance gate.
-   **Artifact-Driven:** The UI is built around verifiable artifacts (`Intents`, `Gates`, `Contracts`) with content hashes.
-   **Strict Type Safety:** Full TypeScript integration ensures data contracts are respected from end to end.

---

## 🛠️ Tech Stack

Built on the **Thalamus Enterprise Standard**:

| Layer | Technology |
|-------|------------|
| **Core** | [React 18](https://react.dev/) |
| **Build** | [Vite](https://vitejs.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v3](https://tailwindcss.com/) |
| **Governance** | [Cognexa Framework](docs/ARCHITECTURE.md) |

---

## 🚀 Getting Started

Prerequisites: Node.js 18+

```bash
# 1. Clone the repository
git clone https://github.com/TheMethodArq/sophia-community.git

# 2. Install dependencies (Clean install is required for version integrity)
npm ci

# 3. Start the development server
npm run dev
```

The application will be running at `http://localhost:5173`.

---

## 📚 Documentation

Cognexa demands Fortune 100 grade documentation.

-   **[Architecture Reference](docs/ARCHITECTURE.md)** - The core concepts of Cognexa, Sophia, and Execution Engines.
-   **[Security Policy](SECURITY.md)** - How governance serves as a security control.
-   **[Contributing Guidelines](CONTRIBUTING.md)** - The philosophy and process for contributing.
-   **[Changelog](CHANGELOG.md)** - A record of all notable changes.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  Made with ❤️ by <strong>Thalamus</strong>
</div>


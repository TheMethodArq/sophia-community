# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-01-14

### Changed
- **Major: Strategic Realignment to Cognexa Framework.** The entire project has been rebranded and repositioned as a reference implementation for **Cognexa**, a cognitive governance system. This is a breaking change in philosophy and terminology.
- **`README.md`:** Overhauled to serve as a world-class showcase, explaining the Cognexa/Sophia architecture and mission.
- **`ARCHITECTURE.md`:** Rewritten to detail the three-layer architecture (Cognexa, Sophia, Execution Engines) and the core artifact model.
- **`SECURITY.md`:** Reframed security controls as direct manifestations of Sophia's governance, particularly focusing on Gate Enforcement and Intent Locking.
- **`CONTRIBUTING.md`:** Updated with the core philosophy of "Correctness Over Speed" and stricter guidelines aligned with the Cognexa mission.

### Added
- **Brand Identity:** Created a new logo for Cognexa to serve as the official brand mark.
- **Architectural Diagram:** A new visual asset was created and embedded in the documentation to clearly communicate the system's structure.

---

## [1.0.0] - 2024-01-14

### Added
- **Core Architecture:** Initial project scaffold with React 18, Vite, and TypeScript.
- **Design System:** Thalamus "Deep Space" theme integration with Tailwind CSS.
- **Components:**
    - `GlassCard`: Foundational UI component with blur effects.
    - `ArtifactCard`: Display for Governance Artifacts (Intents, Gates, Contracts).
    - `Layout`: Responsive application shell.
- **Features:**
    - **Zero Trust Guardrails:** Security warning modal workflow for copying code.
    - **Governance Dashboard:** Grid view of artifacts.
- **Data:** Mock data layer with 5 sample governance artifacts.
- **Documentation:** Initial suite of project documentation.
- **License:** MIT License added.
- **Git Repository:** Initialized and published to GitHub.

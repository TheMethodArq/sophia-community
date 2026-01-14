# Security Policy: Governance as a Security Control

## 1. Core Philosophy: Zero Trust through Governance
The security of the Cognexa ecosystem is not based on perimeter defense, but on **provable governance**. We operate under a Zero Trust assumption, where no artifact, user, or execution engine is trusted by default. Verification is explicit, continuous, and enforced by **Sophia**, the system's governance authority.

## 2. Security Controls Enforced by Sophia

Our security posture is a direct manifestation of Sophia's governance. Features that might appear as simple UI friction are, in fact, critical security controls.

### 2.1 Gate Enforcement
- **Risk:** Uncontrolled execution of code, leading to malicious actions or unintended side effects.
- **Control:** **Governance Gates**. Before any execution can occur, specific conditions must be met. The "Security Warning" modal in this reference implementation is an example of Sophia enforcing a gate.
- **Mechanism:** Sophia blocks the transition from the `Contract` phase to the `Execution` phase until the gate's requirements (e.g., user acknowledgement of risk) are met and recorded. This action is auditable.

### 2.2 Intent Locking & Immutability
- **Risk:** Scope creep and malicious code injection during the development lifecycle.
- **Control:** **Locked Intent & Content Hashing**.
- **Mechanism:**
    1.  Sophia locks the `Intent` artifact, preventing changes after approval.
    2.  All subsequent artifacts (like `Contracts`) contain a `contentHash` (SHA-256). Execution engines *must* verify this hash before processing, ensuring the work being done matches the work that was approved.

### 2.3 Dependency Management
- **Risk:** Supply chain attacks via compromised dependencies.
- **Control:** Strict dependency auditing and version locking.
- **Mechanism:**
    - `npm audit` is a required step in the CI pipeline.
    - `package-lock.json` is committed to ensure deterministic, auditable builds. New dependencies require a formal review process.

## 3. Vulnerability Reporting
**Do not open public GitHub issues for security vulnerabilities.**

If you discover a potential security failure in the Cognexa framework or this reference implementation:
1.  Email **security@thalamus.io** (placeholder).
2.  Provide a clear description and a proof-of-concept.
3.  We adhere to a 90-day responsible disclosure window.

## 4. Development Security
- **Secrets:** No secrets are ever to be committed to the repository. Use `.env` files for local development, which are specified in `.gitignore`.
- **Data Integrity:** Mock data (`mockData.ts`) must not contain any personally identifiable information (PII).

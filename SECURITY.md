# Security Policy & Zero Trust Architecture

## 1. Core Philosophy: Zero Trust
The Sophia Code Community platform operates under a **Zero Trust** assumption. No artifact, user, or input is trusted by default. Verification is explicit and continuous.

## 2. Security Controls

### 2.1 Artifact Guardrails
- **Risk:** Malicious code execution or sensitive data exfiltration via copied artifacts.
- **Control:** **Intentional Friction**. Critical actions (like "Copy Code") are intercepted by a governance modal requiring explicit user acknowledgement of risk.
- **Implementation:** `src/App.tsx` handles the `showWarning` state. This logic must NOT be bypassed by generic clipboard libraries.

### 2.2 Content Security
- **Immutability:** All artifacts include a `contentHash` (SHA-256). In production, the client must independently verify that the retrieved content matches this hash before display.
- **Sanitization:** All user-generated text is rendered via React's safe-by-default escaping. Dangerous HTML rendering (`dangerouslySetInnerHTML`) is strictly prohibited.

### 2.3 Dependency Management
- **Audit:** Regular execution of `npm audit`.
- **Locking:** `package-lock.json` is committed to ensure deterministic builds.
- **Minimalism:** Dependencies are scrutinized before addition. We prefer native browser APIs over heavy libraries where possible.

## 3. Vulnerability Reporting
**Do not open public GitHub issues for security vulnerabilities.**

If you discover a potential security failure:
1.  Email **security@thalamus.io** (Mock contact).
2.  Include a proof-of-concept.
3.  We adhere to a 90-day responsible disclosure window.

## 4. Development Security
- **Secrets:** No API keys or secrets are committed to the repository. Use `.env` files (which are git-ignored).
- **Mock Data:** The current `mockData.ts` contains no real personal data (PII).

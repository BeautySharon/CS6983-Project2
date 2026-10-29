# HW3: With-Rules Registration Experiment

This directory preserves the registration frontend generated **with** the team rules in place, and its evaluation.
It is experiment evidence, not the production implementation for issue #6.
The matching without-rules run is in [`../no-rules/`](../no-rules/); the comparison is in [`../comparison.md`](../comparison.md).

- [Test results, prompt, setup and limitations](test-results.md)
- [Unmodified original output](with-rules-v1.zip) — includes the AI's own git history (`.git`); `node_modules/` and `dist/` excluded
- [Original source SHA-256 hashes](baseline-sha256.txt)
- Screenshots: [empty form](empty-form.png), [invalid input](invalid-inputs.png), [success → login](login-redirect.png)

## Setup

| | No rules (#16) | With rules (this run) |
|---|---|---|
| Tool / model | Antigravity IDE, Gemini 3.8 Flash High | Antigravity IDE, Gemini 3.8 Flash High |
| Conversation | fresh | fresh |
| Starting folder | empty | only `AGENTS.md`, `docs/PRD.md`, `docs/mockups/pawtrust-mockup.png` |
| Prompt | brief description | same brief description + one line pointing to the rules (see test-results.md) |

## Reproduce

Extract `with-rules-v1.zip`, then in `with-rules-v1/pawtrust-frontend` run `npm install`, `npm run lint`, `npm test`, `npm run dev`.
No backend is included; the page calls `POST /pawtrust/register` through `apiFetch`.

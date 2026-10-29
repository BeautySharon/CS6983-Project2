# HW3 With-Rules Experiment: First-Output Test Results

Date: October 28, 2026. Generation tool: Antigravity IDE. Model: Gemini 3.8 Flash High.
The generated source was not modified; all checks below ran against the original output.

## Prompt and Baseline

> We're building PawTrust, a pet care platform that connects pet owners with people who can help care for their pets. Please build a frontend registration page for new users. For now, it doesn't need to connect to a real backend.
> Follow AGENTS.md, user story US-1 in docs/PRD.md, and the Register page in docs/mockups/pawtrust-mockup.png.

The first paragraph is identical to the without-rules prompt. The starting folder contained only `AGENTS.md`,
`docs/PRD.md` and `docs/mockups/pawtrust-mockup.png` — no application code.

## What was generated

`pawtrust-frontend/` (Vite + React 19 + Tailwind 3 + react-router-dom 7), 20 files:
`src/pages/RegisterPage.jsx`, `src/pages/LoginPage.jsx`, `src/api/client.js` (`apiFetch`), `src/config.js` (`BASE_URL`),
`src/components/PawLogo.jsx`, ESLint / Vitest config, and two test files.
The model also ran `git init`, created branch `feature/1-register-page`, and committed
`feat(frontend): build user registration page and auth client (#1)`.

## Automated checks

| Command | Result |
|---|---|
| `npm run lint` | passed, 0 problems |
| `npm test` | 2 files, **10 / 10 tests passed** |
| `npm run build` | succeeded |

Generated tests (Vitest + React Testing Library):

- `RegisterPage.test.jsx` (7): renders all fields/labels/roles per mockup; password show/hide; password < 8 chars error;
  select Pet Sitter; successful submit calls `apiFetch('/register', …)` with the right body; 409 "Email already registered"
  shown in an alert; network failure falls back to demo success.
- `api/__tests__/client.test.js` (3): adds `Authorization: Bearer` from `pawtrust.token`; on 401 clears `pawtrust.token`
  and `pawtrust.user`; non-2xx throws with the server's `error` message.

## Findings

1. **Matches the spec.** Fields are exactly US-1 (name, email, password ≥ 8, Owner/Sitter, location, optional bio);
   text, radio buttons and "Login here" link follow the mockup; success redirects to login.
2. **Fake success when the backend is down.** `RegisterPage.jsx` (lines 70–80) treats a network error as success and
   shows "Registration successful", and a test asserts this. Likely caused by "doesn't need to connect to a real backend".
3. **Wrong issue number.** Commit and branch use `#1`; registration is issue #6. AGENTS.md says to ask when no issue
   number is given — the model guessed instead.
4. **Small scope addition.** A styled `LoginPage` was added so the "Login here" link works; its submit does nothing.
5. **Minor config issue.** `eslint.config.js` declares React version `18.3` although React 19 is installed.

## Not covered

Browser screenshots, real backend responses (400/409/500 from a server), keyboard/screen-reader walkthrough,
and mobile viewport were not checked in this run.

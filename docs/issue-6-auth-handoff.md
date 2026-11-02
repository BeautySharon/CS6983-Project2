# Issue #6: authentication frontend

## Scope and design

Implements US-1 and US-2 against the current PRD and Issue #6. Shared visual rules are defined in [`Design.md`](../Design.md), with page composition from `docs/mockups/pawtrust-mockup.png`. Authentication uses the current JWT contract.

The frontend package and build/test/lint configuration make these pages runnable. No backend or database implementation is included. The Tailwind entry contains directives only. `Design.md` and its AGENTS.md entry establish shared styling for this issue and later dashboard work.


## TDD evidence

- Red: 15 behavior tests ran and failed before implementation: missing form controls, routing, and unimplemented transport. Runner and dependencies loaded successfully. `npm run lint` passed.
- A Node 25 native Web Storage conflict was resolved before recording Red. The test command disables Node's experimental storage so jsdom owns browser storage.
- The Red commit intentionally does not build a complete app; it contains the runnable test harness and implementation stubs.
- Red commit: `6b56eb9`. Reproduce with `NODE_OPTIONS=--no-experimental-webstorage npm test`; the final configuration also propagates this option into Vitest workers. This environment compatibility fix is separate from the missing-behavior failures.
- Green: 21 tests pass, including the original 15 and six additional regression checks. `npm run lint` and `npm run build` pass. Added checks cover wrong-role routing, restored sessions, expired-session redirects, malformed login responses, registration validation/conflicts and password visibility.

## Backend handoff

| Request | Expected contract |
| --- | --- |
| `POST /pawtrust/register` | JSON `{name,email,password,userType,location,bio}`; `userType` is `owner` or `sitter`. A JSON 2xx response redirects to login with confirmation. |
| `POST /pawtrust/login` | JSON `{email,password}`; JSON 2xx `{token,user:{_id,name,userType}}`. The client stores only these safe user fields and the token. |
| Errors | Non-2xx JSON `{error: "message"}`. Invalid credentials: 401; duplicate email: 409; validation: 400. |

All requests go through `src/api/client.js`. Authenticated requests attach Bearer JWT. A 401 clears storage and notifies the application router to return to `/`; wrong-password errors remain visible on the login page. Registration does not auto-login. Backend must allow the frontend origin via CORS and enforce authorization itself.

## Acceptance checklist

- [x] Login, register, owner and sitter routes.
- [x] Labeled name, email, password, role, location and optional bio.
- [x] Inline API/network errors; validation and duplicate-submit prevention.
- [x] JWT/session storage and role-based login routing.
- [x] Shared API helper, Bearer header and 401 logout/redirect.
- [x] Protected dashboard placeholders and Logout.
- [x] RTL interaction/validation/redirect tests with mocked fetch.
- [x] Current PRD US-1/US-2, issue criteria and checked-in mockup reviewed; AGENTS conventions followed, with minimal setup exceptions explained above.
- [ ] Teammate review and PR approval. Required before merge.
- [ ] Live backend/database integration with #4/#5. Mocked frontend tests are not database integration or full-product E2E evidence.

## Browser verification

Checked the running application: empty-login validation; a valid-shaped login without a backend shows an error rather than success; `/owner` redirects to login when signed out; registration layout inspected at desktop and 390px width (document width equals viewport width, no horizontal overflow). Browser screenshots are in `docs/evidence/issue-6/`.

The course's backend integration tests, full user-flow E2E tests, shared CI/deployment and partner review remain separate project tasks. This issue provides frontend interaction tests and genuine Red/Green history toward those requirements. Preserve the Red commit in project evidence before any squash merge.

## Dependency purposes

React, React DOM and Router implement pages/navigation; Vite and its React plugin provide build/dev tooling; Tailwind, PostCSS and Autoprefixer implement the existing design. Vitest, jsdom and Testing Library exercise user behavior; ESLint and React/hooks plugins check source. Vitest 4.1.12 replaces initially evaluated v3 because the dependency audit reported vulnerabilities; installation audit reports zero vulnerabilities. Exact resolved versions are recorded in the lockfile.

## Design alignment

Authentication pages follow Design.md: slate wordmark with indigo paw, translucent rounded card, rounded-xl controls, shared focus styles, mockup headings and field order, User Type radios, and example placeholders. Password Show/Hide follows the reference implementation.

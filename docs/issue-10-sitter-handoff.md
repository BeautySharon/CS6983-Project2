# Issue #10 — Sitter dashboard

Implements PRD US-5/US-6 and BR-3/BR-7 using Design.md and the sitter mockup. The page owns API requests through apiFetch; AvailableTasks receives task data, applied IDs and an application callback. App.jsx connects the protected sitter route to the page.

## Behavior

- Three desktop columns, stacked on mobile: Available Tasks, Accepted Tasks, Finished & Reviews.
- Open-task cards show pet type, description, local date/time, duration and location; client-side pagination shows three per page.
- Each task has a labeled optional message (maximum 300 characters). Draft messages survive pagination.
- Apply is disabled while submitting. Successful applications display disabled Applied; existing applications are restored from the server on page load.
- Failed applications preserve the message and display the server error. Refetching reconciles duplicate-application conflicts. An unsuccessful refresh cannot undo a server-confirmed application.
- Initial loading, retry and empty states are explicit. If application history is unavailable, Apply is withheld rather than assuming no prior applications.
- Accepted and Finished & Reviews are layout placeholders for #12 and #13, with no fabricated task or review data.

## API contract to verify with #9

| Request | Expected response |
| --- | --- |
| GET /pawtrust/tasks/available | Array of tasks with string _id and status, plus petType, description, date, duration and location. |
| GET /pawtrust/applications/mine | Array of applications with string taskId. |
| POST /pawtrust/applications/apply | Body { taskId, message }; successful JSON response or 204. Refetch both lists afterward. |

The shared client sends the Bearer token. No sitter identity is sent in the request body. Non-2xx responses use { error }; 401 clears the session and returns to login. The #22 review confirms plain arrays and taskId in application records. Verify serialized IDs and behavior against the live backend.

## Validation

- Red commit 3a52d5b: 14 new failing behavior tests; 21 existing authentication tests passed.
- Final suite: 38 passing tests (17 sitter tests and 21 auth tests). Lint and production build pass.
- Tests cover optional messages, 300-character boundary, pending duplicate protection, 400/403/409 failures, conflict reconciliation, application-history errors, refresh failure, malformed data, filtering, pagination and 401 redirects.
- Browser checks using a separate local fixture API: existing Applied state, draft retention across pages, successful Apply, Applied state after reload, three desktop columns and a 390px single-column layout with no horizontal overflow.
- Browser preview uses disposable fixture data, not MongoDB or real authentication. Live backend integration remains pending #9.

## Screenshots

- [Desktop](evidence/issue-10/sitter-desktop.png)
- [Mobile](evidence/issue-10/sitter-mobile.png)

## Acceptance checklist

- [x] Three-column desktop / single-column mobile layout.
- [x] AvailableTasks with labeled optional message and Apply.
- [x] Already-applied tasks display disabled Applied.
- [x] Empty state: No open tasks right now.
- [x] RTL application-disable test and failure-state tests.
- [x] AGENTS.md, Design.md, issue #10 and linked stories reviewed and followed.
- [ ] Real #9 API integration verified.
- [ ] PR linked to #10 and approved by teammate.

## Branch dependency

Rebased onto the updated authentication foundation at 284ae8a (PR #20), which includes the merged #23 scaffold and Node 22.23.4 configuration. Review against feature/6-auth-pages until #20 merges, then align with main. Preserve both dashboard routes when combining #8 and #10.

## Review follow-up

The PawTrust logo uses React Router Link for navigation without a full-page reload. Component tests render dashboards inside a router. No new dependencies or backend changes.

Integration validation: Node 22.23.4 / npm 10.9.9; clean npm ci, 38 frontend tests, lint and production build passed. Existing screenshots show the unchanged layout; backend integration remains pending.

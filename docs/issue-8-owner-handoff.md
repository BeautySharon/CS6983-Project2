# Issue #8 — Owner dashboard

Implements US-3 and US-4 using `Design.md`, the owner mockup and BR-2. The page owns API calls; `PostTaskForm` and `TaskList` receive callbacks and data. `App.jsx` connects the owner route to the dashboard while preserving authentication and logout.

## Behavior

- Responsive form/list layout, labeled required fields, future date and positive duration validation.
- Submits dates as UTC ISO strings; displays dates in the browser's local timezone.
- Lists tasks newest first, three per page, with status and application count.
- Confirms deletion of open tasks; assigned and finished tasks have no Delete action.
- Refetches after mutations. Failed requests show errors; failed creation preserves input. Pending submissions cannot be duplicated.
- Displays loading, empty and retry states. Task creation resets pagination to the first page.

## API integration

Paths follow issue #7. The response shape below is the frontend expectation to confirm during backend integration:

| Request | Expected result |
| --- | --- |
| `GET /pawtrust/tasks/mine` | An array of task objects for the authenticated owner. |
| `POST /pawtrust/tasks` | Any JSON 2xx response (or 204); then refetch the list. Body: `petType`, `description`, `date`, numeric `duration`, `location`. |
| `DELETE /pawtrust/tasks/:id` | Any JSON 2xx response (or 204); then refetch the list. |

Task fields: `_id`, `petType`, `description`, `date`, `duration`, `location`, `status`, `createdAt`, and nonnegative integer `applicationCount`. The count field is not specified in #7 and needs backend confirmation; missing counts display “Application count unavailable” rather than an invented zero. Pet type options are Dog, Cat, Bird and Other; confirm these values with the backend.

Requests use the shared Bearer-token client; no owner identity is sent in the body. Server ownership enforcement, persistence and live API integration require #7. A 401 uses the existing session-clearing and login redirect behavior.

## Validation

- Red commit `c9b27b4`: eight new behavior tests failed; the existing 21 authentication tests passed.
- Final frontend suite: 34 tests passed, including 13 owner-dashboard tests. Lint and production build passed.
- Browser checks with intercepted API fixtures: login to owner route, newest-first list, pagination, deletion cancellation/confirmation, creation/refetch, and 390px layout without horizontal overflow.
- Browser failure check: unavailable API shows an error and no fabricated task list. No page errors observed.
- These are frontend checks using mocked responses, not backend integration or database E2E tests.

## Screenshots

Screenshots use test fixtures, not production accounts or persisted records.

- [Desktop](evidence/issue-8/owner-desktop.png)
- [Mobile](evidence/issue-8/owner-mobile.png)
- [API unavailable](evidence/issue-8/owner-unavailable.png)

## Acceptance checklist

- [x] Desktop two-column and mobile single-column layout.
- [x] Labeled PostTaskForm, validation and onCreated after successful submission.
- [x] Newest-first TaskList, three per page, Prev / Page x of y / Next.
- [x] Pet type, date, duration, location, status and application count rendering.
- [x] Open-task-only deletion with confirmation.
- [x] RTL form submission and pagination tests.
- [x] AGENTS.md, Design.md, US-3/US-4 and BR-2 followed.
- [ ] Verify the real #7 responses, application counts and persistence.
- [ ] Teammate approval of the linked PR.

## Branch dependency

`feature/8-owner-dashboard` starts from `feature/6-auth-pages` at `b846ad0` (PR #20). Review the #8 changes against that branch while #20 remains unmerged. After #20 is merged, align this branch with main and verify that the PR diff contains only #8 changes before merging.

# Issue #12 — Accepted tasks and completion

## Behavior

- `GET /pawtrust/tasks/accepted` lists only the authenticated sitter's assigned tasks, ordered by date.
- `POST /pawtrust/tasks/:taskId/finish` atomically changes an assigned task to finished. Identity comes from the JWT. Invalid IDs return 400, missing/invalid/expired authentication 401, unauthorized users 403, missing tasks 404, and repeated or concurrent completion 409.
- The Accepted Tasks column follows `Design.md` and the sitter mockup. The completion button disables immediately while submitting. After a successful request, both accepted and finished lists refresh without reloading the page. Failures show an error; conflict responses also refresh the lists.

## Validation

- Backend: 188 tests passed against a separate MongoDB replica-set test database.
- Frontend: 72 tests passed; lint and production build passed.
- Touched task-layer coverage: controller lines 84.61%, branches 83.33%; DAO lines 96.12%, branches 90.9%.
- New tests were run before implementation: missing endpoints caused 11 backend failures; the missing completion button caused three frontend failures.
- Browser verification with local test accounts: owner creates task, two sitters apply, owner selects one, selected sitter finishes, owner submits a review, sitter sees the rating. Assignment and completion survive page refresh.
- One initial full backend run failed in the existing apply-versus-accept race test (expected 200, received 400). Two subsequent full runs passed. This intermittent result remains recorded for follow-up; the application/acceptance implementation was not changed in this issue.

## Acceptance checklist

- [x] Sitter-only accepted-task query scoped to the token identity.
- [x] Accepted Tasks column displays assigned tasks.
- [x] Only the selected sitter can finish; repeated completion returns 409; pending button disables.
- [x] Completed tasks leave the Accepted column without a page reload.
- [x] Supertest completion rules and RTL button/refresh/error tests.
- [x] Route → controller → DAO and page → apiFetch architecture; shared design followed.
- [ ] PR linking `Closes #12` and teammate approval.

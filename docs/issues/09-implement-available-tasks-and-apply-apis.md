title: Implement available-tasks and apply APIs
labels: feature,priority:high
milestone: Sprint 2
owner: A
---
## Context
Backend for sitters finding and applying to work.

**User story:** US-7, US-8  
**Owner:** Member A

## Acceptance criteria
- [ ] `GET /pawtrust/tasks/available` returns only `open` tasks
- [ ] `ApplicationsDAO` + `POST /pawtrust/applications/apply` `{ taskId, sitterId, message }` creates `pending` application
- [ ] Message ≤ 300 chars; duplicate application → 409; applying to non-open task → 400
- [ ] `GET /pawtrust/applications/sitter/:sitterId` lists a sitter's applications
- [ ] Supertest for all of the above
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

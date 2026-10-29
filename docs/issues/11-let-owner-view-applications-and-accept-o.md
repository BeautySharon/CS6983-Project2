title: Let owner view applications and accept one sitter
labels: feature,priority:high
milestone: Sprint 2
owner: B
---
## Context
Full-stack: owner picks exactly one sitter per task.

**User story:** US-9  
**Owner:** Member B (`Gingobell`)

## Acceptance criteria
- [ ] `GET /pawtrust/applications/owner` returns applications for the logged-in owner's tasks (owner id from `req.user`), each including the sitter's name
- [ ] `POST /pawtrust/accept` `{ applicationId, taskId }`: chosen → `accepted`, others → `rejected`, task → `assigned` + `acceptedSitterId`
- [ ] Only the task owner can accept (403); task already assigned → 409; runs in a MongoDB transaction with a conditional task update so concurrent accepts cannot both succeed and application statuses stay consistent (BR-4)
- [ ] TaskList shows applicant name + message, Accept button; after accept: "Accepted" / "Not selected" pills
- [ ] Supertest for accept rules, incl. two concurrent accepts via `Promise.all` → exactly one 200 and one 409; RTL test for pill states
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

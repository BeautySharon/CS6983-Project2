title: Let owner view applications and accept one sitter
labels: feature,priority:high
milestone: Sprint 2
owner: B
---
## Context
Full-stack: owner picks exactly one sitter per task.

**User story:** US-9  
**Owner:** Member B

## Acceptance criteria
- [ ] `GET /pawtrust/applications?ownerId=` returns applications for the owner's tasks
- [ ] `POST /pawtrust/accept` `{ applicationId, taskId }`: chosen → `accepted`, others → `rejected`, task → `assigned` + `acceptedSitterId`
- [ ] Only the task owner can accept (403); task already assigned → 409
- [ ] TaskList shows applicant name + message, Accept button; after accept: "Accepted" / "Not selected" pills
- [ ] Supertest for accept rules; RTL test for pill states
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

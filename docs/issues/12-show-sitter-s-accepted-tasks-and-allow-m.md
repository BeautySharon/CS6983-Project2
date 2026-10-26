title: Show sitter's accepted tasks and allow marking finished
labels: feature,priority:high
milestone: Sprint 2
owner: A
---
## Context
Full-stack: sitter completes a job.

**User story:** US-10  
**Owner:** Member A

## Acceptance criteria
- [ ] `AcceptedTasks` column lists tasks where this sitter is accepted and status ≠ finished
- [ ] `POST /pawtrust/tasks/:taskId/finish` sets status `finished`; only accepted sitter (403 otherwise)
- [ ] Finished task leaves the Accepted column without page reload
- [ ] Supertest for finish rules; RTL test for the button
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

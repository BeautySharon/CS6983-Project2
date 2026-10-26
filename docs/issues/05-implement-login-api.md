title: Implement login API
labels: feature,priority:high
milestone: Sprint 1
owner: A
---
## Context
`POST /pawtrust/login` authenticates a user.

**User story:** US-2  
**Owner:** Member A

## Acceptance criteria
- [ ] Returns user (without `passwordHash`) incl. `_id` and `userType`
- [ ] Wrong email or password → 401 with a generic message
- [ ] Missing fields → 400
- [ ] Supertest: success, wrong password, unknown email, missing fields
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

## Notes
JWT is added later in the auth-middleware issue (US-3); design the response so a `token` field can be added.

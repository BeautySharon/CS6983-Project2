title: Implement login API with JWT and auth middleware
labels: feature,priority:high
milestone: Sprint 1
owner: A
---
## Context
`POST /pawtrust/login` authenticates a user and issues a JWT; `requireAuth` protects later endpoints.

**User story:** US-2  
**Owner:** Member A (`BeautySharon`)

## Acceptance criteria
- [ ] Returns `{ token, user }` — JWT signed with `JWT_SECRET` from env, 1-day expiry; user without `passwordHash`
- [ ] `requireAuth` middleware verifies the token and sets `req.user = { id, userType }`; missing/invalid/expired → 401
- [ ] `requireRole("owner" | "sitter")` middleware returns 403 for the wrong role
- [ ] Wrong email or password → 401 with a generic message
- [ ] Missing fields → 400
- [ ] Supertest: success, wrong password, unknown email, missing fields, 401 without token, 403 wrong role
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate


title: Implement user registration API with bcrypt and roles
labels: feature,priority:high
milestone: Sprint 1
owner: A
---
## Context
`POST /pawtrust/register` creates an owner or sitter account.

**User story:** US-1  
**Owner:** Member A (`BeautySharon`)

## Acceptance criteria
- [ ] `UsersDAO` with `injectDB`, `getUserByEmail`, `addUser`
- [ ] Validates name, email format, password ≥ 8 chars, `userType` ∈ {owner, sitter} → 400 on failure
- [ ] Duplicate email → 409 `{ error: "Email already registered" }`
- [ ] Password stored as bcrypt hash (cost 10); `passwordHash` never returned
- [ ] Supertest: success, invalid input, duplicate email
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

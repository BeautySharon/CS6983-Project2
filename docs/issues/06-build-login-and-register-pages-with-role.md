title: Build Login and Register pages with role-based routing
labels: feature,priority:high
milestone: Sprint 1
owner: B
---
## Context
Frontend for authentication, matching `docs/mockups/pawtrust-mockup.png` (Login + Register).

**User story:** US-1, US-2  
**Owner:** Member B (`Gingobell`)

## Acceptance criteria
- [ ] Routes: `/` (login), `/register`, `/owner`, `/sitter`
- [ ] Register form: name, email, password, role select, location, bio — all inputs labeled
- [ ] Shows API error messages inline
- [ ] On login, stores `pawtrust.token` and `pawtrust.user` in localStorage and redirects by role
- [ ] `src/api/client.js` `apiFetch` adds `Authorization: Bearer <token>`; on 401 it clears both keys and redirects to `/`
- [ ] Logged-out user visiting `/owner` or `/sitter` is redirected to `/`; Logout button clears session
- [ ] RTL tests: form validation message, redirect after successful login (mock fetch)
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

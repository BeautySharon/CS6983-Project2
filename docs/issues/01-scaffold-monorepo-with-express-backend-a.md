title: Scaffold monorepo with Express backend and Vite + React + Tailwind frontend
labels: chore,priority:high
milestone: Sprint 1
owner: A
---
## Context
Set up the project skeleton both members build on.

**User story:** —  
**Owner:** Member A

## Acceptance criteria
- [ ] `pawtrust-backend/` with `index.js` (Mongo connect + DAO injection) and `server.js` (Express app, `/pawtrust` prefix, JSON 404)
- [ ] `pawtrust-frontend/` created with Vite + React 19 + Tailwind 3 + react-router-dom
- [ ] `.env.example` files for both apps; real `.env` files are git-ignored
- [ ] Unique indexes created at startup: `users.email`, `applications(taskId, sitterId)`, `reviews.taskId`
- [ ] `GET /pawtrust/health` returns `{ status: "ok" }`
- [ ] README has local run instructions
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

## Notes
Reference: `index.js`, `server.js` in the original PawTrust repo.

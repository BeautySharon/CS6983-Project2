title: Deploy frontend to Vercel and backend to Render
labels: chore,priority:high
milestone: Sprint 2
owner: A
---
## Context
P2 requires a publicly reachable deployment (PRD §8 Deployment, AGENTS.md §6).

**User story:** —  
**Owner:** Member A (`BeautySharon`)

## Acceptance criteria
- [ ] Backend deployed on Render; `GET /pawtrust/health` returns `{ status: "ok" }` over HTTPS
- [ ] Frontend deployed on Vercel and calls the deployed backend via `VITE_API_BASE_URL`
- [ ] Production env vars (`PawTrust_DB_URI`, `PawTrust_db=pawtrust_prod`, `JWT_SECRET`, `CORS_ORIGIN`) set only in the platforms' dashboards
- [ ] CORS restricted to the Vercel origin
- [ ] `main` auto-deploys after CI passes
- [ ] Full flow (register → post → apply → accept → finish → review) verified on the live URL
- [ ] README lists the live URLs
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

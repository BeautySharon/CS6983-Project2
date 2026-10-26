title: Configure testing, linting and GitHub Actions CI
labels: chore,priority:high
milestone: Sprint 1
owner: B
---
## Context
Every later feature must ship with tests, so the tooling comes first.

**User story:** —  
**Owner:** Member B (`Gingobell`)

## Acceptance criteria
- [ ] Backend: Mocha + Chai + Supertest, `npm test` runs `test/**/*.test.js`
- [ ] Backend tests use a separate test DB (`PawTrust_db=pawtrust_test`)
- [ ] Frontend: Vitest + React Testing Library + jsdom, `npm test` works
- [ ] ESLint configured for frontend; `npm run lint` passes
- [ ] GitHub Actions workflow runs lint + tests on every PR to `main`
- [ ] One sample passing test in each app (e.g. `/health` endpoint)
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

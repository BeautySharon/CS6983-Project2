# PawTrust

A MERN web app connecting pet owners with pet sitters. See [`docs/PRD.md`](docs/PRD.md) and [`AGENTS.md`](AGENTS.md).

## Local development

Requirements: Node.js 22.23.4 (pinned in `.nvmrc`; run `nvm install && nvm use` from the repository root), a MongoDB connection string (Atlas, or a local `mongod` for quick checks).

### Backend (`pawtrust-backend`)

```bash
cd pawtrust-backend
cp .env.example .env      # fill in PawTrust_DB_URI and JWT_SECRET
npm install
npm run seed              # dummy owner/sitter accounts in pawtrust_dev
npm start                 # http://localhost:8000/pawtrust/health → {"status":"ok"}
npm test                  # runs against PawTrust_db=pawtrust_test
```

Unique indexes (`users.email`, `applications(taskId, sitterId)`, `reviews.taskId`) are created on startup.

### Frontend (`pawtrust-frontend`)

```bash
cd pawtrust-frontend
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:<backend PORT>
npm install
npm run dev               # http://localhost:5173
npm run lint
```

## Authentication frontend — Issue #6

Login and registration follow [Design.md](Design.md), the shared frontend design specification. The AGENTS.md reference makes it the entry point for subsequent frontend work.

Set `VITE_API_BASE_URL` to the backend origin, without `/pawtrust`. Registration and login require the APIs from #4 and #5. Authentication stores the JWT and safe user fields, redirects by role and clears the session on logout or expired authorization.

```bash
cd pawtrust-frontend
npm ci
npm test
npm run lint
npm run build
```

Tests use Vitest, Testing Library and jsdom with mocked API responses. See [auth handoff and verification](docs/issue-6-auth-handoff.md) for contracts and integration status.

## Deployment

Live URLs will be added here once deployed (#17).

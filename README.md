# PawTrust

A MERN web app connecting pet owners with pet sitters. See [`docs/PRD.md`](docs/PRD.md) and [`AGENTS.md`](AGENTS.md).

## Local development

Requirements: Node.js 20+, a MongoDB connection string (Atlas, or a local `mongod` for quick checks).

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

## Deployment

Live URLs will be added here once deployed (#17).

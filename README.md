# CS6983-Project2

## Design

Read [Design.md](Design.md) before implementing frontend pages. It defines shared styles and links the current mockup and visual references.

## Authentication frontend — Issue #6

```sh
cd pawtrust-frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open the URL printed by Vite. Set `VITE_API_BASE_URL` to the backend origin (without `/pawtrust`). The sample uses port 8000. Backend registration/login and the database must be supplied by issues #4/#5; unavailable services display an error. Owner and sitter routes currently contain protected placeholders for issues #8/#10.

```sh
npm test
npm run lint
npm run build
```

Verified with Node 25.6.1 / npm 11.9.0. The test runner disables Node's experimental Web Storage in both the parent and worker processes so jsdom supplies browser storage. Shared runtime selection remains part of #1.

See [auth handoff and verification](docs/issue-6-auth-handoff.md) for API contracts, TDD evidence and remaining integration work.

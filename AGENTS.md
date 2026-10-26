# AGENTS.md — PawTrust

<!--
  Instructions for AI coding assistants (Antigravity, Claude Code, Cursor, Copilot).
  Read this file fully before writing code. When this file and a prompt conflict,
  ask before deviating. Keep this file updated when conventions change.
-->

## 1. Project Context

**PawTrust** is a MERN web app connecting **pet owners** with **pet sitters**.
Owners post pet-care tasks and accept one sitter per task; sitters browse, apply,
mark accepted tasks as finished, and receive reviews.

> This repo is built incrementally, sprint by sprint. A finished reference
> implementation exists from a previous course; when an issue says "Reference:",
> follow that structure, but always implement against the issue's acceptance
> criteria and this file — not by copying.

### Tech stack

| Layer    | Tech                                   | Version |
| -------- | -------------------------------------- | ------- |
| Frontend | React + Vite                           | React 19, Vite 6 |
| Routing  | react-router-dom                       | 7       |
| Styling  | Tailwind CSS                           | 3.4     |
| Backend  | Node.js + Express (ES modules)         | Express 4 |
| Database | MongoDB Atlas via official `mongodb` driver (no Mongoose) | 5.x |
| Auth     | bcrypt (password hashing) + jsonwebtoken (JWT) | bcrypt 6, jsonwebtoken 9 |
| Testing  | Mocha + Chai + Supertest (backend), Vitest + React Testing Library (frontend) | — |

### Architecture

```
pawtrust-backend/
  index.js            # connects MongoDB, injects DAOs, starts server
  server.js           # Express app: cors, json, mounts /pawtrust router
  api/
    pawtrust.route.js # ALL routes registered here
    *.controller.js   # HTTP layer: parse req, call DAO, send res
  dao/
    *DAO.js           # Data layer: the ONLY place that touches MongoDB
  test/               # Mocha tests (*.test.js)

pawtrust-frontend/src/
  App.jsx             # route table
  config.js           # BASE_URL (from VITE_API_BASE_URL)
  pages/              # one file per route (LoginPage, OwnerDashboard, ...)
  components/         # reusable UI pieces used by pages
```

**Key patterns**

- **Controller → DAO.** Controllers are classes with `static async apiXxx(req, res)`
  methods. DAOs are classes with `static async injectDB(conn)` plus static query
  methods. Controllers never call `collection()` directly.
- New DAO? Register it with `await XxxDAO.injectDB(client)` in `index.js`.
- All API routes are under the `/pawtrust` prefix.
- Convert ids with the DAO's `toObjId(value, name)` helper — never `new ObjectId()` on raw input.
- Frontend pages own data fetching and state; components receive data + callbacks via props
  (`onAccept`, `onDelete`, `onCreated`). After a mutation, refetch rather than hand-patching
  complex state.

### Data model (MongoDB collections)

<!-- Full model, constraints and business rules: docs/PRD.md §8 -->
- `users`: `{ name, email (unique), passwordHash, userType: "owner" | "sitter", location, bio }`
- `tasks`: `{ ownerId, petType, description, date, duration, location, status, acceptedSitterId, reviewed, createdAt, updatedAt }`
  - `status` lifecycle: `open` → `assigned` → `finished`
- `applications`: `{ taskId, sitterId, message, status: "pending" | "accepted" | "rejected", createdAt }` — unique `(taskId, sitterId)`
- `reviews`: `{ taskId (unique), ownerId, sitterId, rating: 1–5, comment, createdAt }`
- Enforce business rules BR-1…BR-7 (PRD §8) on the server; state changes use conditional updates
  (e.g. `updateOne({ _id, status: "open" }, ...)`) so races cannot break them.

### Naming conventions

- Files: React components/pages `PascalCase.jsx`; backend `camelCase.controller.js`, `camelCaseDAO.js`.
- Controller methods: `apiVerbNoun` (e.g. `apiGetTasksByOwnerId`, `apiFinishTask`).
- DAO methods: `verbNoun` (e.g. `getTasks`, `addTask`, `finishTask`).
- React handlers: `handleXxx` inside a component, `onXxx` as a prop.
- Variables `camelCase`, constants `UPPER_SNAKE_CASE`.
- REST paths: lowercase plural nouns (`/tasks`, `/applications/sitter/:sitterId`).

### Coding standards

- ES modules only (`import`/`export`), `async/await` (no `.then` chains).
- Error responses: `res.status(<code>).json({ error: "<message>" })`; log with `console.error`.
- Status codes: 400 bad input, 401 bad credentials, 403 not allowed, 404 not found, 500 server error.
- Never return `passwordHash` to the client.
- Run `npm run lint` in `pawtrust-frontend` before committing; no unused imports.
- User-facing text is in **English**. Code comments in English.

### Testing strategy

- **Backend:** Mocha + Chai + Supertest in `pawtrust-backend/test/*.test.js`, run with `npm test`.
  Test `app` from `server.js` against a separate test database (`PawTrust_db=pawtrust_test`).
  Every new endpoint needs tests for: success path, invalid input (400), and authorization failure (403) where applicable.
- **Frontend:** Vitest + React Testing Library in `src/**/__tests__/*.test.jsx`.
  Test rendering + user interaction of components (mock `fetch`).
- **Coverage goal:** ≥ 70% on DAOs and controllers touched by a PR.
- Auth: every protected endpoint has tests for 401 (no/invalid/expired token) and 403 (wrong role / not the owner).
- Concurrency: the accept endpoint has a test that fires two accepts for the same task with `Promise.all`
  and asserts exactly one 200, one 409, and exactly one `accepted` application.
- Transactions need a replica set: run backend tests against the Atlas test database, not a standalone local `mongod`.
- A feature is not "done" until its tests pass.

### Authentication (JWT) — the only auth mechanism

**Server**
- `POST /pawtrust/login` returns `{ token, user }`. Token payload: `{ sub: <userId>, userType }`,
  signed with `process.env.JWT_SECRET` (HS256), `expiresIn: "1d"`. Never put email, password or bio in the payload.
- `api/middleware/auth.js` exports:
  - `requireAuth` — reads `Authorization: Bearer <token>`, verifies it, sets `req.user = { id, userType }`.
    Missing, malformed, invalid or expired token → `401 { error: "Unauthorized" }`.
  - `requireRole(...roles)` — `403 { error: "Forbidden" }` if `req.user.userType` is not allowed.
- Route wiring in `pawtrust.route.js`: `router.post("/tasks", requireAuth, requireRole("owner"), TasksController.apiPostTask)`.
  Public routes are only `/register`, `/login`, `/health`.
- **The acting user always comes from `req.user`.** `ownerId` on a new task = `req.user.id`;
  `sitterId` on a new application = `req.user.id`; ownership checks compare the stored id with `req.user.id`.
  If the client sends `ownerId`, `sitterId` or `userType` in the body, ignore it.
- `passwordHash` is never returned in any response (strip it in the DAO or controller).

**Client**
- Store the token and user in `localStorage` under the keys `pawtrust.token` and `pawtrust.user` — nowhere else
  (no cookies, no sessionStorage, no React-only state).
- All API calls go through one helper, `src/api/client.js` → `apiFetch(path, options)`, which adds
  `Authorization: Bearer <token>`. Components never call `fetch` directly.
- On any `401`, `apiFetch` clears both keys and redirects to `/`.
- The frontend role check (`ProtectedRoute` for `/owner` and `/sitter`) is only for UX. The server is the source of truth.
- Because the token lives in `localStorage`, XSS is the main risk: never use `dangerouslySetInnerHTML`, never render user input as HTML.

### State changes & concurrency (MongoDB)

- Every status transition is an **atomic conditional update** that includes the expected current state in the filter:
  `tasks.updateOne({ _id, ownerId, status: "open" }, { $set: { status: "assigned", acceptedSitterId, updatedAt } })`.
  If `matchedCount === 0`, return 409 (or 403/404 after checking why). Never "read, check in JS, then write".
- **Accept (BR-4)** runs in a MongoDB transaction (`client.startSession()` + `session.withTransaction`) so that
  `tasks` and `applications` stay consistent:
  1. conditional update of the task `open → assigned` (fails → abort, 409)
  2. chosen application `pending → accepted`
  3. all other applications for the task → `rejected`
- **Finish (BR-5):** `updateOne({ _id, acceptedSitterId: req.user.id, status: "assigned" }, { $set: { status: "finished" } })`.
- **Review (BR-6):** rely on the unique index on `reviews.taskId`; translate duplicate-key error `11000` into 409.
- DAOs expose the `MongoClient` they were injected with so controllers can start a session via the DAO,
  never by importing `mongodb` themselves.

---

## 2. PRD & Design References

- **PRD:** [`docs/PRD.md`](docs/PRD.md) — user stories US-1…US-13 with acceptance criteria.
  Each GitHub Issue references its user story; read the story before implementing.
- **Mockups:** `docs/mockups/` (`login.png`, `ownerdashboard.png`, `sitterdashboard.png`)
  <!-- TODO: add Claude Artifact / Figma link here -->
- **User guide:** https://docs.google.com/document/d/1Iss2T72vSEq4-krnOlWMqNabvPXAXoBrTseXnCKdLxE/edit

### Visual design (match the mockups)

- Page background: `bg-gradient-to-br from-indigo-50 via-white to-sky-50`.
- Cards: `rounded-2xl bg-white ring-1 ring-slate-200` (or `bg-white/80 shadow-xl ring-black/5`), padding `p-4`/`p-6`.
- Primary button: `rounded-md bg-indigo-600 text-white px-3 py-1 hover:bg-indigo-700`.
- Destructive button: `ring-1 ring-rose-300 text-rose-700 hover:bg-rose-50`.
- Status pills: `text-xs px-2 py-1 rounded-full ring-1` — emerald for accepted/finished, slate for neutral.
- Desktop: 12-column grid (`grid grid-cols-1 lg:grid-cols-12 gap-6`); must collapse to one column on mobile.
- Lists paginate client-side with Prev / "Page x / y" / Next.

### Key UI components

| Component | Where | Behavior |
| --- | --- | --- |
| `LoginPage` / `RegisterPage` | `/`, `/register` | Email + password; register picks role Owner/Sitter. On login store `userId` and route to `/owner` or `/sitter`. |
| `PostTaskForm` | Owner dashboard, left | Fields: petType, description, date, duration, location. Calls `onCreated` on success. |
| `TaskList` | Owner dashboard, right | Owner's tasks newest-first; each shows applications with **Accept**. Once one is accepted, others show "Not selected". Delete shown only for `open` tasks (BR-2). |
| `AvailableTasks` | Sitter dashboard | Open tasks with optional message + **Apply**; applied tasks show "Applied". |
| `AcceptedTasks` | Sitter dashboard | Tasks where this sitter was accepted; **Mark finished** button. |

### User flows (implement features along these)

1. **Register / Login** → choose role → land on role dashboard.
2. **Owner posts task** → task appears in TaskList with status `open`.
3. **Sitter applies** → application `pending`; owner sees it under the task.
4. **Owner accepts one sitter** → that application `accepted`, others `rejected`, task `assigned`.
5. **Sitter marks finished** → task `finished`, removed from sitter's Accepted list.
6. **(Sprint 2, US-11/12) Owner reviews sitter** → rating 1–5 + comment, only for `finished` tasks with an accepted sitter, once per task; sitter sees reviews on their dashboard.

---

## 3. Scrum & Workflow

- Work is tracked in **GitHub Issues** + the **Project board** (Backlog → Sprint Todo → In Progress → In Review → Done).
- Only work on an issue that exists. If a prompt has no issue number, ask for one.

### Branches

`<type>/<issue#>-<short-kebab-description>`

- e.g. `feature/12-review-sitter`, `fix/18-accept-button-state`, `chore/3-setup-tests`, `docs/7-agents-md`
- Branch from `main`. Never commit directly to `main`.

### Commit messages (Conventional Commits)

```
<type>(<scope>): <imperative summary> (#<issue>)

<optional body: what & why>
```

- types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`
- scope: `backend`, `frontend`, or a feature (`tasks`, `reviews`, `auth`)
- e.g. `feat(reviews): add POST /reviews endpoint (#12)`

### Pull requests

- Title = commit-style summary. Body must include `Closes #<issue>`, a summary, screenshots for UI changes, and how it was tested.
- Requires **1 approving review from the teammate** + passing lint/tests before merge. Squash-merge.
- Move the issue card to **In Review** when the PR opens; it moves to **Done** on merge.

### Referencing issues in code

- TODOs must reference an issue: `// TODO(#12): handle double-click on Mark finished`.
- Don't leave TODOs without an issue number.

---

## 4. Do's and Don'ts

### Do

- ✅ Follow the Controller → DAO layering and register routes in `pawtrust.route.js`.
- ✅ Validate every request body/param in the controller; return 400 with a clear `error`.
- ✅ Check ownership on the server (owner can only change their own tasks; only the accepted sitter can finish).
- ✅ Reuse existing Tailwind patterns from section 2 and existing components before creating new ones.
- ✅ Write tests with every feature (see Testing strategy).
- ✅ Keep components small; lift data fetching into pages.
- ✅ Keep changes scoped to the issue — small PRs.

### Don't

- ❌ Don't add Mongoose, Axios, Redux, UI kits (MUI/Chakra/Bootstrap), or CSS files — use `fetch`, React state, and Tailwind.
- ❌ Don't add any new dependency without stating why in the PR.
- ❌ Don't query MongoDB from controllers or put business logic in routes.
- ❌ Don't hardcode URLs — use `BASE_URL` from `src/config.js`.
- ❌ Don't commit secrets: `.env` files stay git-ignored; DB URIs only in env vars.
- ❌ Don't read the acting user's id or role from `req.body`/params — use `req.user` set by the `requireAuth` JWT middleware.
- ❌ Don't mix auth mechanisms: JWT only, no server sessions or cookies.
- ❌ Don't return `passwordHash` or store plain passwords.
- ❌ Don't rewrite unrelated files or reformat whole files.

### Security

- Hash passwords with bcrypt (cost 10). Never log passwords or tokens.
- Validate and convert ObjectIds via `toObjId`; reject invalid ids with 400.
- Use `$eq`/explicit fields in queries — never pass `req.body` straight into a Mongo query (NoSQL injection).

### Accessibility

- Every input has a `<label>` (or `aria-label`); buttons are real `<button>` elements.
- Interactive elements must be keyboard-reachable with a visible focus style (`focus:ring-2 focus:ring-indigo-500`).
- Color is never the only status signal — pills include text.
- Images need meaningful `alt` text. Text contrast meets WCAG AA.

---

## 5. Local Development

```bash
# backend (port from .env PORT, default 8000)
cd pawtrust-backend && npm install && npm start
# env: PawTrust_DB_URI, PawTrust_db, PORT

# frontend
cd pawtrust-frontend && npm install && npm run dev
# env: VITE_API_BASE_URL=http://localhost:<backend port>
```

Test accounts: `owner1@gmail.com` / `sitter1@gmail.com`, password `88888888`.

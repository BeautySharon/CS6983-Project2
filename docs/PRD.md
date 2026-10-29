# PawTrust — Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | PawTrust — trusted pet-sitting marketplace |
| **Team** | Member A — `BeautySharon` (backend-focused) · Member B — `Gingobell` (frontend-focused) |
| **Version** | v1.0 (P2) |
| **Timeline** | Sprint 1: Oct 27 – Nov 4, 2026 · Sprint 2: Nov 5 – Nov 12, 2026 · **Project due: Nov 12, 2026** |
| **Mockups** | `docs/mockups/` — see §6 for page ↔ story mapping <!-- TODO: add Claude Artifact / Figma link --> |

---

## 1. Problem

Pet owners who travel or work long hours struggle to find someone reliable to
care for their pets. Existing options (friends, generic gig apps) offer no
structured way to post a specific job, compare applicants, or see a sitter's
track record. Sitters, in turn, lack a simple place to find nearby pet-care
work and build a reputation.

## 2. Goals & Non-goals

**Goals**
- G1. An owner can post a pet-care task and get a sitter assigned in < 3 minutes of active use.
- G2. Every completed task can produce a review, so sitters build a visible reputation.
- G3. Works on mobile and desktop; meets WCAG AA basics.

**Non-goals (v1)**
- Payments, in-app chat, maps/geolocation, push notifications, admin panel.

## 3. Personas

- **Olivia — Pet Owner.** Has a dog and a cat, travels monthly. Wants to post a
  job once, see who applied, and pick someone with good reviews.
- **Sam — Pet Sitter.** College student who loves animals. Wants to browse open
  jobs, apply quickly with a short note, and track what they've been accepted for.

## 4. User Stories & Acceptance Criteria

Priority: **P0** = must have (Sprint 1 core) · **P1** = should have · **P2** = nice to have.

### Epic A — Accounts & Authentication

**US-1 (P0) Register with a role**
> As a new user, I want to register as an Owner or a Sitter so that I see the features for my role.
- [ ] Form fields: name, email, password (≥ 8 chars), role (Owner/Sitter), location, optional bio
- [ ] Duplicate email returns a clear error ("Email already registered")
- [ ] Password is stored as a bcrypt hash, never in plain text
- [ ] On success the user is redirected to login (or logged in directly)

**US-2 (P0) Log in / log out with token authentication**
> As a registered user, I want to log in securely so that I can access my dashboard and nobody can act on my behalf.
- [ ] Wrong email or password shows an error without revealing which one was wrong
- [ ] Login returns a signed JWT (1-day expiry) plus the user (without `passwordHash`)
- [ ] Protected endpoints require `Authorization: Bearer <token>`; missing/invalid/expired token → 401
- [ ] The server takes user id and role from the token (`req.user`), never from the request body
- [ ] On success, Owner → `/owner`, Sitter → `/sitter`; session (token) persists across page refresh
- [ ] Logout clears the token and returns to `/`; visiting a dashboard while logged out redirects to `/`

> US-3 (separate token story) was merged into US-2 so that authentication is designed once, in Sprint 1.

### Epic B — Owner: Task Management

**US-4 (P0) Post a task**
> As an owner, I want to post a pet-care task so that sitters can apply.
- [ ] Fields: pet type, description, date & time, duration (hours), location
- [ ] All fields required; date must be in the future; duration > 0
- [ ] New task appears at the top of "My Tasks" with status `open`

**US-5 (P0) View and delete my tasks**
> As an owner, I want to see and manage my tasks so that I stay organized.
- [ ] "My Tasks" lists only my tasks, newest first, paginated (3 per page)
- [ ] Each task shows pet type, date, duration, location, status, number of applications
- [ ] Delete asks for confirmation; finished tasks cannot be deleted
- [ ] Only the task's owner can delete it (server returns 403 otherwise)

### Epic C — Sitter: Find & Apply

**US-7 (P0) Browse available tasks**
> As a sitter, I want to browse open tasks so that I can find work.
- [ ] Shows only tasks with status `open`, paginated
- [ ] Each card shows pet type, description, date, duration, location
- [ ] Empty state: "No open tasks right now"

**US-8 (P0) Apply to a task**
> As a sitter, I want to apply with an optional message so the owner knows why I'm a good fit.
- [ ] Optional message (≤ 300 chars) + Apply button
- [ ] After applying, the button becomes a disabled "Applied" label
- [ ] A sitter cannot apply twice to the same task (server returns 409)

### Epic D — Matching & Completion

**US-9 (P0) Accept one sitter**
> As an owner, I want to review applicants and accept one so that my task is covered.
- [ ] Under each task, list applications with sitter name and message
- [ ] Accept sets that application `accepted`, all others `rejected`, task `assigned`
- [ ] After acceptance, other applicants show "Not selected" and cannot be accepted

**US-10 (P0) Track and finish accepted tasks**
> As a sitter, I want to see tasks I was accepted for and mark them finished.
- [ ] "Accepted Tasks" lists tasks where I am the accepted sitter and status ≠ `finished`
- [ ] "Mark finished" sets task status to `finished`
- [ ] Only the accepted sitter can finish the task (403 otherwise)

### Epic E — Reviews & Reputation

**US-11 (P1) Review a sitter**
> As an owner, I want to rate and review the sitter after a task so others can trust them.
- [ ] "Review" button appears only on `finished` tasks that are not yet reviewed
- [ ] Modal: 1–5 star rating (required) + comment (optional, ≤ 500 chars)
- [ ] One review per task; task is marked `reviewed`

**US-12 (P1) See my reviews**
> As a sitter, I want to see my completed tasks and their reviews so I can track my reputation.
- [ ] "Finished & Reviews" section lists finished tasks with stars + comment, or "No review yet"
- [ ] Average rating is shown at the top

## 5. Core User Flow

```
Register → Login ─┬─ Owner:  Post task ──────────────► View applications ─► Accept one ─┐
                  │                                                                     │
                  └─ Sitter: Browse open tasks ─► Apply ─► (accepted) ─► Mark finished ◄┘
                                                                              │
                                             Owner: Review sitter ◄───────────┘
                                             Sitter: sees review in "Finished & Reviews"
```

Task status lifecycle: `open` → `assigned` → `finished` (→ `reviewed: true`)

## 6. Mockup / Design Summary

| Page | Mockup | Related stories |
|---|---|---|
| Login / Register | `docs/mockups/login.png` | US-1, US-2 |
| Owner Dashboard | `docs/mockups/ownerdashboard.png` | US-4, US-5, US-9, US-11 |
| Sitter Dashboard | `docs/mockups/sitterdashboard.png` | US-7, US-8, US-10, US-12 |

When implementing a UI story, match layout, colors and component states to the mockup listed here.

- **Login page:** centered card on indigo→sky gradient, email + password, link to register.
- **Owner dashboard:** left column "Post a new task" form card; right column "My Tasks"
  list with per-task applications and Accept buttons; pagination at bottom.
- **Sitter dashboard:** three columns — Available Tasks (apply), Accepted Tasks
  (mark finished), Finished & Reviews (stars + comment).
- Visual language: rounded-2xl white cards, indigo primary buttons, rose destructive
  buttons, emerald "accepted/finished" pills. Single column on mobile.

## 7. Non-functional Requirements

- **Security:** bcrypt password hashing, JWT auth (US-2) as the single auth mechanism, server-side ownership checks, no secrets in git.
- **Accessibility:** labeled inputs, keyboard navigation, visible focus, AA contrast.
- **Quality:** automated tests for every API endpoint; CI runs lint + tests on each PR.
- **Performance:** dashboard loads in < 2 s on a typical connection.
- **Deployment:** the app is publicly reachable over HTTPS (see §8 Deployment); secrets live only in the hosting platform's env settings.

## 8. Tech Stack

React 19 + Vite + Tailwind CSS · Node.js + Express · MongoDB Atlas (native driver, DAO pattern) ·
Mocha/Chai/Supertest + Vitest/RTL · GitHub Actions · jsonwebtoken.

**Deployment (required for P2):**
- Frontend: Vercel (static Vite build); `VITE_API_BASE_URL` points to the deployed backend.
- Backend: Render web service (Node); env vars `PawTrust_DB_URI`, `PawTrust_db=pawtrust_prod`, `JWT_SECRET`, `CORS_ORIGIN` set in the Render dashboard, never in git.
- Database: MongoDB Atlas; production uses its own database (`pawtrust_prod`), separate from dev and test.
- CORS allows only the deployed frontend origin (plus `localhost` in development).
- `main` auto-deploys after CI passes; the deployed URLs are listed in README.

### Technical Notes — Data Model

| Collection | Key fields | References |
|---|---|---|
| `users` | `_id, name, email, passwordHash, userType ("owner"\|"sitter"), location, bio, createdAt` | — |
| `tasks` | `_id, ownerId, petType, description, date, duration, location, status, acceptedSitterId, reviewed, createdAt, updatedAt` | `ownerId`, `acceptedSitterId` → users |
| `applications` | `_id, taskId, sitterId, message, status ("pending"\|"accepted"\|"rejected"), createdAt` | `taskId` → tasks, `sitterId` → users |
| `reviews` | `_id, taskId, ownerId, sitterId, rating (1–5), comment, createdAt` | `taskId` → tasks, `ownerId`/`sitterId` → users |

**Constraints (unique indexes, created at startup):**
- `users.email` unique
- `applications (taskId, sitterId)` unique — one application per sitter per task
- `reviews.taskId` unique — one review per task

### Business Rules

| # | Rule | Error |
|---|---|---|
| BR-1 | Task status only moves forward: `open` → `assigned` → `finished`. | 400 |
| BR-2 | Owner can edit or delete a task only while it is `open`. `assigned` and `finished` tasks are locked. | 400 |
| BR-3 | Sitters can apply only to `open` tasks, once per task, and never to their own account's tasks. | 400 / 409 |
| BR-4 | Accept is atomic: the task update uses a conditional `{ _id, status: "open" }` filter inside a transaction that also updates the applications, so if two accepts race only the first succeeds and application statuses always match the assigned sitter. | 409 for the loser |
| BR-5 | Only the accepted sitter can mark a task finished. Marking an already-finished task again is a no-op that returns 409 (the button is disabled after the first click). | 403 / 409 |
| BR-6 | Only the task's owner can review, only when the task is `finished`, once per task. | 403 / 400 / 409 |
| BR-7 | Role is enforced on the server: owner-only and sitter-only endpoints reject the other role. | 403 |

## 9. Release Plan

| Sprint | Dates | Goal | Stories | Issues |
|---|---|---|---|---|
| Sprint 1 | Oct 27 – Nov 4 | Foundation (project setup, DB + indexes, auth middleware, tests, CI) + accounts + owner task management | US-1, US-2, US-4, US-5 | #1–#8, #14 |
| Sprint 2 | Nov 5 – Nov 12 | Full matching loop + reviews + production deployment | US-7 – US-12 | #9–#13, #17 |

## 10. Success Metrics

- All P0 stories demoed end-to-end on the deployed production URL.
- ≥ 70% test coverage on backend controllers/DAOs.
- 0 open `priority:high` bugs at the end of Sprint 2.

# PawTrust — Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | PawTrust — trusted pet-sitting marketplace |
| **Team** | Member A (`@member-a`), Member B (`@member-b`) <!-- TODO: replace with GitHub usernames --> |
| **Version** | v1.0 (P2) |
| **Timeline** | Sprint 1: Oct 27 – Nov 9, 2026 · Sprint 2: Nov 10 – Nov 23, 2026 <!-- TODO: adjust to course timeline --> |
| **Mockups** | `docs/mockups/` (login, owner dashboard, sitter dashboard) <!-- TODO: add Claude Artifact / Figma link --> |

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

**US-2 (P0) Log in / log out**
> As a registered user, I want to log in so that I can access my dashboard.
- [ ] Wrong email or password shows an error without revealing which one was wrong
- [ ] On success, Owner → `/owner`, Sitter → `/sitter`
- [ ] Session persists across page refresh
- [ ] Logout clears the session and returns to `/`
- [ ] Visiting a dashboard while logged out redirects to `/`

**US-3 (P1) Secure API with tokens**
> As a user, I want my account protected so that nobody can act on my behalf.
- [ ] Login returns a JWT; protected endpoints require `Authorization: Bearer <token>`
- [ ] User id and role are taken from the token, not from the request body
- [ ] Expired/invalid token returns 401

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

**US-6 (P1) Edit a task**
> As an owner, I want to edit an open task so that I can fix mistakes.
- [ ] Edit opens a modal pre-filled with the task's values
- [ ] Only `open` tasks can be edited; same validation as US-4
- [ ] List updates without a page reload

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

### Epic F — Scheduling

**US-13 (P2) Calendar view**
> As an owner, I want to see my tasks on a calendar and create a task by clicking a date.
- [ ] Week/month calendar (FullCalendar) shows my tasks by date
- [ ] Clicking an empty slot opens Post Task with the date pre-filled
- [ ] Clicking a task opens its edit modal

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

- **Login page:** centered card on indigo→sky gradient, email + password, link to register.
- **Owner dashboard:** left column "Post a new task" form card; right column "My Tasks"
  list with per-task applications and Accept buttons; pagination at bottom.
- **Sitter dashboard:** three columns — Available Tasks (apply), Accepted Tasks
  (mark finished), Finished & Reviews (stars + comment).
- Visual language: rounded-2xl white cards, indigo primary buttons, rose destructive
  buttons, emerald "accepted/finished" pills. Single column on mobile.

## 7. Non-functional Requirements

- **Security:** bcrypt password hashing, JWT auth (US-3), server-side ownership checks, no secrets in git.
- **Accessibility:** labeled inputs, keyboard navigation, visible focus, AA contrast.
- **Quality:** automated tests for every API endpoint; CI runs lint + tests on each PR.
- **Performance:** dashboard loads in < 2 s on a typical connection.

## 8. Tech Stack

React 19 + Vite + Tailwind CSS · Node.js + Express · MongoDB Atlas (native driver, DAO pattern) ·
Mocha/Chai/Supertest + Vitest/RTL · GitHub Actions · Google Cloud App Engine.

## 9. Release Plan

| Sprint | Dates | Goal | Stories |
|---|---|---|---|
| Sprint 1 | Oct 27 – Nov 9 | Foundation + accounts + owner task management | US-1, US-2, US-4, US-5 |
| Sprint 2 | Nov 10 – Nov 23 | Full matching loop + reviews | US-7 – US-12 |
| Future | — | Descoped for P2 (issues #15–#18 closed as not planned) | US-3, US-6, US-13, deployment |

## 10. Success Metrics

- All P0 stories demoed end-to-end on the deployed app.
- ≥ 70% test coverage on backend controllers/DAOs.
- 0 open `priority:high` bugs at the end of Sprint 2.

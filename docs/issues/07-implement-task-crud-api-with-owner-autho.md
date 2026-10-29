title: Implement task CRUD API with owner authorization
labels: feature,priority:high
milestone: Sprint 1
owner: A
---
## Context
Backend for owners managing their tasks.

**User story:** US-3, US-4  
**Owner:** Member A (`BeautySharon`)

## Acceptance criteria
- [ ] `TasksDAO`: `addTask`, `getTasksByOwnerId`, `getTaskById`, `updateTask`, `deleteTask`
- [ ] `POST /pawtrust/tasks` — validates petType, description, date (future), duration > 0, location; sets `status: "open"`, `createdAt`
- [ ] `GET /pawtrust/tasks/mine` — the logged-in owner's tasks (`req.user.id`), newest first
- [ ] `PUT /pawtrust/tasks/:id` and `DELETE /pawtrust/tasks/:id` — only the owner (403 otherwise); only `open` tasks can be edited or deleted (BR-2)
- [ ] Invalid ObjectId → 400; missing task → 404
- [ ] Supertest covers success, validation, 403, 404 for each route
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

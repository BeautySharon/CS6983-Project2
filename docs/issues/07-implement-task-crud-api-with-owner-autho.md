title: Implement task CRUD API with owner authorization
labels: feature,priority:high
milestone: Sprint 1
owner: A
---
## Context
Backend for owners managing their tasks. **This is the feature used for the with/without-rules comparison (assignment Task 3).**

**User story:** US-4, US-5  
**Owner:** Member A

## Acceptance criteria
- [ ] `TasksDAO`: `addTask`, `getTasksByOwnerId`, `getTaskById`, `updateTask`, `deleteTask`
- [ ] `POST /pawtrust/tasks` — validates petType, description, date (future), duration > 0, location; sets `status: "open"`, `createdAt`
- [ ] `GET /pawtrust/tasks/owner/:ownerId` — newest first
- [ ] `PUT /pawtrust/tasks/:id` and `DELETE /pawtrust/tasks/:id` — only the owner (403 otherwise); finished tasks cannot be deleted
- [ ] Invalid ObjectId → 400; missing task → 404
- [ ] Supertest covers success, validation, 403, 404 for each route
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

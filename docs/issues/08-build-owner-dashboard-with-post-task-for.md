title: Build Owner Dashboard with Post Task form and My Tasks list
labels: feature,priority:high
milestone: Sprint 1
owner: B
---
## Context
Owner UI, matching `docs/mockups/pawtrust-mockup.png` (Owner Dashboard).

**User story:** US-3, US-4  
**Owner:** Member B (`Gingobell`)

## Acceptance criteria
- [ ] Two-column layout on desktop (form left, list right), single column on mobile
- [ ] `PostTaskForm` with labeled inputs + client-side validation; calls `onCreated` on success
- [ ] `TaskList` shows owner's tasks newest first, 3 per page with Prev / Page x of y / Next
- [ ] Each task shows pet type, date, duration, location, status pill, application count
- [ ] Delete button with confirm; shown only for `open` tasks (BR-2)
- [ ] RTL tests for PostTaskForm submit and TaskList pagination
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

## Notes
Depends on the task CRUD API issue.

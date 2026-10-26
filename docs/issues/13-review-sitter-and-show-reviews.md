title: Allow owner to review a sitter and show reviews to the sitter
labels: feature,priority:medium
milestone: Sprint 2
owner: B
---
## Context
Full-stack review creation and display (merged from former #14, US-12).

**User story:** US-11, US-12  
**Owner:** Member B (`Gingobell`)

## Acceptance criteria
- [ ] `ReviewsDAO` + `POST /pawtrust/reviews` `{ taskId, rating, comment }`
- [ ] Only the owner of a `finished` task with an accepted sitter; one review per task (409)
- [ ] Rating integer 1–5 required; comment ≤ 500 chars
- [ ] Task gets `reviewed: true`
- [ ] `ReviewModal` with accessible star rating (keyboard selectable) opened from a "Review" button on eligible tasks
- [ ] `GET /pawtrust/reviews/sitter/:sitterId` and `GET /pawtrust/reviews/task/:taskId`
- [ ] Sitter Dashboard "Finished & Reviews" column: stars + comment per task, or "No review yet"; average rating at top
- [ ] Stars have an `aria-label` like "4 of 5 stars"
- [ ] Supertest + RTL tests
- [ ] Code follows AGENTS.md; PR links this issue with `Closes #<n>` and is approved by teammate

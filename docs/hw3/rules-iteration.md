# HW3: Rules Iteration

Based on the with-rules v1 results ([test-results.md](with-rules/test-results.md), [comparison.md](comparison.md)).

## What worked (kept as is)

- **Scope from the PRD:** the form matched US-1 field for field.
- **Stack and structure:** React 19 + Vite + Tailwind, `apiFetch`, `BASE_URL`, `pages/` layout.
- **Tests:** 10 Vitest + RTL tests, including 409 and 401 cases.
- **Security:** no password storage; only the `pawtrust.token` / `pawtrust.user` keys.

## What didn't work

| v1 problem | Why the rules missed it |
|---|---|
| Showed "Registration successful" with no backend running | Nothing forbade fake success; the prompt's "doesn't need a real backend" won |
| Used issue `#1` instead of `#6` in branch and commit | "Ask for one" was too soft; the model guessed |
| Added a non-functional Login page | No rule limited work to the requested page |
| `eslint.config.js` declared React 18.3 with React 19 installed | No rule about config versions |

## What we changed in AGENTS.md

1. §0 step 1: no issue number → **stop and ask; never guess**. Branch and commits must use that number.
2. Coding standards: **show success only after a 2xx response**; network errors and non-2xx always show an error,
   no demo/fake success paths.
3. Coding standards: config version numbers must match installed packages.
4. Don'ts: don't build pages the task didn't ask for; add only a placeholder route if a link needs one.

## Check with the updated rules (v2)

Same tool, model and prompt (no issue number), fresh conversation, starting folder with the updated `AGENTS.md`,
`docs/PRD.md` and the mockup. Before writing any code, the model asked:

- **What is the GitHub issue number?** It cited the branch convention instead of guessing (fixes problem 2).
- **"Doesn't need a real backend" conflicts with the no-fake-success rule. Which should it follow?** It quoted the new rule
  and asked whether to deviate (addresses problem 1).
- Whether to scaffold `pawtrust-frontend` with the stack in AGENTS.md.

We answered: issue #6, follow AGENTS.md strictly (error when the backend is unreachable, mock `fetch` only in tests),
and yes to the scaffold. We stopped the run at this point, so problems 3 and 4 are addressed by the new rules
but not yet verified in generated code.

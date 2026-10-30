# Issue #6: authentication frontend

## Scope and design

Implements US-1 and US-2 against the current PRD and Issue #6. Visual reference: `docs/mockups/pawtrust-mockup.png` and the prior course repository's LoginPage/RegisterPage (`BeautySharon/CS5610_Final_Project`). Retains its indigo buttons, pale gradient background, rounded white cards and labeled forms. Authentication behavior is newly implemented against this repository's JWT contract; old local identity storage is not reused.

Main had no application scaffold at `7fc3ef7`. The minimal frontend package, build/test/lint configuration and Tailwind entry are included to make this issue runnable independently. No backend or database scaffold is introduced. The Tailwind entry contains directives only, not a separate custom stylesheet design.

## TDD evidence

- Red: 15 behavior tests ran and failed before implementation: missing form controls, routing, and unimplemented transport. Runner and dependencies loaded successfully. `npm run lint` passed.
- A Node 25 native Web Storage conflict was resolved before recording Red. The test command disables Node's experimental storage so jsdom owns browser storage.
- The Red commit intentionally does not build a complete app; it contains the runnable test harness and implementation stubs.

## Dependency purposes

React, React DOM and Router implement pages/navigation; Vite and its React plugin provide build/dev tooling; Tailwind, PostCSS and Autoprefixer implement the existing design. Vitest, jsdom and Testing Library exercise user behavior; ESLint and React/hooks plugins check source. Vitest 4.1.12 replaces initially evaluated v3 because the dependency audit reported vulnerabilities; installation audit reports zero vulnerabilities. Exact resolved versions are recorded in the lockfile.

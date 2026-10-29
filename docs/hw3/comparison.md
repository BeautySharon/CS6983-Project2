# HW3: Rules vs. No Rules — Registration Page

Feature: user registration page (issue #6, US-1). Same tool and model (Antigravity IDE, Gemini 3.8 Flash High),
fresh conversation each time, same base prompt. Evidence: [`no-rules/`](https://github.com/BeautySharon/CS6983-Project2/tree/docs/6-hw3-no-rules-evidence/docs/hw3/no-rules) (#16) and [`with-rules/`](with-rules/).

## Summary

| Dimension | No rules | With rules |
|---|---|---|
| **Code quality & project patterns** | Plain HTML/CSS/JS: 1,725 lines of hand-written CSS, `app.js` is 1,251 lines; builds UI with `innerHTML` string templates | React 19 + Vite + Tailwind, exactly the stack in AGENTS.md; all requests through `apiFetch`; no `innerHTML` |
| **Design / mockup intent** | 4-step wizard with phone, emergency contact, pet records, service rates, ID upload, a third "Both" role and marketing claims ($25,000 guarantee) — none in the PRD | Exactly the US-1 fields (name, email, password ≥ 8, Owner/Sitter, location, optional bio); copy, radio buttons and "Login here" match the mockup |
| **Naming & architecture** | Global objects (`PawMockApi`, `PawValidation`), one large controller file | `pages/RegisterPage.jsx`, `api/client.js`, `config.js` with `BASE_URL`, `handleXxx` handlers; also created a `feature/…` branch and a Conventional Commit |
| **Test quality** | 1 Node script testing validation helpers only (email, phone, password strength); no UI tests | 10 Vitest + RTL tests: rendering vs. mockup, user interaction, < 8-char password, successful submit, 409 duplicate email, 401 clears token |
| **Security** | Confirmation password shown in plaintext on the success page; whole form (incl. passwords) saved to localStorage drafts | Password never stored; only `pawtrust.token` / `pawtrust.user` keys, cleared on 401 |
| **Size** | ~5,100 lines | ~950 lines (excluding lock file) |

## What the rules fixed

- **Scope.** Without the PRD the model invented features; with it, the form matched US-1 field for field.
- **Stack and structure.** The rules named the stack and folder layout, and the output followed them, so the code can drop
  into `pawtrust-frontend/` instead of being rewritten.
- **Tests.** The testing strategy made the model write component tests with mocked API calls, including the 409 case.
- **Security.** The JWT/localStorage rules and "never store plain passwords" removed both password leaks.

## What the rules did not fix

- **Fake success when offline.** Both versions show success without a backend. The prompt's "doesn't need a real backend"
  overrode the rules; a rule such as "never show success unless the server returned 2xx" would prevent this.
- **Issue number.** The with-rules run guessed `#1` instead of asking, even though AGENTS.md says to ask. The prompt
  should include the issue number.
- **Small scope creep.** A non-functional Login page was added to make the "Login here" link work.

## Limitations

One run per condition, so model randomness is not controlled. The with-rules prompt has one extra line pointing to the
rules, and the with-rules folder contained the docs that line refers to. The with-rules version has no simulated 409/500 switch, so those error states are covered by its unit
tests rather than screenshots.

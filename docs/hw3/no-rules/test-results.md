# HW3 Without-Rules Experiment: First-Output Test Results

Date: October 27, 2026. Generation tool: Antigravity IDE. Model: Gemini 3.8 Flash High.

Test URL: http://localhost:3000/. Tests used fictional data and the application's Quick Demo Fill feature. No real registration backend or email service was connected. Evaluation consisted of browser interactions, source inspection, and evidence capture; the generated source was not modified.

## Prompt and Baseline

> We’re building PawTrust, a pet care platform that connects pet owners with people who can help care for their pets. Please build a frontend registration page for new users. For now, it doesn’t need to connect to a real backend.

Generation started in an empty folder and a fresh conversation without team-authored rules, PRD, or mockups. Default IDE built-in instructions remained available.

Original source: [no-rules-v1.zip](no-rules-v1.zip) (extract to inspect the complete source directory). File hashes: [baseline-sha256.json](baseline-sha256.json). Matching starting code and model settings across the two conditions have not yet been confirmed. Observed differences must not automatically be attributed to rules alone.

## Browser Tests

| Scenario | Procedure | Observed result |
|---|---|---|
| Empty form (previous test session) | Continue without entering values | Remained on step 1, displayed field errors, and focused the first-name field. |
| Invalid inputs | Enter Test/User, email abc, phone 123, password 123, confirmation 456; continue | Displayed email, phone, password-strength, and password-mismatch errors; remained on step 1 and focused email. |
| Successful pet-owner registration | Quick Demo Fill: Pet Owner; continue through each step; select 201 Success; submit | Displayed Sarah's success page and a simulated member number. |
| Caregiver branch | Quick Demo Fill: Caregiver; continue through each step | Displayed caregiver services and rates, then the final review page. |
| Simulated duplicate email | Submit caregiver data with 409 Duplicate Email selected | Returned to step 1 and displayed “This email is already registered on PawTrust.” Input values were retained. |
| Simulated server failure | Continue with retained data; select 500 Server Error; submit | Displayed an unavailable-service message on the review page and invited retry; data remained available. |
| Retry after recovery | Switch from 500 Server Error to 201 Success and submit again | Displayed Marcus's caregiver success page without re-entering the form. |

Successful flows used complete built-in samples rather than manually entering every field from scratch. The 409 and 500 responses were injected through the UI selector; they were not real database conflicts or server outages.

## Findings

1. **Plaintext confirmation password in the success payload.** The success-page JSON masked `password` but exposed `confirmPassword`. Only fictional sample passwords were used. Evidence: [success-dom.txt](success-dom.txt) and `no-rules-v1/js/mockApi.js`: the success object spreads `userData` and overrides only `password`, then passes the object to `saveUser`.
2. **Passwords are not excluded from saved drafts (static inspection).** In `js/app.js`, `saveDraftDebounced` passes the entire `formData` object to `saveDraft`. In `js/mockApi.js`, the data is serialized directly into localStorage. This finding is based on source inspection; browser storage was not read during this check.
3. **Unverified product promises.** The UI advertises a $25,000 safety guarantee, 100% ID verification, and 24/7 support. The simulated success page says “Verification Email Sent.” These messages are not evidence of implemented services. Although the footer labels the page a frontend demonstration, the success messaging may still mislead users.
4. **Additional scope introduced by the model.** The brief registration request produced a four-step wizard with phone numbers, emergency contacts, pet records, service rates, and identity-document previews. These were not explicitly requested. Their suitability should be evaluated against the agreed PRD and the with-rules output rather than treated automatically as defects.

## Generated Automated Tests: Coverage Limits

The previous session ran `test/validation.test.js` successfully. It checks email validation, phone validation/formatting, password scoring, and the validity of three built-in profiles. Source inspection shows no automated browser flow, mock-API recovery test, or password-data-handling test. Passing these tests does not establish complete end-to-end coverage.

## Evidence

- [Empty-form validation](no-rules-empty-validation.png)
- [Invalid inputs](invalid-inputs.png)
- [Pet-owner success](registration-success.png)
- [Duplicate email](duplicate-email.png)
- [Server error](server-error.png)
- [Successful retry](retry-success.png)
- [Success-page DOM snapshot](success-dom.txt): generated sample data, not real personal data.

## Not Covered

Manual entry of the entire flow from scratch; complete dual-role registration; file uploads; missing consent selections; refresh recovery; real network disconnection; concurrent submissions; all viewport sizes; and comprehensive keyboard/screen-reader behavior. No real database, email delivery, or backend authentication was verified. No findings were fixed, and no repair prompt was sent to the generating agent.

Baseline integrity check: all archived source files matched their current counterparts at the end of the test session.

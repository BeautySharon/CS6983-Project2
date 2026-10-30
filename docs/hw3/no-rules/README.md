# HW3: Without-Rules Registration Experiment

This directory preserves the first generated registration frontend and its evaluation. It is experiment evidence, not the production registration implementation for issue #6.

- [Test results, original prompt, setup, and limitations](test-results.md)
- [Unmodified original source archive](no-rules-v1.zip): extract to obtain the complete no-rules-v1 directory.
- [Original source SHA-256 hashes](baseline-sha256.json)
- [Success-page observation](success-dom.txt): fictional sample data only.
- Screenshots document invalid inputs, duplicate-email simulation, server-error simulation, and successful registration/retry.

Generation: Antigravity IDE, Gemini 3.8 Flash High, empty folder, fresh conversation, no team rules/PRD/mockups supplied. Default built-in instructions remained. The exact initial prompt is preserved in the test report.

## Reproduce

Extract no-rules-v1.zip. In the extracted no-rules-v1 directory, run `npm test` for the generated validation tests or `npm start` to serve the demo on localhost:3000. No package installation is required. The tests are validation tests, not an automated E2E suite.

The archived output intentionally retains observed defects, including plaintext confirmation-password handling. Use fictional test data only. No real backend, account creation, or email delivery is represented by the simulation. This package documents the without-rules condition only; no comparative conclusion is established.

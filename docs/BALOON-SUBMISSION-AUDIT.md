# Baloon submission verification

20 October 2026.

The Round 1 deck follows the four requested sections in order: Own Problem Statement & Proposed Solution, Key Features & Technology Stack, Working Demo / MVP / Interactive Prototype, and Feasibility & Expected Impact. No official slide-count or slide-master template was supplied in the reference document. The deck contains 14 slides and clickable deployed prototype and source links. Software test results are separate from expected social impact. No patient outcomes, adoption, cost savings or lives saved are claimed.

The event document and Unstop listing require a prototype in Round 1. Round 2 extends the selected prototype against additional requirements in a 24-hour challenge. Searches did not establish official past-winner project evidence for this specific event. The deck follows the published judging criteria rather than assuming preferences from unrelated events.

## Judge access

`/judge-demo` offers a displayed testing password, `admin@123`, for an isolated fictional scenario. It reuses `/api/demo`, separate from account authentication and registered-account districts. Each session owns its district, has no submitted documents, and cannot use the account admin or district APIs. Two judge sessions cannot change each other's records. Logout revokes the session. A new session creates fresh examples. The normal registered-account login keeps its private password.

Six fictional active requests and dated simulated provider resources support both manual selection and automatic planning. The simulation uses a fixed scheduling day and clock, clearly labelled. This prevents an example from expiring merely because a judge opens it later. No matching, eligibility or ranking logic was changed.

The old demo response omitted manual `options` despite the shared care handler returning them. The demo endpoint now returns those options without mutating the scenario. Demo navigation stays on `/judge-demo` and omits real-account-only tools.

## Checks

- TypeScript and production build passed.
- 91 domain regression tests passed.
- 10 manual-picker tests passed.
- 272 isolated API checks passed, including 19 judge-demo checks for authentication boundaries, options, suggestions, approval, independent sessions and logout.
- The API test's expected pickup address now follows the selected patient. One fixture updates its address before matching, so a test must not assume that the other patient always wins an equal ranking.
- Local browser walkthrough: displayed password, manual hospital/slot/vehicle selection, saved approval, hospital acceptance, transport confirmation, automatic suggestions and bulk approval.

The three screenshot slides contain actual earlier MVP captures with fictional records. They are not clinical evidence. All 14 slides were rendered and inspected. PowerPoint package, geometry, font and import checks passed without findings. Hyperlinks point to the hosted demo and the private source repository.

These checks cover the exercised prototype paths, not clinical certification or proof that all defects are absent. The DevRelay connector was unavailable; no community-source research is fabricated.

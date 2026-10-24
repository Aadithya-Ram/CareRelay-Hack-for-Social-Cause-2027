# CareRelay pipeline audit — 23 October 2026

> **Resolution update — 24 October 2026:** A1–A4 have now been corrected and regression-tested. See [the final submission audit](FINAL-SUBMISSION-AUDIT-2026-10-24.md). The text below preserves the original pre-fix findings.

## Original status

Four additional issues were reproduced. They have NOT been fixed, in accordance with the request to report audit findings before further changes. The pending manual-assignment/automatic-check update has NOT been published or pushed to GitHub. The current hosted version remains version 18 (89262b17c518fd1449706b0561c4d210043268ef).

The already-authorized pending change fixes completed historical episodes blocking a new requirement edit, and adds operational checks for routine requests without claiming clinical verification. Publication is held because the audit found a privacy issue in the new check metadata, alongside existing issues.

## Verification performed

- TypeScript checking and production build passed.
- 97 domain tests passed, including completed-history regression, underway protection, routine matching and clinical exception handling.
- 320 isolated API checks passed in the full suite (not the reduced keep-UI mode). This includes ordinary registered hospital and driver accounts, document review, provider capacity/slots, patient assignment, hospital acceptance, driver confirmation, contact handover, messages, completion, subsequent requests and permission checks. All data was fictional.
- Browser walkthrough confirmed that the manual hospital list becomes available after a patient updates a request. Browser testing used the isolated local database.
- Targeted additional audit reproductions found the issues below. Passing the existing suites is not evidence that these additional cases work.

## Expected time and distance ordering

A targeted single-patient test verified both manual enumeration and automatic search:

1. A farther centre available at the preferred time ranks ahead of a nearer centre available an hour later.
2. When both centres offer the preferred time, the nearer centre ranks first.

The bulk objective first maximizes coverage and priority, then preferred-time fit and distance. It can choose a different option for one patient to accommodate more patients overall. Therefore, it does not promise every patient their individually closest centre regardless of other requests.

Distance is straight-line and travel duration is an estimate. Live traffic/routing is not implemented. Real providers must explicitly report open status, utilities, staffing, dated machine availability and vehicle availability. Registration alone is not confirmed availability. Provider confirmation is an in-app workflow, not an external hospital-system integration.

## A1 — High: stale capacity can become fresh on a later day

Location: lib/domain.ts, fresh(); lib/accounts.ts, district().

Reproduction: set the current clock to 10:00, keep a facility verifiedAt value of 08:00, and set reportedAt to seven days ago. fresh() returns true. It compares minutes of the day and ignores the calendar date / reportedAt timestamp. Day rollover can make an old report eligible again.

Impact: suggestions may use outdated staffing or operational availability.

Recommended correction: use elapsed absolute time for real-provider report freshness, while keeping explicit simulated clocks for isolated demo/practice scenarios. Add day-rollover regressions.

## A2 — High: cross-timezone resource double-booking

Location: lib/solver.ts, conflicts(), fits().

Reproduction: the same facility and physical machine report 10:00 UTC and 15:30 Asia/Kolkata on the same date. Those are the same instant. With two eligible patients, conflicts() returns false and solve() produces two simultaneous allocations because the timezone strings differ.

Impact: the physical machine (and similarly a vehicle) can be double-booked across timezone-labelled availability records. Ordinary same-timezone conflict tests pass.

Recommended correction: normalize resource intervals to absolute instants for overlap and staffing checks, including appointments crossing calendar dates. Add machine and vehicle cross-timezone regressions.

## A3 — High: former providers receive current patient request data

Location: lib/accounts.ts, scopedDistrict() / responseData().

Reproduction: a hospital has only a cancelled historical assignment. The patient submits a new request with a new requestNote. scopedDistrict() still includes the current patient object for that hospital, including the new note. Assignment filtering excludes unapproved proposals but retains cancelled/expired records when deciding access to current patient data.

Impact: a former provider can see current care-request information beyond its active authorized relationship.

Recommended correction: scope current patient/contact details to active authorized assignments. Provide only a minimal historical snapshot for historical arrangements. Add cancelled, rejected, expired and completed relationship tests.

## A4 — High, pending update only: operational metadata bypasses driver redaction

Location: lib/request-validation.ts, fingerprint(); lib/accounts.ts, responseData().

Reproduction: checkRequest() stores a JSON fingerprint containing duration, urgency, capability, budget and other requirements in operationalCheck. For an assigned driver, responseData() sets the visible duration to zero and capability to not_shared, but leaves operationalCheck untouched. Parsing the marker recovers the original duration and other redacted values.

Impact: the proposed automatic-check update would expose unnecessary clinical fields to drivers if published as currently written. This is not in the current hosted version.

Recommended correction: keep validation provenance server-side or use a non-reversible server-generated digest, and explicitly allowlist provider response fields. Add a complete serialized-response test to ensure clinical fields cannot be recovered from metadata.

## Audit boundaries

This is a code review plus automated and local browser verification of the application pipeline, using fictional accounts. It is not a clinical validation, a live-provider pilot, a HIPAA certification, or a guarantee that every possible bug has been found. Current prototype size limits and estimated travel times remain deployment limitations.

Awaiting approval before fixing A1–A4 or publishing the pending update.

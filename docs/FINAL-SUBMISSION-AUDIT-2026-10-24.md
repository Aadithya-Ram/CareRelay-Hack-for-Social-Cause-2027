# CareRelay final submission audit

**Date:** 24 October 2026 (Asia/Kolkata)  
**Target:** hackathon prototype submission, including the registered-provider path  
**Assessment:** all four reported findings corrected; automated checks passed. Publication and final hosted-browser confirmation are reported separately in the delivery message.

## 1. Four findings resolved

| Finding | Correction | Regression evidence |
| --- | --- | --- |
| Old availability appears fresh on another day | Real-provider freshness uses elapsed milliseconds from reportedAt and the real clock. Missing, future and expired timestamps fail. Demo/practice clocks remain explicit simulations. | Seven-day-old report, midnight rollover, missing/future timestamp tests. |
| Timezone double-booking | Machine, vehicle and concurrent staffing checks compare absolute instants across timezones/calendar dates. Conversion uses IANA timezone rules, not a hardcoded offset. | 10:00 UTC vs 15:30 Asia/Kolkata on one machine; different-machine staffing; vehicle overlap across local dates; DST conversion tests. |
| Former provider reads current patient information | Current patient/contact details require an approved current-episode active assignment. Closed assignment history remains separately visible without the current patient object. New-episode messaging cannot reuse a former relationship. | Cancelled/expired/rejected/completed scopes and API contact/message authorization checks. |
| Operational-check metadata exposes clinical fields to drivers | Provider visibility moved into a dedicated module; internal metadata is removed from patient responses. Driver patient data uses an explicit allowlist. | Serialized driver response tests and active provider handover tests. |

## 2. Original assignment blocker and automatic checks

Completed historical treatment no longer counts as an underway journey when editing/verifying a new request. Actual departed/arrived/in-treatment journeys remain protected. The drawer explains this blocker explicitly.

Individual Suggest, bulk Suggest and Choose manually run operational checks for complete routine requests. Membership, active request, patient agreement, coordinates, date/timezone, preferred time, window/duration, budget and transport destination are checked. Urgent/time-sensitive, isolation and medical-transport exceptions require staff review. Automated checks never set the clinical verified flag. Checks are tied to current requirements; approval checks the latest data and reservations again.

Demo preparation remains an explicit simulated action, separate from real-provider matching. Changing a request does not silently seed resources or claim a clinical review.

## 3. Automated verification results

| Check | Result |
| --- | --- |
| TypeScript checking | Passed |
| Domain + manual-picker tests | **114 passed, 0 failed** |
| Request permutation matrix within domain tests | **864 combinations** |
| Full registered-account/API suite | **414 checks passed** |
| Dependency audit, including development dependencies | **0 known vulnerabilities reported** |
| Production build | Passed |
| Constraint benchmark | 8 scenarios, zero constraint violations |
| Whitespace/diff check | Passed |

The permutation matrix varies treatment-only/transport-only/both, passenger/wheelchair/medical requirements, occupied wheelchair, caregiver, priority, treatment capability, consent and stale capacity. It checks candidate eligibility; it is not a clinical outcomes study.

The API suite includes signup, role boundaries, onboarding, pending/approved/rejected/archived states, correction/reapplication, document requirements, authenticated downloads and removal, location validation, dated requests, manual options, individual and bulk approvals, provider confirmations, privacy scopes, messaging/unread state, ordered progress, completion, history, subsequent requests, stale revisions and competing writes.

The final additions exercise **all three service kinds against registered non-demo hospital/driver accounts**, with structured machine inventory, dated slots, provider readiness, explicit patient requests and automatic operational checks. Tests select manual options and automatic proposals, approve them, verify patient/provider handover and confirm the applicable providers. They also verify that cancellation removes access to current patient/contact information.

GitHub Actions now runs type checking, the complete domain/manual suite, production build, API tests and a dependency security check. Local results do not claim that the remote CI run has already completed.

## 4. Browser verification matrix

All entries below used fictional accounts and sample documents in an isolated local database. No real patient information was submitted.

| Role / flow | Browser result |
| --- | --- |
| Patient signup | Created account, completed contact/map fields, treatment/accessibility fields and clinical handover, uploaded a PDF, submitted membership application and saw pending acknowledgement. |
| Admin membership review | Found the new patient application, supplied review notes and approved membership. Registration alone did not enter the care queue. |
| Patient login | Incorrect password displayed an error; correct email/password opened the patient workspace. |
| Patient care request | Verified all three service-choice forms; submitted a combined request with date, timezone, preferred/acceptable time window and reason; saw the availability popup and request acknowledgement. |
| Hospital signup | Entered facility details, machine count/identifier, date/timezone availability, staffing and sample licence; submission required the document. Admin could approve it. |
| Hospital readiness and editing | Approved hospital confirmed open/utilities/readiness, saw the registered machine/slot and successfully edited its availability afterward. |
| Transport signup | Entered vehicle/insurance/capability/seats/fare and three required documents; submitted for review and received admin approval. |
| Driver availability | Logged in, reported a specific date/time window, operational availability and payer; received save confirmation. |
| Real-provider matching | With real-clock checks enabled, Suggest selected the nearest eligible centre at the requested time. Choose manually displayed both eligible registered hospitals in time/distance order. No demo setup was used. |
| Manual approval | Chose a specific registered hospital, AUDIT-M1 at 10:00, and the registered driver/vehicle; approval saved the exact selection. |
| Provider handover | Hospital saw the patient, date, machine, slot and contact; accepted the request. Driver saw pickup, address, contact and destination and confirmed the trip. |
| Patient arrangement | Hospital acceptance and transport confirmation appeared automatically; attempting to mark a future appointment departed was correctly rejected. |
| Shared inbox | Driver selected the authorized patient contact and sent a message; patient saw Inbox (1), read/replied and the badge cleared. Patient could select the care team or assigned providers and send an admin help request. |
| Closed-provider privacy | Security-updated browser showed historical cancelled requests without exposing the patient's unrelated new request details. |
| Mobile | Checked provider navigation and loaded machine inventory at 390 × 844; no horizontal page overflow. Fixed the inventory count field's missing styling. |

Real-clock future appointments were not falsely marked complete. Completion/history/new-request behavior is covered by ordered-progress domain/API tests and the isolated judge demonstration.

## 5. Ranking behavior

- Eligible options must meet the requested date, treatment window, capability, staffing, accessibility, transport and reservation constraints.
- For one request, preferred-time fit is ranked first; distance breaks ties. Targeted tests cover a farther centre at the preferred time versus a closer centre only available later, and two centres available at the same preferred time.
- Bulk matching first protects coverage and priority, then minimizes preferred-time deviation and distance. It can select a different centre for one patient to accommodate more patients overall.
- Manual selection and automatic proposals share eligibility/conflict checks. Approval revalidates the selected resources.
- Search is bounded; a feasible result at the search limit is not a claim of global optimality.

## 6. Dependency security and source review

A registry audit found advisories in the prior dependency set. The lockfile was updated to patched versions, including Next 16.4.3, matching React/React DOM/server-rendering 19.3.1, Vite 8.3.5, esbuild 0.28.2 and patched transitive image/network packages. The installed dependency audit reports zero known vulnerabilities. This is a point-in-time advisory check, not proof against undiscovered vulnerabilities.

Source review covered the account/session and role checks, account onboarding/review, document access/downloads, request creation/rescheduling, care-team actions, candidate generation, search objective, resource overlap/staffing, provider transitions, completion/history, messaging relationships and response visibility. A new-request form no longer displays a missing-date error before the patient has made their first request.

## 7. Real-provider readiness and practical limits

The **registered-provider application pipeline works without relying on demo resources** in the tested scenarios. To use it with participating hospitals, the operator must review provider accounts/documents and providers must report actual readiness, staffed dated machine slots and suitable dated transport availability. A directory listing is not availability, and admin approval is not provider acceptance.

This remains a hackathon prototype, not a clinically certified deployment:

- Travel duration uses estimates and straight-line distance, not live traffic or dispatch tracking.
- No live hospital/EHR, SMS, payment or external ambulance integration is claimed; provider updates and messages are in-app.
- Representative clinical validation, real-provider pilot testing and jurisdiction-appropriate privacy/retention/governance work remain necessary before handling real patient care.
- Account recovery/email verification and a richer recurring/multi-day resource schedule remain future work.
- Current prototype solver limits remain 60 patients, 120 slot records and 30 vehicles.
- Browser walkthroughs plus automated matrices cover the identified risks and principal paths. They cannot exhaust every possible input, network failure or concurrency interleaving.

## 8. Release verification

Post-publication browser verification passed on the hosted judge URL: a patient updated a request; admin generated six suggestions and approved them in bulk; the hospital accepted the exact machine/slot; transport confirmed pickup; patient progressed through departure, arrival, treatment start and confirmed completion. The request left the active panel, appeared in patient history and allowed a subsequent request. Admin could see both the new request and completed history, and the manual picker loaded 201 eligible arrangements in preferred-time/distance order. The step-by-step hospital, machine and vehicle selection was approved successfully and persisted the exact selection. The admin history retained the earlier completed request separately. These were session-isolated fictional records.

Published application revision: `45e4a958abba0a883da5fcf70782083e5a5947b3` (Site version 19). Subsequent audit-document updates do not change application code. GitHub and the local production build use the same application sources as this release. Local and hosted databases are separate; matching source code does not copy local registered accounts or patient records to the cloud.

An additional static lint scan is **not clean**. The source-only scan reports 67 rule errors and 40 warnings: 47 explicit-any type annotations, 12 navigation-link recommendations, six effect/state rules, one ref rule and one prefer-const rule. The broad lint command also includes ignored local audit/generated files, producing unrelated additional findings. These are disclosed code-quality debt, not evidence that all source-quality checks passed. Type checking, production build, runtime tests and the browser paths above passed. No broad refactor or matching-priority change was made to silence lint during this bug-fix audit.

The release uses the same prototype URL embedded in the submitted PPT. The submitted PPT itself is unchanged. Public judge access remains confined to session-isolated fictional records; the registered-account care network retains separate authentication.

The publishing service returns the final source revision and deployment result. The delivery message reports the post-publication browser result. A readiness statement means ready for **hackathon demonstration/submission within these documented limits**, not a claim that the application is bug-free or ready for unsupervised clinical deployment.

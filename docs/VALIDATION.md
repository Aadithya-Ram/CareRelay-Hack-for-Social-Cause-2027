# Final appointment workflow validation - 11 October 2026

- Strict typecheck and final production build passed.
- Domain scheduling: 67 tests passed, zero failed.
- Isolated account/API/security/role workflow: 169 checks passed.
- Browser patient, hospital, transport and admin walkthroughs passed for membership separation, explicit dated requests, acknowledgement, availability popup, treatment-only/manual approval, hospital acceptance, transport-only confirmation, premature departure rejection and later non-conflicting combined assignment.
- Desktop and 390px phone-width screens inspected: no horizontal overflow or alignment defects observed on the checked screens. New date/time field styling corrected during QA. Final browser warning/error log empty.
- Existing user database preserved; all mutations for audit used isolated test state.
- Source/package version provenance is recorded in output/Hosting-Receipt.json and output/Final-Version.json. No official event submission was made.

See ROLE-AUDIT.md and MATCHING-AUDIT.md for evidence and practical limits. Older entries below are historical and do not define the final request workflow.

# Visual polish verification — October 11, 2026

Admin sign-in redesigned with responsive split layout, custom empty-password validation and show/hide control. Patient header, welcome panel, journey progress and contact/action alignment reviewed on desktop and at 390 × 844; no horizontal overflow. Homepage scroll reveals and 3D ring transforms checked in the browser. Protected account access is unchanged. Type checking and production build passed; this visual change did not alter the tested matching or server security model.

# Product rework verification - October 11, 2026

The October 10 verification below describes the original demonstration. The new product removes switchable roles, adds email/password sessions, three-step onboarding, provider document review, scoped server data and dedicated workspaces. New account-security checks use isolated D1/R2 state and do not create a coordinator in the user's local database.

See `docs/PRODUCT-REWORK.md` for the current implementation and remaining public-launch work.

# Verification record - October 10, 2026

## Completed checks

- TypeScript strict type check: passed.
- 41 domain tests: passed. These cover compatibility, wheelchair and combined medical requirements, timing, resources, staffing, patient agreement, milestone order, reservation/expiry, affected-plan repair, underway freezes, completed treatment, message review, slot editing, route recovery and isolated practice.
- 10 live API checks against the local development server: passed. Concurrent revision writes yielded one 200 response and one 409, with no competing commit. Role/entity restrictions, validation, malformed JSON, cross-origin rejection and counterfactual/practice isolation were checked.
- Production Worker build: passed.
- Eight measured model scenarios and a commitment-preservation ablation: executed; results in `output/evidence/benchmark.json`.
- Desktop browser review at 1280 pixels: dashboard, planning, facility reservation, transport confirmation, message approval, registration save and staff review, practice switching, disruption entry and intervention controls checked.
- Mobile browser review at 390 pixels: responsive dashboard/navigation and native dialog checked; document width did not exceed viewport width.
- Two-page PDF: extracted page count and text checked; both pages rendered and visually reviewed. An initial page-two footer overlap was repaired before delivery.

## Limits

The tests establish behavior within the synthetic discrete model, not medical validity, real provider reliability or live traffic accuracy. The browser role selector is a simulation, not production identity provisioning. A completed local build does not prove hosted success; native deployment confirmation is recorded in `docs/DELIVERY.md`.

Transport adapters, maps, payments and external messages are deliberately simulated as agreed. There is no guarantee that all possible software defects have been found. The demo should use fictional data only.

Production Worker preview: all 10 live API checks also passed against the built Worker on port 8787. Browser intervention rehearsal confirmed report verification increases feasible arrangements from 10 to 20 after Riverside closure; no browser warning/error logs were recorded.

## Product rework verified October 11, 2026

- Production build and strict TypeScript check passed.
- 56 isolated API checks passed: account isolation, role spoof rejection, document ownership, required approval uploads, provider approval, practical-profile updates, facility acceptance, transport confirmation, logout, cross-origin rejection, missing-account login and attempt throttling.
- A request-body handling issue after an origin rejection was fixed; the next login request is explicitly checked.
- Browser walkthroughs covered patient registration/onboarding, operator approval, hospital workspace and transport availability, with desktop/mobile captures in output/evidence.
- Public deployment remains a product preview; launch limitations are recorded in PRODUCT-REWORK.md.

# Revision 2 verification — October 11, 2026

- Production Worker build and strict TypeScript check passed.
- 45 domain tests passed, including real geographic distance, missing-pin barriers, nearest suitable centre ordering and actual audit timestamps.
- 79 account/API checks passed against isolated D1/R2 state: account/role restrictions, private document access, review requirements, proposal approval, stale revision conflicts, provider acknowledgement, fictional demo isolation and credential/session deletion.
- An isolated browser fixture passed 65 checks before interactive review. Real Chennai directory results and an OpenStreetMap map loaded successfully. Patient requests used actual event times. Mobile patient/care desk layouts were checked at 390 × 844 without horizontal overflow.
- Worldwide discovery accepts arbitrary city/country input and map coordinates. London, United Kingdom returned a real dialysis listing; the selectable map loaded London and a map click changed the lookup coordinates. Only source-linked real directory records are returned; directory completeness, licensing and live machine capacity are not claimed.
- The public demo is separated from user data. Actual local database records were preserved.
- Browser review confirmed explicit pending-status feedback, separate hospital application tabs, rejection reason display and reapplication with saved details. The document input supports multiple files.

See [revision details](REVISION-2.md) for current scope and launch limitations. Older verification entries below describe previous versions.


## Admin revision — 11 October 2026

51 domain tests and 84 isolated account/API checks passed, plus type checking and production build. New regressions cover individual/bulk approvals, reservation preservation on regeneration, conflicts, duplicate approvals, expiration, priority tie-breaking and bounded-search disclosure. Browser checks verify provider acceptance, the modern clinical review form, filter empty states, name sorting and Escape dismissal. See MATCHING-AUDIT.md for the documented policy and limits.


## Registered-account record audit - October 11, 2026

- Strict typecheck and final production build: passed.
- Domain suite: 54 passed, zero failed (includes removal/restoration and completed-episode rebooking).
- Full isolated API/security/role workflow: 127 passed.
- Browser patient/hospital/driver/coordinator checks: passed for request acknowledgement, patient review/list persistence, editable location autofill, provider record/documents, rejection/resubmission returning to Pending, status feedback and driver-set fare/availability.
- Existing user database preserved; tests used separate disposable state.
- Full audit detail and primary-source rationale: ROLE-AUDIT.md. External map coverage, address accuracy and provider-reported availability remain practical limits. This is a tested prototype, not a guarantee that every possible future defect is absent.


## Official admin and building-number update

Admin sign-in now requires only the private provisioned coordinator password. No public password or identity supplied by the browser grants admin access. Wrong-password rejection, coordinator-role selection and protected record access were tested. The attempt limiter uses one admin key per source address, irrespective of supplied email. Sample navigation is removed and /demo redirects to official sign-in.

House/flat/building number is stored separately, retained in profiles and included in pickup handoff. It is the first onboarding field for all roles. Reverse lookup supplies a mapped house number where present; users must manually verify flat/unit information. Browser checks confirmed password-only admin access to registered patients and number persistence/autofill. Final typecheck/build passed, 54 domain tests passed and 132 full API/security checks passed.


## Final patient-owned details and removal validation

Production build and typecheck passed. Full API/security suite: 147 checks passed. Domain/scheduling suite: 54 tests passed. Browser verified styled website confirmation/cancel, patient treatment editing and renewed review, read-only admin values and explicit editing, password-only local testing sign-in, and provider removal controls. Public-host known-test-password rejection and patient-only permanent deletion were API tested. Screenshot: output/removal-dialog.png.

## Demo provider update — 12 October 2026
77 domain tests and 187 isolated API/security checks passed. Browser checks verified loading and success feedback, twelve ranked manual choices, machine identifiers, automatic suggestion and individual approval, and desktop/390px layouts without horizontal overflow or console errors. Demo appointments use simulated resources exclusively; ordinary appointments cannot use them. Clinical verification and all timing/reservation constraints remain enforced.

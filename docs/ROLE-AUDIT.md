# Final registration and appointment role audit - 11 October 2026

## Outcome

Registration is membership only. The admin reviews it in Applications > Patients. Approval does not put the patient in the care desk. Approved members must submit an explicit dated treatment-only, transport-only or combined request. That request appears on the care desk, with reason, service type and preferred time, and requires reviewed requirements before assignment.

## Isolated role walkthrough

Existing user state was preserved. Test accounts and documents used a separate local database, never the user's active records.

- Patient: completed registration with usual treatment/practical details and map pin. The account showed membership review pending; the admin Pending membership list contained it. Approval unlocked the portal, and the care desk count did not change until a request was submitted. The patient chose treatment only, entered 13 October 2026 at 10:30 with a 09:00 earliest start and 18:00 finish deadline, saw the website availability popup, submitted and saw Request received with retained values.
- Admin: the explicit request immediately appeared with date, preferred time, reason and service type. Reviewed requirements; manual choices offered the reported dated machine at 10:30 with Own travel. Approval reserved the exact start and removed that request from the outstanding queue. Membership, provider and care-request lists remain distinct.
- Hospital: reviewed approval/readiness, published AUDIT-M1 for 13 October, 09:00-18:00, Asia/Kolkata, and accepted the admin-approved treatment-only request. The next action was Record patient check-in; no driver confirmation was required. The patient's view showed the accepted machine, date, 10:15 check-in, 10:30 treatment, own travel and treatment-only milestones.
- Transport: the admin approved a transport-only request to an existing clinic with no machine reservation. The driver saw the dated destination, pickup, fare, contact, destination map and Confirm this trip. Confirmation changed it to transport confirmed. Record departure was available, and a premature departure on the wrong date failed visibly without changing the trip. Domain tests exercise subsequent departure, arrival and completion at valid times.
- Combined request: a reviewed request using wheelchair-capable transport appeared on the care desk. Its preferred 10:30 machine time was already reserved. Choose manually instead offered 14:00, after the existing treatment plus turnaround. Approval retained that exact 14:00 start and 13:03 pickup, preserved the earlier treatment-only and transport-only arrangements, and awaited hospital acceptance.
- Desktop/phone visual checks: request service cards, reason and date/time fields, patient arrangement, care desk cards and provider actions were inspected. The 390px phone viewport stacked fields/cards without horizontal overflow; desktop likewise had no horizontal overflow. Field styling and driver action visibility issues found during QA were corrected. Final browser error/warning log was empty. This describes checked screens, not every possible viewport/state.

## Automated verification

Final strict typecheck and production build passed. The domain suite passed 67 tests; the full isolated account/API/security suite passed 169 checks. Tests include membership/no-request exclusion, pending denial, all service types, invalid/past dates, missing transport destination, timezone alias matching, exact manual start, non-overlapping machine reuse, duplicate/reservation conflict rejection, unauthorized option access, admin approval before provider confirmation, milestone order, reapplication, document isolation/removal, and recoverable admin removal versus patient-only permanent deletion.

Browser proof: output/final-appointment-request.png, output/final-appointment-mobile.png and output/final-approved-arrangements.png. Test-only names and addresses are used. The final build is packaged with its source SHA and hosting version receipt.

## Limits

See MATCHING-AUDIT.md for the discrete bounded search, resource limits, one dated vehicle interval, timezones, INR and estimated travel. Directory coverage, address lookup and provider reports can be incomplete or wrong and require verification. Passing tested paths is not a claim that every future defect is impossible. Clinical/transport validation and an independent security/privacy review remain necessary before real patient use.

## Community Wisdom

The DevRelay connector was unavailable. No community findings are fabricated. Conclusions rely on repository inspection, executable tests and the isolated browser role walkthrough.

## Earlier audit record

# Role and record audit - 11 October 2026

## Causes repaired

Admin login previously opened an isolated sample dataset. It now opens protected registered-account access; normal navigation uses the official network. Local and hosted records remain separate. Coordinator mutations previously replaced full state with a short response that dropped account/document metadata; they now reload complete state. The visible admin view refreshes every 15 seconds. New request episodes preserve completed history while allowing a fresh reviewed arrangement.

## Browser audit

Used isolated disposable accounts as patient, hospital, driver and coordinator. Submitted a patient request and saw its immediate acknowledgement; found it in admin; reviewed it and confirmed it remained in the complete directory. Verified address lookup filled editable street/city/country without saving. Inspected provider details/documents. Rejected a hospital, checked its reason, corrected and resubmitted it, then found it back in Pending with documents. Checked status-button feedback. Saved a driver-set fare and confirmed acknowledgement. Screenshots are in output/audit-*.png.

API/domain tests additionally exercise removal/restoration, cross-account document isolation, required-document removal returning providers to review, matching/capacity/reservations, facility/transport confirmation, milestone order and recurring episodes. See VALIDATION.md for final counts. On Windows the isolated Worker briefly restarted on its first external lookup. The harness retries only the read-only location lookup on that specific runtime response, never business mutations.

## Patient handover rationale and limits

Optional usual centre, medications/allergies, emergency contact, communication needs and clinician documents support staff review. The app does not prescribe treatment. Primary handover guidance: https://www.royalfree.nhs.uk/patients-and-visitors/patient-information-leaflets/dialysing-abroad

Reverse lookup returns the nearest mapped address and must be checked: https://nominatim.org/release-docs/latest/api/Reverse/ . Requests are manual, cached and rate limited: https://operations.osmfoundation.org/policies/nominatim/ . External availability and directory completeness are not guaranteed; a map listing cannot establish a staffed machine slot.

## Community Wisdom

DevRelay was unavailable in this session. No community findings are claimed; findings come from repository inspection, reproducible tests, browser checks and primary guidance above.


## Official admin and building-number update

Admin sign-in now requires only the private provisioned coordinator password. No public password or identity supplied by the browser grants admin access. Wrong-password rejection, coordinator-role selection and protected record access were tested. The attempt limiter uses one admin key per source address, irrespective of supplied email. Sample navigation is removed and /demo redirects to official sign-in.

House/flat/building number is stored separately, retained in profiles and included in pickup handoff. It is the first onboarding field for all roles. Reverse lookup supplies a mapped house number where present; users must manually verify flat/unit information. Browser checks confirmed password-only admin access to registered patients and number persistence/autofill. Final typecheck/build passed, 54 domain tests passed and 132 full API/security checks passed.


## Patient-owned details and removal update

Final validation: production build and typecheck passed; 147 API/security checks and 54 domain tests passed. Browser checks verified the website confirmation dialog, cancellation, patient registration/profile editing, disabled-by-default admin treatment values, explicit editing, and preserved values on review.

Patients supply treatment duration, completion window, requested priority/capability/transport and budget. Staff verify these requests before matching. Profile edits require renewed review. Admin removal retains credentials/documents/history for patients, hospitals and drivers, including pending/approved/rejected applications; underway journeys block removal. Only patients can permanently delete their own credentials and uploads. Admin permanent-delete endpoints reject access.

For local testing only (localhost/127.0.0.1), admin@123 is accepted for an existing coordinator and displayed on the password-only sign-in form. The public website requires the private coordinator password and rejects this known test password. A missing mapped building number is explicitly identified for manual entry, rather than invented.

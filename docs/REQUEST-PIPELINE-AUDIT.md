# Request pipeline repair and audit

Reviewed on 18 October 2026.

## Findings and fixes

The reported request was dated 12 October. It could not receive valid present-day resources. The demo loader correctly rejected its expired date, but the error was rendered behind the open patient drawer. The drawer also stored a separate patient object, allowing verification and request details to become stale after saves and background refreshes.

- The drawer now derives its patient from the current network record by ID.
- Save errors, validation instructions and success messages appear inside the drawer in a sticky feedback area.
- Successful review keeps the request open and immediately enables manual and individual matching. The reviewed button explicitly says that the request is ready to assign.
- Past dates, missing dates and elapsed appointment windows have specific explanations. The bulk planner reports the date problem rather than a generic shortage of machines or vehicles.
- Admins can explicitly record a patient-agreed date/time change. This creates a new episode, cancels unstarted reservations while retaining history, clears prior demo opt-in and verification, and requires renewed review and provider confirmation. Underway and completed episodes cannot be moved through this action.
- Loading demo providers reports completion and refreshes the current request. Demo providers remain isolated from real provider reservations and scoped to a selected request episode.
- Manual choice and automatic suggestions apply the same eligibility/reservation checks. Individual and bulk approvals persist the arrangement; remaining suggestions refresh after approval.
- Patients see the updated request date and confirmed arrangement. A coordinated arrangement explains why a second request cannot overwrite it; expired requests explain the need to update the date.

## Verification

83 domain tests passed, including six new regression cases covering the reported expired-date blocker, recovery through manual/automatic matching for treatment-only, transport-only and combined requests, agreement/role validation, reservation history, underway protection and timezone boundaries.

198 isolated API checks passed in the browser-fixture run. They cover membership approval, explicit care requests, profile/document isolation, provider applications and confirmation permissions, demo persistence, stale revision rejection, manual approval, date changes, automatic approval, hospital acceptance, transport confirmation and patient visibility. Test data is fictional, with an explicit simulated 08:00 service clock; real-time/timezone boundary behavior is covered separately by the domain tests.

Browser walkthroughs on the isolated database verified missing-attestation feedback, review without closing/reopening the drawer, demo loading, 208 ranked manual choices, successful manual approval, visible rejection of an expired date, successful date change and renewed review, individual automatic suggestions, bulk automatic approval, simulated hospital/driver confirmation and the patient's updated date and confirmed arrangement.

TypeScript checking and the production build passed. These checks establish the tested workflows, not the absence of every possible defect or clinical readiness. Demo confirmation does not constitute a real appointment or journey.

## Using an older request

1. Open the request and expand **Confirm a new date or time with the patient**.
2. Enter an agreed future date, preferred time and acceptable window, and confirm the patient's agreement.
3. Review the updated request, tick the clinical-review acknowledgement and save verification.
4. Select **Load demo hospitals & transport**, then **Choose manually** or **Suggest for this request**. Bulk planning is available from **Suggest assignments** on the care desk.
5. Approve an arrangement, then record the simulated hospital and driver agreement when demonstrating mock providers.

## Community reference

[Avoid These Common Pitfalls Of React useState](https://dev.to/jkettmann/avoid-these-common-pitfalls-of-react-usestate-4d2a), by [Johannes Kettmann](https://dev.to/jkettmann), describes the same stale-modal failure caused by duplicating a selected object. The repair stores the selected ID and derives the patient from the current fetched records. This reference supports the state-management approach; the project's own regression and browser checks validate its application here.

# Final appointment matching audit — 11 October 2026

## Registration and requests

Patient registration creates a Pending membership application. Approval permits access to the patient portal but does not create a care request. Only an explicit dated request from an approved member enters the care desk and matching queue. Legacy registrations without a request remain out of that queue. Older requests without dates require a new dated submission.

Patients choose dialysis centre/machine only, transport only, or both; give a reason, calendar date, appointment timezone, preferred treatment start or pickup time, earliest acceptable time and completion/arrival deadline. Transport-only requests additionally require the existing appointment destination and map pin. Pickup uses the registered residence. Submission requires an in-site availability acknowledgement. A request is not a booking.

## Eligibility and resources

Matching requires approved active membership, an active request, patient agreement, reviewed requirements, appropriate map pins and dated availability in the same timezone. Equivalent timezone aliases are normalised. Treatment requires an open operational centre, working staffed machine, appropriate capability, confirmed accessibility where needed, recent provider report, treatment duration and turnaround within the available interval, and concurrent staffing capacity. Transport requires a suitable confirmed vehicle, wheelchair space/assistance/medical capability when requested, caregiver seats, fare within the declared budget, named payer, and enough time for base-to-pickup, boarding, destination and return to base.

Treatment-only requests reserve no vehicle. Transport-only requests reserve no machine and go directly from admin approval to driver confirmation. Both require centre acceptance before driver confirmation. Provider APIs reject confirmation of a registered patient's unapproved proposal. Providers see only their own relevant assignments and necessary patient details. Cancellation/replanning retains history and cannot silently change an underway destination.

## Ordering and exact choices

Manual treatment choices are ordered by smallest deviation from the preferred start, then shortest straight-line pickup-to-centre distance, quickest vehicle access, fare and vehicle occupation time. Transport-only choices prioritise estimated base-to-pickup access, then fare. Ineligible or conflicting options are removed rather than placed at the end.

For dated treatment requests, candidates include the exact preferred time fitted to the availability interval, the earliest/latest fitting starts, and a 15-minute grid within the patient's permitted window. This allows a later free time on a machine whose preferred time is occupied. The admin sees the actual date/time of each choice. Approval sends the selected start and re-enumerates it server-side; it never silently substitutes the first time for the same machine. Machine and vehicle intervals cannot overlap, and treatment plus turnaround must fit. Different dates do not conflict. Staffing is checked across concurrent treatment intervals.

The bulk objective is lexicographic: maximum feasible request coverage; urgent requests; time-sensitive requests; minimum total preferred-time deviation; minimum distance; estimated vehicle access; fare; vehicle occupation. Approved and provider-accepted reservations are preserved. Individual suggestion uses the first eligible manual choice and the same reservation checks; bulk coverage can select a farther centre to accommodate more patients.

## Search and practical limits

The branch-and-bound search is bounded by 40,000 nodes or approximately 180 ms after preparation. Its status distinguishes an optimum for the enumerated discrete candidates from a feasible result at the search limit. Candidate generation may make total runtime longer. The 15-minute grid is not an exhaustive continuous-time optimum. There are operational caps of 60 patients, 120 machine windows and 30 vehicles. Vehicle availability currently has one explicitly dated interval per vehicle; changing it can require re-confirmation of affected trips. Overnight intervals and currency conversion are not supported; fares remain INR.

Distances and conservative journey estimates are not road routing or live traffic. Public map listings cannot establish live staffed-machine availability or guarantee directory completeness. Registered providers must report and confirm resources. The app does not diagnose or prescribe dialysis; receiving clinical staff must verify suitability. Multi-timezone dates are supported when the patient and resource use the same appointment timezone; differing timezone labels are not treated as cross-timezone routing.

## Verification and provenance

See VALIDATION.md and ROLE-AUDIT.md for final test counts and browser walkthroughs. Regression tests cover membership/request separation, three service types, date/timezone matching, exact manual time, later machine reuse, conflict rejection, provider approval gates, milestone order and recurring episodes.

## Community Wisdom

The DevRelay connector was unavailable in this session. No community source is claimed or fabricated. Findings are based on repository inspection, executable tests and the isolated role walkthrough.

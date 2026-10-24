# CareRelay final user guide

Local and hosted databases are independent and retained across normal restarts. Public account registration never grants administrator access.

## Patient

Register an account and submit residence, building/flat number, phone, map pin, usual treatment duration/capability, practical needs, budget and optional clinical handover/documents. Location lookup fills mapped address fields for verification; flat numbers can require manual entry. Registration goes to Applications > Patients for membership approval, and does not request an appointment or enter the care desk. Rejection gives a reason and permits correction/reapplication.

After approval, choose dialysis centre/machine only, transport only, or both. Enter the reason, calendar date, timezone, preferred treatment start/pickup, earliest acceptable time and completion/arrival deadline. Transport-only also requires your existing appointment destination and pin; pickup uses your registered residence. Read the availability popup and submit. The portal confirms receipt and retains the request. Follow its status and provider confirmations. Updating an approved/underway arrangement requires staff resolution first.

Treatment-only shows own travel; transport-only shows the existing destination and driver. Worldwide public centre listings do not establish live staffed-machine availability or guarantee a booking.

## Administrator

Admin login asks only for the provisioned private coordinator password. Local testing displays admin@123 for an existing coordinator. The public host rejects that known test password and requires the private password. First local setup uses /setup; hosted setup requires verified hosting-owner authentication. Normal navigation contains the registered-account workspace.

Applications > Patients approves/denies membership. Hospital/driver applications require details and documents. Membership approval alone never adds a patient to the care desk.

Care desk contains explicit outstanding requests, service type, date, preferred time and reason. Open a request, verify patient-supplied requirements, edit only if necessary. Suggest for this request offers the first eligible arrangement. Choose manually shows eligible choices ordered by preferred-time fit then proximity, with actual date/time. Approve this arrangement selects that exact option. Suggested plans supports individual Approve suggestion plan and Approve all suggestion plans. Approval rechecks resources and reservations server-side; requested providers then confirm.

Patients & history contains registered patients independently of care requests, with search/filter/sort and details/documents/history. Hospitals & drivers contains full provider records. Admin removal is recoverable and retains accounts/history. Permanent credentials/upload deletion is patient-only. Underway journeys block removal.

## Hospital

Register details/licence documents for review. Once approved, confirm capability, staffing, utilities and accessibility. Publish a working-machine interval with date/timezone, allowing treatment plus turnaround. Accept/decline admin-approved proposals. For treatment-only, record arrival, treatment start and completion. Combined service requires driver confirmation/arrival before treatment. Report resource changes promptly; affected reservations can need replanning.

## Transport partner

Submit vehicle/licence/insurance details/documents and fare. Once approved, set availability date/timezone, interval, base, operational status and payer. Transport-only appears after admin approval; combined service after centre acceptance. Confirm, depart and arrive on the appointment date; transport-only can then be completed. One dated availability interval per vehicle is supported. Changing availability can require affected trips to be re-confirmed/replanned.

## Timing and boundaries

Appointments and resources must use the same date/timezone. Exact preferred times and alternative 15-minute starts are searched within the supplied acceptable window, with a bounded search. See MATCHING-AUDIT.md for policy and limits. Distances and conservative journey estimates are not road routing or live traffic. INR remains the fare currency. Overnight intervals and integrated payments are not supported.

Before real patient use, account recovery, document authenticity/malware checks, formal privacy/retention, clinical/transport validation and an independent security review remain necessary. Passing tested flows does not prove every possible future defect absent.

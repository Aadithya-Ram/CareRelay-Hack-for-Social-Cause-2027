# CareRelay - Dialysis Continuity Coordination

CareRelay is a working HealthTech hackathon prototype for recovering disrupted dialysis appointments. It matches staff-verified patient requirements with suitable staffed slots and transport, obtains explicit commitments, preserves them when replanning, and tests interventions for unresolved patients.

**All patients, facilities, journeys and providers are fictional.** Email/password sessions now protect separate patient, facility, transport and care-team workspaces. Public registration never grants coordinator access. Do not enter real patient information. A feasible model arrangement is not a confirmed appointment or completed treatment.

## Open the project

The public hosted URL is recorded in `docs/DELIVERY.md`. Patients and providers sign in with CareRelay email/password accounts. Admin login asks only for the private password of the provisioned care-team account. The active care network is shared, but server responses are scoped to the signed-in account. Normal admin navigation uses the registered-account network.

Install Node.js 22.13+ (Node 24 was verified), then double-click `Start-CareRelay.bat`. The launcher builds the latest source, applies all local migrations without clearing records, starts http://127.0.0.1:8787 and opens the browser. Keep its window open; Ctrl+C stops the server. First-time installation needs internet.

For your first local operator account, open `/setup` on this computer. Setup closes after one coordinator account exists. Patients, hospitals and transport partners use `/signup`. Patients, facilities and drivers stay pending until membership review; providers also require documents. Local-only admin testing uses admin@123 for an existing coordinator. The public host requires the private coordinator password. Local and hosted accounts/databases are independent.

Read `docs/USER-GUIDE.md` and `docs/PRODUCT-REWORK.md` for the current product workflow and launch boundaries.

## Included workflows

- Coordinator: register and verify fictional patient episodes; generate plans; log machine failures, staff shortages, utility outages, centre closures, vehicle cancellations and route or lift failures; export evidence.
- Facility: update capabilities, staffing and accessible treatment routes; create or restore discrete working-machine slots; review draft availability messages; accept/reserve or reject requests; record treatment start and completion.
- Transport: confirm vehicle availability, occupied-wheelchair equipment, medical monitoring capability, assistance, caregiver seats and payer; confirm actual trips; record departure and arrival.
- Patient/caregiver: apply for membership, then separately request treatment only, transport only or both with date, preferred time and reason; receive acknowledgement and follow relevant milestones.
- Intervention planner: compare runs with one additional accessible vehicle, one staffed machine slot or reconfirmed capacity reports. These tests never change actual records.
- Practice: an independent persistent district with scenario presets and its own reset and audit trail.

## Verification

```powershell
npm run typecheck
npm test
npm run benchmark
# With a local preview running:
npm run test:api
npm run build
```

Domain tests cover eligibility, capacity, simultaneous machine/vehicle use, deadlines, wheelchair and medical transport, patient agreement, role actions, reservation expiry, cancellation recovery, underway freezes, treatment completion, message review, route recovery, slot editing and practice isolation. Live API tests issue competing writes and require exactly one success and one 409 conflict. The API tests use an isolated fictional identity, not the owner's district.

Measured scenarios and the commitment-preservation ablation are in `output/evidence/benchmark.json` and its readable companion. Runtime is measured, varies by host, and includes model preparation and validation. Most demo scenarios tie the constraint-aware greedy baseline. A deliberately constructed constrained case demonstrates 2 feasible assignments versus greedy's 1; it is not a population-wide performance claim.

## Model, commitments and persistence

`lib/solver.ts` contains a TypeScript discrete constraint search, **not OR-Tools**. Search starts with a feasible greedy plan and a valid previous-plan incumbent, then uses bounded branch-and-bound (40,000 nodes / 180 ms search budget). Objective: maximize assigned patient count, then urgent request count and time-sensitive request count, then minimize centre distance, fare and vehicle time in separate tie-breakers. Exact optimality is claimed only when the discrete search finishes. The time budget applies to search, not total request processing. Inputs are limited to 60 patients, 120 slots and 30 vehicles for this prototype.

Deadlines mean **treatment completion**. Slots include 30 minutes of scenario turnaround. Transport reserves an individual trip including deadhead to pickup, boarding, travel, a 15-minute scenario delay allowance, 15-minute scenario check-in and return to declared vehicle base. These allowances are synthetic inputs, not medical or transport standards. No shared vehicle pooling, multi-day schedule or live route estimation is implemented.

New proposals require general capacity evidence no older than 120 scenario minutes. Patient-specific facility acceptance persists independently of that general report. Proposals expire after 60 scenario minutes or before check-in; accepted unstarted arrangements expire at slot start plus 15 minutes or when their pickup is missed. Scenario time advances explicitly. Existing valid accepted commitments remain fixed. Departed, arrived and started transfers remain frozen if conditions change and receive a coordinator escalation. Completed treatment remains historical evidence.

Workflow: `proposed -> accepted -> transport_confirmed -> departed -> arrived -> treatment_started -> completed`. Rejection, cancellation and expiry release unstarted commitments and replan; rejected patient/slot pairs are excluded. Arrival is never treatment completion. Underway cancellations require human escalation instead of a destination change.

D1 stores each demonstration district as a versioned document. A single conditional SQL update commits records, reservation state and audit together. Stale revisions fail with 409; the user refreshes before retrying. Active and practice use distinct identity-and-mode keys. The schema lives in `db/schema.ts`, with a generated Drizzle migration. The homepage is public; app records require an authorized app session. App access additionally requires a hashed, expiring session cookie; identity headers do not grant app access. API input validation, origin checks and action/entity checks execute server-side. Role/entity fields supplied by clients are ignored. Responses omit unrelated account data; private documents require owner or coordinator authorization.

## Submission package

- `output/pdf/CareRelay-LaserHack-Proposal.pdf`: exactly two pages, suitable for the Round 1 PDF requirement.
- `docs/SUBMISSION.md`: project title, category, copy-ready description and remaining human submission details.
- `docs/DEMO-SCRIPT.md`: repeatable live demonstration and talking points.
- `docs/REQUIREMENTS.md`: traceability to the full agreed conversation.
- `docs/ARCHITECTURE.md`: interfaces, data flow, constraints and extension boundaries.
- `output/evidence/`: measured reproducible scenario results.
- `/submission.html`: browser-readable project brief; `/pitch.html`: keyboard-controlled live pitch.

## Eligibility and honest disclosure

Development began on **October 10, 2026**, before the October 17-18 event mentioned in the supplied rules. The rules say work must be created during the hackathon. Advance-development approval has not been established. Confirm eligibility with organizers and disclose the actual timeline; do not represent this as work created during the event. The supplied rules require 2-4 team members. Personal/team details, registration, judging access and official submission remain human steps. No registration or submission was made by this build.

The prototype was developed with AI assistance in Codex from the user's CareRelay design conversation, using open-source dependencies. It makes no claim that dialysis scheduling or replanning is globally novel. Its focus is the operational workflow linking evidence, reservations, patient-specific acceptance, transport, unresolved work and completion.

## Attribution and future work

See `THIRD_PARTY_NOTICES.md` for installed dependency attribution. Constraint programming reference: [Google's constraint optimization guide](https://developers.google.com/optimization/cp/). Transaction reference: [SQLite transactions](https://www.sqlite.org/lang_transaction.html). These inform the concepts; Google OR-Tools is not used by this build.

Before a real pilot: interview dialysis coordinators; validate clinical and accessibility inputs; complete operator provisioning and external email verification/account recovery; choose jurisdiction-appropriate privacy controls, retention and consent; add tested live route and provider adapters; define offline synchronization; validate a richer solver against representative workloads. The current application should remain a fictional demonstration.

# Current product update — October 11, 2026

Start with [the user guide](docs/USER-GUIDE.md) and [revision details](docs/REVISION-2.md). The current version includes a simpler care desk, bulk assignment suggestions with approval, separate application queues, patient history, account deletion, driver-set fares, multiple document uploads, real event timestamps, animated dashboards and worldwide map discovery without a paid key.

Double-click Start-CareRelay.bat to start locally. Admin login opens the official registered-account network using the private care-team password. The old /demo page redirects to official admin sign-in.


Admin matching audit and current limitations: [MATCHING-AUDIT.md](docs/MATCHING-AUDIT.md). Individual approvals reserve resources and remain unchanged across regeneration.


Latest update: patients supply and edit treatment requests; admins review or explicitly correct them. List removal for all registered roles retains history, while permanent credential/document deletion is patient-owned. Website confirmation dialogs replace browser prompts. Local testing admin password: admin@123; public access still requires the private care-team password.

## Final appointment workflow

Registration > membership approval > explicit dated care request > staff verification > individual/manual or bulk suggestion > admin approval > requested provider confirmation. Registration alone never enters the care queue. See docs/MATCHING-AUDIT.md and docs/ROLE-AUDIT.md for matching policy and verification.

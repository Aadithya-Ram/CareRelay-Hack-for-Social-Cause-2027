# Journey closure, provider schedules and shared inbox audit

18 October 2026.

## Workflow

Hospital acceptance and driver confirmation come from provider actions (or an admin explicitly recording the provider's agreement). They are reflected automatically in the patient's milestones. They are never fabricated by patient clicks.

After the required confirmations, the patient can report the next actual milestone: departed, arrived, treatment started, completed. Treatment-only requests omit transport; transport-only requests omit treatment. A confirmation dialog explains closure. Completion clears `requestActive`, preserves a completion snapshot and the timestamped history, removes the arrangement from active panels, and allows another dated request. Old episodes remain visible after the new request. Provider-recorded completion closes the same episode as well.

Completed older episodes are excluded from new provider-confirmation reservation checks, consistently with the existing approval workflow. This prevents a historical request from blocking the next episode without changing solver ranking or eligibility.

Live appointments retain date and elapsed-duration checks. Demo-only resources allow explicitly labelled simulated progress through the scheduled times. Patient progress is labelled as patient-reported, separate from provider confirmation. A delayed confirmed pickup is escalated rather than silently disappearing before it can be reported.

## Pages

Patients: overview, request care, arrangement, history, profile, documents, centres and inbox/help.
Hospitals: treatment requests, machines/slots, readiness, inbox, history, profile and documents.
Transport: trips, availability, inbox, history, profile and documents.
Admin: separate request history and inbox pages alongside existing care-desk tools.

## Hospital capacity

Registration collects machine count, unique identifiers and dated time slots with timezone and operational/staffing flags. Existing profiles without inventory remain compatible and can add it afterward. Hospitals can edit inventory and availability on the Machines & slots page. Slot ownership and positive time intervals are validated. Unchanged slots are retained; changed booked slots use existing reservation protections. Underway slots cannot be removed. Reported inventory does not bypass membership, readiness, staffing or existing matching constraints.

## Notifications and messaging

Assigned hospital and driver pages refresh automatically. Hospitals see the patient, appointment date/time, machine, slot and contact handover. Drivers see pickup time, residence, patient name/contact, destination and map directions. Proposals are visibly distinct from confirmed work. These are in-app updates, not email or SMS notifications.

The shared inbox supports patient–admin, patient–assigned hospital and patient–assigned transport conversations. Searchable contacts are derived from authorized assignments, not a public directory. Simulated providers have no real inbox. Messages, replies, read markers and resolved/open states persist in the versioned district record. Navigation badges refresh after inbox actions and periodically while the workspace is open. Reading does not mark another participant's messages as read. Provider conversations are scoped to their participants; admin help messages stay in the care-team inbox.

Every write uses existing origin, session, active-membership and revision checks. Patient IDs and provider targets are checked on the server. Thread lookup, replies and read markers reject other accounts. Unstarted expired/cancelled relationships cannot initiate provider conversations; completed authorized relationships retain their conversation history.

## Verification

- TypeScript and production build passed.
- 91 domain tests passed, including new closure, permission, history snapshot, machine inventory and relationship tests.
- 253 isolated API checks passed, including all three message directions, provider handovers, schedule updates, completion, a new request and retained history.
- Eight manual-picker checks passed for the grouped selection interface present in the shared checkout. Matching constraints and `lib/solver.ts` were not changed by this update.
- The local Wrangler test runtime can restart on the first cold schedule write. The harness and schedule form retry that explicit 503 once with the same revision; stale-write rejection still applies.

Browser walkthroughs verified automatic provider milestones, patient departure/arrival/treatment/completion, removal from the active panel, history in both patient and admin views, an enabled new request, patient-to-admin message delivery/reply and unread badges clearing. Hospital registration inventory was loaded and a slot end-time edit persisted after reload. Mobile layouts at 390px had no document overflow (375px content width). No browser console errors were observed. The final slot form reads submitted visible fields to prevent a stale serialized draft from overwriting a time edit. A separate fixture API run passed 229 checks. These results cover the tested prototype workflows, not clinical certification or the absence of every possible defect.

## State-management reference

[Johannes Kettmann's React state pitfalls](https://dev.to/jkettmann/avoid-these-common-pitfalls-of-react-usestate-4d2a) informed the use of selected IDs and derivation from the latest server records, rather than separate copies of conversation or patient data.

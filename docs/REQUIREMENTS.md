# Traceability to the full CareRelay conversation

The complete four-turn conversation "Assess CareRelay Idea" was read, including the original idea, critique, the user's A/B/D decision, the small C practice-mode recommendation, transport refinements and the hackathon attachment.

| Agreement | Implemented behavior |
|---|---|
| Responsive web app for four roles | Coordinator, facility, provider and patient demo views; desktop and mobile layouts |
| Dialysis alone | Explicit standard/isolation capability, staff-entered treatment duration and completion window |
| Patient registration and changing needs | Editable practical needs; changing registration invalidates clinical verification |
| Facility capabilities, machines, staff and timestamped capacity | Facility resource verification; discrete staffed machine slots; general report freshness |
| Wheelchair compatibility beyond a checkbox | Entrance, route and lift checks; occupied-wheelchair vehicle equipment; combined monitoring and mobility requirements |
| Journey estimates separate from available vehicles | Simulated travel-to-pickup, boarding, journey, delay, check-in and return-to-base intervals |
| Suitable external transport fallback | Manually confirmed external vehicle, seats, assistance, cost, payer and suitability |
| A: reliable coordination | Acceptance/reservation, transport confirmation, ordered milestones, rejection/cancellation/expiry, audit trail and atomic writes |
| B: solver-backed intervention planning | Copy-based reruns for an accessible vehicle, confirmed staffed slot and report verification |
| D: routine disruption recovery | Machine failures, staffing shortage, cancellations, utilities, facility/lift failures and route reports |
| C: small practice mode | Separate persistent district and scenario presets using the same engine |
| Preserve accepted commitments | Valid accepted plans fixed; underway transfers frozen and escalated |
| Unresolved explanations | Verifiable compatibility, verification, timing/transport and resource-conflict barriers with next actions |
| Fair baseline and insufficient-capacity cases | Same-constraint capacity-aware greedy; constructed constrained case; fundamental shortage and no-facility scenarios |
| Operational evidence, no medical-outcome claims | Feasible, accepted, transport confirmed, completed, unresolved, violations, changed commitments and measured runtime |
| Simulated inbox with human review | Original text, rule-based draft fields, staff approval and manual update fallback |
| Two-page Round 1 submission | PDF proposal, submission copy and eligibility checklist |

## Deliberate boundaries

AI message extraction was optional in the conversation. This build uses deterministic draft extraction, clearly labeled, with human approval. No model training or external AI key is required. The constraint solver is implemented in TypeScript to share the deployed Worker runtime; the initial Python/OR-Tools stack was a proposed MVP approach, not a required technology contract in the final scope. This build does not claim to use OR-Tools.

No real hospitals, transport bookings, map services, messages or payments are connected. No native mobile app or production EHR system is included. PWA installation and real offline coordination were future possibilities, not hackathon requirements.

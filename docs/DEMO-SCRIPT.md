> Historical October 10 role-switching demo. The current product uses separate accounts and onboarding; follow USER-GUIDE.md for the current walkthrough.

# Repeatable CareRelay demonstration

## Five-minute story

**Opening (20 seconds):** A dialysis appointment depends on a suitable machine, staff, operational utilities, accessibility, transport and explicit acceptance. CareRelay helps coordinators turn disruption recovery into commitments and exposes what remains unresolved.

**Everyday recovery (40 seconds):** Open Practice scenarios, then Open practice district. Use Activity & evidence -> Reset this demo district if needed. Generate a plan. Show 30 fictional patients, three centres and Greenfield's stale report. Log a machine breakdown at Riverside. Point out that broken M1 slots no longer count. This uses the same workflow as larger outages.

**Wider outage and verification (50 seconds):** Log a Riverside facility closure. Show the unresolved queue and Greenfield as a candidate requiring verification. Open Facilities & inbox. Review the original Greenfield message and its proposed fields; Confirm draft. Explain that the rule-based parser did not make its report usable before human review. The solver then uses verified capacity.

**Commitments (40 seconds):** Return to Coordination desk. Pick a suitable proposed transfer. Accept & reserve, then Confirm transport. Show that facility acceptance and transport-confirmed counts are separate. Click the patient's row to show fare, payer, pickup, arrival, treatment duration and completion deadline. Demonstrate the facility or transport role selector if desired; these are fictional accounts.

**Vehicle failure and intervention (60 seconds):** Log cancellation of Accessible van 1. Existing valid accepted transfers are preserved; affected unstarted transfers are repaired. Show the remaining barriers. Open Intervention planner and test one accessible vehicle. If facility capacity remains the bottleneck, the correct result may be zero. To show a measured positive result, restore all facilities through Update & verify resources, retain the accessible van cancellation, and retest. The seeded verified scenario yields two additional feasible arrangements. These are synthetic results and can vary if bounded search terminates differently.

**Actual fallback (30 seconds):** Open Transport -> Add external transport. Enter a fictional accessible taxi, occupied-wheelchair equipment, boarding assistance, seats, time window, fare and payer. Mark provider availability confirmed only because this is a simulated confirmation. Saving adds an actual prototype resource and replans. The hypothetical intervention alone never did that.

**Evidence (30 seconds):** Open Activity & evidence. Show zero model resource violations, capacity-aware greedy comparison, changed commitments and runtime. Export scenario & evidence. Mention that most demo cases tie greedy; the constructed compatibility case improves 1 to 2, as recorded in the benchmark file. Finish with the clear operational distinction: arrival is not completed treatment.

## Full milestone rehearsal

Use a fresh practice district, Generate plan, accept a proposed 180-minute episode and confirm transport. In Transfer details, note tripStart, pickup, arrival and slot start. Advance the clock to tripStart and record departure. Advance to arrival and record arrival. Advance to slot start and start treatment. Advance to slot start plus duration and complete treatment. Patient-specific acceptance remains valid as the general capacity report ages. Other unstarted proposals may expire and are replanned. Do not move time past the chosen episode's completion deadline.

If a vehicle or facility fails after departure, the destination stays frozen and an escalation appears. This is intentionally a coordinator review, not an automatic reroute.

## Fallback presentation

If network access fails, run the local preview with its local persistent database and use the same demo. The downloaded two-page PDF and browser pitch need no external APIs. Fonts fall back to system fonts without network access. The app does not claim offline coordination or cross-device offline synchronization.

## Likely jury questions

- **Is it clinically deciding who gets treatment?** No. Clinical staff supply eligibility, duration, urgency and completion windows. It coordinates within those inputs.
- **Does it book Uber?** No. External transport is manually arranged and confirmed. A regular car never becomes wheelchair-equipped because the situation is urgent.
- **What is new?** The demonstrated product contribution is linking evidence, commitments, execution and repair. No global novelty claim is made for scheduling.
- **Is the optimizer exact?** Exact only when its discrete search completes. Larger runs have explicit limits and report best feasible plans found.
- **Can two coordinators reserve the same slot?** A revision-checked atomic commit prevents competing state updates. Live API testing confirms one winner and one conflict.
- **Can it run in hospitals today?** It is a fictional prototype. Real membership, integrations, clinical validation and privacy governance are future pilot work.

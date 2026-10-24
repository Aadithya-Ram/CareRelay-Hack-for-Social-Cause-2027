# Guided manual assignment audit

Reviewed on 18 October 2026. This review covers the guided manual picker and its integration with the existing server approval action.

## Implemented flow

- **Both services:** Choose manually → eligible hospitals → hospital's available machine/start-time popup → transport provider → eligible vehicles → review → approve.
- **Treatment only:** Hospital → slot → review with own travel. No vehicle selection or driver confirmation is requested.
- **Transport only:** Provider → vehicle → review against the patient's existing destination. No hospital or machine selection is requested.
- Hospital ordering retains the server's preferred-time, then distance ranking. Slot choices retain the precise machine and start time. Transport choices prioritize estimated access to pickup.
- Vehicle cards show provider/driver name, registration number (or an explicitly labelled demo ID), vehicle type, base-to-patient straight-line distance, estimated access minutes, scheduled pickup, destination arrival, fare, seats, and boarding assistance.
- Distances and access times are estimates from reported vehicle bases; this is not live vehicle tracking or traffic routing.
- Review passes the exact patient, slot, start and vehicle back to `approve_plan`. The server re-enumerates eligible options and validates shared-resource reservations before saving.

## Verification

**10 focused tests passed.** `node scripts/test-manual-picker.mjs` checks hospital grouping/ranking, slot deduplication, vehicle filtering/ordering, treatment-only and transport-only behavior, exact saved selections, changed slot and vehicle rejection, empty availability, preferred-time ranking over distance, and occupied-wheelchair suitability. The GitHub quality workflow includes this suite.

TypeScript checking and an isolated production build passed. Browser walkthroughs used a separate database on port 8890, fictional accounts and simulated resources, with an explicit test clock. The three service types were assigned through the actual interface. Twenty-four API read-back assertions verified the saved choices, their dates and stages, and patient-specific visibility.

Browser QA confirmed the combined selection of Riverside Hospital, Demo M1 at 11:00, and an accessible van; treatment-only selection of Greenfield, Demo M1 at 11:00, with no vehicle; and transport-only pickup at 11:00 with a passenger car. Confirmation remains separate from admin assignment.

The audit caught and fixed Escape closing the underlying patient drawer together with the slot picker. A subsequent browser check verified that Escape dismisses only the picker. At a 390-pixel mobile viewport, the page and open vehicle popup had no horizontal overflow. No browser console errors were observed in these walkthroughs.

## Scope and release

Source changes are in `app/product/manual-assignment.tsx`, its stylesheet, `lib/manual-picker.ts`, the manual-picker integration/focus guard in `coordinator.tsx`, the focused test suite/runner, and the quality workflow. The wider patient-journey/inbox work being edited in the main conversation was preserved. This side-conversation audit does not independently publish that wider work.

Tests and screenshots establish the exercised paths, not the absence of every possible defect. No existing user requests, accounts or provider records were changed by the isolated audit.

## Design reference

[Johannes Kettmann's React state guidance](https://dev.to/jkettmann/avoid-these-common-pitfalls-of-react-usestate-4d2a) supports storing selection identifiers and deriving selected records from current data. The picker uses facility, slot and option keys rather than maintaining duplicate selected-resource objects.

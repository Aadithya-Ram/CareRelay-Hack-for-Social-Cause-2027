# CareRelay revision 2 — October 11, 2026

The redesigned care desk follows three steps: review needs, suggest assignments, approve a plan. Applications have patient/hospital/driver categories and separate pending/approved/rejected lists. Patient details and history, resource readiness, hospital acceptance and transport confirmation are separate actions.

Onboarding replaces numbered zones with street address, city/district and map pins. Patients and providers can choose their current location, select a point on a world map or enter coordinates. Real dialysis discovery accepts cities and coordinates worldwide, without a Chennai or country restriction. Only the fictional demonstration uses Chennai centres.

Free OpenStreetMap/Nominatim search returns source-linked directory records, with caching and rate limits. Directory coverage varies, and listings are not independently verified providers. Machine availability is explicitly unconfirmed. Google Maps search/directions provide a fallback. Participating centres report staffed slots; the planner checks suitability and resource conflicts separately.

Drivers enter their fare. Hospitals receive clear licence/registration upload instructions and multiple-page uploads. Rejection displays a reason and reapplication. Status checks provide explicit feedback. Patient arrangements show hospital, machine, time, transport, map, directions and supplied contact numbers. Event timestamps use actual recorded time.

Public admin@123 opens only an isolated fictional demo with three centres, six patients and five vehicles. Actual accounts and documents remain protected by live staff login. Account deletion requires exact email confirmation and removes credentials, sessions and private uploads; anonymized operational history remains. Database and object storage do not share an atomic transaction.

The tested matching model retains staffed machine constraints, accessibility, appropriate transport, budgets, journey timing, disruptions and commitment preservation. Complex practice/intervention controls have been removed from the everyday interface.

This preview uses one scheduling day in IST and estimated travel rather than live traffic. Worldwide discovery does not imply multi-time-zone clinical operations are launch ready. Use fictional records and sample documents. High-volume maps, account recovery, operational monitoring and clinical/privacy review remain production work.

## Community Wisdom

The DevRelay skill was consulted, but its connector was unavailable. No community provenance was invented. Reference sources were official Leaflet, OpenStreetMap/Nominatim and Google Maps documentation.

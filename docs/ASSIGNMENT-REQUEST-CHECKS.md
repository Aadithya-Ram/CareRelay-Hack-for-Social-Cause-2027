# Request matching and historical completion fix

23 October 2026

## Corrected behavior

Completed historical arrangements no longer block patient requirement edits or verification for a later request. Journeys actually departed, arrived or in treatment remain protected from reassignment and requirement changes. The admin drawer explains an in-progress blocker explicitly.

Suggest (bulk or individual) and Choose manually automatically validate complete routine requests. These operational checks cover membership, active request, consent, pickup coordinates, valid appointment date/timezone, preferred time, duration, travel budget and destination for transport-only requests. Urgent/time-sensitive, isolation and medical-transport requests remain flagged for staff review. Automation does not set the clinical `verified` flag.

An operational check is bound to the exact requirements. Approval reruns checks and the existing resource/reservation rules. Preview does not persist changes. Editing requirements invalidates the operational check. The resource scoring/search algorithm and conflict checks are unchanged.

Existing local demo preparation shortcuts are retained and explicitly identify simulated review and resources.

## Regression coverage

Tests cover a completed prior episode followed by new verification, protection of actually underway journeys, routine manual and bulk checking without a false clinical attestation, stale checks after edits, flagged requirements, consent/membership/location failures and API approval after automatic checking. Domain test suite: 97 passed. TypeScript and production build passed.

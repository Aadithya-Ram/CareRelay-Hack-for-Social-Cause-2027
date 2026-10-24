# Fictional sample data and reproducible checks

`examples/hsc/fictional-district.json` is exported from the maintained `seed()` function in `lib/domain.ts`. It is a synthetic scenario for inspection, not an export of real patients, registered accounts or uploaded documents. Do not import it into a live care network as genuine provider availability.

The broader core fixture contains 30 fictional patients; the judge demo deliberately narrows its session-isolated walkthrough to six patients, three simulated hospitals and five vehicles. The fixed demo scheduling clock keeps the walkthrough usable without repeatedly editing calendar dates. Real registered-provider requests use their actual dated availability and wall-clock freshness checks.

## Where to inspect behavior

| Evidence | File / command |
| --- | --- |
| Maintained core fixture and invariants | `lib/domain.ts` |
| Explicit nearby demo-provider setup | `lib/demo-providers.ts` |
| Judge request and role rules | `lib/judge-demo-actions.ts`, `app/api/demo/route.ts` |
| Domain/eligibility/timezone/privacy regressions | `tests/domain.test.ts`, `npm test` |
| Step-by-step manual choice and stale-resource rejection | `tests/manual-picker.test.ts`, included in `npm test` |
| Registered accounts, roles, documents, messaging, request kinds and transitions | `scripts/security-test.mjs`, `npm run test:api` |
| Synthetic constraint comparisons | `npm run benchmark`, `output/evidence/benchmark.md` |

## Example evaluation cases

- Treatment only: show compatible staffed slots without requiring a vehicle.
- Transport only: use the patient's existing destination and suitable pickup availability without allocating another treatment machine.
- Both: coordinate machine, timing, capability, accessibility, seats, fare and vehicle reservation together.
- Preferred time versus distance: a farther centre fitting the requested time can rank above a nearer centre only available later; distance breaks equally good time fits.
- Stale/closed/broken resources: exclude them rather than invent capacity.
- Competing writes: reject stale revision approval instead of double-booking.
- Completion then a new request: keep the earlier episode in history; do not treat it as underway.
- Privacy: former providers must not acquire current patient details or messaging rights for an unrelated new episode.

The API suite prepares an isolated fictional database and cleans up its test runtime by default. It does not erase the normal local `.wrangler/state` network. Tests and synthetic benchmarks are not evidence of clinical effectiveness or nationwide production readiness.

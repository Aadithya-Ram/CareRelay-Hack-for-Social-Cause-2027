# CareRelay scenario evidence

Generated 2026-10-23T19:25:57.233Z. 30 fictional patients, 3 facilities, 12 vehicles; scenario date 2026-10-17.

These are model results, not clinical outcomes; simulated journeys; individual trips; no global-optimality claim for search-limited rows.

| Scenario | CareRelay feasible | Greedy feasible | Unresolved | Violations | Planner ms | Extra accessible vehicle |
|---|---:|---:|---:|---:|---:|---:|
| Initial district with stale Greenfield report | 20 | 20 | 10 | 0 | 232 | +0 |
| All capacity verified | 24 | 24 | 6 | 0 | 224.3 | +2 |
| Riverside facility closed | 20 | 20 | 10 | 0 | 230.7 | +0 |
| Riverside machine M1 broken | 24 | 24 | 6 | 0 | 283.6 | +2 |
| Accessible van cancellation | 22 | 22 | 8 | 0 | 264 | +2 |
| Fundamental capacity shortage | 6 | 6 | 24 | 0 | 391.2 | +0 |
| No operational facilities | 0 | 0 | 30 | 0 | 1.8 | +0 |
| Constructed flexible-versus-isolation scheduling case | 2 | 1 | 0 | 0 | 1 | +0 |

After a vehicle cancellation, changed accepted commitments: 1 with preservation versus 8 with preservation disabled. The latter is an ablation, not a deployment recommendation.

Runtime varies by host and load. Assignment counts may vary when a bounded search terminates early; stored plans are validated before commitment.

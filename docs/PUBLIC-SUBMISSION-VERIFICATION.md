# Public submission package verification

**Date:** 24 October 2026, Asia/Kolkata.

The public Baloon Hackathon repository is a submission snapshot of the existing CareRelay prototype. Its README explicitly records the 10 October development start and the original development repository. Publishing a snapshot does not assert development occurred only on its upload date.

## Clean-copy setup

A fresh source copy had no installed dependencies, execution-profile settings, environment files, local database or uploaded documents. The following passed on Windows with Node/npm:

- `npm ci`: installed 682 packages.
- `npm run typecheck`: passed.
- `npm test`: 114 passed, zero failed; includes the 864-case request matrix.
- `npm run build`: passed.
- `node scripts/start-local.mjs --no-open`: built, applied local SQL migrations and started the Worker runtime at port 8787.
- Fresh `/api/account` returned `account: null` and `setupAvailable: true`, demonstrating independent empty account state.
- Browser opened `/judge-demo`, logged in with the displayed fictional-demo password and loaded six patients, three hospitals and five vehicles.

No map/API key, Cloudflare account, manually prepared database or private runtime secret was used. Internet and a compatible Node/npm installation remain prerequisites. Full registered-account testing requires the evaluator's own first care-team account at `/setup`; private original accounts are intentionally not shipped.

## Publication review

Tracked source filenames and text were checked for environment/database/private-key files and common credential/token patterns; none were found by that scan. Screenshots were visually reviewed as fictional test/demo records. A pattern scan is not a guarantee against all possible secret formats. The source includes the intended public fictional-demo password, not the hosted registered-account administrator's password.

MIT and third-party notices are retained. The README includes a judge walkthrough, workflow and architecture diagrams, expected-impact qualifications, implementation boundaries and a future roadmap beyond dialysis. Existing application code, matching priorities and runtime dependencies were not changed for this packaging update.

See [the final pipeline audit](FINAL-SUBMISSION-AUDIT-2026-10-24.md) for 414 API checks, dependency security results, hosted browser walkthroughs and remaining clinical/code-quality limitations. They are prior engineering verification results rather than clinical outcomes or proof of universal bug absence.

## Dependency recheck after publication

An anonymous Git clone (credential helper disabled, no GitHub login) successfully downloaded the public snapshot. The initial public GitHub Actions run independently passed install, type checking, 114 tests, production build and API checks on Ubuntu; the advisory scan failed after updated dependency advisories. Patched Zod to 4.6.7 and Undici to 7.30.1, with only the required record-schema syntax adjustments. Local type checking, 114 tests, production build and 402 standard-mode API checks passed afterward; the current advisory scan reports zero known vulnerabilities. Matching logic is unchanged. The final remote CI result is reported separately after its run completes.

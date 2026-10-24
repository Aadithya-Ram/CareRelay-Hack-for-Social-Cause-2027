# Contributing to CareRelay

Use a short branch such as `feature/request-summary` or `fix/provider-confirmation` and open a pull request against `main`. Explain the user-facing change and how you verified it. Keep changes focused and use fictional records for every demonstration or test.

Before opening a pull request, run `npm run typecheck` and `npm test`. Changes to scheduling, permissions, reservations, or provider confirmations should also exercise the isolated API checks with `npm run test:api`. Browser-check the affected patient, care-team, and provider views, including a narrow mobile viewport.

Preserve these workflow rules:

- Registration requests membership; only an approved member's explicit care request enters the care queue.
- Manual and automatic matching must apply the same resource and timing constraints.
- Admin approval proposes an arrangement. Provider confirmation is a separate action.
- Underway journeys and treatments cannot silently change destination.
- Conflicting writes must fail rather than double-book a resource.
- Never commit patient records, uploaded documents, local databases, environment files, access tokens, or production passwords.

See [the request-pipeline audit](docs/REQUEST-PIPELINE-AUDIT.md) and [matching audit](docs/MATCHING-AUDIT.md) before changing scheduling logic. Contributions are provided under the project's [MIT License](LICENSE).

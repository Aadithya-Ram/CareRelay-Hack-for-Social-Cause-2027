# HSC 2027 reviewer guide

**Project:** CareRelay — Connecting Dialysis Slots and Accessible Transport in Tamil Nadu.
**Theme:** Healthcare, Wellbeing & Service Delivery.

This guide maps the actual prototype and its evidence to the participant guidelines, particularly pages 8–10 (repository/submission requirements), 12–13 (judging), and 13–15 (open source, AI and earlier-submission disclosures). It is not a claim of organizer approval or guaranteed selection.

## Inspect in five minutes

1. Open the [shared interactive prototype](https://carerelay-dialysis-continuity.amplewand1.chatgpt.site/judge-demo), use the displayed `admin@123` fictional-demo password and select a perspective. It does not grant access to registered patient accounts. The shared demo may retain an earlier event caption.
2. **Patient:** choose a fictional patient and update a dated request for dialysis, transport or both. Check the preferred-time window and availability acknowledgement.
3. **Admin:** generate suggestions, approve one/all, or open a request and choose a hospital, machine slot and suitable vehicle manually. Compare preferred-time fit before distance. Registration alone does not create a care request.
4. **Hospital / Transport:** choose the assigned provider; inspect the patient/date/exact slot or pickup/contact handover, then accept/confirm the applicable part.
5. **Patient:** the first confirmations update automatically. Record ordered milestones and confirm completion. Inspect history and create a subsequent request. **Admin:** confirm the prior episode remains in Request history.
6. For inboxes, documents and real registered-provider paths, use the registered-account website with your own fictional accounts or the isolated API suite; the judge role switcher is a narrower fictional walkthrough.

## Repository checklist

| Required element | Location |
| --- | --- |
| Complete source | `app/`, `lib/`, `build/`, `components/`, `db/`, `drizzle/`, `scripts/` |
| Setup and environment variables | [Quick start](QUICKSTART.md), environment table below |
| Technical design and diagrams | [Architecture](ARCHITECTURE.md); README workflow/architecture diagrams |
| Sample data | [Sample-data guide](HSC-SAMPLE-DATA.md), `examples/hsc/fictional-district.json`, `lib/domain.ts` |
| Test cases | `tests/`, `scripts/security-test.mjs`, GitHub Actions quality workflow |
| License | MIT in `LICENSE`, third-party notices in `THIRD_PARTY_NOTICES.md` |
| Snapshots | [Screenshot gallery](HSC-SCREENSHOTS.md) |
| Limits and verification | [Final audit](FINAL-SUBMISSION-AUDIT-2026-10-24.md), [clean-copy audit](PUBLIC-SUBMISSION-VERIFICATION.md) |
| Prior publication and AI assistance | [Disclosure record](HSC-DISCLOSURES.md) |

## Local environment

Install Node.js 22.13+ with npm (Node 24 verified); use `Start-CareRelay.bat` on Windows or `node scripts/start-local.mjs --no-open`. First-time setup needs internet. The launcher installs dependencies, builds, applies local migrations and starts port 8787. Use `/judge-demo` for the fictional walkthrough, or `/setup` to create your own first care-team account before testing registered membership/provider flows.

| Setting / binding | Local evaluation | Public deployment |
| --- | --- | --- |
| Environment/secrets file | None required for the fictional/local walkthrough. | Configure your own secrets safely; never commit production credentials. |
| D1 `DB` | Wrangler creates local SQLite state; launcher applies migrations. | Provision a separate D1 binding and apply migrations. |
| R2 `BUCKET` | Emulated local object storage. | Provision a separate R2 binding. |
| `SITES_RUNTIME_ROOT` | Optional path override for tool logs/state; normal users need not set it. | Not an application credential. |
| `CARERELAY_OPERATOR_EMAIL` | Not needed for loopback first-account setup. | Operator restriction uses the hosting-authenticated identity; deploy behind the intended trusted hosting boundary and provision securely. |
| Map API key | No paid key required. Lookup needs network access and external services; manual pin/address entry remains available. | Review service terms and appropriate map/routing arrangements. |

GitHub Pages alone cannot host the server-side API/database. The public source does not ship private accounts, uploads or a hosted admin password. A fork requires its own infrastructure for public deployment; its local demo requires no Cloudflare account.

## Prototype evidence versus expected impact

The recorded final implementation passed 114 domain/manual tests, a matrix of 864 candidate-eligibility combinations, and 402 standard-mode API checks (the earlier 414-check mode included browser fixtures). These are software checks. The eight benchmark scenarios use synthetic data. They do not establish lives saved, missed-session reductions, adoption, clinical effectiveness or production scalability.

A proposed Coimbatore pilot would compare confirmation latency and coordination burden with a consented baseline, record completed/cancelled/unresolved journeys separately, and investigate accessibility failures. Provider partnerships, clinical validation, independent security/privacy review and account-recovery improvements remain necessary before real-patient deployment.

## Remaining submission artifacts

The attached HSC guidelines require a 6–7-slide PPT/PDF (10 MB maximum), using the specified hackathon format. Cover local problem (slides 1–2), solution/architecture (3–4), expected impact/KPIs/scalability/sustainability (5), and team/implementation plus AI disclosure (6–7). Existing Baloon/project presentations are background assets; do not treat them as an HSC-compliant deck without adapting them.

A 3–5-minute, minimum-720p demo video under 80 MB is preferred, not mandatory. Annexure 1, signatures and self-attested student IDs must be supplied by the actual team through the portal; never publish IDs in this repository. Use the prescribed state/team/document naming convention. Confirm the current portal deadline because the supplied PDF retains an older October 15 date while the current public timeline lists October 27.

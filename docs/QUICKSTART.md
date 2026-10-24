# Run CareRelay from a ZIP or fork

## Fastest evaluation: hosted prototype

Open https://carerelay-dialysis-continuity.amplewand1.chatgpt.site/judge-demo and use the displayed fictional-demo password `admin@123`. Choose Admin, Patient, Hospital or Transport. Nothing needs installing for this route.

## Local evaluation with no service credentials

1. Install Node.js 22.13 or newer with npm (Node 24 verified). Initial setup needs internet and several minutes to download/build dependencies.
2. Clone the repo or use GitHub **Code → Download ZIP**, extract it, and open the project folder.
3. On Windows, double-click `Start-CareRelay.bat`. On any supported Node platform, open a terminal in the folder and run:

   ```sh
   node scripts/start-local.mjs --no-open
   ```

4. Wait for **CareRelay is ready**, then open http://127.0.0.1:8787/judge-demo. Enter `admin@123` and choose a perspective.
5. Keep the terminal open; Ctrl+C stops the site. Local records live in ignored `.wrangler/state` and remain across normal restarts.

The launcher installs missing dependencies, builds, applies local SQL migrations and launches the Worker runtime. No `.env` file, Cloudflare login, manually created database, paid map key or copied account credentials are required for local evaluation.

### Registered-account workflow

The judge demo is separate from the registered care network. On a fresh local database:

1. Visit `/setup` and create your own first care-team account. This one-time setup protects ownership; the public repository does not contain an admin's credentials.
2. Use `/signup` for fictional patient, hospital and transport accounts. Complete onboarding/documents, then approve applications as admin.
3. A patient submits a dated care request after membership approval. Registration alone never enters the care queue.
4. Hospitals report readiness and staffed machine slots; drivers report matching dated vehicle availability. Use **Choose manually** or **Suggest**, then approve and confirm through each provider account.
5. For a quick simulated registered-network walkthrough, use the explicit **Load demo hospitals & transport** action on a request. Resources remain labeled simulated.

The public demo password never grants access to the hosted registered-account database. Locally, the existing coordinator also has the documented loopback-only testing shortcut; do not expose a local development server to the internet.

## Development and tests

```sh
npm ci
npm run dev
```

Development preview uses port 5173. For the complete locally migrated registered-account database, use the launcher above. Production-style checks:

```sh
npm run typecheck
npm test
npm run build
npm run test:api
```

API checks use a separate fictional database; they do not erase normal `.wrangler/state` records. Recorded results and known lint debt are in [the audit](FINAL-SUBMISSION-AUDIT-2026-10-24.md).

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Node/npm not found | Install Node with npm, reopen the terminal and check `node --version`. |
| First launch takes time | Dependency download and build are expected; keep the terminal open. |
| Port 8787 is occupied | Stop the other process intentionally or use the running CareRelay instance. The launcher recognizes its account endpoint. |
| No provider options | Check membership, active request, service date/timezone, requirements, fresh readiness, staffed slots, vehicle availability and reservations. |
| No local users after download | Correct: private accounts, uploads and databases are excluded. Create your own accounts or use the judge demo. |
| Flat number isn't autofilled | Map data may lack the exact unit. Verify and type it yourself. |
| Map lookup fails | Network/third-party services may be unavailable; use manual address/pin entry. No paid key is required. |

## Hosting your own copy

Local evaluation is self-contained; public hosting is separate. The hosting manifest identifies the original Site but grants no write access. A fork needs its own Cloudflare-compatible deployment, D1 `DB` and R2 `BUCKET` bindings, migrations and secure operator provisioning. Do not reuse production secrets or disable role checks. A GitHub repository alone cannot execute this server-side app as a GitHub Pages site.

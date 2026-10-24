# Judge demonstration role walkthrough

21 October 2026

The judge entry page now has responsive navigation and Admin, Patient, Hospital and Transport perspectives. All perspectives share the browser's isolated fictional district. The displayed demo password remains admin@123. Registered accounts use the separate account sign-in link.

The matching algorithm, candidate ordering and reservation rules are unchanged. Demo role commands delegate to the existing domain commands with the selected participant's actor identity. The patient request action validates the request window and destination, requires acknowledgement, invalidates clinical verification for renewed review, and prevents a new request during an active approved arrangement.

## Verification

- 288 isolated API checks passed, including wrong-provider rejection, patient permission boundaries, hospital acceptance, driver confirmation, ordered patient milestones, completion history and creation of a subsequent request.
- TypeScript checking and production build passed.
- Browser walkthrough passed: patient request update → admin verification → automatic suggestion and individual approval → assigned hospital acceptance → driver confirmation → patient progress → completion confirmation → history and new-request availability.
- Demo records and commands remain separate from registered accounts and uploads. No real appointment, message, payment or clinical outcome was generated.

The submitted PPT remains unchanged. Its prototype URL continues to point to the updated website. Tests provide evidence for the tested paths, not a guarantee that every possible condition is covered.

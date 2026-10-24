# Product rework - October 11, 2026

The initial hackathon role-switching demo has been replaced by a product-facing experience. The public-facing home route explains benefits and the journey, with responsive layouts, smooth anchor navigation, entrance animations and reduced-motion support. The existing hosted preview remains owner-private; its platform sign-in gate is separate from CareRelay accounts.

## Account boundary

- Email/password accounts; unique normalized email, PBKDF2-SHA256 password hashing with a unique salt, random 256-bit session credentials stored only as hashes, HttpOnly/SameSite cookies and 24-hour expiry. HTTPS responses add Secure.
- Immutable server-side role, entity and approval state. Posted role/entity selectors cannot grant authority. District endpoints reject anonymous and unapproved users.
- Patients see their own records. Approved facilities see their facility and its requests. Drivers see their approved vehicle and assigned trips, excluding unaccepted proposals. Provider documents can only be downloaded by their owner or the reviewing coordinator.
- Same-origin mutations, input validation, password-attempt throttling, scoped actions and revision-based district updates.
- Public registration supports patient, facility and transport roles. Initial coordinator setup is restricted to loopback or the verified hosting-platform owner, and limited to one account by a unique database index. There is no default password. The hosted owner email is configured privately in runtime settings; the server compares trusted platform identity before allowing setup. No general visitor can use coordinator signup.

## Onboarding and review

Patient onboarding records contact/accessibility/assistance needs and agreement. Treatment requirements remain unverified until staff review. Patients can update their practical profile without replacing staff-defined clinical values; doing so requires renewed review.

Hospital applications include organization/registration details, contact information, accessibility, staffing and a facility-licence document. Driver applications include vehicle/driver identifiers, capability, seating, current insurance expiry, boarding assistance and driving-licence, registration and insurance documents. Required uploads use R2, are private and limited to PDF/PNG/JPEG, 2 MB each. File signatures are checked. Approval requires the relevant document types and a recorded human review decision. A signature check is not malware scanning or authenticity verification.

Approved resources initially remain non-operational until the provider confirms actual capacity/availability. Approved drivers can update availability/fare/payer, but cannot upgrade vehicle capability or seating through a forged request. Such changes require renewed review. Insurance expiry is checked on vehicle updates.

## Product workspaces

- Patients: clear next-step card, their practical needs/contact details, agreement, own arrangement and milestone timeline.
- Transport: approval status, approved vehicle, availability/funding form and assigned trips with confirmation/departure/arrival controls.
- Facilities: a dedicated facility workspace with their resources, slots, requests and treatment controls; unrelated navigation is removed.
- Care team: provider review, then the specialized planning/recovery workbench. Practice scenarios are available only here.

The active care network starts empty. It uses new shared network data rather than exposing the old seeded demonstration or joining accounts by patient name. The original 30-patient synthetic scenarios remain in separate coordinator practice mode. Old local records are preserved under their original keys.

## Public launch boundaries

This is a functional product preview, not a certified healthcare deployment. Before taking real patient data or identity documents, the operator still needs domain/public-host access, hosted administrator provisioning, verified email/account recovery delivery, formal consent/privacy/retention/deletion procedures, malware/document-authenticity checks, clinical/transport/legal validation and a security review. The scheduling model remains a bounded single-day model with simulated travel and explicitly advanced scenario time; live traffic, provider booking, notifications, payments and earnings settlement are not integrated. Marketing does not claim fabricated customers, clinical outcomes or guaranteed driver earnings.

New migrations append accounts, sessions, document metadata, authentication limits and the unique coordinator index. All original migrations are preserved. The Windows launcher applies the append-only table/index migrations idempotently on restart. API security tests create isolated state under the ignored runtime directory.

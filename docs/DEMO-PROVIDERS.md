# Demonstrating assignments without real providers

1. Register a patient, submit their profile and approve membership in **Applications → Patients**.
2. In the patient portal, submit a dated treatment, transport or combined request. A future date leaves enough time for the demonstration. Transport-only requests also need the existing destination pin.
3. Open the registered-account admin **Care desk**. In **Demo hospitals & transport**, select the request and click **Load demo hospitals & transport**. The same control is available inside the patient details and **Capacity & transport**.
4. Review and verify the request. Select **Choose manually** to see ranked choices, or **Suggest assignments** for the automatic planner. Individual and bulk approvals work as usual.
5. Record simulated provider agreement in **Approved arrangements**. These are mock providers with no separate login, real phone number, payment or booking.

A pickup, date and timezone share one reusable demo resource set. Each setup supplies three hospitals approximately 1.2, 3.5 and 7 km from the pickup, two machines per hospital, and a passenger car, accessible van and medical vehicle. All have caregiver seating and boarding assistance; wheelchair/medical vehicles have wheelchair space. Simulated funding makes fares zero. Hospitals include accessible routes and standard/isolation capability; the middle centre offers standard treatment only. Availability is 00:00–23:59 on the selected appointment date and timezone. Actual time, duration, turnaround, staffing and reservation checks still apply.

Resources are explicitly labelled **Demo** and stored durably in the same care network. There is no separate sample patient list. Only the appointment explicitly selected for demo setup may use these resources; that appointment uses simulated providers exclusively. A new appointment episode must opt in again. Loading the same patient/date/pin/timezone twice reuses the existing resources and refreshes their simulated report; it does not duplicate resources, approve membership, verify clinical details, reset closures or alter bookings. Patient screens display a demonstration notice.

No paid map service is required. The demo coordinates are synthetic offsets from the patient's existing map pin; they are not listings of legitimate treatment providers. The worldwide centre directory remains separate.

Verification: 77 domain checks passed, including all service kinds, manual/automatic matching, repeat loading, existing-data preservation, reservation collisions, access control and worldwide pins. Expanded isolated API checks verify persistence, revision conflicts, patient scoping and approved demo arrangements. See the task delivery report for final API and browser results.



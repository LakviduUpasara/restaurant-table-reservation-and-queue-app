# Functional and usability test plan

**Execution status:** TypeScript checking has been run; the cases below require a configured Supabase project and device. Record date, tester, build, actual result, pass/fail, defect ID, and evidence link when executed. Do not mark an unrun case as passed.

| ID | Requirement | Steps | Expected result |
|---|---|---|---|
| FT-01 | C-FR-01 | Choose a restaurant, date, time, and party size; change a table to unavailable as staff. | Available list refreshes and excludes the unavailable table; timestamp updates. |
| FT-02 | C-FR-02, 06, 08 | Reserve a valid table with a special request; review bookings and notifications. | One confirmed reservation persists with matching table/time/party/request and one confirmation. |
| FT-03 | C-FR-07 | Change an upcoming booking, then cancel it. Try changing a past or seated booking. | Valid update persists; cancellation releases the slot; invalid changes are rejected. |
| FT-04 | C-FR-03, 04 | Join two customers to the same queue. Cancel the first. | Both see correct position; the second moves to position 1 after cancellation. |
| FT-05 | C-FR-05 | Staff marks a waiting party table-ready on a configured push device. | Customer sees a prominent in-app state and one notification; push arrives on the device. |
| FT-06 | C-FR-06, M-FR-05 | Set reminder minutes; run authenticated notification job at due time and again. | One reminder is stored and sent; repeat job does not duplicate it. |
| FT-07 | S-FR-01, 04, 07, 08 | Search today's reservation, mark Arrived then Seated; try with customer token. | Staff sees details and status changes; customer is denied staff action. |
| FT-08 | S-FR-02, 05 | Add a walk-in with name, party size and estimated wait, then update wait. | Ordered queue and revised estimate persist. |
| FT-09 | S-FR-03, 04 | Set occupied table Cleaning then Available; attempt conflicting table assignment from two sessions. | Table status reaches both apps; only one party can be seated. |
| FT-10 | S-FR-06 | Notify next queue party, then seat at a suitable available table. | Queue, table, and customer alert agree; mismatched capacity is rejected. |
| FT-11 | C-FR-09, 10 | Add two menu items, review cart, place pre-order, attempt unavailable product. | Order and item prices persist atomically; unavailable item is rejected. |
| FT-12 | M-FR-01, 04, 06 | Inspect overview and daily summary after bookings, cancellations, and queue updates. | Counts and average wait reflect saved records. |
| FT-13 | M-FR-02, 03, 05 | Change opening hours, slots, capacity, grace and reminder settings; exceed slot capacity. | Settings persist; booking outside rules or over capacity fails. |
| FT-14 | M-FR-07 | Invite staff, edit details, revoke access; retry API call with revoked account. | Staff invite and edits persist; revoked account loses operations access. |
| FT-15 | Security | Use customer token for owner routes; request another customer's reservations/queue. | API returns 403 or only the caller's data. Service role key is absent from app bundle. |
| FT-16 | Connectivity | Disconnect network while viewing queue/tables, then reconnect. | Error or last-update state is visible, retry works, and no duplicate write occurs. |

## Usability sessions

Recruit at least five real or proxy participants across Customer, Staff, and Owner roles. Use Milestone 02 tasks T1–T14 on the **working apps**. Obtain consent, record task completion, time, notable errors, SEQ, SUS, and comments. Track defects with severity and evidence; retest fixes. The report must state the actual sample and results, not reuse prototype results as app results.

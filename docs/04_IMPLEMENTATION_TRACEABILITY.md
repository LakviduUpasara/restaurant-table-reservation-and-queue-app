# Requirement to implementation traceability

The screen IDs come from Milestone 02. The API is the source of truth for all writes. The live test status remains pending until a Supabase development project and devices are available.

| Requirement | Prototype | Working interface and API | Functional test |
|---|---|---|---|
| C-FR-01 availability | CS-09, CS-12 | Home and Available tables; `GET /restaurants/:id/availability` | FT-01 |
| C-FR-02 reservation | CS-10–12, CS-14 | Booking steps; `POST /reservations` | FT-02 |
| C-FR-03 virtual queue | CS-13 | Join queue; `POST /queue` | FT-04 |
| C-FR-04 position/wait | CS-13 | Queue progress; `GET /queue`, Realtime | FT-04 |
| C-FR-05 table-ready alert | CS-13 | Queue progress, notifications, Expo push; staff `PATCH /queue/:id` | FT-05 |
| C-FR-06 confirmation/reminder | CS-14 | Booking confirmation, notification centre, scheduled reminder endpoint | FT-02, FT-06 |
| C-FR-07 change/cancel | CS-10–14 | Bookings, booking steps; `PATCH /reservations/:id` | FT-03 |
| C-FR-08 special request | gap | Booking review field; reservation request | FT-02 |
| C-FR-09 digital menu | CS-15–16 | Menu and item details; `GET /products` | FT-11 |
| C-FR-10 pre-order | CS-15–17 | Cart and checkout; `POST /orders` | FT-11 |
| S-FR-01, 08 reservations/search | ST-02, ST-06 | Reservations list/search; `GET /reservations` | FT-07 |
| S-FR-02 walk-ins | ST-05, ST-07 | Walk-in form; `POST /queue` | FT-08 |
| S-FR-03 table status | ST-03–04 | Table status; `GET/PATCH /tables` | FT-09 |
| S-FR-04 arrival/seating/no-show | ST-06, ST-08 | Reservation status controls; `PATCH /reservations/:id` | FT-07 |
| S-FR-05 wait estimate | ST-05, ST-07 | Labelled wait field; `PATCH /queue/:id` | FT-08 |
| S-FR-06 notify | ST-05, ST-08 | Queue Notify action; notification record and push | FT-10 |
| S-FR-07 customer details | ST-06–08 | Reservation/queue cards; role-checked API | FT-07, FT-08 |
| M-FR-01 overview | OW-02–05 | Owner dashboard with reservation, queue, table counts | FT-12 |
| M-FR-02 opening/slots | OW-12, gap | Booking settings; `GET/PATCH /settings/:id` | FT-13 |
| M-FR-03 capacity | gap | Booking settings; atomic reservation limit | FT-13 |
| M-FR-04 cancellation/no-show | OW-06, OW-08 | Reservation statuses, daily summary | FT-12 |
| M-FR-05 grace/reminders | gap | Booking settings and reminder job | FT-06, FT-13 |
| M-FR-06 metrics | OW-02 partial | Daily summary; `GET /analytics/:id` | FT-12 |
| M-FR-07 staff access | OW-09–11 | Invite, edit, revoke; `/staff` | FT-14 |

## CRUD evidence by data interface

| Interface | Two or more meaningful operations |
|---|---|
| Customer booking | Create reservation; read, change, and cancel reservation |
| Customer queue | Create and read entry; cancel entry |
| Customer menu/cart | Read products; create and read order; cancel order through API |
| Customer profile/notifications | Read and update profile; read and mark notifications |
| Staff reservations | Read/search and update status |
| Staff queue/walk-ins | Create and read entries; update wait/notify/seat/no-show |
| Staff tables | Read and update status |
| Owner staff | Invite/create, read, edit, revoke access |
| Owner products | Create, read, update price, hide/show |
| Owner settings | Read and update rules |

Splash, onboarding, login, and static confirmation screens do not own records. The coordinator should confirm that the assignment's “two CRUD operations per interface” rule applies to data-bearing screens rather than requiring artificial writes on static screens.

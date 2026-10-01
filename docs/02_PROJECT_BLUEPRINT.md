# DineFlow Project Blueprint

## 1. Development Constraints

Team Size: 4 developers
Development Time: 7 days

Priority:
Build a stable end-to-end implementation of the required
DineFlow functionality.

Do not introduce unnecessary technologies, services,
microservices or architectural complexity.


==================================================
2. APPLICATION ARCHITECTURE
==================================================

The system consists of TWO separate React Native applications.

APP 1:
DineFlow Customer

APP 2:
DineFlow Operations

The Operations application supports:
- Staff
- Owner

Staff and Owner use the same login application.
The authenticated user's role determines accessible screens.


Architecture:

Customer App
     |
     | REST API
     v
Node.js API
     |
     v
Supabase PostgreSQL
     ^
     |
Operations App


Supabase services are used for:

- PostgreSQL database
- Authentication
- Realtime
- Storage

Node.js is used for:

- Business logic
- Validation
- Reservation logic
- Queue logic
- Authorization checks
- Protected operations
- API endpoints


==================================================
3. TECHNOLOGY STACK
==================================================

Mobile:
- React Native
- Expo
- TypeScript
- Expo Router

State:
- Zustand

Server State:
- TanStack Query

Forms:
- React Hook Form
- Zod

Backend:
- Node.js
- Express.js
- TypeScript

Database:
- PostgreSQL hosted by Supabase

Authentication:
- Supabase Auth

Realtime:
- Supabase Realtime

Storage:
- Supabase Storage

Notifications:
- Expo Notifications

Backend Deployment:
- Vercel

Mobile Build:
- Expo EAS

Version Control:
- Git
- GitHub


==================================================
4. DATA FLOW RULE
==================================================

For important business operations:

React Native
      |
      v
Node.js API
      |
      v
Supabase PostgreSQL


Examples:

Create Reservation
Join Queue
Assign Table
Change Reservation Status
Staff Management
Owner Protected Operations


Realtime subscriptions may communicate directly between
the React Native applications and Supabase Realtime.


==================================================
5. DATABASE SOURCE OF TRUTH
==================================================

There is ONE shared PostgreSQL database.

Primary entities:

- profiles
- restaurants
- restaurant_staff
- tables
- reservations
- queue_entries
- products
- orders
- order_items
- notifications
- restaurant_settings


Roles:

CUSTOMER
STAFF
OWNER


Table Status:

AVAILABLE
RESERVED
OCCUPIED
CLEANING
UNAVAILABLE


Reservation Status:

PENDING
CONFIRMED
ARRIVED
SEATED
COMPLETED
CANCELLED
NO_SHOW


Queue Status:

WAITING
NOTIFIED
TABLE_READY
SEATED
CANCELLED
NO_SHOW


==================================================
6. DEVELOPMENT STRATEGY
==================================================

Do NOT build the main system using hard-coded mock data.

Use real Supabase development data.

Development sequence:

1. Create database schema.
2. Configure relationships.
3. Configure Supabase Auth.
4. Create real seed/test records.
5. Freeze API contracts.
6. Build frontend and backend in parallel.
7. Integrate each module immediately.
8. Add realtime behavior.
9. Perform integration testing.


Seed/test records are allowed.

Examples:

- Development restaurant
- Owner account
- Staff account
- Customer account
- Restaurant tables
- Menu products
- Test reservation

Seed data must exist in the actual development database
and must not be hard-coded into UI components.


==================================================
7. API DESIGN RULES
==================================================

Base structure:

/api/reservations
/api/queue
/api/tables
/api/products
/api/staff
/api/restaurants
/api/settings
/api/notifications
/api/analytics


API responses should follow one format:

Success:

{
  "success": true,
  "data": ...
}


Error:

{
  "success": false,
  "error": {
    "code": "...",
    "message": "..."
  }
}


==================================================
8. SECURITY
==================================================

Never expose Supabase service-role credentials
inside either React Native application.

Public frontend environment variables may contain
only frontend-safe configuration.

Protected database operations must occur through
authorized backend logic.

Every protected API request must verify authentication.

Authorization:

CUSTOMER:
Customer functionality only.

STAFF:
Restaurant operational functionality.

OWNER:
Operational + management functionality.


==================================================
9. CRITICAL BUSINESS RULES
==================================================

### Reservation

Never allow conflicting reservations for the
same table/time period.

Before creating a reservation:

1. Validate user.
2. Validate restaurant.
3. Validate date/time.
4. Validate party size.
5. Check operating hours.
6. Check table capacity.
7. Check availability/conflict.
8. Create reservation.


### Queue

Only one active queue entry should exist for the same
customer/restaurant unless explicitly permitted.

Queue changes must update the customer experience.

When table becomes ready:

Staff action
   ->
Database update
   ->
Realtime update
   ->
Customer notification


### Table

Every table must have a single current status.

Status changes must stay synchronized between
Customer and Operations applications.


==================================================
10. USER EXPERIENCE RULES
==================================================

Implement:

- Loading states
- Empty states
- Error states
- Success feedback
- Confirmation dialogs for destructive actions
- Form validation
- Network failure feedback

Never silently fail.

Table-ready notification must be highly visible.

Password recovery must be straightforward.

Estimated waiting-time input must be understandable.

Product forms must contain price.


==================================================
11. FOLDER ARCHITECTURE
==================================================

dineflow/
|
├── apps/
|   ├── customer-app/
|   └── operations-app/
|
├── backend/
|
├── packages/
|   └── shared/
|
├── supabase/
|
└── docs/


Do not create another frontend application.

Do not create another backend.

Do not create microservices.

Do not move modules outside this architecture
without explicit team approval.


==================================================
12. TEAM OWNERSHIP
==================================================

Member 1:
Customer authentication + reservation
+ reservation backend

Member 2:
Customer queue + menu + notifications
+ associated backend

Member 3:
Staff operations
+ reservations/walk-ins/queue/tables

Member 4:
Owner features
+ core database/auth setup

Shared changes require communication before merge.


==================================================
13. PROJECT PRIORITY
==================================================

Priority 1:
Authentication

Priority 2:
Reservation end-to-end

Priority 3:
Queue end-to-end

Priority 4:
Staff table operations

Priority 5:
Owner staff/product management

Priority 6:
Realtime + notifications

Priority 7:
Analytics/polish
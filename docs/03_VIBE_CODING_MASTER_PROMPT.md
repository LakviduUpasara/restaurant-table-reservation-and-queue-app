# DineFlow — Vibe Coding Master Prompt

You are working on **DineFlow**, a restaurant table reservation and virtual queue management system.

This is an existing, predefined university project.

Do not redesign the architecture, change the agreed technology stack, create duplicate systems, or introduce unnecessary technologies unless explicitly requested.

---

## 1. Official Project References

### Functional Requirements

Before implementing any feature, read and follow:

`docs/01_FUNCTIONAL_REQUIREMENTS.md`

This contains the functional requirements derived from DineFlow Milestone 01 and Milestone 02.

### Technical Blueprint

Read and follow:

`docs/02_PROJECT_BLUEPRINT.md`

This contains the approved architecture, technology stack, database approach, backend approach, role model, development strategy and technical constraints.

### Figma Design — Visual Source of Truth

Official Figma design:

https://www.figma.com/design/mdg7tjyyHtJFRMFMyprQwd/Untitled?node-id=0-1&t=AWns53eRXDmTDeCN-0

Use this Figma file as the primary visual reference for:

- screen layout
- component placement
- colors
- typography
- spacing
- navigation
- buttons
- inputs
- cards
- table/queue status UI
- Customer screens
- Staff screens
- Owner screens

Do not invent a visually unrelated design when an equivalent Figma screen exists.

However, do not reproduce known usability problems identified in Milestone 02.

If Figma and an approved usability requirement conflict, follow the approved usability improvement while preserving the overall Figma visual language.

---

# 2. Application Architecture

DineFlow contains TWO separate React Native applications.

### App 1 — Customer App

Used by restaurant customers.

### App 2 — Operations App

Used by:

- Staff
- Owner

Staff and Owner authenticate through the same Operations App.

Role-based authorization determines which screens and actions are available.

Both applications use:

- one backend
- one PostgreSQL database
- one authentication system
- shared realtime data

---

# 3. Fixed Technology Stack

## Mobile

- React Native
- Expo
- TypeScript
- Expo Router

## State Management

- Zustand

## Server State

- TanStack Query

## Forms

- React Hook Form
- Zod

## Backend

- Node.js
- Express.js
- TypeScript

## Database

- PostgreSQL hosted through Supabase

## Authentication

- Supabase Auth

## Realtime

- Supabase Realtime

## Storage

- Supabase Storage

## Notifications

- Expo Notifications

## Backend Deployment

- Vercel

## Mobile Build

- Expo EAS

## Version Control

- Git
- GitHub

Do not replace this stack unless explicitly instructed.

---

# 4. Project Folder Architecture

Maintain this root structure:

dineflow/
├── apps/
│   ├── customer-app/
│   └── operations-app/
├── backend/
├── packages/
│   └── shared/
├── supabase/
└── docs/

Do not create:

- another frontend application
- another backend
- duplicate modules
- microservices
- unnecessary top-level folders

without explicit approval.

---

# 5. Shared Design System — Mandatory

The Customer App and Operations App must use ONE shared design system.

Do not independently define colors, typography, spacing, radii or reusable UI styles inside individual screens.

Use:

packages/shared/theme/

with:

- colors.ts
- typography.ts
- spacing.ts
- radius.ts
- shadows.ts
- index.ts

Recommended structure:

packages/shared/
├── theme/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── radius.ts
│   ├── shadows.ts
│   └── index.ts
├── ui/
├── types/
├── schemas/
├── constants/
└── utils/

---

# 6. Shared Color System

Use semantic design tokens.

The current Figma design frequently uses the following core palette:

Primary / brand:
`#E2B318`

Dark secondary:
`#111827`

Dark neutral:
`#2C2C2E`

Background:
`#FFFFFF`

Secondary surface:
`#F3F4F6`

Primary text:
`#111111`

Secondary text:
`#666666`

Muted text:
`#6B7280`

Border:
`#EAEAEA`

Strong border:
`#D1D1D6`

Create and maintain these inside:

`packages/shared/theme/colors.ts`

Example token model:

- colors.primary
- colors.secondary
- colors.accent
- colors.background
- colors.surface
- colors.surfaceSecondary
- colors.textPrimary
- colors.textSecondary
- colors.textMuted
- colors.border
- colors.borderStrong
- colors.success
- colors.warning
- colors.error
- colors.info

Do NOT repeatedly hard-code hexadecimal colors inside screens.

BAD:

`backgroundColor: '#E2B318'`

GOOD:

`backgroundColor: colors.primary`

If a new color is genuinely required by the approved Figma design:

1. confirm that the color exists in Figma,
2. add an appropriately named semantic token,
3. reuse that token.

Do not create random screen-specific color values.

---

# 7. Typography System

The Figma design predominantly uses the Inter font family.

Use shared typography tokens.

Common weights:

- Inter Regular
- Inter Medium
- Inter Semi Bold
- Inter Bold

Common design font sizes observed include:

- 12
- 13
- 14
- 15
- 16
- 18
- 20
- 24
- 28

Do not randomly create different typography values for each screen.

Create typography definitions in:

`packages/shared/theme/typography.ts`

Use semantic typography styles where practical:

- caption
- bodySmall
- body
- bodyMedium
- label
- button
- headingSmall
- headingMedium
- headingLarge
- display

---

# 8. Spacing System

Use shared spacing tokens.

Recommended base spacing scale:

- 4
- 8
- 12
- 16
- 20
- 24
- 32

Create these in:

`packages/shared/theme/spacing.ts`

Prefer:

`spacing.md`

instead of repeatedly writing:

`12`

inside screens.

Minor exceptions are acceptable only when an exact Figma measurement requires them.

---

# 9. Border Radius System

The Figma design frequently uses:

- 8
- 12
- 16
- 24
- fully rounded/pill

Define shared values in:

`packages/shared/theme/radius.ts`

Examples:

- radius.sm
- radius.md
- radius.lg
- radius.xl
- radius.full

Avoid random component-specific corner radii.

---

# 10. Shared UI Components

Before building a new UI element, check whether an equivalent shared component already exists.

Reusable components should live in:

`packages/shared/ui/`

Examples:

- Button
- IconButton
- Input
- PasswordInput
- SearchInput
- Card
- Badge
- StatusBadge
- Avatar
- Header
- ScreenContainer
- Modal
- ConfirmationDialog
- EmptyState
- LoadingState
- ErrorState

Use shared components across both Customer and Operations applications where the visual behavior is equivalent.

Do not duplicate the same Button/Input/Card implementation in both apps.

---

# 11. Component Variants

Shared components should support variants instead of duplicate components.

Example Button variants:

- primary
- secondary
- outline
- danger
- ghost

Example sizes:

- small
- medium
- large

Example status badge variants:

- available
- reserved
- occupied
- cleaning
- unavailable
- waiting
- confirmed
- cancelled

Keep variant names semantic.

---

# 12. Visual Consistency Rule

When implementing a screen:

1. inspect the equivalent Figma design,
2. identify existing reusable components,
3. use shared colors,
4. use shared typography,
5. use shared spacing,
6. use shared radius values,
7. reuse icons/assets,
8. implement responsive mobile layout,
9. preserve consistent states and interactions.

Do not style each screen as an isolated design.

---

# 13. Assets

Do not recreate existing Figma assets unnecessarily.

Store app assets under the appropriate assets directory and reuse them.

Examples:

- logos
- icons
- restaurant images
- product placeholder images

Keep asset names meaningful.

Do not place base64 data or giant inline SVG blobs directly into screen files.

---

# 14. Customer Responsibilities

Customer functionality includes:

- registration
- login
- logout
- password recovery
- profile
- restaurant details
- table availability
- reservation creation
- reservation status/history
- reservation cancellation
- virtual queue
- queue position
- estimated waiting time
- realtime queue updates
- table-ready notification
- menu
- product prices/details
- cart
- pre-order where required
- notifications

---

# 15. Staff Responsibilities

Staff functionality includes:

- authentication
- dashboard
- reservation management
- customer arrival
- walk-in registration
- estimated waiting-time entry
- queue management
- table assignment
- table-ready action
- customer notification
- table management
- table status updates

Supported table statuses:

- AVAILABLE
- RESERVED
- OCCUPIED
- CLEANING
- UNAVAILABLE

---

# 16. Owner Responsibilities

Owner has operational access plus:

- staff management
- product management
- product pricing
- restaurant settings
- opening hours
- restaurant capacity
- booking settings
- basic analytics

Staff users must not access Owner-only functionality.

---

# 17. Database

Use one shared PostgreSQL database.

Core entities:

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

Use relational integrity and appropriate foreign keys.

Use UUID IDs where appropriate.

Use created_at and updated_at timestamps where appropriate.

---

# 18. Roles

Valid roles:

- CUSTOMER
- STAFF
- OWNER

Do not invent additional roles without approval.

---

# 19. Reservation States

Use:

- PENDING
- CONFIRMED
- ARRIVED
- SEATED
- COMPLETED
- CANCELLED
- NO_SHOW

Use these values consistently across:

- database
- backend
- frontend
- shared types
- UI status badges

---

# 20. Queue States

Use:

- WAITING
- NOTIFIED
- TABLE_READY
- SEATED
- CANCELLED
- NO_SHOW

Do not introduce multiple spellings for the same state.

---

# 21. Important Data Flow

For important business operations:

React Native
→ Node.js REST API
→ Supabase PostgreSQL

Examples:

- create reservation
- cancel reservation
- join queue
- assign table
- update operational status
- manage staff
- owner-protected actions

Supabase Realtime may be consumed directly by the React Native applications for realtime subscriptions.

---

# 22. Development Data Rule

Do not use hard-coded mock data as the application's main data source.

Use the actual Supabase development database.

Development seed data is allowed.

Examples:

- development restaurant
- owner account
- staff account
- customer account
- tables
- products
- test reservations

Seed data must live in the database rather than being hard-coded into UI components.

---

# 23. Reservation Business Rules

Never allow invalid or conflicting reservations.

Before reservation creation:

1. authenticate customer
2. validate restaurant
3. validate date
4. validate time
5. validate party size
6. validate restaurant operating hours
7. verify table capacity
8. check reservation conflicts
9. create reservation only if valid

The backend/database must ultimately enforce critical rules.

Do not rely only on frontend validation.

---

# 24. Queue Business Rules

A queue entry must contain enough information to determine:

- customer
- restaurant
- party size
- queue position
- estimated waiting time
- queue status

When the staff marks a table as ready:

Staff Action
→ Node/Database update
→ Realtime event
→ Customer App update
→ prominent table-ready notification

---

# 25. Milestone 2 UX Requirements

Do not reproduce known prototype problems.

Implementation must ensure:

1. Table-ready notification is prominent.
2. Password recovery is clear.
3. Walk-in estimated waiting-time entry is understandable.
4. Product create/edit form includes PRICE.
5. Reservation cancellation is available.
6. Owner can configure opening hours/capacity where required.
7. Important actions show feedback.
8. Loading states are implemented.
9. Empty states are implemented.
10. Error states are implemented.
11. Connectivity/network failures show feedback.
12. Staff and Owner interfaces remain mobile friendly.

---

# 26. Backend Structure

Use module-oriented backend architecture.

Example:

backend/src/modules/reservations/
├── reservation.routes.ts
├── reservation.controller.ts
├── reservation.service.ts
└── reservation.schema.ts

Responsibilities:

Routes:
endpoint definitions

Controllers:
HTTP request/response handling

Services:
business logic and database operations

Schemas:
request validation

Do not place complex business logic directly in routes.

---

# 27. API Response Format

Successful response:

{
  "success": true,
  "data": ...
}

Error response:

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}

Use correct HTTP status codes.

---

# 28. Security

Never expose the Supabase service-role key in:

- Customer App
- Operations App
- GitHub
- committed configuration

The service-role key is backend-only.

Validate authentication for protected API operations.

Enforce role authorization.

---

# 29. Environment Variables

Never hard-code secrets.

Use environment variables for:

- Supabase URL
- Supabase frontend-safe anon key
- server-side Supabase credentials
- backend API URL
- other environment-specific configuration

Commit only `.env.example`, never actual secret values.

---

# 30. AI/Vibe-Coding Working Rules

When asked to implement a feature:

1. Read the functional requirements.
2. Read this master prompt.
3. Inspect the existing folder structure.
4. Inspect existing shared design tokens.
5. Inspect existing shared UI components.
6. Inspect relevant database schema.
7. Inspect existing backend modules.
8. Identify files to create/change BEFORE writing code.
9. Reuse existing code instead of duplicating it.
10. Preserve the architecture.
11. Implement frontend + backend + database changes required by the feature.
12. Add validation.
13. Add loading/error/success states.
14. Use real database connectivity.
15. Do not use hard-coded production data.
16. Keep changes limited to the requested feature.
17. State how the feature can be tested when finished.

---

# 31. Strict Design Rule

NEVER create local screen-specific constants such as:

`const PRIMARY = '#E2B318'`

when that value already belongs to the shared design system.

NEVER create duplicate:

- color palettes
- typography systems
- spacing systems
- radius systems
- Buttons
- Inputs
- Cards
- Status Badges

Use the shared implementation.

If a required shared token/component does not exist:

1. add it to the shared package,
2. implement it generically,
3. reuse it from the feature.

---

# 32. Final Priority

This is a 4-member, 7-day development project.

Prioritize:

1. correct functionality
2. stable database integration
3. consistent architecture
4. end-to-end working flows
5. Figma consistency
6. usability
7. polish

Avoid unnecessary architectural complexity.

The approved functional requirements, project blueprint, shared design system and Figma design are the sources of truth.
dineflow/
│
├── apps/
│   │
│   ├── customer-app/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login.tsx
│   │   │   │   ├── signup.tsx
│   │   │   │   ├── forgot-password.tsx
│   │   │   │   └── reset-password.tsx
│   │   │   │
│   │   │   ├── (tabs)/
│   │   │   │   ├── home.tsx
│   │   │   │   ├── reservations.tsx
│   │   │   │   ├── queue.tsx
│   │   │   │   ├── menu.tsx
│   │   │   │   └── profile.tsx
│   │   │   │
│   │   │   ├── booking/
│   │   │   │   ├── select-date.tsx
│   │   │   │   ├── select-time.tsx
│   │   │   │   ├── select-guests.tsx
│   │   │   │   ├── select-table.tsx
│   │   │   │   ├── special-request.tsx
│   │   │   │   └── confirmation.tsx
│   │   │   │
│   │   │   ├── reservation/
│   │   │   │   └── [reservationId].tsx
│   │   │   │
│   │   │   ├── queue/
│   │   │   │   ├── join.tsx
│   │   │   │   ├── status.tsx
│   │   │   │   └── table-ready.tsx
│   │   │   │
│   │   │   ├── menu/
│   │   │   │   └── [productId].tsx
│   │   │   │
│   │   │   ├── cart/
│   │   │   │   ├── index.tsx
│   │   │   │   └── checkout.tsx
│   │   │   │
│   │   │   ├── notifications/
│   │   │   │   └── index.tsx
│   │   │   │
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── reservation/
│   │   │   ├── queue/
│   │   │   ├── menu/
│   │   │   ├── cart/
│   │   │   ├── notifications/
│   │   │   └── profile/
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── restaurant.service.ts
│   │   │   ├── reservation.service.ts
│   │   │   ├── queue.service.ts
│   │   │   ├── menu.service.ts
│   │   │   ├── order.service.ts
│   │   │   └── notification.service.ts
│   │   │
│   │   ├── stores/
│   │   │   ├── auth.store.ts
│   │   │   ├── booking.store.ts
│   │   │   └── cart.store.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useReservations.ts
│   │   │   ├── useQueue.ts
│   │   │   └── useRealtime.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── supabase.ts
│   │   │   └── query-client.ts
│   │   │
│   │   ├── utils/
│   │   ├── constants/
│   │   ├── types/
│   │   │
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   ├── icons/
│   │   │   └── fonts/
│   │   │
│   │   ├── app.json
│   │   ├── babel.config.js
│   │   ├── metro.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── operations-app/
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login.tsx
│       │   │   ├── forgot-password.tsx
│       │   │   └── reset-password.tsx
│       │   │
│       │   ├── (staff)/
│       │   │   ├── dashboard.tsx
│       │   │   ├── reservations.tsx
│       │   │   ├── walk-ins.tsx
│       │   │   ├── queue.tsx
│       │   │   ├── tables.tsx
│       │   │   └── profile.tsx
│       │   │
│       │   ├── (owner)/
│       │   │   ├── dashboard.tsx
│       │   │   ├── reservations.tsx
│       │   │   ├── queue.tsx
│       │   │   ├── tables.tsx
│       │   │   ├── analytics.tsx
│       │   │   ├── profile.tsx
│       │   │   │
│       │   │   ├── staff/
│       │   │   │   ├── index.tsx
│       │   │   │   ├── add.tsx
│       │   │   │   └── [staffId].tsx
│       │   │   │
│       │   │   ├── products/
│       │   │   │   ├── index.tsx
│       │   │   │   ├── add.tsx
│       │   │   │   └── [productId].tsx
│       │   │   │
│       │   │   └── settings/
│       │   │       ├── restaurant.tsx
│       │   │       ├── opening-hours.tsx
│       │   │       ├── booking-settings.tsx
│       │   │       └── capacity.tsx
│       │   │
│       │   ├── reservation/
│       │   │   └── [reservationId].tsx
│       │   │
│       │   ├── _layout.tsx
│       │   └── index.tsx
│       │
│       ├── components/
│       │   ├── dashboard/
│       │   ├── reservations/
│       │   ├── walk-ins/
│       │   ├── queue/
│       │   ├── tables/
│       │   ├── staff/
│       │   ├── products/
│       │   ├── settings/
│       │   └── analytics/
│       │
│       ├── services/
│       │   ├── auth.service.ts
│       │   ├── reservation.service.ts
│       │   ├── queue.service.ts
│       │   ├── table.service.ts
│       │   ├── staff.service.ts
│       │   ├── product.service.ts
│       │   ├── settings.service.ts
│       │   └── analytics.service.ts
│       │
│       ├── stores/
│       │   ├── auth.store.ts
│       │   └── operations.store.ts
│       │
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useReservations.ts
│       │   ├── useQueue.ts
│       │   ├── useTables.ts
│       │   └── useRealtime.ts
│       │
│       ├── lib/
│       │   ├── api.ts
│       │   ├── supabase.ts
│       │   └── query-client.ts
│       │
│       ├── utils/
│       ├── constants/
│       ├── types/
│       │
│       ├── assets/
│       │   ├── images/
│       │   ├── icons/
│       │   └── fonts/
│       │
│       ├── app.json
│       ├── babel.config.js
│       ├── metro.config.js
│       ├── package.json
│       └── tsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   └── supabase.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── role.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── error.middleware.ts
│   │   │
│   │   ├── modules/
│   │   │   ├── restaurants/
│   │   │   │   ├── restaurant.controller.ts
│   │   │   │   ├── restaurant.service.ts
│   │   │   │   ├── restaurant.routes.ts
│   │   │   │   └── restaurant.schema.ts
│   │   │   │
│   │   │   ├── reservations/
│   │   │   │   ├── reservation.controller.ts
│   │   │   │   ├── reservation.service.ts
│   │   │   │   ├── reservation.routes.ts
│   │   │   │   └── reservation.schema.ts
│   │   │   │
│   │   │   ├── queue/
│   │   │   │   ├── queue.controller.ts
│   │   │   │   ├── queue.service.ts
│   │   │   │   ├── queue.routes.ts
│   │   │   │   └── queue.schema.ts
│   │   │   │
│   │   │   ├── tables/
│   │   │   │   ├── table.controller.ts
│   │   │   │   ├── table.service.ts
│   │   │   │   ├── table.routes.ts
│   │   │   │   └── table.schema.ts
│   │   │   │
│   │   │   ├── products/
│   │   │   │   ├── product.controller.ts
│   │   │   │   ├── product.service.ts
│   │   │   │   ├── product.routes.ts
│   │   │   │   └── product.schema.ts
│   │   │   │
│   │   │   ├── orders/
│   │   │   │   ├── order.controller.ts
│   │   │   │   ├── order.service.ts
│   │   │   │   ├── order.routes.ts
│   │   │   │   └── order.schema.ts
│   │   │   │
│   │   │   ├── staff/
│   │   │   │   ├── staff.controller.ts
│   │   │   │   ├── staff.service.ts
│   │   │   │   ├── staff.routes.ts
│   │   │   │   └── staff.schema.ts
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── settings.controller.ts
│   │   │   │   ├── settings.service.ts
│   │   │   │   ├── settings.routes.ts
│   │   │   │   └── settings.schema.ts
│   │   │   │
│   │   │   ├── notifications/
│   │   │   │   ├── notification.controller.ts
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── notification.routes.ts
│   │   │   │
│   │   │   └── analytics/
│   │   │       ├── analytics.controller.ts
│   │   │       ├── analytics.service.ts
│   │   │       └── analytics.routes.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── api-response.ts
│   │   │   └── errors.ts
│   │   │
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── api/
│   │   └── index.ts
│   │
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── packages/
│   └── shared/
│       │
│       ├── theme/
│       │   ├── colors.ts
│       │   ├── typography.ts
│       │   ├── spacing.ts
│       │   ├── radius.ts
│       │   ├── shadows.ts
│       │   ├── breakpoints.ts
│       │   └── index.ts
│       │
│       ├── ui/
│       │   ├── Button/
│       │   │   ├── Button.tsx
│       │   │   └── index.ts
│       │   │
│       │   ├── Input/
│       │   │   ├── Input.tsx
│       │   │   └── index.ts
│       │   │
│       │   ├── PasswordInput/
│       │   │   ├── PasswordInput.tsx
│       │   │   └── index.ts
│       │   │
│       │   ├── SearchInput/
│       │   │   ├── SearchInput.tsx
│       │   │   └── index.ts
│       │   │
│       │   ├── Card/
│       │   │   ├── Card.tsx
│       │   │   └── index.ts
│       │   │
│       │   ├── Badge/
│       │   │   ├── Badge.tsx
│       │   │   └── index.ts
│       │   │
│       │   ├── StatusBadge/
│       │   │   ├── StatusBadge.tsx
│       │   │   └── index.ts
│       │   │
│       │   ├── ScreenContainer/
│       │   │   ├── ScreenContainer.tsx
│       │   │   └── index.ts
│       │   │
│       │   ├── LoadingState/
│       │   │   ├── LoadingState.tsx
│       │   │   └── index.ts
│       │   │
│       │   ├── EmptyState/
│       │   │   ├── EmptyState.tsx
│       │   │   └── index.ts
│       │   │
│       │   ├── ErrorState/
│       │   │   ├── ErrorState.tsx
│       │   │   └── index.ts
│       │   │
│       │   ├── Modal/
│       │   │   ├── Modal.tsx
│       │   │   └── index.ts
│       │   │
│       │   └── index.ts
│       │
│       ├── assets/
│       │   └── branding/
│       │       ├── logo.png
│       │       ├── logo-mark.png
│       │       ├── logo-light.png
│       │       └── logo-dark.png
│       │
│       ├── types/
│       │   ├── user.ts
│       │   ├── restaurant.ts
│       │   ├── reservation.ts
│       │   ├── queue.ts
│       │   ├── table.ts
│       │   ├── product.ts
│       │   ├── order.ts
│       │   ├── notification.ts
│       │   └── api.ts
│       │
│       ├── schemas/
│       │   ├── auth.schema.ts
│       │   ├── reservation.schema.ts
│       │   ├── queue.schema.ts
│       │   ├── product.schema.ts
│       │   └── order.schema.ts
│       │
│       ├── constants/
│       │   ├── roles.ts
│       │   ├── reservation-status.ts
│       │   ├── queue-status.ts
│       │   ├── table-status.ts
│       │   └── routes.ts
│       │
│       ├── utils/
│       │   ├── format-date.ts
│       │   ├── format-time.ts
│       │   └── format-currency.ts
│       │
│       ├── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_profiles.sql
│   │   ├── 002_restaurants.sql
│   │   ├── 003_restaurant_staff.sql
│   │   ├── 004_tables.sql
│   │   ├── 005_reservations.sql
│   │   ├── 006_queue_entries.sql
│   │   ├── 007_products.sql
│   │   ├── 008_orders.sql
│   │   ├── 009_order_items.sql
│   │   ├── 010_notifications.sql
│   │   ├── 011_restaurant_settings.sql
│   │   ├── 012_indexes.sql
│   │   ├── 013_realtime.sql
│   │   └── 014_policies.sql
│   │
│   ├── seed.sql
│   └── config.toml
│
├── docs/
│   ├── 01_FUNCTIONAL_REQUIREMENTS.md
│   ├── 02_PROJECT_BLUEPRINT.md
│   ├── 03_VIBE_CODING_MASTER_PROMPT.md
│   │
│   ├── requirements/
│   ├── architecture/
│   ├── database/
│   ├── api/
│   ├── testing/
│   └── screenshots/
│
├── .github/
│   └── workflows/
│
├── .gitignore
├── .env.example
├── README.md
└── package.json
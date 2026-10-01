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
│   │   │   ├── common/
│   │   │   ├── auth/
│   │   │   ├── reservation/
│   │   │   ├── queue/
│   │   │   ├── menu/
│   │   │   └── profile/
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── reservation.service.ts
│   │   │   ├── queue.service.ts
│   │   │   ├── menu.service.ts
│   │   │   └── notification.service.ts
│   │   │
│   │   ├── stores/
│   │   │   ├── auth.store.ts
│   │   │   ├── booking.store.ts
│   │   │   └── cart.store.ts
│   │   │
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── supabase.ts
│   │   ├── utils/
│   │   ├── constants/
│   │   ├── types/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   ├── icons/
│   │   │   └── fonts/
│   │   ├── app.json
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
│       │   ├── _layout.tsx
│       │   └── index.tsx
│       │
│       ├── components/
│       │   ├── common/
│       │   ├── dashboard/
│       │   ├── reservations/
│       │   ├── walk-ins/
│       │   ├── queue/
│       │   ├── tables/
│       │   ├── staff/
│       │   └── products/
│       │
│       ├── services/
│       │   ├── auth.service.ts
│       │   ├── reservation.service.ts
│       │   ├── queue.service.ts
│       │   ├── table.service.ts
│       │   ├── staff.service.ts
│       │   ├── product.service.ts
│       │   └── analytics.service.ts
│       │
│       ├── stores/
│       │   ├── auth.store.ts
│       │   └── operations.store.ts
│       │
│       ├── hooks/
│       ├── lib/
│       │   ├── api.ts
│       │   └── supabase.ts
│       ├── utils/
│       ├── constants/
│       ├── types/
│       ├── assets/
│       │   ├── images/
│       │   ├── icons/
│       │   └── fonts/
│       ├── app.json
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
│   │   │   └── error.middleware.ts
│   │   │
│   │   ├── modules/
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
│   │   │   │   └── table.routes.ts
│   │   │   │
│   │   │   ├── products/
│   │   │   │   ├── product.controller.ts
│   │   │   │   ├── product.service.ts
│   │   │   │   └── product.routes.ts
│   │   │   │
│   │   │   ├── staff/
│   │   │   │   ├── staff.controller.ts
│   │   │   │   ├── staff.service.ts
│   │   │   │   └── staff.routes.ts
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── settings.controller.ts
│   │   │   │   ├── settings.service.ts
│   │   │   │   └── settings.routes.ts
│   │   │   │
│   │   │   ├── notifications/
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── notification.routes.ts
│   │   │   │
│   │   │   └── analytics/
│   │   │       ├── analytics.controller.ts
│   │   │       ├── analytics.service.ts
│   │   │       └── analytics.routes.ts
│   │   │
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── api/
│   │   └── index.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── packages/
│   └── shared/
│       ├── types/
│       │   ├── user.ts
│       │   ├── restaurant.ts
│       │   ├── reservation.ts
│       │   ├── queue.ts
│       │   ├── table.ts
│       │   ├── product.ts
│       │   ├── order.ts
│       │   └── notification.ts
│       │
│       ├── schemas/
│       ├── constants/
│       └── utils/
│
├── supabase/
│   ├── migrations/
│   │   ├── profiles.sql
│   │   ├── restaurants.sql
│   │   ├── restaurant_staff.sql
│   │   ├── tables.sql
│   │   ├── reservations.sql
│   │   ├── queue_entries.sql
│   │   ├── products.sql
│   │   ├── orders.sql
│   │   ├── notifications.sql
│   │   └── policies.sql
│   │
│   ├── seed.sql
│   └── config.toml
│
├── docs/
│   ├── requirements/
│   ├── architecture/
│   ├── database/
│   ├── api/
│   ├── testing/
│   └── screenshots/
│
├── .gitignore
├── README.md
└── package.json
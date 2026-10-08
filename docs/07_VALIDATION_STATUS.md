# Validation status — 2026-10-02

This is a record of checks actually completed on `feature/dineflow-milestone-03`. It is not evidence of live database or device testing.

| Check | Result | Evidence and limit |
|---|---|---|
| Branch ancestry | Pass | `main`, `dev`, and feature all started at `4d2eb4a660a3bddc4bd97ec19790cf4c9c3437db`; implementation changes are on the feature checkout. |
| TypeScript | Pass | `npm run typecheck` completed for customer, operations, backend, and shared workspaces. |
| Backend smoke | Pass | `npm test` ran one health/auth guard test successfully outside the Windows sandbox. It does not contact Supabase. |
| Android JS export | Pass | Both `npx expo export --platform android` commands completed. Hermes bundles are under ignored `.artifacts/`; these are not installable APKs. |
| Migration and API integration | Pending | No local `.env` files or Supabase project is configured; Docker Desktop's engine was unavailable. Migration execution, role rules, persistence, and booking race behavior need live tests. |
| Android APKs | Pending | No Android SDK/Java toolchain or linked EAS projects and build credentials are configured on this machine. Both apps have EAS preview profiles requesting APK output. |
| Figma frame fidelity | Pending | The linked overview rendered, but detailed layer context was blocked by the Figma Starter plan MCP call limit. Screen-by-screen visual review and asset checks remain. |
| Five working-app usability sessions | Pending | Real or proxy participants, consent, results, defects, and retests must be recorded from the configured working apps. Milestone 02 prototype results are not reused. |

## Local startup follow-up — 2026-10-02

Docker Desktop was started and the reduced Supabase stack reached healthy status for PostgreSQL, Auth, REST, Realtime, Kong, and Mailpit. A read-only database query confirmed one seeded restaurant. The API launched with a locally configured, ignored `backend/.env`, and `GET /health` returned success. The local app `.env` files were configured with the machine's LAN host for physical-phone testing; their values are ignored by Git. Expo SDK dependency checks, TypeScript checks, web exports, and Android JavaScript exports passed for both apps. These checks do not replace authenticated end-to-end journeys or an APK installation test.

## Expo Go startup follow-up — 2026-10-02

An Android Expo Go launch reported that SDK 53+ cannot initialize remote push notifications and failed before rendering the root layout. Push code now loads only outside Expo Go; Realtime queue status and the API-backed notification centre remain available in Expo Go. TypeScript, Customer Android export, and Customer web export pass after the change. A fresh Expo Go device launch is still required to confirm the startup error is gone; push delivery requires a development build and credentials.

Use `05_TEST_CASES.md` for the live test script. Add actual outcomes, screenshots, defect references, and device/build identifiers before marking any pending item complete.

## Hosted database switch — 2026-10-02

The API and both Expo app environment files now point to the hosted Supabase project. The hosted schema was present, and service-role REST checks confirmed one demo restaurant, one settings row, six tables, and three products. The initial hosted tables were empty; the demo seed records were inserted through the hosted REST API. TypeScript and backend smoke checks passed. Authenticated booking, queue, and order journeys remain unverified on the hosted project.

After the user chose a fresh start, the eight `dineflow` Supabase containers, `supabase_db_dineflow` PostgreSQL volume, and `supabase_network_dineflow` network were removed. A Docker listing confirmed no `dineflow` containers, volumes, or networks remain; unrelated `tradebot` resources were retained. The migration and seed SQL files remain as schema source, not a running local database.

## Hosted configuration audit — 2026-10-02

`npm run check:hosted-db` passed. It checked the ignored environment files for the backend, both apps, and the repository root; confirmed a common hosted URL and public key; reached hosted Auth; and queried all 12 application tables. The demo restaurant has one settings row, six tables, and three products. A temporary hosted customer authenticated successfully; the profile trigger and protected API reads for identity, restaurant, settings, and products passed. The test user was deleted afterward. The SQL seed was made safe to rerun without duplicating its menu products. Realtime delivery, booking, queue, order writes, and owner journeys remain untested on a device.

## New hosted project credentials — 2026-10-02

The backend and both Expo apps now use `https://mdrlenmrvkfmhedfbrej.supabase.co` with its publishable key; only `backend/.env` has the secret key. The repository root's ignored environment file contains matching public values only. The new project initially returned HTTP 404 for DineFlow tables. After the core migration and seed were applied, `npm run check:hosted-db` passed: all 12 tables, hosted Auth, and the expected demo records were reachable. A temporary customer account signed in with the publishable key; its profile trigger and protected API reads for identity, restaurant, settings, and products passed with the server secret key. The account was deleted, and Auth users and profiles returned to zero. This project is being used as-is; no data was copied from the previous hosted project. TypeScript, backend smoke, and both Android JavaScript exports passed. The generated app bundles contain the publishable key and do not contain the supplied secret key. Realtime delivery and booking, queue, order, and owner journeys still require device testing.

## Hosted flow integration — 2026-10-02

Temporary hosted customer and owner accounts verified the Auth profile trigger, role checks, owner reads, availability, booking/change/cancel, queue create/owner update/customer cancel, order creation with an item and total, order cancellation, and booking notification through the Express API. A signed-in customer Realtime subscription received the queue insert event. The temporary accounts and all created rows were removed. A follow-up count confirmed zero Auth users, profiles, reservations, queue entries, orders, order items, notifications, push tokens, and push tickets. Native device UI, push delivery, and owner write screens have not been verified end to end.

## Hosted account setup — 2026-10-02

One owner, one staff member, and one customer account were created in hosted Auth. Each password sign-in and profile role was verified. Owner and staff profiles are assigned to the demo restaurant; the customer profile has no restaurant assignment. Initial passwords are not stored in the repository. The earlier zero-user counts above describe the state before these three accounts were created.

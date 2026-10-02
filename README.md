# DineFlow

Two Expo mobile applications share one Express API and one Supabase project:

- **Customer**: account, table availability, booking/change/cancel, live queue, table-ready alerts, menu and pre-order.
- **Operations**: staff reservations, walk-ins, queue and tables; owner staff, products, booking settings and summary.

The source lives on `feature/dineflow-milestone-03`, created from `dev`, which was created from `main`. See [implementation traceability](docs/04_IMPLEMENTATION_TRACEABILITY.md), [functional test cases](docs/05_TEST_CASES.md), the [Milestone 03 report draft](docs/06_MILESTONE03_REPORT_DRAFT.md), and [actual validation status](docs/07_VALIDATION_STATUS.md).

## Requirements

Node.js 22.13+, npm, Docker Desktop for local Supabase, Expo Go or Android emulator for UI development, and EAS credentials to create an installable APK. Push notifications require a development/preview build with an Expo project ID and Android FCM credentials; Expo Go does not support them on recent SDKs. The notification centre and Realtime queue state still work without push credentials.

## Set up

1. Run `npm install` at the repository root.
2. Start Docker Desktop, then run `npx supabase start` at the repository root. The migration creates the schema and `supabase/seed.sql` adds the demo restaurant, tables, and menu. Record the local URL, anon key, and service role key from `npx supabase status`.
3. Copy `.env.example` to `backend/.env`, `apps/customer-app/.env`, and `apps/operations-app/.env`. Give the apps only `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_URL`. Put `SUPABASE_SERVICE_ROLE_KEY` **only** in `backend/.env`. On a physical device, use the computer's LAN address for `EXPO_PUBLIC_API_URL`; `localhost` refers to the device itself.
4. Start the API with `npm run api` and the apps with `npm run customer` and `npm run operations` in separate terminals. The API health check is `GET http://localhost:3000/health`.
5. Create a customer account in the Customer app. To make a development owner, register a separate account, then run the following once in the Supabase SQL Editor (replace the email):

```sql
update public.profiles
set role = 'OWNER', restaurant_id = '11111111-1111-4111-8111-111111111111'
where id = (select id from auth.users where email = 'owner@example.com');
```

Sign into Operations with that account. Use **Staff access** to invite staff. Never place the service role key in either app or in Git.

## Checks and build

Run `npm run typecheck` and `npm test` from the root. Run each app's Android JavaScript bundle check with `npx expo export --platform android` from its directory after filling its `.env`. For APKs, link each app directory to its own EAS project (`eas init`), configure Android FCM credentials for customer push, then run `eas build --platform android --profile preview` separately in each app. The `eas.json` preview profiles request APKs.

The API can be deployed as an Express project on Vercel with `backend` as the project root. Set its three Supabase environment variables and a random `CRON_SECRET` there. A trusted scheduler must call `GET /api/jobs/notifications` every five minutes with `Authorization: Bearer <CRON_SECRET>` for reminders and push receipt checks. Configure the two password-reset redirect schemes in Supabase Auth: `dineflow-customer://reset-password` and `dineflow-operations://reset-password`.

## Design and limitations

The high-fidelity Figma page is [here](https://www.figma.com/design/mdg7tjyyHtJFRMFMyprQwd/Untitled?node-id=0-1). The shared charcoal, white, and gold system follows the milestone palette. The Milestone 02 issues prompted clearer table-ready feedback, one email recovery path, a labelled wait field, editable product price, one owner overview, and update timestamps. Detailed Figma frame and asset inspection was limited by the account's MCP rate limit during implementation. The report draft records the remaining visual review and live testing tasks; it does not claim those checks were completed.

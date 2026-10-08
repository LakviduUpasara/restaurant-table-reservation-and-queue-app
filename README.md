# DineFlow

Two Expo mobile applications share one Express API and one Supabase project:

- **Customer**: account, table availability, booking/change/cancel, live queue, table-ready alerts, menu and pre-order.
- **Operations**: staff reservations, walk-ins, queue and tables; owner staff, products, booking settings and summary.

The source lives on `feature/dineflow-milestone-03`, created from `dev`, which was created from `main`. See [implementation traceability](docs/04_IMPLEMENTATION_TRACEABILITY.md), [functional test cases](docs/05_TEST_CASES.md), the [Milestone 03 report draft](docs/06_MILESTONE03_REPORT_DRAFT.md), and [actual validation status](docs/07_VALIDATION_STATUS.md).

## Requirements

Node.js 22.13+, npm, a hosted Supabase project, Expo Go or Android emulator for UI development, and EAS credentials to create an installable APK. Push notifications require a development/preview build with an Expo project ID and Android FCM credentials; Expo Go does not support them on recent SDKs. The notification centre and Realtime queue state still work without push credentials.

## Set up

1. Run `npm install` at the repository root.
2. Create a hosted Supabase project. Apply `supabase/migrations/20261002000100_core.sql` in the project's SQL Editor, then apply `supabase/seed.sql` to add the demo restaurant, tables, and menu. Run the migration only once on a fresh project; it creates types, tables, functions, policies, and Realtime publication entries. The seed can be rerun without duplicating its demo records. Obtain the project URL, publishable key, and secret key from that same project. This app does not require a local database or Docker Desktop.
3. Create `backend/.env` with `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `PORT=3000`. Create a separate `.env` in **each** app with only `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `EXPO_PUBLIC_API_URL`. Use the same Supabase project URL and publishable key in all three files; never put the secret key in either app directory. On an Android emulator use `10.0.2.2` in the API URL; on a physical device use the computer's LAN address for the API URL. The API URL must end in `/api`. The Supabase URL remains the hosted HTTPS URL on every device. Keep all `.env` files out of Git.
4. Start the API with `npm run api` and the apps with `npm run customer` and `npm run operations` in separate terminals. Customer uses port 8081 and Operations uses port 8082, so both Metro servers can run together. Open the QR code in Expo Go; web previews are also available at `http://localhost:8081` and `http://localhost:8082`. The API health check is `GET http://localhost:3000/health`.
5. Create a customer account in the Customer app. To make a development owner, register a separate account, then run the following once in the Supabase SQL Editor (replace the email):

```sql
update public.profiles
set role = 'OWNER', restaurant_id = '11111111-1111-4111-8111-111111111111'
where id = (select id from auth.users where email = 'owner@example.com');
```

Sign into Operations with that account. Use **Staff access** to invite staff. Never place the secret key in either app or in Git.

## Checks and build

Run `npm run check:hosted-db`, `npm run typecheck`, and `npm test` from the root. The hosted check confirms that the API and both apps use the same Supabase project and publishable key, all expected tables and demo rows are reachable, and Auth responds. Signed-in booking, queue, and order flows still require device testing with hosted accounts. Run each app's Android JavaScript bundle check with `npx expo export --platform android` from its directory after filling its `.env`. For APKs, link each app directory to its own EAS project (`eas init`), configure Android FCM credentials for customer push, then run `eas build --platform android --profile preview` separately in each app. The `eas.json` preview profiles request APKs.

The API can be deployed as an Express project on Vercel with `backend` as the project root. Set its three Supabase environment variables and a random `CRON_SECRET` there. A trusted scheduler must call `GET /api/jobs/notifications` every five minutes with `Authorization: Bearer <CRON_SECRET>` for reminders and push receipt checks. Configure the two password-reset redirect schemes in Supabase Auth: `dineflow-customer://reset-password` and `dineflow-operations://reset-password`.

## Design and limitations

The high-fidelity Figma page is [here](https://www.figma.com/design/mdg7tjyyHtJFRMFMyprQwd/Untitled?node-id=0-1). The shared charcoal, white, and gold system follows the milestone palette. The Milestone 02 issues prompted clearer table-ready feedback, one email recovery path, a labelled wait field, editable product price, one owner overview, and update timestamps. Detailed Figma frame and asset inspection was limited by the account's MCP rate limit during implementation. The report draft records the remaining visual review and live testing tasks; it does not claim those checks were completed.

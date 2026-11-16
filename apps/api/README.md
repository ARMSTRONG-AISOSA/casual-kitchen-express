# CKE API

The API for all three apps: Hono on Cloudflare Workers, Drizzle ORM, and Postgres (Neon in
production, reached through Hyperdrive). See `docs/architecture.md` sections 9, 12, 14, and 15.

## Local database

Development uses Postgres 17.10 in Docker on this laptop (locked in `docs/architecture.md` 15.1).
Run these from the repository root:

| Step                                                                                       | Command                                       | What you should see                                |
| ------------------------------------------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------- |
| 1. Start the database                                                                      | `npm run db:up --workspace @cke/api`          | `Container cke-db-1 Healthy`                       |
| 2. Create or update the tables                                                             | `npm run db:migrate --workspace @cke/api`     | `migrations applied successfully!`                 |
| 3. Add the menu, soups, areas, and settings                                                | `npm run db:seed-base --workspace @cke/api`   | `Catalog ready: 22 menu items, 3 soups, 10 areas.` |
| 3b. Add the demo staff (on the laptop, with manager usernames)                             | `SEED_MANAGER_PASSWORDS=1 npm run db:seed-people --workspace @cke/api` | `10 staff ready. Demo password for usernames: cke-demo-2026 (managers included: owner.m, ivie.m). The owner (M-001) signs in with the configured Google email.` |
| 3c. Add the menu and staff photos (about 5 minutes)                                        | `npm run db:seed-media --workspace @cke/api`  | `23 menu and 10 staff photos stored, …`            |
| 3d. Add three months of demo history (about 5 seconds; wipes and regenerates the old demo history; refuses if real online orders exist) | `npm run db:seed-history --workspace @cke/api` | `Demo history: … (90 days)` … `Checks passed.` |
| Run the API for the tablet                                                                 | `npm run dev:lan --workspace @cke/api`        | `Ready on http://0.0.0.0:8787`                     |
| 4. Run the tests (stop `dev:lan` first: the two share local state and the tests can stall) | `npm run test --workspace @cke/api`           | `Tests 38 passed (38)`                               |
| Stop the database (data is kept)                                                           | `npm run db:down --workspace @cke/api`        | `Container cke-db-1 Removed`                       |

The local password (`cke-local-only`) only works on this laptop: the database listens on
127.0.0.1, not the network. Never use it for Neon.

After changing `src/db/schema.ts`, run `npm run db:generate --workspace @cke/api -- --name what-changed`,
check the new file in `drizzle/`, then run step 2 again.

## Routes so far

| Route                                                               | Purpose                                                                                                                                       |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                                                       | Wakes the database path when an app opens; doesn't query it                                                                                   |
| `GET /bootstrap`                                                    | Menu, soups, areas, and customer-facing settings, with a version. Sends a 304 when the app already has that version (`architecture.md` 14.4). |
| `POST /soups`, `DELETE /soups/:id`, `PUT /settings/soup-of-the-day` | The soup rotation (KIT-17)                                                                                                                    |
| `PUT /photos/:kind/:id`, `DELETE /photos/:kind/:id`                 | Add, replace, or remove a photo with its credit, for `menu-item`, `soup`, or `staff` (staff code). Replacing deletes the old photo.           |
| `GET /media/:id`, `GET /media/credits`                              | An image (cached for a year; staff photos need a staff session), and the credits of the menu and soup photos in use               |
| `GET /staff/photos`                                                 | Staff photos by staff code (signed-in staff only)                                                                                             |
| `/api/auth/*`                                                       | Better Auth: sign in (`POST /api/auth/sign-in/username`), sign out, and sessions                                                              |
| `GET /me`, `POST /me/password`                                      | The signed-in person, and changing your own password (needed after a temporary password)                                                      |
| `PATCH /me`, `PUT /me/photo`, `DELETE /me/photo` | Customers: their name and gender, and their private profile photo (WebP, 512 px, 80 KB) |
| `/people`                                                           | Managers: list (username or Google email), add (temporary password shown once), edit, reset password, deactivate, reactivate                  |
| `GET /menu`, `/menu/items`, `/menu/categories` | Menu management (MGR-05, MGR-07, MGR-08): managers add, edit (prices are audit-logged), and archive items, their choices, and categories. `PUT /menu/items/:id/availability` marks an item sold out or back on (kitchen staff and managers, KIT-08). Every change raises the menu version. |
| `POST /me/orders`, `GET /me/orders`, `GET /me/orders/:id` | Customers: checkout (priced on the server; hours, pause, and delivery range checked; demo payment), In progress and Order history, and tracking with the delivery code |
| `POST /orders/walk-in` | Kitchen staff and managers: a counter order paid by cash (change due) or online (KIT-13, KIT-14) |
| `POST /orders/:id/acknowledge`, `PUT /orders/:id/items/:itemId`, `POST /orders/:id/ready`, `POST /orders/:id/collected` | The kitchen's steps, each recorded against the person signed in; the first tick starts Preparing |
| `GET /orders/board`, `GET /orders`, `GET /orders/:id` | The kitchen board; the order list for any dates (filters, sort, 150 at a time with a cursor, count and value); the order detail with its timeline. Customer phone and address only for dispatch and managers. |
| `GET /changes?since=N` | Only what changed since change number N, for reconnecting: staff get orders and alerts, a customer their own orders, a rider their queue and deliveries (`architecture.md` 14.4, decision 4) |
| `GET /live` | The live connection (a WebSocket to the `LiveHub` Durable Object): each change arrives as it happens, only to the people who should see it (`architecture.md` 10) |
| `POST /me/orders/:id/cancel`, `/cancellation-request`, `/rating` | Customers: cancel before the kitchen acknowledges, ask to cancel after, and rate once (each cancel needs a reason and the tick) |
| `POST /orders/:id/cancel`, `/refunds`, `/item-unavailable` | Managers cancel or refund (kitchen staff cancel walk-ins before Ready); flag an unavailable item. Refunds need `confirm: true` and record the person. |
| `POST /cancellation-requests/:id/approve`, `/decline` | Dispatch officers and managers decide customers' requests |
| `/rider/*` | Riders: online, the queue (only what fits), accept (one winner), deliveries, stop order, picked up, arriving, deliver with the code, help, release, earnings, location while an order is on the way (`PUT /rider/location`) |
| `GET /riders`, `POST /orders/:id/assign`, `POST /help-requests/:id/resolve` | Dispatch and managers: the riders panel, assigning a waiting order, and manual completions |
| `GET /alerts`, `POST /alerts/:id/clear` | Open alerts; the timed check runs from the live hub's alarm while orders are open, at the times in Settings, Alerts, once per stage per order |
| `/settings`, `/settings/areas/:id`, `/settings/hours-overrides/:day` | Dispatch and managers: hours, pause, areas, capacity, tracking, the cancellation limit; managers also the fee, rider pay, and WhatsApp number |
| `PUT /settings/alerts` | Dispatch and managers: the Alerts section in one save (the beep and the four alert timers, each within its range); audit-logged, with who saved it last and when in `GET /settings` |
| `/me/addresses` | Customers: the address book (an address outside the range is refused) |

Every change needs a signed-in person with the right role (`docs/architecture.md` 3.0). Sign-in
needs `BETTER_AUTH_SECRET` in `apps/api/.dev.vars` (copy `.dev.vars.example` and make your own with
`openssl rand -base64 32`; never committed). The deployed Worker gets its own with
`wrangler secret put BETTER_AUTH_SECRET`. The demo staff's password is `cke-demo-2026`; the
manager usernames (`owner.m`, `ivie.m`) exist only on the laptop, because managers use Google.
The tests sign in as `owner.m` (the owner), so the laptop's database keeps them (step 3b); never
seed them into the deployed database.

The owner is staff ID M-001, set up from `OWNER_GOOGLE_EMAIL` and `OWNER_NAME` in `.dev.vars` (or
the environment when seeding the deployed database; `scripts/owner.ts`). Their first Google
sign-in links to M-001. Once set up, the owner keeps their own name, details, and photo when the
seeds run again. Leave both empty and M-001 is the demo owner.

Google sign-in (customers and managers) turns on when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
are in `.dev.vars` (a "Web application" client in the Google Cloud project, with the redirect
address `http://localhost:8787/api/auth/callback/google`). Google returns only to `localhost` over
plain `http`, so the tablet reaches the laptop with `adb reverse tcp:8787 tcp:8787` and the app uses
`EXPO_PUBLIC_API_URL=http://localhost:8787`. Deployed, the secrets go in with `wrangler secret put`.

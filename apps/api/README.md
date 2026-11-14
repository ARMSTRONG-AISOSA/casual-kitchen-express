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
| 3b. Add the demo staff                                                                     | `npm run db:seed-people --workspace @cke/api` | `10 staff ready.`                                  |
| 3c. Add the menu and staff photos (about 5 minutes)                                        | `npm run db:seed-media --workspace @cke/api`  | `23 menu and 10 staff photos stored, …`            |
| Run the API for the tablet                                                                 | `npm run dev:lan --workspace @cke/api`        | `Ready on http://0.0.0.0:8787`                     |
| 4. Run the tests (stop `dev:lan` first: the two share local state and the tests can stall) | `npm run test --workspace @cke/api`           | `Tests 5 passed (5)`                               |
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
| `GET /media/:id`, `GET /media/credits`                              | An image (cached for a year; public for now, staff photos go behind sign-in), and the credits of the menu and soup photos in use               |
| `GET /staff/photos`                                                 | Staff photos by staff code (open until sign-in, then staff only)                                                                              |

Changes (`POST`, `PUT`, `DELETE`) are refused unless `ALLOW_UNSIGNED_WRITES="true"` is set in
`apps/api/.dev.vars` (copy `.dev.vars.example`; laptop only, never on a deployed Worker). Sign-in
replaces this temporary guard with a role check on every route.

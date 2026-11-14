# CKE Progress

The working memory for Casual Kitchen Express (CKE). Read this first, then the documents it points to. The top half (sections 1 to 8) is the current state; the **Log** at the bottom is append-only history.

**Last updated:** 12 November 2026 (end of day, before the owner’s break)
**Stage:** all three apps’ screens are built on demo data and committed. The **backend foundation is in progress**: the local database, the full schema, the menu, soups, areas, staff, and photos are in Postgres and R2, and the apps already read the menu, soups, and photos from the API. Photo upload (with compression and credits), the soup rotation, refund confirmations, and the Refunds report are built and tested on the tablet. **Next: sign-in with Better Auth and role checks** (section 8, step 4b). Eight local commits, latest `9a916f6`; nothing pushed.

---

## 1. What CKE is

A fast-casual, home-style Nigerian food business in Ugbowo, Benin City, near the University of Benin. It has three Android apps and a promotional website:

| Part | Users | Purpose |
|---|---|---|
| Customer app | Customers | Browse, order, pay (simulated), track, reorder |
| Business and Kitchen app | Kitchen staff, dispatch officers, account officers, and managers (tablet and phones) | Order board, walk-in orders at the counter, dispatch, menu, people, reports, rider pay, finance, settings |
| Rider app | CKE riders | Queue, pickup, delivery with a 4-digit code, earnings |
| Website | Visitors | Promotes the business and mainly the customer app, hosts the download |

Everything is **simulated**: payments, refunds, delivery, rider payouts, and two months of seeded history.

---

## 2. Read in this order

| File | What it is | Authority |
|---|---|---|
| `progress.md` | This file: status, rules, next steps, log | Start here |
| `docs/architecture.md` (v0.34) | Functions, 128 feature IDs (CUS, RID, KIT, MGR, DSP, ACC, WEB), order lifecycle, data model, the API routes built so far, decisions, free-tier limits, **locked versions (section 15)**, build order (16), **16.1 to verify at build**, seed data | Wins on anything technical |
| `docs/design.md` (v0.26) | UI rules per app, screens, page flows, colours, components | Wins on anything visual or UX |
| `docs/Casual-Kitchen-Express.md` (v1.10) | Brand and business, surface level only | Wins on brand (name, colours, logo, tone, menu, packaging) |
| `docs/list-of-areas.md` | Delivery areas, boundary, landmarks, neighbourhood list | Areas still to confirm on a map |
| `docs/photo-credits.md` | Every starting menu photo’s author, licence, and source, and the staff photos | The record the brand document asks for |
| `apps/api/README.md` | Database, seed, test, and run commands, with what each should print, and the routes so far | How to run the backend |
| `design/prototypes/*.html` | Clickable prototypes of every screen (open in a browser) | Illustrations only. If they disagree with the docs, **the docs win.** |
| `brand/cke-logo-package/` | Logo SVG and PNG files, app icons, favicons, brand tokens (CSS and JSON), web snippet, build script | Use these files, never redraw the logo |

**Online copies** (private to the owner's claude.ai account):
- Customer app prototype: https://claude.ai/artifact/RXfsSGhjbwigTZW2ceEzEx
- Rider app prototype: https://claude.ai/artifact/BSwcoPXourynJSCubLaQLu
- Kitchen and manager app prototype: https://claude.ai/artifact/FMjuLN4uQ2iGMxxiUHpF3e
- Website prototype: https://claude.ai/artifact/9HoYMikzFns3U2v6dJHK25
- Design canvas (logo boards, typography, packaging, social): https://claude.ai/artifact/91n1XQU3A6o49zEQGssCTy

---

## 3. Rules to follow (from the owner)

1. **Never mention in `docs/Casual-Kitchen-Express.md` that this is a portfolio or research project.** The technical docs may say payments are simulated.
2. **The business document stays surface level.** Depth goes in `architecture.md` and `design.md`.
3. **Fewest taps wins.** Every task should take as few taps as possible, with sensible defaults and nothing asked twice.
4. **Decided means decided.** Don't change anything marked **Decided** without asking the owner. When something new is decided, update the status in the right document and add a change log row.
5. **Everything is simulated**, and the apps say so quietly ("Demo payment. No money is taken." and a "Demo" chip in the manager app).
6. **Licence and attribution:** all code is MIT. Claude Code is credited in exactly two places: one line in the repository README and one small line on the website's About page. Nowhere else, including inside the apps. Claude Code's automatic commit credit can be switched off in its settings.
7. **Android first, Android 10 (API 29) and above.** iOS comes later. No Play Store for now: APKs are released on GitHub Releases and linked from the website.
8. **Copy style:** plain, short, friendly English in sentence case. Use typographic apostrophes and quotes (’ “ ”) in user-facing text. Avoid all-caps labels and arrows on buttons.
9. **Footer and contact details:** LinkedIn https://www.linkedin.com/in/armstrong-omoregie-02367a271/, email ammycan6@gmail.com (labelled Google), WhatsApp https://wa.me/2349095466063, developer site https://bossstrong-dev.vercel.app/, GitHub https://github.com/ARMSTRONG-AISOSA.
10. **Ask before adding scope.** Record proposals as "Proposal" until the owner confirms.
11. **Use only the locked versions** in `docs/architecture.md`, section 15. Install Expo packages with `npx expo install`, commit the lockfile, and ask the owner before upgrading anything.
12. **Android builds are arm64-v8a only.** Release builds add armeabi-v7a. Never build x86 or x86_64 (`architecture.md` 17.2).
13. **Git:** the owner tests each piece first; ask before each commit, and don’t push until the owner says so. Commit messages carry no Co-Authored-By line.
14. **Owner-side instructions are fully detailed:** exact keys, commands, expected output, and how to check the result.

---

## 4. Decided stack (details and exact versions in `architecture.md`, sections 14 and 15)

| Area | Decision |
|---|---|
| Apps | React Native 0.88.1 with Expo SDK 58 and React 19.3.0, TypeScript 6.0.3, three separate apps in one repository with shared packages |
| Repository | npm workspaces (npm 11.17.0, bundled with Node.js 24) and Turborepo 2.11.10, on Node.js 24 LTS. GitHub: ARMSTRONG-AISOSA/casual-kitchen-express |
| App libraries | Expo Router, TanStack Query, Zod, lucide-react-native icons, Gifted Charts (business app), and React Native styles with the shared brand tokens (no UI kit) |
| API | Hono 4.13.14 on Cloudflare Workers (free plan, Wrangler 4.155.0), REST first (GraphQL only if needed) |
| Database | Neon Postgres, through Cloudflare Hyperdrive with `pg` 8.23.1, and Drizzle ORM 0.45.4 (Drizzle Kit 0.31.11 for migrations). Development uses Postgres 17.10 in Docker on the laptop. |
| Real-time | Cloudflare Durable Objects (WebSockets with hibernation) |
| Background jobs | Cron Triggers and Durable Object alarms |
| Images | Cloudflare R2. Files in object storage, links in the database. Compressed on the device before upload. |
| Auth | Better Auth 1.7.14 in the Worker, with its Expo plugin. Customers and managers use Google sign-in. Riders, kitchen staff, dispatch officers, and account officers use a username and password set by a manager (PBKDF2 at 30,000 iterations, rate-limited). No forgot-password anywhere. |
| Maps | Customer app only: MapLibre with OpenFreeMap tiles. The rider app has no map and hands off to the phone's navigation app. |
| Push | Expo push service with Firebase for Android. No email or SMS. |
| Website | Plain HTML, CSS, and JavaScript on GitHub Pages, with no packages |
| Distribution | APKs on GitHub Releases, linked from the website. Signing keys backed up and never changed. |
| Analytics | Minimal: Cloudflare Workers Logs |
| Testing and quality | Vitest 5.0.5 with `@cloudflare/vitest-plugin` 1.4.10, Playwright 1.64.1 for the website, ESLint 9.39.5 with eslint-config-expo, and Prettier 3.9.10 |

---

## 5. Key business rules (quick reference; full rules in the docs)

- **Hours:** online orders and delivery 8:00 am to 6:00 pm. Walk-in service until 8:30 pm. The kitchen tablet signs out at 8:30 pm.
- **Delivery area:** from Uselu to Oluku Market. Nothing beyond Oluku Market. Pins are checked against a boundary polygon, and pickup is offered outside it.
- **Prices:** a flat delivery fee, ₦1,500 by default, and rider pay ₦1,000 per delivery by default. Managers can edit both, and the changes show in the customer and rider apps for new orders. Rider pay can't exceed the fee.
- **Riders:** all deliveries by CKE's own riders. They pick from a queue (first to accept wins), carry one order by default and up to three when the load fits (light 1, medium 2, heavy 3, budget 6), and confirm delivery with the customer's 4-digit code.
- **Walk-in orders:** entered on the kitchen tablet, paid at the counter in cash (Exact or an Other amount box, with change due) or online, W- order numbers, a separate channel in all data and reports.
- **Attribution:** every action is recorded against a staff ID. On the shared tablet, actions belong to whoever is signed in.
- **Cancellation:** a quiet link, a required reason, and a confirmation tick. Free cancel before the kitchen acknowledges, a request after that, and none once ready. After 3 cancellations in 7 days, request only (managers can set the limit from 3 to 7).
- **Accounts:** customers can deactivate (reversible) or delete (Danger zone, tick, and typing DELETE ACCOUNT). Managers can deactivate any account except the owner's. Every customer and staff member has a unique ID (C-00418, R-001, K-002, D-001, A-001, M-001).
- **Staff roles:** kitchen staff (Board, Walk-in, Sold out, Alerts), dispatch officers (Alerts, Orders, Riders, Settings without Pricing and pay and Restaurant contact), account officers (Reports, Rider pay, Finance), and managers (everything). The backend checks the role on every action (`architecture.md` 3.0).
- **Soup of the day:** kitchen staff pick it each morning on Sold out (managers on Sold out or Menu), and the customer app shows it; only today’s soup can be ordered.
- **Finance:** the person on the counter counts the cash at close, and an account officer or any manager (including the owner) signs it off; whoever signs off or closes a month is recorded by name, staff ID, and time. A closed month is locked, and later corrections are adjustments.
- **Refunds:** every refund (a manager’s refund, an approved cancellation request, a walk-in cancelled on its ticket) needs an “I’m sure I want to refund ₦… for …” tick and records the name, role, staff ID, and time of whoever made it (MGR-15).
- **Photos:** compressed on the device before upload (dishes and soups 4:3, at most 1200 px and 250 KB; staff square, 512 px and 80 KB). Dish and soup photos carry a credit; staff photos carry none. Replacing a photo deletes the old one everywhere (MGR-06).
- **Order numbers:** online numbers run continuously from O-0001 on the first seeded day, and walk-in numbers restart at W-001 each day.
- **Manager order list:** today, yesterday, or any date range back to the first order, with search by order number or customer ID and paging for long ranges.
- **Seed data:** 60 days of history at about 40 online and 13 walk-in orders on a weekday and 25 and 8 at weekends, respecting the hours (`architecture.md`, 18.3).

---

## 6. What has been done

| Area | Result |
|---|---|
| Brand | Name, positioning, audience, menu with mock prices, personality, palette, tagline "Tastes like home. Arrives fast.", social media direction |
| Logo | The forward-leaning pot with speed lines, plus a simplified small-size icon, delivered as a production package |
| Typography | Nunito for headings, Inter for body and interface. Fraunces is used in the logo artwork only. |
| Packaging | Kraft and red print: delivery bag, compartment rice box, cylindrical soup bowls (short for takeaway, tall sealed for delivery), wrapped swallow |
| Technical plan | The full architecture, verified against free tiers on 10 November 2026, including an auth compatibility check |
| Design plan | Philosophy per app (customer expressive, kitchen practical, rider functional and black-and-white), screens, and flows |
| Areas | Scouted area list, with the boundary at Oluku Market (the road there is reported clear) |
| Prototypes | 22 customer screens, 16 rider screens, 19 kitchen and manager screens, and 5 website pages, all automatically click-tested |
| Repository | npm workspaces and Turborepo monorepo with the three apps, the API Worker, shared packages, and a placeholder website. Typecheck and lint pass (11 of 11 tasks), Prettier is clean, and 5 of 5 API tests pass. Eight local commits (`26cb742` to `9a916f6`), not pushed. |
| Android | JDK 17 and the Android SDK installed. arm64-v8a debug builds of all three apps on the owner’s tablet. The Business app’s build (12 November, evening) includes the photo libraries; the customer app’s build is older, so it shows photos with React Native’s Image until its next native build. |
| Customer app | Every screen built on demo data. Reads the menu, soups, today’s soup, and photos from the API (with a 304 when nothing changed), and shows Photo credits. Ordering, sign-in, and the map are still demo stand-ins. |
| Rider app | Every screen built on demo data. Not connected to the API yet (no images by design). |
| Business and Kitchen app | Every screen for all four staff roles built on demo data. Connected to the API for: the soup of the day and the soup rotation, photo upload for dishes, soups, and staff (crop, compression, credits; replacing deletes the old photo), and staff photos. Refund confirmation ticks with the refunder recorded, the Refunds report, View profile, and Back to Orders work on demo data. |
| API and database | Postgres 17.10 in Docker (local). 30-table schema and four migrations (`0000` to `0003`). Seeds: the menu (22 items, options), 3 soups, 10 areas, settings, 10 staff, and 33 photos (23 menu, 10 staff) in local R2. Routes: health, bootstrap (ETag and 304), soups, soup of the day, photos (upload, replace, remove), media (image and credits), and staff photos. A temporary write guard stands in for sign-in. |
| Photos | All 23 starting menu photos are in: 19 freely licensed from Wikimedia Commons and Flickr, and 4 made by the owner with Google Gemini (credited “Casual Kitchen Express (made with Gemini)”). 10 staff headshots made with Gemini, with no credit. None are flagged as demo (`docs/photo-credits.md`). |

---

## 7. Open items

**Owner actions, in the order they will be needed**
1. **Cloudflare account: done (14 November 2026).** Wrangler is logged in on the laptop (`npx wrangler whoami` shows the account). The early 16.1 checks are done (items 2 and 3). The workers.dev subdomain is `casualkitchenexpress`, and staff passwords use 30,000 iterations (owner, 14 November 2026).
2. **Google Cloud project for Google sign-in:** the project exists (created 14 November 2026 without a card, by skipping the free-trial offer; project ID `cke-project-514706`). Still to do with sign-in: the consent screen and the OAuth clients (package names, debug and release SHA-1 fingerprints, privacy link). Claude gives exact steps then.
3. **Delivery boundary:** draw the polygon from map pins (Uselu to Oluku Market) and confirm the spellings of area names (`list-of-areas.md` section 9). Needed when addresses are connected (step 6).
4. **Firebase project for push notifications** (step 6): steps to follow.
5. **Neon account** at deploy time (decided): steps to follow.
6. **Pushing to GitHub:** `origin` is https://github.com/ARMSTRONG-AISOSA/casual-kitchen-express.git (empty). Nothing is pushed until the owner says so.

**Temporary things to remove later (don’t forget)**
- ~~**Throwaway Cloudflare test Worker `cke-check-temp`**~~ **Deleted 14 November 2026** (confirmed: Cloudflare reports “This Worker does not exist on your account”, and its address returns 404; the local test files are deleted too). It was a tiny separate program put online only to measure two free-plan limits (16.1 items 2 and 3: PBKDF2 password-hash timing at about 50,000 iterations, and Durable Object alarms and hibernation). Its code stays in Claude’s scratchpad, never in the repository. When the measurements are recorded in `architecture.md` 16.1, delete it with `npx wrangler delete --name cke-check-temp` (from `apps/api`), check that it is gone from the Cloudflare dashboard (**Workers & Pages**), and mark this item done in the log. Deleting the Worker also deletes its Durable Object storage. Keep: the Wrangler login and the workers.dev subdomain (the real API uses them).
- ~~**workers.dev subdomain named `cke-check-temp`**~~ **Renamed 14 November 2026 to `casualkitchenexpress`** (owner’s choice; deleted and re-registered through the Cloudflare API while no Worker was deployed, and confirmed). It was: the first deploy registered the account’s workers.dev subdomain automatically, named after the test Worker, so every Worker on the account would live at `<name>.cke-check-temp.workers.dev`. Rename it to a lasting name before the real API is deployed (owner to choose; Cloudflare dashboard, **Workers & Pages**, the subdomain setting, or Claude through the API).
- ~~**Temporary write guard `ALLOW_UNSIGNED_WRITES`**~~ **Removed 14 November 2026** with sign-in, together with the open `GET /staff/photos`; every change now needs a signed-in person with the right role.
- **Manager usernames on the laptop only** (`efosa.m`, `ivie.m`, from `SEED_MANAGER_PASSWORDS=1`): so managers can be tested before Google sign-in exists. Remove once Google sign-in works (re-run `npm run db:seed-people` without the flag), and never seed them into the deployed database.
- **Demo sign-in hints in development builds:** the Business app’s sign-in screen lists the demo accounts and the demo password only in development builds (`__DEV__`); release builds don’t show them. Decide before release whether the public demo keeps shared demo staff accounts at all.

**Known gaps and notes (no decision needed unless the owner wants one)**
- **Hono security advisories (Proposal, needs the owner):** Hono 4.13.14 has advisories fixed in 4.13.16 (published 1 November 2026; two weeks old on 15 November). The one that matters here is wildcard middleware being skipped by its router; the API now attaches every permission check to its route, so it isn’t exposed, but upgrading to 4.13.16 is recommended once it passes the two-week rule.
- **“Other area in range”** is a choice in the customer app’s area picker, but not a seeded area in the database. Settle how it is stored when addresses are connected (step 6).
- **This laptop’s connection and Node.js:** Node gives each IPv4 or IPv6 connection attempt only 250 ms. The laptop has no IPv6 and Cloudflare takes longer than that over IPv4 here, so Node tools (Wrangler login and deploy) time out with `ETIMEDOUT` while curl works. Fix: run them with `NODE_OPTIONS="--network-family-autoselection-attempt-timeout=2000"` (tested 14 November 2026), or add that export to `~/.bashrc` to make it permanent. The laptop also uses the router’s DNS (192.168.0.1), which timed out on some names during setup.
- **Tests and `dev:lan` share local state:** stop the API’s `dev:lan` before `npm run test --workspace @cke/api` (`apps/api/README.md`).
- **Prototypes lag the docs** on the 11 and 12 November decisions. The docs win, and the prototypes are not being updated.
- **Customer app native build:** expo-image comes with its next native build; until then React Native’s Image shows the photos (fine for now).
- **Rider alert sounds** come with push notifications (decided); alerts only vibrate for now.
- **Versions:** all locked in `architecture.md` 15. Re-check them for security advisories just before installing anything new.

**To verify at build** (the full list is in `architecture.md`, 16.1)
- Better Auth's username plugin, admin create-user, and custom password-hash setting (during sign-in).
- PBKDF2 timing on a deployed Worker (it must fit 10 ms of CPU).
- Durable Object alarms and hibernation on the free plan.
- Background location and the rider battery target (about 10% an hour or less).
- Google sign-in console setup (package name, release-key SHA-1, consent screen, privacy link).
- Hyperdrive caching (off for live order data) and Neon's free storage.
- OpenFreeMap usage terms and the map credit.
- Re-check every free allowance just before deploying.

---

## 8. Where we are and what is left

**Rough progress:** planning, brand, design, and prototypes are complete. The app screens are built on demo data (about 90% of the screens; the map, real sign-in, and push are stand-ins). The backend is about 15% done: the foundation, catalog, and photos work, but sign-in, orders, real-time, and the seed history don’t exist yet. Counting everything to a released APK, the project is roughly **35 to 40% done**. The largest remaining parts are the orders backend (4c) and connecting every screen to it (6).

The order below follows `architecture.md` 16, adjusted by the owner’s frontend-first decision (12 November 2026).

| Step | What | Status |
|---|---|---|
| 1 | Repository setup (monorepo, three apps, API Worker, shared packages, website placeholder, licence, README) | **Done** (11 November) |
| 2 | Customer app screens on demo data | **Done** (`0c4bcee`) |
| 3 | Rider app screens on demo data | **Done** (`cd8284c`) |
| 3b | Business and Kitchen app screens on demo data, all four staff roles | **Done** (`e2fe3c5`, `d4d2032`) |
| 4a | Backend foundation: local database, schema, migrations, base, staff, and photo seeds, bootstrap with versions, soup rotation, photo upload and credits | **Done** (`5c088de`, `9a916f6`) |
| 4b | **Sign-in and roles (in progress, 14 November 2026: API done and tested, Business app connected, rider app next):** Better Auth in the Worker (Google for customers and managers, username and password for the other staff roles), sessions in the apps, a role check on every route (3.0), first-sign-in password change, manager password reset, deactivation signs a person out, the tablet’s 8:30 pm sign-out. Replaces the temporary write guard and puts staff photos behind a staff session. Confirms 16.1 item 1. Then the owner’s **Cloudflare account** (exact steps) for the early 16.1 checks (PBKDF2 timing, Durable Object alarms). | Next |
| 4c | **Orders backend:** menu management (items, prices, sold out, options), orders and status events (online and walk-in), simulated payments, refunds with the tick and refunder, cancellation requests, alerts, deliveries, the rider queue (first to accept wins), delivery codes, Durable Objects for live updates, and “only what changed” on reconnect (14.4) | To do |
| 5 | **Seed script:** two months of demo history (18.3), with its own checks | To do |
| 6 | **Connect the screens to the API** in all three apps, replacing the demo data; the real map (MapLibre) with the delivery boundary, Google sign-in, push notifications (Expo and Firebase), and background location for riders | To do |
| 7 | Capacity rules, batching, and the demo simulator (18.4) | To do |
| 8 | Website: turn `design/prototypes/cke-website.html` into the static GitHub Pages site | To do |
| 9 | Reports on real data (pre-computed summaries), rider payouts, Finance, polish, the remaining 16.1 checks (battery, performance, contrast), Neon at deploy, signed release APKs (arm64-v8a and armeabi-v7a) on GitHub Releases | To do |

The prototypes are the visual reference for every screen. Reuse their copy, layout, and flows, but write production code fresh rather than copying prototype code.

### 8.1 Resuming after a break

1. Start Docker, then the database: `npm run db:up --workspace @cke/api` (expect `Container cke-db-1 Healthy`). The data and photos are kept between runs.
2. Start the API for the tablet: `npm run dev:lan --workspace @cke/api` (expect `Ready on http://0.0.0.0:8787`). Sign-in needs `BETTER_AUTH_SECRET` in `apps/api/.dev.vars` (copied from `.dev.vars.example`, not committed). Demo staff sign in with the password `cke-demo-2026` (managers `efosa.m` and `ivie.m` on the laptop only).
3. Start the app development servers, each in its app folder: `npx expo start --dev-client --lan --port 8081` (customer), `8082` (rider), `8083` (business). Each app reads the API address from its own `.env` (`EXPO_PUBLIC_API_URL=http://192.168.0.154:8787`; `.env.example` is committed).
4. Tablet testing (ASTRO 10R, Android 12): turn on Wireless debugging and read out the IP address and port. Pairing is already done; `adb connect <ip>:<port>` reconnects. If the laptop gets “No route to host” (14 November 2026), turn Developer options off and on, allow Wireless debugging again, forget the old computer under Wireless debugging, and pair again with a new code (`adb pair <ip>:<pairing port> <code>`, then `adb connect <ip>:<port>`).
5. If something looks wrong in the database, steps 2 to 3c in `apps/api/README.md` rebuild it from scratch.

---

## 9. Log

Append a new dated entry after each work session. Never edit or delete earlier entries.

## [2026-11-11] Planning, design, and prototypes complete

**What was done:**
- Wrote and refined the brand document from v1.0 to v1.7, and created `architecture.md` (v0.18), `design.md` (v0.15), and `list-of-areas.md`.
- Designed the logo, typography, packaging, and social direction on the design canvas, and produced the logo package with tokens.
- Made and verified every stack decision against current free tiers.
- Built and published clickable prototypes of all three apps and the website.
- Latest changes: cancellation friction, the Orders tabs, customer deactivation and Danger zone deletion, the More tab, customer IDs and the leaderboard, editable delivery fee and rider pay, owner-protected staff deactivation, value columns in reports, and a custom report range.

**Files created/updated:**
- `docs/Casual-Kitchen-Express.md` — brand and business, surface level (v1.7)
- `docs/architecture.md` — technical source of truth (v0.18)
- `docs/design.md` — UI and UX source of truth (v0.15)
- `docs/list-of-areas.md` — delivery areas and boundary
- `design/prototypes/` — four clickable HTML prototypes
- `brand/cke-logo-package/` — logo files, icons, tokens, web snippet
- `progress.md` and `CLAUDE.md` — this handoff

**Decisions locked in:**
- See sections 4 and 5 above, and the decision tables in `architecture.md` (section 14) and `design.md` (section 10).

**Open questions / not yet decided:**
- Food photos, delivery areas on a map, the boundary polygon, the GitHub releases URL, the package manager and monorepo tool, and the Expo SDK version.

**Next step:**
- Set up the repository (section 8, step 1), then build the backend foundation and run the 16.1 verification checks.

---

## [2026-11-11] Versions locked and final review

**What was done:**
- Locked every version in `docs/architecture.md`, section 15: Expo SDK 58 (58.0.21), React Native 0.88.1, React 19.3.0, TypeScript 6.0.3, Node.js 26 LTS, pnpm 12.16.1, Turborepo 2.11.10, Hono 4.13.14, Drizzle ORM 0.45.4, Better Auth 1.7.14, and all other libraries. The rule is the newest stable release at least two weeks old (published on or before 28 October 2026).
- Decided pnpm with Turborepo, TanStack Query, Gifted Charts, React Native styles with brand tokens (no UI kit), the browser-based Google sign-in, and a website with no packages.
- Manager Orders screen: any date range back to the first order, search by order number or customer ID, count and total value, and paging.
- Order numbering fixed: online numbers run continuously from O-0001, and walk-in numbers restart at W-001 each day. All examples in the prototypes and docs were renumbered to match.
- Final uniformity review of all documents: the flat delivery fee is editable, the build is in development (not on hold), a single People screen replaces separate Riders and Staff screens, and missing screens were added to `design.md`.

**Files created/updated:**
- `docs/architecture.md` — v0.19: locked versions, build order with repository setup, historic orders, numbering
- `docs/design.md` — v0.16: locked libraries, historic orders flow, missing screens, uniformity fixes
- `docs/Casual-Kitchen-Express.md` — v1.8: in development, button colours by app, uniformity fixes
- `design/prototypes/` — all four rebuilt with the new numbering and the historic orders range
- `progress.md` and `CLAUDE.md` — updated for the locked versions

**Decisions locked in:**
- Versions are fixed. Upgrades need the owner’s approval and a change log entry.

**Open questions / not yet decided:**
- Food photos, delivery areas on a map, the boundary polygon, and the GitHub releases URL.

**Next step:**
- Set up the repository with the locked versions (section 8, step 1), then build the backend foundation and run the 16.1 verification checks.

---

## [2026-11-11] Full context review and owner decisions on gaps

**What was done:**
- Read every document, the brand package, and all four prototypes end to end, and listed the gaps between the prototypes and the docs.
- The owner answered each gap. Decisions are recorded in the documents below.

**Files created/updated:**
- `docs/architecture.md` — v0.20: Node.js 24 LTS, npm workspaces, MGR-35 cancellation limit (3 to 7), order load display, planned CancellationRequest, HelpRequest, and Alert records, two new settings, delivery range wording, repository URL
- `docs/design.md` — v0.17: Your order screen, rider tabs, kitchen side rail, walk-in cash amounts, load display, decisions table rows
- `docs/list-of-areas.md` — areas in range decided, neighbourhood list updated, landmark research added to the to-confirm list
- `progress.md` — stack, rules, open items, and this entry

**Decisions locked in:**
- Node.js 24 LTS (not 26). npm workspaces with Turborepo (not pnpm).
- Cancellation limit: 3 in 7 days by default, managers can set 3 to 7.
- Rider queue shows load as "Load 5 of 6", with no light, medium, or heavy labels on orders.
- Walk-in cash buttons: Exact, then ₦500, ₦1,000, ₦2,000, ₦5,000, showing only amounts above the total.
- Kitchen and manager app gets Follow phone in its theme choice.
- Customer app keeps a separate Your order screen before checkout.
- Rider bottom tabs (Home, Queue, Earnings, Me) and the kitchen side rail are adopted.
- The website feature list doesn’t mention cancelling.
- Delivery range: both sides of Oluku, Isihor, Iguosa, and the Oluku villages, all up to Oluku Market.
- Repository: ARMSTRONG-AISOSA/casual-kitchen-express. Food photos: free libraries first, then AI.

**Open questions / not yet decided:**
- The boundary polygon from map pins, name spellings, and any extra landmarks (owner approval needed for each).

**Next step:**
- Install JDK 17 and the Android SDK, then set up the repository (section 8, step 1).

---

## [2026-11-11] Landmarks, version check, and repository setup (build step 0)

**What was done:**
- Researched landmarks between Uselu and Oluku Market in OpenStreetMap. The owner approved all seven landmarks, two new areas (Uwelu, Idunmwowina), and two corrections (UNIBEN coordinates, Utekon’s position).
- Checked every locked version against npm: all exist and are on or before the 28 October cutoff. Found two locked pairs that don’t work together and fixed them with the owner’s approval.
- Set up the monorepo: npm workspaces and Turborepo, three Expo apps (Expo Router, fonts, brand icon, Android 10 minimum), the Hono API Worker with a `/health` route and a Workers-runtime test, four shared packages (types, validation, API client, brand tokens), and a placeholder website. Added the MIT `LICENSE`, the README with its single Claude Code credit line, Prettier, and ESLint.
- Checks: typecheck, lint, and test all pass (12 of 12 Turborepo tasks), and Prettier is clean.
- Git repository started on `main`, with the first commit. Nothing pushed.

**Files created/updated:**
- `package.json`, `package-lock.json`, `turbo.json`, `tsconfig.base.json`, `.npmrc`, `.nvmrc`, `.gitignore`, Prettier files, `LICENSE`, `README.md`
- `apps/customer`, `apps/rider`, `apps/business`, `apps/api`, `apps/website`, `packages/*`
- `docs/architecture.md` — vitest-plugin swap, ESLint 9.39.5, exact Expo pins, install scripts, security check, package IDs
- `docs/list-of-areas.md` — landmarks, new areas, corrections, OpenStreetMap source

**Decisions locked in:**
- `@cloudflare/vitest-plugin` 1.4.10 replaces the deprecated `@cloudflare/vitest-pool-workers` 0.23.0 (it only supported Vitest 4).
- ESLint 9.39.5 replaces 10.13.0 (Expo’s React rules don’t support ESLint 10 yet).
- Android package IDs: `com.armstrongaisosa.casualkitchenexpress.customer`, `.rider`, `.business`.
- MIT licence holder: Armstrong Omoregie.
- Expo packages pinned exactly to the lock table, because `npx expo install` picks newer patches.
- `npm audit`: 14 moderate findings, all in development-machine tools, accepted for now (architecture.md 15).

**Open questions / not yet decided:**
- None new. Feature libraries (maps, Better Auth, image tools, location, notifications, charts) are installed when their features are built.

**Next step:**
- The owner runs `sudo apt install -y openjdk-17-jdk`. Then install the Android SDK and do a first local Android build, then start the backend foundation (section 8, step 2).

---

## [2026-11-12] Machine setup, first Android build, and app running on the tablet

**What was done:**
- JDK 17.0.21 installed by the owner (apt). The home router’s DNS timed out on Ubuntu’s servers; switching to 1.1.1.1 and 8.8.8.8 fixed it.
- Android SDK installed in `~/Android/Sdk` (command-line tools 23.0, checksum verified; platform-tools 37.0.1; Platform 36; build-tools 36.0.0). Gradle later added Platform 37 and NDK 27.1 by itself. The owner set `JAVA_HOME`, `ANDROID_HOME`, and `PATH` in `~/.bashrc`.
- GitHub remote `origin` added (https://github.com/ARMSTRONG-AISOSA/casual-kitchen-express.git). Not pushed.
- The first build compiled native code for four chip types and overloaded the laptop. It was stopped, 5.4 GB of x86, x86_64, and armeabi-v7a output was deleted, and builds are now arm64-v8a only.
- First debug APK of the customer app built (arm64-v8a, Android 10+). The owner installed it on their tablet, connected it to the development server at `http://192.168.0.154:8081`, and saw the CKE placeholder screen.
- Typed routes (an optional Expo Router feature) were switched off in all three apps: Expo’s CLI couldn’t load it with `expo-router` 58.0.28 in a workspace setup.

**Files created/updated:**
- `tools/expo-plugins/with-android-architectures.js` — sets arm64-v8a, allows armeabi-v7a for releases, refuses x86 and x86_64
- `apps/*/app.json` — the plugin added, typed routes removed
- `apps/*/tsconfig.json`, `apps/customer/.gitignore` — matching Expo’s clean-up
- `docs/architecture.md` (17.2), `CLAUDE.md` (key rules) — the processor-type rule

**Decisions locked in:**
- Android builds are arm64-v8a only. Release builds add armeabi-v7a. x86 and x86_64 are never built.

**Open questions / not yet decided:**
- None new.

**Next step:**
- Build step 2, the backend foundation: Neon and Hyperdrive setup, the Drizzle schema from architecture.md section 9, Better Auth, and the 16.1 checks (PBKDF2 timing, the username plugin, Durable Object alarms).

---

## [2026-11-12] Customer app screens on demo data (frontend first)

**What was done:**
- The owner asked to see the apps before the backend is built. The build order changed: app screens first, on demo data held in the app, then the backend.
- Built every customer screen with Expo Router, the shared brand tokens, and React Native styles (no UI kit): the Menu tab (hero, open or closed notice, reorder card, search, category chips, menu cards, sticky order bar), item details with options, Your order, single-screen checkout (Google sign-in stand-in, address, optional gender, pay method, totals), address entry (area, pin, landmark, outside-range example), demo payment, paid, tracking with the 4-digit delivery code, rating, the Orders tab (In progress and Order history), Profile, the More tab with text pages, Deactivate account, and Delete account (Danger zone, tick, typed phrase).
- Demo state lives in one store in the app (`src/state/store.tsx`). A Preview tools panel at the bottom of More (development builds only) switches open, paused, and closed, first-time and returning customer, and resets the demo.
- Food photos are “Photo to come” placeholders. The map is a drawn stand-in until MapLibre is added.
- The logo is drawn from the brand package’s SVG files, which a small script turns into a TypeScript module (`npm run logos --workspace @cke/brand-tokens`). The logo is not redrawn.
- Typecheck and lint pass across the repository (12 of 12 tasks). The development server was restarted with a cleared cache, and the bundle loads cleanly on the tablet.

**Files created/updated:**
- `apps/customer/app/` — tab layout and all screens listed above; the placeholder `index.tsx` removed
- `apps/customer/src/data/` — demo menu, order, geography, and text pages
- `apps/customer/src/state/` — the demo store and theme (light and dark)
- `apps/customer/src/ui/` — shared parts (text, buttons, cards, chips, sheet, toast, photo placeholder, map stand-in, preview tools)
- `packages/brand-tokens/scripts/build-logos.mjs`, `packages/brand-tokens/src/logos.generated.ts`, `packages/brand-tokens/src/index.ts`, `packages/brand-tokens/package.json` — logo SVGs as a module
- `.prettierignore` — skips the generated logo file
- `progress.md`, `docs/architecture.md` (16 and change log) — the new build order

**Decisions locked in:**
- Frontend first: the app screens are built on demo data before the backend (owner, 12 November 2026). Customer app first, placeholder photos for now, all customer screens in one pass.

**Open questions / not yet decided:**
- The owner’s feedback on the customer screens.
- None other. Claude can now see and tap through the app on the owner’s tablet (ASTRO 10R, Android 12) using Android’s Wireless debugging and adb, with no new packages. If the connection drops, the owner turns Wireless debugging back on and reads out the new IP address and port; pairing doesn’t need repeating.

**Next step:**
- The owner reviews the customer screens on the tablet. Fix what they report, then commit (not pushed until the owner says so).

---

## [2026-11-12] Claude tapped through the customer app on the tablet and fixed what it found

**What was done:**
- Connected to the owner’s tablet (ASTRO 10R, Android 12) over Wi-Fi with Android’s Wireless debugging and adb. Claude can now take screenshots and tap through the app itself, with no new packages.
- Went through every customer flow on the tablet: first-time order (sign-in stand-in, address with in-range and out-of-range pins, card payment, tracking to delivered, rating, reorder), one-tap reorder, cancel with reason and tick, pickup with bank transfer, search, Profile, More pages, the closed state, dark theme, and Delete account.
- Fixed:
  - The “added” message covered the View order bar. It now sits above it, and it uses inverted theme colours so it stays readable in dark mode.
  - The map stand-in grew very tall and cut off its pin. It now keeps a 4:3 shape.
  - Tracking times were fixed 24-hour values (“12:31”). They are now real clock times counted from when the order was placed, in the app’s style (“7:29 am”).
  - The phone’s back button after paying went to an empty checkout. Your order, Checkout, and Pay now leave the back stack, so back goes to the menu.
  - An empty checkout said “Add a delivery address to continue”. It now says “Your order is empty”.
  - Screens without footer buttons let their last button sit under Android’s navigation buttons. They now leave room for them.
  - The keyboard covered footer buttons (for example Delete my account). Screens now move up above the keyboard.
  - The optional gender question came back on the next order. After the first order the customer counts as returning, so it isn’t asked again (“nothing asked twice”).
  - Every order got the same number. Numbers now run on from the demo’s last order and never repeat.
  - Order summaries now include quantity and options (“2 × Jollof rice (with beef)”).
  - The map and its “updates every 45 seconds” line now hide once an order is delivered, when tracking stops.
  - On a cancelled order, the last step reached now shows as done.
  - The demo transfer note was reworded (“Normally this confirms by itself once the transfer lands. In this demo, it confirms when you tap the button.”).
  - The Preview tools’ Advance status button no longer stacks a new tracking screen each time.
- Typecheck and lint pass across the repository.

**Files created/updated:**
- `apps/customer/src/ui/toast.tsx`, `src/ui/map.tsx`, `src/ui/kit.tsx`, `src/ui/preview-tools.tsx`
- `apps/customer/src/state/store.tsx`, `src/data/order.ts`
- `apps/customer/app/track.tsx`, `app/checkout.tsx`, `app/pay.tsx`
- `progress.md`

**Decisions locked in:**
- The rider app’s screens come next, on demo data, after the customer screens are committed (owner, 12 November 2026).

**Open questions / not yet decided:**
- None new. Noted, not changed: the cancel sheet’s line “Cancelling often can limit cancelling on your account.” is the prototype’s wording; the gear button in the top-right corner is Expo’s development menu and doesn’t appear in release builds.

**Next step:**
- Commit the customer screens (not pushed), then build the rider app’s screens on demo data.

---

## [2026-11-12] Rider app screens on demo data

**What was done:**
- Committed the customer screens locally (`0c4bcee`, not pushed).
- Installed `expo-keep-awake` 58.0.3 (locked in architecture.md 15.2) in the rider app, for keeping the screen awake on pickup and code entry only (RID-15).
- Built the rider app’s first arm64-v8a debug APK (about 26 minutes) and installed it on the tablet over Wi-Fi. Its development server runs on port 8082, next to the customer app’s on 8081.
- Built every rider screen from design.md section 5, on demo data: sign in (with “Forgot your password? Ask your manager.”), set a new password at first sign-in, Home (Go online and today’s summary), Queue (yellow new-order banner, “Load 3 of 6”, only orders that fit the remaining capacity), order details and Accept, Order taken, My deliveries (next stop with one big button, later stops nearest first with “Deliver this next”), Pickup (match bag numbers, one “Picked up” for every bag), Drop-off (Navigate hands the address to the phone’s own navigation app; Call is a demo message because the customers are made up), code entry (large keypad, three tries, demo code 4827), Delivered, Need help, Release order (alert colour), Earnings (today, this week, this month, per-delivery pay, demo payouts), Me (read-only profile), and Settings (theme, sound, vibration, sign out).
- The rider palette from design.md 3.2: black on white, white on black in dark mode, Deep Tomato for alerts, Golden Yellow for new orders, green for success, always with an icon and a label. Type at 18 px and up, main buttons 72 px tall, no images, and no animation.
- Preview tools on the Me tab (development builds only): what the rider is carrying, pay per delivery (₦1,000 or ₦1,200), whether another rider wins the next accept, and a reset.
- Tapped through every flow on the tablet and fixed: tab labels running into Android’s navigation buttons, the confirmation message touching the footer buttons, quick keypad taps dropping digits, demo delivery times later than the current time, and a preview pair of orders whose load (7) was over the budget (6).

**Files created/updated:**
- `apps/rider/app/` — root and tab layouts, and every screen listed above; the placeholder `index.tsx` now redirects to sign-in, new password, or Home
- `apps/rider/src/data/orders.ts` — demo queue, rider details, payouts
- `apps/rider/src/state/` — demo store with the capacity rules (architecture.md 6), and the rider theme
- `apps/rider/src/ui/` — rider building blocks, toast, preview tools; `apps/rider/src/nav.ts` — clears finished task screens from the back stack
- `apps/rider/package.json`, `package-lock.json` — `expo-keep-awake`
- `progress.md`

**Decisions locked in:**
- None new.

**Open questions / not yet decided:**
- Proposal: disable “Go offline” while the rider still carries orders (open item 9).
- Rider sound alerts come with push notifications later; for now alerts vibrate only.

**Next step:**
- The owner reviews the rider app on the tablet (open “CKE Rider”, connect to `http://192.168.0.154:8082`). Then commit (not pushed), then the Business and Kitchen app screens.

---

## [2026-11-12] Rider decisions recorded, rider app committed

**What was done:**
- The owner approved both rider choices. Recorded in `design.md` (v0.18: 5.2 sound and vibration, 5.5 online toggle) and `architecture.md` (v0.22: RID-02, RID-14), each with a change log row.
- The Settings screen now says the sound comes with notifications in a later version.
- Stopped the idle Gradle and Kotlin build helpers left over from the rider build, which held about 4.5 GB of memory. They start again on the next build.
- Committed the rider app (not pushed).

**Decisions locked in:**
- The rider can’t go offline while carrying an order.
- Rider alert sounds come with push notifications; vibration works from the first build.

**Open questions / not yet decided:**
- None new.

**Next step:**
- The owner adds to the docs for the Business and Kitchen app. Don’t start building it until then.

---

## [2026-11-12] New staff roles, Finance, and the Business and Kitchen app screens

**What was done:**
- Rider app: Earnings now has All time beside Today, This week, and This month, and an **Owed** section listing everything not paid out yet (today and each earlier unpaid day, with the total). Payouts show the number of deliveries. Demo delivery times stay within opening hours.
- Owner decisions recorded in `architecture.md` (v0.23) and `design.md` (v0.19), each with a change log row:
  - **Dispatch officer** (D-001, username and password): Alerts, Orders, Riders, and Settings without Pricing and pay and Restaurant contact. Customer contact on online orders (name, customer ID, phone, address with landmark, Call and WhatsApp buttons), the live riders panel, rider help requests, assigning an unaccepted order to a rider (with RID-23 in the rider app), and cancellation requests (approve or decline, no other refunds). DSP-01 to DSP-06.
  - **Account officer** (A-001, username and password): Reports, Rider pay (can mark payouts as paid), and a new **Finance** menu: monthly statement, daily cash-up (counted at close by the person on the counter, signed off by the account officer or a manager), audit trail, CSV and PDF export, and close month (locks the figures; later corrections are adjustments). ACC-01 to ACC-07.
  - A role and menu table (`architecture.md` 3.0) and side rail items by role (`design.md` 6.3).
  - **Restaurant contact** setting (MGR-36, managers only): one editable WhatsApp number behind “Contact the restaurant”.
  - **Soup of the day** (KIT-17): a manager or the owner picks it each morning on the Menu screen; the customer app shows it on the menu and dish screen, and only today’s soup can be ordered. The customer app’s preview tools can switch it for the demo.
  - **Report comparison removed** from the first release and kept as a possible future update (`architecture.md` 14.0).
  - New records: CashUp, MonthClose, Adjustment; Delivery gains “assigned by”; AuditLog gains kind and before and after values.
- Installed the locked `expo-keep-awake` 58.0.3, `expo-linear-gradient` 58.0.3, and `react-native-gifted-charts` 1.4.81 in the business app, and built its first arm64 debug APK.
- Built the Business and Kitchen app on demo data: sign in (username and password, Continue with Google for managers, demo accounts), the side rail by role, the order board (New, Preparing, Ready, channel filter, pause switch), ticket with station checklist, Ready and Collected, walk-in entry, payment with cash amounts above the total only, the order number to call out, sold out, alerts with actions, cash-up at close (offered at sign-out), dashboard, orders with search, order detail with the Customer card and refunds (managers), assign to a rider, the live riders panel, people (all five roles, reset password, deactivate, owner protected), person editor, menu and item editor, rider pay with payouts, reports with a Gifted Charts bar chart, Finance (statement, cash-ups with sign-off, audit trail, close month), settings by role, and demo controls.

**Decisions locked in:**
- The roles, menus, and Finance features above (owner, 12 November 2026). Dispatch officers get all four suggested extras.

**Open questions / not yet decided:**
- None new. The customer leaderboard was opened to account officers as well as managers; the owner can reverse this.

**Next step:**
- The owner reviews the Business and Kitchen app on the tablet. Then commit (not pushed).

---

## [2026-11-12] Consistency review of all documents

**What was done:**
- Read every Markdown file (`progress.md`, `README.md`, `CLAUDE.md`, `architecture.md`, `design.md`, `Casual-Kitchen-Express.md`, `list-of-areas.md`, the logo package README) and checked them against each other and against the built apps.
- Added the dispatch officer and account officer wherever staff roles were still listed as kitchen staff and managers only: users and scope, attribution (4.5), the cancellation table (4.6), sign-in (12.1 and 12.2), alerts, the People screen (five tabs, as built), seed people (18.3), and payouts (18.1 and 18.2).
- `architecture.md`: a note under the Manager features on which ones the officers also use; Need help goes to dispatch (RID-11); alerts and live setting changes in section 10; decision rows for staff roles, Finance, the soup of the day, and report comparison; seeded cash-ups and closed months; KIT-16 and KIT-17 and MGR-35 and MGR-36 put in number order; a duplicate divider removed; the build order note now says all three apps’ screens are built.
- `design.md`: today’s soup on the item detail, a flow for orders assigned by dispatch, the officer roles on the manual completion and rider pay flows, the side rail decision row updated for roles.
- `Casual-Kitchen-Express.md` (surface level): the soup of the day, the two new roles, and the build status.
- Stale copy in the rider app: Need help and the code screen now say dispatch will call, and Earnings says CKE pays out each week (account officers or managers mark payouts).
- Found one mismatch: `design.md` said account officers see the customer leaderboard, but `architecture.md` (Decided) says managers only. Recorded as a Proposal in both, awaiting the owner (open item 11).

**Files created/updated:**
- `docs/architecture.md` (v0.24), `docs/design.md` (v0.20), `docs/Casual-Kitchen-Express.md` (v1.9), `README.md`, `progress.md`
- `apps/rider/app/help.tsx`, `app/code.tsx`, `app/(tabs)/earnings.tsx`, `src/data/orders.ts`

**Decisions locked in:**
- None new. Owner rules on arm64 builds, asking before commits, not pushing, and detailed instructions added to section 3.

**Open questions / not yet decided:**
- Walk-in cash amounts above ₦5,000 (open item 10) and the leaderboard for account officers (open item 11).

**Next step:**
- The owner answers open items 10 and 11 and reviews the Business and Kitchen app. Then commit (not pushed).

---

## [2026-11-12] Soup on Sold out, cash amounts, sign-off records, and the Business app committed

**What was done:**
- Owner decisions recorded in `architecture.md` (v0.25) and `design.md` (v0.21), with change log rows, and in the brand document and this file:
  - **Soup of the day:** kitchen staff pick it on the Sold out screen each morning; managers (including the owner) can use Sold out or Menu. One shared picker in the app (`src/ui/soup.tsx`), logged in the audit trail.
  - **Walk-in cash:** an Exact button and an Other amount box. The ₦500 to ₦5,000 buttons are gone. An amount below the total says so and can’t be confirmed (open item 10 closed).
  - **Who signed off:** the cash-up sign-off records whoever is signed in, an account officer or any manager, by name, staff ID, and time. The sheet says who it will be recorded as, and each day shows “Signed off by”. Closing a month records who closed it and when, shown as “Closed by”. Counted-by now shows the name too.
- Tested on the tablet: Blessing (kitchen) set Efo riro on Sold out; a ₦11,400 walk-in refused ₦10,000 and showed ₦3,600 change for ₦15,000; the owner signed off Tue 10 Nov and it showed “Efosa Igbinedion (M-001), 12:11 pm”; October shows “Closed by Ngozi Bello (A-001)”.
- Fixed the formatting of `packages/brand-tokens/scripts/build-logos.mjs`.
- Typecheck and lint pass (11 of 11), and Prettier is clean.
- Committed everything locally (not pushed).

**Files created/updated:**
- `apps/business/src/ui/soup.tsx` (new), `app/(app)/sold-out.tsx`, `app/(app)/menu.tsx`, `app/(app)/walk-in-pay.tsx`, `app/(app)/finance.tsx`, `src/data/seed.ts`, `src/state/store.tsx`
- `packages/brand-tokens/scripts/build-logos.mjs`
- `docs/architecture.md`, `docs/design.md`, `docs/Casual-Kitchen-Express.md`, `progress.md`

**Decisions locked in:**
- The three above (owner, 12 November 2026).

**Open questions / not yet decided:**
- The customer leaderboard for account officers (open item 11).

**Next step:**
- The owner answers open item 11. Then the backend foundation (section 8, step 4).

---

## [2026-11-12] Reports layout, sales amounts, rider and area tables, leaderboard

**What was done:**
- Owner decisions recorded in `architecture.md` (v0.26) and `design.md` (v0.22), with change log rows:
  - Account officers see the customer leaderboard (MGR-34; open item 11 closed).
  - Reports: the report tabs sit on top under a “Report” label. Below a divider, the Date range and the Channel (All, Online, Walk-in) each have their own labelled box: side by side on screens 1250 dp or wider, stacked below that, so each box’s buttons stay on one line.
  - Sales details show the amount before the percentage (“Card ₦735,730 (51%)”), and the online and walk-in split was added.
  - Riders, areas, and staff: separate tables for **Riders** (every rider, deliveries, share, average delivery time, total row), **Areas** (every area, deliveries, share, average time, total row), and Kitchen staff. Worked out in the app from the demo delivery records in the chosen date range and channel. Walk-in explains there are no deliveries.
  - The demo figures now come from one 60-day record set, so 7, 30, and 60 days agree with each other (before, each range had its own unrelated numbers).
  - `architecture.md` 14.4: starting ideas for fewer API calls and fresher data (what goes stale when), to go over with the owner before the backend (open item 12, build step 4). Also saved as a Claude memory.
- Tested on the tablet: 7 days showed 214 deliveries across the four riders; 60 days recalculated to 1,787, with all ten areas listed.
- Typecheck and lint pass, and Prettier is clean.

**Files created/updated:**
- `apps/business/app/(app)/reports.tsx`
- `docs/architecture.md`, `docs/design.md`, `progress.md`

**Decisions locked in:**
- The report changes and the leaderboard access above (owner, 12 November 2026).

**Open questions / not yet decided:**
- The call-reduction and freshness choices (open item 12), at the start of the backend.

**Next step:**
- Owner review, then commit (not pushed). Then the backend foundation, starting with open item 12.

---

## [2026-11-12] Data freshness decisions and the backend foundation started

**What was done:**
- Committed the Reports changes (`d4d2032`, not pushed).
- Owner decisions on fewer API calls and fresh data (`architecture.md` 14.4, open item 12 closed): settings and menu use a version number with a live nudge; past data is kept and only today refreshed; reports are worked out in the app or the database by size; reconnecting fetches only what changed.
- Owner decisions on setup: local Postgres in Docker for development, a Cloudflare account soon (for the early 16.1 checks), and Neon at deploy.
- Locked the Postgres Docker image at 17.10 (17.11 is newer than the cutoff), pinned by digest (`architecture.md` 15.1). It runs on 127.0.0.1 only.
- Updated the shared types and validation for the dispatch officer and account officer roles (staff codes D- and A-).
- Built the schema from `architecture.md` section 9 (30 tables) with Drizzle, generated the first migration, and applied it. Added change numbers for syncing, a catalog version, soup varieties, and hours overrides (recorded under section 9).
- A base seed script: the brand document’s menu (22 items with protein and swallow options), the three soups, the ten areas, and the default settings.
- The Worker connects through Hyperdrive (pointed at the Docker database locally). `GET /bootstrap` returns the menu, soups, areas, and customer-facing settings with an ETag, and answers 304 when the app already has that version. Tests run inside the Workers runtime against the local database: 3 of 3 pass.
- Fixed a “socket has been closed” error that pg’s Workers socket reports after a connection is closed: it’s now ignored only after the close.
- `apps/api/README.md` lists the database commands with what each should print.

**Files created/updated:**
- `apps/api/docker-compose.yml`, `drizzle.config.ts`, `drizzle/0000_init.sql` and `drizzle/meta/`, `src/db/schema.ts`, `src/db/catalog.ts`, `src/db/client.ts`, `src/routes/bootstrap.ts`, `src/index.ts`, `scripts/seed-base.ts`, `test/bootstrap.test.ts`, `wrangler.jsonc`, `worker-configuration.d.ts`, `package.json`, `README.md`
- `packages/types/src/index.ts`, `packages/validation/src/index.ts`
- `docs/architecture.md` (v0.27, v0.28), `progress.md`

**Decisions locked in:**
- The data freshness choices, the local database, and the account timing above (owner, 12 November 2026).

**Open questions / not yet decided:**
- None new. The API tests need the local database running (README step 1).

**Next step:**
- Better Auth in the Worker: Google sign-in for customers and managers, username and password for the other staff roles, roles checked on every route. Then the owner creates the Cloudflare account (detailed steps to follow) to run the 16.1 checks: PBKDF2 timing, the username plugin, and Durable Object alarms.

---

## [2026-11-12] Add and remove soups in the rotation, through the API

**What was done:**
- Owner decision: managers add and remove soups in the soup of the day rotation on the Menu screen, saved in the database and shown in the customer app (`architecture.md` KIT-17, v0.29; `design.md` 7.2 and a new flow, v0.23).
- API: `POST /soups`, `DELETE /soups/:id`, and `PUT /settings/soup-of-the-day`. Removing archives the soup (past orders point to it), adding the name again brings it back, today’s soup can’t be removed, and one soup always stays. Each change raises the catalog version and goes in the audit log. 4 of 4 API tests pass.
- Temporary write guard until sign-in: changes are refused unless `ALLOW_UNSIGNED_WRITES` is on, which is set only in `apps/api/.dev.vars` on the laptop (not committed).
- `@cke/api-client`: the bootstrap call remembers its ETag and keeps its data on a 304; soup calls return the API’s plain-English messages.
- Business app: the Menu screen’s soup card lists Soups in the rotation with Remove (with a confirmation) and an Add a soup box. Sold out keeps pick-only for kitchen staff. A line says whether changes are saved for every app or only in demo data.
- Customer app: today’s soup and the soup list come from `GET /bootstrap` when the app opens and when it comes back to the front; an unchanged catalog costs a 304.
- Both apps read the API address from a local `.env` (`.env.example` committed) and fall back to their demo data without it. The API runs on the laptop’s network address for the tablet (`npm run dev:lan --workspace @cke/api`).
- Checked from the laptop over the network: add Banga, the 304 before and the full reply after a change, remove Banga, both actions in the audit log. The tablet dropped off wireless debugging, so the owner tests on the tablet.

**Files created/updated:**
- `apps/api/src/routes/soups.ts`, `src/auth/actor.ts`, `src/index.ts`, `test/soups.test.ts`, `wrangler.jsonc`, `worker-configuration.d.ts`, `package.json`, `.dev.vars.example`
- `packages/api-client/src/index.ts`, `packages/validation/src/index.ts`
- `apps/business/src/api.ts`, `src/state/catalog.tsx`, `src/state/store.tsx`, `src/ui/soup.tsx`, `app/_layout.tsx`, `app/(app)/menu.tsx`, `.env.example`
- `apps/customer/src/api.ts`, `src/state/catalog.tsx`, `src/state/store.tsx`, `src/data/menu.ts`, `app/item/[id].tsx`, `src/ui/preview-tools.tsx`, `app/_layout.tsx`, `.env.example`
- `docs/architecture.md`, `docs/design.md`, `progress.md`

**Decisions locked in:**
- Managers add and remove soups in the rotation (owner, 12 November 2026).

**Open questions / not yet decided:**
- None. The owner tests on the tablet, then we commit and move on.

**Next step:**
- Owner tests, then commit (not pushed). Then sign-in with Better Auth and role checks, replacing the temporary write guard, then the owner’s Cloudflare account steps.

---

## [2026-11-12] Soup dishes follow today’s soup, and menu photos in the apps

**What was done:**
- Reconnected to the tablet (new pairing code). The tablet test of the soup rotation passed: adding a soup on the Business app’s Menu screen saved it to the database, Remove (with its confirmation) took it out, today’s soup’s Remove is greyed out, and both actions are in the audit log.
- Owner request: the soup dishes carry today’s soup. The customer app now shows “Soup of the day: Egusi”, “Extra egusi”, and Home Plate “Egusi with pounded yam, fish, and water”, and the soup and extra soup show that soup’s own photo with its name on it. Each order line keeps the soup it was ordered with. The Business app’s walk-in tiles, tickets, and sold-out list use the same names (“Efo riro with eba”). The customer Menu tab checks for a new soup each time it comes into view (a 304 when nothing changed). Tested on the tablet: switching the soup from Efo riro to Egusi changed the names, descriptions, and photos.
- Owner request: populate the apps with images, before sign-in. Sourced 22 menu photos from Wikimedia Commons and Flickr (through Openverse) following the brand document (Nigerian dishes that match the menu, free licences that allow commercial use, sources recorded, no brand logos). Processed to `architecture.md` 8.1 (4:3, at most 1200 px, WebP 78, all under 250 KB, metadata removed). Credits in `docs/photo-credits.md`, `apps/api/seed-media/menu/credits.json`, the database, and a new Photo credits page under More in the customer app.
- Backend: each soup has its own photo; MediaAsset rows carry title, author, licence, and source; photos are stored in R2 (local for now) and served by `GET /media/:id` with a year’s caching; `GET /media/credits`; a seed script uploads and links them. Migrations `0001` and `0002`.
- Customer app: real photos on menu cards and the dish screen, the placeholder where there is no photo. Business app: small photos on the Menu screen’s items and soup rotation. The rider app stays image-free by design.
- The apps use React Native’s Image for now; expo-image (decided) is a native module and comes with the next native build (`architecture.md` 15.2).
- API tests: the catalog tests are in one file and test files run one after another, because running them at the same time stalled requests through Hyperdrive’s local proxy; the soup test clears any test soup left behind. 4 of 4 pass, three runs in a row.

**Files created/updated:**
- `apps/api/seed-media/menu/` (22 photos and `credits.json`), `scripts/seed-media.ts`, `src/routes/media.ts`, `src/routes/bootstrap.ts`, `src/db/schema.ts`, `drizzle/0001_soup-photo.sql`, `drizzle/0002_media-credits.sql`, `drizzle/meta/`, `src/index.ts`, `wrangler.jsonc`, `worker-configuration.d.ts`, `vitest.config.ts`, `test/catalog.test.ts` (replaces the bootstrap and soups test files), `package.json`
- `packages/api-client/src/index.ts`
- `apps/customer/src/data/menu.ts`, `src/state/store.tsx`, `src/state/catalog.tsx`, `src/ui/photo.tsx`, `app/(tabs)/index.tsx`, `app/item/[id].tsx`, `app/cart.tsx`, `app/(tabs)/more/index.tsx`, `app/(tabs)/more/photo-credits.tsx`
- `apps/business/src/state/store.tsx`, `src/state/catalog.tsx`, `src/ui/thumb.tsx`, `src/ui/soup.tsx`, `app/(app)/menu.tsx`, `app/(app)/walk-in.tsx`, `app/(app)/sold-out.tsx`
- `docs/photo-credits.md` (new), `docs/architecture.md` (v0.30), `docs/design.md` (v0.24), `docs/Casual-Kitchen-Express.md`, `progress.md`

**Decisions locked in:**
- Soup dishes carry today’s soup in name, description, and photo (owner, 12 November 2026).
- Photos come before sign-in (owner, 12 November 2026).

**Open questions / not yet decided:**
- The Office Lunch Combo photo: an AI image from real references, or a photo of the real dish (open item 1).

**Next step:**
- Owner tests, then commit (not pushed). Then sign-in with Better Auth and role checks, then the owner’s Cloudflare account steps.

---

## [2026-11-12] Photo upload with compression, refunds with confirmation, Refunds report, View profile

**What was done:**
- Owner answers: search larger photo libraries (no AI images); use real, freely licensed photos of Nigerians for the demo staff, matched by gender (Claude raised that this presents real people as made-up staff; the owner chose it, so only photos whose licence allows reuse and changes are used, each credited, no public figures, marked as demo); rebuild the Business app now.
- Board bug fixed: on a tablet in portrait, the Taking orders switch and clock move to a second row, so they no longer overlap the person and Switch person (tested on the tablet).
- Rebuilt the Business app’s arm64 APK with the locked `expo-image-picker` 58.0.10, `expo-image-manipulator` 58.0.16, and `expo-image` 58.0.18 (about 49 minutes), installed it, and stopped the build helpers.
- Photo upload in the Business app: one way to take or choose, crop (4:3 dishes and soups, square staff), and compress (WebP, quality 78 stepping down until under 250 KB or 80 KB), used on Menu (tap a dish’s photo), the item editor, the soup rotation (tap a soup’s photo; the dialog opens when a soup is added), and the person editor. The dialog shows the size saved and asks where the photo is from: Our own photo (optional photographer and link) or From the internet (who took it, licence, link; licence link optional). Errors show inside the dialog. Tested on the tablet: 995 KB reduced to 152 KB, saved, the old photo deleted.
- API: `PUT /photos/:kind/:id` checks the WebP, its size, and its dimensions, stores it, links it, and deletes the old photo (record and file); `DELETE` removes it; `GET /media/credits` lists only photos in use, so the customer app’s Photo credits follow every change; `GET /staff/photos`. MediaAsset gains a source kind. The demo staff are seeded into the database (`db:seed-people`). Migration `0003`.
- Customer app: Photo credits shows “Photo by Casual Kitchen Express (name)” for CKE’s own photos.
- Refunds: every place that refunds (order detail, approving a cancellation request in Alerts, cancelling a walk-in on its ticket) needs an “I’m sure I want to refund ₦… for …” tick, shows who it will be recorded as, and records the name, role, staff ID, and time (on the order, in the audit trail, and in the new report). Tested: “Efosa Igbinedion, Manager (M-001), 7:04 pm”.
- Reports: a Refunds tab with the same date range, channel, and export as the others: count, total, average, by reason, by person, and every refund, newest or largest first.
- People: View profile (all details and the photo, or an initials placeholder), photos on the cards and in the top bar, and gender and home address in the editor.
- Orders: Back to Orders on the order detail.
- API tests: 5 of 5 pass. Fixed a test left with Banga as today’s soup by an interrupted run (the clean-up now moves today’s soup first), raised the test time limit, and noted that the tests share local state with `dev:lan`, so run them with it stopped.
- Not done: staff headshots (Commons had too few, mostly public figures; Openverse was down) and better food photos. Both wait for the owner’s Pexels API key.

**Files created/updated:**
- `apps/api/src/routes/photos.ts`, `src/routes/staff.ts`, `src/media/webp.ts`, `src/routes/media.ts`, `src/index.ts`, `src/db/schema.ts`, `drizzle/0003_photo-source.sql`, `drizzle/meta/`, `scripts/seed-people.ts`, `scripts/seed-media.ts`, `test/photos.test.ts`, `test/catalog.test.ts`, `vitest.config.ts`, `package.json`, `README.md`
- `packages/api-client/src/index.ts`
- `apps/business/package.json`, `app.json`, `src/media/compress.ts`, `src/ui/photo-editor.tsx`, `src/ui/avatar.tsx`, `src/ui/thumb.tsx`, `src/ui/soup.tsx`, `src/ui/kit.tsx`, `src/ui/shell.tsx`, `src/ui/refunds-report.tsx`, `src/data/report-data.ts`, `src/data/seed.ts`, `src/state/store.tsx`, `src/state/catalog.tsx`, `app/(app)/menu.tsx`, `app/(app)/item/[id].tsx`, `app/(app)/people.tsx`, `app/(app)/person/[id].tsx`, `app/(app)/order/[no].tsx`, `app/(app)/alerts.tsx`, `app/(app)/ticket/[no].tsx`, `app/(app)/reports.tsx`
- `apps/customer/app/(tabs)/more/photo-credits.tsx`
- `package-lock.json`, `docs/architecture.md` (v0.31), `docs/design.md` (v0.25), `docs/photo-credits.md`, `progress.md`

**Decisions locked in:**
- MGR-06 photo upload with credits and replace-deletes-old, MGR-15 refund tick and refunder recorded, MGR-37 Refunds report, MGR-38 View profile (owner, 12 November 2026).

**Open questions / not yet decided:**
- None. Owner action: a free Pexels API key for the remaining food photos and the staff headshots.

**Next step:**
- Owner tests, then commit (not pushed). With the Pexels key: source the remaining food photos and the staff headshots. Then sign-in with Better Auth.

---

## [2026-11-12] Gemini photos for the menu and staff

**What was done:**
- Committed the photo upload, refunds, Refunds report, and View profile work (`5c088de`, not pushed).
- Pexels had paused new API keys, so Claude wrote an image prompt (the brand’s photography direction, no text or logos, invented faces) and the owner made the images with Google Gemini.
- Menu: the Office Lunch Combo (new), and the Yoghurt drink, Moi moi, and Home Plate (replacing the weak ones). Cropped to 4:3 (1195 x 896) and saved as WebP at quality 78 (42 to 84 KB). Credited as CKE’s own photos, “made with Gemini”.
- Staff: one grid image cut into 10 square headshots (about 276 px, about 5 KB each), saved as `apps/api/seed-media/staff/<staff ID>.webp`.
- Staff photos show no credit anywhere: the “Photo: …” line is gone from View profile, and the photo dialog skips the “Where’s the photo from?” questions for staff (saved as CKE’s own).
- `scripts/seed-media.ts` now seeds staff photos too, stores the Gemini menu photos as CKE’s own, flags nothing as demo, resets only the links it puts back (a soup added in the app keeps its photo), and removes any photo nothing uses (record and file). It removed two leftovers from testing.
- The originals stay in `apps/api/seed-media/incoming/` (gitignored).
- Checked on the tablet: Efosa’s photo in the top bar, the photos on People and View profile, the new dish photos in the customer app, and the four “made with Gemini” lines on Photo credits.
- Committed (`9a916f6`, not pushed) after the owner’s approval.

**Files created/updated:**
- `apps/api/seed-media/menu/` (4 WebP files, `credits.json`), `apps/api/seed-media/staff/` (new), `apps/api/scripts/seed-media.ts`
- `apps/business/app/(app)/people.tsx`, `apps/business/src/ui/photo-editor.tsx`
- `docs/photo-credits.md`, `docs/architecture.md`, `docs/design.md`, `.gitignore`, `progress.md`

**Decisions locked in:**
- Staff photos carry no credit anywhere (owner, 12 November 2026).
- No starting photo (menu or staff) is marked as demo; they carry on to the release’s starting data (owner, 12 November 2026). This replaces the earlier plan of credited internet headshots marked as demo.
- The four Gemini menu photos are credited “Casual Kitchen Express (made with Gemini)”.

**Open questions / not yet decided:**
- None.

**Next step:**
- A full documentation review before the owner’s break, then sign-in with Better Auth.

---

## [2026-11-12] Documentation review before a break

**What was done:**
- Read every Markdown file end to end (`progress.md`, `CLAUDE.md`, `README.md`, `apps/api/README.md`, `docs/architecture.md`, `docs/design.md`, `docs/Casual-Kitchen-Express.md`, `docs/list-of-areas.md`, `docs/photo-credits.md`, `brand/cke-logo-package/README.md`) and checked them against each other and against the code.
- `progress.md`: rewrote the current state (sections 1 to 8): the stage, the document versions and the 128 feature IDs, what is built in each app and the API, open items split into owner actions (in the order needed) and known gaps, a step table of what is done and what is left with a rough percentage, and how to resume after a break. Added two business rules (refunds, photos) and the no Co-Authored-By rule.
- `architecture.md` (v0.32): image compression covers dishes, soups, and staff (8.1); 8.1.1 updated for the 23 menu and 10 staff photos; seeded photos aren’t flagged as demo (9, 18.3); expo-image is installed in the Business app (15.2); 14.4’s heading no longer says “to go over”, and 14.3 now comes before 14.4; the build-order note matches the current step; a gap recorded: photos are public until sign-in, against 3.1 and 12; MGR-15 punctuation.
- `design.md` (v0.26): the Refunds tab in the reports flow; the refund tick in the walk-in cancel and cancellation-request flows; a missing full stop on More.
- `Casual-Kitchen-Express.md` (v1.10): menu photos are in (some made with an AI tool under the fallback rules); refunds are confirmed and recorded; the next phase and roadmap updated.
- `photo-credits.md`: table order fixed, and the 19 internet photos and 4 Gemini photos described separately.
- `apps/api/README.md`: the photo seed’s expected output and the staff photos route.
- `README.md`: points to `apps/api/README.md` and `docs/photo-credits.md`.

**Files created/updated:**
- `progress.md`, `README.md`, `apps/api/README.md`, `docs/architecture.md`, `docs/design.md`, `docs/Casual-Kitchen-Express.md`, `docs/photo-credits.md`

**Decisions locked in:**
- None new.

**Open questions / not yet decided:**
- None new. Known gaps are listed in section 7.

**Next step:**
- Sign-in with Better Auth and role checks (section 8, step 4b), then the owner’s Cloudflare account steps.

---

## [2026-11-14] Back from the break: reconnections, Cloudflare login, and the free-plan checks

**What was done:**
- Restarted the database (data intact), the API on the network, and the three app development servers. Prettier, typecheck, and lint pass.
- Committed the documentation review (`8905aad`, not pushed).
- Tablet: “No route to host” until the owner turned Developer options off and on and paired again; reconnected, and the Business app loads from the laptop and reads the API. Recreated Claude’s tablet helper script (the scratchpad was cleared by the restart).
- Cloudflare login failed with `ETIMEDOUT`: Node gives each connection attempt 250 ms, and this laptop has no IPv6 and a slower IPv4 path to Cloudflare. Fixed with `NODE_OPTIONS="--network-family-autoselection-attempt-timeout=2000"` (section 7). Wrangler is logged in.
- Did not run Cloudflare’s general “agent setup” page (it would install extra plugins, a global CLI outside the locked versions, and edit global settings); Wrangler is all the project needs.
- Google Cloud: the project was created without a card by going straight to the project page and skipping the free-trial offer (project ID `cke-project-514706`).
- Free-plan checks on a throwaway Worker `cke-check-temp`, then deleted it and its local files, confirmed gone:
  - PBKDF2-SHA-256 CPU time (median of 8): 20,000 iterations 4 ms, 30,000 5 ms, 40,000 7.5 ms, 50,000 9.5 ms; 100,000 reached 34 ms. None failed. 50,000 sits at the 10 ms limit.
  - A Durable Object alarm fired 1 ms after its time, and a hibernating WebSocket answered after 12 seconds idle.
- Side effect: the first deploy registered the account’s workers.dev subdomain as `cke-check-temp` (recorded in section 7 to rename).

**Files created/updated:**
- `docs/architecture.md` (v0.33: 12.2 and 16.1 items 2 and 3), `progress.md`

**Decisions locked in:**
- None new.

**Open questions / not yet decided:**
- The staff password iteration count, given the measurements (planned about 50,000).
- The lasting workers.dev subdomain name.

**Next step:**
- The owner answers the two questions, then sign-in with Better Auth (step 4b).

---

## [2026-11-14] Password strength and the workers.dev name decided

**What was done:**
- Owner decisions: staff passwords use PBKDF2 at **30,000 iterations** (about 5 ms measured, instead of about 50,000 at 9.5 ms), and the account’s workers.dev subdomain is **`casualkitchenexpress`**.
- Renamed the subdomain through the Cloudflare API (an existing name can’t be overwritten, so the old one was deleted first while no Worker was deployed) and confirmed it reads `casualkitchenexpress`. Crossed off in section 7.
- Recorded in `architecture.md` v0.34 (12.2, 14, 14.2, 16.1) and here.

**Files created/updated:**
- `docs/architecture.md`, `progress.md`

**Decisions locked in:**
- PBKDF2 at 30,000 iterations for staff passwords; workers.dev subdomain `casualkitchenexpress` (owner, 14 November 2026).

**Open questions / not yet decided:**
- None.

**Next step:**
- Sign-in with Better Auth and role checks (step 4b).

---

## [2026-11-14] Sign-in and roles: the API and the Business app

**What was done:**
- API (Better Auth 1.7.14): staff sign in with a username and password (PBKDF2-SHA-256 at 30,000 iterations, `src/auth/password.ts`); 30-day sessions; no sign-up and no forgot-password. `GET /me`, `POST /me/password`, and the managers’ People routes (`/people`: list, add with a temporary password shown once, edit, reset password, deactivate, reactivate; the owner can’t be deactivated, managers have no password to reset). Every change route checks the role on the route itself (3.0), not through wildcard middleware, because of a Hono advisory. Staff with a temporary password can only change it. Deactivated staff are refused at sign-in (“This account is deactivated. Ask a manager.”) and signed out straight away. Staff photo files need a staff session; menu photos stay public. Sign-in is limited to 5 tries a minute per address through a Durable Object (`AuthRateLimiter`). The temporary `ALLOW_UNSIGNED_WRITES` guard is gone; `.dev.vars` now holds `BETTER_AUTH_SECRET`.
- Seed: demo staff get the password `cke-demo-2026`; managers get usernames (`efosa.m`, `ivie.m`) only with `SEED_MANAGER_PASSWORDS=1` on the laptop.
- Tests: 11 of 11 pass (a new `test/auth.test.ts`; the catalog and photo tests now sign in as the owner; test sign-ins use addresses from the documentation range so the rate limit doesn’t trip).
- Installed the locked `@better-auth/expo` 1.7.14, `expo-secure-store` 58.0.2, `expo-network` 58.0.4, and `expo-web-browser` 58.0.7 (Business and rider apps; `@better-auth/expo` in the API too). `npm audit`: the same 15 moderate findings as before (one, Hono, is newly reported upstream; see section 7).
- Business app (rebuilt arm64 APK, 40 minutes): real sign-in with plain messages, a Set a new password screen (reuses the temporary password just typed), the session kept on the device, Switch person and Sign out also sign out of the API, riders sent to the rider app, and the People screen changing real accounts. `@cke/api-client` sends the session cookie and reports an ended session.
- Owner decisions: the tablet’s 8:30 pm sign-out waits until every order placed before 8:30 pm is collected, delivered, or cancelled, and a manager-only **Tablet sign-out** switch in Settings turns it on or off (on by default). Someone who signs in after 8:30 pm isn’t signed out that evening. The switch is saved on the tablet for now, like the other demo settings; it moves to the database with them (step 6).
- Tested on the tablet: Blessing signed in (kitchen menus, her photo loaded with the session); she stayed signed in after the app was closed and reopened; Switch person signed her out of the API; Efosa signed in with the manager menus; People loaded from the database; adding a rider gave R-005 and a real temporary password; the first sign-in showed Set a new password and then the board; deactivating signed the person out at the next request and sign-in showed the deactivated message; the Tablet sign-out switch turned off and on. The test person was removed afterwards.
- Fixed while testing: the app used a stale role from its list after a manager changed it (a crash); the role and name now always come from the API at sign-in, and a saved rider session is signed out.

**Files created/updated:**
- `apps/api/src/auth/` (`auth.ts`, `password.ts`, `rate-limit.ts`, `actor.ts`), `src/routes/me.ts`, `src/routes/people.ts`, `src/routes/{soups,photos,staff,media}.ts`, `src/index.ts`, `wrangler.jsonc`, `worker-configuration.d.ts`, `.dev.vars.example`, `scripts/seed-people.ts`, `test/` (`auth.test.ts`, `session.ts`, catalog and photo tests), `vitest.config.ts`, `package.json`, `README.md`
- `packages/api-client/src/index.ts`, `packages/validation/src/index.ts`
- `apps/business/src/auth.ts`, `src/api.ts`, `src/state/session.tsx`, `src/state/catalog.tsx`, `src/state/store.tsx`, `src/ui/{avatar,photo-editor,shell}.tsx`, `app/_layout.tsx`, `app/index.tsx`, `app/sign-in.tsx`, `app/new-password.tsx` (new), `app/(app)/people.tsx`, `app/(app)/person/[id].tsx`, `app/(app)/settings.tsx`, `package.json`
- `apps/rider/package.json`, `package-lock.json`
- `docs/architecture.md` (v0.35), `docs/design.md` (v0.27), `progress.md`

**Decisions locked in:**
- The tablet’s automatic sign-out waits for open orders and can be turned off by managers (owner, 14 November 2026).

**Open questions / not yet decided:**
- Upgrading Hono to 4.13.16 (Proposal, from 15 November).

**Next step:**
- The owner tests the Business app, then commit (not pushed). Then sign-in in the rider app (native rebuild), then Google sign-in for managers and customers (the owner’s Google Cloud consent screen and OAuth clients, with exact steps).

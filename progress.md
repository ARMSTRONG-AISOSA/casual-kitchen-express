# CKE Progress

The working memory for Casual Kitchen Express (CKE). Read this first, then the documents it points to. The top half (sections 1 to 8) is the current state; the **Log** at the bottom is append-only history.

**Last updated:** 18 November 2026 (release 1.0.1, the README and the GitHub About box, and the documents brought up to date)
**Stage:** **built and released.** All three apps, the API, and the website are online. Release **1.0.0** went out on GitHub Releases on 18 November 2026 and **1.0.1** (keyboard and rider tracking fixes) the same day. The owner wants **no further features** (18 November 2026). What is left: the battery test and the cold-start timing on a real phone (16.1), and upkeep.

---

## 1. What CKE is

A fast-casual, home-style Nigerian food business in Ugbowo, Benin City, near the University of Benin. It has three Android apps and a promotional website:

| Part | Users | Purpose |
|---|---|---|
| Customer app | Customers | Browse, order, pay (simulated), track, reorder |
| Business and Kitchen app | Kitchen staff, dispatch officers, account officers, and managers (tablet and phones) | Order board, walk-in orders at the counter, dispatch, menu, people, reports, rider pay, finance, settings |
| Rider app | CKE riders | Queue, pickup, delivery with a 4-digit code, earnings |
| Website | Visitors | Promotes the business and mainly the customer app, hosts the download |

Everything is **simulated**: payments, refunds, delivery, rider payouts, and three months of seeded history.

---

## 2. Read in this order

| File | What it is | Authority |
|---|---|---|
| `progress.md` | This file: status, rules, next steps, log | Start here |
| `README.md` | The public front page: what CKE is, the apps, install steps, the stack, the layout, getting started | For visitors to the repository |
| `docs/architecture.md` (v0.60) | Functions, feature IDs (CUS, RID, KIT, MGR, DSP, ACC, WEB) with their status, order lifecycle, data model, the API routes, decisions, free-tier limits, **locked versions (section 15)**, build order (16), **16.1 to verify at build**, seed data | Wins on anything technical |
| `docs/design.md` (v0.43) | UI rules per app, screens, page flows, colours, components, the website | Wins on anything visual or UX |
| `docs/Casual-Kitchen-Express.md` (v1.10) | Brand and business, surface level only | Wins on brand (name, colours, logo, tone, menu, packaging) |
| `docs/list-of-areas.md` | Delivery areas, boundary, landmarks, neighbourhood list | The delivery area |
| `docs/photo-credits.md` | Every starting menu photo’s author, licence, and source, and the staff photos | The record the brand document asks for |
| `apps/api/README.md` | Database, seed, test, and run commands, with what each should print; every route; the online setup and its secrets | How to run the backend |
| `design/prototypes/*.html` | Clickable prototypes of every screen (open in a browser) | Illustrations only. If they disagree with the docs, **the docs win.** |
| `brand/cke-logo-package/` | Logo SVG and PNG files, app icons, favicons, brand tokens (CSS and JSON), web snippet, build script | Use these files, never redraw the logo |

**Online**
- Website: https://armstrong-aisosa.github.io/casual-kitchen-express/ (GitHub Pages, deployed by `.github/workflows/website.yml` on each push that changes it)
- API: https://cke-api.casualkitchenexpress.workers.dev (Cloudflare Worker `cke-api`, Neon project `cke` through Hyperdrive, photos in Workers KV)
- Releases: https://github.com/ARMSTRONG-AISOSA/casual-kitchen-express/releases (APKs, `SHA256SUMS.txt`, release notes)

**Online copies of the prototypes** (private to the owner's claude.ai account):
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
13. **Git:** commit and push where it makes sense (owner, 18 November 2026; until then each commit and push was asked first). Commit messages carry no Co-Authored-By line.
14. **Owner-side instructions are fully detailed:** exact keys, commands, expected output, and how to check the result.

---

## 4. Decided stack (details and exact versions in `architecture.md`, sections 14 and 15)

| Area | Decision |
|---|---|
| Apps | React Native 0.88.1 with Expo SDK 58 and React 19.3.0, TypeScript 6.0.3, three separate apps in one repository with shared packages |
| Repository | npm workspaces (npm 11.17.0, bundled with Node.js 24) and Turborepo 2.11.10, on Node.js 24 LTS. GitHub: ARMSTRONG-AISOSA/casual-kitchen-express |
| App libraries | Expo Router, TanStack Query, Zod, lucide-react-native icons, Gifted Charts (business app), and React Native styles with the shared brand tokens (no UI kit) |
| API | Hono 4.13.16 on Cloudflare Workers (free plan, Wrangler 4.155.0), REST first (GraphQL only if needed) |
| Database | Neon Postgres, through Cloudflare Hyperdrive with `pg` 8.23.1, and Drizzle ORM 0.45.4 (Drizzle Kit 0.31.11 for migrations). Development uses Postgres 17.10 in Docker on the laptop. |
| Real-time | Cloudflare Durable Objects (WebSockets with hibernation) |
| Background jobs | Cron Triggers and Durable Object alarms |
| Images | Workers KV (chosen over R2 on 17 November 2026: R2 needs a card even on its free plan). Files in KV, links in the database. Compressed on the device before upload. |
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
- **Riders:** all deliveries by CKE's own riders. They pick from a queue (first to accept wins), carry one order by default and up to three when the load fits (light 1, medium 2, heavy 3, budget 9 since 15 November 2026), and confirm delivery with the customer's 4-digit code.
- **Walk-in orders:** entered on the kitchen tablet, paid at the counter in cash (Exact or an Other amount box, with change due) or online, W- order numbers, a separate channel in all data and reports.
- **Attribution:** every action is recorded against a staff ID. On the shared tablet, actions belong to whoever is signed in.
- **Cancellation:** a quiet link, a required reason, and a confirmation tick. Free cancel before the kitchen acknowledges, a request after that, and none once ready. After 3 cancellations in 7 days, request only (managers can set the limit from 3 to 7).
- **Accounts:** customers can deactivate (reversible) or delete (Danger zone, tick, and typing DELETE ACCOUNT). Managers can deactivate any account except the owner's. Every customer and staff member has a unique ID (C-00418, R-001, K-002, D-001, A-001, M-001).
- **Staff roles:** kitchen staff (Board, Walk-in, Sold out, Alerts), dispatch officers (Alerts, Orders, Riders, Settings without Pricing and pay and Restaurant contact), account officers (Reports, Rider pay, Finance), and managers (everything). The backend checks the role on every action (`architecture.md` 3.0).
- **Soup of the day:** kitchen staff pick it each morning on Sold out (managers on Sold out or Menu), and the customer app shows it; only today’s soup can be ordered.
- **Finance:** the person on the counter counts the cash at close, and an account officer or any manager (including the owner) signs it off; whoever signs off or closes a month is recorded by name, staff ID, and time. A closed month is locked, and later corrections are adjustments.
- **Refunds:** every refund (a manager’s refund, an approved cancellation request, a walk-in cancelled on its ticket) needs an “I’m sure I want to refund ₦… for …” tick and records the name, role, staff ID, and time of whoever made it (MGR-15).
- **Partial refunds:** everyone who can make a refund can make it partial. The amount is typed in (never fixed) and can never be more than 99% of what the customer paid; a full refund is a separate choice (owner, 15 November 2026).
- **Photos:** compressed on the device before upload (dishes and soups 4:3, at most 1200 px and 250 KB; staff square, 512 px and 80 KB). Dish and soup photos carry a credit; staff photos carry none. Replacing a photo deletes the old one everywhere (MGR-06).
- **Order numbers:** online numbers run continuously from O-0001 on the first seeded day, and walk-in numbers restart at W-001 each day.
- **Manager order list:** today, yesterday, or any date range back to the first order, with search by order number or customer ID and paging for long ranges.
- **Seed data:** three months (90 days ending yesterday) of history at about 40 online and 13 walk-in orders on a weekday and 25 and 8 at weekends, respecting the hours; it is what the app is deployed and pitched with (owner, 15 November 2026; `architecture.md`, 18.3).

---

## 6. What has been done

| Area | Result |
|---|---|
| Brand | Name, positioning, audience, menu with mock prices, personality, palette, tagline "Tastes like home. Arrives fast.", social media direction |
| Logo | The forward-leaning pot with speed lines, plus a simplified small-size icon, delivered as a production package |
| Typography | Nunito for headings, Inter for body and interface. Fraunces is used in the logo artwork only. |
| Packaging | Kraft and red print: delivery bag, compartment rice box, cylindrical soup bowls (short for takeaway, tall sealed for delivery), wrapped swallow |
| Planning and design | The full architecture (free tiers verified), the design plan per app, the delivery area with its boundary at Oluku Market, and clickable prototypes of every screen |
| Customer app | Every feature in `architecture.md` 5.1 on the live API: the menu without an account, one-screen checkout, Google sign-in, demo payment, live tracking with the rider on the map (MapLibre and OpenFreeMap), the 4-digit code, push notifications, reorder, the address book with a map pin and the delivery range check, profile and photo, cancelling, ratings, deactivate and delete, and the update notice |
| Rider app | Every feature in 5.2: sign-in, online and offline, the queue (first to accept wins), batching up to three orders, pickup, hand-off to navigation, the delivery code, help, release, earnings, and light background location with the “Delivery in progress” notification (shared until the last delivery, fixed in 1.0.1) |
| Business and Kitchen app | Every feature in 5.3 for all four staff roles: the board and walk-ins, sold out and the soup of the day, alerts with the chime, dispatch, the order list, refunds and cancellation requests, menu and photos, people, reports on real data, rider pay, Finance (cash-up, statement, close month, audit), settings, demo controls with practice orders and auto-play, Reset demo data, and the tour guide |
| API and database | Hono on Cloudflare Workers with Better Auth, Durable Objects for the live connection and the demo simulator, Neon Postgres through Hyperdrive (caching off), photos in Workers KV, Expo push, a role check on every route, and three months of seeded demo history (about 4,266 orders). 45 of 45 API tests pass. |
| Website | Five pages on GitHub Pages (Home, About, App, FAQ, Privacy) with the light and dark switch, the release’s version, size, and checksum on the App page, search wording, schema.org Restaurant and FAQ data, the sitemap, and Google Search Console and Bing set up. 27 site checks pass. |
| Checks (16.1) | All done except the battery test and the cold start over mobile data on a real phone. Memory and CPU on the release builds: no leaks, no crashes, 0% in the background. One order end to end through all three apps, with location pinging, passed (18 November 2026). |
| Releases | **1.0.0** and **1.0.1** on GitHub Releases: three signed APKs each (arm64-v8a and armeabi-v7a), checksums, and release notes. Signing keys in `~/cke-keys` (outside the repository). |

---

## 7. Open items

**For the owner (any time)**
1. **Back up `~/cke-keys`** (the three app signing keys) to storage off the laptop that only the owner controls. Without them, future updates can’t install over the current apps.
2. **Search Console, about 25 November 2026:** check **Indexing → Pages** for which pages Google has added. The sitemap may keep saying “Couldn’t fetch”, a known problem with `github.io` sites (log of 18 November 2026); Bing reads it fine.
3. **The GitHub token `cke-reset` expires on 18 November 2027.** GitHub emails a week before. Then make a new one the same way (Actions read and write, this repository only) and run `cd apps/api && NODE_OPTIONS=--network-family-autoselection-attempt-timeout=2000 npx wrangler secret put GITHUB_RESET_TOKEN`.
4. **OpenFreeMap donation:** later, once a paid commercial project comes in (owner, 16 November 2026).

**Still to check (16.1, on a real phone)**
- **The battery and heat test** (`architecture.md` 7.5: about 10% an hour or less during an active delivery). Explained to the owner on 18 November 2026; to be discussed before it is run.
- **The cold start over mobile data** (16.1 item 13).

**Kept on purpose**
- **Manager usernames on the laptop only** (`owner.m`, `ivie.m`, from `SEED_MANAGER_PASSWORDS=1`), because the API tests sign in as the owner. Never seed them into the online database; online, managers use Google.
- **Shared demo staff accounts online** (riders, kitchen, dispatch, and account officers with the password `cke-demo-2026`), so anyone can try the staff apps. Release builds don’t show the demo hints; development builds do.
- **Development builds use the laptop’s API:** the Business and customer apps’ `.env` point at `http://localhost:8787` (Google only returns to `localhost`), which needs `adb reverse tcp:8787 tcp:8787` after every adb connect. Release builds use the online API.

**Notes**
- **Build-tool advisories:** four moderate `npm audit` findings (picomatch, minimatch, glob, esbuild in drizzle-kit), all in laptop build tools, none in the apps or the API. No safe upgrade existed on 18 November 2026; the owner chose to leave them for a later version. Check again before the next release.
- **This laptop and Node.js:** Node tools that reach Cloudflare (Wrangler) need `NODE_OPTIONS="--network-family-autoselection-attempt-timeout=2000"`.
- **Tests and `dev:lan` share local state:** stop the API’s `dev:lan` before `npm run test --workspace @cke/api`.
- **Metro started with `CI=1` doesn’t watch files;** restart it after code changes.
- **Prototypes lag the docs** on later decisions. The docs win, and the prototypes are not being updated.
- **Possible future update:** compare with the previous period in reports (`architecture.md` 14.0). Not planned.

---

## 8. Where we are

Every build step is done. The order followed `architecture.md` 16, adjusted by the owner’s frontend-first decision (12 November 2026).

| Step | What | Status |
|---|---|---|
| 1 | Repository setup | **Done** (11 November) |
| 2, 3, 3b | The customer, rider, and Business app screens on demo data | **Done** (12 November) |
| 4a, 4b | Backend foundation, sign-in and roles | **Done** (14 November) |
| 4c | Orders backend (menu, orders, refunds, riders, alerts, live connection) | **Done** (15 November) |
| 5 | Three months of demo history | **Done** (15 November) |
| 6 | The screens connected to the API, the map, push, and riders’ location | **Done** (15 and 16 November) |
| 7 | Capacity, batching, and the demo simulator | **Done** (16 November) |
| 8 | Website | **Done** (16 November; online 17 November) |
| 9 | Reports, rider pay, Finance, polish, the 16.1 checks, deploy, and release APKs | **Done** (17 and 18 November): online 17 November; release 1.0.0 and 1.0.1 on 18 November. Left: the battery test and the cold start on a real phone. |

### 8.1 Resuming after a break

1. Start Docker, then the database: `npm run db:up --workspace @cke/api` (expect `Container cke-db-1 Healthy`). The data and photos are kept between runs.
2. Start the API for the tablet: `NODE_OPTIONS="--network-family-autoselection-attempt-timeout=2000" npm run dev:lan --workspace @cke/api` (expect `Ready on http://0.0.0.0:8787`), and the reset helper with `npm run demo:runner --workspace @cke/api`. Demo staff sign in with `cke-demo-2026` (managers `owner.m` and `ivie.m` on the laptop only).
3. Tablet (ASTRO 10R, Android 12): turn on Wireless debugging and read out the IP address and port; `adb connect <ip>:<port>`. If it fails although the port is right, `adb kill-server` and connect again; if the laptop gets “No route to host”, pair again (`adb pair <ip>:<pairing port> <code>`). Then `adb reverse tcp:8787 tcp:8787` (and 8081 to 8083 for the development servers).
4. Development builds: start each app’s server in its folder, `npx expo start --dev-client --port 8081` (customer), `8082` (rider), `8083` (business). The development APKs are backed up in `~/cke-release/debug-backup`; the tablet currently has the release builds, so uninstall those first (different signing keys).
5. Release builds: `bash tools/release/build-apks.sh` (about 2 hours for all three; it keeps APKs already built from the same code, so it can be rerun after a power cut). The APKs and `SHA256SUMS.txt` go to `~/cke-release/<version>`. If a native build was cut off, delete each library’s `android/.cxx` and `android/build` inside `node_modules` before rebuilding.
6. If something looks wrong in the local database, steps 2 to 3d in `apps/api/README.md` rebuild it, or press Reset demo data.

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

## [2026-11-14] Hono upgrade, rider sign-in, and Google sign-in built

**What was done:**
- Committed the sign-in work as `c694fb1` (owner tested it first). Not pushed.
- Upgraded Hono from 4.13.14 to 4.13.16 for its security fixes (owner approved it a day before the two-week rule). `npm audit`: 14 moderate findings, all in development tools. All API tests pass.
- Rider app sign-in, tested on the tablet: Musa signed in for real; the Me tab shows his details from the API (`R-001`); he stayed signed in after a force-close, and also when the app opened with the API stopped (his own details are kept in secure storage for opening without signal); Sign out works; a kitchen account is refused (“This app is for riders…”); the deactivated Uyi sees “This account is deactivated. Ask a manager.”; after a manager reset, Chidi signed in with the temporary password, got the New password screen without retyping it, and reached Home; a second reset sent the app back to sign-in on the next open. The demo passwords were restored afterwards (`SEED_MANAGER_PASSWORDS=1 npm run db:seed-people`).
- `GET /me` also returns the person’s own job title, phone, home address, gender, and Google email (internal staff emails stay hidden).
- Google sign-in built with Better Auth’s browser-based flow (no native library, as decided in 15): the API turns Google on when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are in `.dev.vars`; a manager added by Google email is marked verified so their first Google sign-in links to that account; social sign-in is rate-limited to 10 a minute. The Business app’s Continue with Google is live (non-managers are refused with a clear message), and the customer app’s two Continue with Google buttons (checkout and Profile) sign in for real. Without the client, both say Google isn’t set up yet (tested on the tablet).
- Google only returns to plain `http` on `localhost`, so the Business and customer apps now use `http://localhost:8787`, and the tablet reaches the laptop through `adb reverse tcp:8787 tcp:8787`.
- Installed the locked sign-in packages, `better-auth` 1.7.14, and expo-image 58.0.18 in the customer app; declared `better-auth` 1.7.14 in the Business and rider apps (they were using it without listing it). Customer photos now use expo-image.
- Native arm64-v8a builds of the rider and customer apps, installed on the tablet.
- A new API test: a manager added by Google email is stored lowercase, verified, and with no password. `/me` test checks the profile fields. 12 of 12 API tests pass; typecheck and lint 11 of 11; Prettier clean.

**Files created/updated:**
- `apps/api/package.json` (Hono), `src/auth/auth.ts` (Google, account linking), `src/routes/me.ts`, `src/routes/people.ts`, `.dev.vars.example`, `worker-configuration.d.ts`, `test/auth.test.ts`, `README.md`
- `packages/api-client/src/index.ts` (`Me` fields)
- `apps/rider/src/auth.ts`, `src/api.ts`, `src/state/session.tsx` (new), `src/state/store.tsx`, `src/ui/preview-tools.tsx`, `app/_layout.tsx`, `app/index.tsx`, `app/sign-in.tsx`, `app/new-password.tsx`, `app/settings.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/me.tsx`, `.env.example` (new), `package.json`
- `apps/customer/src/auth.ts`, `src/state/session.tsx` (new), `src/api.ts`, `src/ui/photo.tsx`, `app/_layout.tsx`, `app/checkout.tsx`, `app/(tabs)/profile.tsx`, `.env.example`, `package.json`
- `apps/business/app/sign-in.tsx`, `.env.example`, `package.json`; `package-lock.json`
- `docs/architecture.md` (v0.36), `docs/design.md` (v0.28), `progress.md`

**Decisions locked in:**
- Hono 4.13.16 (owner, 14 November 2026).

**Open questions / not yet decided:**
- None new. The privacy link is needed before the Google consent screen is published (with the website, step 8).

**Next step:**
- The owner sets up Google Auth Platform and the Web client (steps given in the chat on 14 November 2026) and puts the ID and secret in `apps/api/.dev.vars`. Then Claude tests Continue with Google on the tablet (owner adds their own Google email as a manager in People first), removes the laptop-only manager usernames, and commits. Then build step 4c (orders backend).

---

## [2026-11-14] Google sign-in tested, Your profile with Sign out, show-password eye, document review

**What was done:**
- Google sign-in set up by the owner (Google Auth Platform, External in testing, one Web application client with the localhost and workers.dev redirect addresses). The first try showed “Access blocked: Authorization Error” (`Error 401: invalid_client`, “The OAuth client was not found”): the client ID in `.dev.vars` had lost its first digit when pasted. Fixed from the downloaded JSON (the secret already matched) and the API restarted.
- Tested on the tablet: the owner added their own Google email as a manager in People (M-003, no temporary password) and signed in with Continue with Google in the Business app; the customer app signed in with a second Google account; the owner’s manager Gmail was refused in the customer app as staff (“That Google account belongs to CKE staff…”).
- Show-password eye on every password field (Business and rider apps: sign-in and new-password screens): starts hidden, one tap shows the password and the icon changes, labelled “Show password” or “Hide password”. Tested on the tablet.
- Business app: the owner couldn’t find a way to sign out (Sign out sits at the very bottom of the side rail). Tapping your photo in the top bar now opens **Your profile** (photo, name, role and staff ID, job, username or Google email, phone) with a **Sign out** button that keeps the cash-up check. Tested on the tablet as Efosa (username) and as the owner’s Google manager.
- Fixed while testing: the People list from the API showed the placeholder address of username staff (`m-001@staff.example.com`) as a Google email. `GET /people` now returns null for it, like `/me` (one shared `STAFF_EMAIL_DOMAIN`), and the app shows a manager’s Google email or, failing that, the username (`signInOf`). A test checks it. 12 of 12 API tests pass; typecheck and lint 11 of 11.
- Manager usernames (`efosa.m`, `ivie.m`) kept on the laptop instead of removed as planned: the API tests and the owner-only rules need M-001 (section 7).
- Reviewed every document against the code and each other: `architecture.md` v0.37 (status lines, the accounts note, `GET /people`, 16.1 items 1 and 5, the signing row no longer ties Google sign-in to the key fingerprint, the owner’s Google email gap), `design.md` v0.29 and v0.30 (the eye; Your profile), `apps/api/README.md` (12 tests; why the laptop keeps the manager usernames), and this file (stage, versions, what is done, open items, step 4b done, progress about 40%). The business document, the area list, photo credits, and the main README needed no change.
- The rider app is ready for the owner to test (development server on port 8082).

**Files created/updated:**
- `apps/api/src/routes/people.ts`, `src/routes/me.ts`, `test/auth.test.ts`, `README.md`; `apps/api/.dev.vars` (not committed)
- `packages/api-client/src/index.ts` (`StaffMember.email` can be null)
- `apps/business/src/ui/kit.tsx` (eye), `src/ui/shell.tsx` (Your profile), `src/data/seed.ts` (`signInOf`), `src/state/catalog.tsx`, `app/(app)/people.tsx`, `app/(app)/person/[id].tsx`
- `apps/rider/src/ui/kit.tsx` (eye)
- `docs/architecture.md` (v0.37), `docs/design.md` (v0.30), `progress.md`

**Decisions locked in:**
- Show-password eye on password fields, and Your profile with Sign out from the top-bar photo (owner requests, 14 November 2026).
- Keep the laptop-only manager usernames for tests (Claude’s call, within the existing rule that they never reach the deployed database).

**Open questions / not yet decided:**
- Whose Google email the owner account (M-001) uses on the deployed database (decide at deploy, step 9).

**Next step:**
- The owner tests the rider app. Then build step 4c, the orders backend.

---

## [2026-11-14] Owner account, customer profile with photo upload, and customer sign-out

**What was done:**
- The owner tested the rider app (sign-in, the eye, Me, Sign out): fine.
- **ammycan6@gmail.com is the owner, as M-001** (owner decision: their account takes over M-001 with their own name; the demo owner Efosa is gone). Built as architecture.md 3 planned: `OWNER_GOOGLE_EMAIL` and `OWNER_NAME` (in `apps/api/.dev.vars` on the laptop, environment variables for the deployed database; `scripts/owner.ts`) make M-001 the owner’s account, and the first Google sign-in links to it. A configured owner keeps their own name, details, and photo when the seeds run again, and the photo seed no longer puts the demo owner’s photo on M-001. On the laptop, the test manager M-003 (the owner’s Google account, added earlier) was merged into M-001 (name, job, phone, home address, photo, and the Google link) and removed; the old demo photo was deleted. The laptop test login for the owner is now `owner.m` (was `efosa.m`). Tested: Continue with Google opens Your profile as “Manager, M-001”.
- **Customer profile on the API** (CUS-15, CUS-16, CUS-27): the CustomerProfile row and the customer ID (from C-00001) are made at the first visit after Google sign-in; `PATCH /me` saves the name and gender; `PUT /me/photo` and `DELETE /me/photo` store the profile photo in R2 (WebP, up to 512 px and 80 KB, checked again by the API; replacing deletes the old one). Customer photos are private: only the customer, managers, and dispatch officers can load them.
- **Customer app Profile:** a **Profile photo** section (Add photo, or Change photo and Remove) and a small camera badge on the photo; the photo is taken or chosen, cropped square by the phone, compressed on the phone, and shown with a size note before saving (tested: “1.6 MB shrunk to 20 KB (99% smaller)”, stored as 512 × 512, 20 KB). A **Sign out** section between Theme and Help (“Signed in as …”). The customer ID, name, gender, and photo now come from the API and survive closing the app (tested). Installed the locked `expo-image-picker` 58.0.10 and `expo-image-manipulator` 58.0.16 in the customer app (camera and photos permission texts in `app.json`), and rebuilt it (arm64-v8a only, 55 minutes).
- Fixed while testing: the size note was blank, with a “Text strings must be rendered within a <Text> component” error (the note is now one string).
- **A slip while testing:** Claude’s taps ran ahead of the screens, and one of the tablet’s own gallery photos (a selfie) was picked and saved as the test customer’s photo instead of the generated test image. It was only on the laptop’s local storage; it was removed straight away through Remove (record and file deleted, checked in the database). From then on each step was confirmed on screen before the next tap. A generated test image `cke-test-photo.png` is left in the tablet’s Pictures folder (temporary, section 7).
- Tests: a new `test/customer.test.ts` (customer ID at the first visit, name and gender saved, photo stored, private, replaced, removed, and non-WebP refused). 14 of 14 API tests pass; typecheck and lint 11 of 11; Prettier clean.
- Documents: `architecture.md` v0.38, `design.md` v0.31, `apps/api/README.md`, this file.

**Files created/updated:**
- `apps/api/scripts/owner.ts` (new), `scripts/seed-people.ts`, `scripts/seed-media.ts`, `src/auth/customer.ts` (new), `src/auth/staff-email.ts` (new), `src/routes/me.ts`, `src/routes/media.ts`, `src/routes/people.ts`, `src/routes/photos.ts`, `test/customer.test.ts` (new), `test/{auth,catalog,photos}.test.ts`, `.dev.vars.example`, `README.md`; `.dev.vars` (not committed)
- `packages/api-client/src/index.ts`
- `apps/customer/app/(tabs)/profile.tsx`, `src/media/compress.ts` (new), `src/state/session.tsx`, `src/state/store.tsx`, `app.json`, `package.json`; `apps/business/app/sign-in.tsx`; `package-lock.json`
- `docs/architecture.md`, `docs/design.md`, `progress.md`

**Decisions locked in:**
- The owner is ammycan6@gmail.com as M-001, set up from configuration (owner, 14 November 2026).
- Customer Profile: a Profile photo section and a Sign out section between Theme and Help (owner requests, 14 November 2026).

**Open questions / not yet decided:**
- None new.

**Next step:**
- The owner tests the customer Profile (photo, sign-out) and the owner account, then commit. Then build step 4c, the orders backend.
- Done: the owner tested both and they were fine; committed as `8785e25`.

---

## [2026-11-15] Tour guide for managers

**What was done:**
- The owner tested the customer Profile (photo, Sign out) and the owner account: fine. Committed as `8785e25`.
- The apps seemed down to the owner: the laptop side was running, but the tablet’s `adb reverse` links had dropped (they are lost whenever the wireless adb connection reconnects, which happened twice this session). Restoring them fixed it; an app can also show a grey screen for 10 to 20 seconds while it loads.
- **Tour guide for managers (MGR-39, owner decisions):** managers only, started only from Demo controls, one straight tour, and each step opens its screen. Claude suggested the shape (a highlight plus a card, Back as well as Next and Skip, steps that open the screen); the owner chose one straight tour over two parts and managers only over every role.
  - Demo controls now has three sections: **Tour guide** (one line and **Start tour**), **Practice orders** (New online order, auto-play, speed), and **Reset**, with a one-line explanation under New online order and Reset, which had confused the owner.
  - The tour walks the manager’s 14 menu items from Board to Demo. Each step opens the screen, dims the app, puts a yellow ring around the menu item (scrolling the rail to it), and shows a card beside the rail with a pointer: “Tour guide · Step N of 14”, a progress bar, the name, one or two sentences, Skip tour, Back, and Next (Finish on the last step, with no Skip). The tablet’s back button goes back a step; Skip and Finish return to Demo controls; taps on the dimmed app do nothing. It only moves between screens and changes no data. No new libraries and no rebuild (JavaScript only).
  - Tested on the tablet: all 14 steps in portrait and in landscape, turning the tablet mid-tour (the ring and card follow), Back, the tablet’s back button, Skip tour, Finish, and the dark theme. Fixed while testing: white corners around the ring (the ring is now nearly square to match the cut-out) and a redundant Close next to Finish on the last step.
- Checks: typecheck 8 of 8, lint 3 of 3, Prettier clean. The API was not changed.
- Documents: `architecture.md` v0.39 (MGR-39; 129 feature IDs), `design.md` v0.32 (Demo controls row in 7.2, the “Take the tour guide” flow in 7.3, and a note on the onboarding decision that the tour is opt-in, not an onboarding screen), this file.

**Files created/updated:**
- `apps/business/src/ui/tour.tsx` (new), `apps/business/src/ui/shell.tsx`, `apps/business/app/(app)/demo.tsx`
- `docs/architecture.md`, `docs/design.md`, `progress.md`

**Decisions locked in:**
- Tour guide: managers only, one straight tour, each step opens its screen, started only from Demo controls (owner, 15 November 2026).

**Open questions / not yet decided:**
- None new.

**Next step:**
- The owner tries the tour on the tablet. Then go over the API call-reduction plan (architecture.md 14.4) with the owner, and build step 4c, the orders backend.

---

## [2026-11-15] The Business app slowed down: screens piled up in memory

**What was done:**
- The owner went over the tour, then found the Business app responding slowly when trying Practice orders and Reset.
- **Cause:** the tablet was almost out of memory (about 80 MB free of 3.9 GB, 1.1 GB in swap), with the Business app at 735 MB and the customer app at 504 MB. The processor was mostly idle, so nothing was stuck in a loop. Each rail tap (and each tour step) used Expo Router’s `navigate`, which in this version adds a new screen on top of the stack every time, so every screen visited stayed alive with its photos and charts. Measured from a fresh start (458 MB): one tour added 98 MB, a second tour 81 MB more, and pressing back walked through every screen visited (Settings, Finance, Reports, …).
- **Fix:** a small `goTo` helper (`apps/business/src/ui/nav.ts`) clears the stack and replaces the screen. It is used by the rail, the tour, Not available’s Go back, the Dashboard’s Open alerts and Open board, the Board’s New walk-in order, Order sent’s Back to the board, and the order’s Back to Orders. Task screens (ticket, order, person, item, assign, cash-up) still open on top of their list. The tablet’s back button on a rail screen now goes to the person’s first screen (the Board for managers and kitchen staff), and from there leaves the app.
- **Tested on the tablet after the fix:** from a fresh start (459 MB), three tours added 70 MB, then 26 MB, then 11 MB (levelling off, against 98 MB and 81 MB before). Back from Demo goes to the Board, and from the Board leaves the app. Practice orders: New online order placed O-2180 on the Board (New 2 to 3); tapping it moved it to Preparing; tapping again opened the ticket; back returned to the Board. Reset asked for confirmation and put the Board back to its starting orders (O-2180 gone). The app stayed at about 560 MB.
- The customer app was closed on the tablet to free memory while testing (it opens again from its icon).
- Note: debug builds use far more memory than release builds, and the tablet also runs Gmail, YouTube, Chrome, and Google services. Closing apps not in use helps while testing.
- Checks: typecheck and lint clean; Prettier clean.
- Documents: `design.md` v0.33 (6.3: rail items switch screens; the back button), this file.

**Files created/updated:**
- `apps/business/src/ui/nav.ts` (new), `src/ui/shell.tsx`, `app/(app)/board.tsx`, `app/(app)/dashboard.tsx`, `app/(app)/walk-in-sent.tsx`, `app/(app)/order/[no].tsx`
- `docs/design.md`, `progress.md`

**Decisions locked in:**
- None new (a fix). Back on a rail screen goes to the person’s first screen.

**Open questions / not yet decided:**
- The customer and rider apps use tabs, which don’t pile up the same way; to check when their screens are connected to the API (step 6). (Checked the same day; see the next entry.)

**Next step:**
- The owner tries Practice orders and Reset, then commit. Then the API call-reduction review (architecture.md 14.4) and step 4c, the orders backend.
- Done: committed as `ca3a149` at the owner’s request; the owner checks the whole Demo screen next.

---

## [2026-11-15] The customer and rider apps checked for the same pile-up

**What was done:**
- The owner asked for the customer and rider apps to be checked for the Business app’s memory problem. Both had a smaller version of it: their main screens are tabs (which exist once), but a few buttons that return to the tabs from a screen on top opened **a whole new set of tabs** each time.
  - **Customer app:** Order tracking’s Back (to Orders) and Back to menu, the cart’s Back to menu and Add more, and the menu after deactivating or deleting an account used `router.replace` with a tab route. Measured: six trips between Order tracking and Orders added 54 MB, and leaving the app then took 14 back presses (Orders, Menu, Orders, Menu, …).
  - **Rider app:** My deliveries’ Back used `router.navigate("/(tabs)")`, and Home’s and the Queue’s Go to my deliveries pushed without clearing. Measured: six trips between the Queue and My deliveries added 90 MB, and the back button cycled Queue, Home, My deliveries more than 16 times.
- **Fix:** the customer app gets `toTab` (`apps/customer/src/nav.ts`: close the screens on top, then switch tab), and the rider app gets `toTabs` beside its existing `toDeliveries` and `toQueue` (`apps/rider/src/nav.ts`), which now also serve Home’s and the Queue’s Go to my deliveries. The preview tools’ jumps (customer tracking stage, rider reset) use the same helpers.
- **Tested on the tablet after the fix**, with the same six trips: the customer app added 9 MB and left after 3 back presses (tracking, Orders, Menu); the rider app added 23 MB and left after 3 (My deliveries, Queue, Home). A pickup demo order (O-2173, demo card) was placed in the customer app for the test, and the rider accepted demo order O-2174; both are demo data on the tablet only and went away when the apps were restarted.
- The Kitchen app is open on Demo controls for the owner’s check; the tablet has about 1.8 GB of memory available.
- Checks: typecheck 8 of 8, lint 3 of 3, Prettier clean.

**Files created/updated:**
- `apps/customer/src/nav.ts` (new), `app/track.tsx`, `app/cart.tsx`, `app/delete.tsx`, `app/deactivate.tsx`, `src/ui/preview-tools.tsx`
- `apps/rider/src/nav.ts`, `app/deliveries.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/queue.tsx`, `src/ui/preview-tools.tsx`
- `progress.md`

**Decisions locked in:**
- None (a fix). Rule for all three apps: a button that returns to a main screen (a rail item or a tab) clears the screens on top first; only task screens are pushed.

**Open questions / not yet decided:**
- None new.

**Next step:**
- The owner checks the whole Demo screen, then commit this fix. Then the API call-reduction review (architecture.md 14.4) and step 4c, the orders backend.
- Done: the owner was satisfied; committed as `ee6a888`.

---

## [2026-11-15] Memory check rule, ways to keep memory and CPU low, and the orders backend (part 1)

**What was done:**
- **Memory check rule (owner decision, changed the same day: checks only when the owner asks or agrees, never on Claude’s own; Claude offers a check at these moments):** Claude checks memory use, leaks, and idle CPU after build steps that touch screens, lists, images, live data, timers, or navigation; before committing such changes; when an app feels slow; and on release builds. The method (fresh-start memory, repeated flows, back-press count, idle CPU, code reading) is in `architecture.md` 13.1, and the results go in this log.
- **Ten Proposals to keep memory and CPU low** (`architecture.md` 13.1), for the owner to choose: virtualised lists (`FlatList`; today every list is drawn in full), small photo versions for lists, image cache limits, fewer redraws in the Business app, pausing in the background, no polling, only today in memory, frozen hidden tabs, release build settings (R8 and resource shrinking), and light animations. Measured: the Business app idles at about 5% CPU on Demo controls in the development build.
- **Call-reduction plan for orders (14.4), gone over with the owner:** the four decided choices apply as follows. The menu and settings keep their version and 304s (menu edits raise the version). The live connection (part 5) will send the changed order itself, role-filtered, so watching apps make no calls; messages sent from a Durable Object are free. Reconnecting is one call to `GET /changes?since=N`. Writes return the updated order, screens get one call each, and lists are paged 150 at a time.
- **Orders backend, part 1** (step 4c), with new routes listed in `architecture.md` 9 and `apps/api/README.md`: menu management (MGR-05, MGR-07, MGR-08, KIT-08), checkout priced on the server with the hours, pause, and range checks and the demo payment (CUS-05, CUS-07, CUS-23), the customer’s orders and tracking with the delivery code (CUS-08, CUS-10, CUS-13), walk-ins with cash and change (KIT-13, KIT-14), the kitchen’s steps recorded against the person signed in (KIT-03 to KIT-07, 4.5), the board, the order list for any dates (filters, sort, cursor, count and value), the order detail with its timeline, and `GET /changes`. Customer phones and addresses are only shown to dispatch and managers.
- Built details recorded in the architecture: the delivery code is worked out from the order’s ID with a keyed hash and only its hash is stored (4.4); walk-ins are acknowledged on the board like online orders, which matches the board’s “Tap to acknowledge” on walk-in tickets (4.8).
- Tests: a new `test/orders.test.ts` (8 tests: menu add, edit with the audit log, sold out, archive; checkout pricing and the code; outside the range and pickup with today’s soup; the kitchen’s steps and who did them; privacy; walk-in cash and change, the order list and search; changes since a number; opening hours). It opens the hours for the test and restores them, and removes its test customer, addresses, area, item, and orders (checked in the database afterwards). 22 of 22 API tests pass; the API typechecks; Prettier clean.
- Committed earlier this session: `ee6a888` (customer and rider pile-up fix).

**Files created/updated:**
- `apps/api/src/orders/clock.ts`, `code.ts`, `lines.ts`, `store.ts`, `view.ts` (new); `src/routes/menu.ts`, `orders.ts`, `changes.ts` (new); `src/index.ts`; `test/orders.test.ts` (new); `README.md`
- `docs/architecture.md` (v0.40: 13.1; v0.41: 4.4, 4.8, 9 notes), `progress.md`
- Claude’s memory: the memory-check rule

**Decisions locked in:**
- Memory, leak, and CPU checks only when the owner asks or agrees; Claude offers them at the moments in 13.1 (owner, 15 November 2026).

**Open questions / not yet decided:**
- The ten memory and CPU Proposals in `architecture.md` 13.1 (owner to choose).
- Walk-ins acknowledged on the board like online orders (as built, matching the board): for the owner to confirm.

**Next step:**
- The owner reviews part 1, then commit. Then 4c part 2: cancellations and refunds (4.6).
- Done: committed as `2cc25e9`; parts 2 to 5 followed the same day (next entry).

---

## [2026-11-15] Memory rule changed, and the orders backend finished (parts 2 to 5, live connection)

**What was done:**
- **Memory rule changed (owner):** memory, leak, and CPU checks happen only when the owner asks, or after Claude asks and the owner agrees; never on Claude’s own. Claude offers a check at the moments in `architecture.md` 13.1. The ten memory and CPU Proposals are left for later. Claude’s memory updated.
- Committed part 1 as `2cc25e9`.
- **The call-reduction plan for orders, implemented** (`architecture.md` 14.4, “Applied to orders”): the live connection carries the changed records themselves (watching costs no calls), catalog nudges after menu and setting changes, one reconnect call, writes return the updated order, paged lists.
- **Live connection (part 5):** the `LiveHub` Durable Object with `GET /live` (WebSockets with hibernation; pings answered without waking it). Connections are tagged by role and person, so staff, each customer, online riders, and the carrying rider each get only their own messages. A deactivated person’s connection closes. Every write in the API now sends its change.
- **Alert check without waking the database:** first written as a Cron Trigger every minute, then changed before committing, because a per-minute check would keep Neon’s free database awake all day (about 100 compute hours a month are free). It now runs from the hub’s alarm (the decided “Durable Object alarms for per-order timers”), only while orders are in progress.
- **Cancelling and refunds (part 2)**, **riders and deliveries (part 3)**, **alerts (part 4)**: the routes are listed in `architecture.md` 9 notes and `apps/api/README.md`. Every refund needs the tick and records the person’s name, role, and staff ID; two riders accepting at once get one winner; the delivery code allows 5 tries; rider pay is stored on delivery; dispatch can assign and approve manual completions.
- **Also needed at this phase, built:** the customer’s address book (checkout needs an address) and settings (pause, hours and overrides, areas, rider capacity, tracking mode, the cancellation limit; pricing, pay, and the WhatsApp number for managers), and ratings.
- **Starting values chosen (for the owner to adjust):** alert wait times (5 minutes for a rider, 5 to acknowledge, 30 in the kitchen, 45 on the road), and an approximate kitchen pin in Ugbowo for queue distances.
- Fixed while testing: removing the default address didn’t make the next address the default (the route read the row after changing it).
- Tests: a new `test/lifecycle.test.ts` (12 tests: address book; customer cancel; request approved by dispatch with the tick; decline and partial refund; unavailable item and kitchen walk-in cancel; queue, race, offline block, release; pick up, wrong and right code, rider pay, rating; dispatch assign, help, manual completion, the rider’s reconnect call; live messages to kitchen, customer, and riders, the alarm running, the catalog nudge; the timed alert check; settings permissions and the audited fee change; repeat cancellations). A shared `test/cleanup.ts` removes test orders and what points to them. The rider tests use Musa (`musa.a`) and Femi, because Chidi’s account (R-002) is set to change his password at next sign-in (left as it is). 34 of 34 API tests pass; afterwards the database had no test orders, alerts, deliveries, refunds, or users, riders were offline, and the settings were as before.
- The laptop API (`dev:lan`) was restarted with the live hub.

**Files created/updated:**
- `apps/api/src/live/hub.ts`, `src/live/publish.ts`, `src/orders/riders.ts`, `src/orders/alerts.ts`, `src/orders/cancel.ts` (new); `src/routes/live.ts`, `cancellations.ts`, `rider.ts`, `alerts.ts`, `addresses.ts`, `settings.ts` (new); `src/routes/orders.ts`, `menu.ts`, `soups.ts`, `photos.ts`, `people.ts`, `changes.ts`, `src/orders/view.ts`, `src/index.ts`; `wrangler.jsonc` (LiveHub, migration v2), `worker-configuration.d.ts`; `test/lifecycle.test.ts`, `test/cleanup.ts` (new), `test/orders.test.ts`; `README.md`
- `docs/architecture.md` (v0.42), `progress.md`; Claude’s memory

**Decisions locked in:**
- Memory, leak, and CPU checks only with the owner’s permission (owner, 15 November 2026).

**Open questions / not yet decided:**
- Alert wait times and the kitchen’s pin (starting values; section 7).
- Walk-ins acknowledged on the board like online orders: for the owner to confirm.

**Next step:**
- The owner reviews, then commit. Then step 5, the seed script (two months of demo history, 18.3), or step 6, connecting the app screens to the API (with the live connection and push).

---

## [2026-11-15] Partial refunds typed in (99% rule), walk-ins confirmed, and three months of demo history

**What was done:**
- **Partial refunds (owner decision):** everyone who can make a refund can make it partial, the amount is typed into a field instead of being fixed, and it can never be more than 99% of what the customer paid (or more than what’s left). One shared rule (`maxPartialRefund` and `refundChoice` in `packages/validation`) is used by the API and the app.
  - **API:** `POST /orders/:id/refunds`, `POST /orders/:id/cancel`, and `POST /cancellation-requests/:id/approve` take `refund: { kind: "full" }` or `{ kind: "partial", amount }` (and `none` only for a manager cancelling after pickup). A new test checks dispatch, kitchen staff, and managers giving partial refunds and the 99% cap for each (35 of 35 API tests pass).
  - **Business app:** a shared refund box (`src/ui/refund.tsx`): Full refund (one tap) or Partial refund with an Amount field (number keypad) and “Up to ₦… (99% of the ₦… paid)”; an amount over the limit shows a red line and keeps the confirmation locked; the “I’m sure…” tick shows the amount typed. Used on the order (managers), when approving a cancellation request (Alerts), and when cancelling a walk-in (the ticket). Refunds add up, and the order’s Refund stays available while something is left.
  - **Tested on the tablet:** O-2179 ₦5,800: ₦5,800 typed showed “That’s more than 99% of the ₦5,800 paid. The most is ₦5,742.” with the tick locked, then ₦2,000 refunded and shown with “Omoregie Armstrong, Manager (M-001)”; W-006 cancelled with ₦3,000 of ₦4,300 refunded; Ada’s request on O-2176 approved with ₦1,200 of ₦2,700. The demo data was reset afterwards. Polished while testing: the grey limit line hides while the red message shows.
- **Walk-ins in New until tapped:** confirmed by the owner (Decided, `architecture.md` 4.8).
- **Alert wait times:** explained to the owner (what each one is for and what changing it does); still for the owner to decide.
- **Step 5, three months of demo history (owner decision, was two months):** `scripts/seed-history.ts` (`npm run db:seed-history`). The result on the laptop, 17 August to 14 November 2026: 3,217 online orders (O-0001 to O-3217, 2,725 deliveries, 200 cancelled), 1,037 walk-ins (17 cancelled), 250 customers with 335 addresses, 1,349 ratings (4.5 on average), 2,557 deliveries (124 assigned by dispatch, about 2% to 4% batched), 249 refunds (67 partial), ₦29.1 million in sales, 51 payouts (3 owed), 90 cash-ups (yesterday’s left to sign off), August to October closed, one adjustment, and 591 audit entries; about 32 MB. Its own checks all pass, and it saves nothing if one fails.
  - Tuned for realism before keeping it, because this is the data the app is pitched with: the first version had dispatch assigning 57% of deliveries and some orders waiting 47 minutes for a rider. Fixed by handing orders to riders in the order they’re ready, batching by group, a 2.5 minutes a kilometre ride speed, a less spiky lunch peak, and Uyi leaving only last week. Now riders take orders in about 6½ minutes on average (three quarters within 9), order to door is about 40 minutes, and dispatch assigns about 5%. The most loyal customer was ordering four times a day; now the most loyal order 60 to 70 times in three months, and 60% of customers reorder.
  - Batching came out at about 2% to 4% rather than the 15% first estimated, because the 6-point load budget (decided) rarely fits two typical orders of 4 to 5 points. Recorded honestly in 18.3.
  - The self-checks caught a rider carrying four orders at once in an early version; fixed before anything was saved.
- **Documents:** `architecture.md` v0.43 (18.3 rewritten for three months with the measured figures; the decision row; MGR-15, 4.6, and 9 notes for partial refunds; 4.8 walk-ins decided; 16.1 item 11 done), `design.md` v0.34 (the refund box in 6.5, 7.2, and 7.3), `apps/api/README.md` (step 3d, 35 tests), this file.

**Files created/updated:**
- `packages/validation/src/index.ts`; `apps/api/src/orders/cancel.ts`, `src/routes/cancellations.ts`, `scripts/seed-history.ts` (new), `package.json`, `test/lifecycle.test.ts`, `README.md`
- `apps/business/src/ui/refund.tsx` (new), `src/state/store.tsx`, `app/(app)/order/[no].tsx`, `app/(app)/alerts.tsx`, `app/(app)/ticket/[no].tsx`
- `docs/architecture.md`, `docs/design.md`, `progress.md`

**Decisions locked in:**
- Partial refunds: typed, at most 99% of what was paid, for everyone who refunds (owner, 15 November 2026).
- Walk-ins wait in New until tapped (owner, 15 November 2026).
- Three months of demo history (owner, 15 November 2026).

**Open questions / not yet decided:**
- Alert wait times (explained; owner to decide).
- A “90 days” report period (Proposal; section 7).

**Next step:**
- The owner tests the refund box on the tablet. Then commit, and step 6: connecting the app screens to the API.


---

## [2026-11-15] Alert timers and the alert beep, rider load budget 9, and a 90-day report choice

**What was done:**
- **Tablet reconnected** with a new pairing (Android 12; Wireless debugging port changed).
- **Committed the earlier work first** (partial refunds and three months of history, `b116eae`), so this work sits in its own commit.
- **Alerts section in Settings (owner decision, MGR-14):** dispatch officers and managers. A **Beep when an alert opens** switch at the top, then a slider per timer, each with − and + and its range: waiting for a rider 5 to 15 minutes (usually 5), not acknowledged 1 to 5 (usually 5), too long in the kitchen 10 to 30 (usually 15), too long on the road 10 to 45 (usually 25). **Save alert settings** opens an **Alert settings saved** dialog (green tick, the values, who it’s recorded as). “Undo changes” and “Use the usual times” appear when they apply. Under the buttons: “Not saved yet.” or “Last changed 15 Nov 2026, 11:06 am by Osas Edo, Dispatch officer (D-001).” A red line shows when the tablet has notifications turned off for the app.
  - **API:** `PUT /settings/alerts` (the whole section in one save, each time checked against its range; audit-logged in words with before and after; who and when kept on the setting row and returned by `GET /settings`; sent live to open Settings screens). Migration `0004_alert-settings` adds the columns with database range checks and moves the budget from 6 to 9 only if nobody had changed it. The timed check now reads the saved times.
  - **Bug fixed:** clearing a “stuck” or “waiting for a rider” alert by hand didn’t stick: the next minute’s check opened it again (and, with the beep, would have beeped every minute). Now each stage alerts at most once per order.
  - **The beep (owner chose notifications, once per alert, everyone who sees Alerts):** a local notification on an “Order alerts” Android channel with an original rising double-beep tone made for CKE (`assets/sounds/cke_alert.wav`), so it sounds with the screen off. Tapping it opens Alerts. Live alert messages carry a `beep` flag from the server, so turning the beep off applies at once everywhere. Accounts staff don’t hear it. Needed `expo-notifications` 58.1.7 (already locked) and a rebuilt Business app (arm64-v8a only, 1 h 7 min build on this laptop).
  - **The demo** runs the same timed check every 20 seconds on its own orders, with a new “Running late” alert kind and Clear.
- **Rider load budget 9 (owner decision):** item load levels unchanged; still at most three orders. The default in `@cke/validation`, the database, the API fallback, the prototypes, and every “Load x of 9” in the rider and Business apps.
- **Reports:** 90 days beside 7, 30, and 60 (owner approved the Proposal). The demo report data is now 90 days; the demo refund rows’ order numbers now count back from today’s (they ran past today’s numbers before).
- **The three months of history re-run** with the new budget and the saved alert times. Kept for the pitch only after re-tuning two invented figures that made the restaurant look slow against the owner’s targets: a free rider now takes a new order within about 4 minutes (was 2 to 9), and plating takes 5 to 13 minutes because food is cooked ahead (was 8 to 20). Ride times stay distance-based. Result: 3,224 online orders and 1,050 walk-ins; 2,580 deliveries, about 6% a second or third stop (was 2% to 4%); dispatch assigned about 3%; rider wait median 2.7 minutes (9 in 10 within 10); order to door median 31 minutes; ratings 4.49. Alerts recorded as the API would have: 508 waiting for a rider, and 766 running late (111 not acknowledged, 154 kitchen, 501 road). How often each time would trigger, for the owner’s choice: rider wait over 5 minutes 20%, over 10 10%, over 15 7%; kitchen over 15 4%; road over 25 21%, over 30 9%, over 35 2% (Iguosa and Oluku, 8 to 10 km away, take 25 to 30 minutes).
- **Tested on the tablet:** the Alerts section in portrait and landscape; dragging (snapped to 10), tapping the track (jumped to 1), and − and +; Save, the dialog, and the last-changed line; five beeps fired for the starting orders as they aged, each with the right words; a practice order beeped 70 seconds after it was placed with “not acknowledged” at 1 minute; a cleared alert stayed cleared; the channel uses the CKE tone; Reports at 90 days (4,157 orders); “Load x of 9” in the rider queue and the Riders screen. Wording fixed after testing: “1 minute” (it said “1 minutes”) and clearer screen-reader labels on − and +. Left the demo on the usual times.
- **Checks:** 37 API tests pass (2 new: the alert settings route with every out-of-range value, and alerts at the saved times with the beep off and clearing that sticks). Four test files timed out once while the Android build and Metro were using the processor and passed when re-run. Typecheck and lint 11 of 11, Prettier clean.

**Files created/updated:**
- `packages/validation/src/index.ts` (alert timers, `alertSettings`, `alertChanges`, `minutes`, budget 9)
- `apps/api/src/db/schema.ts`, `drizzle/0004_alert-settings.sql` (new), `src/orders/alerts.ts`, `src/orders/riders.ts`, `src/routes/settings.ts`, `src/live/publish.ts`, `src/live/hub.ts`, `scripts/seed-history.ts`, `test/lifecycle.test.ts`, `README.md`
- `apps/business/app.json`, `package.json`, `assets/sounds/cke_alert.wav` (new), `src/alert-sound.ts` (new), `src/ui/slider.tsx` (new), `src/ui/alert-settings.tsx` (new), `src/ui/alert-watch.tsx` (new), `src/state/store.tsx`, `src/data/seed.ts`, `src/data/report-data.ts`, `src/ui/refunds-report.tsx`, `src/ui/tour.tsx`, `app/(app)/_layout.tsx`, `app/(app)/settings.tsx`, `app/(app)/alerts.tsx`, `app/(app)/reports.tsx`
- `design/prototypes/cke-rider-app.html`, `design/prototypes/cke-kitchen-manager-app.html` (budget 9)
- `docs/architecture.md` v0.44, `docs/design.md` v0.35, `progress.md`, `package-lock.json`

**Decisions locked in (owner, 15 November 2026):**
- Alert timers set in Settings within the ranges above, with a beep switch, one-tap save, a saved dialog, and a record of who changed them last.
- The beep: a local notification, once per alert, on every device that shows Alerts.
- Rider load budget 9; load levels unchanged.
- A 90-day quick choice in Reports.

**Open questions / not yet decided:**
- Whether to keep the usual alert times or raise waiting for a rider to 10 and on the road to 30 (figures above).
- The new-order chime (design 6.2) isn’t built yet; only the attention beep is.

**Next step:**
- The owner tests the Alerts section and the beep. Then step 6: connecting the app screens to the API (the beep then comes from the live connection’s `beep` flag).

---

## [2026-11-15] Usual alert times 10 and 30, the new-order chime, and step 6a: the Business app on live data

**What was done:**
- **The owner tested** the Alerts section and the beep: all well.
- **Usual alert times (owner decision):** waiting for a rider 10 minutes (was 5) and on the road 30 (was 25). Shared rules, database defaults (migration `0005`, which moves only a row nobody has saved its own times on), docs. The three months of history re-run: 255 waiting-for-a-rider alerts (1 delivery in 10, was 1 in 5) and about 460 orders running late (about 11%, was 18%).
- **The new-order chime (design 6.2, KIT-02):** a soft descending “ding-dong” made for CKE (`assets/sounds/cke_chime.wav`), on its own Android channel, once per new online order, with a notification naming the order and what’s in it (tap it to open the board). A **Chime for new online orders** switch sits under the beep in Settings, Alerts, saved with the same button and audit-logged. The API marks a new online order’s live message `chime: true` when it’s on. Needed one more Business app build (2 h 1 min while the laptop was busy). Found on the tablet: the first chime channel had been made by the previous build before the tone existed, so Android gave it the default sound and never lets an app change it; moved to `orders-v2` and the old one is deleted.
- **Step 6a, the Business app on live data:** a live sync (`src/state/live.tsx`) loads, per role, the board, alerts, riders panel, settings, and today’s orders, keeps one WebSocket to `/live`, applies each message, catches up with `/changes` after a gap, and closes in the background; a translation layer (`src/state/mapping.ts`) turns API records into the app’s shapes (line names such as “Jollof rice with chicken” and “Efo riro with eba”, stages, timeline labels, alert wording); one actions hook (`src/state/ops.ts`) sends every action to the API. API: the staff order view now carries the rider; the client gained typed calls for orders, alerts, requests, riders, settings, and the menu. The “Demo” chip now shows only on screens still on demo figures; Demo controls on a live tablet explain that practice orders return with the simulator.
- **Tested on the tablet against the real database** (a temporary customer `tablet.test` placed real orders; section 7): a new online order appeared on the board within seconds and chimed; acknowledge, tick (the order became Preparing), and Ready reached the database; the riders panel showed Musa online live; Assign recorded R-001 as assigned by dispatch and the panel updated to “Load 3 of 9”; a walk-in (W-001, cash) went through; the API’s timed check opened a stuck alert and the tablet beeped; Clear recorded M-001 and lifted Delayed; a customer’s cancellation request appeared live and was approved with a ₦1,500 partial refund; Sold out flipped the database and `/bootstrap`; Settings, Alerts saved to the database with the audit line and who saved it; the kitchen role (Blessing) saw the live board without loading what it isn’t allowed. Not yet tested: resolving a rider’s help request (needs the rider app, 6b).
- **Checks:** 37 API tests pass (the live-connection test now checks the chime flag); typecheck, lint, and Prettier clean.

**Files created/updated:**
- `packages/validation/src/index.ts`, `packages/api-client/src/index.ts`
- `apps/api/src/db/schema.ts`, `drizzle/0005_usual-times-and-chime.sql` (new), `src/live/publish.ts`, `src/routes/orders.ts`, `src/routes/settings.ts`, `src/orders/view.ts`, `test/lifecycle.test.ts`
- `apps/business/app.json`, `assets/sounds/cke_chime.wav` (new), `src/alert-sound.ts`, `src/state/live.tsx` (new), `src/state/mapping.ts` (new), `src/state/ops.ts` (new), `src/state/store.tsx`, `src/state/catalog.tsx`, `src/data/seed.ts`, `src/ui/alert-settings.tsx`, `src/ui/alert-watch.tsx`, `src/ui/shell.tsx`, `app/(app)/_layout.tsx`, `board.tsx`, `ticket/[no].tsx`, `walk-in-pay.tsx`, `alerts.tsx`, `assign/[no].tsx`, `sold-out.tsx`, `menu.tsx`, `settings.tsx`, `order/[no].tsx`, `demo.tsx`
- `docs/architecture.md` v0.46, `docs/design.md` v0.37, `progress.md`

**Decisions locked in (owner, 15 November 2026):**
- Usual alert times 10 minutes for a rider and 30 on the road.
- The new-order chime built now, with its own switch.

**Open questions / not yet decided:**
- None new.

**Next step:**
- Step 6b: the rider app on live data (then 6c, the customer app, and 6d, the map, push, and background location).

---

## [2026-11-15] Step 6b: the rider app on live data

**What was done:**
- **Live sync and actions** (`apps/rider/src/state/live.tsx`): after sign-in the app loads the rider’s deliveries, earnings, and queue; keeps one WebSocket to `/live`; re-reads the queue a moment after any queue message (the server decides what fits); vibrates for a new order that fits or one dispatch assigns; closes in the background and catches up on return. Going online, accept, picked up, the delivery code, Need help, release, and the stop order go to the API, and the screen moves on only when the API agrees. Earnings show the real figures (period totals, owed by day, today’s deliveries, paid weeks). The demo code hint now shows only in the demo.
- **Client:** typed rider calls and the rider live messages in `@cke/api-client`.
- **Tested on the tablet against the real database:** Home showed Musa online and carrying the order dispatch assigned; a ready order appeared in the queue within 3 seconds; accepting made it stop 2; Picked up moved both orders to picked up; a wrong code showed the API’s “That code isn’t right. Check it with the customer.”; the customer’s real code (read from their own order view) delivered O-3225 and stored ₦1,000 rider pay; Need help (customer unreachable) opened a help request and flagged a delivery issue, which reached the kitchen’s Alerts live (“Musa needs help with O-3227: the customer can’t be reached.”, view only) and dispatch’s, where Approve completion recorded D-001 and delivered the order; the rider’s drop-off cleared on its own; Earnings showed today’s 2 deliveries (₦2,000) and owed by day from the seeded week. This also covers the help-request action left untested in 6a.
- **Checks:** typecheck and lint clean.

**Files created/updated:** `packages/api-client/src/index.ts`; `apps/rider/src/state/live.tsx` (new), `src/state/store.tsx`, `src/data/orders.ts`, `app/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/queue.tsx`, `app/(tabs)/earnings.tsx`, `app/order/[no].tsx`, `app/pickup.tsx`, `app/code.tsx`, `app/help.tsx`, `app/release.tsx`, `app/deliveries.tsx`; `docs/architecture.md` v0.47, `progress.md`.

**Next step:** step 6c, the customer app on live data.

---

## [2026-11-15] Step 6c: the customer app on live data

**What was done:**
- **Live sync and actions** (`apps/customer/src/state/live.tsx`): the orders in progress, the order history, and the address book from the API; one WebSocket to `/live` (tracking moves on by itself); checkout (cart lines as menu item and option IDs, priced by the API), the customer’s own cancel, cancellation requests, ratings, and saving the delivery address go to the API. Tracking shows the real delivery code and real step times. Several orders in progress at once: tracking follows one, In progress lists them all, tapping one opens it, and a finished order is filed into history once (found on the tablet: “Order this again” had filed an order still waiting for a rider as Delivered).
- **Development-only test sign-in** in Preview tools (username and password), so the app can be tested without anyone’s Google account. Real customers still sign in with Google only; release builds never show it.
- **For the owner:** the tablet’s customer app was signed in to a real Google customer account (C-00001) from the earlier sign-in test. Nothing was ordered or changed on it; it was signed out so the test customer could be used. Sign back in with Google when needed.
- **Tested on the tablet against the real database (test customer C-00252):** Orders showed the real history (Delivered, Cancelled and refunded) and the order in progress; Reorder → Checkout showed the saved address → Pay placed O-3229 (₦5,800, demo card); tracking showed the real code (3171, the same as the API’s) and moved by itself through acknowledged, ready, rider assigned, on the way, and delivered as the kitchen and the rider acted; a skipped step showed a future time and was fixed; 5 stars saved; a second order placed elsewhere listed alongside the waiting one; cancelling O-3230 before the kitchen started gave a full ₦3,800 refund, completed; editing the landmark updated the address book.
- **Checks:** typecheck and lint clean.

**Files created/updated:** `packages/api-client/src/index.ts`; `apps/customer/src/state/live.tsx` (new), `src/state/store.tsx`, `src/state/session.tsx`, `src/ui/preview-tools.tsx`, `app/_layout.tsx`, `app/checkout.tsx`, `app/pay.tsx`, `app/track.tsx`, `app/rate.tsx`, `app/address.tsx`, `app/(tabs)/orders.tsx`; `docs/architecture.md` v0.48, `progress.md`.

**Next step:** step 6d: the real map, push notifications, and riders’ background location.

## [2026-11-15] Paused before step 6d

**What was done:**
- The owner took a break. Everything was paused: the API, the three Metro servers (8081, 8082, 8083), the database container (`cke-db-1`, stopped, data kept), and the Gradle and Kotlin build daemons. The tablet was disconnected from adb.
- Nothing is half-done: steps 6a, 6b, and 6c are committed (last commit 553a5e2), not pushed. The working tree only has this log entry.
- Still in place for testing: the temporary test customer `tablet.test` (section 7), order O-3228 (ready, unassigned), and Musa online.

**To resume:** `docker start cke-db-1`, then the API (`npm run dev:lan` in `apps/api`) and the Metro servers; reconnect the tablet with `adb connect` (the port changes after a break, so ask the owner for the current IP:port).

**Next step:** step 6d (the map with MapLibre and OpenFreeMap, riders' background location, then push once the owner has set up Firebase and Expo), and the owner tests 6a to 6d together.

## [2026-11-16] Step 6d: the customer's real map and riders' location

**What was done:**
- **API (part 1):** `PUT /rider/location` keeps the rider's last position only while they have a picked-up order and Light tracking is on, and sends it to each customer on the way (`rider-location` on the live connection). Going offline or delivering the last order clears it; with Milestones only nothing is kept. The customer's order now carries the rider's first name, stop number (“stop 2 of 3”), and position after pickup; `/bootstrap` carries the kitchen pin and the delivery boundary. Migration `0006_rider-location`. 38 of 38 API tests pass (the first full run had 4 failures because `dev:lan` was running at the same time, as the README warns; the rerun passed).
- **Customer app (part 2):** the real map, MapLibre 11.5.0 with OpenFreeMap tiles (light Positron style, OpenFreeMap’s dark style in the dark theme), brand markers, and the credit under every map. Address: picking an area moves the pin there, a tap moves it, and the boundary decides the range (Settings’ boundary once drawn; a rough outline from Uselu to Oluku Market until then). Tracking: kitchen, address, and the rider’s marker after pickup, moving with each live position; “Rider assigned: Musa” and the stop number.
- **Rider app (part 3):** expo-location, expo-task-manager, and expo-battery (locked versions). After pickup it asks for location in two steps (while using the app, then all the time), runs a foreground service with a “Delivery in progress” notification, and sends its position at balanced accuracy about every 45 seconds after 100 metres (2 minutes and 250 metres with battery saver or under 15%). “Arriving soon” comes from a 300-metre geofence, or a distance check when “all the time” isn’t allowed. Navigate passes the customer’s pin. Small fixes: “Ready 18 hours ago” instead of “Ready 1069 minutes ago”, and the location line on My deliveries now says what is really shared.
- **Tested on the tablet against the real database:** the address map loaded tiles, picking Oluku moved the pin and showed the boundary, a pin outside showed the out-of-range message and greyed out Save, and saving stored the tapped point (6.40268, 5.61154). Musa accepted O-3228 and picked it up; both permission steps appeared; the foreground service and its notification started. The tablet has no location fix indoors, so test locations were fed through Android’s test providers (section 7): the kitchen position reached the API, the customer’s map showed Musa’s marker, a move 240 m away moved the marker live, and moving within about 110 m of the address set off the geofence: the order became “arriving” within seconds and the rider saw “You’re nearly there”. Delivering with the code 0487 cleared the stored position and stopped the service and its notification.
- **Not built:** “use my current location” on the address screen (design.md 4.3) would need expo-location in the customer app, which section 15 lists for the rider app only; ask the owner. Milestones only was tested in the API tests, not on the tablet.

**Push notifications: what the owner needs to set up** (not started; nothing is created for you):
1. **Expo account:** sign up at https://expo.dev/signup (free). On the laptop, in the project folder, run `npx eas-cli@27.1.0 login` and sign in. Check with `npx eas-cli@27.1.0 whoami` (it prints your Expo username).
2. **Link the three apps to Expo:** in each of `apps/customer`, `apps/rider`, and `apps/business`, run `npx eas-cli@27.1.0 init` and accept creating the project. Each `app.json` gains `extra.eas.projectId`; tell Claude when done.
3. **Firebase project:** at https://console.firebase.google.com, Add project, name it `cke-push` (Google Analytics off). In the project, add three **Android** apps with these package names: `com.armstrongaisosa.casualkitchenexpress.customer`, `com.armstrongaisosa.casualkitchenexpress.rider`, and `com.armstrongaisosa.casualkitchenexpress.business`. Download `google-services.json` after the last one (it lists all three) and put it in the project folder as `google-services.json` at the root. Claude will keep it out of Git.
4. **Service account key (private, never share it or send it to Claude):** Firebase, Project settings, Service accounts, Generate new private key. It downloads a JSON file. At https://expo.dev, open each of the three projects, Credentials, Android, the app’s package name, **FCM V1 service account key**, Add, and upload that file. Expo keeps it; then delete the downloaded file or keep it somewhere private.
5. Tell Claude when steps 1 to 4 are done. Claude then adds expo-notifications to the customer and rider apps, saves each device’s push token through the API, and sends the pushes from the API.

**Files created/updated:** `apps/api/drizzle/0006_rider-location.sql` (and meta), `apps/api/src/db/schema.ts`, `src/orders/view.ts`, `src/routes/rider.ts`, `src/routes/bootstrap.ts`, `test/lifecycle.test.ts`, `README.md`; `packages/api-client/src/index.ts`; `apps/customer/app.json`, `package.json`, `src/data/geo.ts`, `src/ui/map.tsx`, `src/state/store.tsx`, `src/state/catalog.tsx`, `src/state/live.tsx`, `app/address.tsx`, `app/track.tsx`; `apps/rider/app.json`, `package.json`, `src/tracking.ts` (new), `src/state/live.tsx`, `src/state/store.tsx`, `src/data/orders.ts`, `app/drop-off.tsx`, `app/deliveries.tsx`; `docs/architecture.md` v0.49; `progress.md`.

**Open questions:** “use my current location” in the customer app (needs expo-location there); OpenFreeMap’s current usage terms before a public demo (16.1 item 7).

**Next step:** the owner tests 6a to 6d together; push once the Expo and Firebase steps above are done; then step 7.

## [2026-11-16] Push notifications, Use my current location, and step 7: the live simulator

**What was done:**
- **Push setup (owner and Claude):** the owner made the Firebase project `cke-push` and linked the three apps to Expo (`eas init`, team `armstrong-aisosas-team`). Expo’s website wizard insisted on a keystore, so Claude added the FCM V1 key through `eas credentials` with the owner’s permission and Expo login on the laptop: uploaded once for cke-customer and selected for cke-rider and cke-business, no keystore needed. The owner deleted the key file afterwards. The complete `google-services.json` (all three apps) is in the project root; every Firebase file is kept out of Git. Each app has an `eas.json`.
- **Push in the API:** `PUT /me/push-token` and `DELETE /me/push-token`; tokens go on deactivation and when Expo says the app is gone. Each order status is pushed once (`pushed_status` on the order; existing and seeded orders were marked as already announced). Who gets what: the customer’s steps (4.1, 4.2), new online orders to kitchen, dispatch, and managers (chime or quiet channel), a ready delivery to each online rider it fits and an assigned order to its rider (tone or quiet channel by Sound), and the alert beep. Migration `0007_push-tokens`.
- **Push in the apps:** tokens saved at sign-in, removed at sign-out; pushes aren’t shown while the app is open (the live connection already shows the change); taps open tracking, the queue, My deliveries, the board, or Alerts. The rider app plays the CKE chime on its queue channel; the Settings note says the sound comes with notifications.
- **Use my current location** in the customer app (owner decision): expo-location added there for one reading while the app is open, no background; the pin moves and the nearest area is picked.
- **OpenFreeMap terms checked:** no account, no limits on map views, commercial use allowed, no uptime guarantee, attribution required. Each credit under the map now opens its own page (owner chose “only the links”, no Map data page).
- **Step 7, the live simulator (18.4):** practice orders marked `practice` (migration `0008_practice-orders`): New online order (a demo customer) and New walk-in order on Demo controls; Auto-play on a new Durable Object `DemoSim` at 1x, 5x, or 20x moves only practice orders (kitchen steps by the system, a demo rider who isn’t online accepts, hops along the route on the customer’s map, arrives, delivers); Remove practice orders. Practice orders say “Practice” on the board and in Orders.
- **Fixed:** the Business and customer apps showed sign-in when the API couldn’t be reached at start-up although the saved session was fine; they now retry for about 15 seconds first. Found because the tablet’s adb port forwarding kept dropping (Claude ran a small loop to keep it up while testing).
- **Tests:** 40 of 40 API tests pass (new: push tokens and announcing once; demo controls). Typecheck and lint clean in every package.
- **Tested on the tablet against the real database:** each app saved a real Expo push token. With the apps in the background: a practice order pushed “New online order O-3231” to the Business app on the chime channel; the kitchen acknowledging O-3233 pushed “The kitchen has your order” to the customer, and tapping it opened O-3233’s tracking; marking it Ready pushed “New order ready, O-3233, Ugbowo, 0.4 km” to Musa on the queue channel; turning Sound off saved the quiet channel for him. Auto-play at 20x took O-3231 from placed to delivered in about 16 seconds (demo rider R-003). Demo controls showed the state and count; Orders showed “Practice”. Use my current location asked only “while using the app”, moved the pin, and picked Ekosodin.

**Files created/updated:** `apps/api` (`drizzle/0007_push-tokens.sql`, `drizzle/0008_practice-orders.sql`, `src/db/schema.ts`, `src/live/push.ts` new, `src/live/publish.ts`, `src/live/hub.ts`, `src/demo/practice.ts` new, `src/demo/sim.ts` new, `src/routes/demo.ts` new, `src/routes/me.ts`, `src/routes/people.ts`, `src/routes/orders.ts`, `src/orders/view.ts`, `src/index.ts`, `wrangler.jsonc`, `worker-configuration.d.ts`, `scripts/seed-history.ts`, `test/lifecycle.test.ts`, `README.md`); `packages/api-client/src/index.ts`; the three apps’ `app.json`, `eas.json`, and `src/push.ts`; `apps/customer` (`app/address.tsx`, `src/data/geo.ts`, `src/ui/map.tsx`, `src/state/session.tsx`, `src/state/live.tsx`); `apps/rider` (`assets/sounds/cke_chime.wav`, `app/settings.tsx`, `src/state/live.tsx`, `src/state/session.tsx`); `apps/business` (`app/(app)/demo.tsx`, `app/(app)/orders.tsx`, `src/alert-sound.ts`, `src/state/live.tsx`, `src/state/mapping.ts`, `src/state/session.tsx`, `src/data/seed.ts`); `docs/architecture.md` v0.50, `docs/design.md` v0.38, `progress.md`, `.gitignore`.

**Open questions:** the real kitchen pin, delivery boundary, and area centres (owner collecting them); whether the API should check the boundary too; MGR-29’s full history regeneration stays a laptop command (`npm run db:seed-history`).

**Next step:** the owner tests 6a to 7 on the tablet; then the cleanup in section 7; then step 8, the website.

## [2026-11-16] The owner's kitchen pin and delivery boundary, Evbogida, and the tablet cleanup

**What was done:**
- **Pins from the owner:** the kitchen pin (6.400469, 5.608338) and the delivery boundary from the Uselu and Oluku pins and ten side points, widened west so Uwelu is in range (owner: “you can decide to add Uwelu”). They live in `@cke/validation` (`KITCHEN_PIN`, `DELIVERY_BOUNDARY`, `AREA_CENTRES`) and in the Setting row, so the API now refuses an address whose pin is outside the boundary even in an area in range; the customer app draws it, and the rider app measures distances from the real kitchen. The owner allowed narrowing the width around the expressway; it was kept as drawn, since narrowing would leave out more customers.
- **Area centres** from OpenStreetMap (Nominatim, Photon, Overpass); BDPA estate and Osasogie are estimates to confirm. At the owner’s request for more areas between UNIBEN and Uselu, **Evbogida** (beside the Ogida barracks) was added; the others looked for were outside the boundary or not on the map (`list-of-areas.md` 3a).
- **Tests:** a pin beyond the boundary is refused; the catalog test counts the area list. All pass (the three rider tests failed once because Musa was left online by the push test; with riders offline they pass).
- **Cleanup:** the tablet’s test location settings and stay-awake were removed (section 7).

**Next step:** the owner finishes testing; then the test customer and O-3233 are deleted (section 7); then step 8, the website. (Both done later the same day.)

## [2026-11-16] Step 8: the website, the owner's BDPA pin, and the end-of-testing cleanup

**What was done:**
- **The website** (`apps/website/public`): the prototype became five real pages, Home (`index.html`), About, App, FAQ, and Privacy, plus a 404 page, `robots.txt`, and `sitemap.xml`. Plain HTML, CSS (`css/site.css`), and JavaScript (`js/site.js`), no packages. The real logo files from the logo package (the `-charcoal` lockup on the dark header and footer), three real menu photos (jollof, egusi, meat pie) resized to 720 pixels with their authors and CC BY-SA licences under each, titles, descriptions, and sharing previews on every page with a new 1200 × 630 preview image (`img/cke-share.png`).
- **Download (WEB-07):** the button opens the latest GitHub release. With JavaScript, the App page asks GitHub for the latest release and shows its version, date, size, and SHA-256 checksum, and the button then downloads the customer APK directly (one tap fewer). Before the first release it says “First release coming soon”.
- **Privacy page (WEB-10):** written from what the apps really collect and do: Google name, email, and picture; phone and addresses; optional gender and photo; orders and ratings; the notification token; location (customers only when they tap Use my current location; riders only while carrying an order, deleted after); the services used (Google, Expo, Cloudflare, Neon, OpenFreeMap, GitHub); deleting and deactivating; the website itself (no cookies).
- **Changes from the prototype:** the App feature list drops cancelling (design 8.2) and adds notifications and Use my current location; the delivery areas list Uwelu and the About page names all eleven areas; the hand-drawn area sketch is labelled “a sketch, not to scale” instead of carrying the OpenFreeMap credit (it isn’t made from their map); the yellow speed lines moved above the headline (they crossed the words like a strikethrough); the footer no longer pushes a 360-pixel phone sideways (the prototype did).
- **Contact email:** a privacy guard stops Claude from writing the owner’s email into files, so the footer and privacy page have WhatsApp and LinkedIn for now, with a marker where the email goes. Owner command to add it (run from the project folder, putting the address between the quotes):
  `E='your-address'; sed -i "s|<!-- contact-email -->|<li><a href=\"mailto:$E\">Email (Google)</a></li>|; s|Message us on|Email <a href=\"mailto:$E\">$E</a> or message us on|" apps/website/public/*.html`
  Tested on a copy with a dummy address: one email link in every footer and one in the privacy page’s Questions.
- **Checks:** `@playwright/test` 1.64.1 (the locked version) in `apps/website`, with a tiny Node static server (`tests/serve.mjs`) that serves the site at `/casual-kitchen-express/` like GitHub Pages. 25 checks on a 360-pixel phone and a desktop: every page loads with no errors or broken images, has its sharing tags, and doesn’t scroll sideways; every internal link works; the menu button, the theme switch, the FAQ, the release details (offline, with a made-up release), the 404 page, and the single Claude Code line on About. All pass (`npm test --workspace @cke/website`).
- **Publishing:** `.github/workflows/website.yml` deploys `apps/website/public` to GitHub Pages on every push to main that changes it. The address will be https://armstrong-aisosa.github.io/casual-kitchen-express/.
- **BDPA estate:** the owner’s pin (6.393847, 5.601806, inside the boundary) is now its starting point. Osasogie stays an estimate (the owner isn’t sure either); customers drag the pin to their door anyway.
- **Cleanup after the owner finished testing:** the test customer and its seven orders deleted, the tablet’s test photo deleted, the API, the three app servers, and the port-forwarding loop stopped, and the tablet’s port forwarding removed (section 7).
- **OpenFreeMap donation:** the owner will donate later, once a paid commercial project comes in.

**Owner steps to put the site online (after you say push and the code is on GitHub):**
1. On github.com, open the repository **casual-kitchen-express** → **Settings** (top bar) → **Pages** (left menu).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**. Nothing else on that page needs changing.
3. Open the **Actions** tab → **Website** in the left list → **Run workflow** → **Run workflow** (green button). After about a minute the run shows a green tick; if it shows a red cross, send Claude the run’s page.
4. Open https://armstrong-aisosa.github.io/casual-kitchen-express/ and https://armstrong-aisosa.github.io/casual-kitchen-express/privacy.html. Both should load.
5. Google: open https://console.cloud.google.com/auth/branding with the project **cke-project-514706** selected. Under **App domain**, set **Application home page** to `https://armstrong-aisosa.github.io/casual-kitchen-express/` and **Application privacy policy link** to `https://armstrong-aisosa.github.io/casual-kitchen-express/privacy.html`. Leave the terms link empty. Under **Authorised domains**, add `armstrong-aisosa.github.io` if Google asks for it. Click **Save**.
6. Open **Audience** (left menu) → **Publish app** → **Confirm**. The status changes from **Testing** to **In production**. The apps ask only for name, email, and picture, which don’t need Google’s review. If Google asks you to prove you own the homepage’s domain, send Claude the verification file or code it gives, and Claude adds it to the site.

**Files created/updated:** `apps/website/public/` (`index.html`, `about.html`, `app.html`, `faq.html`, `privacy.html`, `404.html`, `css/site.css`, `js/site.js`, `img/cke-logo-horizontal-charcoal.svg`, `img/cke-share.png`, `img/food/*.webp`, `robots.txt`, `sitemap.xml`; the icons, manifest, and cream logo moved in from `apps/website/`), `apps/website/package.json`, `apps/website/playwright.config.ts`, `apps/website/tests/` (new), `.github/workflows/website.yml` (new), `package-lock.json`, `packages/validation/src/index.ts`, `docs/list-of-areas.md`, `docs/architecture.md` (v0.52), `docs/design.md` (v0.39), `progress.md`.

**Decisions:** the website is published from `apps/website/public` by GitHub Actions (owner sets Pages to GitHub Actions once); the App page’s download goes straight to the customer APK when GitHub answers, otherwise to the release page; OpenFreeMap donation later (owner).

**Open questions:** whether to add the email to the website (owner command above); real phone screenshots for the App page come with the first release (the phone pictures are drawn for now).

**Next step:** step 9: reports on real data, rider payouts, Finance, polish, the remaining checks, Neon and Cloudflare deploy, and signed APKs on GitHub Releases. The site goes online when the owner says push.

## [2026-11-16] Paused: restart steps and the owner's list

**What was done:**
- Showed the owner the website as a private preview (https://claude.ai/artifact/TW1fDXfkJsiqPomjhJ8tX8).
- Stopped everything: the database container, the leftover Gradle build process, and the tablet’s adb connection (the API, Metro, and the port-forwarding loop were already stopped).
- Wrote the restart steps and the owner’s list at the top of section 7. New owner requests are recorded there as website to-dos: the theme button at the top, SEO, Google Search Console with the sitemap, and Bing Webmaster Tools.

**Files created/updated:** `progress.md`.

**Decisions:** none new.

**Open questions:** none.

**Next step:** on resume, the website additions (theme button at the top, SEO), then step 9. Search Console and Bing wait until the site is online.

## [2026-11-17] Resumed: the theme button at the top and SEO

**What was done:**
- Resumed: database, tablet (paired; it answered on port 45455, not the 45155 sent, found by checking the tablet’s open ports), API, and the port-forwarding loop. Metro isn’t started until an app is worked on.
- **Theme button at the top (owner request):** moved from the footer into the header on every page. On wide screens it shows an icon and Auto, Light, or Dark after Get the app; on phones it is an icon button beside Menu, so changing the theme is one tap (fewest taps) rather than Menu then the switch.
- **SEO (owner request):** the pages’ language is set to English (Nigeria) with a matching sharing locale, and Home carries schema.org Restaurant details (name, slogan, Ugbowo in Benin City, Edo, Nigerian food, ₦500 to ₦4,800, cash, card, or transfer, the eleven delivery areas, opening hours, logo, and picture). The exact kitchen pin is left out on purpose. The titles, descriptions, sitemap, and robots file were already in place.
- **Checks:** 27 Playwright checks pass (new: the theme button is in the header and not the footer; Home’s restaurant details, with no exact pin).
- The website preview was refreshed at the same link.

**Files created/updated:** `apps/website/public/*.html`, `css/site.css`, `js/site.js`, `apps/website/tests/site.spec.ts`, `docs/design.md` (v0.40), `docs/architecture.md` (v0.53), `progress.md`.

**Decisions:** the theme button stays visible on phones as an icon (one tap); restaurant hours shown as every day 8:00 am to 8:30 pm until the owner says otherwise.

**Open questions:** are there any closed days?

**Next step:** step 9. Search Console and Bing wait until the site is online (after the push).

## [2026-11-17] Uselu Market pin, open every day, the email on the site, and Reset demo data

**What was done:**
- **Owner decisions:** the kitchen is open every day (website Home, About, FAQ, and the restaurant details; `Casual-Kitchen-Express.md`); Uselu’s starting pin is the owner’s Uselu Market pin (6.374718, 5.613317, inside the boundary); the Osasogie task is dropped (stays an estimate).
- **Email on the website:** with the owner’s permission in the session, added to every footer’s Contact list and the privacy page’s Questions.
- **All three apps running** on the tablet (first start took about 11 minutes, building all three at once from a cold cache).
- **Reset demo data (MGR-29), built.** Owner choices: run without new accounts if possible, measuring first; delete testers’ orders too; a full factory reset.
  - **Measured first:** rebuilding the history takes about 1.2 seconds of processing (about 13 ms a day of history) against the free plan’s 10 ms per request, so the day-at-a-time idea didn’t fit and, as agreed, a runner does the work: GitHub Actions once deployed, and a small helper on the laptop (`npm run demo:runner`).
  - **What it does** (`apps/api/scripts/reset-demo.ts`): clears every order and money record (orders with their lines, payments, and events; deliveries, refunds, ratings, requests, alerts, adjustments, payouts, cash-ups, closed months, the audit trail, notifications, hours overrides), puts riders offline, removes staff a manager added, then runs the base, people, media, and history seeds. Seeded staff go back to their starting status. Testers keep their accounts and addresses.
  - **API:** `POST /demo/reset-all` (managers, `{ "confirm": "RESET" }`), `POST /demo/reset-all/notify` and `/demo/reset-all/media/*` (the runner, signed with `DEMO_RESET_SECRET`), the state in `GET /demo`, a new `demo_reset` table (migration `0009_demo-reset`), new orders refused with 503 while it runs, and a reset older than 30 minutes counted as failed.
  - **Photos through the API:** the first run took 13 minutes, nearly all of it starting wrangler once per photo; sending them through the API brought the whole reset to **1 minute 20 seconds**, and the GitHub runner needs no Cloudflare key.
  - **Apps:** Demo controls has Reset demo data (sheet, tick box, Reset everything), a progress card with each step, and the time of the last reset; practice buttons wait while it runs; when it finishes every app reloads (Business: orders, menu, settings, and staff; rider: queue; customer: orders and menu, and the basket starts again). Auto-play goes back to off.
  - **Tested on the tablet:** pressed the button as the owner; the progress card showed each step; orders were refused during it; it finished in 1 minute 20 seconds with 4,274 orders of history, 10 staff, 22 menu items, and all its checks passed; auto-play back to off.
  - **Tests:** 41 of 41 API tests pass (new: who may reset, the secret, refusing orders while running, one reset at a time, the 30-minute limit). Typecheck and lint clean.

**Owner steps for Reset demo data once the app is online (with the Neon and Cloudflare deploy, step 9):**
1. GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**. Name it `cke-reset`, choose only the **casual-kitchen-express** repository, and under **Repository permissions** set **Actions** to **Read and write**. Copy the token.
2. Claude stores it on the API (`wrangler secret put GITHUB_RESET_TOKEN`), with `DEMO_RESET_RUNNER` = `github` and a new `DEMO_RESET_SECRET`.
3. In the repository: **Settings → Secrets and variables → Actions → New repository secret**, four times: `DATABASE_URL` (the Neon connection string), `DEMO_RESET_SECRET` (the same value as step 2), `OWNER_GOOGLE_EMAIL`, and `OWNER_NAME`.
4. Press Reset demo data once in the app to check it; Claude watches the run in the Actions tab.

**Files created/updated:** `apps/api` (`drizzle/0009_demo-reset.sql`, `src/db/schema.ts`, `src/demo/reset.ts` new, `src/routes/demo.ts`, `src/index.ts`, `scripts/reset-demo.ts` new, `scripts/reset-runner.ts` new, `scripts/people.ts` new, `scripts/seed-people.ts`, `scripts/seed-media.ts`, `scripts/owner.ts`, `wrangler.jsonc`, `worker-configuration.d.ts`, `.dev.vars.example`, `package.json`, `test/lifecycle.test.ts`, `README.md`), `.github/workflows/reset-demo.yml` (new), `packages/api-client`, `apps/business` (`app/(app)/demo.tsx`, `src/state/live.tsx`), `apps/customer/src/state/live.tsx`, `apps/website/public/*.html`, `packages/validation`, `docs/architecture.md` (v0.54), `docs/design.md` (v0.41), `docs/list-of-areas.md`, `docs/Casual-Kitchen-Express.md`, `progress.md`. `.dev.vars` got the reset settings (not committed).

**Decisions:** Reset demo data is a full factory reset (owner); a runner does it (measured); photos go through the API.

**Open questions:** none.

**Next step:** plan the owner’s feature additions and removals together, then step 9.

## [2026-11-17] Step 9 begun: the API and database online, reports on real data

**What was done:**
- **Owner:** happy with every feature and the reset’s downsides; asked for step 9, commits including online (pushing), and to sign in so Claude can do the rest.
- **History checked before pushing:** 43 commits, no secret patterns and no secret files ever committed. The first push was refused: the laptop’s GitHub sign-in may not change workflow files (`.github/workflows`). `gh auth setup-git` connected git to it; the extra **workflow** permission needs the owner’s approval in the browser (two codes expired; still to do).
- **Neon (owner signed in on the laptop):** project **cke** (`purple-shadow-15140316`) in Frankfurt (`aws-eu-central-1`), Postgres 17. The owner’s own `my-first-project` (US) is left alone. Migrations 0000 to 0009 applied; base, staff (the owner as M-001 from the laptop’s settings, no manager passwords), photos, and the three months of history seeded: 4,274 orders, all checks passed, 20 MB. The connection string is kept only in Claude’s scratchpad and in Hyperdrive, never in the repository.
- **Cloudflare:** R2 needs a card, so photos moved to **Workers KV** (owner decision): namespace `cke-media`; Hyperdrive `cke-db` to Neon; the Worker deployed at https://cke-api.casualkitchenexpress.workers.dev with its secrets (a new sign-in secret, the Google client copied from `.dev.vars` without printing, the reset secret, and the runner set to GitHub). Checked: `/health`, the menu (22 items from Neon), and a photo (served from KV).
- **Reports on real data:** `GET /reports/summary` and `/reports/refunds`; the Business app’s Reports (orders, sales, times, riders, areas, kitchen staff, menu, customers, refunds) use them, with a custom range and CSV export (shared as text). Checked on the tablet: 317 orders in the last 7 days, the riders, areas, and kitchen staff tables.
- The tablet’s 8:30 pm sign-out signed the Business app out as designed.

**Still to do in step 9:** Finance, Rider pay, Cash-up, and the Dashboard on real data; the owner’s GitHub approval, then the push, GitHub Pages, and the Google consent screen; the reset’s GitHub token and repository secrets; release keystores and signed APKs on GitHub Releases; the battery test on a real phone.

**Files created/updated:** `apps/api` (`src/reports/summary.ts` new, `src/routes/reports.ts` new, `src/index.ts`, `src/routes/media.ts`, `src/routes/me.ts`, `src/routes/photos.ts`, `src/routes/demo.ts`, `scripts/seed-media.ts`, `wrangler.jsonc`, `worker-configuration.d.ts`), `packages/api-client`, `apps/business` (`app/(app)/reports.tsx`, `src/ui/refunds-report.tsx`), `docs/architecture.md` (v0.55), `progress.md`.

**Decisions:** photos in Workers KV instead of R2 (owner); Neon in Frankfurt; reports computed live in SQL, ReportView tables left as a Proposal.

**Next step:** the owner approves the GitHub workflow permission; then the push and the website; then Finance, Rider pay, Cash-up, and the Dashboard on real data.

## [2026-11-17] Pushed, the website online, the online reset, and the money screens on real data

**What was done:**
- **GitHub:** the owner approved the workflow permission; `main` is pushed (public repository). GitHub Pages turned on (build from GitHub Actions) and the website published: https://armstrong-aisosa.github.io/casual-kitchen-express/ (Home and Privacy checked, 200).
- **Online reset:** the repository secrets `DATABASE_URL`, `DEMO_RESET_SECRET`, `OWNER_GOOGLE_EMAIL`, and `OWNER_NAME` set from the laptop without printing them. The first run failed on the Node version (the repository needs Node 24); fixed, and the workflow then rebuilt the online demo data in about a minute, photos included. The in-app button online still needs `GITHUB_RESET_TOKEN` (owner step below).
- **Money on real data:** `GET /payouts` and `POST /payouts/:code/pay` (MGR-30, ACC-02); `/finance/cash-up/today` (count, kitchen staff, managers, and account officers), `/finance/cash-ups` and sign-off with a note needed for a difference (ACC-04); `/finance/statement` (ACC-03, a closed month shows its saved figures), `/finance/months/:month/close` (after the month’s last day, once every walk-in day is signed off; ACC-07), `/finance/adjustments`, and `/finance/audit` (ACC-05). The Business app’s Rider pay, Cash-up, and Finance (Statement, Cash-ups, Audit trail, Close month, adjustments, CSV exports) use them. The Dashboard already used live data.
- **Tests:** 45 of 45 API tests pass (new `test/money.test.ts`: reports, payouts once, the cash-up rules, the statement, closed months, adjustments, the audit trail). Checked on the tablet: Rider pay balances and history; November’s statement (₦5,742,100 sales, 840 orders).
- Deployed the new API version.

**Owner steps still open:**
1. **Google sign-in screen:** the six steps in the log entry “Step 8: the website” (the site is online now, so the links work).
2. **Reset demo data online:** create the GitHub token (log entry “Uselu Market pin … Reset demo data”, step 1) and tell Claude; Claude stores it on the API.

**Files created/updated:** `apps/api` (`src/finance/money.ts` new, `src/routes/finance.ts` new, `src/index.ts`, `test/money.test.ts` new, `README.md`), `.github/workflows/reset-demo.yml`, `packages/api-client`, `apps/business` (`app/(app)/rider-pay.tsx`, `cash-up.tsx`, `finance.tsx`), `docs/architecture.md` (v0.56), `progress.md`.

**Decisions:** a payout made in the app covers everything owed up to that day; Finance exports are CSV for now.

**Next step:** release builds: signing keys, signed APKs, and the first GitHub release; then the battery test (pause for the owner).

## [2026-11-17] The update notice, the release build, and recovering from a power cut

**What was done:**
- **Update notice:** each app checks GitHub’s latest release once, a few seconds after opening (release builds only), and offers Download or Later, as the website FAQ promises (`apps/*/src/update.tsx`, `checkForUpdate` in `packages/api-client`).
- **Release signing:** one key per app made with `keytool` (RSA 4096, PKCS12, valid about 27 years) in `~/cke-keys` (only the owner’s account can read it), with the passwords in `~/cke-keys/README-passwords.txt` and `~/.gradle/gradle.properties`, never in the repository. `tools/expo-plugins/with-release-signing.js` signs release builds with them; a release build without its key stops.
- **Contrast check (16.1):** all 60 text and colour pairs in the three apps’ light and dark themes measured; five fixed (design.md 3.6).
- **Power cut (owner’s PC lost power):** the repository checked clean and pushed; the database recovered on its own (all 4,274 orders, staff, and menu intact); the API, the reset helper, and the tablet connection restarted. The release builds that were running are redone from a clean start with the new resumable script `tools/release/build-apks.sh`. The scratch folder in `/tmp` was emptied; nothing in it was needed.

**Next step:** finish the three release APKs, test them on the tablet, publish release v1.0.0 on GitHub, then pause for the battery test (the owner asked for a detailed explanation first).

## [2026-11-18] Release v1.0.0 on GitHub, and paused before the battery test

**What was done:**
- **Release APKs:** the three apps built from a clean start with `tools/release/build-apks.sh` (commit 3f5836e): customer 80 MB (about 66 minutes, everything native compiled afresh after the power cut), rider 57 MB (28 minutes), business 60 MB (26 minutes). Each is signed with its own release key (checked with `apksigner`), holds only arm64-v8a and armeabi-v7a, and points at the online API.
- **Tested on the tablet:** the dev builds were uninstalled (a release can’t install over a debug-signed app) and the three release APKs installed. The customer menu and photos load from the online API; the rider app signed in as Musa and the business app as Blessing, both online. No crashes in the log.
- **GitHub release v1.0.0** (tag on 3f5836e, marked latest) with the three APKs, `SHA256SUMS.txt`, and the release notes plus checksums. The download matches its checksum, and the website’s App page now shows “v1.0.0, 18 November 2026”, 79.8 MB, the SHA-256, and downloads the customer APK directly.

**Found while testing (small fixes, not yet done):**
- Rider sign-in: the “username and password don’t match” message sits behind the keyboard, so a rider can miss it.
- Business sign-in: the keyboard covers the Sign in button and the card doesn’t move up; the keyboard has to be closed first.

**Notes:** the tablet now runs the release builds, not dev builds. To develop on it again, uninstall them and reinstall the dev builds (rider and business debug APKs are in `~/cke-release/debug-backup`; the customer one is rebuilt with `npx expo run:android`). The release APKs and checksums stay in `~/cke-release/1.0.0`.

**Next step:** the battery test on a real phone (16.1, architecture 7.5), explained to the owner in detail first; then the two keyboard fixes, and the owner’s feature additions and removals.

## [2026-11-18] Keyboard fixes, 16.1 checks, memory and CPU on the release builds, and the end-to-end order test

**What was done:**
- **Keyboard fixes (found testing the release builds):** the rider sign-in’s error now sits above the Sign in button, which stays above the keyboard; the business sign-in moves up when the keyboard opens so the button and its error stay in sight. Tested on the tablet.
- **16.1 checks:** Hyperdrive caching was on (Cloudflare’s default) and is now off, as decided, so live orders are never served from a cache; free allowances re-checked (all match architecture 14; the database is 49 MB of 1 GB); Android 10 and above confirmed for Nigeria (about 81% of Android phones, Statcounter June 2026); Node.js 24 and JDK 17 confirmed by the release builds.
- **Memory and CPU (owner asked), release builds on the tablet** (Unisoc T310, 4 GB, Android 12, like a budget phone): a script tapped through each app for 8 to 10 minutes (customer signed out, rider as Musa, business as Ngozi and as Blessing), sampling memory and the app’s own CPU, then 60 seconds idle and 60 in the background. No leaks (memory rises while browsing, then levels off: customer about 154 MB, rider 104, business 107 to 110), no crashes, 7 to 14% of one core while in use, 0% in the background (measured without the sampler, which itself costs about 4%). Screens draw in 12 to 16 ms once open; Reports at 90 days scrolls with 2% slow frames; opening a screen costs a few slow frames (up to about 40 ms). An idle open screen uses about 3% of one core in every app, even on a static sign-in screen: the framework’s baseline, not our code. The script’s deny-list missed “Charge” on the walk-in screen; checked: no order was placed online, and the word is now blocked.
- **End-to-end order test (owner asked), dev builds on the tablet, laptop database:** a temporary customer `e2e.test` (deleted afterwards), today’s online hours opened at 6:00 am through the hours override (MGR-09, removed by the reset), and test positions on the tablet (removed afterwards). Order O-3230, Jollof rice, ₦5,300 by demo card → the kitchen board (Blessing) → acknowledged → ready → Musa online, accepted, picked up → location permission in two steps and the “Delivery in progress” service → positions reached the database within about a second of each move, with the rider app in front, in the background, and after a restart mid-delivery → the customer’s map showed the rider’s marker → “Arriving soon” at about 200 metres from the pin → a wrong code refused (one attempt recorded) → code 4999 → delivered, ₦1,000 to Musa, position cleared, tracking stopped. Every push arrived (kitchen has it, rider assigned, on the way).
- **Bug fixed:** the rider app stopped sharing its position once all its orders were arriving, so the customer’s map froze for the last 300 metres. It now shares until the last delivery (architecture 7.1); only the arrival geofences skip arriving orders. Typecheck and lint clean.
- **Laptop database:** put back with Reset demo data (16 seconds, 4,266 orders); the test customer’s account, address, sessions, and push token removed by hand (the reset keeps real accounts by design).

**Notes:** Metro started with `CI=1` doesn’t watch files; restart it after code changes. The tablet runs the dev builds again (customer debug APK rebuilt and backed up in `~/cke-release/debug-backup`). The rider fix and the keyboard fixes are not in release 1.0.0; they go into the next release.

**Build-tool advisories (owner said go ahead, 18 November 2026):** no safe upgrade exists yet: picomatch has no fixed release (4.0.7 is the newest and affected); minimatch and glob are fixed only in new majors that Expo’s CLI doesn’t use yet (still minimatch 10 in Expo 58.0.26); the esbuild one is inside drizzle-kit, where npm’s fix is a downgrade; `npm audit fix` refuses because it would replace Expo. All four are build-time only, reached only with our own file patterns. **Check again before the next release build** and upgrade then, within the locked versions.

**Next step:** the battery test discussion; then release 1.0.1 with the fixes when the owner wants it; the owner’s feature additions and removals.

## [2026-11-18] Search Console tag and search wording on the website; no more features planned

**What was done:**
- **Owner decision:** no further feature additions or removals; the owner is happy with what is built. The “feature additions and removals” step is dropped.
- **Owner:** the Google sign-in consent screen is published.
- **Search Console:** the owner’s verification tag (`google-site-verification`) added to Home’s head, for the owner to verify, then submit `sitemap.xml`.
- **Search wording (WEB-08):** each page’s title and description now name what people search for (food delivery, Ugbowo, Benin City, UNIBEN, jollof rice, egusi soup, pounded yam) and fit Google’s lengths (titles about 60 characters, descriptions about 155). Home’s first line names Benin City and UNIBEN. The FAQ adds “Do you deliver to UNIBEN?” (the Ugbowo campus is in the delivery area) and carries schema.org FAQPage data built from the visible questions. Home’s Restaurant data adds the menu link, the campus as an area served, and fuller wording, still without the kitchen’s pin. The sitemap has last-changed dates. A site test checks the FAQ data. All 27 site tests pass.
- No meta keywords tag: Google ignores it and Bing treats stuffing it as spam, so the words go in titles, headings, and text instead.

**Files changed:** `apps/website/public/{index,about,app,faq}.html`, `apps/website/public/sitemap.xml`, `apps/website/tests/site.spec.ts`, `docs/architecture.md` (v0.59), `progress.md`.

**Next step:** the owner verifies in Search Console and submits the sitemap, then imports into Bing; the owner creates the `cke-reset` GitHub token and stores it, then Claude tests the online Reset; the battery test discussion; release 1.0.1 when the owner wants it.

## [2026-11-18] Online Reset tested with the GitHub token; Google’s sitemap “Couldn’t fetch”

**What was done:**
- **Owner:** created the fine-grained token `cke-reset` (Actions read and write, this repository only, expires 18 November 2027) and stored it as the Worker secret `GITHUB_RESET_TOKEN`.
- **Online Reset demo data tested:** the owner pressed it in the release business app (signed in with Google). GitHub job 44319577089 succeeded in 1 minute 54 seconds; the online `demo_reset` row says Done, no error, started by M-001, 4,266 orders. (An earlier press went to the laptop, from the tablet’s dev build, and didn’t test the token.)
- **Search Console:** verified (HTML tag). Bing imported it and reads the sitemap. Google lists the sitemap as `/sitemap.xml`, which is right: the list shows paths relative to the URL-prefix property. Its status stays “Couldn’t fetch”, although the file returns 200 with `application/xml`, and the live URL test of Home passes. This is widely reported for `github.io` sites with no confirmed cause; Google (Mueller, October 2026) says a valid sitemap can show it when Google doesn’t have time for it or sees little need to crawl the site. It doesn’t stop pages being indexed. Workaround for a five-page site: Request indexing for each page in URL inspection. A custom domain fixed it for others (a decision for the owner, not taken).

**Next step:** the owner requests indexing for the pages; recheck the sitemap status around 21 November; the battery test discussion; release 1.0.1 when the owner wants it.

## [2026-11-18] Release 1.0.1; the README, the About box, and the documents brought up to date

**What was done:**
- **Owner decisions:** no further features (the owner is happy with what is built); release 1.0.1 now and leave the four build-tool advisories for a later version; keep the Reset demo data rules as they are (customers keep their profile, photo, and addresses); keep the hosting and the footer’s developer link as they are (Vercel only hosts the owner’s own portfolio site; CKE doesn’t use it).
- **Release 1.0.1** (tag `v1.0.1` on 76f4c06, marked latest): version code 2 in all three apps; built with `tools/release/build-apks.sh`’s steps (customer 57 minutes, rider 32, business 29). Checked: the same signing key as 1.0.0, arm64-v8a and armeabi-v7a only, the online API address and no laptop address in each bundle, and the checksums (GitHub’s digests match). Sizes: customer 79.8 MB, rider 56.2 MB, business 59.1 MB. Release notes in `~/cke-release/1.0.1/RELEASE-NOTES.md`.
- **Tested on the tablet by the owner:** downloaded the three APKs from the release page and installed them over 1.0.0 (Play Protect asked to scan; Install without sending), then tried sign-in in every app: all fine. Claude checked: all three are 1.0.1 (version code 2), and 1.0.1 shows no update notice. The 1.0.0 apps’ “A new version is ready” notice wasn’t seen, because the tablet’s screen was locked when they were opened and the owner had updated by the time it was unlocked; it is checked again with the next release.
- **README** rewritten for visitors (what CKE is, the website and download links, each app, install steps, the stack, the layout, getting started, licence; the Claude Code line kept to one). **GitHub About box** filled in: description, the website link, and ten topics.
- **Documents brought up to date:** the top half of this file (it still described 15 November); `architecture.md` v0.60 (built features marked Built, build-order status, 16.1 items 5 and 9, the update notice, Workers KV instead of R2 in the overview and limits); `design.md` v0.43; `apps/api/README.md` (the missing routes and the online setup); `list-of-areas.md` and `photo-credits.md` (small fixes).
- **Temporary tablet setting:** stay awake while charging, turned on for the update test and turned off again (checked: 0).

**Next step:** the battery test discussion and the cold start on a real phone; the owner backs up `~/cke-keys` and checks Search Console around 25 November.

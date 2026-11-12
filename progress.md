# CKE Progress

The working memory for Casual Kitchen Express (CKE). Read this first, then the documents it points to. The top half is the current state; the **Log** at the bottom is append-only history.

**Last updated:** 12 November 2026
**Stage:** repository setup and machine setup are done. The arm64 debug build of the customer app runs on the owner’s tablet through the development server. **The customer app’s screens are built on demo data and committed** (frontend first, owner decision on 12 November 2026). **The rider app’s screens are built on demo data and committed.** Next: the owner adds to the docs for the Business and Kitchen app before any of it is built.

---

## 1. What CKE is

A fast-casual, home-style Nigerian food business in Ugbowo, Benin City, near the University of Benin. It has three Android apps and a promotional website:

| Part | Users | Purpose |
|---|---|---|
| Customer app | Customers | Browse, order, pay (simulated), track, reorder |
| Business and Kitchen app | Kitchen staff and managers (tablet and phones) | Order board, walk-in orders at the counter, menu, people, reports, settings |
| Rider app | CKE riders | Queue, pickup, delivery with a 4-digit code, earnings |
| Website | Visitors | Promotes the business and mainly the customer app, hosts the download |

Everything is **simulated**: payments, refunds, delivery, rider payouts, and two months of seeded history.

---

## 2. Read in this order

| File | What it is | Authority |
|---|---|---|
| `progress.md` | This file: status, rules, next steps, log | Start here |
| `docs/architecture.md` (v0.22) | Functions, 109 feature IDs (CUS, RID, KIT, MGR, WEB), order lifecycle, data model, decisions, free-tier limits, **locked versions (section 15)**, build order (16), **16.1 to verify at build**, seed data | Wins on anything technical |
| `docs/design.md` (v0.18) | UI rules per app, screens, page flows, colours, components | Wins on anything visual or UX |
| `docs/Casual-Kitchen-Express.md` (v1.8) | Brand and business, surface level only | Wins on brand (name, colours, logo, tone, menu, packaging) |
| `docs/list-of-areas.md` | Delivery areas, boundary, landmarks, neighbourhood list | Areas still to confirm on a map |
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

---

## 4. Decided stack (details and exact versions in `architecture.md`, sections 14 and 15)

| Area | Decision |
|---|---|
| Apps | React Native 0.88.1 with Expo SDK 58 and React 19.3.0, TypeScript 6.0.3, three separate apps in one repository with shared packages |
| Repository | npm workspaces (npm 11.17.0, bundled with Node.js 24) and Turborepo 2.11.10, on Node.js 24 LTS. GitHub: ARMSTRONG-AISOSA/casual-kitchen-express |
| App libraries | Expo Router, TanStack Query, Zod, lucide-react-native icons, Gifted Charts (business app), and React Native styles with the shared brand tokens (no UI kit) |
| API | Hono 4.13.14 on Cloudflare Workers (free plan, Wrangler 4.155.0), REST first (GraphQL only if needed) |
| Database | Neon Postgres, through Cloudflare Hyperdrive with `pg` 8.23.1, and Drizzle ORM 0.45.4 (Drizzle Kit 0.31.11 for migrations) |
| Real-time | Cloudflare Durable Objects (WebSockets with hibernation) |
| Background jobs | Cron Triggers and Durable Object alarms |
| Images | Cloudflare R2. Files in object storage, links in the database. Compressed on the device before upload. |
| Auth | Better Auth 1.7.14 in the Worker, with its Expo plugin. Customers and managers use Google sign-in. Riders and kitchen staff use a username and password set by a manager (PBKDF2, about 50,000 iterations, rate-limited). No forgot-password anywhere. |
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
- **Walk-in orders:** entered on the kitchen tablet, paid at the counter in cash (with change due) or online, W- order numbers, a separate channel in all data and reports.
- **Attribution:** every action is recorded against a staff ID. On the shared tablet, actions belong to whoever is signed in.
- **Cancellation:** a quiet link, a required reason, and a confirmation tick. Free cancel before the kitchen acknowledges, a request after that, and none once ready. After 3 cancellations in 7 days, request only (managers can set the limit from 3 to 7).
- **Accounts:** customers can deactivate (reversible) or delete (Danger zone, tick, and typing DELETE ACCOUNT). Managers can deactivate any account except the owner's. Every customer and staff member has a unique ID (C-00418, R-001, K-002, M-001).
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
| Repository | npm workspaces and Turborepo monorepo with the three apps, the API Worker, shared packages, and the website. Typecheck, lint, and the first API test pass. Two commits, not pushed. |
| Android | JDK 17 and the Android SDK installed. arm64-v8a debug build of the customer app installed on the owner’s tablet. |
| Customer app | Every screen built on demo data and committed. Claude tapped through it on the tablet and fixed what it found. |
| Rider app | Every screen built on demo data and committed, with its own arm64 debug build on the tablet. |

---

## 7. Open items

**Owner to provide or confirm**
1. **Food photos (approach decided).** Every dish is a "Photo to come" placeholder. Free libraries first (Unsplash, Pexels, Pixabay, Wikimedia Commons) with each source recorded, then AI images based on real references only where nothing suitable exists. Raise this when building the screens.
2. **Delivery areas.** Which areas are in range is decided (both sides of Oluku, Isihor, Iguosa, and the Oluku villages, all up to Oluku Market). Still to do: draw the boundary polygon from map pins (Uselu to Oluku Market) and confirm spellings. Extra landmarks between Uselu and Oluku may be researched, but each needs the owner’s approval before it is added.
3. **GitHub repository (decided):** https://github.com/ARMSTRONG-AISOSA/casual-kitchen-express. The website's download button should point to its `releases/latest` once it exists.
4. **Versions:** all locked in `architecture.md`, section 15. Re-check them for security advisories just before installing.
5. **Machine setup (done):** JDK 17.0.21 is installed through apt. The Android SDK is in `~/Android/Sdk` (command-line tools 23.0, platform-tools 37.0.1, Platforms 36 and 37, build-tools 36.0.0, NDK 27.1.12297006). `JAVA_HOME`, `ANDROID_HOME`, and the SDK `PATH` are set in `~/.bashrc` (verified: adb 37.0.1 from the SDK). Note: the home router’s DNS (192.168.0.1) times out on some names, which broke apt; using 1.1.1.1 and 8.8.8.8 fixed it.
6. **GitHub remote:** `origin` is https://github.com/ARMSTRONG-AISOSA/casual-kitchen-express.git. The repository exists and is empty. Nothing is pushed until the owner says so.
7. **App screens on demo data:** the customer and rider screens are committed. The customer map and Google sign-in are stand-ins until their libraries and the backend are added. Rider alert sounds come with push notifications (decided), so alerts only vibrate for now.
8. **Decided (12 November 2026):** the rider can’t go offline while carrying an order (`architecture.md` RID-02, `design.md` 5.5).
9. **Prototypes lag the docs** on the 11 November decisions (cart, cash amounts, load display, kitchen theme, website cancel line). The docs win, and the prototypes are not being updated.

**To verify at build** (the full list is in `architecture.md`, 16.1)
- Better Auth's username plugin, admin create-user, and custom password-hash setting.
- PBKDF2 timing on a deployed Worker (it must fit 10 ms of CPU).
- Durable Object alarms and hibernation on the free plan.
- Background location and the rider battery target (about 10% an hour or less).
- Google sign-in console setup (package name, release-key SHA-1, consent screen, privacy link).
- Hyperdrive caching (off for live order data) and Neon's free storage.
- OpenFreeMap usage terms and the map credit.
- Re-check every free allowance just before building.

---

## 8. What comes next: the build

Follow `architecture.md`, section 16 (build order). On 12 November 2026 the owner chose to build the app screens first on demo data, so the order is now:

1. **Done (11 November 2026).** **Set up the repository** (`ARMSTRONG-AISOSA/casual-kitchen-express`) with npm workspaces and Turborepo, using only the locked versions: apps (customer, rider, business), the API Worker, shared packages (types, Zod validation, API client, brand tokens), the website, `docs/`, `design/`, and `brand/`. Add the MIT `LICENSE` and a README with the single Claude Code credit line.
2. **In review (12 November 2026).** **Customer app screens on demo data:** browse, item, your order, checkout, address, pay, paid, track, rate, orders, profile, more, deactivate, and delete. Owner review, then commit.
3. **Done (12 November 2026).** **Rider app screens on demo data.** Then the **Business and Kitchen app** screens, **after the owner adds to the docs** (owner, 12 November 2026).
4. **Backend foundation:** the Hono Worker, Drizzle schema from `architecture.md` section 9, Neon through Hyperdrive, Better Auth, roles, menu, orders, and order statuses. Run the verification checks in 16.1 early.
5. **Seed script:** two months of demo data per `architecture.md`, 18.3, as soon as the schema exists.
6. **Connect the screens to the API:** replace the demo data in each app with real calls, add the real map (MapLibre) and Google sign-in.
7. **Capacity rules, batching, and the demo simulator.**
8. **Website:** turn `design/prototypes/cke-website.html` into the static GitHub Pages site.
9. **Reports, rider payouts, and polish,** then release APKs on GitHub.

The prototypes are the visual reference for every screen. Reuse their copy, layout, and flows, but write production code fresh rather than copying prototype code.

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

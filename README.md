# Casual Kitchen Express

**Tastes like home. Arrives fast.**

Casual Kitchen Express (CKE) cooks home-style Nigerian meals in Ugbowo, Benin City, near the University of Benin, and delivers them from Uselu to Oluku Market. This repository holds the whole platform: three Android apps, the API behind them, and the website.

- **Website:** [armstrong-aisosa.github.io/casual-kitchen-express](https://armstrong-aisosa.github.io/casual-kitchen-express/)
- **Download the apps:** [latest release](https://github.com/ARMSTRONG-AISOSA/casual-kitchen-express/releases/latest) (Android 10 or newer)

> Payments, refunds, delivery, and rider payouts are all simulated. No real money moves, and no real card details are ever collected.

## The apps

| App | For | What it does |
|---|---|---|
| **CKE** (customer) | Anyone hungry in the delivery area | Browse the menu without an account, check out on one screen, sign in with Google, pay (demo), follow the order live with the rider on a map, give the rider a 4-digit code, and reorder in two taps |
| **CKE Rider** | CKE’s delivery riders | Go online, take orders from the queue (first to accept wins), carry up to three when they fit, hand off to the phone’s navigation app, confirm each delivery with the customer’s code, and see earnings. Shares its position only while carrying an order. |
| **CKE Kitchen** (business) | Kitchen staff, dispatch officers, account officers, and managers (tablet and phone) | The kitchen board, walk-in orders at the counter, dispatch and alerts, the menu and photos, people, reports, rider pay, the daily cash-up and monthly close, settings, and demo controls with practice orders |

The customer app is the one on the website. The rider and business apps are on the release page only.

### Install

1. Open the [latest release](https://github.com/ARMSTRONG-AISOSA/casual-kitchen-express/releases/latest) on your Android phone and download the APK you need (`cke-customer-…apk` for most people).
2. Open the file. If your phone asks, allow your browser to install apps.
3. Your phone may warn that the app comes from an unknown source, or Play Protect may offer to scan it, because it isn’t from the Play Store. Continue to install.
4. Each file’s SHA-256 checksum is on the release page, in `SHA256SUMS.txt`, if you want to check the download.

A new version installs over the old one, and you stay signed in. The apps tell you when one is out.

## Tested on a real device

Release 1.0.1, tested on 18 November 2026 on a budget Android tablet (Unisoc T310, 4 GB of memory, Android 12), using the release APKs.

| Check | Result |
|---|---|
| Memory | No leaks after about 40 minutes of tapping through every screen of all three apps. Memory levels off at 104 to 154 MB per app. |
| CPU | 9 to 14% of one core in use, 0% in the background. |
| Smoothness | Screens draw in 12 to 16 ms, and taps respond well within 100 ms. Opening a screen costs a few slow frames (up to about 40 ms). |
| End to end | One order through all three apps: placed and paid, cooked, picked up, followed live on the map, and delivered with the code. Every push notification arrived. |
| Rider battery | Two-hour delivery shift, screen off: 100% to 99%. The whole tablet used about 0.5% an hour, the rider app about 1 mAh an hour, and it ended cooler than it started (33.8 to 31.9 °C). The target is 10% an hour or less. |

The rider’s movement was simulated with a test location over Wi-Fi, so the GPS chip and mobile data were not used. A real phone on a real shift will use more, an estimated 1 to 2% an hour. Full figures are in [`docs/architecture.md`](docs/architecture.md), sections 7.5 and 16.1.

## How it’s built

| Part | Technology |
|---|---|
| Apps | React Native 0.88 with Expo SDK 58, TypeScript, Expo Router, TanStack Query; MapLibre with OpenFreeMap tiles for the customer map |
| API | Hono on Cloudflare Workers, Durable Objects for live updates over WebSockets, Better Auth (Google for customers and managers, usernames for other staff) |
| Data | Neon Postgres through Cloudflare Hyperdrive, with Drizzle ORM; photos in Workers KV |
| Push | Expo push notifications with Firebase |
| Website | Plain HTML, CSS, and JavaScript on GitHub Pages |
| Repository | npm workspaces and Turborepo; Vitest for the API, Playwright for the website, ESLint and Prettier |

Every version is locked in [`docs/architecture.md`](docs/architecture.md), section 15. Everything runs on free plans.

## Repository layout

| Folder | What it is |
|---|---|
| `apps/customer` | Customer app (Expo, Android) |
| `apps/rider` | Rider app (Expo, Android) |
| `apps/business` | Business and Kitchen app (Expo, Android tablet and phone) |
| `apps/api` | The API (Hono on Cloudflare Workers), its database schema, seed scripts, and tests |
| `apps/website` | The website (GitHub Pages) |
| `packages/*` | Shared code: types, validation, the API client, and brand tokens |
| `tools/` | Expo config plugins (processor types, release signing) and the release build script |
| `docs/` | Architecture, design, brand, delivery areas, and photo credits |
| `design/prototypes/` | Clickable prototypes of every screen (open in a browser) |
| `brand/` | Logo files, app icons, and brand tokens |

## Getting started

You need Node.js 24 LTS (npm comes with it). For Android builds you also need JDK 17 and the Android SDK, and Docker for the local database.

```sh
npm install
npm run typecheck
```

- **The API and its database:** [`apps/api/README.md`](apps/api/README.md) has every command (start the database, migrate, seed three months of demo history, run the API and its tests), with what each should print.
- **An app on a phone:** in the app’s folder, `npx expo run:android` builds and installs a development build, and `npm run dev` starts its development server. Builds are for 64-bit ARM phones (`arm64-v8a`); release builds add `armeabi-v7a`.
- **The website:** `npm run serve --workspace @cke/website` serves it locally, and `npm test --workspace @cke/website` runs its checks.
- **Release APKs:** `bash tools/release/build-apks.sh` builds the three signed APKs and their checksums (the signing keys are kept outside the repository).

The project’s status, decisions, and history are in [`progress.md`](progress.md).

## Licence

The code is released under the [MIT licence](LICENSE). The Casual Kitchen Express name and logo are not part of that grant. Menu photo credits are in [`docs/photo-credits.md`](docs/photo-credits.md).

Built with help from Claude Code.

# Casual Kitchen Express

Home-style Nigerian meals, ordered in a few taps and delivered fast, from a kitchen in Ugbowo, Benin City.

This repository holds the whole platform:

| Folder | What it is |
|---|---|
| `apps/customer` | Customer app (Expo, Android): browse, order, pay, track, reorder |
| `apps/rider` | Rider app (Expo, Android): queue, pickup, delivery code, earnings |
| `apps/business` | Business and Kitchen app (Expo, Android tablet and phone): order board, walk-in orders, dispatch, menu, people, reports, finance |
| `apps/api` | The API: Hono on Cloudflare Workers, with Neon Postgres through Hyperdrive |
| `apps/website` | The promotional website: plain HTML, CSS, and JavaScript on GitHub Pages |
| `packages/*` | Shared code: types, validation, API client, and brand tokens |
| `docs/` | Architecture, design, brand, delivery area, and photo credit documents |
| `design/prototypes/` | Clickable prototypes of every screen |
| `brand/` | Logo files, app icons, and brand tokens |

Payments, refunds, delivery, and rider payouts are all simulated. No real money moves, and no real card details are ever collected.

## Getting started

You need Node.js 24 LTS (npm comes with it). For Android builds you also need JDK 17 and the Android SDK.

```sh
npm install
npm run typecheck
```

Each app has its own scripts. For example, `npm run dev --workspace @cke/api` starts the API locally. The API’s database, seed, and test commands are in [`apps/api/README.md`](apps/api/README.md), and the project status is in [`progress.md`](progress.md).

## Download

Android APKs are published on [GitHub Releases](https://github.com/ARMSTRONG-AISOSA/casual-kitchen-express/releases). The apps need Android 10 or newer.

## Licence

The code is released under the [MIT licence](LICENSE). The Casual Kitchen Express name and logo are not part of that grant.

Built with help from Claude Code.

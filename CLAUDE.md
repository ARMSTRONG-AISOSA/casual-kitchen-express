# CLAUDE.md

Project: **Casual Kitchen Express (CKE)**, three Android apps (customer, rider, business and kitchen) and a promotional website.

## Before any work, read in this order

1. `progress.md` — current status, the owner’s rules, open items, next steps, and the log.
2. `docs/architecture.md` — features with IDs, data model, decisions, free-tier limits, and section 16.1 (to verify at build).
3. `docs/design.md` — UI rules, screens, and page flows for every app and the website.
4. `docs/Casual-Kitchen-Express.md` — brand and business, surface level.
5. `docs/list-of-areas.md` — delivery areas and the Oluku Market boundary.

The clickable prototypes in `design/prototypes/` show every screen. Open them in a browser. If they disagree with the docs, the docs win.

## Key rules

- Don’t change anything marked **Decided** without asking. Record new ideas as **Proposal**.
- Never mention in `docs/Casual-Kitchen-Express.md` that this is a portfolio or research project.
- Everything is simulated (payments, refunds, delivery, payouts). No real card data, ever.
- Fewest taps wins.
- MIT licence. Credit Claude Code only in the README (one line) and on the website’s About page (one small line).
- Android 10 (API 29) and above, no Play Store. APKs ship on GitHub Releases.
- Use the logo and tokens in `brand/cke-logo-package/`. Never redraw the logo.
- Install only the versions locked in `docs/architecture.md`, section 15. Use `npx expo install` for Expo packages, commit the lockfile, and ask before upgrading anything.

## After each work session

Append a dated entry to the Log in `progress.md` covering what was done, files changed, decisions, open questions, and the next step. When a decision changes, update the relevant document and its change log too.

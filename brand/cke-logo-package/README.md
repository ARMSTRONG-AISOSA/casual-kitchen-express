# CKE Logo Package

Production logo files for Casual Kitchen Express, for use in the app, website, packaging artwork, and social media.

The wordmark ("Casual Kitchen" and "EXPRESS") is converted to outlines in every file, so no fonts are needed to display the logo.

## Folders

| Folder | Contents |
|---|---|
| `logo/svg` | Vector logos: horizontal and stacked lockups, full icon, and small-size icon. Transparent backgrounds. |
| `logo/png` | The same files as transparent PNGs (horizontal 1600 px wide, stacked 1000 px wide, icons 1024 px, small icons 512 px). |
| `app-icon` | Store and install icons: 1024, 512, 192, 180, maskable 512, plus a rounded preview. |
| `favicon` | `favicon.svg`, `favicon.ico` (16, 32, 48), PNGs, and `apple-touch-icon.png`. |
| `social` | Profile image, 1080 px square (platforms crop it to a circle). |
| `tokens` | `brand-tokens.css` and `brand-tokens.json`: colours, fonts, and type scale. The dark theme colours and the rider app's black and white palette are included. |
| `web` | `head-snippet.html` and `site.webmanifest` for the website and installable web app. |

## Which file on which background

Each logo file is drawn for one background. Use the matching file:

| File suffix | Use on |
|---|---|
| `-cream` | Warm Cream (#FFF3DF) or white |
| `-charcoal` | Charcoal (#292522) |
| `-red` | Tomato Red (#C83F2D) |
| `-yellow` | Golden Yellow (#F2B544) |
| `-mono-charcoal` | Single-colour print on light backgrounds |
| `-mono-cream-on-red` | Single-colour print on Tomato Red |

## Sizes and rules

- **Full icon:** minimum 32 px.
- **Small icon (`cke-icon-small-*`, favicons):** use below 32 px, down to 16 px. The full icon's speed lines and fine strokes blur at small sizes.
- **Full lockup:** minimum 140 px wide on screen.
- **Clear space:** half the icon height on every side.
- **Don't:** stretch or squash, change the colours, put yellow text on cream, or place the logo on busy backgrounds.

## App stores

- `cke-app-icon-1024.png` is full-bleed with no rounded corners and no transparency. Apple and Google apply their own masks.
- `cke-app-icon-maskable-512.png` keeps the icon inside the safe zone for Android and installable web apps.

## Fonts for interface text

- Headings: Nunito (700, 800). Body, buttons, prices: Inter (400, 500, 600, 700). Both are free Google Fonts.
- The logo lettering (Fraunces Bold and Nunito ExtraBold) is artwork only and is not an interface font.

## Rebuilding

The files were generated from one script, `tools/build_logo.py`, so any change to the icon shape or colours can be regenerated consistently. It needs Python with the `fonttools`, `uharfbuzz`, `cairosvg`, and `pillow` packages, plus the Fraunces, Nunito, and Inter variable font files (free from Google Fonts), and the font and output paths at the top of the script adjusted to your machine.

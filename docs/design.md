# CKE DESIGN

**Document Status:** Draft v0.40. Records UI and UX decisions, design choices, page flows, and design libraries. Reviewed end to end on 11 November 2026, and twice on 12 November 2026 (after the new staff roles and Finance were added, and at the end of the day).  
**Related documents:** `Casual-Kitchen-Express.md` (business and brand, surface level), `architecture.md` (functions, features, data, technical decisions), and `list-of-areas.md` (delivery areas).

---

## 1. PURPOSE AND SCOPE

This document records **how each app and the website should look, feel, and flow**. It covers:

- Customer app
- Business and Kitchen app (kitchen staff, dispatch officers, account officers, and managers)
- Rider and Delivery app
- Website

**Status:** design is complete, and every design question is decided (section 10). The clickable prototypes in `design/prototypes/` show each screen. If a prototype and this document disagree, this document wins. The contrast values and other items to check are listed in `architecture.md`, 16.1.

---

## 2. DESIGN PHILOSOPHY

The apps serve very different situations, so they do not share one style. They share the brand's colours, fonts, and tokens, but **how much design they carry depends on the job**.

| App | Philosophy | Why |
|---|---|---|
| Customer app | Expressive and appetising. Brand-rich design that makes people want to order. | Customers choose food by how it looks and feels, and the brand needs to be memorable. |
| Website | Expressive, like the customer app. | Promotes the app and the brand. |
| Business and Kitchen app | **Practical first, polished second.** Looks nice, but leans toward practical kitchen use. | Used in a busy kitchen by staff on their feet, often at a distance, with limited time. |
| Manager screens | Same philosophy as the kitchen. | Same app, same staff, same environment. |
| Rider and Delivery app | **Functional above everything.** Little decoration. | Used on a bike, in traffic, under the sun, with one hand and short glances. |

**Shared rule across all apps:** every task should take as few taps as possible, with sensible defaults and nothing asked twice.

---

## 3. SHARED FOUNDATIONS

### 3.1 Brand tokens

The colours, fonts, and type scale are defined in the business document and delivered in the logo package (`brand-tokens.css` and `brand-tokens.json`). Deep Tomato, the dark theme tokens (3.9), and the rider palette (3.2) are in those files.

| Token | Value |
|---|---|
| Tomato Red | `#C83F2D` |
| Golden Yellow | `#F2B544` (accents and backgrounds only, never text on cream) |
| Warm Cream | `#FFF3DF` |
| Charcoal | `#292522` |
| Kraft | `#E2C9A3` |
| Muted Text | `#5B534E` |
| Border | `#D9CDB8` |
| White | `#FFFFFF` |
| Deep Tomato | `#A32A1B`, for alerts and destructive actions in the rider app (3.2), and the customer app’s Danger zone button |
| Headings | Nunito 700 and 800 |
| Body, buttons, prices | Inter 400 to 700 |

### 3.2 Colour roles by app

| App | Backgrounds | Text | Primary action |
|---|---|---|---|
| Customer app, website | Cream and white, with red and yellow accents | Charcoal | Tomato Red button, cream text |
| Kitchen and manager | White and cream, calm and clean | Charcoal | Tomato Red button with white text |
| Rider | White (light mode) or black (dark mode) | Black on white, or white on black | Black button with white text in light mode, white button with black text in dark mode (palette below) |

**Rider palette (decided).** The rider app is mostly black and white, switching between the two for light and dark mode, with the brand colours used only as accents, alerts, and notifications. The contrast ratios below were calculated during planning and should be confirmed in the design tools.

| Role | Light mode | Dark mode |
|---|---|---|
| Background | White `#FFFFFF` | Black `#000000` (saves battery on OLED screens) |
| Cards and lists | Light grey `#F2F2F2` | Near-black `#121212` |
| Text | Black `#000000` (21:1) | White `#FFFFFF` (21:1) |
| Muted text | `#4A4A4A` (about 9:1) | `#C7C7C7` (about 12:1) |
| Primary action | Black button, white text | White button, black text |
| Key control borders | 2 px black | 2 px white |
| Alerts, errors, destructive actions | Deep Tomato `#A32A1B` with white text (about 7:1) | Light Tomato `#E4604C` with black text (about 6:1) |
| New-order banner and notifications | Golden Yellow `#F2B544` with black text (about 11:1) | The same |
| Success | Green `#1B7A3A` with white text and a check mark (about 5:1) | Light green `#5CC47E` with black text and a check mark (about 10:1) |
| Logo | On the sign-in screen only | On the sign-in screen only |

Colour is never the only cue: alerts, success, and notifications always carry an icon and a label.

### 3.3 Status colours and icons

Status is never shown by colour alone. Every status has a **colour, an icon, and a label**.

| Status type | Colour direction | Icon idea |
|---|---|---|
| New or waiting | Yellow background with charcoal text | Bell |
| In progress | Blue-grey or charcoal | Pot or timer |
| Ready or done | Green with a check mark | Check |
| Problem or delay | Red with an exclamation mark | Alert |

Colour choices should differ in lightness as well as hue, so they remain readable for colour-blind users.

### 3.4 Typography use

- Customer app and website use the full brand type scale from the business document.
- Kitchen and manager screens use larger body sizes and heavier weights for anything read at a distance.
- Rider screens use the largest sizes in the system (see section 5).
- Prices are Inter Bold in Charcoal, formatted as ₦2,000.

### 3.5 Layout, shape, and motion

- Spacing on an 8 px grid.
- Rounded corners of moderate size (for example 12 to 16 px for cards and buttons), echoing the logo's soft shapes.
- Motion is light. The customer app and website may use small transitions and a short confetti or steam moment on order confirmation. The kitchen and rider apps use almost no motion beyond clear state changes.
- Respect each device's reduced-motion setting.

### 3.6 Accessibility baseline

- Text contrast of at least 4.5:1 everywhere, and 7:1 in the rider app.
- Tap targets at least 44 px, and larger in the kitchen and rider apps.
- Real labels for icon-only buttons.
- Every password field has an eye button on its right that shows or hides what was typed (labelled “Show password” or “Hide password”). It starts hidden.
- Status is not conveyed by colour alone.
- Text can scale with the device setting without breaking layouts.

### 3.7 Language and tone

- Plain, short, friendly English.
- Customer-facing copy is warm and direct, like a friendly neighbour who cooks.
- Staff and rider copy is short and action-based (for example, "Ready", "Picked up", "Delivered").

### 3.8 Loading and reconnecting states

Phones lose signal, and the database may take a fraction of a second to wake after a quiet period (see `architecture.md`, 14.2). Every app and the website needs a clear state for loading and for lost connections, so nothing looks frozen or broken.

| App | Loading and reconnect treatment |
|---|---|
| Customer app, website | A friendly message in the brand voice and a gentle steam animation for longer waits, with an automatic retry. After a long wait, a plain explanation and a retry button. |
| Kitchen and manager | A calm banner at the top ("Reconnecting"), with the time of the last successful update. Existing tickets stay visible, and the board refreshes on its own when the connection returns. |
| Rider | Plain text only ("Connecting"), with no animation, and an automatic retry. The last known queue or delivery stays on screen. |

**Rules for all apps**
- Open the app and warm the connection straight away, in the background.
- Never lose a tap: actions that fail are retried automatically and shown as "sending" until confirmed.
- Show what is known (the last loaded menu, the last known status) while waiting, instead of a blank screen.
- Explain any delay in plain words and never show raw error messages.

### 3.9 Optional dark theme

**Decided for all apps:** Settings let the person choose Light (the default), Dark, or Follow phone. The rider app uses its black and white palette (3.2) in both modes. The tokens below are the dark theme for the customer, kitchen, and manager apps.

**Dark tokens (decided; contrast to be confirmed in the design tools):**

| Token | Value | Notes |
|---|---|---|
| Background | `#1F1B19` | Charcoal-based |
| Surface | `#2A2522` | Cards and lists |
| Text | `#FFF3DF` | About 15:1 against the background |
| Muted text | `#CFC4B5` | About 10:1 against the background |
| Primary action | Cream fill with charcoal text | Keeps buttons readable at high contrast |
| Red | Used for icons, outlines, and alerts, with labels | Tomato Red is too dim for small text on dark |

### 3.10 Demo labelling

Everything is simulated, so the apps say so quietly and clearly: the customer app's payment screens carry a "Demo payment. No money is taken." notice, the manager app shows a small "Demo" chip in its header on screens still showing demo figures (since 15 November 2026, when the Business app went live on real orders, only Reports, Finance, Rider pay, Cash-up, and Demo controls keep it), and the website FAQ explains that the app uses demo payments. The seeded history has no real people in it.

---

## 4. CUSTOMER APP

### 4.1 Direction

Expressive and appetising: large food photography, warm cream backgrounds, friendly Nunito headings, and Tomato Red for actions. Easy and quick to use, with the menu visible straight away.

### 4.2 Screen inventory

| Screen | Purpose |
|---|---|
| Home / Menu | Browse categories and items, with search; reorder card for returning customers; the open or closed state |
| Item detail | Photo, description, default options, price, add button. For the soup, only today’s soup (set each morning by the kitchen or a manager) can be chosen. The soup dishes carry today’s soup in their name, description, and photo (“Soup of the day: Egusi”, “Extra egusi”), with the soup’s name on the photo. |
| Order bar | Sticky bar with the item count and running total. Tapping it opens Your order. |
| Your order (cart) | The item list with quantities, Add more, delivery or pickup, and the food, delivery, and total lines, then Go to checkout |
| Checkout | Delivery or pickup, address, the flat delivery fee (₦1,500 by default, set by the manager), payment, pay button |
| Sign-in and sign-up (inside checkout) | One "Continue with Google" button creates or opens the account, and the email comes from Google. There is no password, so no forgot-password screen. A first-time customer then adds a delivery address and an optional gender on the same screen. |
| Out-of-range message | Shown when an address is outside the delivery range, with a pickup option |
| Cancel order | A quiet text link while cancelling is allowed. It opens a sheet that needs a reason and a confirmation tick before Cancel order (or Send request, after the kitchen acknowledges) works (`architecture.md`, 4.6) |
| Help | A "Contact the restaurant" button that opens the WhatsApp chat |
| Demo payment | Card or bank transfer screens with a simulated confirmation, clearly labelled as a demo |
| Order tracking | Status timeline, delivery code, live map, rider info |
| Orders | Two tabs: In progress (live orders) and Order history (past and cancelled orders, each with Reorder) |
| Profile | Photo (with a small camera badge), name, email, customer ID, a Profile photo section, name and gender, addresses, theme, Sign out, help, Deactivate my account, and the Danger zone, in that order |
| Address editor | Add, edit, delete, set default |
| Deactivate account | One confirmation tick, then the customer is signed out. Signing in again offers to reactivate. |
| Delete account | A red Danger zone: a checkbox and typing DELETE ACCOUNT exactly, with Deactivate offered as the gentler choice |
| More | A list of text pages: Terms and conditions, Privacy policy, About us, Support us, Partner with us, FAQs, and Photo credits. Photo credits lists each menu photo’s credit (author and licence, or “Casual Kitchen Express” for CKE’s own photos) and opens its source. |
| Text page | One plain text page with a back button to More |

### 4.3 Page flows

**Browse to order (first time)**
1. Open the app and see the menu immediately, with no sign-up.
2. Tap an item to open its detail, or tap the add button on the card to add the default.
3. A sticky order bar appears with the total. Tap it to open Your order, check the items and quantities, and tap Go to checkout.
4. Checkout: delivery or pickup is carried over from Your order and can still be changed. Delivery adds a flat fee (₦1,500 by default), shown clearly as its own line in the total, and pickup has none. A first-time customer taps Continue with Google, then adds a delivery address and an optional gender, all on the same screen.
5. Pay with a demo payment (card or bank transfer). The confirmation is simulated, and no real money moves.
6. Land on the tracking screen.

**Repeat order**
1. Open the app. A "Reorder last" card is at the top.
2. Tap Reorder, then Pay. Two taps.

**When CKE is closed or paused**
1. The menu stays open to browse.
2. The order bar says "Online orders open at 8:00 am" (or "Orders are paused"), and checkout is switched off. Online orders run from 8:00 am to 6:00 pm.

**Tracking**
1. The timeline shows each status with a time stamp. From "Acknowledged" onward it also shows a short message for each stage.
2. After the rider accepts, the rider's first name appears. After pickup, a live map appears.
3. The delivery code is shown clearly on the screen throughout.
4. When the rider has several stops, the screen shows the customer's position (for example, "stop 2 of 3").
5. After delivery, one tap rates the order, and Reorder is offered.
6. If an order is delayed, an item is unavailable, or the order is cancelled, the timeline shows what happened and why, with the refund status where it applies.

**Cancel an order**
1. Before the kitchen acknowledges the order, a quiet "Cancel order" text link sits on the tracking screen. It is deliberately not a big button, so it isn’t tapped by accident.
2. The link opens a sheet. The customer must pick a reason and tick "I understand this order will be cancelled and can’t be restored". Only then does Cancel order work, and the refund is automatic.
3. After acknowledgement, the link becomes "Request cancellation", with the same reason and confirmation tick. A dispatch officer or a manager approves or declines.
4. After 3 cancellations in 7 days (a limit managers can set from 3 to 7), the customer can only send a request, and the sheet explains why.
5. Once the food is ready, there is no cancel option, only "Contact the restaurant" (WhatsApp).
6. The timeline then shows "Cancelled" and the refund status ("Refund pending", then "Refund completed"), and the order moves to Order history.

**Orders tabs**
1. The Orders tab opens on In progress, showing any live order with its current status.
2. Order history lists past orders, newest first, including cancelled ones marked "Cancelled, refunded". Each has Reorder.

**Deactivate account**
1. In Profile, above the Danger zone, tap Deactivate my account.
2. Read what happens, tick "I want to deactivate my account", and tap Deactivate my account.
3. The customer is signed out. Everything is kept.
4. Signing in again with Google shows "Welcome back" and offers Reactivate my account.

**Delete account**
1. In Profile, the Danger zone has a red border and a Delete my account button.
2. The delete screen repeats the warning and offers Deactivate as the gentler choice.
3. The button stays disabled until the customer ticks "I understand my account will be deleted for good" and types DELETE ACCOUNT exactly, in capitals.

**More**
1. Tap More in the tab bar to see the list of pages.
2. Tap a page to read it, and Back to return to the list.

**Profile photo**
1. Two ways in: tap the photo (it carries a small camera badge), or use the **Profile photo** section below it, with **Add photo** (or **Change photo** and **Remove** once there is one). Either opens: Take photo, Choose from gallery, and Remove photo (only if a photo exists).
2. A new photo goes through the phone’s square crop, then is compressed on the phone (512 px, 80 KB or less, WebP). **Your new photo** shows it with the saving, for example “3.8 MB shrunk to 46 KB (99% smaller)”, then Save photo or Choose another.
3. Removing asks for one confirmation, then shows the default avatar (a Tomato Red circle with initials).
4. The photo is private: only the customer and the restaurant’s managers and dispatch officers see it.

**Sign out**
- Once signed in, a **Sign out** section sits between Theme and Help: “Signed in as …. Your orders and addresses stay saved for next time.” and a Sign out button. No confirmation: signing in again is one tap.

**Addresses**
1. Checkout shows the saved address first, with "Add address" on the same screen.
2. Editing and deleting happen in Profile. Deleting the default asks for a new default.
3. Adding an address: choose the neighbourhood from the delivery range, drop a pin on the map (or tap **Use my current location**, which takes one reading while the app is open, moves the pin there, and picks the nearest area; built 16 November 2026), then add a landmark and a contact phone. No address search is needed. If the pin is outside the delivery range (Uselu to Oluku Market), the app says so and offers pickup.

### 4.4 Key components

| Component | Notes |
|---|---|
| Menu card | Photo, name in Nunito, short description, price in Inter Bold, add button |
| Order bar | Sticky at the bottom, shows item count and total |
| Status timeline | Vertical list with icons, labels, and times; current step highlighted |
| Delivery code | Large digits in a clear card |
| Primary button | Tomato Red, cream text, minimum 44 px tall |
| Map credit | A small, always-visible credit on every map: OpenFreeMap, OpenMapTiles, and © OpenStreetMap contributors |
| Demo payment notice | A small, clear label on payment screens: "Demo payment. No money is taken." |
| Confirmation tick | A large checkbox with a plain sentence, used before cancelling, deactivating, and deleting |
| Danger zone | A red-bordered section at the very bottom of Profile, holding only Delete my account |
| Quiet text link | An underlined link used for actions that shouldn’t be tapped by accident, such as Cancel order |
| Map style | A light, muted OpenFreeMap style with brand-coloured markers: a Tomato Red pin for the kitchen, a charcoal rider marker, and a yellow pin with a charcoal outline for the customer's address |

### 4.5 Imagery

Menu photography follows the brand's photography direction. Images are shown in consistent ratios and loaded progressively to suit slower networks. Menu photos are 4:3 and fill the card’s square or the dish screen’s wide frame (cropped to cover). A dish without a photo keeps the drawn placeholder. The soup and extra soup show today’s soup’s own photo, labelled with the soup’s name. Credits are on More, Photo credits (`docs/photo-credits.md`).

### 4.6 Navigation and first launch

- A bottom tab bar with four tabs: **Menu**, **Orders** (In progress and Order history), **Profile** (which includes Help, "Contact the restaurant", and account controls), and **More** (text pages).
- The cart is the sticky order bar, not a tab.
- There are no onboarding screens. The app opens straight on the menu.

---

## 5. RIDER AND DELIVERY APP

### 5.1 Direction

**Functional above everything.** The rider is on a bike, in traffic, under the sun. The screen is glanced at, not studied. The design has almost no decoration and follows strict rules.

### 5.2 Design rules

| Rule | Detail |
|---|---|
| High contrast for sunlight | Black text on white, 21:1. No thin fonts and no low-contrast greys. Yellow is used only as a background with black text. |
| Large type | Key information (order number, address, button labels) at 24 px or larger. Body text at least 18 px. |
| Large tap targets | Primary buttons at least 72 px tall and full width. Other targets at least 56 px. |
| One main action per screen | A single big button at the bottom, within thumb reach. |
| Glanceable | The next thing to do is obvious in about a second. |
| One-handed use | Controls at the bottom half of the screen. No tiny controls, no precision gestures. |
| Safe by design | Actions that need attention are meant for when the rider has stopped. Avoid anything that needs reading while moving. |
| Protect against mistakes | Important actions (such as "Delivered") need a clear, deliberate confirmation. |
| Sound and vibration | New queue orders and status changes use strong alerts, because the rider may not be looking. **Decided (12 November 2026):** vibration works from the first build. The sound plays through push notifications, so it arrives when push is added. Until then the Sound setting is saved and the screen says it comes with notifications. |
| Theme | The black and white palette (3.2): a white background by default for sunlight, with an optional black dark mode in Settings, which also saves battery on OLED screens |
| Light on the phone | The app is kept lean to protect battery and avoid heat: no map, no images, no animation, and plain text screens. The screen stays awake only on the pickup and code-entry screens. |
| Poor-network friendly | Shows the last known state when the connection drops, and retries actions quietly. |
| Light styling | Brand colours only as accents, alerts, and notifications (3.2), plus the logo on the sign-in screen. |

### 5.3 Screen inventory

| Screen | Purpose |
|---|---|
| Sign in | Username and password from the manager. A line says "Forgot your password? Ask your manager." Other staff are told "This app is for riders. Kitchen, dispatch, and managers use CKE Kitchen." The rider stays signed in, even when the app opens without signal. |
| Set a new password | Shown at the first sign-in, and after a manager resets the password |
| My profile | A read-only view of the rider's own details and staff ID. No photo is shown, to keep the app image-free. |
| Settings | Theme (light, dark, or follow the phone), and sound and vibration |
| Home | Online and offline toggle, day summary |
| Queue | Ready orders with order number, drop-off neighbourhood, distance, and load against the budget ("Load 5 of 9") |
| Order detail | Review before accepting |
| Active deliveries | Current stops, one primary action at a time |
| Pickup | Match the bag number, "Picked up" |
| Navigate | Opens the rider's own navigation app with the customer's address |
| Delivery code | Enter the 4-digit code |
| Need help | Send a help request to dispatch (a dispatch officer or a manager), who calls back |
| Order taken | Shown when another rider accepted the order first |
| Release order | A confirmation, in the alert colour, before an order goes back to the queue |
| Day summary | Completed deliveries |
| Assigned order | When a dispatch officer assigns an order, it joins My deliveries with a strong alert and a yellow “Assigned to you by dispatch” banner (`architecture.md` RID-23). |
| Earnings | Today, This week, This month, and All time at the top; an **Owed** section listing everything not paid out yet (today and each earlier unpaid day, with the total); today’s deliveries with each one’s pay; and Payouts. The pay per delivery follows the manager’s setting. |

**Navigation (decided):** a bottom tab bar with four tabs: **Home** (online toggle and day summary), **Queue**, **Earnings**, and **Me** (My profile, with Settings inside). Task screens (order detail, pickup, drop-off, code entry, help, release) open full screen without the tab bar, so the one big action stays at the bottom.

### 5.4 Page flows

**Start of shift**
1. Sign in (stays signed in on the device).
2. Home: tap the large "Go online" toggle.

**Taking an order**
1. The queue shows only orders that fit the rider's remaining capacity.
2. Tap an order to see its details, then tap "Accept". The first rider to accept wins.
3. If another rider was faster, the screen says so clearly and returns to the queue.
4. The rider may carry one order by default, and up to three when the combined load fits.

**Pickup and delivery**
1. Active deliveries shows the next stop with the order number and a single primary button.
2. At the kitchen: match the order number on the bag and tap "Picked up".
3. Tap "Navigate" to open the rider's own navigation app (Google Maps, Waze, or Apple Maps) with the customer's address. A second button calls the customer. The CKE app has no map of its own, which saves battery and keeps the phone cool.
4. At the door: tap "Enter code", type the 4 digits the customer gives, and the delivery completes.
5. With several stops, the app shows the next stop only, with the rest listed below.

**Problems**
- Customer unreachable or code cannot be used: tap "Need help" to send a help request to dispatch, who calls back.
- Cannot continue: tap "Release order", with confirmation, and it returns to the queue.

**Assigned by dispatch**
- When a dispatch officer assigns an order, it joins My deliveries with a strong alert and the yellow “Assigned to you by dispatch” banner. Pickup and delivery then work as usual, and Release order is still available.

### 5.5 Key components

| Component | Notes |
|---|---|
| Primary bar button | Full-width, very tall: black with white text in light mode, white with black text in dark mode |
| Online toggle | Very large, with clear on and off labels. **Decided (12 November 2026):** “Go offline” is disabled while the rider still carries an order, with the line “Finish your deliveries before going offline.”, so no order is left without a rider. Release order (RID-12) is the way out of a delivery. |
| Order card | Order number large, neighbourhood, distance, and load as a number against the budget ("Load 5 of 9"), with no light, medium, or heavy label |
| Code entry | Large numeric keypad, four boxes |
| Status banner | Colour, icon, and label together |
| New-order banner | Golden Yellow background with black text, plus a strong sound and vibration |

---

## 6. BUSINESS AND KITCHEN APP

### 6.1 Direction

**Practical first, polished second.** The app should look nice and feel part of the brand, but lean toward practical kitchen use. The manager screens follow the same philosophy.

### 6.2 Design rules

| Rule | Detail |
|---|---|
| Readable at a distance | Order numbers, item names, and quantities are large and bold on the tablet. |
| Big touch targets | Buttons are large enough for quick taps with busy hands. |
| Three clear stages | New, Preparing, Ready, each with a colour, an icon, and a label. |
| Sound alerts | Two tones: a pleasant double chime for a new online order, and an urgent tone for something that needs attention (an order no rider has accepted, or a delay). **Built 15 November 2026 (the attention tone):** a short rising double beep, made for CKE, plays once when an alert timer runs out, on every device that shows Alerts, with a notification saying which order and why (tap it to open Alerts). It sounds even with the screen off. Dispatch officers and managers turn it on or off in Settings, Alerts (on by default); the tablet’s own volume sets how loud. **The new-order chime (built 15 November 2026):** a soft descending “ding-dong”, also made for CKE, once per new online order, with a notification naming the order and what’s in it (tap it to open the board); its own switch in Settings, Alerts. Saving a walk-in order gives a visual confirmation only. |
| Few taps | One tap to acknowledge, one tap per ticked item, one tap for Ready. |
| Fast counter entry | A walk-in order takes one tap per item, then Charge, a payment choice, and Confirm. |
| Calm look | White and cream, charcoal text, brand red for actions, little decoration. |
| Tablet and phone layouts | The tablet shows the full board. Phones show alerts and quick actions. |
| Screen stays on | While the app is open on the counter tablet. |
| Shows who is on shift | The top bar always shows the signed-in person's name and photo, with a "Switch person" button. |

### 6.3 Layouts

**Tablet (landscape):** three columns, New, Preparing, Ready, with ticket cards. A top bar shows the signed-in person, the New walk-in order button, the All, Online, and Walk-in filter, the pause-orders switch, the sold-out shortcut, and the current time.

**Phone:** a list of active orders with the most urgent first, and tap-through to a ticket. Alerts arrive as notifications.

**Navigation (decided):** a side rail on the left with the logo at the top and Sign out at the bottom. Each role sees only its own items (`architecture.md` 3.0, decided 12 November 2026):

| Role | Side rail |
|---|---|
| Kitchen staff | Board, Walk-in, Sold out, Alerts (with a count) |
| Dispatch officer | Alerts, Orders, Riders, Settings (without Pricing and pay and Restaurant contact) |
| Account officer | Reports, Rider pay, Finance |
| Manager | Board, Walk-in, Sold out, Alerts, then a Manager group: Dashboard, Orders, Riders, People, Menu, Rider pay, Reports, Finance, Settings, and Demo |

The top bar shows the screen title, the Demo chip on manager screens, the signed-in person, and Switch person on kitchen screens. Tapping the person’s photo opens **Your profile**: their photo, name, role and staff ID, job, username or Google email, phone, and a Sign out button (the same cash-up check as the rail’s Sign out). A person who opens the app lands on their first item (the Board, Alerts, or Reports). Choosing a rail item switches to that screen rather than stacking it on the last one, so screens left behind don’t stay open and use memory. The tablet’s back button on a rail screen goes to the person’s first item, and from there it leaves the app; on a task screen (a ticket, an order, a person, an item) it goes back to its list. On a narrow screen (a tablet in portrait, under 1100 dp wide), the Board’s pause switch and clock move to a second row so nothing overlaps the person and Switch person.

### 6.4 Kitchen screen inventory

| Screen | Purpose |
|---|---|
| Sign in | Managers: Continue with Google. Kitchen staff, dispatch officers, and account officers: username and password from a manager. A Google account no manager added is told "That Google account isn’t a CKE manager. Ask the owner to add you in People." |
| Order board | The main working screen |
| Ticket detail | Items, notes, delivery or pickup, checklist by station |
| Sold-out list | **Soup of the day** at the top (one tap picks today’s soup, and the customer app shows it straight away), then every item to switch on or off |
| New walk-in order | Big item tiles by category, the order summary, eat in or take away, and an optional name |
| Take payment | Cash (Exact, or an Other amount box, then the change due) or online (card or transfer), simulated |
| Walk-in order sent | The order number to call out, shown large |
| Switch person | Signs the current person out so the next one can sign in |
| Your profile | Opened from the photo in the top bar: the signed-in person’s details and Sign out |
| Alerts | Unaccepted orders (“Waiting for a rider”), orders running late (“Running late”: not acknowledged, too long in the kitchen, or too long on the road, at the times set in Settings, Alerts), unavailable items, rider help requests, and cancellation requests. Kitchen staff see them; dispatch officers and managers also act on them (7.3), and can Clear a late alert, which stays cleared. |
| Cash-up at close | The cash expected in the drawer, a field for the cash counted, the difference, and Save. Shown to the person on the counter before the 8:30 pm sign-out. |

### 6.5 Kitchen page flows

1. **New order:** a card appears in the New column with a sound alert. Tap it to acknowledge, and it moves to Preparing.
2. **Preparing:** open the ticket and tick items by station. The first tick tells the customer the food is being prepared.
3. **Ready:** tap Ready. A delivery order enters the rider queue, and a pickup order notifies the customer.
4. **Handoff:** the Ready column shows the accepting rider's name. The ticket clears when the rider taps "Picked up", or when staff tap "Collected" for pickup orders.
5. **Sold out:** tap an item in the sold-out list to switch it off, and tap again to bring it back.
6. **On shift:** each person signs in on the tablet with their own username and password at the start of their shift. The top bar always shows who is signed in, with their name and photo, and "Switch person" hands over to the next person. Every action is recorded against whoever is signed in (`architecture.md`, 4.5). The tablet signs out automatically at 8:30 pm, the walk-in closing time, but only once every order placed before 8:30 pm is collected, delivered, or cancelled, so nobody is signed out in the middle of an order. Managers can turn this off in Settings (decided 14 November 2026).
7. **Take a walk-in order:** tap "New walk-in order", then tap item tiles to add items. Choose Eat in or Take away, and add a name if wanted. Tap Charge, then choose **Cash** or **Online**. For cash, tap **Exact**, or type the amount received into the **Other amount** box (decided 12 November 2026). An amount below the total says so and can’t be confirmed. The app shows the change due. For online, confirm the simulated payment. The order number (for example W-006) is shown to call out, and the ticket appears on the board with a Walk-in badge, recorded against the signed-in person.
8. **Walk-in ticket:** it moves through Preparing and Ready like an online ticket. Ready shows the number to call out, and Collected clears it when the customer takes the order. There is no rider step.
9. **Cancel a walk-in order:** before it is ready, open the ticket, tap Cancel, choose **Full refund** or **Partial refund** (type the amount, up to 99% of what was paid; see the refund box in 7.3), choose a reason, tick “I’m sure I want to refund ₦… for …” (the sheet says who it will be recorded as), and confirm. The payment is refunded (simulated), and the refund is recorded with the name, role, and staff ID of the signed-in person and the time.
10. **Soup of the day:** each morning, open Sold out and tap today’s soup at the top. The customer app shows it straight away, and only that soup can be ordered.
11. **Cash-up at close:** at the end of the day (before the 8:30 pm sign-out), the person on the counter opens Cash-up, counts the drawer, enters the amount, and taps Save. The app shows the cash expected from the day’s walk-in cash payments and the difference. The account officer or a manager signs it off later in Finance.

---

## 7. MANAGER AND OFFICER SCREENS (BUSINESS APP)

### 7.1 Direction

Same philosophy as the kitchen: practical first, polished second. Larger controls and clear lists over dense tables, because managers also use phones and tablets. Dispatch officers and account officers use the same screens, limited to their own menus (6.3).

### 7.2 Screen inventory

| Screen | Purpose |
|---|---|
| Dashboard | Today's orders and sales with the online and walk-in split, cash and online payments, orders in progress, alerts |
| People | Five tabs: Riders, Kitchen staff, Dispatch officers, Account officers, and Managers, with staff IDs and status. Reset password, Deactivate, and Reactivate for every account except the owner’s. Managers only. Each card shows the person’s photo (or initials) and has **View profile**, Edit, Reset password, and Deactivate. View profile shows every detail from the editor and the photo, or a large initials placeholder. |
| Add or edit a person | Username and temporary password (or a Google email for managers), plus the profile: name, role, job title, phone, gender (optional: female, male, or prefer not to say), home address (optional), and an optional photo (cropped square and compressed, then shown in the top bar when they sign in) |
| Menu list | Categories and items with availability and prices, and **Soup of the day** at the top: one tap picks today’s soup, and the customer app shows it straight away (kitchen staff set it on Sold out). Below the soups, **Soups in the rotation** lists each soup with Remove, and an **Add a soup** box adds a new one. Each item and soup shows a small photo; tapping it opens the photo dialog (7.3, Image upload). |
| Item editor | Name, description, price, image, options, load value, station |
| Orders | All orders for Today, Yesterday, or any date range back to the first order. Search by order number or customer ID, filter by channel (All, Online, Walk-in), status, staff member, and payment method, and sort by time placed or amount. Shows the count and total value, and loads long ranges 150 rows at a time. |
| Order detail | The full timeline with timestamps and staff IDs, payment, and Refund (managers only: a full refund, or a typed partial amount up to 99% of what was paid; it stays available while something is left to refund). Online orders show a **Customer** card: name, customer ID, phone, and delivery address (label, neighbourhood, landmark), with **Call** and **WhatsApp** buttons. Waiting orders show **Assign to a rider**. A **Back to Orders** button sits at the top. Refunds need an “I’m sure…” tick, and each refund shows who made it (name, role, staff ID, time). |
| Riders | Riders online now, what each is carrying and their load (“Load 5 of 9”), and Call rider. Offline riders are listed below. |
| Assign to a rider | Online riders whose remaining capacity fits the order, with their load and current stops. One tap assigns. |
| Rider pay | Each rider's owed balance, per-delivery pay, mark a period as paid (simulated), and payout history. Account officers and managers. |
| Finance | Four tabs: **Statement** (a month’s sales by channel and payment method, refunds, delivery fees, rider pay earned and paid, cash variances, and net), **Cash-ups** (each day’s expected, counted, difference, who counted, Sign off, and who signed it off with the time), **Audit trail** (every money action with who and when, with filters), and **Close month**. Export as CSV or PDF. Account officers and managers. |
| Demo controls | Three sections. **Tour guide** (managers only, MGR-39): one line on what it shows and **Start tour** (7.3). **Practice orders:** New online order (adds one pretend customer order to the Board), auto-play (a simulated kitchen and riders move orders along), and the speed. **Reset:** puts today’s orders, alerts, cash-ups, payouts, and settings back to the start, with confirmation. Each control has a one-line explanation under it. On a tablet connected to the live kitchen, Practice orders has **New online order**, **New walk-in order**, auto-play, and the speed, and shows how many practice orders are in progress; practice orders are marked “Practice” on every screen, and auto-play never moves a real order. Reset becomes **Remove practice orders**, with confirmation; real orders and the history stay (build step 7, 16 November 2026). The tour stays. |
| Settings | Online order hours (8:00 am to 6:00 pm) and walk-in hours (8:00 am to 8:30 pm), pause orders, **Alerts** (see below), the neighbourhood list and delivery boundary, rider capacity and the batch drop-off distance, rider tracking mode (light or milestones only), the cancellation limit (3 to 7 in 7 days), the delivery fee (₦1,500 by default), and the rider pay per delivery (₦1,000 by default). The delivery fee and rider pay are editable, and changes show in the customer and rider apps straight away. **Restaurant contact** holds the WhatsApp number behind “Contact the restaurant” in the customer app. **Tablet sign-out** (managers only) turns the tablet’s automatic sign-out at 8:30 pm on or off; it’s on by default. Pricing and pay, Restaurant contact, and Tablet sign-out are shown to managers only; dispatch officers see the other sections. **Alerts** (dispatch officers and managers, MGR-14): at the top, switches for **Beep when an alert opens** and **Chime for new online orders**; then a slider for each alert timer, with − and + for one minute at a time, its range under it, and the usual time in its hint: Waiting for a rider (5 to 15 minutes, usually 10), Not acknowledged (1 to 5, usually 5), Too long in the kitchen (10 to 30, usually 15), and Too long on the road (10 to 45, usually 30). Nothing changes until **Save alert settings**, which opens an **Alert settings saved** dialog with a green tick and the saved values. “Undo changes” and “Use the usual times” appear when they apply. Under the buttons, one line says “Not saved yet.”, or who changed it last and when (for example “Last changed 15 Nov 2026, 10:42 am by Osas Edo, Dispatch officer (D-001).”). When notifications are off for the app on that tablet, a red line says so and how to turn them on. |
| Reports | Orders, sales, timings, riders, areas and staff, menu, customers (with a leaderboard), and refunds, for 7, 30, 60, or 90 days or a custom date range, with a channel filter. The report tabs sit on top under a “Report” label; below a divider, the **Date range** and the **Channel** (All, Online, Walk-in) each sit in their own labelled box, side by side on wide screens and stacked otherwise, so the three kinds of choice are never confused. Account officers and managers. |

### 7.3 Page flows

**Create a rider or staff account**
1. Open People, choose the tab, then Add.
2. Enter the sign-in details: a username and a temporary password. (A new manager is added by their Google email instead.)
3. Enter the profile: full name, role, job title, phone, optional gender and home address, and an optional photo. The photo goes through the same crop and automatic compression as menu images.
4. Save. The app shows the new staff ID. The person can sign in straight away and must change the temporary password at the first sign-in.
5. Everything can be edited later from the same screen.

**Deactivate or reactivate a person**
1. Open People and find the person.
2. Tap Deactivate and confirm. They’re signed out straight away and can’t sign in. Their history stays.
3. A deactivated person shows a Reactivate button.
4. The owner’s row has no Deactivate button. It says "Owner, can’t be deactivated".

**Change the delivery fee or rider pay**
1. Open Settings, then Pricing and pay.
2. Enter the new delivery fee or rider pay in naira and tap Save prices.
3. Rider pay can’t be more than the delivery fee, and the app says so if it is.
4. The customer app and the rider app show the new amounts straight away. Orders already placed keep their price. The change is logged with who made it and when.

**Change the alert timers or the beep (dispatch officers and managers)**
1. Open Settings. The Alerts section is second, under Opening hours.
2. Turn **Beep when an alert opens** and **Chime for new online orders** on or off.
3. Drag each slider, or tap − and +, to the number of minutes an order can wait at that stage before an alert opens. Each stops at its range.
4. Tap **Save alert settings**. The **Alert settings saved** dialog lists what’s now in use; tap Done.
5. Every Business app uses the new times straight away. The change goes in the audit log, and the section shows who changed it last and when.

**Reset a rider or staff password**
1. Open People and find the person.
2. Tap "Reset password".
3. A temporary password is shown once, for the manager to pass on.
4. The person must set a new password at the next sign-in.

**Add a menu item**
1. Menu, then "Add item".
2. Choose a category, then enter name, description, and price.
3. Add an image (see below).
4. Set the station and the load value (the load value controls how many orders a rider can carry).
5. Add options if needed, then save. The item appears in the customer app straight away.

**Add or remove a soup in the rotation (managers)**
1. Open Menu. The Soup of the day card is at the top.
2. To add: type the name in Add a soup (for example Banga) and tap Add. It joins the chips and the customer app’s soup list.
3. To remove: tap Remove beside the soup, then Remove from the rotation. It leaves the chips and the customer app. Past orders keep it, and adding the same name later brings it back.
4. Today’s soup can’t be removed (its Remove button is greyed out), so pick another soup first. At least one soup always stays.
5. Each change is logged with who made it and when.

**Edit or delete a menu item**
1. Open the item from the list.
2. Change any field, including image or price, and save.
3. To delete, tap Delete and confirm. Items that appear in past orders are archived rather than erased, so order history stays accurate.
4. A one-tap "Sold out" switch is available on the list for quick changes.

**Image upload with compression** (dishes, soups, and staff; built 12 November 2026)
1. Tap the photo (on Menu, a soup in the rotation, or the item or person editor) and choose Take photo or Choose from gallery.
2. Crop to the shape: 4:3 for dishes and soups, square for staff.
3. The app compresses the image automatically before it leaves the device: it resizes it, converts it to a modern format, and strips private metadata.
4. A preview shows the result with the new file size and the space saved (for example, "995 KB reduced to 152 KB").
5. Say where the photo is from (dishes and soups only; staff photos skip this step and show no credit). **Our own photo**: credited to Casual Kitchen Express, with an optional name of who took it and an optional link. **From the internet**: who took it, the licence (CC0, CC BY, CC BY-SA, public domain, or other), and the link; the licence link is optional.
6. Save. Only the compressed file is uploaded, in one call with its credit.
7. To replace a photo, tap it and choose a new one: the old photo is deleted and the new one shows in every app, and the customer app’s Photo credits update to match. Remove photo deletes it.
8. When a soup is added, its photo dialog opens straight away (optional, it can be skipped and added later).

**View reports and historic data**
1. Open Reports and choose a report from the tabs at the top: Orders, Sales, Times, Riders, areas, and staff, Menu, Customers, or Refunds.
2. In the Date range box, pick 7, 30, 60, or 90 days with one tap, or choose Custom range and pick a From and To date.
3. In the Channel box, pick All, Online, or Walk-in.
4. Each report opens with summary cards (for example total orders, total sales, average delivery time), then a simple chart, then the details. Every figure follows the chosen date range and channel.
5. Tap any row or bar to drill down to the individual orders. Tap an order to see its full timeline with every timestamp (placed, acknowledged, ready, picked up, delivered).
6. Export the current view as a CSV file.

Comparing with the previous period is a possible future update (`architecture.md` 14.0), not part of the first release.

**Pay a rider (simulated; account officers and managers)**
1. Open Rider pay and choose a rider.
2. See the owed balance, the deliveries behind it, and each delivery's pay.
3. Tap "Mark as paid" for the period and confirm. No money moves, and a payout record shows who paid and when.

**Use the demo controls**
1. Open Demo controls.
2. Tap New online order or New walk-in order to place a simulated order, or turn on auto-play to let a simulated kitchen and rider handle orders.
3. Choose the speed (1x, 5x, or 20x), and pause or reset when finished. Reset asks for confirmation and regenerates the historic demo data.

**Take the tour guide** (managers only, MGR-39; owner decision, 15 November 2026)
1. Open Demo controls and tap **Start tour** in the Tour guide section. This is the only place the tour starts.
2. The tour goes down the manager’s side rail in one straight run of 14 steps: Board, Walk-in, Sold out, Alerts, Dashboard, Orders, Riders, People, Menu, Rider pay, Reports, Finance, Settings, and Demo.
3. Each step opens that screen and dims the app, with a yellow ring around its menu item (the rail scrolls to it if needed). A card beside the rail, with a small pointer to the item, shows “Tour guide · Step 3 of 14”, a progress bar, the screen’s name, and one or two sentences on what the screen gets done.
4. **Next** moves on, **Back** (from step 2) and the tablet’s back button go back a step, and **Skip tour** ends it. The last step shows **Finish** instead of Next and no Skip.
5. Skip and Finish return to Demo controls. Taps on the dimmed app do nothing, so nobody leaves the tour by accident. The tour only moves between screens and never changes data. It works in landscape and portrait, and the ring and card follow when the tablet turns.

**Handle a cancellation or refund**
1. Open Orders and choose the order, or open a customer's cancellation request from Alerts.
2. Choose Approve or Decline for a request, or Cancel or Refund for an order the manager is acting on.
3. For a refund, use the **refund box** (owner decision, 15 November 2026): two choices side by side, **Full refund, ₦…** (one tap) and **Partial refund**. Partial opens an **Amount to refund (₦)** field with the number keypad, and under it “Up to ₦… (99% of the ₦… paid)”. A higher amount shows a red line instead (“That’s more than 99% of the ₦… paid. The most is ₦….”), and the confirmation stays locked until the amount is allowed. Then pick a reason. The same box is used everywhere a refund is made: a manager’s Refund on the order, approving a cancellation request, and cancelling a walk-in.
4. Tick “I’m sure I want to refund ₦… for …”, which shows the amount actually chosen (the dialog says who it will be recorded as), then confirm.
5. The customer is notified, the refund shows "Refund pending" and then "Refund completed" (simulated), and the refund is recorded with the name, role, and staff ID of the person signed in, and the time. It appears on the order, in the audit trail, and in Reports, Refunds.

**Approve a manual completion (dispatch officers and managers)**
1. A rider's "Need help" request appears in Alerts.
2. Open it, contact the rider or the customer if needed, and choose Approve completion or Keep open.
3. Approval closes the delivery and is recorded in the audit log.

**Set the delivery area**
1. Open Settings, then Delivery area.
2. Switch each neighbourhood in or out of range, and add or rename areas.
3. Check the boundary. The northern limit is Oluku Market and the city-side limit is Uselu (`architecture.md`, 4.7).

**Look up historic orders**
1. Open Orders and tap Choose dates.
2. Pick a From and a To date. Any date back to the first order can be chosen.
3. Search by order number or customer ID if needed, and add filters.
4. The count and total value update. Long ranges load 150 rows at a time, with Show more at the bottom.
5. Tap an order to see its date, timeline, staff, and payment.

**View online and walk-in orders separately**
1. Open Orders.
2. Tap All, Online, or Walk-in at the top.
3. Add filters (status, date, staff member, payment method) and tap a column heading to sort.
4. Open an order to see when it was placed, who entered or handled it (name and staff ID), the payment method, and its full timeline.
5. The dashboard and the reports use the same channel filter.

**Pause new orders and opening hours**
- A "Pause new orders" switch sits in the top bar for busy moments or early closing.
- Online order hours (8:00 am to 6:00 pm) and walk-in hours (8:00 am to 8:30 pm) are set in Settings as weekly schedules with overrides.

**Contact a customer (dispatch officers and managers)**
1. Open Orders, or an alert, and tap an online order.
2. The Customer card shows the name, customer ID, phone, and delivery address with the landmark.
3. Tap **Call** to open the phone’s dialer, or **WhatsApp** to open a chat with that number. The tap is recorded in the audit log.

**Assign an order to a rider (dispatch officers and managers)**
1. An order waiting too long for a rider appears in Alerts (“No rider has accepted O-2177”).
2. Open it and tap **Assign to a rider**.
3. The list shows online riders whose remaining capacity fits, with their load and stops. Tap one and confirm.
4. The order joins that rider’s deliveries with a strong alert. It leaves the queue for everyone else, and the assignment is recorded.

**Handle a cancellation request (dispatch officers)**
1. A customer’s request appears in Alerts.
2. Open it, contact the customer if needed, and choose Approve or Decline.
3. Approving shows the refund box (a full refund by default, or a typed partial amount up to 99% of what was paid) and needs the “I’m sure I want to refund ₦… for …” tick. The approved request refunds under the rules (`architecture.md` 4.6), recorded with the name, role, and staff ID of the person signed in. Other refunds are for managers.

**Change the restaurant’s WhatsApp number (managers)**
1. Open Settings, then Restaurant contact.
2. Enter the new number and tap Save.
3. “Contact the restaurant” in the customer app uses it straight away. The change is logged with who made it and when.

**Sign off a cash-up (account officers and managers)**
1. Open Finance, then Cash-ups.
2. Each day shows the cash expected, the cash counted, the difference, and who counted it.
3. Tap a day, add a note if there’s a difference, and tap Sign off. The sheet says who it will be recorded as.
4. The person signed in, an account officer or any manager (including the owner), is recorded by name and staff ID with the time. The day then shows “Signed off by” with that name, and the sign-off appears in the audit trail.

**Close a month (account officers and managers)**
1. Open Finance, then Close month, and choose the month.
2. The app checks that every day’s cash-up is signed off, and lists any that aren’t.
3. Review the statement and tap Close month, then confirm. The figures are locked, and the month shows “Closed by” with the name, staff ID, and time of whoever closed it.
4. A later correction is added as an adjustment in the next open month, with a reason.
5. Export the statement, cash-ups, or audit trail as CSV or PDF at any time.

### 7.4 Reports

| Report | Shows |
|---|---|
| Orders | Order volume by hour, day, week, and month; peak times; delivery and pickup split; online and walk-in split; completed and cancelled orders |
| Sales | Total sales, average order value, refunds, and the details: the payment method split (cash, card, transfer) and the online and walk-in split, each line showing the amount first and then its share, for example “Card ₦735,730 (51%)” |
| Times | Time each order was placed, time to acknowledge, preparation time, wait for a rider, delivery time, and total time; averages and the slowest orders |
| Riders, areas, and staff | Summary cards (deliveries, average delivery time, rider pay), then three separate tables. **Riders:** every rider, even with none in the range, with deliveries, share of all deliveries, and average delivery time. **Areas:** every area, with deliveries, share, and average delivery time. **Kitchen staff:** orders handled, share, and average preparation time. Riders and areas end with a total row, are worked out from the deliveries in the chosen date range and channel, and say so when Walk-in is chosen (walk-ins have no deliveries). |
| Menu | Top items, revenue by item and category, how often items sell out |
| Customers | New and returning customers, order frequency, and a **leaderboard** of the top customers by customer ID, sortable by total spent or number of orders (online orders only, because walk-ins have no account). Managers and account officers (`architecture.md` MGR-34). |
| Refunds | Count, total, and average refunded; by reason and by person; and every refund with its order, amount, full or partial, reason, time, and who made it (name, role, staff ID), newest or largest first. Same date range, channel filter, and export as the other reports. |

**Design notes:** large summary numbers, one clear chart per section, plain labels, and lists that collapse into cards on phones. Colour is never the only cue. Reports use pre-computed summaries so they load quickly, even over long periods. Charts are simple bars and lines, with the lists below them for detail.

---

## 8. WEBSITE

### 8.1 Direction

Expressive, like the customer app: brand-rich, food-led, and welcoming. It promotes the business, but **primarily the app**, and sends visitors to download it. It is a static site built with plain HTML, CSS, and JavaScript, with no packages, and hosted on GitHub Pages.

### 8.2 Pages

| Page | Purpose |
|---|---|
| Home | The main page. The tagline, a clear download button, the app's key highlights, how ordering works in three steps (order, track, receive), a short strip about the business, and food imagery. |
| About | The business: home-style Nigerian food made fast, what is served, the delivery area (Uselu to Oluku Market), and the brand's values. Carries one small attribution line. |
| App | Everything about the customer app: the full feature list (which does not mention cancelling), screenshots, how tracking and the delivery code work, install steps for Android, the system requirement (Android 10 or newer), the latest version and release notes, a checksum, and the download. |
| FAQ | Short answers to common questions. |
| Privacy | A short privacy policy, linked from the footer. The Google sign-in setup also asks for it. |

There is no menu page, delivery-area page, or contact page. The delivery area sits on Home, About, and FAQ, and contact lives in the footer.

### 8.3 Footer (on every page)

- **Contact links:** LinkedIn (https://www.linkedin.com/in/armstrong-omoregie-02367a271/), Google (the email ammycan6@gmail.com), and WhatsApp (https://wa.me/2349095466063).
- **Developer credit:** a link to the developer's site, https://bossstrong-dev.vercel.app/, and a GitHub link, https://github.com/ARMSTRONG-AISOSA.
- A small MIT licence mention and the privacy link.

### 8.4 FAQ topics (decided)

- What is Casual Kitchen Express?
- Where do you deliver, and where do you stop? (From Uselu to Oluku Market.)
- How much does delivery cost? (A flat ₦1,500 per order, and pickup is free.)
- What are your opening hours? (Online orders and delivery from 8:00 am to 6:00 pm. Walk-in service until 8:30 pm.)
- Do you take walk-ins? (Yes, at the counter until 8:30 pm, paying by cash or online.)
- How do I install the app on my phone?
- Which Android versions work? (Android 10 or newer.)
- Why is the app not on the Play Store, and is it safe to install?
- How do I know the file is genuine? (The checksum on the release page.)
- How do I track my order and use the delivery code?
- Do I pay in the app? (The app currently uses demo payments, and no money is taken.)
- How do I delete my account?
- How do I get updates?

### 8.5 Page flows

1. **Visitor to download:** land on Home, see the tagline and app highlights, tap the download button, then follow the install steps.
2. **Visitor wanting detail:** Home, then App, then download.
3. **Visitor with doubts:** Home, then FAQ ("Is it safe to install?"), then App.
4. **Visitor wanting to reach out:** use the footer links.

### 8.6 Install guide on the App page

1. Tap Download to get the installer file.
2. Open the file. If asked, allow your browser to install apps from this source.
3. If your phone warns that the app is from an unknown source, that is because it is installed directly rather than through the Play Store. Continue to install.
4. Open the app and browse the menu.

### 8.7 Design notes

- Cream and white backgrounds, Tomato Red buttons, and the logo lockups from the logo package.
- A prominent download button on Home and App: Golden Yellow on the dark hero and in Tomato Red elsewhere.
- Fast loading and responsive from small phones upward, with compressed images.
- Accessible: contrast, focus states, and the FAQ built with native expandable sections.
- Social sharing previews and search titles set for each page.
- GitHub Pages limits (published site about 1 GB, soft 100 GB a month, soft 10 builds an hour) are well within a small static site.
- **Built 16 November 2026** from the prototype, with these changes: the logo files from the logo package; real menu photos with their credits under each; the hero’s speed lines sit above the headline rather than across it; the footer fits a 360-pixel phone; the App feature list adds notifications and Use my current location (and, as 8.2 says, doesn’t mention cancelling); the delivery-area sketch is labelled as a sketch, not to scale; the App page shows the latest release’s version, size, and checksum from GitHub. The App page’s phone pictures are drawn until real screenshots come with the first release. **17 November 2026 (owner request):** the theme switch (follow device, light, dark) is in the header on every page, not the footer: after Get the app on wide screens, and an icon button beside Menu on phones so it stays one tap.

---

## 9. DESIGN LIBRARIES (LOCKED)

The exact versions are locked in `architecture.md`, section 15. This section records what each one is for.

| Area | Choice |
|---|---|
| Mobile styling | React Native styles with the shared brand tokens. No UI kit. |
| Mobile components | Custom components built from the brand tokens |
| Icons | lucide-react-native |
| Fonts | Nunito and Inter through @expo-google-fonts, loaded with expo-font |
| Animation | React Native Reanimated, used lightly (customer app only) |
| Maps | MapLibre React Native with OpenFreeMap tiles, in the customer app only. None in the rider app. |
| Charts (manager reports) | React Native Gifted Charts |
| Images | expo-image for showing photos, and expo-image-picker with expo-image-manipulator for choosing, cropping, and compressing |
| Website | Plain HTML, CSS, and JavaScript. No packages, no CSS framework, and native expandable sections for the FAQ. |
| Design reference | The clickable prototypes in `design/prototypes/`, and the design canvas for the logo, typography, packaging, and social boards |

---

## 10. DESIGN DECISIONS

Every design question is now decided. Anything that needs checking is listed in `architecture.md`, 16.1.

| Decision | Options considered | Decision |
|---|---|---|
| Rider app palette | Deep Tomato primary; charcoal primary; black and white | **Decided:** black and white (light and dark), with brand colours as accents, alerts, and notifications (3.2) |
| Dark theme | Light only; optional dark | **Decided:** optional, in Settings, for all apps (3.9) |
| Kitchen tablet theme | Light; dark; user switch | **Decided:** light by default, with the optional dark theme |
| Map style | Standard map; simplified branded map | **Decided:** a light, muted OpenFreeMap style with brand-coloured markers (4.4) |
| Kitchen alert sounds | Single tone; different tones per event | **Decided:** two tones, one for new online orders and one for attention (6.2) |
| Customer app navigation | Bottom tab bar; single-screen with menus | **Decided:** a bottom tab bar with Menu, Orders, Profile, and More (4.6) |
| Onboarding screens | None; short intro | **Decided:** none. The managers’ tour guide (7.3) is started only by choice from Demo controls, so it isn’t an onboarding screen. |
| Report charts | Simple bars and lines; richer interactive charts | **Decided:** simple bars and lines (7.4) |
| Address entry | Neighbourhood, pin, and landmark; address search | **Decided:** neighbourhood, pin, and landmark |
| Website ordering | Promote only; promote and order | **Decided:** promote only |
| Walk-in orders | In the kitchen app; left out | **Decided:** in the kitchen app, with cash or online payment (6.5) |
| Customer cart | Order bar straight to checkout; a separate Your order screen | **Decided:** a separate Your order screen between the order bar and checkout (4.2) |
| Rider navigation | Bottom tabs; single home screen | **Decided:** bottom tabs Home, Queue, Earnings, and Me (5.3) |
| Kitchen and manager navigation | Side rail; bottom tabs | **Decided:** a side rail. Since 12 November 2026 each staff role sees its own items, and managers see the kitchen items plus a Manager group (6.3). |
| Walk-in cash amounts | A fixed list; amounts above the total | **Decided (changed 12 November 2026):** an Exact button and an Other amount box. The earlier ₦500, ₦1,000, ₦2,000, and ₦5,000 buttons are removed, because they left only Exact for totals above ₦5,000 (6.5) |
| Rider order load | Light, medium, or heavy labels; a number against the budget | **Decided:** a number against the budget, for example "Load 5 of 9" (5.5; the budget is 9 since 15 November 2026) |
| Kitchen and manager theme choices | Light and dark; light, dark, and follow phone | **Decided:** Light, Dark, and Follow phone, like the other apps (3.9) |

---

## 11. CHANGE LOG

| Version | Change |
|---|---|
| 0.40 | 17 November 2026: the website’s theme switch moved from the footer to the header (owner request): after Get the app on wide screens, an icon beside Menu on phones (8.7). |
| 0.39 | 16 November 2026 (late): the website built (8.7 lists what changed from the prototype). |
| 0.38 | 16 November 2026: Use my current location on the address screen (4.3); Demo controls on a live tablet place practice orders, auto-play them, and remove them (7.2); push notifications are only shown while an app is in the background, since the open app already shows the change. |
| 0.37 | Build step 6a, 15 November 2026: the Business app on live data; the “Demo” chip only on screens still showing demo figures (3.10); Demo controls on a live tablet say practice orders return with the live simulator (7.2). |
| 0.36 | Owner decisions on 15 November 2026 (evening): usual alert times 10 and 30 minutes for a rider and the road (7.2); the new-order chime built, with its switch in Settings, Alerts (6.2, 7.2, 7.3). |
| 0.35 | Owner decisions on 15 November 2026 (later): the Alerts section in Settings, with the beep switch, a slider per alert timer within its range, Save, the saved dialog, and who changed it last (7.2, 7.3); the attention tone built as a one-time beep per alert (6.2); Running late alerts with Clear (6.4); rider loads shown against a budget of 9 (5, 7.2); a 90-day choice in Reports (7.2, 7.3). |
| 0.34 | Owner decision on 15 November 2026: the refund box, with Full refund or a typed Partial refund up to 99% of what was paid, wherever a refund is made (6.5, 7.2, 7.3). |
| 0.33 | Fix on 15 November 2026: Business app rail items switch screens instead of stacking them (the stacked screens slowed the tablet), and the back button on a rail screen goes to the person’s first item (6.3). |
| 0.32 | Owner decision on 15 November 2026: a tour guide for managers on Demo controls (7.2, 7.3), one straight tour where each step opens its screen. Demo controls now has Tour guide, Practice orders, and Reset sections, each control with a one-line explanation. |
| 0.31 | Owner requests on 14 November 2026: the customer app’s Profile gets a Profile photo section (with real compression and a size note) and a camera badge on the photo, and a Sign out section between Theme and Help (4.2, 4.3). |
| 0.30 | Owner request on 14 November 2026: tapping your photo in the Business app’s top bar opens Your profile, with Sign out (6.3, 7). |
| 0.29 | Owner request on 14 November 2026: an eye button on every password field to show or hide the password (3.6). |
| 0.28 | 14 November 2026, sign-in built in the rider and customer apps and Google in the Business app: the messages for the wrong app or an unknown Google account (5, 7), and a Sign out button on the rider’s new-password screen. A staff Google account can’t order in the customer app (“Use another Google account to order”). |
| 0.27 | Owner decisions on 14 November 2026: the tablet’s 8:30 pm sign-out waits until every order placed before then is finished, and a manager-only Tablet sign-out switch in Settings turns it on or off (6.5, 7.2). A Set a new password screen in the Business app (first sign-in and after a reset). |
| 0.26 | End-of-day review on 12 November 2026, with no new decisions: the Refunds tab in the reports flow, the refund tick in the walk-in cancel and cancellation-request flows, Photo credits wording on More, and photo taps on the Menu list. |
| 0.25 | Owner decisions on 12 November 2026: photo upload with crop, compression, and credit fields wherever photos are added, replacing deletes the old photo everywhere; a refund confirmation tick and the refunder recorded; a Refunds report; View profile and staff photos on People, with gender and home address in the editor; Back to Orders on the order detail; the Board top bar on narrow screens. |
| 0.24 | 12 November 2026: menu photos in the customer app and as thumbnails on the Business app’s Menu screen; soup dishes carry the soup’s name and photo; a Photo credits page under More. |
| 0.23 | Owner decision on 12 November 2026: managers add and remove soups in the rotation from the Menu screen (Soups in the rotation, Add a soup). |
| 0.22 | Owner decisions on 12 November 2026: Reports separates the report tabs, the Date range box, and the Channel box; sales details show the amount before the percentage; the rider and area details are separate tables for every rider and every area; account officers see the leaderboard. |
| 0.21 | Owner decisions on 12 November 2026: kitchen staff set the soup of the day on the Sold out screen (managers can also use Menu); walk-in cash is Exact or an Other amount box; the cash-up sign-off and month close show who did it (an account officer or any manager), with the time. |
| 0.20 | Consistency review on 12 November 2026, with no new decisions: the dispatch officer and account officer added to the scope, sign in, alerts, People (five tabs), the manual completion and rider pay flows, and the side rail decision; rider Need help goes to dispatch, and an Assigned by dispatch flow; today’s soup on the item detail; the leaderboard for account officers marked as a Proposal. |
| 0.19 | Owner decisions on 12 November 2026: the soup of the day is picked by a manager on the Menu screen and shows in the customer app; side rail items by role, with two new roles, the dispatch officer (Alerts, Orders, Riders, Settings without Pricing and pay) and the account officer (Reports, Rider pay, Finance); a Customer card with Call and WhatsApp on online orders; the Riders screen and Assign to a rider; the Finance screen (statement, cash-ups, audit trail, close month) and the cash-up at close on the counter; the Restaurant contact setting; report comparison moved to future updates; the rider’s Earnings gain All time and an Owed section, and assigned orders get a banner. |
| 0.18 | Owner decisions on 12 November 2026: in the rider app, “Go offline” is disabled while the rider carries an order, and alert sounds come with push notifications (vibration works from the start). |
| 0.17 | Owner decisions on 11 November 2026: a separate Your order screen before checkout, rider bottom tabs, the kitchen and manager side rail, walk-in cash amounts above the total only, the rider order load as "Load 5 of 6", Follow phone in the kitchen and manager theme, the cancellation limit set by managers (3 to 7), and no mention of cancelling in the website’s feature list. |
| 0.16 | Final uniformity review: the delivery fee is flat and set by the manager, the People screen replaces separate Riders and Staff screens, added the historic orders flow and missing screens (new password, order taken, release order, take payment, order sent, switch person), locked the design libraries to match `architecture.md` section 15, and the website uses no packages. |
| 0.15 | Customer app: cancellation friction (quiet link, reason, confirmation tick), Orders tabs, Deactivate account, Danger zone deletion with typed confirmation, More tab with text pages, customer ID. Manager: deactivate and reactivate (owner protected), editable prices, custom report range, value columns, and the customer leaderboard. |
| 0.14 | Added walk-in order entry, walk-in tickets, cancel, and channel filters to the kitchen and manager screens, the hours (online 8:00 am to 6:00 pm, walk-in until 8:30 pm), and the rider black and white palette. Decided the remaining design questions: dark theme for all apps, map style, alert sounds, customer navigation, onboarding, and report charts. |
| 0.13 | Full review of all documents. Added the closed and paused state, the cancel and request-cancellation flows, delivery range messages, manager flows for cancellations, manual completion, and the delivery area, search on the menu, and the delivery boundary (Uselu to Oluku Market). Corrected the sign-up, website library, and open decisions wording, and tidied this log. |
| 0.12 | Added the "Contact the restaurant" button (opens WhatsApp). |
| 0.11 | Added the fixed ₦1,500 delivery fee at checkout, the rider Earnings screen, manager Rider pay and Demo controls, and demo labelling. |
| 0.10 | Kitchen on-shift attribution decided: whoever is signed in on the tablet, with the signed-in person always shown in the top bar. |
| 0.9 | Added the optional dark theme (3.9), manager-entered staff profiles with staff IDs, rider profile and settings screens, kitchen on-shift attribution, and the footer contact links. |
| 0.8 | Sign-in decided: Google for customers and managers, usernames and manager-reset passwords for riders and kitchen staff. Privacy page confirmed. |
| 0.7 | Rewrote the website section (Home, About, App, FAQ, footer, install guide). Added sign-in proposals, password reset by managers, and the map credit. |
| 0.6 | Customer map decided: MapLibre with OpenFreeMap. Android first. |
| 0.5 | Payments are simulated (demo payment screens and notice). Added address entry by neighbourhood, pin, and landmark. Updated map library candidates. |
| 0.4 | Updated 3.8 for Cloudflare Workers hosting: no long server wake-ups, so the states cover brief loading and lost connections. |
| 0.3 | Added waking, loading, and reconnecting states for free-tier hosting (3.8). |
| 0.2 | Added manager reports and historic data, the lean rider app rules (no map, no animation, navigation hand-off), and the Expo decision. |
| 0.1 | First draft: philosophy per app, shared foundations, screens and page flows for all apps and the website, library candidates. |

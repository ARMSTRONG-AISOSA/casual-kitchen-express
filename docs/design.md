# CKE DESIGN

**Document Status:** Draft v0.18. Records UI and UX decisions, design choices, page flows, and design libraries. Reviewed end to end on 11 November 2026, rider decisions added on 12 November 2026.  
**Related documents:** `Casual-Kitchen-Express.md` (business and brand, surface level), `architecture.md` (functions, features, data, technical decisions), and `list-of-areas.md` (delivery areas).

---

## 1. PURPOSE AND SCOPE

This document records **how each app and the website should look, feel, and flow**. It covers:

- Customer app
- Business and Kitchen app (kitchen staff and managers)
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

Everything is simulated, so the apps say so quietly and clearly: the customer app's payment screens carry a "Demo payment. No money is taken." notice, the manager app shows a small "Demo" chip in its header, and the website FAQ explains that the app uses demo payments. The seeded history has no real people in it.

---

## 4. CUSTOMER APP

### 4.1 Direction

Expressive and appetising: large food photography, warm cream backgrounds, friendly Nunito headings, and Tomato Red for actions. Easy and quick to use, with the menu visible straight away.

### 4.2 Screen inventory

| Screen | Purpose |
|---|---|
| Home / Menu | Browse categories and items, with search; reorder card for returning customers; the open or closed state |
| Item detail | Photo, description, default options, price, add button |
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
| Profile | Photo, name, email, customer ID, gender, addresses, theme, help, Deactivate my account, and the Danger zone |
| Address editor | Add, edit, delete, set default |
| Deactivate account | One confirmation tick, then the customer is signed out. Signing in again offers to reactivate. |
| Delete account | A red Danger zone: a checkbox and typing DELETE ACCOUNT exactly, with Deactivate offered as the gentler choice |
| More | A list of text pages: Terms and conditions, Privacy policy, About us, Support us, Partner with us, and FAQs |
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
3. After acknowledgement, the link becomes "Request cancellation", with the same reason and confirmation tick. A manager approves or declines.
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
1. Tap the photo to open a menu: Take photo, Choose from gallery, and Remove photo (only if a photo exists).
2. A new photo goes through a square crop, then is compressed automatically before upload.
3. Removing asks for one confirmation, then shows the default avatar (a Tomato Red circle with initials).

**Addresses**
1. Checkout shows the saved address first, with "Add address" on the same screen.
2. Editing and deleting happen in Profile. Deleting the default asks for a new default.
3. Adding an address: choose the neighbourhood from the delivery range, drop a pin on the map (or use the current location), then add a landmark and a contact phone. No address search is needed. If the pin is outside the delivery range (Uselu to Oluku Market), the app says so and offers pickup.

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

Menu photography follows the brand's photography direction. Images are shown in consistent ratios and loaded progressively to suit slower networks.

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
| Sign in | Username and password from the manager. A line says "Forgot your password? Ask your manager." |
| Set a new password | Shown at the first sign-in, and after a manager resets the password |
| My profile | A read-only view of the rider's own details and staff ID. No photo is shown, to keep the app image-free. |
| Settings | Theme (light, dark, or follow the phone), and sound and vibration |
| Home | Online and offline toggle, day summary |
| Queue | Ready orders with order number, drop-off neighbourhood, distance, and load against the budget ("Load 5 of 6") |
| Order detail | Review before accepting |
| Active deliveries | Current stops, one primary action at a time |
| Pickup | Match the bag number, "Picked up" |
| Navigate | Opens the rider's own navigation app with the customer's address |
| Delivery code | Enter the 4-digit code |
| Need help | Contact the manager |
| Order taken | Shown when another rider accepted the order first |
| Release order | A confirmation, in the alert colour, before an order goes back to the queue |
| Day summary | Completed deliveries |
| Earnings | Today, this week, and this month, a per-delivery list with each delivery's pay, and the simulated payout status. The pay per delivery follows the manager’s setting. |

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
- Customer unreachable or code cannot be used: tap "Need help" to contact the manager.
- Cannot continue: tap "Release order", with confirmation, and it returns to the queue.

### 5.5 Key components

| Component | Notes |
|---|---|
| Primary bar button | Full-width, very tall: black with white text in light mode, white with black text in dark mode |
| Online toggle | Very large, with clear on and off labels. **Decided (12 November 2026):** “Go offline” is disabled while the rider still carries an order, with the line “Finish your deliveries before going offline.”, so no order is left without a rider. Release order (RID-12) is the way out of a delivery. |
| Order card | Order number large, neighbourhood, distance, and load as a number against the budget ("Load 5 of 6"), with no light, medium, or heavy label |
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
| Sound alerts | Two tones: a pleasant double chime for a new online order, and an urgent repeating tone for something that needs attention (an order no rider has accepted, or a delay). A volume control and a mute switch. Saving a walk-in order gives a visual confirmation only. |
| Few taps | One tap to acknowledge, one tap per ticked item, one tap for Ready. |
| Fast counter entry | A walk-in order takes one tap per item, then Charge, a payment choice, and Confirm. |
| Calm look | White and cream, charcoal text, brand red for actions, little decoration. |
| Tablet and phone layouts | The tablet shows the full board. Phones show alerts and quick actions. |
| Screen stays on | While the app is open on the counter tablet. |
| Shows who is on shift | The top bar always shows the signed-in person's name and photo, with a "Switch person" button. |

### 6.3 Layouts

**Tablet (landscape):** three columns, New, Preparing, Ready, with ticket cards. A top bar shows the signed-in person, the New walk-in order button, the All, Online, and Walk-in filter, the pause-orders switch, the sold-out shortcut, and the current time.

**Phone:** a list of active orders with the most urgent first, and tap-through to a ticket. Alerts arrive as notifications.

**Navigation (decided):** a side rail on the left with the logo at the top and Sign out at the bottom. Everyone sees **Board**, **Walk-in**, **Sold out**, and **Alerts** (with a count). Managers also see a Manager group: **Dashboard**, **Orders**, **People**, **Menu**, **Rider pay**, **Reports**, **Settings**, and **Demo**. The top bar shows the screen title, the Demo chip on manager screens, the signed-in person, and Switch person on kitchen screens.

### 6.4 Kitchen screen inventory

| Screen | Purpose |
|---|---|
| Sign in | Managers: Continue with Google. Kitchen staff: username and password from a manager. |
| Order board | The main working screen |
| Ticket detail | Items, notes, delivery or pickup, checklist by station |
| Sold-out list | Quickly switch items on or off |
| New walk-in order | Big item tiles by category, the order summary, eat in or take away, and an optional name |
| Take payment | Cash (amount received and change due) or online (card or transfer), simulated |
| Walk-in order sent | The order number to call out, shown large |
| Switch person | Signs the current person out so the next one can sign in |
| Alerts | Delays and unaccepted orders |

### 6.5 Kitchen page flows

1. **New order:** a card appears in the New column with a sound alert. Tap it to acknowledge, and it moves to Preparing.
2. **Preparing:** open the ticket and tick items by station. The first tick tells the customer the food is being prepared.
3. **Ready:** tap Ready. A delivery order enters the rider queue, and a pickup order notifies the customer.
4. **Handoff:** the Ready column shows the accepting rider's name. The ticket clears when the rider taps "Picked up", or when staff tap "Collected" for pickup orders.
5. **Sold out:** tap an item in the sold-out list to switch it off, and tap again to bring it back.
6. **On shift:** each person signs in on the tablet with their own username and password at the start of their shift. The top bar always shows who is signed in, with their name and photo, and "Switch person" hands over to the next person. Every action is recorded against whoever is signed in (`architecture.md`, 4.5). The tablet signs out automatically at 8:30 pm, the walk-in closing time.
7. **Take a walk-in order:** tap "New walk-in order", then tap item tiles to add items. Choose Eat in or Take away, and add a name if wanted. Tap Charge, then choose **Cash** or **Online**. For cash, tap the amount received: Exact, or ₦500, ₦1,000, ₦2,000, or ₦5,000, where only amounts above the total are shown (decided). The app shows the change due. For online, confirm the simulated payment. The order number (for example W-006) is shown to call out, and the ticket appears on the board with a Walk-in badge, recorded against the signed-in person.
8. **Walk-in ticket:** it moves through Preparing and Ready like an online ticket. Ready shows the number to call out, and Collected clears it when the customer takes the order. There is no rider step.
9. **Cancel a walk-in order:** before it is ready, open the ticket, tap Cancel, choose a reason, and confirm. The payment is refunded (simulated) and the cancellation is recorded against the signed-in person.

---

## 7. MANAGER SCREENS (BUSINESS APP)

### 7.1 Direction

Same philosophy as the kitchen: practical first, polished second. Larger controls and clear lists over dense tables, because managers also use phones and tablets.

### 7.2 Screen inventory

| Screen | Purpose |
|---|---|
| Dashboard | Today's orders and sales with the online and walk-in split, cash and online payments, orders in progress, alerts |
| People | Three tabs: Riders, Kitchen staff, and Managers, with staff IDs and status. Reset password, Deactivate, and Reactivate for every account except the owner’s. |
| Add or edit a person | Username and temporary password (or a Google email for managers), plus the profile: name, role, job title, gender (optional), phone, home address (optional), and photo |
| Menu list | Categories and items with availability and prices |
| Item editor | Name, description, price, image, options, load value, station |
| Orders | All orders for Today, Yesterday, or any date range back to the first order. Search by order number or customer ID, filter by channel (All, Online, Walk-in), status, staff member, and payment method, and sort by time placed or amount. Shows the count and total value, and loads long ranges 150 rows at a time. |
| Order detail | The full timeline with timestamps and staff IDs, payment, and Refund |
| Rider pay | Each rider's owed balance, per-delivery pay, mark a period as paid (simulated), and payout history |
| Demo controls | Create orders, auto-play the kitchen and riders, set the speed, and reset the demo data |
| Settings | Online order hours (8:00 am to 6:00 pm) and walk-in hours (8:00 am to 8:30 pm), pause orders, the neighbourhood list and delivery boundary, rider capacity and the batch drop-off distance, rider tracking mode (light or milestones only), the cancellation limit (3 to 7 in 7 days), the delivery fee (₦1,500 by default), and the rider pay per delivery (₦1,000 by default). The delivery fee and rider pay are editable, and changes show in the customer and rider apps straight away. |
| Reports | Orders, sales, timings, riders, areas and staff, menu, and customers (with a leaderboard), for 7, 30, or 60 days or a custom date range, with a channel filter |

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

**Edit or delete a menu item**
1. Open the item from the list.
2. Change any field, including image or price, and save.
3. To delete, tap Delete and confirm. Items that appear in past orders are archived rather than erased, so order history stays accurate.
4. A one-tap "Sold out" switch is available on the list for quick changes.

**Image upload with compression**
1. Tap "Add image" and choose Take photo or Choose from gallery.
2. Crop to the menu card shape.
3. The app compresses the image automatically before it leaves the device: it resizes it, converts it to a modern format, and strips private metadata.
4. A preview shows the result with the new file size and the space saved (for example, "4.2 MB reduced to 180 KB").
5. Save. Only the compressed file is uploaded.
6. To replace or remove an image, tap it and choose Replace or Remove, with confirmation for removal.

**View reports and historic data**
1. Open Reports and choose a report: Orders, Sales, Times, Riders, areas, and staff, Menu, or Customers.
2. Pick 7, 30, or 60 days with one tap, or choose Custom range and pick a From and To date. Compare works when there’s enough earlier data for a period of the same length.
3. Each report opens with summary cards (for example total orders, total sales, average delivery time), then a simple chart, then a list.
4. Turn on "Compare" to see the previous period beside the current one.
5. Tap any row or bar to drill down to the individual orders. Tap an order to see its full timeline with every timestamp (placed, acknowledged, ready, picked up, delivered).
6. Export the current view as a CSV file.

**Pay a rider (simulated)**
1. Open Rider pay and choose a rider.
2. See the owed balance, the deliveries behind it, and each delivery's pay.
3. Tap "Mark as paid" for the period and confirm. No money moves, and a payout record shows who paid and when.

**Use the demo controls**
1. Open Demo controls.
2. Tap New online order or New walk-in order to place a simulated order, or turn on auto-play to let a simulated kitchen and rider handle orders.
3. Choose the speed (1x, 5x, or 20x), and pause or reset when finished. Reset asks for confirmation and regenerates the historic demo data.

**Handle a cancellation or refund**
1. Open Orders and choose the order, or open a customer's cancellation request from Alerts.
2. Choose Approve or Decline for a request, or Cancel or Refund for an order the manager is acting on.
3. For a refund, choose full or partial, pick a reason, and confirm.
4. The customer is notified, the refund shows "Refund pending" and then "Refund completed" (simulated), and the action is recorded with the manager's staff ID.

**Approve a manual completion**
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

### 7.4 Reports

| Report | Shows |
|---|---|
| Orders | Order volume by hour, day, week, and month; peak times; delivery and pickup split; online and walk-in split; completed and cancelled orders |
| Sales | Total sales, average order value, payment method split (cash, card, transfer), online and walk-in split, refunds |
| Times | Time each order was placed, time to acknowledge, preparation time, wait for a rider, delivery time, and total time; averages and the slowest orders |
| Riders, areas, and staff | Per rider: deliveries, order value delivered, delivery fees, rider pay, and average delivery time. Per neighbourhood: orders and average delivery time. Per kitchen staff member: orders handled (online and walk-in), order value handled, and average preparation time. |
| Menu | Top items, revenue by item and category, how often items sell out |
| Customers | New and returning customers, order frequency, and a **leaderboard** of the top customers by customer ID, sortable by total spent or number of orders (online orders only, because walk-ins have no account; managers only) |

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
| Onboarding screens | None; short intro | **Decided:** none |
| Report charts | Simple bars and lines; richer interactive charts | **Decided:** simple bars and lines (7.4) |
| Address entry | Neighbourhood, pin, and landmark; address search | **Decided:** neighbourhood, pin, and landmark |
| Website ordering | Promote only; promote and order | **Decided:** promote only |
| Walk-in orders | In the kitchen app; left out | **Decided:** in the kitchen app, with cash or online payment (6.5) |
| Customer cart | Order bar straight to checkout; a separate Your order screen | **Decided:** a separate Your order screen between the order bar and checkout (4.2) |
| Rider navigation | Bottom tabs; single home screen | **Decided:** bottom tabs Home, Queue, Earnings, and Me (5.3) |
| Kitchen and manager navigation | Side rail; bottom tabs | **Decided:** a side rail with kitchen sections for everyone and a Manager group for managers (6.3) |
| Walk-in cash amounts | A fixed list; amounts above the total | **Decided:** Exact, then ₦500, ₦1,000, ₦2,000, and ₦5,000, showing only amounts above the total (6.5) |
| Rider order load | Light, medium, or heavy labels; a number against the budget | **Decided:** a number against the budget, for example "Load 5 of 6" (5.5) |
| Kitchen and manager theme choices | Light and dark; light, dark, and follow phone | **Decided:** Light, Dark, and Follow phone, like the other apps (3.9) |

---

## 11. CHANGE LOG

| Version | Change |
|---|---|
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

# CKE ARCHITECTURE

**Document Status:** Draft v0.53. Records the functions, features, and decisions for the apps and the website. Reviewed end to end on 11 November 2026, and twice on 12 November 2026 (after the new staff roles and Finance were added, and at the end of the day with the backend foundation in progress), and again on 14 November 2026 after sign-in was built.  
**Related documents:** `Casual-Kitchen-Express.md` (business and brand, surface level), `design.md` (UI/UX decisions and page flows), and `list-of-areas.md` (delivery areas).

---

## 1. PURPOSE AND SCOPE

This document records **what the system does and how it is put together** for the three apps and the website:

| Client | Users |
|---|---|
| Customer app | Customers |
| Business and Kitchen app | Kitchen staff, dispatch officers, account officers, and managers |
| Rider and Delivery app | Riders |
| Website | Visitors (promotes the app) |

**Status:** planning and design are complete. The three apps’ screens are built on demo data. The backend foundation and sign-in with roles are built (16), and the orders backend is next. `progress.md` tracks what has been built and what is left.

**Conventions**
- Feature IDs use a prefix per client or role (CUS, RID, KIT, MGR, DSP, ACC, WEB) so features can be tracked and referenced.
- Status values: **Decided** (confirmed), **Planned** (agreed direction), **Proposal** (suggested, not agreed), **Open** (needs a decision), **Later** (not in the first version).
- Numbers marked "proposal" are starting points to tune, not decisions. Starting values marked decided are confirmed, and are tuned from real use.

---

## 2. SYSTEM OVERVIEW

```
Customer app ──┐
Website ───────┤
Rider app ─────┼──►  Custom API (Hono on Cloudflare Workers)
Kitchen and ───┘            │
Business app                ├──►  Neon (Postgres database)
                            ├──►  Cloudflare R2 (image files)
                            ├──►  Real-time channel (Durable Objects)
                            ├──►  Simulated payments (no real money)
                            ├──►  Map tiles (customer map only)
                            └──►  Push notifications
```

**Architecture principles**
1. One custom backend API is the single source of truth. The clients never talk to each other directly.
2. One account system with roles (customer, rider, kitchen staff, dispatch officer, account officer, manager).
3. Order changes are pushed in real time to every client that needs them.
4. Mobile-first and low-bandwidth, because networks and data costs vary.
5. Images are compressed before they leave the device.
6. Collect only the personal data that is needed, and explain why.

---

## 3. USERS AND ROLES

| Role | Created by | Uses | Can do |
|---|---|---|---|
| Customer | Self, with Google sign-in at checkout | Customer app | Browse, order, pay, track, cancel where allowed, rate, manage profile and addresses |
| Rider | Manager | Rider app | Go online, accept orders from the queue, deliver, view own earnings and history |
| Kitchen staff | Manager | Business and Kitchen app (tablet and phone) | Acknowledge, prepare, mark ready, mark collected, toggle sold out, enter walk-in orders at the counter |
| Dispatch officer | Manager | Business and Kitchen app (tablet and phone) | Coordinates the kitchen, riders, and customers: alerts, orders (with full customer contact details), the live riders panel, assigning an unaccepted order to a rider, rider help requests, cancellation requests (approve or decline, no other refunds), and settings except Pricing and pay and Restaurant contact |
| Account officer | Manager | Business and Kitchen app (tablet and phone) | Record keeping and audit: reports, rider pay (including marking payouts as paid), and the Finance menu (monthly statement, daily cash-up sign-off, audit trail, exports, close month) |
| Manager | The owner, or another manager. The first manager is set up in configuration with the owner's Google email: `OWNER_GOOGLE_EMAIL` and `OWNER_NAME` make staff ID M-001 the owner’s account, and their first Google sign-in links to it (built 14 November 2026; the owner is ammycan6@gmail.com, owner decision). | Business and Kitchen app (tablet and phone) | Everything the other staff roles can do, plus menu, prices, accounts, all settings, refunds |

Permissions are role-based and enforced by the backend, never only by the app screens. Hiding a menu is not enough: each endpoint checks the role (12).

### 3.0 What each staff role sees in the Business and Kitchen app (decided 12 November 2026)

| Menu | Kitchen staff | Dispatch officer | Account officer | Manager |
|---|---|---|---|---|
| Board, Walk-in, Sold out | Yes | No | No | Yes |
| Alerts | Yes | Yes | No | Yes |
| Dashboard | No | No | No | Yes |
| Orders (with customer contact details on online orders) | No | Yes | No | Yes |
| Riders (live panel) | No | Yes | No | Yes |
| People, Menu, Demo | No | No | No | Yes |
| Rider pay | No | No | Yes | Yes |
| Reports | No | No | Yes | Yes |
| Finance | No | No | Yes | Yes |
| Settings | No | Yes, without Pricing and pay and Restaurant contact | No | Yes, every section |
| Cash-up at close | Yes (enters the count) | No | Signs it off | Yes |

Dispatch officers can change hours, pausing, the delivery area, rider capacity, the tracking mode, and the cancellation limit. Only managers change the delivery fee, rider pay, and the restaurant’s WhatsApp number.

### 3.1 Staff accounts and profiles

Riders, kitchen staff, dispatch officers, account officers, and managers are **staff**. A manager creates each staff account and enters the whole profile, and can edit it later. Riders, kitchen staff, dispatch officers, and account officers sign in with a username and password, and managers sign in with Google (12.1). A new manager is added by their Google email.

| Field | Notes | Required |
|---|---|---|
| Staff ID | Created automatically, unique, and never reused. A readable staff code uses a role prefix, for example R-001 for riders, K-001 for kitchen staff, D-001 for dispatch officers, A-001 for account officers, and M-001 for managers. | Automatic |
| Full name | | Yes |
| Username and temporary password | Every staff role except managers. The password must be changed at the first sign-in. | Yes |
| Role | The system role: rider, kitchen staff, dispatch officer, account officer, or manager. It controls what the person can do (3.0). | Yes |
| Job title | A free-text label, for example "Head cook" or "Delivery rider". It does not change permissions. | No |
| Gender | Optional, with "prefer not to say" | No |
| Phone number | Needed for riders, so the manager can reach them | Yes for riders |
| Home address | Optional | No |
| Photo | Cropped and compressed on the device before upload, like menu images (section 8) | No |

**Rules**
- Accounts are **deactivated, never deleted**, so order history and reports stay accurate.
- Any manager can deactivate or reactivate any staff account, including other managers. A deactivated person is signed out straight away and can’t sign in until reactivated. **The owner account can’t be deactivated.**
- Staff personal details (phone, home address, gender) are visible only to managers and to the person themself.
- A customer’s name, phone, and delivery address on an online order are visible to managers and dispatch officers, who use them to coordinate deliveries. Opening the details isn’t logged, but every Call or WhatsApp tap is recorded in the audit log. Photos are access-controlled, never public.
- Only collect what will be used. Home address and gender are optional, and the privacy notes state why each item is collected.
- Customers see a rider's first name only.
- A customer’s profile photo is private to that customer and to managers and dispatch officers (built 14 November 2026).

---

## 4. ORDER LIFECYCLE

### 4.1 Delivery order statuses

| # | Status | Set by | Trigger | Customer sees | Push notification |
|---|---|---|---|---|---|
| 1 | Placed | System | Customer pays | "Order placed" | Yes |
| 2 | Confirmed | System | Payment confirmed | "Payment confirmed" | Yes |
| 3 | Acknowledged | Kitchen | Staff tap the ticket | "The kitchen has your order" | Yes |
| 4 | Preparing | System | First item ticked | "Preparing your food" | No |
| 5 | Ready | Kitchen | "Ready" tap | "Packed and waiting for a rider" | No |
| 6 | Rider accepted | Rider | Rider taps "Accept" in the queue | "Rider assigned" with first name | Yes |
| 7 | Picked up | Rider | "Picked up" tap | "On the way" with live location | Yes |
| 8 | Arriving | System | Rider within about 300 metres of the address (geofence) | "Arriving soon, have your code ready" | Yes |
| 9 | Delivered | Rider | Correct 4-digit code entered | "Delivered" | Yes |

The customer sees the full timeline from status 3 (acknowledged) onward, and the earlier statuses as confirmation.

### 4.2 Pickup order statuses

Placed, Confirmed, Acknowledged, Preparing, then **Ready for collection** (notification) and **Collected** (set by staff).

### 4.3 Exception statuses

| Status | When | Customer sees |
|---|---|---|
| Delayed | Order stuck in a stage too long, or traffic delay | "Running a little late" with the reason |
| Item unavailable | Staff cannot make an item | Message from the manager, with options |
| Cancelled | Cancelled by the customer (before the kitchen acknowledges), by a manager, or after a cancellation request approved by a dispatch officer or a manager | Reason and refund status |
| Delivery issue | Customer unreachable or code cannot be entered | "Your rider is trying to reach you" |
| Refund pending / completed | After a cancellation or issue | Refund status |

### 4.4 Delivery code

- A 4-digit code is generated when the order is placed and shown on the customer's tracking screen.
- The code is stored hashed, and wrong attempts are rate-limited.
- The rider enters the code to close the delivery. If the code cannot be used, the rider taps "Need help" and a dispatch officer or a manager can approve a manual completion, which is recorded in the audit log.
- **Built (15 November 2026):** the code is worked out from the order’s ID with a keyed hash (HMAC-SHA-256 with the API’s secret), so the tracking screen can show it whenever the customer opens it, and only a SHA-256 hash of it is stored on the order to check what the rider enters. A database copy alone doesn’t reveal any code.

### 4.5 Who did what

Every status change is recorded against the person who made it, using their staff ID.

| Step | Recorded against |
|---|---|
| Acknowledged | The kitchen staff member who acknowledged the ticket |
| Marked ready | The kitchen staff member who tapped "Ready" |
| Rider accepted | The rider who accepted it from the queue |
| Picked up | The rider who picked it up from the kitchen |
| Delivered | The rider, confirmed by the customer's 4-digit code |
| Walk-in order placed and paid | The kitchen staff member or manager who entered it |
| Walk-in ready and collected | The staff member who tapped each step |
| Assigned to a rider by dispatch | The dispatch officer or manager who assigned it (DSP-05) |
| Cancellation requests and manual completions | The dispatch officer or manager who decided them |
| Cancellations, refunds, and manual overrides | The manager (or, for walk-in cancellations before ready, the staff member) |
| Cash-up counted and signed off | The person on the counter who counted it, and the person who signed it off, whichever of them is signed in: an account officer or any manager, including the owner (ACC-04) |
| Month closed | The account officer or manager who closed it (ACC-07) |
| Rider payout marked as paid | The account officer or manager who marked it (ACC-02) |

**Shared kitchen tablet (decided).** Whoever is on shift, meaning signed in on the tablet, is recorded as the person acting. Staff sign in on the tablet with their own username and password at the start of their shift.
- The tablet's top bar always shows who is signed in, with their name and photo.
- A "Switch person" button hands over: the current person signs out and the next one signs in.
- Staff can also be signed in on their own phones at the same time, and actions there are recorded against that phone's owner.
- The tablet signs the person out automatically at 8:30 pm, the walk-in closing time, so a forgotten sign-out does not carry into the next day. It waits until every order placed before 8:30 pm is finished (collected, delivered, or cancelled), so nobody is signed out in the middle of an order, and managers can turn the automatic sign-out off in Settings (owner decisions, 14 November 2026). Someone who signs in after 8:30 pm isn’t signed out that evening.
- A manager can correct the person on an order record, for example after a missed handover. The correction is written to the audit log.
- Limitation: if several people work the line on one tablet, every action is recorded against the person signed in. Per-person kitchen reports (MGR-27) therefore show who was on shift, not necessarily who physically did each step.

### 4.6 Cancellation and refund rules (decided)

Payments are simulated, so refunds are simulated too. The statuses, rules, and records are real, and no money moves.

| Stage | Customer | Staff | Refund |
|---|---|---|---|
| Placed or confirmed (before the kitchen acknowledges) | Can cancel, after picking a reason and ticking a confirmation | A manager can cancel | Full, automatic |
| Acknowledged or preparing | Can request cancellation | A dispatch officer or a manager approves or declines (DSP-06) | Full if approved before it is ready |
| Ready, rider accepted, or picked up | Cannot cancel. Can contact the business. | A manager decides case by case | At the manager's discretion |
| An item cannot be made | Told, and offered a substitute or a refund | A manager removes the item or cancels the order | Partial or full |
| Delivery issue (customer unreachable) | Contacted by the rider | A manager decides after the rider's attempts | At the manager's discretion |

- Refund statuses are "Refund pending" and then "Refund completed" (simulated).
- **Full or partial (decided 15 November 2026):** whoever makes a refund (a manager, a dispatch officer or manager approving a request, kitchen staff cancelling a walk-in) chooses a full refund or types a partial amount, up to 99% of what the customer paid. A customer cancelling their own order before the kitchen acknowledges is always refunded in full.
- The delivery fee is refunded with the order if the order is cancelled before pickup.
- Every cancellation and refund records the reason, the staff member who decided it, and the time in the audit log.
- The customer’s app shows the cancel option only while cancelling is allowed, as a quiet text link rather than a button.
- **Friction (decided):** the customer must pick a reason and tick a confirmation before Cancel or Send request works.
- **Repeat cancellations (decided):** after a set number of cancellations in 7 days, the customer can only request a cancellation, and a dispatch officer or a manager decides. The app tells them why. The limit is 3 by default, and managers can set it anywhere from 3 to 7 in Settings (MGR-35). The 7-day window is fixed.
- Cancellation requests are stored as records (CancellationRequest, section 9) with the reason, status (pending, approved, or declined), the staff member who decided it (a dispatch officer or a manager), and the times.
- Walk-in orders can be cancelled by staff before they are ready, with a reason. The payment is refunded (simulated), and the cancellation is recorded against the staff member.

### 4.7 Delivery area and order acceptance rules

- **Delivery range (decided):** from Uselu on the city side to **Oluku Market** in the north, on the Benin–Lagos Road. CKE does not deliver beyond Oluku Market. Both sides of the expressway in Oluku are in range up to the market, and so are Uwelu, Isihor, Idunmwowina, Iguosa, and the villages of Oluku that lie before the market (`list-of-areas.md`).
- The range is defined by the **neighbourhood list** in Settings (MGR-11), where each area is flagged as in or out of range. The starting list is in `list-of-areas.md`.
- **The owner's pins (16 November 2026):** the kitchen pin and the 14-corner boundary (Uselu to Oluku, widened west for Uwelu) are in `packages/validation` and in the Setting row, so the API now refuses an address whose pin is outside it even in an area marked in range, and the customer app draws it. Evbogida was added to the neighbourhood list (`list-of-areas.md` 3a).
- When adding an address, the customer picks an in-range neighbourhood and drops a pin. The API checks the pin against a **delivery boundary polygon** stored in Settings, using a point-in-polygon test that is cheap enough for the Worker's CPU limit. The polygon is drawn once from map pins running from Uselu to Oluku Market. The neighbourhood list stays for labels and reports.
- An address outside the range cannot be used for delivery. The app says so and offers pickup.
- Pickup orders are not limited by the delivery range.
- **Opening hours (decided):** online orders and delivery run from **8:00 am to 6:00 pm**, and the last online order can be placed at 6:00 pm. Orders placed before then are still prepared and delivered afterwards. **Walk-in service runs until 8:30 pm** (4.8).
- After 6:00 pm, or while new orders are paused (MGR-10), customers can still browse the menu and see when online orders open again, but cannot check out.

### 4.8 Walk-in orders (counter)

Kitchen staff enter walk-in orders at the counter. They are kept separate from online orders in the data, so managers can view, filter, and sort them separately.

- **Who and when:** a signed-in kitchen staff member (or manager) enters the order, and the time it was placed is recorded. The person signed in is recorded as the one who accepted it, and as the one who handled each later step (4.5).
- **Channel:** every order has a channel, online or walk-in. Order numbers carry a prefix so they are never confused: O for online and W for walk-in.
- **Numbering:** online numbers run continuously (O-0001, O-0002, and so on). Walk-in numbers restart at W-001 each day, because they are called out at the counter. Every order also has a unique database ID, so a walk-in is identified by its date and number.
- **Order type:** eat in or take away.
- **Customer details:** none are collected. A walk-in order has no account, no address, and no delivery code. An optional name or label can be added so staff can call the order out.
- **Payment at the counter (simulated):** either **cash** or **online** (card or bank transfer) at the point of placing the order. For cash, the staff member records the amount received and the app shows the change due. For an online payment, a simulated confirmation is shown. No real money moves.
- **No delivery:** walk-in orders have no delivery fee, no rider, and no rider pay.
- **Statuses (decided):** Placed (paid), then Preparing, then Ready (the number is called out), then Collected. A walk-in sits in the board’s New column until someone taps it, like an online order (Acknowledged), matching the board’s “Tap to acknowledge” on walk-in tickets; the first tick then moves it to Preparing (built and confirmed by the owner, 15 November 2026).
- **Hours:** walk-in orders can be entered from 8:00 am until the walk-in closing time of 8:30 pm.
- **On the kitchen board:** walk-in tickets sit in the same columns as online orders, with a "Walk-in" badge. The board can be filtered to All, Online, or Walk-in.
- **In reports:** the dashboard, the order list, and the reports split by channel. Sales also split by payment method (cash, card, transfer). Customer reports cover online orders only, because walk-ins have no account.

---

## 5. FEATURES BY APPLICATION

### 5.1 Customer app

| ID | Feature | Notes | Status |
|---|---|---|---|
| CUS-01 | Browse the menu without an account | Menu is open to everyone | Planned |
| CUS-02 | Menu by category, with search | Rice meals first | Planned |
| CUS-03 | Item detail with defaults pre-selected | One tap adds the default | Planned |
| CUS-04 | Sticky order bar with running total | Always visible on menu screens | Planned |
| CUS-05 | Single-screen checkout | Delivery or pickup, address, the flat delivery fee (₦1,500 by default, none for pickup), and pay | Planned |
| CUS-06 | Sign-up at checkout | Continue with Google (the email comes from the Google account), then a delivery address and an optional gender | Planned |
| CUS-07 | Simulated payment | Card and bank transfer screens with a demo confirmation. No real money moves, and no real card details are collected or stored. A saved demo payment method keeps repeat payment to one tap. | Planned |
| CUS-08 | Order tracking timeline | Statuses in section 4, from acknowledged to delivered | Planned |
| CUS-09 | Rider location on a map | Shown after pickup, updated at a low frequency (section 7) | Planned |
| CUS-10 | Delivery code display | Shown on the tracking screen | Planned |
| CUS-11 | Push notifications | Per section 4 | Planned |
| CUS-12 | Reorder last order | Two taps to repeat | Planned |
| CUS-13 | Orders screen with two tabs | **In progress** for live orders and **Order history** for past orders, including cancelled ones. Any past order can be reordered. | **Decided** |
| CUS-14 | Address book | Label, neighbourhood, street or landmark, contact phone, map pin, default. No address search is required (section 14.3). | Planned |
| CUS-15 | Profile | Photo (upload, change, remove), name, email, gender | Planned |
| CUS-16 | Profile photo with crop and compression | See section 8 | Planned |
| CUS-17 | Account deletion (high friction) | In a red Danger zone at the bottom of Profile. The customer must tick a box and type DELETE ACCOUNT exactly before the button works. Deactivating is offered as the gentler choice. | **Decided** |
| CUS-18 | Rating after delivery | One tap | Planned |
| CUS-19 | Contact the restaurant | A button that opens the WhatsApp chat. The number comes from a manager setting (MGR-36), https://wa.me/2349095466063 by default. | **Decided** |
| CUS-20 | Order cancellation (with friction) | Rules in 4.6. The option is a quiet text link, shown only while cancelling is allowed. The customer must pick a reason and tick a confirmation before Cancel or Send request works. | **Decided** |
| CUS-21 | Demo payment notice | A small, clear label on payment screens ("Demo payment. No money is taken.") | Planned |
| CUS-22 | Sign-in | Continue with Google. No passwords (section 12.1). | **Decided** |
| CUS-23 | Delivery range check | An address outside the delivery range cannot be used for delivery. The app says so and offers pickup (4.7). | **Decided** |
| CUS-24 | Closed and paused states | After 6:00 pm, or while new orders are paused, the customer can browse and see when online orders open (8:00 am), but cannot check out (4.7) | Planned |
| CUS-25 | Deactivate account | Above the Danger zone in Profile, with one confirmation tick. Signs the customer out and keeps everything. Signing in again with Google offers to reactivate. | **Decided** |
| CUS-26 | More tab and text pages | A fourth tab, More, listing Terms and conditions, Privacy policy, About us, Support us, Partner with us, and FAQs. Each is a text page with a back button. A **Photo credits** page lists each menu photo’s author and licence, opening its source (12 November 2026). | **Decided** |
| CUS-27 | Customer ID | Every customer account has a unique ID (for example C-00418), shown in Profile and used in reports and the leaderboard | **Decided** |

### 5.2 Rider and Delivery app

| ID | Feature | Notes | Status |
|---|---|---|---|
| RID-01 | Sign in with a manager-created account | No public sign-up | Planned |
| RID-02 | Online and offline toggle | One tap. Going offline is blocked while the rider carries an order (**Decided**, 12 November 2026); Release order (RID-12) hands an order back first. | Planned |
| RID-03 | Order queue | Ready orders with order number, pickup point, drop-off neighbourhood, estimated distance, and the order's load against the rider's budget (for example "Load 5 of 9", section 6) | Planned |
| RID-04 | Accept order (first to accept wins) | Order disappears from other riders' queues | Planned |
| RID-05 | Capacity rules | One order by default, up to three if loads fit (section 6) | Planned |
| RID-06 | Active deliveries list | Stops in order, one primary action at a time | Planned |
| RID-07 | Pickup confirmation | Match order number, tap "Picked up" | Planned |
| RID-08 | Navigation to the customer | Opens the rider's installed navigation app (no map inside the rider app, section 7) | Planned |
| RID-09 | Call the customer | From the app, using the contact phone | Planned |
| RID-10 | Delivery code entry | Completes the delivery | Planned |
| RID-11 | Need help | Contacts dispatch, meaning a dispatch officer or a manager (unreachable customer, code problem). Handled under DSP-04. | Planned |
| RID-12 | Release order | Returns an order to the queue | Planned |
| RID-13 | Day summary | Completed deliveries for the day | Planned |
| RID-14 | Sound and vibration alerts | New orders in the queue, status changes. Vibration from the first build; the sound plays through push notifications, so it arrives with push (**Decided**, 12 November 2026). | Planned |
| RID-15 | Screen stays awake only on pickup and code entry | Short windows only, to save battery | Planned |
| RID-16 | Poor-network tolerance | Queue actions retried, last known state shown | Planned |
| RID-17 | Light location tracking | Only during an active delivery, low frequency, balanced accuracy (section 7) | Planned |
| RID-18 | Earnings | Today, this week, this month, and all time; an Owed list of everything not paid out yet (by day, with the total); today’s deliveries with each one’s pay; and the payout history (18.2) | **Decided** |
| RID-19 | Lean by design | No maps, images, or animation in the app; power rules in section 7 | Planned |
| RID-20 | Password handled by the manager | No forgot-password screen. The sign-in screen tells the rider to ask the manager, who resets the password. After a reset, the rider must set a new password at the next sign-in. | **Decided** |
| RID-21 | My profile | A read-only view of their own details and staff ID. No photo is shown, to keep the app image-free. | Planned |
| RID-22 | Settings | Theme (light, dark, or follow the phone), and sound and vibration | Planned |
| RID-23 | Order assigned by dispatch | When a dispatch officer assigns an order (DSP-05), it joins the rider’s deliveries with a strong alert and a yellow “Assigned to you by dispatch” banner. The rider can release it like any order (RID-12). | **Decided** |

### 5.3 Business and Kitchen app

One app for four staff roles: kitchen staff, dispatch officers, account officers, and managers. Each sees only its own menus (3.0). The tablet (counter) shows the full order board, and phones show alerts and quick actions.

**Kitchen**

| ID | Feature | Notes | Status |
|---|---|---|---|
| KIT-01 | Order board | New, Preparing, Ready columns on the tablet | Planned |
| KIT-02 | New order alert | Sound and visual alert. **Sound built 15 November 2026:** a pleasant double chime, made for CKE, once per new online order, on the Business app's own notification channel; turned on or off in Settings, Alerts (on by default). | Planned |
| KIT-03 | Acknowledge ticket | One tap; moves the order forward | Planned |
| KIT-04 | Item checklist by station | Rice, soups and swallows, snacks and drinks | Planned |
| KIT-05 | Mark ready | One tap; delivery orders enter the rider queue | Planned |
| KIT-06 | Handoff view | Shows which rider accepted, clears on pickup | Planned |
| KIT-07 | Pickup orders | "Ready for collection" and "Collected" | Planned |
| KIT-08 | Sold-out toggle | One tap from the board or menu list | Planned |
| KIT-09 | Item unavailable on an order | Flags the manager | Planned |
| KIT-10 | Packing guide | Shows the packaging rule for each item type | Later |
| KIT-11 | Staff attribution | Each action is recorded against whoever is signed in on the tablet or phone (4.5) | **Decided** |
| KIT-12 | On-shift sign-in on the tablet | Staff sign in with their own username and password, the top bar shows who is signed in, "Switch person" hands over, and the tablet signs out at 8:30 pm once every order placed before then is finished; managers can turn the automatic sign-out off (Settings, owner decisions, 14 November 2026) | **Decided** |
| KIT-13 | Walk-in order entry | Staff enter an order at the counter with big item tiles by category, choose eat in or take away, add an optional name, and see the order number to call out (4.8) | **Decided** |
| KIT-14 | Walk-in payment at the counter | Cash (amount received, change due; the amount is **Exact** or typed into an **Other amount** box, which can’t be less than the total) or online (card or transfer), all simulated, taken at the point of placing the order | **Decided** |
| KIT-15 | Walk-in tickets on the board | A "Walk-in" badge, eat in or take away shown, and the steps Preparing, Ready, and Collected | **Decided** |
| KIT-16 | Board filter | Filter the board to All, Online, or Walk-in | **Decided** |
| KIT-17 | Soup of the day | Kitchen staff pick today’s soup (for example egusi, efo riro, or ogbono) on the Sold out screen each morning, and managers (including the owner) can also pick it there or on the Menu screen. The change is written to the audit log. The customer app shows it straight away on the menu and the dish screen, and only today’s soup can be ordered. Managers also **add and remove soups in the rotation** on the Menu screen (owner decision, 12 November 2026). A removed soup is archived, not erased, because past orders point to it; adding the name again brings it back. Today’s soup can’t be removed, and at least one soup stays. Each change raises the catalog version, so the customer app picks it up (14.4). The soup dishes carry the soup: “Soup of the day: Egusi”, “Extra egusi”, and Home Plate’s description, and the soup and extra soup show **that soup’s own photo**, so the picture changes with the soup. Each line in an order keeps the soup it was ordered with. | **Decided** |

**Manager**

Account officers also use the reports (MGR-17 to MGR-23, MGR-27, and MGR-34, the customer leaderboard) and rider pay (MGR-30). Dispatch officers also use the order list and detail (MGR-13, MGR-24), alerts (MGR-14), manual completion (MGR-16), and the Settings sections in 3.0. Everything else here is for managers only.

| ID | Feature | Notes | Status |
|---|---|---|---|
| MGR-01 | Live dashboard | Today's orders and sales with the online and walk-in split, and orders in progress | Planned |
| MGR-02 | Rider overview | Who is online, who is delivering what. Built as the Riders screen (DSP-03). | Planned |
| MGR-03 | Create, edit, deactivate, and reactivate rider accounts | Username and password, plus the profile in 3.1 (name, role, job title, gender, phone, home address, photo). The manager enters everything and can edit it later. | **Decided** |
| MGR-04 | Create, edit, deactivate, and reactivate kitchen staff, dispatch officer, account officer, and manager accounts | The same profile fields. Kitchen staff, dispatch officers, and account officers use a username and password, and managers use Google. The owner account can’t be deactivated. | **Decided** |
| MGR-05 | Menu management | Add, edit, delete items | Planned |
| MGR-06 | Item images with compression | Take or choose a photo, crop it (4:3 for dishes and soups, square for staff), compress it on the tablet (8.1), and upload it with its **credit** in one call: “Our own photo” (credited to Casual Kitchen Express, with an optional photographer and link) or “From the internet” (who took it, the licence, and the link are needed; the licence link is optional). The same steps are used everywhere a photo is added: dishes (Menu and the item editor), soups (when added, or later), and staff (People). Staff photos skip the credit questions: they save as CKE’s own and show no credit anywhere (owner, 12 November 2026). **Replacing a photo deletes the old one**, its file and its record, so every app shows the new photo and the credits follow; removing works the same way. Built 12 November 2026. | **Decided** |
| MGR-07 | Prices and availability | Edit prices, mark sold out | Planned |
| MGR-08 | Categories and options | Proteins, sides, extras | Planned |
| MGR-09 | Opening hours | Online order hours (8:00 am to 6:00 pm) and walk-in hours (8:00 am to 8:30 pm), with overrides | **Decided** |
| MGR-10 | Pause new orders | One switch | Planned |
| MGR-11 | Delivery area settings | The neighbourhood list, with each area flagged in or out of range. The boundary is Oluku Market in the north and Uselu on the city side (4.7). | Planned |
| MGR-12 | Rider capacity settings | Load values and capacity budget (section 6) | Planned |
| MGR-13 | Order list and search | Today, yesterday, or **any date range back to the first order**. Search by order number or customer ID. Filter by channel (online or walk-in), status, staff member, and payment method. Sort by time placed or amount. Shows the count and total value, and loads long ranges in pages. | **Decided** |
| MGR-14 | Alerts | Order unaccepted by riders, order stuck, item unavailable, a rider’s help request, and a customer’s cancellation request (the Alert record in section 9). **Alert timers and beep (Decided, 15 November 2026):** dispatch officers and managers set, in Settings, Alerts, how many minutes an order can wait at each stage before an alert opens, each within a range: waiting for a rider 5 to 15 (usually 10), not acknowledged 1 to 5 (usually 5), too long in the kitchen 10 to 30 (usually 15), and too long on the road 10 to 45 (usually 30); whether the Business app beeps when one opens; and whether it chimes for a new online order (KIT-02). Both sounds are on by default. The usual times were 5 for a rider and 25 for the road until later on 15 November 2026, when the owner raised them after seeing how often they flagged the demo history. The section saves with one tap, confirms in a dialog, is audit-logged, and shows who changed it last and when. The beep plays once per alert on every device that shows Alerts (kitchen, dispatch, managers), as a local notification, so it sounds with the screen off. | Planned |
| MGR-15 | Cancellations and refunds | Rules in 4.6, with simulated refunds. Every refund (a manager’s refund, a dispatch officer’s or manager’s approval of a cancellation request, and kitchen staff cancelling a walk-in) needs an **“I’m sure I want to refund ₦… for …” tick** first, and is recorded with the **name, role, and staff ID** of the person signed in, and the time (shown on the order and in the audit trail). Owner decision, 12 November 2026. **Partial refunds (owner decision, 15 November 2026):** everyone who can make a refund can make it partial. The amount is typed into a field, never fixed, and can never be more than **99% of what the customer paid** (nor more than what is left after earlier refunds); a full refund is a separate one-tap choice. | **Decided** |
| MGR-16 | Manual completion approval | For delivery-code problems. Dispatch officers can approve too (DSP-04). | Planned |
| MGR-17 | Order volume reports | Orders by hour, day, week, and month; peak times; delivery and pickup split; online and walk-in split; completed and cancelled | Planned |
| MGR-18 | Sales reports | Total sales, average order value, payment method split (cash, card, transfer), online and walk-in split, refunds. Each split shows the amount first, then its share, for example “Card ₦735,730 (51%)”. | Planned |
| MGR-19 | Timing reports | Time the order was placed, time to acknowledge, preparation time, wait for a rider, delivery time, and total time; averages and slowest orders | Planned |
| MGR-20 | Rider and area reports | Separate tables. **Riders:** every rider is listed, even with no deliveries: deliveries, share of all deliveries, and average delivery time. **Areas:** every area (neighbourhood) is listed with its deliveries, share, and average delivery time. A total row ends each table. Every figure is worked out from the deliveries in the chosen date range and channel (walk-ins have no deliveries). The kitchen staff table (MGR-27) sits below them. Order value, delivery fees, and rider pay per rider stay in the CSV export. | **Decided** |
| MGR-21 | Menu reports | Top items, revenue by item and category, how often items sell out | Planned |
| MGR-22 | Customer reports | New and returning customers, order frequency (online orders only) | Planned |
| MGR-23 | Historic data | 7, 30, 60, or 90 days (90 added by the owner, 15 November 2026, to show the three months of history in one tap), or a **custom range** of dates; CSV export; order history is kept permanently | **Decided** |
| MGR-24 | Order-level detail | Full timeline of every order with each status timestamp | Planned |
| MGR-25 | Reset a rider or staff password | Shows a temporary password once. The person must change it at the next sign-in. | **Decided** |
| MGR-26 | Manager sign-in | Managers continue with Google, so there is no password to recover (section 12.1) | **Decided** |
| MGR-27 | Kitchen staff reports | Per staff member: orders handled (online and walk-in), order value handled, and average preparation time. Shows who was signed in (4.5). | Planned |
| MGR-28 | Demo controls | Create orders, auto-play a simulated kitchen and riders, and set the speed (18.4) | Planned |
| MGR-29 | Reset demo data | Wipes and regenerates the historic mock data (18.3), with confirmation | Planned |
| MGR-30 | Rider pay and payouts | Each rider's owed balance and per-delivery pay, mark a period as paid (simulated), and payout history. Account officers too (ACC-02). | Planned |
| MGR-31 | Pricing and pay settings | The delivery fee (₦1,500 by default) and the rider pay per delivery (₦1,000 by default) are both editable. Changes show in the customer app and rider app straight away, apply to new orders and deliveries only, and are written to the audit log. Rider pay can’t exceed the delivery fee. | **Decided** |
| MGR-32 | Rider tracking mode setting | Light (default) or milestones only (section 7) | **Decided** |
| MGR-33 | Channel filter and sort | The order list, dashboard, and reports can be filtered to online, walk-in, or all, and sorted by time placed, amount, staff member, or payment method | **Decided** |
| MGR-34 | Customer leaderboard | Customers ranked by customer ID for any report period, sortable by total spent or number of orders. Managers and account officers (account officers added by the owner on 12 November 2026), online orders only. | **Decided** |
| MGR-35 | Cancellation limit setting | The number of cancellations in 7 days after which a customer can only request a cancellation. 3 by default, adjustable from 3 to 7. Changes are written to the audit log. (4.6) | **Decided** |
| MGR-36 | Restaurant contact number | The WhatsApp number behind “Contact the restaurant” in the customer app (CUS-19). One editable number, managers only. The change shows straight away and is written to the audit log. | **Decided** |
| MGR-37 | Refunds report | A Refunds tab in Reports, with the same date range, channel filter, and CSV export as the other reports: count, total, and average; refunds by reason and by person; and every refund (order, amount, full or partial, reason, time, and who made it: name, role, staff ID), newest or largest first. Managers and account officers. Owner decision, 12 November 2026. | **Decided** |
| MGR-38 | View profile | On People, each person has View profile: everything from the editor (role, staff ID, status, job title, username or Google email, phone, gender, home address) and their photo, or their initials until a photo is added. The photo also shows in the top bar when they sign in. Owner decision, 12 November 2026. | **Decided** |
| MGR-39 | Tour guide | Managers only. **Start tour** in the Tour guide section of Demo controls (the only place it starts) walks the manager’s side rail from top to bottom in one straight tour of 14 steps. Each step opens that screen, dims the app, rings its menu item, and shows a card beside the rail: “Step 3 of 14”, a progress bar, the screen’s name, a short explanation of what it gets done, **Skip tour**, **Back**, and **Next** (**Finish** on the last step). The tablet’s back button goes back a step. Skip and Finish return to Demo controls. The tour only moves between screens and never changes data; it is never shown on its own at first launch. Owner decision, 15 November 2026. | **Decided** |

### 5.3.1 Dispatch officer (Business and Kitchen app)

Decided on 12 November 2026. Managers can do all of this too.

| ID | Feature | Notes | Status |
|---|---|---|---|
| DSP-01 | Dispatch officer role | Sees Alerts, Orders, Riders, and Settings (without Pricing and pay and Restaurant contact), as in 3.0 | **Decided** |
| DSP-02 | Customer contact on online orders | The order detail shows the customer’s name, customer ID, phone, and delivery address (label, neighbourhood, landmark), with **Call** and **WhatsApp** buttons. Walk-in orders show only the optional name. | **Decided** |
| DSP-03 | Live riders panel | Riders online now, what each is carrying, their load against the budget, and a Call rider button. It also covers the manager’s rider overview (MGR-02). | **Decided** |
| DSP-04 | Rider help requests | Takes riders’ “Need help” requests from Alerts, contacts the rider or customer, and approves a manual completion or keeps the order open (MGR-16) | **Decided** |
| DSP-05 | Assign an order to a rider | An order waiting for a rider can be assigned to a chosen online rider whose remaining capacity fits it (section 6). It goes straight into that rider’s deliveries (RID-23), and the assignment is recorded. | **Decided** |
| DSP-06 | Cancellation requests | Approves or declines customers’ cancellation requests. An approved request refunds under the rules in 4.6. Other refunds stay with managers. | **Decided** |

### 5.3.2 Account officer and Finance (Business and Kitchen app)

Decided on 12 November 2026. Managers can do all of this too. Reports are for running the business; Finance holds fixed monthly figures for record keeping and the accountant’s monthly report.

| ID | Feature | Notes | Status |
|---|---|---|---|
| ACC-01 | Account officer role | Sees Reports, Rider pay, and Finance, as in 3.0 | **Decided** |
| ACC-02 | Rider payouts | Marks a rider’s owed period as paid (simulated), like MGR-30. Each payout records who paid and when. | **Decided** |
| ACC-03 | Monthly statement | For any month: sales by channel (online, walk-in) and by payment method (cash, card, transfer), refunds, delivery fees collected, rider pay earned and paid, cash variances, and the net figure. Each line opens the orders behind it. | **Decided** |
| ACC-04 | Daily cash-up | At close, the person on the counter enters the cash counted in the drawer. The app shows the cash expected from that day’s walk-in cash payments, minus cash refunds, and the difference. The account officer (or a manager) reviews each day and signs it off, with a note for any difference. The sign-off records whichever of them is signed in: an account officer or any manager, including the owner, by name and staff ID, with the time; the cash-up shows it, and the audit trail lists it. | **Decided** |
| ACC-05 | Audit trail | Every money-related action in one list: refunds, payouts, price and pay changes, cash-ups and sign-offs, and month closes, with who, what, and when. Filter by date, person, and kind. | **Decided** |
| ACC-06 | Finance export | The monthly statement, the cash-ups, and the audit trail as CSV and PDF | **Decided** |
| ACC-07 | Close month | Locks a month’s figures once every day is signed off. After that, a correction is entered as an adjustment in the next open month, with a reason, so closed figures never change. The close records who closed the month (an account officer or a manager) and when, shown on the month. | **Decided** |

### 5.4 Website

A static website (plain HTML, CSS, and JavaScript, with no packages) on GitHub Pages. It promotes the business, but mainly the app.

| ID | Feature | Notes | Status |
|---|---|---|---|
| WEB-01 | Home page | Promotes the business, with the app as the main focus: tagline, app highlights, how ordering works, and a clear download button | **Built** (16 November 2026) |
| WEB-02 | About page | The business, its food, the delivery area (Uselu to Oluku Market), and the brand's values. Carries one small attribution line (section 17.4). | **Built** (16 November 2026) |
| WEB-03 | App page | More detail and the full feature list for the customer app, screenshots, install steps for Android, system requirement (Android 10 or newer), the latest version, and the download | **Built** (16 November 2026) |
| WEB-04 | FAQ page | Common questions, including the delivery area and fee, opening hours, how to install, and why the app is not on the Play Store | **Built** (16 November 2026) |
| WEB-05 | Footer contact links | LinkedIn (https://www.linkedin.com/in/armstrong-omoregie-02367a271/), Google (email: ammycan6@gmail.com), and WhatsApp (https://wa.me/2349095466063). There is no separate contact page. | **Decided** |
| WEB-06 | Footer developer credit | A link to the developer's site (https://bossstrong-dev.vercel.app/) and to GitHub (https://github.com/ARMSTRONG-AISOSA) | **Built** (16 November 2026) |
| WEB-07 | App download | Links to the latest release on GitHub Releases (https://github.com/ARMSTRONG-AISOSA/casual-kitchen-express/releases/latest), with a checksum and the install guide. When GitHub answers, the App page shows the latest version, size, and SHA-256 checksum and the button downloads the customer APK directly. | **Built** (16 November 2026) |
| WEB-08 | SEO and sharing previews | Titles, descriptions, and social previews for each page. Home also carries schema.org Restaurant details (17 November 2026), without the kitchen’s exact pin; the sitemap goes to Google Search Console and Bing Webmaster Tools once the site is online. | **Built** (16 November 2026) |
| WEB-09 | Ordering on the website | The site promotes only and does not take orders | **Decided** |
| WEB-10 | Privacy page | A short privacy policy linked from the footer. The app collects an email and a delivery address, and the Google sign-in setup asks for a privacy policy link. | **Built** (16 November 2026) |

**Built 16 November 2026:** the pages are in `apps/website/public` and `.github/workflows/website.yml` publishes them to https://armstrong-aisosa.github.io/casual-kitchen-express/ on every push to main that changes them (the owner sets Pages to GitHub Actions once). Playwright checks are in `apps/website/tests`.

**Hosting note:** GitHub Pages' terms say it is not to be used as free hosting to run an online business or a site mainly directed at commercial transactions, and the site should not be used for sensitive transactions. A promotional site is within those terms while CKE remains a concept project. If CKE became a real business, the site should move to another host. Free static hosts such as Cloudflare Pages are an option. The published site is limited to about 1 GB, with soft limits of about 100 GB of bandwidth a month and 10 builds an hour, far above what a small static site needs.

---

## 6. RIDER CAPACITY AND BATCHING

**Default:** a rider carries **one order at a time**.

**Batching:** a rider may carry **up to three orders** when the orders are small enough. Capacity depends on the volume of each order, not just the count.

- Every menu item has a **load value** set by the manager. Snacks and drinks are light, rice meals are heavier, and soups with swallows are heaviest because of their containers.
- An order's load is the sum of its item loads.
- A rider has a **capacity budget** set by the manager. A rider may accept another order only if the combined load fits the budget and the rider has fewer than three active orders.
- The queue shows a rider only the orders that fit their remaining capacity.
- **Load display (decided):** an order's load is shown as a number against the rider's budget, for example "Load 5 of 9". Orders are not labelled light, medium, or heavy; those labels belong to menu items only.
- Stops are shown in the system's suggested order, nearest first, and the rider can change it.
- Each customer's tracking screen shows their position in the rider's route when the rider has several stops (for example, "Your order is stop 2 of 3").

**Decided starting values:** each item has one of three load levels: light (snacks and drinks) is 1, medium (rice meals, proteins, and sides) is 2, and heavy (soup with swallow) is 3. The default capacity budget is **9 points** (owner decision, 15 November 2026; it was 6, which rarely fitted two typical orders of 4 to 5 points), and a rider never carries more than three orders. The load levels stay the same. Batched drop-offs must be within about 1.5 km of each other (adjustable in Settings). These values are tuned from real deliveries.

---

## 7. RIDER POWER AND LOCATION

**Goal:** the rider's phone must not run hot or drain quickly. The rider app is kept lean and compute-light by design.

### 7.1 Decisions and rules

| # | Rule | Detail | Status |
|---|---|---|---|
| 1 | No map inside the rider app | The "Navigate" button opens the rider's installed navigation app (for example Google Maps, Waze, or Apple Maps) with the customer's address. No map library is loaded in the rider app. | Decided direction |
| 2 | Queue distance is computed on the server | The estimated distance from the kitchen to the drop-off is calculated by the backend, so the rider's phone needs no location for the queue. | Planned |
| 3 | Location only during an active delivery | No location tracking while offline, idle, or waiting in the queue. | Planned |
| 4 | Balanced accuracy | Not high-accuracy GPS. Balanced accuracy is enough for a customer map and an arrival alert. | **Decided** |
| 5 | Low update frequency | A position update about every 45 seconds, and only after the rider has moved more than about 100 metres. Slower when stationary. | **Decided** |
| 6 | Small, batched updates | Compact payloads, sent only when the position has changed enough. Each update is a request, so this also protects the daily request limit (14.2). | Planned |
| 7 | Arrival detection by geofence | An operating-system geofence around the customer's address triggers "Arriving soon" at about 300 metres, instead of tracking continuously at high accuracy. | **Decided** |
| 8 | Connection only when needed | A live connection only while the app is in the foreground and the rider is online. When the app is in the background, queue alerts arrive as push notifications. No polling loops. | Planned |
| 9 | Plain screens | No images, no animation, no auto-refresh timers, and virtualised lists. | Planned |
| 10 | Screen awake only briefly | Kept awake only on the pickup and code-entry screens. Otherwise the normal screen timeout applies. | Planned |
| 11 | Light theme by default, dark theme optional | Light and high-contrast for sunlight. A dark theme can be chosen in Settings (light, dark, or follow the phone). | **Decided** |
| 12 | Tracking mode setting | A manager setting: **Light** (default, as above) or **Milestones only** (no continuous location, and the customer sees status steps and an arrival alert). When the battery is low or battery saver is on, updates slow down or pause. | **Decided** |

### 7.2 Why there is no map in the rider app

Rendering a map, keeping GPS at high accuracy, and animating a marker are among the most battery-hungry things a phone does. Riders already use a navigation app, so the CKE app hands the address over and focuses on the delivery task. The customer's map is drawn on the customer's phone from the rider's low-frequency position updates.

### 7.3 Background location

When the rider switches to the navigation app, the CKE app moves to the background. Light tracking during that time needs background location permission and, on Android, a visible "Delivery in progress" notification while it runs. It stops when the delivery ends. Expo's background location needs a development build rather than Expo Go. On Expo's free plan, cloud builds are limited (14.2), and local builds are unlimited. These details are to be verified against the Expo documentation when building.

### 7.4 Customer map

The customer app draws the map. The rider's marker moves at the same low cadence, without smooth animation. The map is drawn with MapLibre and OpenFreeMap tiles (14.3).

### 7.5 Battery and heat acceptance (decided target)

Test on a mid-range Android phone through a two-hour delivery shift. The target is no more than about 10% of the battery an hour during an active delivery, with the phone staying comfortably cool. The result is checked before release.

---

## 8. MENU AND IMAGE HANDLING

### 8.1 Compression before upload

Images are compressed **on the device before they leave the app**, so uploads are small and storage stays low. This applies to dish and soup photos and staff photos (the Business app, MGR-06; built 12 November 2026) and to customers’ profile photos (CUS-16, built 14 November 2026 in the customer app with the same steps and the profile values). Dishes and soups use the menu values below, and staff and customer photos use the profile values.

| Step | Detail (decided starting values) |
|---|---|
| 1. Pick | Camera or gallery |
| 2. Crop | Fixed ratio per use (menu card, profile square) |
| 3. Resize | Longest edge capped at 1200 px for menu images and 512 px for profile photos |
| 4. Convert | Modern format such as WebP, with a fallback if unsupported |
| 5. Compress | Quality about 78, with a target of 250 KB or less for menu images and 80 KB or less for profile photos |
| 6. Strip metadata | Remove location and camera data |
| 7. Show result | Preview with the new file size and the space saved |
| 8. Upload | Only the compressed file is sent |

The backend **re-validates** every upload (type, size, dimensions) and can create smaller thumbnails for lists, so the app never trusts the client alone.

### 8.1.1 Starting photos (12 November 2026)

All 23 starting menu photos are in. 19 were sourced from Wikimedia Commons and Flickr (through Openverse) under licences that allow commercial use and changes; 4 (the Office Lunch Combo, Yoghurt drink, Moi moi, and Home Plate) were made by the owner with Google Gemini under the brand document’s AI fallback rules, and are credited “Casual Kitchen Express (made with Gemini)”. All were processed to the values above (4:3, at most 1200 px, WebP quality 78, all under 250 KB). The 10 starting staff photos were also made with Gemini; they are square, under 80 KB, and carry no credit (owner decision). Records: `docs/photo-credits.md` and `apps/api/seed-media/menu/credits.json`; staff files in `apps/api/seed-media/staff/`. The seed script (`npm run db:seed-media --workspace @cke/api`) puts them in R2 and links them to the menu items, the three soups, and the staff. MediaAsset rows keep each photo’s source kind, title, author, licence, and source, and `GET /media/credits` lists the credits of the menu and soup photos in use for the customer app’s Photo credits page. The starting photos are **not flagged as demo**: they carry on to the release (owner decision, 12 November 2026).

### 8.2 Where images are stored

**Decided:** image files are kept in **object storage**, and only their links (paths or URLs) are stored in the database. Large binary files inside a database make it slower and more expensive to store and back up, so the database holds just the references, along with each image's size and dimensions.

### 8.3 Replacing and deleting

- Replacing an image uploads a new compressed file and then removes the old file and its record, unless something else still uses it (built 12 November 2026, MGR-06). Every app then shows the new photo, and the customer app’s Photo credits follow.
- Deleting a menu item asks for confirmation, and its images are cleaned up. Items that appear in past orders are archived rather than erased, so order history stays accurate.

---

## 9. DATA MODEL DRAFT

Entities and key fields, as a starting point for the Drizzle schema. Better Auth's own tables (users, sessions, and accounts) belong to the same schema and are not repeated here.

**Demo data:** every seeded record is flagged as demo so it can be wiped and regenerated (18.3). The exception is the starting photos (8.1.1), which ship with the release; the photo seed resets and relinks them itself.

**Order list at any range:** the API returns orders for any date range, filtered and sorted on the server and paged with a cursor, so a long range never loads all at once. Orders are indexed by placed time, channel, status, staff, and customer.

**Historic data:** orders, payments, status events, and deliveries are kept permanently so managers can look at any past period. Every status change is stored with its time, which makes the timing reports (preparation time, wait for a rider, delivery time) possible. Menu items that appear in past orders are archived, never erased.

**Built so far (12 November 2026):** the schema is in `apps/api/src/db/schema.ts`, with migrations in `apps/api/drizzle/`. Details added while building it:
- **Change numbers:** orders, alerts, and rider states carry a `version` from one shared counter (`change_seq`). Every change takes the next number, so a reconnecting app asks only for rows above the last number it saw (14.4, decision 4).
- **Catalog version:** the Setting row has a `catalog version` that goes up whenever the menu or a customer-facing setting changes. `GET /bootstrap` returns it as an ETag (14.4, decision 1).
- **Soups:** a SoupVariety list (egusi, efo riro, ogbono to start) holds the soups the soup of the day is picked from. Managers add and remove soups; removing sets it inactive. Menu items flagged as soup take today’s soup, and each order stores the soup it got.
- **Hours overrides:** an HoursOverride row per date (closed, or different hours) covers MGR-09’s overrides.
- **Accounts:** Better Auth’s user, session, account, and verification tables, with its username and admin plugin fields, written by hand from Better Auth 1.7’s schema. Sign-in works on them (username and Google, tested 14 November 2026; 16.1 item 1). The admin plugin’s columns are in the table, but the plugin isn’t used: the People routes create and change staff accounts themselves.
- **Not yet:** the ReportView summaries come with the reports (build step 9).

**API routes so far** (`apps/api/README.md` has the commands): `GET /health`; `GET /bootstrap` (menu, soups, areas, and customer-facing settings, with an ETag and 304s); `POST /soups` and `DELETE /soups/:id` (managers); `PUT /settings/soup-of-the-day` (kitchen staff and managers); `GET /media/:id` (an image from R2, cached for a year because an ID never changes what it points to, 8.3); `GET /media/credits` (the credits of the menu and soup photos in use, so a replaced or removed photo drops out); `PUT /photos/:kind/:id` and `DELETE /photos/:kind/:id` (add, replace, or remove a dish, soup, or staff photo with its credit; the API checks it is WebP within the size and dimension limits, and deletes the old photo); `GET /staff/photos` (staff photos, signed-in staff only). **Sign-in (built 14 November 2026):** Better Auth at `/api/auth/*` (username sign-in for staff; Google for customers and managers through the browser-based flow, on once `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set, with the redirect address `<API address>/api/auth/callback/google`; a manager added by Google email is linked at their first Google sign-in), `GET /me` (the signed-in person: role, staff code or customer ID, photo, their own job title, phone, home address, gender, and Google email, and whether they must change their password; a customer’s CustomerProfile row, with the next customer ID from C-00001, is made at their first visit), `PATCH /me` (a customer’s name and gender), `PUT /me/photo` and `DELETE /me/photo` (a customer’s own profile photo: WebP, up to 512 px and 80 KB, replacing deletes the old one; served only to that customer and to managers and dispatch officers), `POST /me/password`, and the managers’ People routes: `GET /people` (with each person’s username or Google email; the placeholder address of username staff is never shown), `POST /people` (a temporary password shown once), `PATCH /people/:code`, `POST /people/:code/reset-password`, `/deactivate`, and `/reactivate`. Every change route checks the role (3.0) on the route itself, not through wildcard middleware; staff who must change a temporary password can do only that; a deactivated person is signed out straight away; staff photo files (`GET /media/:id`) need a staff session, while menu and soup photos stay public. Sign-in is rate-limited to 5 tries a minute per address through a Durable Object (`AuthRateLimiter`). The temporary `ALLOW_UNSIGNED_WRITES` guard is gone. The demo staff are in the database (`npm run db:seed-people`) with the demo password `cke-demo-2026`; managers get usernames (`owner.m`, `ivie.m`) only on the laptop with `SEED_MANAGER_PASSWORDS=1` (the API tests sign in as the owner), because on a deployed database they sign in with Google only. The owner’s account comes from `OWNER_GOOGLE_EMAIL` and `OWNER_NAME` (3); a configured owner keeps their own name, details, and photo when the seeds are run again. The soup rotation is the first feature the apps read from the API; both apps fall back to their demo data when no API address is set.

**Orders, part 1 (built 15 November 2026, build step 4c):**
- **Menu management:** `GET /menu` (kitchen staff and managers: every item with its station, archived ones too), `POST /menu/items`, `PATCH /menu/items/:id` (sending `options` replaces the item’s choices; the first is the default when none is marked; price changes are audit-logged), `DELETE /menu/items/:id` (archives), `PUT /menu/items/:id/availability` (sold out or back on: kitchen staff and managers, KIT-08), `POST /menu/categories`, `PATCH /menu/categories/:id`. Every change raises the catalog version (14.4, decision 1).
- **Checkout:** `POST /me/orders` prices the order on the server from the current menu (never from the app), checks today’s online hours (with overrides), the pause, and the delivery address (the customer’s own, an in-range area, and inside the boundary polygon once it is drawn, 16.1 item 12), stores the delivery fee, takes the demo payment, and confirms the order straight away (Placed by the customer, Confirmed by the system). Items with choices take the default when none is sent (CUS-03); a soup dish takes today’s soup and its name. A sold-out or archived item is refused. An address outside the range answers `outsideRange: true` so the app can offer pickup (CUS-23).
- **Customer’s orders:** `GET /me/orders?tab=progress|history` (history 30 at a time, older pages with `before`), `GET /me/orders/:id` (tracking, with the delivery code while a delivery is on its way and `canCancel` before the kitchen acknowledges). No staff names or codes are shown to customers.
- **Walk-ins:** `POST /orders/walk-in` (kitchen staff and managers, within the walk-in hours): eat in or take away, an optional name, cash (the amount received can’t be less than the total; the change due is stored) or card or transfer.
- **Kitchen steps:** `POST /orders/:id/acknowledge`, `PUT /orders/:id/items/:itemId` (tick or untick a line; the first tick moves the order to Preparing), `POST /orders/:id/ready` (Ready for a delivery, Ready for collection otherwise), `POST /orders/:id/collected`. Each is recorded against the person signed in (4.5), and the status check is part of the update, so two taps at once can’t both succeed.
- **Lists:** `GET /orders/board` (every order still in the kitchen, with its lines, and the latest change number), `GET /orders` (dispatch, accounts, managers: any date range, channel, statuses, payment method, staff member, order number or customer ID, sorted by time or amount, 150 at a time with a cursor, with the count and total value), `GET /orders/:id` (the full order with its timeline, payment, and customer card). The customer’s phone and address are shown only to dispatch officers and managers.
- **Reconnecting:** `GET /changes?since=N` returns only the orders changed since change number N (a customer only their own) and the number to send next time, or `reload: true` when more than 300 changed (14.4, decision 4).
- Order numbers: O- numbers continue from the highest online number, and W- numbers start at W-001 each day (4.8); two orders at the same moment can’t share a number (the unique index refuses one, and it takes the next).

**Orders, parts 2 to 5 (built 15 November 2026, build step 4c finished):**
- **Cancelling and refunds (4.6, MGR-15, DSP-06, KIT-09):** `POST /me/orders/:id/cancel` (before the kitchen acknowledges, with a reason and the tick; refunded in full, delivery fee included; after the cancellation limit in 7 days it answers `mustRequest: true`), `POST /me/orders/:id/cancellation-request` (acknowledged or preparing; one pending at a time; opens an alert), `POST /cancellation-requests/:id/approve` (dispatch and managers, with the tick; refunded in full if the food isn’t ready, otherwise refused so a manager decides) and `/decline`, `POST /orders/:id/cancel` (managers at any stage: everything back before pickup, a chosen amount after; kitchen staff only walk-ins before Ready), `POST /orders/:id/refunds` (managers: full or partial, never more than what’s left), `POST /orders/:id/item-unavailable` (kitchen staff and managers: marks the order and opens an alert; a refund settles it). Every refund is chosen as `refund: { kind: "full" }` or `{ kind: "partial", amount }` (typed; at most 99% of what was paid, owner decision 15 November 2026; `none` only for a manager cancelling after pickup), needs `confirm: true` (the “I’m sure…” tick), is recorded with the name, role, and staff ID of the person signed in, sets the payment to refunded once fully refunded, and goes in the money audit trail. Customers see refund status and their request’s state, never staff names.
- **Rating (CUS-18):** `POST /me/orders/:id/rating`, once, after delivery or collection.
- **Riders (section 6, RID-02 to RID-13, RID-18, RID-23, DSP-03 to DSP-05, MGR-16):** `PUT /rider/online` (offline is refused while carrying), `GET /rider/queue` (only orders that fit: fewer than three orders, the load within the budget, and every drop-off within the batch distance; plus how many don’t fit; distances worked out on the server, 7.1 rule 2), `POST /rider/queue/:orderId/accept` (the order row is locked first, so when two riders accept at once one wins and the other is told it’s gone), `GET /rider/deliveries` (stops in order with the customer’s first name, phone, address, items, load, and the “assigned by dispatch” flag), `PUT /rider/deliveries/order`, `POST /rider/deliveries/:orderId/picked-up`, `/arriving`, `/deliver` (the 4-digit code; 5 wrong tries, then Need help), `/help` (opens an alert and marks a delivery issue), `/release` (before pickup, back to the queue), and `GET /rider/earnings` (today, this week, this month, all time, owed by day, today’s deliveries, payouts). Rider pay is stored on the delivery when it is delivered (18.2). Dispatch and managers: `GET /riders` (the live riders panel), `POST /orders/:id/assign` (to an online rider it fits), `POST /help-requests/:id/resolve` (manual completion, audit-logged, or keep open).
- **Alerts (MGR-14):** `GET /alerts` (kitchen staff, dispatch, managers) and `POST /alerts/:id/clear` (dispatch and managers; requests clear only by deciding them). A timed check, every minute while orders are open, opens “waiting for a rider” alerts when a delivery has been Ready with no rider for longer than the time in Settings, Alerts (usually 10 minutes), and “stuck” alerts when an order hasn’t been acknowledged since it was placed (usually 5), has been in the kitchen since it was acknowledged (usually 15), or has been on the road since pickup (usually 30), and marks those orders Delayed (“Running a little late”, 4.3). An alert opens within a minute of its time running out. Each stage alerts at most once per order, so clearing one by hand sticks (before 15 November 2026 the next check opened it again). Waiting alerts clear on their own once a rider has the order, and stuck ones once the order is finished. New timer alerts go out over the live connection with a beep flag when the beep is on.
- **Settings (MGR-09 to MGR-12, MGR-31, MGR-32, MGR-35, MGR-36):** `GET /settings` and `PATCH /settings` (dispatch and managers; the delivery fee, rider pay, and the WhatsApp number are managers only; rider pay can’t exceed the fee), `PUT /settings/areas/:id` (in or out of range), and `PUT`/`DELETE /settings/hours-overrides/:day`. Each change is audit-logged (price and pay as money) and raises the catalog version. `PUT /settings/alerts` (dispatch and managers) saves the whole Alerts section at once: the beep, the new-order chime, and the four times, each checked against its range (also enforced by the database). A save that changes something is audit-logged in words with the before and after (for example “Changed the alert settings: turned the beep off, waiting for a rider from 5 to 10 minutes”), records who saved it and when (shown in `GET /settings` as `alerts.updatedBy` and `updatedAt`), and tells every open Settings screen over the live connection. It doesn’t raise the catalog version, because customers never see it.
- **Address book (CUS-14):** `GET`, `POST`, `PATCH`, and `DELETE /me/addresses`: a Nigerian phone number, the area, the pin, and the default (the first address is the default; removing the default makes the next one the default). An address outside the range is refused with `outsideRange: true` (CUS-23). Removed addresses are archived, because past orders point to them.
- **The kitchen’s map pin** for queue distances is an approximate point in Ugbowo until the owner drops the real one with the delivery boundary (16.1 item 12).

| Entity | Key fields |
|---|---|
| User | id, email, password or sign-in method, role, status, created at |
| CustomerProfile | user id, customer code (unique, for example C-00418), name, gender (optional), photo, default address id, account status (active, deactivated, or deleted), recent cancellation count |
| Address | id, user id, label, street, area or landmark, neighbourhood, contact phone, coordinates, is default |
| StaffProfile | user id, staff code (unique, never reused), full name, username, role (rider, kitchen staff, dispatch officer, account officer, manager), job title, gender (optional), phone, home address (optional), photo (link), status (active or deactivated), created by, created at |
| RiderState | user id, status (online or offline), capacity budget override |
| MenuCategory | id, name, sort order |
| MenuItem | id, category id, name, description, price, image id, available, station, load value, archived |
| ItemOption | id, item id, name, price change, is default |
| Order | id, number (O- or W- prefix), channel (online or walk-in), customer id (empty for walk-ins), type (delivery or pickup for online orders, eat in or take away for walk-ins), status, food total, delivery fee, total, payment method, address, neighbourhood, delivery code hash, entered by (walk-ins), optional label, placed at, acknowledged at, ready at, picked up at, delivered at, collected at |
| OrderItem | id, order id, item id, name and price at time of order, quantity, options, notes |
| OrderStatusEvent | id, order id, status, actor (a staff ID, a customer ID, or the system), time |
| Payment | id, order id, method (card, transfer, or cash, all simulated), demo reference, amount, cash received and change due (cash only), taken by (walk-ins), status. No card numbers are stored. |
| Delivery | id, order id, rider id, batch group, stop number, assigned by (a dispatch officer or manager, empty when the rider accepted from the queue), picked up at, delivered at, distance, rider pay |
| Payout | id, rider id, period start and end, amount, status (owed or paid, simulated), paid at, paid by |
| Refund | id, order id, amount, kind (full or partial), reason, status (pending or completed, simulated), requested by, decided by, times |
| Rating | id, order id, customer id, stars, time |
| Neighbourhood | id, name, in delivery range (yes or no), sort order |
| DeviceToken | id, user id, platform, token |
| Notification | id, user id, type, content, sent at |
| MediaAsset | id, owner, storage path, size, dimensions, format, source kind (business or internet), title, author, licence, licence link, source link |
| Setting | online order hours, walk-in hours, tablet sign-out time, pause flag, delivery boundary, capacity defaults, batch drop-off distance (about 1.5 km by default), rider tracking mode, delivery fee (₦1,500 by default), rider pay per delivery (₦1,000 by default), cancellation limit (3 in 7 days by default, adjustable from 3 to 7), restaurant WhatsApp number (MGR-36), alert settings (the beep and the new-order chime on or off, and the minutes before each alert timer opens one, each kept within its range by the database; and when and by whom they were last saved, MGR-14), soup of the day (KIT-17), the tablet’s automatic sign-out at 8:30 pm (on or off, KIT-12). Price, limit, and contact changes are written to the audit log. |
| CashUp | id, business date, cash expected, cash counted, difference, counted by, counted at, signed off by, signed off at, note |
| MonthClose | id, month, closed by, closed at, snapshot of the statement totals |
| Adjustment | id, month it applies to, amount, reason, related order or cash-up, entered by, time |
| CancellationRequest (planned) | id, order id, customer id, reason, status (pending, approved, or declined), decided by, requested at, decided at |
| HelpRequest (planned) | id, order id, rider id, reason (customer unreachable, code doesn’t work, or other), status (open or resolved), resolution (manual completion or kept open), resolved by, times |
| Alert (planned) | id, kind (order waiting for a rider, order stuck, item unavailable, cancellation request, rider needs help), order id, related request id, created at, cleared by, cleared at |
| AuditLog | id, actor, action, kind (money, account, setting, contact, or other), target, before and after values, time |
| ReportView | Pre-computed summaries (daily and hourly totals, timings, per rider, per item, and monthly finance totals) so reports and Finance stay fast and historic data stays queryable |

---

## 10. REAL-TIME AND NOTIFICATIONS

**Real-time needs**
- New order to the kitchen board.
- Status changes to the customer's tracking screen.
- New ready orders appear in rider queues, and accepted orders disappear from other riders' queues immediately.
- Rider location to the customer while delivering, at the low frequency set in section 7.
- Alerts (an order waiting for a rider, a rider’s help request, a cancellation request) to dispatch officers and managers, and an assigned order to its rider (RID-23).
- Setting changes that customers see straight away: prices, the restaurant’s WhatsApp number, and the soup of the day.

**Race handling:** two riders tapping "Accept" at the same time must result in one winner, enforced by the backend.

**Built (15 November 2026):** one Durable Object, `LiveHub`, holds every app’s WebSocket (`GET /live`, signed in like any other route). Each connection is tagged with what that person may see: their role, `user:<id>`, and `customer:<id>` or `rider:<id>`. After each change the API sends the changed record itself, so apps watching a screen make no calls (14.4): staff get the order in the board’s shape (no customer phone or address), the customer gets only their own order, online riders get queue cards appearing and disappearing, the carrying rider gets their delivery (including an order assigned by dispatch, RID-23), dispatch and managers get alerts and the riders panel, and everyone gets a “catalog” nudge when the menu or a customer-facing setting changes. Every message carries the record’s change number, so an app that reconnects calls `GET /changes?since=N` once. Apps send nothing but a ping, answered without waking the object. A deactivated person’s connection is closed (3.1). The timed alert check runs from the same object’s alarm, once a minute and only while orders are in progress, so a quiet restaurant never wakes the database (Neon’s free hours, 14.2). Push notifications come with the apps in step 6.

**Push notifications:** sent for the statuses marked in section 4, to the customer, and for queue alerts, to riders. Push is the only channel. Email and SMS are not used.

---

## 11. INTEGRATIONS

| Need | Notes | Status |
|---|---|---|
| Payments | Simulated. No provider integration and no real money. The flow, screens, statuses, and refunds are demonstrated with a fake confirmation. | **Decided** |
| Customer map | The customer's tracking map and address pin. Rider navigation uses the rider's installed navigation app. MapLibre with OpenFreeMap tiles (14.3). | **Decided** |
| Push notifications | Mobile push for all three apps, through Expo's push service with Firebase for Android | Planned |
| Email | Not needed: Google sign-in and manager-reset passwords mean no emails are sent. SMS is not planned. | **Decided** |
| Analytics and error reporting | Kept minimal: the API's own Cloudflare Workers Logs (free plan: 200,000 events a day, 3 days of history) | **Decided** |

---

## 12. SECURITY AND PRIVACY

- Role-based access enforced in the custom API. Because access is not handled by database-level row rules, every endpoint checks the caller's role and ownership of the data.
- Customers and managers sign in with Google. Every other staff account is created by a manager and uses a username and password (12.1).
- Delivery codes are hashed and rate-limited.
- Manual overrides, account changes, money actions, and customer contact taps are written to an audit log. A closed month can’t be edited (ACC-07).
- Personal data collected: for customers, email, address, optional gender, name, and photo; for staff, name, phone, optional gender and home address, and photo. Each item has a stated purpose, in line with Nigeria's data protection rules, and customers can deactivate or delete their account in the app.
- Rider location is collected only while a rider is online with an active delivery.
- All traffic is encrypted, and secrets are never stored in the apps.
- Payments are simulated, so no real card or bank details are ever collected, even for the demo flow.
- Seeded customers and staff are fake, with emails on a reserved example domain, so nothing can ever be sent to a real person.
- Staff personal details (phone, home address, gender) are visible only to managers and the person themself. Staff photos are access-controlled and never public (3.1).

### 12.1 Sign-in and password recovery (decided)

**Do we need a "forgot password" feature?** No. Customers and managers use Google sign-in, which has no password, and riders and the other staff roles have passwords that a manager resets.

| Account | Created by | Sign-in | Forgot-password feature? | Recovery |
|---|---|---|---|---|
| Customer | Self, at checkout | Continue with Google. No password. | No | Nothing to recover |
| Manager | The owner or another manager | Continue with Google. No password. | No | Nothing to recover |
| Rider | A manager, who also enters the profile (3.1) | Username and a password set by the manager | No self-service | The manager resets it, and a temporary password is shown once |
| Kitchen staff | A manager | Same as riders | No self-service | Same as riders |
| Dispatch officer | A manager | Same as riders | No self-service | Same as riders |
| Account officer | A manager | Same as riders | No self-service | Same as riders |

**Why:** a forgot-password flow needs email sending, and so does an email one-time-code sign-in. Free email services typically require a verified sending domain to reach other people. Resend's free plan, for example, allows 3,000 emails a month, 100 a day, and one verified domain, and a domain usually costs a small yearly fee (not verified here). Google sign-in needs no email sending, no domain, and no password, and it is one tap on Android.

**Trade-offs of Google sign-in:** customers need a Google account, which almost all Android users have.

**Google setup notes** (checked 10 November 2026; confirm in Google's console when building)
- A free Google Cloud project holds the sign-in configuration.
- **As built (14 November 2026), with the browser-based flow (12.2, Route A):** the app opens Google's page in the phone's browser, Google returns to the API at `<API address>/api/auth/callback/google`, and the API starts its own session and hands it back to the app through the app's link scheme. This needs one **Web application** client (client ID and secret, kept as Worker secrets), with that redirect address listed: `http://localhost:8787/...` for the laptop (Google accepts plain `http` only for localhost, so the tablet reaches the laptop through `adb reverse`) and `https://cke-api.casualkitchenexpress.workers.dev/...` once deployed. No Android client and no SHA-1 fingerprints are needed; those apply only to native sign-in (Route B), which isn't used.
- Google client secrets are shown only once, when created; afterwards the console shows the last four characters. A lost secret is replaced by adding a new one.
- With only the basic scopes (openid, email, profile), any Google account can sign in, even while the consent screen is in testing mode (Google's Audience help, re-checked 14 November 2026: basic-scope requests are the exception to the test-user list). Adding test users does no harm. Publishing it ("In production") makes it available to everyone and does not require Google's verification review for these basic scopes.
- The consent screen asks for an app name, a support email, and the homepage and privacy policy links. The website's pages cover the links.
- The compatibility check is done (12.2).

**Alternatives**
- **Email one-time code** (no password, so still no forgot-password): needs email sending and a verified domain.
- **Email and password**: needs a forgot-password flow, email sending, and a verified domain.

**Rules for password-based accounts (riders and staff)**
- A manager-created account must change its password at the first sign-in.
- Passwords are stored hashed with PBKDF2 using the Workers' native crypto, at an iteration count measured to fit the CPU limit (12.2), and repeated wrong attempts are rate-limited.
- A signed-in person can change their own password from Profile.
- Sessions last a long time (refresh tokens), so riders and customers rarely sign in again.

### 12.2 Auth compatibility check (10 November 2026)

**Result: Google sign-in is compatible with the whole stack. Password sign-in works, but only with weaker hashing than the usual recommendation.**

| Item | Finding |
|---|---|
| Better Auth on Workers with Hono | Works. It needs the `nodejs_compat` flag, the auth instance is created for each request, and database access goes through Hyperdrive. A community Cloudflare package and open-source projects use Hono, Durable Objects, Neon through Hyperdrive, and Better Auth with Google together. |
| Drizzle with Better Auth | Supported through its Drizzle adapter, so one schema can hold both the auth tables and the app tables |
| Better Auth with Expo | An official Expo plugin exists, and version 1.7.14’s requirements are met by Expo SDK 58’s modules (checked 11 November 2026). It uses the new React Native architecture. It needs `expo-secure-store`, `expo-network`, `expo-linking`, `expo-web-browser`, and `expo-constants`. Sessions are cached in secure storage, and it works with a separate backend such as our Worker. |
| Google sign-in from the app | Route A (simplest): Better Auth's built-in browser-based Google flow, with no extra native library. Route B: sign in natively and send the Google ID token to the API, which Better Auth accepts. Route B needs a native Google sign-in library, such as the free "original" version of the widely used React Native Google Sign-In library (it uses an older Android stack) or the paid Universal version. Both routes need a development build, not Expo Go. |
| Outside the Play Store | The Android sign-in client needs the package name and the SHA-1 fingerprint of our own release signing key. It works without the Play Store. Debug and release builds have separate fingerprints. |
| Consent screen | With only the basic scopes, any Google account can sign in, and publishing needs no Google verification review |
| Password sign-in (riders and staff) | **The risk.** Workers Free allows about 10 ms of CPU per request. Common password hashes (bcrypt, scrypt) take about 70 ms or more and fail. The workable option is PBKDF2 through the native Web Crypto API. The Workers runtime refuses more than 100,000 iterations, whatever the plan. Measurements from open-source projects: about 13 ms at 100,000 iterations and about 6 ms at 50,000. **Measured on CKE’s own Cloudflare account (14 November 2026, PBKDF2-SHA-256, 8 requests each, CPU time from Workers tail):** 20,000 iterations median 4 ms (worst 7), 30,000 median 5 ms (worst 14), 40,000 median 7.5 ms (worst 15), 50,000 median 9.5 ms (worst 14). 100,000 reached 34 ms. No request failed, even over 10 ms, so the free plan tolerates short bursts, but 50,000 sits at the limit before the rest of the sign-in request is counted. The usual OWASP recommendation of 600,000 cannot run on Workers. |
| Not verified | Better Auth's username plugin, its admin features for creating users, and its custom password-hash setting. To confirm when building. |

**Decided: riders and kitchen staff keep username and password** (and so do dispatch officers and account officers, decided 12 November 2026). Hash with native PBKDF2 (SHA-256) at **30,000 iterations** (owner decision, 14 November 2026, after the measurements above: about 5 ms, leaving room under the 10 ms limit for the rest of the sign-in request; the plan had been about 50,000, which measured 9.5 ms), and rate-limit logins with a Durable Object. This is weaker than the usual recommendation, which is acceptable because these accounts guard only simulated data, and the trade-off is stated here. The alternative is Google sign-in for staff as well, which removes passwords completely.

---

## 13. NON-FUNCTIONAL REQUIREMENTS

- **Network:** designed for unstable mobile networks, with retries, cached menus, and small payloads. The rider app shows the last known state when offline.
- **Performance (decided targets):** the first screen is usable within about 3 seconds on a mid-range Android phone over a typical mobile connection, taps give visible feedback within about 100 ms, and actions that go to the server complete within about 1 second. These are checked at build (16.1).
- **Rider battery and heat:** see section 7.
- **Request limits and reconnection:** see 14.2.
- **Devices:** Android 10 and above first (phones, and a tablet for the kitchen), iOS later, and modern browsers for the website.
- **Accessibility:** contrast, tap-target, and text-size rules are in `design.md`.
- **Locale:** English, Naira (₦) formatting, West Africa Time.
- **Android version:** Android 10 and above (section 17.1).
- **Reliability:** order and payment data must never be lost, and order states change only through the backend.

### 13.1 Memory and CPU checks (decided)

**Rule (owner, 15 November 2026, changed the same day):** Claude checks the apps’ memory use and looks for memory leaks **only when the owner asks, or after asking the owner and getting a yes**. Never on its own. At the moments below, Claude offers a check and waits for the answer. Added after the Business app slowed the tablet down because every screen visited stayed open (15 November 2026; the fix and figures are in `progress.md`).

**When to offer a check (asking first):**
- After each build step that adds or changes screens, lists, images, live data (WebSockets), timers, or navigation.
- Before committing a change to navigation, live updates, or anything with a timer or subscription.
- When the owner says an app feels slow.
- Before each release build, on the release build itself (development builds use far more memory and some CPU).

**How (on the tablet, with `adb`):**
1. Start the app fresh and note its memory (`adb shell dumpsys meminfo <package>`, TOTAL PSS) and the tablet’s free memory (`MemAvailable` in `/proc/meminfo`).
2. Repeat the app’s main flows several times (for example the managers’ tour, opening and closing orders, tracking and back, the rider’s Queue and My deliveries).
3. Measure again after each round. The first round may grow while screens and photos load for the first time; later rounds should level off (a rough guide: under about 15 MB per round once warm). Memory that climbs by about the same amount every round is a leak.
4. Count the back presses needed to leave the app: it should be the screens actually open, not every screen visited.
5. Check the processor at rest (`adb shell top -p <pid>`): an idle release build should be near 0%. Anything that keeps working while nothing changes on screen (a timer, polling, an animation) is a fault.
6. Read the code for the usual causes: navigation that stacks main screens (main screens and tabs must clear the screens on top first), timers or listeners without clean-up, long lists drawn in full, and full-size images in small places.

**Results:** each check is written in the progress log with the figures, and anything found is fixed or recorded as an open item.

**Ways to keep memory and CPU low (Proposals, 15 November 2026, for the owner to choose):**

| # | Proposal | Why |
|---|---|---|
| 1 | **Virtualised lists:** draw long lists (Orders up to 150 rows, People, Menu, Order history, the rider’s Earnings, report tables) with React Native’s built-in `FlatList`, which only draws the rows on screen. No new package. | Today every list is drawn in full inside a ScrollView, so a long list keeps every row and photo in memory. |
| 2 | **Small photo versions:** keep a second, small copy of each photo (about 160 px) for lists and thumbnails, and load the 512 px copy only on a detail screen. Made on the phone at upload, like the current compression. | A 512 px photo shown in a small circle (about 88 pixels on this tablet) uses about 30 times the memory it needs. |
| 3 | **Image cache limits:** `expo-image` with a disk cache for photos and a capped memory cache, cleared when Android reports low memory. | Photos stay fast without filling memory. |
| 4 | **Fewer redraws:** split the Business app’s single app-wide state so a change (a new order, the clock) redraws only the screens that use it, and memoise ticket and order cards. | Every change currently redraws the whole open screen and the side rail, which costs CPU on busy days. |
| 5 | **Pause in the background:** close the live connection and stop timers when an app goes to the background (Android `AppState`), and catch up with one “what changed” call when it returns (14.4, choice 4). | No CPU, data, or battery use while nobody is looking. |
| 6 | **No polling, ever:** live data only through the WebSocket (10), and Durable Objects hibernate when idle. | Polling is the main cause of idle CPU and of request counts (14.2). |
| 7 | **Only today in memory:** keep today’s live orders in memory and fetch past days per view, letting them go when the screen closes (TanStack Query `gcTime`). | Memory stays flat however long the history grows. |
| 8 | **Hidden tabs frozen:** turn on `freezeOnBlur` for tabs, so a tab not on screen doesn’t redraw. | Live updates don’t redraw screens nobody can see. |
| 9 | **Release build settings:** Hermes (the default), R8 code shrinking, and resource shrinking for release APKs, still arm64-v8a only (17.2). | Smaller app, less memory, faster start. |
| 10 | **Light animations:** native-driver animations only, and none that loop forever. | A looping animation keeps the CPU busy on every screen. |

---

## 14. DECISIONS AND OPEN ITEMS

| Decision | Options | Leaning | Status |
|---|---|---|---|
| Database and backend | Neon (Postgres) with a custom backend | Chosen over Supabase and Firebase (comparison in 14.1) | **Decided** |
| Image storage | Object storage with links in the database | Image files are kept in object storage and only their links are stored in the database | **Decided** |
| Backend language and framework | TypeScript with Hono, running on Cloudflare Workers | Shares types and validation with the Expo apps. Replaces the earlier Fastify choice, which suited a Node server but not Workers. | **Decided** |
| API style | REST, with GraphQL added only if a screen needs it | REST first | **Decided** |
| Database access | Drizzle | Type-safe queries and migrations, with Neon through Hyperdrive | **Decided** |
| Database connection from Workers | Hyperdrive with node-postgres (`pg`); Hyperdrive with postgres.js; Neon serverless driver over HTTP | Hyperdrive with `pg`, which Neon and Cloudflare both recommend and which is included in the free plan | **Decided** |
| Authentication | Better Auth run inside the Worker | With its Expo plugin and Drizzle adapter. Neon's managed version is not used, so there is one API (12.2). | **Decided** |
| Staff password hashing | PBKDF2 at about 50,000 iterations with rate limiting; Google sign-in for staff too | PBKDF2 with rate limiting, at 30,000 iterations, measured on CKE’s account (12.2) | **Decided** (30,000 iterations, owner, 14 November 2026, after measuring) |
| Real-time | Durable Objects (WebSockets with hibernation) | Verified available on the free plan, SQLite-backed (14.2) | **Decided** |
| Background jobs | Cron Triggers for scheduled work; Durable Object alarms for per-order timers (the alert check runs from the live hub’s alarm, only while orders are open, built 15 November 2026); Queues only if needed | Cron Triggers are free (5 per account). Alarms on the free plan are to be verified. | **Decided** (direction) |
| Image file storage provider | Cloudflare R2 | Free tier covers 10 GB, with no charge for downloads | **Decided** |
| Mobile apps | React Native with Expo | All three apps are built with React Native and Expo | **Decided** |
| App structure | Three separate Expo apps in one repository, with shared packages | Different users and store listings, shared code | **Decided** |
| Platform focus | Android first | Free throughout. iOS device builds and remote push need a paid Apple membership (14.2), so iOS comes later. | **Decided** |
| API hosting | Cloudflare Workers (free plan) | No wake-up delay. Keeps compute and image storage with one vendor. Limits in 14.2. | **Decided** |
| Payments | Simulated, with no real provider | No real money moves | **Decided** |
| Rider navigation | Hand off to the installed navigation app; in-app map | Hand off, no map in the rider app | **Decided** (direction) |
| Customer map provider | MapLibre with OpenFreeMap tiles | No account, card, or key. Comparison kept in 14.3. | **Decided** |
| Rider tracking mode | Light tracking with a battery-aware fallback | Light by default, with a manager setting for milestones only. When the phone's battery is low or battery saver is on, updates slow down or pause. | **Decided** |
| Customer and manager sign-in | Google sign-in | No passwords, no email sending, no domain, and no forgot-password feature (12.1) | **Decided** |
| Website | Plain HTML, CSS, and JavaScript on GitHub Pages | Plain and fast, with no packages. Promotes the business and mainly the app. | **Decided** |
| Versions | Floating latest; locked | Locked to the versions in section 15 | **Decided** |
| Package manager and monorepo | pnpm and Turborepo; npm workspaces and Turborepo | npm workspaces (npm comes with Node.js 24) and Turborepo 2. Changed from pnpm on 11 November 2026: nothing extra to install, and none of pnpm’s React Native workarounds. | **Decided** |
| Mobile styling | React Native styles with tokens; a UI kit | React Native styles with the shared brand tokens | **Decided** |
| Server data in the apps | Plain fetch; TanStack Query | TanStack Query, for caching, retries, and resync after reconnecting | **Decided** |
| Report charts | Victory Native; Gifted Charts | Gifted Charts | **Decided** |
| App distribution | Directly from the website and GitHub Releases; the Play Store | No Play Store listing for now (17.2) | **Decided** |
| Staff app distribution | Listed publicly with the customer app; GitHub Releases only | GitHub Releases only, not promoted on the public pages | **Decided** |
| Minimum Android version | Android 10 (API level 29) and above | Android 10 and above | **Decided** |
| Licence | MIT for all code | MIT | **Decided** |
| Attribution | Claude Code credit in a few places | Small, in very few places (17.4) | **Decided** |
| Website ordering | Promote only | The site does not take orders | **Decided** |
| Order cancellation and refunds | Rules by status | The simulated rules in 4.6 | **Decided** |
| Rider pay tracking in the app | Include; leave out | Included, with simulated payouts (18.2) | **Decided** |
| Delivery fee | Flat per order; distance-based | Flat, ₦1,500 by default and editable by managers, with no fee for pickup | **Decided** |
| Price changes | Fixed prices; editable by managers | Editable in Settings, shown in the customer and rider apps straight away, for new orders and deliveries only | **Decided** |
| Cancellation friction | One tap; reason and confirmation | A reason and a confirmation tick, with a limit after 3 cancellations in 7 days (managers can set 3 to 7) | **Decided** |
| Customer account removal | Delete only; deactivate and delete | Deactivate (reversible) and delete (Danger zone, tick, and typed DELETE ACCOUNT) | **Decided** |
| Customer IDs and leaderboard | No ranking; manager leaderboard; public leaderboard | Unique customer IDs and a leaderboard by spend or orders for managers and account officers (MGR-34) | **Decided** |
| Report periods | Fixed periods only; fixed and custom | 7, 30, 60, and 90 days, plus a custom date range (90 added 15 November 2026) | **Decided** |
| Owner protection | Any manager can be deactivated; owner protected | The owner account can’t be deactivated | **Decided** |
| Rider pay per delivery | A fixed amount set by the manager; the full delivery fee; a percentage | A fixed amount set by the manager, default ₦1,000 | **Decided** |
| Simulation | Everything simulated (payments, refunds, delivery, payouts); real services | Everything simulated (18.1) | **Decided** |
| Historic mock data | About two months seeded at build time; none | **Three months** (90 days ending yesterday), regenerated on demand (18.3). Changed from two months by the owner on 15 November 2026: this is the data the app is deployed and pitched with. | **Decided** |
| Optional dark theme | Light only; optional dark theme | Optional dark theme in all apps, chosen in Settings (light by default) | **Decided** |
| Staff profiles and IDs | Manager-entered profiles with unique staff IDs; basic accounts only | Manager-entered profiles with unique staff IDs (3.1) | **Decided** |
| Shared kitchen tablet attribution | Whoever is signed in on the tablet | Staff sign in on the tablet at the start of their shift (4.5) | **Decided** |
| Delivery range | From Uselu to Oluku Market | No deliveries beyond Oluku Market (4.7) | **Decided** |
| Delivery boundary check | A boundary polygon plus the neighbourhood list; the neighbourhood list only | A boundary polygon in Settings with a point-in-polygon check on the pin (4.7) | **Decided** |
| Batched deliveries: stop order | The system suggests the order; the rider chooses | The system suggests, nearest first, and the rider can change it | **Decided** |
| Batched deliveries: area | Anywhere in range; the same or adjacent neighbourhoods; drop-offs within a set distance | Drop-offs within about 1.5 km of each other, adjustable in Settings | **Decided** |
| Load values and capacity budget | A simple three-level load per item type; fine-grained values | Light 1, medium 2, heavy 3, with a budget of 9 (6 until 15 November 2026) and at most three orders (section 6) | **Decided** |
| Walk-in orders | Entered in the kitchen app; left out of the system | Entered in the kitchen app and recorded as a separate channel (4.8) | **Decided** |
| Walk-in payments | Cash; online (card or transfer) | Both, taken at the counter when the order is placed, and simulated | **Decided** |
| Opening hours | One set of hours; separate online and walk-in hours | Online orders and delivery 8:00 am to 6:00 pm. Walk-in service until 8:30 pm. | **Decided** |
| Image compression values | Tune at build; set now | 1200 px and 250 KB for menu images, 512 px and 80 KB for profiles, quality about 78 | **Decided** |
| Battery target | Set after testing; set now | No more than about 10% an hour during an active delivery (7.5) | **Decided** |
| Tracking values | Tune at build; set now | Balanced accuracy, about every 45 seconds and 100 metres, and a geofence of about 300 metres | **Decided** |
| Staff code format | Role prefix with a number; random IDs only | R-001, K-001, D-001, A-001, and M-001 style codes alongside the unique ID | **Decided** |
| Development database | Local Postgres in Docker; Neon from the start | Postgres 17.10 in Docker on the development laptop (the version Neon uses), Neon when the API is deployed. Cloudflare account soon for the 16.1 checks, Neon account at deploy. Owner decisions, 12 November 2026. | **Decided** |
| Staff roles | Kitchen staff and managers only; separate dispatch and account roles | Four staff roles in the Business and Kitchen app: kitchen staff, dispatch officer, account officer, and manager, each with its own menus (3.0). Owner decision, 12 November 2026. | **Decided** |
| Finance records | Reports and rider pay only; a Finance menu | A Finance menu with the monthly statement, daily cash-up, audit trail, exports, and close month (5.3.2). Owner decision, 12 November 2026. | **Decided** |
| Soup of the day | Customer picks any soup; one soup a day set by a manager | One soup a day, set by kitchen staff on Sold out or by a manager on Sold out or Menu (KIT-17). Owner decisions, 12 November 2026. | **Decided** |
| Report comparison | In the first release; later | Later (14.0). Owner decision, 12 November 2026. | **Decided** |

### 14.0 Possible future updates

Ideas kept for later. They are not built and not planned for the first release.

| Idea | Notes |
|---|---|
| Compare with the previous period | In reports, show the previous period of the same length beside the current one. Taken out of the first release on 12 November 2026 (owner decision). |

### 14.1 Database decision

**Decided:** Neon (Postgres) with a custom backend.

**What this means**
- Neon is only the database. The API, authentication, real-time updates, background jobs, and file storage are built or chosen separately, and the decisions above cover each one.
- Access control lives in the custom API, not in database rules.
- Postgres keeps the manager reports straightforward: grouping, joins, and date ranges are native SQL.
- On Neon's free plan, the database scales to zero after about five minutes without activity, so the first request after an idle period is slower by a fraction of a second. This suits a portfolio, and the app can warm the database when it opens.
- Neon's free plan has no long backup window, so database migrations and demo-data scripts should be kept as code that can be re-run.
- Free-tier figures change often and should be checked on Neon's pricing page before building.
- Neon also sells other backend products (Functions, Object Storage, Managed Better Auth). Only Postgres is used for now, and 14.2 explains why the others are not.

**Options compared** (figures checked in November 2026)

| | Supabase (Postgres) | Firebase (Firestore) | Neon (Postgres) plus a custom backend |
|---|---|---|---|
| Data model | Relational (SQL) | Document (NoSQL) | Relational (SQL) |
| Historic reports | Strong: SQL grouping, joins, date ranges | Weaker: aggregations and joins are limited and cost per read | Strong |
| Real-time | Built in | Built in | Build it yourself |
| Auth | Built in | Built in | Build it yourself |
| File storage | Built in (object storage) | Cloud Storage now needs a billing account (Blaze plan) since 3 February 2026 | Separate service needed |
| Roles and access | Row-level security in the database | Security rules | Custom code |
| Free tier highlights | 500 MB database, 1 GB file storage, 200 concurrent real-time connections, 2 million real-time messages, 2 projects | 1 GiB Firestore storage, 50,000 reads and 20,000 writes per day | Free plan with scale to zero after 5 minutes idle (about 0.5 to 1 GB storage depending on the source) |
| Main catch | Free projects pause after about a week of inactivity; no automatic backups on Free | Reads and writes are billed per operation; storage needs billing | You build and host the backend, auth, real-time, and storage yourself |

### 14.2 Hosting decision and consequences

**Decided:** the API is written in TypeScript with Hono and runs on **Cloudflare Workers** (free plan). The account’s workers.dev subdomain is **`casualkitchenexpress`** (owner, 14 November 2026), so a Worker named `cke-api` is served at `https://cke-api.casualkitchenexpress.workers.dev`. This was reconfirmed on 10 November 2026 after Neon's own Functions were considered. Real-time runs on Durable Objects. Neon holds the data and Cloudflare R2 holds the images. Nothing needs a separate host.

#### Where everything lives, and what is free

Checked against Cloudflare, Neon, and Expo pages on 10 November 2026. Daily Cloudflare limits reset at 00:00 UTC, which is 01:00 in Nigeria. Allowances change often and should be rechecked before building.

| Part | Lives in | Free allowance |
|---|---|---|
| API | Cloudflare Workers | 100,000 requests a day, 10 ms of CPU per request, 50 subrequests per request |
| Real-time | Cloudflare Durable Objects (SQLite-backed, the only kind on the free plan) | 100,000 requests a day, 13,000 GB-seconds a day, 5 million rows read and 100,000 rows written a day, 5 GB storage. WebSocket messages count toward requests at a 20-to-1 ratio. |
| Database connection | Cloudflare Hyperdrive | 100,000 queries a day |
| Database | Neon Postgres | 100 CU-hours a month per project, 1 GB storage per project, 5 GB transfer a month per project, 6-hour restore window, sleeps after 5 minutes idle |
| Image files | Cloudflare R2 | 10 GB storage, 1 million writes and 10 million reads a month, no charge for downloads |
| Scheduled jobs | Cloudflare Cron Triggers | 5 triggers per account |
| Authentication | Better Auth, run inside the Worker | No extra service or cost |
| Push notifications | Expo's push service, with Firebase for Android | No charge. iOS remote push needs a paid Apple membership. |
| App builds | Expo EAS free plan | 15 Android and 15 iOS builds a month in a slower queue. Local builds are unlimited. |
| Apple devices | Apple Developer Program | $99 a year, needed for iOS device builds in the cloud and for remote push |

**Neon storage note:** Neon's plans page says 1 GB per project (updated 4 November 2026), while some older pages still say 0.5 GB. Plan for 0.5 GB to be safe.

#### Daily request budget (rough estimate for a busy demo day)

| Item | Estimate | Limit |
|---|---|---|
| API requests (about 200 orders, about 40 requests per order, plus browsing) | About 10,000 | 100,000 |
| Database queries (about 3 per request) | About 30,000 | 100,000 |
| Rider location updates (4 riders, one about every 45 seconds, 8 hours) | About 2,600 messages, or about 130 requests at 20 to 1 | 100,000 |

Walk-in orders add about a third more orders, but they use few requests because they come only from the kitchen app and involve no tracking. A demo with far fewer orders uses a small fraction of this. The tightest limit is database queries, so queries per request should be kept low.

#### Limits to design around

- 10 ms of CPU per request: time waiting on the database does not count, but heavy computation does.
- A Workers runtime rather than full Node.js, so libraries must be Workers-compatible.
- Neon's free database sleeps after about 5 minutes idle, so the first query after a quiet period is slower by a fraction of a second. If a free allowance runs out, compute is suspended until the next month.
- Free-plan limits reject further requests once reached, until the daily reset.

#### Design responses

1. **Keep handlers light.** Reports and aggregations run as SQL inside Neon, not as code in the Worker.
2. **No server-side image processing.** Images are compressed on the device (section 8).
3. **Protect the request budget.** Riders' location updates are batched and low-frequency (section 7). Apps use push notifications and live connections instead of polling, and the daily request and query counts are monitored.
4. **Real-time through Durable Objects.** WebSocket connections for the kitchen board, rider queue, and customer tracking are handled by Durable Objects with hibernation, so idle connections cost little.
5. **Never lose an order.** Orders are saved to the database first and pushed to the kitchen second. A new order also sends a push notification to the kitchen devices, so the kitchen is alerted even if its live connection dropped.
6. **Reconnect and resync.** Connections reconnect automatically with growing delays, and the app fetches anything it missed afterwards.
7. **Safe retries.** Actions that fail on a poor network (acknowledge, ready, accept, delivered) are retried, and each action is written so a repeat has no extra effect.
8. **Warm the database.** Each app makes a light call when it opens so Neon wakes before the user needs it.
9. **Connect through Hyperdrive.** Drizzle uses the node-postgres driver (`pg`) through Hyperdrive. Hyperdrive caches query results by default, so caching is turned off for live order data. A second, cached Hyperdrive configuration may serve the manager reports.
10. **Local development.** Hono runs on Node and with Cloudflare's local tooling, so the API can be built and tested on a laptop first.
11. **Upgrade path.** The paid Workers plan ($5 per month) raises the limits without a redesign.

#### Why not Neon Functions

Neon now also offers Functions (serverless Node.js compute), Object Storage, and a managed Better Auth, so the API could be hosted at Neon instead. They are not used for these reasons:
- Real-time is already decided on Durable Objects.
- The free Functions allowance (10 active and 400 waiting Capacity-Hours and 1 million invocations per project a month) is hard to size for long-lived WebSocket connections.
- Functions run in a few regions (two in the US, Frankfurt, and Singapore), while Workers run at Cloudflare's edge.
- Neon's 5 GB transfer allowance is shared across its products, while R2 has no download charges.
- Because Hono also runs on Node, the API could move to Neon Functions later if Workers limits get in the way.

### 14.3 Customer map provider

**Status:** decided on 10 November 2026: MapLibre with OpenFreeMap tiles. The comparison below is kept as a record. OpenFreeMap is a free public service with no uptime guarantee, so its current usage terms should be checked before a public demo.

**What the customer map needs:** show the kitchen, the customer's address, and the rider's marker, and let the customer drop a pin when adding an address. It does not need turn-by-turn navigation. The rider app has no map at all.

| | Google Maps SDK | Mapbox | MapLibre with OpenFreeMap |
|---|---|---|---|
| Map display on mobile | Free and unlimited | Free up to 25,000 monthly active users | Free |
| Address search | Geocoding and autocomplete: 10,000 free calls each per month, then paid | Temporary geocoding: 100,000 free a month. Storing results needs paid permanent geocoding with no free tier. | Not included. Separate services such as Photon or Nominatim have fair-use limits. |
| Account and card | Google Cloud project and API key. A billing account is likely required, to confirm. | Card required from the start, and no spending cap | None. No account or key. |
| Expo support | react-native-maps or expo-maps. Android needs the API key. | @rnmapbox/maps, needs a development build | @maplibre/maplibre-react-native, needs a development build (not Expo Go) |
| Look and place data | Most familiar to users, with the richest place data | Highly customisable | Open street data, plain style, weaker place search |
| Main risk | Card on file and per-feature limits | Charges with no cap if a key leaks | Free public tile service with no guaranteed uptime |

**Decision:** MapLibre with OpenFreeMap tiles.
- It needs no account, card, or key, so a public demo cannot generate a bill.
- It does what the map needs, which is display three markers and a pin drop.
- It needs a development build, which the rider app already requires for background location.
- Google remains the choice if familiar maps and place search matter more than cost and simplicity.

**Address entry without search:** because deliveries stay within Uselu to Oluku Market, the customer picks a neighbourhood from the delivery range, drops a pin, and adds a landmark. This avoids address search and geocoding costs and suits places where street addresses are unreliable. It works with any provider.

### 14.4 Fewer calls and fresh data (decided)

**Status:** the four choices below are **Decided** (owner, 12 November 2026). The owner asked for ways to reduce the number of calls the API gets, especially for fetching app data and keeping it fresh, given that some data goes stale sooner than other data. Choice 1 is built: `GET /bootstrap` returns the catalog version as an ETag and answers 304 when nothing changed.

**Decided (12 November 2026)**
1. **Settings and menu: version plus a live nudge.** One start-up call loads the menu, prices, delivery fee, rider pay, WhatsApp number, and soup of the day with a version number. The app fetches them again only when the live connection or a push says the version changed.
2. **Past data: kept, only today refreshed.** Past days (reports, statements, order history) are stored on the device and the server and never fetched twice. Only today’s figures are refreshed.
3. **Reports: chosen per report by size.** Small sets (such as the deliveries behind the rider and area tables) are fetched once for the range and worked out in the app, so switching channel or table needs no new call. Large sets are summed in the database, and only the totals are sent.
4. **Reconnect: only what changed.** The app remembers the last update it saw and asks for the changes since then, in one small call.

The table and rules below are the detail behind these choices.

From the most stable data to the most live:

| Data | How often it really changes | Ideas to keep calls low |
|---|---|---|
| Past days (reports, statements, closed months, order history) | Never, once the day is over; a closed month is locked (ACC-07) | Cache for good on the device and on the server. Only today’s figures are ever re-fetched. Pre-computed summaries (ReportView) mean one small call per report view. |
| Menu, prices, delivery fee, rider pay, WhatsApp number, soup of the day | A few times a day at most | One “bootstrap” call when an app opens returns all of it with a version number. After that, the app re-fetches only when the live channel or a push says the version changed. HTTP ETags let an unchanged reply come back as a tiny “not modified”. |
| Staff list, riders’ profiles, areas | Rarely | Same as settings: a version number, re-fetched only on change. |
| Today’s orders on the board, the rider queue, tracking | Every few seconds at busy times | The live connection (Durable Objects, 10) pushes each change; the app never polls. On reconnect, one call fetches only what changed since the last version seen. |
| Rider location | About every 45 seconds while delivering | Already batched and low-frequency (7.1). |
| Reports for a chosen range | Only today’s part changes | The app can fetch the range’s records once (for example the deliveries behind the rider and area tables, about 2,000 small rows for 60 days) and work out the tables itself, so switching channel or table makes no new call. Or SQL does the sums and returns only the totals. Choose per report at build time, by payload size. |

**General rules**
- Each data type gets its own freshness time in TanStack Query (`staleTime`), so stable data isn’t re-fetched just because a screen opens again.
- Re-fetch on reconnect and when the app comes back to the foreground, not on a timer.
- One call per screen where possible: endpoints return what a screen needs together (for example an order with its customer card and timeline).
- Writes return the updated record, so the app doesn’t need a follow-up read.
- Count requests and queries per day in Workers Logs against the budget in 14.2.

**Applied to orders (built 15 November 2026):** menu, soup, photo, area, hours, and settings changes raise the catalog version and send a “catalog” nudge over the live connection, so apps fetch `/bootstrap` again (usually a 304) only then. Live orders, the rider queue, deliveries, alerts, and the riders panel arrive over the live connection as the changed records themselves, so watching costs no calls; messages sent from the Durable Object are free. Reconnecting is one call to `GET /changes?since=N` (a rider gets their queue and deliveries in the same call). Every write returns the updated order, screens load with one call each, order lists are paged 150 at a time, and a customer’s history 30 at a time. The timed alert check makes no database calls while no orders are open.

---

## 15. LOCKED VERSIONS AND TOOLING

**Locked on 11 November 2026** from the npm registry and official release information.

**How the versions were chosen**
- **Stable releases only:** no beta, release-candidate, canary, or nightly versions.
- **At least two weeks old:** each package is the newest stable release published on or before **28 October 2026**. Brand-new releases can carry malicious code before anyone notices, so the two-week gap is a supply-chain precaution.
- **Expo pins the mobile stack:** for Expo-managed packages, the version is the one Expo SDK 58 pins, so install them with `npx expo install` rather than by hand.
- **Exact versions in practice:** write exact versions (no `^`) for direct dependencies, and commit `package-lock.json`. Expo packages are also pinned exactly to the versions in 15.2: `npx expo install` reads Expo’s live compatibility list and picks newer patches than the lock (seen on 11 November 2026), and a `~` range would let npm pull in releases newer than the cutoff. After `npx expo install`, set the version back to the one in 15.2.
- **Install scripts:** npm 11 blocks package install scripts unless allowed. Only `esbuild` and `workerd` (needed by Wrangler, Vitest, and Drizzle Kit) are allowed, pinned to exact versions in the root `allowScripts`.
- **Security check (11 November 2026):** `npm audit` reports 14 moderate findings and nothing higher. All are in tools that run on the development machine (Expo’s CLI, ESLint’s TypeScript rules, and Drizzle Kit’s older esbuild loader), not in app or Worker code. npm’s suggested fixes are major downgrades (for example Expo 52), so they are not applied. Re-check at each upgrade.
- **Upgrades are deliberate:** one Expo SDK at a time, after reading the release notes, and recorded in the change log.

### 15.1 Runtime and tools

| Tool | Version | Notes |
|---|---|---|
| Node.js | **24 LTS** (latest 24.x; 24.19.0 on the development machine) | Decided on 11 November 2026 by the owner. Node.js 26 LTS is not used for now. |
| npm | **11.17.0** (comes with Node.js 24.19.0) | Package manager and workspaces. Use the npm that ships with the installed Node.js 24, not a separate install. |
| Turborepo (`turbo`) | **2.11.10** | Runs tasks across the apps and packages |
| TypeScript | **6.0.3** | The version Expo SDK 58’s own template uses. TypeScript 7 (the new native compiler) is not used yet. |
| Java Development Kit | **17** | For Android builds. Confirm against the Expo SDK 58 documentation when setting up. |
| EAS CLI (`eas-cli`) | **27.1.0** | Expo builds (local builds are unlimited) |
| Wrangler | **4.155.0** | Cloudflare Workers command-line tool |
| Drizzle Kit | **0.31.11** | Database migrations |
| tsx | **4.23.15** | Runs the seed script |
| Postgres (Docker image, development only) | **17.10** (`postgres:17.10-alpine`, pinned by digest `sha256:742f40ea…2193` in `apps/api/docker-compose.yml`) | The local database (owner decision, 12 November 2026). 17.11 was published on 6 November 2026, after the cutoff. Neon runs Postgres 17 in production. |

### 15.2 Mobile apps (Expo SDK 58)

All three apps use the same versions.

| Package | Version | Used for |
|---|---|---|
| expo | **58.0.21** | Expo SDK 58 |
| react-native | **0.88.1** | |
| react | **19.3.0** | |
| @types/react | **19.3.0** | |
| expo-router | ~58.0.28 | Navigation |
| expo-dev-client | ~58.0.17 | Development builds |
| expo-build-properties | ~58.0.11 | Minimum Android version 29 |
| expo-updates | ~58.0.19 | JavaScript-only updates |
| expo-constants | ~58.0.14 | Required by Better Auth |
| expo-linking | ~58.0.15 | Required by Better Auth, and opening navigation and WhatsApp |
| expo-web-browser | ~58.0.7 | Google sign-in through Better Auth |
| expo-network | ~58.0.4 | Required by Better Auth, and connection state |
| expo-secure-store | ~58.0.2 | Session tokens |
| expo-notifications | ~58.1.7 | Push. Installed in the Business app on 15 November 2026 (exact 58.1.7) for the alert beep, a local notification on its own Android channel with the app’s own tone (MGR-14). |
| expo-device | ~58.0.5 | Push registration. Not installed: push works without it (16 November 2026). |
| expo-location | ~58.0.20 | Rider tracking and the arrival geofence (rider app); “Use my current location” on the address screen (customer app, one reading while using the app, no background; owner decision 16 November 2026) |
| expo-task-manager | ~58.0.12 | Background location (rider app) |
| expo-battery | ~58.0.3 | Battery-aware tracking (rider app) |
| expo-keep-awake | ~58.0.3 | Screen awake on pickup and code entry (rider app) and on the kitchen tablet |
| expo-image-picker | ~58.0.10 | Photos (customer profile; dishes, soups, and staff in the Business app, installed there 12 November 2026) |
| expo-image-manipulator | ~58.0.16 | Crop, resize, and compress before upload (installed in the Business app) |
| expo-image | ~58.0.18 | Showing photos with caching. Installed in the Business app (12 November 2026) and the customer app (14 November 2026). |
| expo-font | ~58.0.11 | Loading Nunito and Inter |
| expo-linear-gradient | ~58.0.3 | Required by the charts library (business app) |
| expo-splash-screen | ~58.0.12 | Launch screen |
| expo-status-bar | ~58.0.4 | Status bar |
| expo-system-ui | ~58.0.7 | Light and dark backgrounds |
| react-native-reanimated | 4.7.1 | Small animations |
| react-native-worklets | 0.13.0 | Required by Reanimated |
| react-native-gesture-handler | ~3.3.0 | Gestures |
| react-native-screens | ~4.30.0 | Navigation screens |
| react-native-safe-area-context | ~5.10.1 | Safe areas |
| react-native-svg | 15.16.0 | Logo, icons, and charts |

| Library | Version | Used for |
|---|---|---|
| @better-auth/expo | **1.7.14** | Sign-in in the apps. Its requirements are met by the SDK 58 modules above (checked 11 November 2026). |
| @tanstack/react-query | **5.105.0** | Server data, caching, retries, and resync after reconnecting |
| zod | **4.6.7** | Validation, shared with the API |
| @maplibre/maplibre-react-native | **11.5.0** | The customer app’s map (requires Expo 54 or newer and React Native 0.80 or newer) |
| lucide-react-native | **1.63.0** | Icons |
| react-native-gifted-charts | **1.4.81** | Report charts (business app) |
| @expo-google-fonts/nunito | **0.4.2** | Headings |
| @expo-google-fonts/inter | **0.4.2** | Body text |

### 15.3 API (Cloudflare Workers)

| Package | Version | Used for |
|---|---|---|
| hono | **4.13.16** | The API. Upgraded from 4.13.14 on 14 November 2026 for security fixes; the owner approved it a day before the two-week rule allowed. |
| @hono/zod-validator | **0.9.1** | Request validation |
| better-auth | **1.7.14** | Sign-in, sessions, roles, and staff passwords |
| drizzle-orm | **0.45.4** | Database access |
| pg | **8.23.1** | Postgres driver through Hyperdrive |
| @types/pg | **8.23.1** | Types for the driver |
| zod | **4.6.7** | Shared validation |
| @cloudflare/workers-types | **5.20261028.1** | Types for Workers, Durable Objects, R2, and Hyperdrive (or generate them with `wrangler types`) |

R2, Hyperdrive, Durable Objects, and Cron Triggers are used through Worker bindings, so they need no extra packages.

### 15.4 Seed data, website, testing, and quality

| Package | Version | Used for |
|---|---|---|
| @faker-js/faker | **10.6.0** | Fake names and details in the seed script, with a fixed seed |
| vitest | **5.0.5** | Unit tests for the API and shared packages |
| @cloudflare/vitest-plugin | **1.4.10** | Running API tests inside the Workers runtime. Replaces `@cloudflare/vitest-pool-workers` 0.23.0, which is deprecated and only supports Vitest 4 (owner decision, 11 November 2026). |
| @playwright/test | **1.64.1** | Website checks |
| eslint | **9.39.5** | Linting. Changed from 10.13.0 on 11 November 2026 (owner decision): `eslint-plugin-react`, used by `eslint-config-expo`, doesn’t support ESLint 10 yet. Revisit when it does. |
| eslint-config-expo | **58.0.4** | Lint rules for the Expo apps |
| prettier | **3.9.10** | Formatting |

The website uses **no packages**. It is plain HTML, CSS, and JavaScript.

### 15.5 Decided not to use

| Not used | Why |
|---|---|
| TypeScript 7 | Expo SDK 58 still uses TypeScript 6.0 |
| Tailwind CSS on the website | Plain CSS is enough for five pages and keeps the site dependency-free |
| NativeWind, Tamagui, or a UI component kit | React Native styles with the shared brand tokens are simpler and more stable |
| Victory Native | Needs Skia. Gifted Charts is lighter for simple bars and lines. |
| A native Google sign-in library | Better Auth’s browser-based Google flow is enough (12.2) |
| @neondatabase/serverless | Hyperdrive with `pg` is the chosen connection |
| GraphQL | REST first. Add it only if a screen needs it. |
| Mobile end-to-end testing tools | Later, once the core flows are built |

---

## 16. BUILD ORDER

0. Repository setup (https://github.com/ARMSTRONG-AISOSA/casual-kitchen-express): npm workspaces and Turborepo, the three Expo apps, the API Worker, shared packages (types, validation, API client, brand tokens), and the website, using the versions in section 15.
1. Backend foundation: Neon database and migrations, accounts, roles, menu, orders, and order statuses.
2. Seed script for the historic mock data (18.3), as soon as the schema exists, so every later screen is built against realistic data.
3. Kitchen and Business app: board, acknowledge, ready, walk-in order entry, menu management with image compression.
4. Customer app: browse, order, simulated payment, track.
5. Rider app: queue, accept, pickup, delivery code, earnings.
6. Capacity rules, batching, and the demo simulator (18.4).
7. Website (static, on GitHub Pages).
8. Reports, rider payouts, and polish.

**Changed on 12 November 2026 (owner decision): frontend first.** The app screens are built first on demo data held in each app, so the owner can see and review them. The customer app came first, then the rider app, then the Kitchen and Business app (all three built on demo data by 12 November 2026). The backend foundation (step 1) is built: the database, catalog, soup rotation, photos, and sign-in with roles (14 November 2026). Orders and statuses come next. The seed script (step 2) follows, and then each app’s demo data is replaced with real API calls. The rest of the order is unchanged. `progress.md` section 8 has the step-by-step status.

**Platform:** every step targets Android first. iOS is added later.

**Development setup:** each app runs as a development build (`expo-dev-client`) installed on a real Android device, connected over the local network to the development server (`npx expo start --dev-client --lan` in the app’s folder). Expo Router’s optional typed routes are switched off: its CLI couldn’t load them with `expo-router` 58.0.28 in this workspace.

**Step 6a, the Business app on live data (15 November 2026):** after sign-in the app loads, in one call each and only what the role may see, the board (`GET /orders/board`), the open alerts, the riders panel and the settings (dispatch and managers), and today’s orders (`GET /orders?from=today`; the detail fetches the rest on opening). It then keeps one WebSocket to `GET /live` (the session cookie in its headers), applies each message, and after a dropped connection or a return from the background asks `GET /changes?since=N`; the connection closes in the background. Every action (acknowledge, tick, ready, collected, walk-in order, cancel and refund, approve or decline a request, resolve a help request, clear an alert, assign, sold out, settings, the Alerts section) goes to the API, and the screen applies the returned order at once; a refusal shows the API’s sentence and reloads. The menu’s prices and sold-out flags come from `/bootstrap`. The staff order view now carries each order’s rider (`rider: { code, name }`). Still on demo data until their steps: Reports, Finance, Rider pay, Cash-up, and the menu editor (step 9), and practice orders and auto-play (step 7).

**Step 6b, the rider app on live data (15 November 2026):** after sign-in (and the first-time password) the app loads the rider’s deliveries, earnings, and queue, keeps one WebSocket to `GET /live`, and re-reads `GET /rider/queue` a moment after any queue message, because the server decides what fits (the count, the load, and the batch distance; one small call keeps the rule in one place). A new order that fits, or one dispatch assigns, vibrates the phone (RID-14). Going online, accept (another rider winning shows Order taken), picked up, the delivery code (checked by the API, 5 wrong tries), Need help, release (before pickup), and changing the stop order go to the API. Earnings show `GET /rider/earnings`: the period’s deliveries and pay, owed by day, today’s deliveries, and paid weeks. The demo code hint shows only in the demo.

**Step 6c, the customer app on live data (15 November 2026):** once signed in, the app loads the orders in progress, the order history, and the address book, keeps one WebSocket to `GET /live` (each change to the customer’s own orders arrives there, so tracking moves on by itself), and reloads on return from the background. Checkout sends the cart as menu item and option IDs and the API prices it; tracking shows the real 4-digit code and each step’s real time (a step the order went straight past takes the next step’s time); the customer’s own cancel (before the kitchen acknowledges, refunded in full), cancellation requests, ratings, and the delivery address (saved to the address book as the default) go to the API. Several orders can be in progress at once: tracking follows one, In progress lists them all, and a finished order is filed into history only once. Until the real map (step 6d), a saved address uses its area’s approximate centre for the pin. Development builds have a Test account sign-in in Preview tools (username and password, for testing without anyone’s Google account); real customers sign in with Google only, and release builds never show it.

**Step 6d, the map and riders' location (16 November 2026):** the customer app draws the real map with MapLibre 11.5.0 and OpenFreeMap tiles (the light Positron style, and OpenFreeMap’s dark style in the dark theme), with the brand markers (design.md 4.4) and the credit always shown under the map. Adding an address: picking an area moves the pin to that area’s centre, and a tap on the map moves it; the delivery boundary is drawn from Settings once the owner draws it (4.7), and until then the app uses a rough outline from Uselu to Oluku Market (the API still checks that the area is in range). Tracking shows the kitchen, the address, and, after pickup, the rider’s marker, which jumps to each new position without animation; it shows the rider’s first name and “stop 2 of 3” when the rider has several stops. The rider app sends its position with `PUT /rider/location` (RID-17, 7.1): only while an order is picked up, balanced accuracy, about every 45 seconds and only after moving about 100 metres (every 2 minutes and 250 metres with battery saver on or under 15%), as an Android foreground service with a “Delivery in progress” notification, which stops at the last delivery. The API keeps only the last position, only while an order is on the way, and clears it when the rider delivers the last order or goes offline; with Milestones only, it keeps nothing and the app stops sending. “Arriving soon” comes from a 300-metre geofence around each address when the rider allows location all the time (asked in a second step, 17.1); otherwise the same distance is checked on each position update. Navigate passes the customer’s pin to the navigation app. **Push (16 November 2026, later):** the owner made the Firebase project `cke-push` and the Expo projects (cke-customer, cke-rider, cke-business, team `armstrong-aisosas-team`); the FCM V1 key is stored on Expo for all three app identifiers, and `google-services.json` stays out of Git. Each device saves its Expo push token (`PUT /me/push-token`, removed at sign-out and on deactivation). Each order status is pushed once (the order keeps `pushed_status`): the customer’s statuses in 4.1 and 4.2 (placed and confirmed as one, since they happen together), new online orders to the kitchen, dispatch, and managers (the chime channel, or a quiet one when the chime is off), a ready delivery to each online rider it fits and an assigned order to its rider (with the tone when the rider’s Sound is on, RID-14), and the alert beep to staff who see Alerts. While an app is open the live connection already shows the change, so a push arriving then isn’t shown. Tapping a notification opens the order’s tracking, the queue, the board, or Alerts. Expo’s “not registered” answers delete the token.

**Backend development (12 November 2026):** the API runs against Postgres 17.10 in Docker on the laptop (`apps/api/docker-compose.yml`, listening on 127.0.0.1 only). Locally, the Worker reaches it through Hyperdrive’s `localConnectionString` in `wrangler.jsonc`, the same code path as production. `apps/api/README.md` lists the commands (start, migrate, seed, test).

### 16.1 To verify at build

These checks were either not possible during planning or depend on the live setup.

1. Better Auth's username plugin, its admin features for creating users, and its custom password-hash setting. **Done 14 November 2026:** the username plugin and the custom PBKDF2 hash work in the Worker. Staff accounts are created by the API’s own People routes rather than the admin plugin.
2. The real PBKDF2 timing at about 50,000 iterations on a deployed Worker, to confirm it fits the 10 ms CPU limit. **Done 14 November 2026:** a median of 9.5 ms at 50,000, right at the limit (figures in 12.2). The owner chose 30,000 iterations (12.2).
3. Durable Object alarms and WebSocket hibernation on the free plan, and the daily request counts they use. **Done 14 November 2026:** on the free plan, a SQLite-backed Durable Object’s alarm set for 5 seconds ahead fired 1 ms after its time, and a WebSocket accepted with the hibernation API answered after 12 seconds idle. The daily request counts are checked once the real traffic exists (Workers Logs).
4. Background location, the Android foreground-service notification, and the battery and heat target (7.5) on a mid-range phone. **Partly done 16 November 2026:** background location, the “Delivery in progress” foreground-service notification, the two-step permission, and the arrival geofence work on the test tablet (with test positions, since it has no fix indoors). The battery and heat target still needs a real phone on a real shift.
5. The Google sign-in console setup: consent screen, the client, and the privacy policy link. **Mostly done 14 November 2026:** Google Auth Platform (branding, External audience in testing, one Web application client with the localhost and workers.dev redirect addresses) is set up, and Continue with Google works on the tablet in the Business app (a manager) and the customer app (a customer; a staff Google account is refused). The browser-based flow needs no package name or key fingerprint. Still to do: the privacy policy link and publishing the consent screen, with the website (step 7). **The privacy page is built (16 November 2026);** the owner gives Google its link and publishes once the site is online (`progress.md`, log of 16 November 2026).
6. The Hyperdrive caching settings (off for live order data), and Neon's current free-plan storage allowance.
7. OpenFreeMap's current usage terms, and the required map credit. **Done 16 November 2026:** no account or key, no limits on map views (offline downloads are limited, and the apps don’t download offline), commercial use allowed, no uptime guarantee, and whoever integrates it must be 18 or over. Attribution: “© OpenStreetMap contributors” visible on or next to the map and linked to openstreetmap.org/copyright, and “© OpenMapTiles” linked to openmaptiles.org; each credit under the map now opens its own page.
8. A re-check of every free allowance (Cloudflare, Neon, and Expo) just before building.
9. The Android install flow, unknown-source and Play Protect prompts, and the release signing key, on real Android 10 and newer phones.
10. A quick check that Android 10 and above suits the target users' phones.
11. The seed script's own checks (18.3), including the separate online and walk-in hours. **Done 15 November 2026:** built into `scripts/seed-history.ts`; they all pass.
12. The delivery boundary polygon, drawn from map pins from Uselu to Oluku Market. **Done 16 November 2026:** from the owner’s pins (4.7, `list-of-areas.md` 1).
13. The performance targets (13) and the contrast ratios in `design.md` (3.2 and 3.9), in the design tools.
14. Tool support for Node.js 24 LTS and JDK 17 with Expo SDK 58.
15. Before installing, re-check each locked version in section 15 for security advisories.

---

## 17. PLATFORM, DISTRIBUTION, LICENCE, AND ATTRIBUTION

### 17.1 Platform: Android 10 and above

**Decided:** the apps target **Android 10 (API level 29) and above**, because most people use these versions.

What this means:
- Background location uses Android 10's separate permission, and from Android 11 the person is asked in two steps. A visible notification is required while background tracking runs (section 7.3).
- Phones older than Android 10 cannot install the apps. A quick check of the target users' phones before launch would confirm this suits the delivery area.
- The minimum version is set in the build configuration.

### 17.2 Distribution: no Play Store for now

**Decided:** the apps are **not listed on the Play Store for now**. They are installed directly.

| Item | Plan |
|---|---|
| Customer app | Android installer file (APK) downloaded from the website's App page, which links to GitHub Releases |
| Business app and rider app | GitHub Releases only, not promoted on the public pages |
| Processor types (decided) | Everyday and test builds are **arm64-v8a only**. Release builds add **armeabi-v7a** for older and budget phones (set `CKE_ANDROID_ARCHITECTURES="arm64-v8a,armeabi-v7a"`). **x86 and x86_64 are never built.** Enforced by `tools/expo-plugins/with-android-architectures.js` in every app. Owner decision, 11 November 2026. |
| Package IDs (decided) | `com.armstrongaisosa.casualkitchenexpress.customer`, `.rider`, and `.business`. They can’t change after the first release. |
| Signing | One signing key per app, kept safe and backed up. The same key must be used for every update. (Google sign-in uses the browser-based flow, so it isn’t tied to the key’s fingerprint, 12.2.) |
| Versions | Each release has a version number, release notes, and a checksum on the release page |
| Updates | The app checks for a newer release and shows an "Update available" message that opens the release page. Expo EAS Update can send JavaScript-only changes without a new installer. |
| Push notifications | Work without the Play Store (Firebase handles delivery) |
| Install friction | People must allow installs from the browser they used, and may see a warning that the app is from an unknown source. The App page and the FAQ explain each step. |
| Limits | GitHub Releases files are free for public repositories, and each release is capped at 2 GB, far above an app's size. The GitHub Pages site limits are in 5.4. |

### 17.3 Licence

**Decided:** all code is licensed under the **MIT licence**: the three apps, the API, and the website.

- A `LICENSE` file sits at the root of the repository.
- Third-party libraries keep their own licences.
- The fonts (Nunito and Inter) use the SIL Open Font Licence.
- The map shows the required credit: OpenFreeMap, OpenMapTiles, and © OpenStreetMap contributors.
- A short README note says the MIT licence covers the code, and that the CKE name and logo are not part of that grant.

### 17.4 Attribution

**Decided:** Claude Code is credited **lightly and in very few places**.

- One line in the repository README.
- One small line on the website's About page.
- Nowhere else: not inside the apps, not in the licence, and not on every page.
- Commit messages: Claude Code's automatic commit credit can be switched off in its settings if it is not wanted.

---

## 18. SIMULATION AND DEMO DATA

### 18.1 Everything is simulated

| Area | How it is simulated |
|---|---|
| Payments | A fake card or bank-transfer confirmation. No provider and no real money. |
| Refunds | Status changes and records only ("Refund pending", then "Refund completed"). |
| Walk-in payments | Cash is recorded as received at the counter, with the change due. An online payment (card or transfer) gets a fake confirmation. No real money moves. |
| Delivery | The demo simulator can act as the kitchen and the riders, and move a rider along a route between the kitchen and the customer's pin (18.4). |
| Rider pay and payouts | Calculated from real order records. "Paid" is a status an account officer or a manager sets, and no money moves. |
| Cash-ups and month closes | The cash counted is typed in by staff, and signing off and closing a month are records only. No real cash is involved. |
| Customers and staff in the history | Fake people with fake details (18.3). |
| Notifications | Push notifications stay real, because they are free and carry no money or personal risk. They can be switched to logged-only. Email and SMS are not used. |
| Sign-in | Real Google sign-in, so a real person can try the apps. The orders they place are demo orders. |

### 18.2 Delivery fee and rider pay

- **Delivery fee:** a flat fee on every delivery order, on top of the food cost, **₦1,500 by default** and editable by managers in Settings. Pickup has no fee. The fee is not distance-based, and it is one fee per order even when a rider carries several orders.
- The fee is stored on each order when it is placed, so a later change never alters an existing order. A change in Settings (MGR-31) shows in the customer app straight away for new orders. The order total is the food total plus the fee.
- The apps read prices from the API, so a change shows on the next screen that loads.
- **Rider pay:** paid for each delivered order. The amount per delivery is set by the manager in Settings, ₦1,000 by default, and can’t exceed the delivery fee. A change applies to deliveries completed after it and shows in the rider app straight away.
- No pay for an order cancelled before pickup. For an order that fails after pickup (for example, the customer is unreachable), the manager decides.
- **Earnings and payouts:** each delivered order adds to the rider's owed balance. An account officer or a manager marks a period as paid (a simulated payout), which creates a payout record showing who paid and when. Riders see their owed and paid amounts in the Earnings screen (RID-18).

### 18.3 Historic mock data

A seed script fills the database with **three months** of history (owner decision, 15 November 2026; it was two months), so the reports, Finance, the order list, and the apps look like a restaurant that has been trading since launch. This is the data the app is deployed and pitched with, so it follows the real rules everywhere. **Built 15 November 2026:** `npm run db:seed-history --workspace @cke/api` (`apps/api/scripts/seed-history.ts`), after the base, people, and media seeds.

| Item | Values (tunable in the script) |
|---|---|
| Window | The 90 days ending yesterday (West Africa Time). Running it again moves the history up to date. Online ordering “launched” on the first day, so O-0001 is that morning. |
| Hours | Online orders only from 08:00 to 18:00 (the last at 18:00), walk-ins from 08:00 to 20:30. No order of either kind falls outside its hours. |
| Online volume | About 40 a weekday and 25 at the weekend, busiest on Fridays and Saturdays, with a gentle rise over the three months (from about 86% to 112% of the average). About **3,200** in total, ending near O-3200. |
| Walk-in volume | About 13 a weekday and 8 at the weekend; about **1,050** in total. Walk-in numbers restart at W-001 each day. |
| Peaks (West Africa Time) | Online: 12:00 to 14:30 and 16:30 to 18:00. Walk-in: 12:00 to 14:30 and 17:00 to 20:30. On 1 October (Independence Day) online is quieter and walk-ins busier. |
| Order type and payment | Online: about 85% delivery and 15% pickup; about 60% card and 40% transfer. Walk-in: about 60% take away and 40% eat in; about 55% cash, 25% card, and 20% transfer. Cash is often a round ₦500 or ₦1,000 with change, sometimes exact. |
| Order size and menu | About 2.4 items an online order and 2.0 a walk-in: a main, often a side or a drink. Jollof rice sells most, then soft drinks, fried rice, the soup of the day, and the combos. Today’s soup rotates daily from the soups in the rotation. Jollof rice rose from ₦1,800 to ₦2,000 a little after halfway, with the change in the audit trail. |
| Outcomes | Online: about 92% completed, 4% cancelled by the customer before acknowledgement (refunded in full), 2% cancelled later by an approved request (full or partial refunds, partials at most 99%), and 2% delivery issues (a help request, then a manual completion or kept open). About 1% of finished orders get a small refund from a manager afterwards. Walk-in: about 98% collected and 2% cancelled before ready, refunded by the staff member (full or partial). |
| Timings (measured on the generated data) | Acknowledged in about 2 minutes (1 to 3; a few slower). Plated and packed in 5 to 13 minutes, because the rice and soups are cooked ahead (median about 9½; a few slower orders up to about 25). A free rider at the kitchen takes a new order within about 4 minutes; when every rider is out it waits for the first one back, so the median wait is under 3 minutes and 9 in 10 are taken within 10. Ride times are about 2.5 minutes a kilometre plus parking and handover (median 12 minutes; Iguosa and Oluku, 8 to 10 km away, take 25 to 30). About 31 minutes from order to door (median; 9 in 10 within 50). Walk-ins are ready in about 10 minutes and collected within a few minutes. |
| Riders and batching | Riders are given orders in the order they become ready; whoever is free first takes the next. Orders ready within 10 minutes of each other, going the same way (within the 1.5 km batch distance), ride together up to three, nearest first, when they fit the 9-point load budget (owner decision, 15 November 2026; it was 6). About 6% of deliveries are a second or third stop (about 2% to 4% with the old 6-point budget, which rarely fitted two typical orders of 4 to 5 points). When an order waits more than about 15 minutes, dispatch often assigns it (about 3% of deliveries), after a “waiting for a rider” alert. |
| Alerts (MGR-14) | Opened at the times saved in Settings, Alerts when the script runs (the usual 10, 5, 15, and 30 minutes), exactly as the API's timed check would have: about 255 “waiting for a rider” alerts (1 delivery in 10), and about 460 orders “running late” (about 11%), each then marked Delayed (about 110 not acknowledged, 150 too long in the kitchen, and 200 too long on the road, mostly to Iguosa and Oluku). Each cleared when a rider took the order or the order was finished. Help and cancellation requests have their alerts too. |
| People | 250 fake customers with Nigerian names (online only), each with a home address and sometimes a second one (Work, Office, Shop, or Hostel), spread across the delivery areas with more near the kitchen. About 60% reorder; the most loyal order most weekdays (about 70 orders). The seeded staff: four riders (Uyi, R-004, left in the last week, matching his deactivated account), two kitchen staff on morning (08:00 to 14:00) and afternoon (14:00 to 20:30) shifts that swap weekly, one dispatch officer, one account officer, and the two managers. Ratings lean positive (about 4.5 stars on average; slow orders score lower). Walk-ins have no customer records. |
| Money | The delivery fee on every delivery order, rider pay on every delivery, and weekly payouts (Monday to Sunday, paid the next Monday; the current week owed). A cash-up for every day: expected from that day’s walk-in cash less cash refunds, counted by the afternoon shift, with a small difference and a note on about one day in eight, and signed off the next morning, except yesterday’s, which is left for a demo. Every full month before the current one is closed with its statement snapshot, and one later correction is entered as an adjustment in the open month (ACC-07). |
| Places | The neighbourhoods in `list-of-areas.md`, with approximate map pins scattered around each area’s centre. Streets and landmarks are made up. |

**Quality rules**
- The script is deterministic (a fixed random seed), so the same day produces the same history.
- Every row is flagged as demo (fake customers have `demo-customer-` IDs), and running the script wipes and regenerates it (MGR-29). The starting photos are the exception (8.1.1).
- It checks its own output before saving and saves nothing if a check fails: every order inside its hours and not in the future; lines, totals, and payments add up; timelines in order and ending in the order’s status; every order attributed to staff; refunds never more than the order, partial refunds at most 99%, and every cancellation refunded; online numbers continuous from O-0001 and walk-ins from W-001 each day; no rider carrying more than three orders at once, and none after leaving; payouts equal to their deliveries’ pay; cash received never less than the total.
- It refuses to run when real (non-demo) online orders exist, because their numbers would clash.
- Fake customers use emails on the reserved `example.com` domain and 0800 phone numbers, which aren’t mobile numbers, so nothing can reach a real person.
- Size: about 32 MB on the laptop’s database, well inside Neon’s free storage. The script writes straight to the database, so it doesn’t use the API’s request budget.

### 18.4 Live simulation (demo controls)

- Managers get **Demo controls**: create a new online order or a new walk-in order, auto-play a simulated kitchen and rider, choose the speed (1x, 5x, or 20x), pause, and reset.
- The simulated rider's position moves along a route between the kitchen and the customer's pin, at the same low update frequency as real tracking. Real GPS can still be tested on real devices.
- Labelling: payment screens carry the demo notice, the manager app shows a small "Demo" chip, and the website FAQ says the app uses demo payments.
- The simulation runs on Durable Object alarms and counts toward the free request limits like real traffic (14.2).
- **Built (16 November 2026, build step 7):** practice orders are real rows marked `practice` (and demo): **New online order** comes from a seeded demo customer to their saved address (most are deliveries), **New walk-in order** is a cash walk-in labelled Practice; both appear on every screen marked “Practice”, and riders see practice deliveries in their queue. **Auto-play** (a Durable Object, `DemoSim`, with its own alarm, every 5 seconds at 1x and at most once a second) moves only practice orders along: the kitchen acknowledges, ticks, and marks Ready; a demo rider who isn’t online in the rider app accepts, picks up, moves along the way in five hops (each a position on the customer’s map, like real tracking), arrives within 300 metres, and delivers. Staff and riders can also handle practice orders by hand; the simulator then leaves those steps to them. Real orders are never touched. The alarm stops when no practice order is moving. **Reset** on a live tablet removes every practice order (MGR-29 on live data); regenerating the three months of history stays the laptop’s `npm run db:seed-history`. Routes: `GET /demo`, `POST /demo/orders`, `PUT /demo/autoplay`, `POST /demo/reset` (managers only).

---

## 19. CHANGE LOG

| Version | Change |
|---|---|
| 0.53 | 17 November 2026: WEB-08 adds the Restaurant details on Home and the Search Console and Bing plan. |
| 0.52 | 16 November 2026 (late): the website built (WEB-01 to WEB-04 and WEB-06 to WEB-10) in `apps/website/public`, published by a GitHub Actions workflow; 16.1 item 5 note; BDPA estate’s centre is the owner’s pin. |
| 0.51 | 16 November 2026 (evening): the owner’s kitchen pin and delivery boundary, now checked by the API; Evbogida added to the areas; area centres from OpenStreetMap (4.7, `list-of-areas.md` 3a). |
| 0.50 | 16 November 2026 (later): push notifications built through Expo and Firebase (16, the step 6d note); “Use my current location” in the customer app, so expo-location is in the customer app too (owner decision, 15.2); expo-device not needed; build step 7, the live simulator with practice orders (18.4). |
| 0.49 | Build step 6d on 16 November 2026: the customer’s real map (MapLibre with OpenFreeMap) and riders’ light location tracking with the arrival geofence (16, the step 6d note). |
| 0.48 | Build step 6c on 15 November 2026: the customer app on live data (16, the step 6c note), with several orders in progress at once and a development-only test sign-in. |
| 0.47 | Build step 6b on 15 November 2026: the rider app on live data (16, the step 6b note). |
| 0.46 | Build step 6a on 15 November 2026: the Business app on live data (16, the step 6a note); the rider on the staff order view; the new-order chime moved to its own Android channel `orders-v2` (the test tablet’s first channel was made before the tone was in the app). |
| 0.45 | Owner decisions on 15 November 2026 (evening): the usual alert times are 10 minutes waiting for a rider and 30 on the road (were 5 and 25; MGR-14, 9 notes, 18.3 re-measured); the new-order chime built (KIT-02), with its own switch in Settings, Alerts, and a `chime` flag on new online orders' live messages. |
| 0.44 | Owner decisions on 15 November 2026 (later): alert timers set in Settings, Alerts by dispatch and managers within fixed ranges, with a beep toggle, one-tap save, a saved dialog, the audit log, and who changed it last (MGR-14, 9 notes, Setting); the beep is a local notification, once per alert, on every device that shows Alerts; each stage now alerts once per order, so clearing sticks; the rider load budget is 9 instead of 6, load levels unchanged (6); a 90-day quick choice in Reports (MGR-23, report periods); expo-notifications installed in the Business app (15.2); 18.3 re-measured with the new budget and alert times (faster plating and rider pickup, about 6% batched, alerts recorded). |
| 0.43 | Owner decisions on 15 November 2026: three months of demo history instead of two, built (18.3, rewritten with the measured figures; batching about 2% to 4% because of the load budget); partial refunds typed in and at most 99% of what was paid, for everyone who refunds (MGR-15, 4.6, 9 notes); walk-ins acknowledged on the board, confirmed (4.8). |
| 0.42 | Orders backend, parts 2 to 5, built on 15 November 2026 (build step 4c finished): cancelling and refunds, ratings, the rider queue and deliveries, alerts with starting wait times, settings, the address book, and the live connection with the alert check on its alarm (9 notes, 10, 14.4). The kitchen’s map pin is a placeholder until the owner drops it. |
| 0.41 | The memory check rule changed (owner): checks only when the owner asks or agrees, never on Claude’s own (13.1). Orders backend, part 1, built on 15 November 2026: menu management, checkout, the customer’s orders, walk-ins, the kitchen’s steps, the board, the order list, and reconnecting with only what changed (9 notes). The delivery code is worked out with a keyed hash and only its hash stored (4.4). Walk-ins are acknowledged on the board like online orders (4.8). |
| 0.40 | Owner decision on 15 November 2026: Claude checks memory use and memory leaks on its own at intervals as the apps grow (13.1), with ten Proposals for keeping memory and CPU low. |
| 0.39 | Owner decision on 15 November 2026: a tour guide for managers (MGR-39), started only from Demo controls, one straight tour of the manager’s 14 menu items, each step opening its screen. |
| 0.38 | Owner decisions on 14 November 2026: ammycan6@gmail.com is the owner, as staff ID M-001, set up from configuration (`OWNER_GOOGLE_EMAIL`, `OWNER_NAME`), which closes the 0.37 gap (3, 9 notes). Customer profiles built: the CustomerProfile row and customer ID at the first visit, name and gender saved, and the profile photo with on-phone compression, private to the customer, managers, and dispatch (3.1, 8.1, 9 notes). |
| 0.37 | Review on 14 November 2026 after Google sign-in was tested on the tablet: 16.1 items 1 and 5 marked done (5 except the privacy link and publishing); the signing row no longer ties Google sign-in to the key; the accounts note and the status lines are current; `GET /people` hides the placeholder address of username staff; a gap recorded: the owner’s Google email isn’t configured for the deployed database yet (3). |
| 0.36 | 14 November 2026: Hono upgraded from 4.13.14 to 4.13.16 for its security fixes (15.3). The owner approved the upgrade one day before it was two weeks old. Rider app sign-in built. Google sign-in built (browser-based flow, a Web client; no Android client or SHA-1 needed) in the API, the Business app, and the customer app, waiting for the owner’s Google client (section 9 notes). `GET /me` returns the person’s own profile details and Google email. The sign-in packages, `better-auth`, and expo-image installed in the customer app; `better-auth` declared in the Business and rider apps too (15.2). |
| 0.35 | Owner decisions on 14 November 2026: the tablet’s 8:30 pm sign-out waits until every order placed before then is finished, and managers can turn it off in Settings (4.5, KIT-12, Setting). Sign-in built: Better Auth with staff usernames, `/me`, People routes, role checks per route, private staff photos, and Durable Object rate limiting (section 9 notes). `@better-auth/expo` 1.7.14 installed with `expo-secure-store` 58.0.2, `expo-network` 58.0.4, and `expo-web-browser` 58.0.7 (15.2). |
| 0.34 | Owner decisions on 14 November 2026: staff passwords use PBKDF2 at 30,000 iterations instead of about 50,000, after the measurements (12.2, 14); the account’s workers.dev subdomain is `casualkitchenexpress`, so the API will be served at `<worker name>.casualkitchenexpress.workers.dev` until a custom domain exists (14.2). |
| 0.33 | 14 November 2026: free-plan checks run on a throwaway Worker (since deleted): PBKDF2 timing at 20,000 to 100,000 iterations (12.2, 16.1 item 2) and Durable Object alarms and WebSocket hibernation (16.1 item 3). |
| 0.32 | End-of-day review on 12 November 2026, with no new decisions: image compression covers dishes, soups, and staff (8.1); starting photos updated for the Gemini menu and staff photos, which aren’t flagged as demo (8.1.1, 9, 18.3); expo-image, the image picker, and the manipulator installed in the Business app (15.2); 14.4 marked decided and placed after 14.3; the build-order status (16); the public-photo gap to close with sign-in recorded (section 9 notes). |
| 0.31 | Owner decisions on 12 November 2026: photo upload in the Business app with crop, compression, and credit fields, replacing deletes the old photo everywhere (MGR-06, MediaAsset source kind); a refund confirmation tick and the refunder’s name, role, and staff ID recorded (MGR-15); a Refunds report (MGR-37); View profile, staff photos, gender, and home address on People (MGR-38); new photo routes and the demo staff in the database (section 9 notes). |
| 0.30 | 12 November 2026: menu photos sourced, processed, and recorded (8.1.1, `docs/photo-credits.md`), stored in R2 and served by `GET /media/:id`; MediaAsset gains credit fields; soups gain their own photo; soup dishes carry the soup’s name and photo (KIT-17); a Photo credits page (CUS-26); expo-image noted for the next native build (15.2). |
| 0.29 | Owner decision on 12 November 2026: managers add and remove soups in the soup of the day rotation on the Menu screen, saved in the database and shown in the customer app (KIT-17). The first API routes (section 9 notes), with a temporary write guard until sign-in. |
| 0.28 | Backend foundation started on 12 November 2026: owner decisions on a local Postgres 17.10 database in Docker for development (locked in 15.1) and account timing (Cloudflare soon, Neon at deploy); the schema built from section 9, with change numbers, a catalog version, soup varieties, and hours overrides recorded under section 9; the development setup in 16. |
| 0.27 | Owner decisions on 12 November 2026 (14.4): settings and menu use a version number with a live nudge; past data is kept and only today refreshed; reports are worked out in the app or the database by size; reconnecting fetches only what changed. |
| 0.26 | Owner decisions on 12 November 2026: account officers see the customer leaderboard (MGR-34); sales splits show the amount before the percentage (MGR-18); the rider and area report is two tables, every rider and every area with deliveries, share, and average time, worked out from the chosen date range (MGR-20); 14.4 lists ways to reduce API calls and keep data fresh, to go over with the owner before the backend. |
| 0.25 | Owner decisions on 12 November 2026: kitchen staff can set the soup of the day on the Sold out screen, as well as managers (KIT-17); walk-in cash is Exact or an Other amount box, replacing the ₦500 to ₦5,000 buttons (KIT-14); the cash-up sign-off and the month close record who did it, an account officer or any manager, by name, staff ID, and time (ACC-04, ACC-07, 4.5). |
| 0.24 | Consistency review on 12 November 2026, with no new decisions: the dispatch officer and account officer added wherever staff roles are listed (users, attribution 4.5, cancellation rules 4.6, sign-in 12.1, seed people 18.3, payouts 18.1 and 18.2); a note on which Manager features the officers also use; Need help goes to dispatch (RID-11); alerts and live setting changes in section 10; decision rows for staff roles, Finance, the soup of the day, and report comparison; account officer access to the leaderboard recorded as a Proposal (MGR-34); seeded cash-ups and closed months; feature rows put in number order. |
| 0.23 | Owner decisions on 12 November 2026: the soup of the day is set by a manager each day and shows in the customer app (KIT-17); two new staff roles, the dispatch officer (DSP-01 to DSP-06: customer contact with Call and WhatsApp, live riders panel, rider help, assigning orders to riders, cancellation requests) and the account officer (ACC-01 to ACC-07: rider payouts, a Finance menu with the monthly statement, daily cash-up, audit trail, exports, and close month); a role and menu table (3.0); a manager setting for the restaurant’s WhatsApp number (MGR-36, CUS-19); orders assigned by dispatch in the rider app (RID-23); CashUp, MonthClose, and Adjustment records; and report comparison moved to possible future updates (14.0). Rider earnings gain an All time period and an Owed list (RID-18). |
| 0.22 | Owner decisions on 12 November 2026: going offline is blocked while a rider carries an order (RID-02), and rider alert sounds come with push notifications, with vibration from the first build (RID-14). |
| 0.21 | Owner decision on 12 November 2026: frontend first. The app screens are built on demo data before the backend, starting with the customer app (16). Added the development setup note (development build on a real device, typed routes off). |
| 0.20 | Owner decisions on 11 November 2026: Node.js 24 LTS instead of 26; npm workspaces instead of pnpm; the cancellation limit is a manager setting from 3 to 7 in 7 days (MGR-35); an order's load is shown as a number against the budget ("Load 5 of 6"); planned CancellationRequest, HelpRequest, and Alert records, and batch distance and cancellation limit settings; the repository is ARMSTRONG-AISOSA/casual-kitchen-express. Later the same day: `@cloudflare/vitest-plugin` 1.4.10 replaces the deprecated `@cloudflare/vitest-pool-workers` 0.23.0 (which didn’t support the locked Vitest 5); Android package IDs set (17.2); Uwelu and Idunmwowina added to the delivery range; ESLint 9.39.5 replaces 10.13.0; Expo packages pinned exactly; install-script and security-check notes added (15); Android builds limited to arm64-v8a, with armeabi-v7a added for releases and x86 never built (17.2). |
| 0.19 | Locked every version in section 15 (Expo SDK 58, React Native 0.88.1, TypeScript 6.0.3, Node.js 26 LTS, and all libraries), with a rule of stable releases at least two weeks old. Decided pnpm, Turborepo, TanStack Query, Gifted Charts, React Native styles with tokens, and no website packages. Manager order list now covers any date range, with search and paging. Online numbers run continuously, and walk-in numbers restart daily. Final uniformity review. |
| 0.18 | Customer app: cancellation friction and a repeat-cancellation limit, Orders tabs (In progress and Order history), Deactivate account, a high-friction Danger zone for deletion, a More tab with text pages, and customer IDs. Manager: editable delivery fee and rider pay that flow to the customer and rider apps, deactivation for any account except the owner, value columns in rider and kitchen staff reports, a custom report range, and a customer leaderboard. |
| 0.17 | Added walk-in orders to the kitchen app (4.8), with cash or online payment at the counter, a separate channel in the data, staff attribution, and filtering and sorting by channel. Set the hours: online orders and delivery 8:00 am to 6:00 pm, and walk-in service until 8:30 pm, reflected in the seed data. Decided the remaining proposals (boundary check, batching, load values, tracking values, compression values, battery target, staff codes) and added a list of items to verify at build (16.1). |
| 0.16 | Full review of all documents. Added the delivery boundary at Oluku Market (4.7), order acceptance rules, missing features (delivery range check, closed state, tablet sign-in, counter orders, tracking mode setting, rider settings), refund, rating, and neighbourhood records, and the open items table. Corrected outdated sign-in, email, map, device, and distribution wording, and tidied the feature tables and this log. |
| 0.15 | Decided: riders and kitchen staff sign in with a username and password, hashed with PBKDF2 at about 50,000 iterations (measured at build) and rate-limited. |
| 0.14 | Verified the auth stack (12.2): Google sign-in is compatible with Better Auth, Workers, Hono, Drizzle, and Expo. Found that password hashing on Workers Free is limited to weak settings, with a proposal. Decided the small open items (WhatsApp contact button, minimal analytics, staff app distribution, kitchen staff reports). |
| 0.13 | Decided: rider pay is a fixed amount set by the manager (default ₦1,000), and the seeded history averages about 40 orders on a weekday. |
| 0.12 | Everything is simulated, with about two months of seeded mock history (18). Added the fixed ₦1,500 delivery fee, rider pay tracking with simulated payouts, demo controls, and the fee refund rule. |
| 0.11 | Decided: attribution goes to whoever is signed in on the kitchen tablet, the cancellation and refund rules, and light tracking with a battery-aware fallback. |
| 0.10 | Added staff profiles and unique staff IDs (3.1), who-did-what attribution (4.5), and cancellation and refund proposals (4.6). Decided the optional dark theme. Added the footer contact links. |
| 0.9 | Decided: Google sign-in for customers and managers (no passwords, no forgot-password), manager-reset passwords for riders and staff, and no email sending. Added Google setup notes. |
| 0.8 | Decided: static website on GitHub Pages (Home, About, App, FAQ, footer links), no Play Store for now, Android 10 and above, MIT licence, and minimal Claude Code attribution. Added the sign-in and password-recovery proposal (12.1). |
| 0.7 | Decided: MapLibre with OpenFreeMap for the customer map, Android first, and the API stays on Cloudflare Workers. |
| 0.6 | Verified free-tier limits (10 November 2026) and reviewed all choices for consistency. Decided REST first, Drizzle, Hyperdrive, Durable Objects, Cron Triggers and alarms, three Expo apps in one repository, and simulated payments. Added the request budget, why Neon Functions is not used, and customer map provider options (14.3). |
| 0.5 | Backend changed to TypeScript with Hono on Cloudflare Workers (free plan), replacing Fastify and free sleeping hosts. Rewrote 14.2 with the limits and design responses. Real-time and background jobs updated to Cloudflare options. |
| 0.4 | Decided: TypeScript with Fastify, Cloudflare R2 for image files, free-only API hosting. Added the hosting consequences and design responses (14.2). |
| 0.3 | Decided: Neon (Postgres) with a custom backend. Added the follow-on backend decisions (language, API style, database access, auth, real-time, jobs, file storage, hosting). |
| 0.2 | Decided: object storage for images, React Native with Expo. Added manager historic reports, rider power and location rules, and database options under review. |
| 0.1 | First draft: features, order lifecycle, capacity rules, image pipeline, data model, open decisions. |

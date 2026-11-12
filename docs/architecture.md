# CKE ARCHITECTURE

**Document Status:** Draft v0.20. Records the functions, features, and decisions for the apps and the website. Reviewed end to end on 11 November 2026.  
**Related documents:** `Casual-Kitchen-Express.md` (business and brand, surface level), `design.md` (UI/UX decisions and page flows), and `list-of-areas.md` (delivery areas).

---

## 1. PURPOSE AND SCOPE

This document records **what the system does and how it is put together** for the three apps and the website:

| Client | Users |
|---|---|
| Customer app | Customers |
| Business and Kitchen app | Kitchen staff and managers |
| Rider and Delivery app | Riders |
| Website | Visitors (promotes the app) |

**Status:** planning and design are complete, and the build now happens locally. `progress.md` tracks what has been built.

**Conventions**
- Feature IDs use a prefix per client (CUS, RID, KIT, MGR, WEB) so features can be tracked and referenced.
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
2. One account system with roles (customer, rider, kitchen staff, manager).
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
| Manager | The owner, or another manager. The first manager is set up in configuration with the owner's Google email. | Business and Kitchen app (tablet and phone) | Everything kitchen staff can do, plus menu, prices, accounts, settings, reports, refunds |

Permissions are role-based and enforced by the backend, never only by the app screens.

### 3.1 Staff accounts and profiles

Riders, kitchen staff, and managers are **staff**. A manager creates each rider and kitchen staff account and enters the whole profile, and can edit it later. Riders and kitchen staff sign in with a username and password, and managers sign in with Google (12.1). A new manager is added by their Google email.

| Field | Notes | Required |
|---|---|---|
| Staff ID | Created automatically, unique, and never reused. A readable staff code uses a role prefix, for example R-001 for riders, K-001 for kitchen staff, and M-001 for managers. | Automatic |
| Full name | | Yes |
| Username and temporary password | Riders and kitchen staff only. The password must be changed at the first sign-in. | Yes |
| Role | The system role: rider, kitchen staff, or manager. It controls what the person can do. | Yes |
| Job title | A free-text label, for example "Head cook" or "Delivery rider". It does not change permissions. | No |
| Gender | Optional, with "prefer not to say" | No |
| Phone number | Needed for riders, so the manager can reach them | Yes for riders |
| Home address | Optional | No |
| Photo | Cropped and compressed on the device before upload, like menu images (section 8) | No |

**Rules**
- Accounts are **deactivated, never deleted**, so order history and reports stay accurate.
- Any manager can deactivate or reactivate riders, kitchen staff, and other managers. A deactivated person is signed out straight away and can’t sign in until reactivated. **The owner account can’t be deactivated.**
- Personal details (phone, home address, gender) are visible only to managers and to the person themself. Photos are access-controlled, never public.
- Only collect what will be used. Home address and gender are optional, and the privacy notes state why each item is collected.
- Customers see a rider's first name only.

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
| Cancelled | Cancelled by the customer (before the kitchen acknowledges) or by a manager | Reason and refund status |
| Delivery issue | Customer unreachable or code cannot be entered | "Your rider is trying to reach you" |
| Refund pending / completed | After a cancellation or issue | Refund status |

### 4.4 Delivery code

- A 4-digit code is generated when the order is placed and shown on the customer's tracking screen.
- The code is stored hashed, and wrong attempts are rate-limited.
- The rider enters the code to close the delivery. If the code cannot be used, the rider taps "Need help" and a manager can approve a manual completion, which is recorded in the audit log.

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
| Cancellations, refunds, and manual overrides | The manager (or, for walk-in cancellations before ready, the staff member) |

**Shared kitchen tablet (decided).** Whoever is on shift, meaning signed in on the tablet, is recorded as the person acting. Staff sign in on the tablet with their own username and password at the start of their shift.
- The tablet's top bar always shows who is signed in, with their name and photo.
- A "Switch person" button hands over: the current person signs out and the next one signs in.
- Staff can also be signed in on their own phones at the same time, and actions there are recorded against that phone's owner.
- The tablet signs the person out automatically at 8:30 pm, the walk-in closing time, so a forgotten sign-out does not carry into the next day.
- A manager can correct the person on an order record, for example after a missed handover. The correction is written to the audit log.
- Limitation: if several people work the line on one tablet, every action is recorded against the person signed in. Per-person kitchen reports (MGR-27) therefore show who was on shift, not necessarily who physically did each step.

### 4.6 Cancellation and refund rules (decided)

Payments are simulated, so refunds are simulated too. The statuses, rules, and records are real, and no money moves.

| Stage | Customer | Manager | Refund |
|---|---|---|---|
| Placed or confirmed (before the kitchen acknowledges) | Can cancel, after picking a reason and ticking a confirmation | Can cancel | Full, automatic |
| Acknowledged or preparing | Can request cancellation | Approves or declines | Full if approved before it is ready |
| Ready, rider accepted, or picked up | Cannot cancel. Can contact the business. | Decides case by case | At the manager's discretion |
| An item cannot be made | Told, and offered a substitute or a refund | Removes the item or cancels the order | Partial or full |
| Delivery issue (customer unreachable) | Contacted by the rider | Decides after the rider's attempts | At the manager's discretion |

- Refund statuses are "Refund pending" and then "Refund completed" (simulated).
- The delivery fee is refunded with the order if the order is cancelled before pickup.
- Every cancellation and refund records the reason, the manager, and the time in the audit log.
- The customer’s app shows the cancel option only while cancelling is allowed, as a quiet text link rather than a button.
- **Friction (decided):** the customer must pick a reason and tick a confirmation before Cancel or Send request works.
- **Repeat cancellations (decided):** after a set number of cancellations in 7 days, the customer can only request a cancellation, and a manager decides. The app tells them why. The limit is 3 by default, and managers can set it anywhere from 3 to 7 in Settings (MGR-35). The 7-day window is fixed.
- Cancellation requests are stored as records (CancellationRequest, section 9) with the reason, status (pending, approved, or declined), the deciding manager, and the times.
- Walk-in orders can be cancelled by staff before they are ready, with a reason. The payment is refunded (simulated), and the cancellation is recorded against the staff member.

### 4.7 Delivery area and order acceptance rules

- **Delivery range (decided):** from Uselu on the city side to **Oluku Market** in the north, on the Benin–Lagos Road. CKE does not deliver beyond Oluku Market. Both sides of the expressway in Oluku are in range up to the market, and so are Uwelu, Isihor, Idunmwowina, Iguosa, and the villages of Oluku that lie before the market (`list-of-areas.md`).
- The range is defined by the **neighbourhood list** in Settings (MGR-11), where each area is flagged as in or out of range. The starting list is in `list-of-areas.md`.
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
- **Statuses:** Placed (paid), then Preparing, then Ready (the number is called out), then Collected.
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
| CUS-19 | Contact the restaurant | A button that opens the WhatsApp chat (https://wa.me/2349095466063) | **Decided** |
| CUS-20 | Order cancellation (with friction) | Rules in 4.6. The option is a quiet text link, shown only while cancelling is allowed. The customer must pick a reason and tick a confirmation before Cancel or Send request works. | **Decided** |
| CUS-21 | Demo payment notice | A small, clear label on payment screens ("Demo payment. No money is taken.") | Planned |
| CUS-22 | Sign-in | Continue with Google. No passwords (section 12.1). | **Decided** |
| CUS-23 | Delivery range check | An address outside the delivery range cannot be used for delivery. The app says so and offers pickup (4.7). | **Decided** |
| CUS-24 | Closed and paused states | After 6:00 pm, or while new orders are paused, the customer can browse and see when online orders open (8:00 am), but cannot check out (4.7) | Planned |
| CUS-25 | Deactivate account | Above the Danger zone in Profile, with one confirmation tick. Signs the customer out and keeps everything. Signing in again with Google offers to reactivate. | **Decided** |
| CUS-26 | More tab and text pages | A fourth tab, More, listing Terms and conditions, Privacy policy, About us, Support us, Partner with us, and FAQs. Each is a text page with a back button. | **Decided** |
| CUS-27 | Customer ID | Every customer account has a unique ID (for example C-00418), shown in Profile and used in reports and the leaderboard | **Decided** |

### 5.2 Rider and Delivery app

| ID | Feature | Notes | Status |
|---|---|---|---|
| RID-01 | Sign in with a manager-created account | No public sign-up | Planned |
| RID-02 | Online and offline toggle | One tap | Planned |
| RID-03 | Order queue | Ready orders with order number, pickup point, drop-off neighbourhood, estimated distance, and the order's load against the rider's budget (for example "Load 5 of 6", section 6) | Planned |
| RID-04 | Accept order (first to accept wins) | Order disappears from other riders' queues | Planned |
| RID-05 | Capacity rules | One order by default, up to three if loads fit (section 6) | Planned |
| RID-06 | Active deliveries list | Stops in order, one primary action at a time | Planned |
| RID-07 | Pickup confirmation | Match order number, tap "Picked up" | Planned |
| RID-08 | Navigation to the customer | Opens the rider's installed navigation app (no map inside the rider app, section 7) | Planned |
| RID-09 | Call the customer | From the app, using the contact phone | Planned |
| RID-10 | Delivery code entry | Completes the delivery | Planned |
| RID-11 | Need help | Contacts the manager (unreachable customer, code problem) | Planned |
| RID-12 | Release order | Returns an order to the queue | Planned |
| RID-13 | Day summary | Completed deliveries for the day | Planned |
| RID-14 | Sound and vibration alerts | New orders in the queue, status changes | Planned |
| RID-15 | Screen stays awake only on pickup and code entry | Short windows only, to save battery | Planned |
| RID-16 | Poor-network tolerance | Queue actions retried, last known state shown | Planned |
| RID-17 | Light location tracking | Only during an active delivery, low frequency, balanced accuracy (section 7) | Planned |
| RID-18 | Earnings | Today, this week, this month, and a per-delivery list with each delivery's pay and its simulated payout status (18.2) | **Decided** |
| RID-19 | Lean by design | No maps, images, or animation in the app; power rules in section 7 | Planned |
| RID-20 | Password handled by the manager | No forgot-password screen. The sign-in screen tells the rider to ask the manager, who resets the password. After a reset, the rider must set a new password at the next sign-in. | **Decided** |
| RID-21 | My profile | A read-only view of their own details and staff ID. No photo is shown, to keep the app image-free. | Planned |
| RID-22 | Settings | Theme (light, dark, or follow the phone), and sound and vibration | Planned |

### 5.3 Business and Kitchen app

One app, two roles. The tablet (counter) shows the full order board, and phones show alerts and quick actions.

**Kitchen**

| ID | Feature | Notes | Status |
|---|---|---|---|
| KIT-01 | Order board | New, Preparing, Ready columns on the tablet | Planned |
| KIT-02 | New order alert | Sound and visual alert | Planned |
| KIT-03 | Acknowledge ticket | One tap; moves the order forward | Planned |
| KIT-04 | Item checklist by station | Rice, soups and swallows, snacks and drinks | Planned |
| KIT-05 | Mark ready | One tap; delivery orders enter the rider queue | Planned |
| KIT-06 | Handoff view | Shows which rider accepted, clears on pickup | Planned |
| KIT-07 | Pickup orders | "Ready for collection" and "Collected" | Planned |
| KIT-08 | Sold-out toggle | One tap from the board or menu list | Planned |
| KIT-09 | Item unavailable on an order | Flags the manager | Planned |
| KIT-10 | Packing guide | Shows the packaging rule for each item type | Later |
| KIT-11 | Staff attribution | Each action is recorded against whoever is signed in on the tablet or phone (4.5) | **Decided** |
| KIT-12 | On-shift sign-in on the tablet | Staff sign in with their own username and password, the top bar shows who is signed in, "Switch person" hands over, and the tablet signs out at 8:30 pm | **Decided** |
| KIT-13 | Walk-in order entry | Staff enter an order at the counter with big item tiles by category, choose eat in or take away, add an optional name, and see the order number to call out (4.8) | **Decided** |
| KIT-14 | Walk-in payment at the counter | Cash (amount received, change due) or online (card or transfer), all simulated, taken at the point of placing the order | **Decided** |
| KIT-15 | Walk-in tickets on the board | A "Walk-in" badge, eat in or take away shown, and the steps Preparing, Ready, and Collected | **Decided** |
| KIT-16 | Board filter | Filter the board to All, Online, or Walk-in | **Decided** |

**Manager**

| ID | Feature | Notes | Status |
|---|---|---|---|
| MGR-01 | Live dashboard | Today's orders and sales with the online and walk-in split, and orders in progress | Planned |
| MGR-02 | Rider overview | Who is online, who is delivering what | Planned |
| MGR-03 | Create, edit, deactivate, and reactivate rider accounts | Username and password, plus the profile in 3.1 (name, role, job title, gender, phone, home address, photo). The manager enters everything and can edit it later. | **Decided** |
| MGR-04 | Create, edit, deactivate, and reactivate kitchen staff and manager accounts | The same profile fields. Kitchen staff use a username and password, and managers use Google. The owner account can’t be deactivated. | **Decided** |
| MGR-05 | Menu management | Add, edit, delete items | Planned |
| MGR-06 | Item images with compression | Upload, crop, compress, replace, remove (section 8) | Planned |
| MGR-07 | Prices and availability | Edit prices, mark sold out | Planned |
| MGR-08 | Categories and options | Proteins, sides, extras | Planned |
| MGR-09 | Opening hours | Online order hours (8:00 am to 6:00 pm) and walk-in hours (8:00 am to 8:30 pm), with overrides | **Decided** |
| MGR-10 | Pause new orders | One switch | Planned |
| MGR-11 | Delivery area settings | The neighbourhood list, with each area flagged in or out of range. The boundary is Oluku Market in the north and Uselu on the city side (4.7). | Planned |
| MGR-12 | Rider capacity settings | Load values and capacity budget (section 6) | Planned |
| MGR-13 | Order list and search | Today, yesterday, or **any date range back to the first order**. Search by order number or customer ID. Filter by channel (online or walk-in), status, staff member, and payment method. Sort by time placed or amount. Shows the count and total value, and loads long ranges in pages. | **Decided** |
| MGR-14 | Alerts | Order unaccepted by riders, order stuck, item unavailable | Planned |
| MGR-15 | Cancellations and refunds | Rules in 4.6, with simulated refunds | **Decided** |
| MGR-16 | Manual completion approval | For delivery-code problems | Planned |
| MGR-17 | Order volume reports | Orders by hour, day, week, and month; peak times; delivery and pickup split; online and walk-in split; completed and cancelled | Planned |
| MGR-18 | Sales reports | Total sales, average order value, payment method split (cash, card, transfer), online and walk-in split, refunds | Planned |
| MGR-19 | Timing reports | Time the order was placed, time to acknowledge, preparation time, wait for a rider, delivery time, and total time; averages and slowest orders | Planned |
| MGR-20 | Rider and area reports | Per rider: deliveries, order value delivered, delivery fees, rider pay, and average delivery time. Per neighbourhood: orders and average delivery time. | Planned |
| MGR-21 | Menu reports | Top items, revenue by item and category, how often items sell out | Planned |
| MGR-22 | Customer reports | New and returning customers, order frequency (online orders only) | Planned |
| MGR-23 | Historic data | 7, 30, or 60 days, or a **custom range** of dates; comparison with the previous period of the same length where data exists; CSV export; order history is kept permanently | **Decided** |
| MGR-24 | Order-level detail | Full timeline of every order with each status timestamp | Planned |
| MGR-25 | Reset a rider or staff password | Shows a temporary password once. The person must change it at the next sign-in. | **Decided** |
| MGR-26 | Manager sign-in | Managers continue with Google, so there is no password to recover (section 12.1) | **Decided** |
| MGR-27 | Kitchen staff reports | Per staff member: orders handled (online and walk-in), order value handled, and average preparation time. Shows who was signed in (4.5). | Planned |
| MGR-28 | Demo controls | Create orders, auto-play a simulated kitchen and riders, and set the speed (18.4) | Planned |
| MGR-29 | Reset demo data | Wipes and regenerates the historic mock data (18.3), with confirmation | Planned |
| MGR-30 | Rider pay and payouts | Each rider's owed balance and per-delivery pay, mark a period as paid (simulated), and payout history | Planned |
| MGR-31 | Pricing and pay settings | The delivery fee (₦1,500 by default) and the rider pay per delivery (₦1,000 by default) are both editable. Changes show in the customer app and rider app straight away, apply to new orders and deliveries only, and are written to the audit log. Rider pay can’t exceed the delivery fee. | **Decided** |
| MGR-32 | Rider tracking mode setting | Light (default) or milestones only (section 7) | **Decided** |
| MGR-33 | Channel filter and sort | The order list, dashboard, and reports can be filtered to online, walk-in, or all, and sorted by time placed, amount, staff member, or payment method | **Decided** |
| MGR-34 | Customer leaderboard | Customers ranked by customer ID for any report period, sortable by total spent or number of orders. Managers only, online orders only. | **Decided** |
| MGR-35 | Cancellation limit setting | The number of cancellations in 7 days after which a customer can only request a cancellation. 3 by default, adjustable from 3 to 7. Changes are written to the audit log. (4.6) | **Decided** |

### 5.4 Website

A static website (plain HTML, CSS, and JavaScript, with no packages) on GitHub Pages. It promotes the business, but mainly the app.

| ID | Feature | Notes | Status |
|---|---|---|---|
| WEB-01 | Home page | Promotes the business, with the app as the main focus: tagline, app highlights, how ordering works, and a clear download button | Planned |
| WEB-02 | About page | The business, its food, the delivery area (Uselu to Oluku Market), and the brand's values. Carries one small attribution line (section 17.4). | Planned |
| WEB-03 | App page | More detail and the full feature list for the customer app, screenshots, install steps for Android, system requirement (Android 10 or newer), the latest version, and the download | Planned |
| WEB-04 | FAQ page | Common questions, including the delivery area and fee, opening hours, how to install, and why the app is not on the Play Store | Planned |
| WEB-05 | Footer contact links | LinkedIn (https://www.linkedin.com/in/armstrong-omoregie-02367a271/), Google (email: ammycan6@gmail.com), and WhatsApp (https://wa.me/2349095466063). There is no separate contact page. | **Decided** |
| WEB-06 | Footer developer credit | A link to the developer's site (https://bossstrong-dev.vercel.app/) and to GitHub (https://github.com/ARMSTRONG-AISOSA) | Planned |
| WEB-07 | App download | Links to the latest release on GitHub Releases (https://github.com/ARMSTRONG-AISOSA/casual-kitchen-express/releases/latest), with a checksum and the install guide | Planned |
| WEB-08 | SEO and sharing previews | Titles, descriptions, and social previews for each page | Planned |
| WEB-09 | Ordering on the website | The site promotes only and does not take orders | **Decided** |
| WEB-10 | Privacy page | A short privacy policy linked from the footer. The app collects an email and a delivery address, and the Google sign-in setup asks for a privacy policy link. | Planned |

**Hosting note:** GitHub Pages' terms say it is not to be used as free hosting to run an online business or a site mainly directed at commercial transactions, and the site should not be used for sensitive transactions. A promotional site is within those terms while CKE remains a concept project. If CKE became a real business, the site should move to another host. Free static hosts such as Cloudflare Pages are an option. The published site is limited to about 1 GB, with soft limits of about 100 GB of bandwidth a month and 10 builds an hour, far above what a small static site needs.

---

## 6. RIDER CAPACITY AND BATCHING

**Default:** a rider carries **one order at a time**.

**Batching:** a rider may carry **up to three orders** when the orders are small enough. Capacity depends on the volume of each order, not just the count.

- Every menu item has a **load value** set by the manager. Snacks and drinks are light, rice meals are heavier, and soups with swallows are heaviest because of their containers.
- An order's load is the sum of its item loads.
- A rider has a **capacity budget** set by the manager. A rider may accept another order only if the combined load fits the budget and the rider has fewer than three active orders.
- The queue shows a rider only the orders that fit their remaining capacity.
- **Load display (decided):** an order's load is shown as a number against the rider's budget, for example "Load 5 of 6". Orders are not labelled light, medium, or heavy; those labels belong to menu items only.
- Stops are shown in the system's suggested order, nearest first, and the rider can change it.
- Each customer's tracking screen shows their position in the rider's route when the rider has several stops (for example, "Your order is stop 2 of 3").

**Decided starting values:** each item has one of three load levels: light (snacks and drinks) is 1, medium (rice meals, proteins, and sides) is 2, and heavy (soup with swallow) is 3. The default capacity budget is 6 points, and a rider never carries more than three orders. Batched drop-offs must be within about 1.5 km of each other (adjustable in Settings). These values are tuned from real deliveries.

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

Images are compressed **on the device before they leave the app**, so uploads are small and storage stays low. This applies to menu item images (managers) and profile photos (customers).

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

### 8.2 Where images are stored

**Decided:** image files are kept in **object storage**, and only their links (paths or URLs) are stored in the database. Large binary files inside a database make it slower and more expensive to store and back up, so the database holds just the references, along with each image's size and dimensions.

### 8.3 Replacing and deleting

- Replacing an image uploads a new compressed file and then removes the old file.
- Deleting a menu item asks for confirmation, and its images are cleaned up. Items that appear in past orders are archived rather than erased, so order history stays accurate.

---

## 9. DATA MODEL DRAFT

Entities and key fields, as a starting point for the Drizzle schema. Better Auth's own tables (users, sessions, and accounts) belong to the same schema and are not repeated here.

**Demo data:** every seeded record is flagged as demo so it can be wiped and regenerated (18.3).

**Order list at any range:** the API returns orders for any date range, filtered and sorted on the server and paged with a cursor, so a long range never loads all at once. Orders are indexed by placed time, channel, status, staff, and customer.

**Historic data:** orders, payments, status events, and deliveries are kept permanently so managers can look at any past period. Every status change is stored with its time, which makes the timing reports (preparation time, wait for a rider, delivery time) possible. Menu items that appear in past orders are archived, never erased.

| Entity | Key fields |
|---|---|
| User | id, email, password or sign-in method, role, status, created at |
| CustomerProfile | user id, customer code (unique, for example C-00418), name, gender (optional), photo, default address id, account status (active, deactivated, or deleted), recent cancellation count |
| Address | id, user id, label, street, area or landmark, neighbourhood, contact phone, coordinates, is default |
| StaffProfile | user id, staff code (unique, never reused), full name, username, role (rider, kitchen staff, manager), job title, gender (optional), phone, home address (optional), photo (link), status (active or deactivated), created by, created at |
| RiderState | user id, status (online or offline), capacity budget override |
| MenuCategory | id, name, sort order |
| MenuItem | id, category id, name, description, price, image id, available, station, load value, archived |
| ItemOption | id, item id, name, price change, is default |
| Order | id, number (O- or W- prefix), channel (online or walk-in), customer id (empty for walk-ins), type (delivery or pickup for online orders, eat in or take away for walk-ins), status, food total, delivery fee, total, payment method, address, neighbourhood, delivery code hash, entered by (walk-ins), optional label, placed at, acknowledged at, ready at, picked up at, delivered at, collected at |
| OrderItem | id, order id, item id, name and price at time of order, quantity, options, notes |
| OrderStatusEvent | id, order id, status, actor (a staff ID, a customer ID, or the system), time |
| Payment | id, order id, method (card, transfer, or cash, all simulated), demo reference, amount, cash received and change due (cash only), taken by (walk-ins), status. No card numbers are stored. |
| Delivery | id, order id, rider id, batch group, stop number, picked up at, delivered at, distance, rider pay |
| Payout | id, rider id, period start and end, amount, status (owed or paid, simulated), paid at, paid by |
| Refund | id, order id, amount, kind (full or partial), reason, status (pending or completed, simulated), requested by, decided by, times |
| Rating | id, order id, customer id, stars, time |
| Neighbourhood | id, name, in delivery range (yes or no), sort order |
| DeviceToken | id, user id, platform, token |
| Notification | id, user id, type, content, sent at |
| MediaAsset | id, owner, storage path, size, dimensions, format |
| Setting | online order hours, walk-in hours, tablet sign-out time, pause flag, delivery boundary, capacity defaults, batch drop-off distance (about 1.5 km by default), rider tracking mode, delivery fee (₦1,500 by default), rider pay per delivery (₦1,000 by default), cancellation limit (3 in 7 days by default, adjustable from 3 to 7). Price and limit changes are written to the audit log. |
| CancellationRequest (planned) | id, order id, customer id, reason, status (pending, approved, or declined), decided by, requested at, decided at |
| HelpRequest (planned) | id, order id, rider id, reason (customer unreachable, code doesn’t work, or other), status (open or resolved), resolution (manual completion or kept open), resolved by, times |
| Alert (planned) | id, kind (order waiting for a rider, order stuck, item unavailable, cancellation request, rider needs help), order id, related request id, created at, cleared by, cleared at |
| AuditLog | id, actor, action, target, time |
| ReportView | Pre-computed summaries (daily and hourly totals, timings, per rider, per item) so manager reports stay fast and historic data stays queryable |

---

## 10. REAL-TIME AND NOTIFICATIONS

**Real-time needs**
- New order to the kitchen board.
- Status changes to the customer's tracking screen.
- New ready orders appear in rider queues, and accepted orders disappear from other riders' queues immediately.
- Rider location to the customer while delivering, at the low frequency set in section 7.

**Race handling:** two riders tapping "Accept" at the same time must result in one winner, enforced by the backend.

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
- Customers and managers sign in with Google. Rider and kitchen staff accounts are created by managers and use a username and password (12.1).
- Delivery codes are hashed and rate-limited.
- Manual overrides and account changes are written to an audit log.
- Personal data collected: for customers, email, address, optional gender, name, and photo; for staff, name, phone, optional gender and home address, and photo. Each item has a stated purpose, in line with Nigeria's data protection rules, and customers can deactivate or delete their account in the app.
- Rider location is collected only while a rider is online with an active delivery.
- All traffic is encrypted, and secrets are never stored in the apps.
- Payments are simulated, so no real card or bank details are ever collected, even for the demo flow.
- Seeded customers and staff are fake, with emails on a reserved example domain, so nothing can ever be sent to a real person.
- Staff personal details (phone, home address, gender) are visible only to managers and the person themself. Staff photos are access-controlled and never public (3.1).

### 12.1 Sign-in and password recovery (decided)

**Do we need a "forgot password" feature?** No. Customers and managers use Google sign-in, which has no password, and riders and kitchen staff have passwords that a manager resets.

| Account | Created by | Sign-in | Forgot-password feature? | Recovery |
|---|---|---|---|---|
| Customer | Self, at checkout | Continue with Google. No password. | No | Nothing to recover |
| Manager | The owner or another manager | Continue with Google. No password. | No | Nothing to recover |
| Rider | A manager, who also enters the profile (3.1) | Username and a password set by the manager | No self-service | The manager resets it, and a temporary password is shown once |
| Kitchen staff | A manager | Same as riders | No self-service | Same as riders |

**Why:** a forgot-password flow needs email sending, and so does an email one-time-code sign-in. Free email services typically require a verified sending domain to reach other people. Resend's free plan, for example, allows 3,000 emails a month, 100 a day, and one verified domain, and a domain usually costs a small yearly fee (not verified here). Google sign-in needs no email sending, no domain, and no password, and it is one tap on Android.

**Trade-offs of Google sign-in:** customers need a Google account, which almost all Android users have.

**Google setup notes** (checked 10 November 2026; confirm in Google's console when building)
- A free Google Cloud project holds the sign-in configuration.
- The Android sign-in client is tied to the app's package name and the **SHA-1 fingerprint of its signing key**. Debug and release builds have different keys, and the release key must never change (17.2).
- The API verifies the Google ID token and then starts its own session. A web client ID is used for that check.
- With only the basic scopes (openid, email, profile), any Google account can sign in, even while the consent screen is in testing mode. Publishing it ("In production") makes it available to everyone and does not require Google's verification review for these basic scopes.
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
| Password sign-in (riders and staff) | **The risk.** Workers Free allows about 10 ms of CPU per request. Common password hashes (bcrypt, scrypt) take about 70 ms or more and fail. The workable option is PBKDF2 through the native Web Crypto API. The Workers runtime refuses more than 100,000 iterations, whatever the plan. Measurements from open-source projects: about 13 ms at 100,000 iterations and about 6 ms at 50,000. The usual OWASP recommendation of 600,000 cannot run on Workers. |
| Not verified | Better Auth's username plugin, its admin features for creating users, and its custom password-hash setting. To confirm when building. |

**Decided: riders and kitchen staff keep username and password.** Hash with native PBKDF2 at about 50,000 iterations, measured on a real deployment, and rate-limit logins with a Durable Object. This is weaker than the usual recommendation, which is acceptable because these accounts guard only simulated data, and the trade-off is stated here. The alternative is Google sign-in for staff as well, which removes passwords completely.

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
| Staff password hashing | PBKDF2 at about 50,000 iterations with rate limiting; Google sign-in for staff too | PBKDF2 with rate limiting, with the iteration count measured at build | **Decided** |
| Real-time | Durable Objects (WebSockets with hibernation) | Verified available on the free plan, SQLite-backed (14.2) | **Decided** |
| Background jobs | Cron Triggers for scheduled work; Durable Object alarms for per-order timers; Queues only if needed | Cron Triggers are free (5 per account). Alarms on the free plan are to be verified. | **Decided** (direction) |
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
| Customer IDs and leaderboard | No ranking; manager leaderboard; public leaderboard | Unique customer IDs and a manager-only leaderboard by spend or orders | **Decided** |
| Report periods | Fixed periods only; fixed and custom | 7, 30, and 60 days, plus a custom date range | **Decided** |
| Owner protection | Any manager can be deactivated; owner protected | The owner account can’t be deactivated | **Decided** |
| Rider pay per delivery | A fixed amount set by the manager; the full delivery fee; a percentage | A fixed amount set by the manager, default ₦1,000 | **Decided** |
| Simulation | Everything simulated (payments, refunds, delivery, payouts); real services | Everything simulated (18.1) | **Decided** |
| Historic mock data | About two months seeded at build time; none | About two months, regenerated on demand (18.3) | **Decided** |
| Optional dark theme | Light only; optional dark theme | Optional dark theme in all apps, chosen in Settings (light by default) | **Decided** |
| Staff profiles and IDs | Manager-entered profiles with unique staff IDs; basic accounts only | Manager-entered profiles with unique staff IDs (3.1) | **Decided** |
| Shared kitchen tablet attribution | Whoever is signed in on the tablet | Staff sign in on the tablet at the start of their shift (4.5) | **Decided** |
| Delivery range | From Uselu to Oluku Market | No deliveries beyond Oluku Market (4.7) | **Decided** |
| Delivery boundary check | A boundary polygon plus the neighbourhood list; the neighbourhood list only | A boundary polygon in Settings with a point-in-polygon check on the pin (4.7) | **Decided** |
| Batched deliveries: stop order | The system suggests the order; the rider chooses | The system suggests, nearest first, and the rider can change it | **Decided** |
| Batched deliveries: area | Anywhere in range; the same or adjacent neighbourhoods; drop-offs within a set distance | Drop-offs within about 1.5 km of each other, adjustable in Settings | **Decided** |
| Load values and capacity budget | A simple three-level load per item type; fine-grained values | Light 1, medium 2, heavy 3, with a budget of 6 and at most three orders (section 6) | **Decided** |
| Walk-in orders | Entered in the kitchen app; left out of the system | Entered in the kitchen app and recorded as a separate channel (4.8) | **Decided** |
| Walk-in payments | Cash; online (card or transfer) | Both, taken at the counter when the order is placed, and simulated | **Decided** |
| Opening hours | One set of hours; separate online and walk-in hours | Online orders and delivery 8:00 am to 6:00 pm. Walk-in service until 8:30 pm. | **Decided** |
| Image compression values | Tune at build; set now | 1200 px and 250 KB for menu images, 512 px and 80 KB for profiles, quality about 78 | **Decided** |
| Battery target | Set after testing; set now | No more than about 10% an hour during an active delivery (7.5) | **Decided** |
| Tracking values | Tune at build; set now | Balanced accuracy, about every 45 seconds and 100 metres, and a geofence of about 300 metres | **Decided** |
| Staff code format | Role prefix with a number; random IDs only | R-001, K-001, and M-001 style codes alongside the unique ID | **Decided** |

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

**Decided:** the API is written in TypeScript with Hono and runs on **Cloudflare Workers** (free plan). This was reconfirmed on 10 November 2026 after Neon's own Functions were considered. Real-time runs on Durable Objects. Neon holds the data and Cloudflare R2 holds the images. Nothing needs a separate host.

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
| expo-notifications | ~58.1.7 | Push |
| expo-device | ~58.0.5 | Push registration |
| expo-location | ~58.0.20 | Rider tracking and the arrival geofence (rider app) |
| expo-task-manager | ~58.0.12 | Background location (rider app) |
| expo-battery | ~58.0.3 | Battery-aware tracking (rider app) |
| expo-keep-awake | ~58.0.3 | Screen awake on pickup and code entry (rider app) and on the kitchen tablet |
| expo-image-picker | ~58.0.10 | Photos (customer profile, manager menu and staff) |
| expo-image-manipulator | ~58.0.16 | Crop, resize, and compress before upload |
| expo-image | ~58.0.18 | Showing menu photos with caching |
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
| hono | **4.13.14** | The API |
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

**Platform:** every step targets Android first. iOS is added later.

### 16.1 To verify at build

These checks were either not possible during planning or depend on the live setup.

1. Better Auth's username plugin, its admin features for creating users, and its custom password-hash setting.
2. The real PBKDF2 timing at about 50,000 iterations on a deployed Worker, to confirm it fits the 10 ms CPU limit.
3. Durable Object alarms and WebSocket hibernation on the free plan, and the daily request counts they use.
4. Background location, the Android foreground-service notification, and the battery and heat target (7.5) on a mid-range phone.
5. The Google sign-in console setup: package name, release-key fingerprint, consent screen, and the privacy policy link.
6. The Hyperdrive caching settings (off for live order data), and Neon's current free-plan storage allowance.
7. OpenFreeMap's current usage terms, and the required map credit.
8. A re-check of every free allowance (Cloudflare, Neon, and Expo) just before building.
9. The Android install flow, unknown-source and Play Protect prompts, and the release signing key, on real Android 10 and newer phones.
10. A quick check that Android 10 and above suits the target users' phones.
11. The seed script's own checks (18.3), including the separate online and walk-in hours.
12. The delivery boundary polygon, drawn from map pins from Uselu to Oluku Market.
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
| Signing | One signing key per app, kept safe and backed up. The same key must be used for every update, and Google sign-in is tied to the key's fingerprint. |
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
| Rider pay and payouts | Calculated from real order records. "Paid" is a status the manager sets, and no money moves. |
| Customers and staff in the history | Fake people with fake details (18.3). |
| Notifications | Push notifications stay real, because they are free and carry no money or personal risk. They can be switched to logged-only. Email and SMS are not used. |
| Sign-in | Real Google sign-in, so a real person can try the apps. The orders they place are demo orders. |

### 18.2 Delivery fee and rider pay

- **Delivery fee:** a flat fee on every delivery order, on top of the food cost, **₦1,500 by default** and editable by managers in Settings. Pickup has no fee. The fee is not distance-based, and it is one fee per order even when a rider carries several orders.
- The fee is stored on each order when it is placed, so a later change never alters an existing order. A change in Settings (MGR-31) shows in the customer app straight away for new orders. The order total is the food total plus the fee.
- The apps read prices from the API, so a change shows on the next screen that loads.
- **Rider pay:** paid for each delivered order. The amount per delivery is set by the manager in Settings, ₦1,000 by default, and can’t exceed the delivery fee. A change applies to deliveries completed after it and shows in the rider app straight away.
- No pay for an order cancelled before pickup. For an order that fails after pickup (for example, the customer is unreachable), the manager decides.
- **Earnings and payouts:** each delivered order adds to the rider's owed balance. The manager marks a period as paid (a simulated payout), which creates a payout record showing who paid and when. Riders see their owed and paid amounts in the Earnings screen (RID-18).

### 18.3 Historic mock data

At build time, a seed script fills the database with up to **two months** of history, so the manager's reports and the apps have realistic content from the start.

| Item | Decided starting values (tunable) |
|---|---|
| Window | The last 60 days, ending yesterday. Dates can be rebased so the data always covers the latest two months. |
| Hours | Online orders only from 08:00 to 18:00, with the last online order at 18:00 and deliveries finishing up to about 45 minutes later. Walk-in orders from 08:00 to 20:30. No order of either kind falls outside its hours. |
| Online volume | About 40 orders on a weekday and about 25 at the weekend, roughly 2,000 to 2,200 orders in total |
| Walk-in volume | About one third more records on top of the online ones: about 13 on a weekday and about 8 at the weekend, roughly 700 in total |
| Peaks (West Africa Time) | Online: about 12:00 to 14:30 and about 16:30 to 18:00. Walk-in: about 12:00 to 14:30 and about 17:00 to 20:30. |
| Online order type and payment | About 85% delivery and 15% online pickup. About 60% card and 40% bank transfer (simulated). |
| Walk-in order type and payment | About 60% take away and 40% eat in. About 55% cash, 25% card, and 20% transfer (simulated). |
| Order size | About 2.4 items per online order and about 2.0 per walk-in order. Jollof rice is the most popular item, and combos sell well. |
| Outcomes | Online: about 92% completed, 4% cancelled before acknowledgement, 2% cancelled later with full or partial refunds, and 2% delivery issues. Walk-in: about 98% collected and 2% cancelled before ready, with refunds. |
| Timings | Online: acknowledged in 1 to 3 minutes, prepared in 8 to 20 minutes, 2 to 10 minutes waiting for a rider, and 10 to 25 minutes to deliver, with some delays and a few slow outliers. About 15% of delivery orders are batched. Walk-in: prepared in 6 to 15 minutes, then collected within a few minutes of being ready. |
| People | About 250 fake customers (online only), 4 riders, 4 kitchen staff, and 1 to 2 managers, with fake names and staff IDs. About 60% of online customers reorder. Ratings skew positive. Walk-ins have no customer records. |
| Staff shifts | Two kitchen shifts: 08:00 to 14:00 and 14:00 to 20:30. Every order of both kinds is attributed to the staff member signed in at that time. Riders work from 08:00 until their last delivery, about 18:45. |
| Order numbers | Online numbers run continuously from O-0001 on the first day, so the last day of history ends near O-2163. Walk-in numbers restart at W-001 each day. |
| Money | The delivery fee (₦1,500 by default) on every delivery order, rider pay per delivery, and weekly payouts (older weeks paid, the latest week owed). Walk-in orders carry no fee and no rider pay. Sales are split by channel and payment method. |
| Places | The neighbourhoods in `list-of-areas.md` (to be confirmed), all inside the delivery range from Uselu to Oluku Market |

**Quality rules**
- The script is deterministic (a fixed random seed), so the same demo data can be regenerated.
- Every row is flagged as demo, and the script can wipe and regenerate it (MGR-29).
- The script checks its own output: timestamps are in order, totals add up, refunds match cancellations, no order is in the future, no online order is outside 08:00 to 18:00, no walk-in order is outside 08:00 to 20:30, and every order of both kinds has a staff attribution.
- Fake customers use emails on a reserved example domain, so nothing is ever sent to a real person.
- Size: roughly 15 to 25 MB, well inside Neon's free storage. The script writes straight to the database, so it does not use the API's request budget.

### 18.4 Live simulation (demo controls)

- Managers get **Demo controls**: create a new online order or a new walk-in order, auto-play a simulated kitchen and rider, choose the speed (1x, 5x, or 20x), pause, and reset.
- The simulated rider's position moves along a route between the kitchen and the customer's pin, at the same low update frequency as real tracking. Real GPS can still be tested on real devices.
- Labelling: payment screens carry the demo notice, the manager app shows a small "Demo" chip, and the website FAQ says the app uses demo payments.
- The simulation runs on Durable Object alarms and counts toward the free request limits like real traffic (14.2).

---

## 19. CHANGE LOG

| Version | Change |
|---|---|
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

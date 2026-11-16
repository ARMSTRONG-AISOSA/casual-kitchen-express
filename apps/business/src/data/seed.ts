// Demo data for the Business and Kitchen app. The real data comes from the API once the backend
// exists. Names and numbers are made up.
import { DEFAULTS } from "@cke/validation";

export type Role = "kitchen" | "dispatch" | "accounts" | "manager";
export type Station = "Rice" | "Soups and swallows" | "Snacks and drinks";
export type CategoryId = "rice" | "soup" | "protein" | "snacks" | "drinks" | "combos";

export const ROLE_LABEL: Record<Role, string> = {
  kitchen: "Kitchen staff",
  dispatch: "Dispatch officer",
  accounts: "Account officer",
  manager: "Manager",
};

export type MenuItem = {
  id: string;
  cat: CategoryId;
  name: string;
  desc: string;
  price: number;
  station: Station;
  load: 1 | 2 | 3;
  soldOut?: boolean;
};

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "rice", label: "Rice meals" },
  { id: "soup", label: "Soups and swallows" },
  { id: "protein", label: "Proteins and sides" },
  { id: "snacks", label: "Snacks" },
  { id: "drinks", label: "Drinks" },
  { id: "combos", label: "Combos" },
];

// Prices match the customer app. Rice meals are shown here with chicken, the default protein.
export const MENU: MenuItem[] = [
  {
    id: "jollof",
    cat: "rice",
    name: "Jollof rice with chicken",
    desc: "Smoky party-style jollof.",
    price: 3800,
    station: "Rice",
    load: 2,
  },
  {
    id: "fried",
    cat: "rice",
    name: "Fried rice with chicken",
    desc: "Vegetable fried rice with peas and liver.",
    price: 4000,
    station: "Rice",
    load: 2,
  },
  {
    id: "ricecombo",
    cat: "rice",
    name: "Rice combo with chicken",
    desc: "Half jollof, half fried rice.",
    price: 4300,
    station: "Rice",
    load: 2,
  },
  {
    id: "soup",
    cat: "soup",
    name: "Soup of the day with eba",
    desc: "Today it’s egusi.",
    price: 3000,
    station: "Soups and swallows",
    load: 3,
  },
  {
    id: "poundo",
    cat: "soup",
    name: "Pounded yam (extra)",
    desc: "One extra wrap.",
    price: 1000,
    station: "Soups and swallows",
    load: 3,
  },
  {
    id: "xsoup",
    cat: "soup",
    name: "Extra soup",
    desc: "A second bowl.",
    price: 1200,
    station: "Soups and swallows",
    load: 3,
  },
  {
    id: "chicken",
    cat: "protein",
    name: "Chicken",
    desc: "One piece, peppered.",
    price: 1800,
    station: "Rice",
    load: 2,
  },
  {
    id: "beef",
    cat: "protein",
    name: "Beef",
    desc: "One portion, stewed.",
    price: 1000,
    station: "Rice",
    load: 2,
  },
  {
    id: "fish",
    cat: "protein",
    name: "Fish",
    desc: "One piece, fried.",
    price: 1500,
    station: "Rice",
    load: 2,
    soldOut: true,
  },
  {
    id: "plantain",
    cat: "protein",
    name: "Fried plantain",
    desc: "Sweet, ripe dodo.",
    price: 800,
    station: "Rice",
    load: 2,
  },
  {
    id: "moimoi",
    cat: "protein",
    name: "Moi moi",
    desc: "Steamed bean pudding.",
    price: 800,
    station: "Rice",
    load: 2,
  },
  {
    id: "meatpie",
    cat: "snacks",
    name: "Meat pie",
    desc: "Baked fresh.",
    price: 1200,
    station: "Snacks and drinks",
    load: 1,
  },
  {
    id: "springrolls",
    cat: "snacks",
    name: "Spring rolls",
    desc: "Four pieces.",
    price: 1500,
    station: "Snacks and drinks",
    load: 1,
  },
  {
    id: "water",
    cat: "drinks",
    name: "Bottled water",
    desc: "75 cl.",
    price: 300,
    station: "Snacks and drinks",
    load: 1,
  },
  {
    id: "soda",
    cat: "drinks",
    name: "Soft drink",
    desc: "Chilled, 50 cl.",
    price: 500,
    station: "Snacks and drinks",
    load: 1,
  },
  {
    id: "classic",
    cat: "combos",
    name: "Classic Jollof Combo",
    desc: "Jollof, chicken, plantain, drink.",
    price: 4800,
    station: "Rice",
    load: 2,
  },
  {
    id: "office",
    cat: "combos",
    name: "Office Lunch Combo",
    desc: "Fried rice, beef, coleslaw, water.",
    price: 4100,
    station: "Rice",
    load: 2,
  },
];

/** Soups the kitchen cooks. One is chosen each day as the soup of the day (KIT-17). */
export const SOUPS = ["Egusi", "Efo riro", "Ogbono"];

export type Person = {
  id: string;
  name: string;
  role: Role | "rider";
  username?: string;
  email?: string;
  job: string;
  phone: string;
  active: boolean;
  owner?: boolean;
  /** Optional, with “prefer not to say” (3.1). */
  gender?: "female" | "male" | "prefer_not_to_say";
  /** Optional (3.1). */
  homeAddress?: string;
};

/**
 * How a person signs in, for showing on screen: managers by Google email, everyone else by
 * username. A manager without a Google email yet (the laptop's demo managers) shows the username.
 */
export function signInOf(p: Person): { label: string; value: string } {
  if (p.role === "manager" && p.email) return { label: "Google email", value: p.email };
  if (p.username) return { label: "Username", value: p.username };
  return { label: p.role === "manager" ? "Google email" : "Username", value: "" };
}

export const PEOPLE: Person[] = [
  {
    id: "M-001",
    gender: "male",
    homeAddress: "12 Ekenwan Road, Benin City",
    name: "Efosa Igbinedion",
    role: "manager",
    email: "efosa.cke@gmail.com",
    job: "Owner",
    phone: "0803 555 0100",
    active: true,
    owner: true,
  },
  {
    id: "M-002",
    gender: "female",
    homeAddress: "4 Uselu-Lagos Road, Uselu",
    name: "Ivie Osagie",
    role: "manager",
    email: "ivie.cke@gmail.com",
    job: "Operations manager",
    phone: "0803 555 0101",
    active: true,
  },
  {
    id: "K-001",
    gender: "female",
    homeAddress: "Ekosodin, near the market",
    name: "Blessing Okafor",
    role: "kitchen",
    username: "blessing.k",
    job: "Head cook",
    phone: "0806 555 0120",
    active: true,
  },
  {
    id: "K-002",
    gender: "male",
    name: "Samuel Eze",
    role: "kitchen",
    username: "samuel.k",
    job: "Counter",
    phone: "0806 555 0121",
    active: true,
  },
  {
    id: "D-001",
    gender: "male",
    homeAddress: "BDPA estate, Ugbowo",
    name: "Osas Edo",
    role: "dispatch",
    username: "osas.d",
    job: "Dispatch officer",
    phone: "0807 555 0130",
    active: true,
  },
  {
    id: "A-001",
    gender: "female",
    name: "Ngozi Bello",
    role: "accounts",
    username: "ngozi.a",
    job: "Account officer",
    phone: "0809 555 0140",
    active: true,
  },
  {
    id: "R-001",
    gender: "male",
    homeAddress: "Osasogie",
    name: "Musa Abdullahi",
    role: "rider",
    username: "musa.a",
    job: "Delivery rider",
    phone: "0802 555 0177",
    active: true,
  },
  {
    id: "R-002",
    gender: "male",
    homeAddress: "Uwelu",
    name: "Chidi Nwosu",
    role: "rider",
    username: "chidi.r",
    job: "Delivery rider",
    phone: "0802 555 0178",
    active: true,
  },
  {
    id: "R-003",
    gender: "male",
    name: "Femi Ade",
    role: "rider",
    username: "femi.r",
    job: "Delivery rider",
    phone: "0802 555 0179",
    active: true,
  },
  {
    id: "R-004",
    gender: "male",
    homeAddress: "Isihor",
    name: "Uyi Ogbe",
    role: "rider",
    username: "uyi.r",
    job: "Delivery rider",
    phone: "0802 555 0180",
    active: false,
  },
];

export type Customer = {
  id: string;
  name: string;
  phone: string;
  label: string;
  area: string;
  landmark: string;
};

export const CUSTOMERS: Customer[] = [
  {
    id: "C-01093",
    name: "Ada Okoro",
    phone: "0803 555 0142",
    label: "Home",
    area: "Ekosodin",
    landmark: "Blue gate after Ekosodin Market",
  },
  {
    id: "C-00418",
    name: "Tunde Bakare",
    phone: "0805 555 0193",
    label: "Hostel",
    area: "Uselu",
    landmark: "Opposite the Uselu Market gate",
  },
  {
    id: "C-00777",
    name: "Grace Idahosa",
    phone: "0807 555 0110",
    label: "Home",
    area: "Oluku",
    landmark: "Two streets before Oluku Market, green house",
  },
  {
    id: "C-01120",
    name: "Efe Omoruyi",
    phone: "0802 555 0166",
    label: "Work",
    area: "BDPA estate",
    landmark: "Second street, cream house with a black gate",
  },
  {
    id: "C-00952",
    name: "Kemi Lawal",
    phone: "0808 555 0155",
    label: "Home",
    area: "Ugbowo",
    landmark: "Behind the filling station, yellow block",
  },
];

export type OrderStatus = "new" | "preparing" | "ready" | "out" | "done" | "cancelled";
export type Line = {
  name: string;
  qty: number;
  station: Station;
  ticked: boolean;
  /** The line's database ID, once the order comes from the API (ticking a line sends it). */
  id?: string;
};
/** A timeline entry. `byName` comes with the API, so names show without the staff list. */
export type Event = { label: string; at: number; by: string; byName?: string };

export type Order = {
  no: string;
  /** A practice order from Demo controls (18.4). */
  practice?: boolean;
  channel: "online" | "walkin";
  type: "delivery" | "pickup" | "eatin" | "takeaway";
  status: OrderStatus;
  lines: Line[];
  food: number;
  fee: number;
  pay: "card" | "transfer" | "cash";
  cashReceived?: number;
  placedAt: number;
  customerId?: string;
  name?: string;
  riderId?: string;
  enteredBy?: string;
  events: Event[];
  cancelRequested?: boolean;
  refunded?: number;
  /** From the API (build step 6): the order's database ID, its load, and its rider's name. */
  id?: string;
  load?: number;
  riderName?: string;
  /** "Running a little late" or another exception the customer sees (4.3). */
  exception?: "delayed" | "item_unavailable" | "delivery_issue" | null;
  /** A row from the order list, without its lines yet: the detail screen fetches the rest. */
  partial?: boolean;
  /** Refunds with who made them, from the order detail (MGR-15). */
  refunds?: {
    amount: number;
    kind: "full" | "partial";
    reason: string;
    at: number;
    by: string;
    byName: string;
    byRole: string;
  }[];
  customerPhone?: string;
  address?: {
    label: string;
    street: string | null;
    landmark: string | null;
    neighbourhood: string;
  };
};

export const orderTotal = (o: Order) => o.food + o.fee;
export const orderLoad = (o: Order) =>
  o.load ??
  o.lines.reduce(
    (a, l) =>
      a +
      (MENU.find((m) => m.name === l.name)?.load ?? (/egusi|soup/i.test(l.name) ? 3 : 2)) * l.qty,
    0,
  );

const MIN = 60_000;

const line = (id: string, qty = 1, ticked = false): Line => {
  const m = MENU.find((x) => x.id === id)!;
  // The demo day's soup is egusi, so soup lines carry it (KIT-17).
  const name = id === "soup" ? "Egusi with eba" : id === "xsoup" ? "Extra egusi" : m.name;
  return { name, qty, station: m.station, ticked };
};
const food = (ls: Line[]) =>
  ls.reduce((a, l) => a + (MENU.find((m) => m.name === l.name)?.price ?? 0) * l.qty, 0);

/** Today's orders, timed back from now so the board looks live. */
export function seedOrders(now = Date.now()): Order[] {
  const ago = (m: number) => now - m * MIN;
  const online = (
    no: string,
    customerId: string,
    lines: Line[],
    status: OrderStatus,
    placed: number,
    extra: Partial<Order> = {},
  ): Order => ({
    no,
    channel: "online",
    type: "delivery",
    status,
    lines,
    food: food(lines),
    fee: DEFAULTS.deliveryFee,
    pay: "card",
    placedAt: ago(placed),
    customerId,
    events: [
      { label: "Placed", at: ago(placed), by: customerId },
      { label: "Payment confirmed", at: ago(placed), by: "System" },
      ...(status !== "new" ? [{ label: "Acknowledged", at: ago(placed - 2), by: "K-001" }] : []),
      ...(status === "ready" || status === "out" || status === "done"
        ? [{ label: "Ready", at: ago(placed - 14), by: "K-001" }]
        : []),
      ...(status === "out" || (status === "done" && extra.riderId)
        ? [{ label: "Picked up", at: ago(placed - 17), by: extra.riderId ?? "System" }]
        : []),
    ],
    ...extra,
  });
  const walkin = (
    no: string,
    lines: Line[],
    status: OrderStatus,
    placed: number,
    extra: Partial<Order> = {},
  ): Order => ({
    no,
    channel: "walkin",
    type: "takeaway",
    status,
    lines,
    food: food(lines),
    fee: 0,
    pay: "cash",
    placedAt: ago(placed),
    enteredBy: "K-002",
    events: [{ label: "Placed at the counter", at: ago(placed), by: "K-002" }],
    ...extra,
  });
  return [
    online("O-2179", "C-00952", [line("jollof"), line("soda")], "new", 1),
    walkin("W-006", [line("fried"), line("water")], "new", 2, { name: "Bisi", type: "eatin" }),
    online("O-2176", "C-01093", [line("soup"), line("meatpie")], "preparing", 9),
    walkin("W-005", [line("classic")], "preparing", 7, { pay: "card" }),
    online("O-2177", "C-00777", [line("soup"), line("xsoup")], "ready", 24),
    online("O-2175", "C-00418", [line("fried", 1, true)], "ready", 21, { riderId: "R-001" }),
    online(
      "O-2178",
      "C-01120",
      [line("ricecombo", 1, true), line("meatpie", 1, true), line("soda", 1, true)],
      "ready",
      19,
      {
        type: "pickup",
        fee: 0,
      },
    ),
    online("O-2174", "C-01093", [line("jollof", 1, true), line("soda", 1, true)], "out", 30, {
      riderId: "R-002",
    }),
    walkin("W-004", [line("jollof"), line("plantain")], "done", 52, { cashReceived: 5000 }),
    walkin("W-003", [line("springrolls", 2), line("soda", 2)], "done", 75, { cashReceived: 5000 }),
    online("O-2170", "C-00418", [line("office")], "done", 95, {
      riderId: "R-001",
      pay: "transfer",
    }),
    walkin("W-002", [line("soup")], "done", 110, { cashReceived: 3000 }),
    online("O-2168", "C-01120", [line("classic"), line("water")], "done", 125, {
      riderId: "R-003",
    }),
    walkin("W-001", [line("meatpie"), line("water")], "done", 140, { pay: "transfer" }),
    online("O-2166", "C-00952", [line("fried"), line("beef")], "cancelled", 150, {
      refunded: 6500,
    }),
  ];
}

/** A rider on the riders panel. The name and phone come with the API (DSP-03). */
export type Rider = { id: string; online: boolean; name?: string; phone?: string | null };

export const RIDERS_ONLINE: Rider[] = [
  { id: "R-001", online: true },
  { id: "R-002", online: true },
  { id: "R-003", online: true },
  { id: "R-004", online: false },
];

export type Alert = {
  id: string;
  /** "late": an order past an alert timer: not acknowledged, in the kitchen, or on the road. */
  kind: "unaccepted" | "late" | "help" | "cancel" | "unavailable";
  orderNo: string;
  text: string;
  at: number;
  /** From the API: the request to decide (cancellation or help), and the order's database ID. */
  requestId?: string;
  orderId?: string;
};

export const seedAlerts = (now = Date.now()): Alert[] => [
  {
    id: "a1",
    kind: "unaccepted",
    orderNo: "O-2177",
    text: "No rider has accepted O-2177 for 10 minutes.",
    at: now - 10 * MIN,
  },
  {
    id: "a2",
    kind: "help",
    orderNo: "O-2174",
    text: "Chidi needs help with O-2174: the code doesn’t work.",
    at: now - 3 * MIN,
  },
  {
    id: "a3",
    kind: "cancel",
    orderNo: "O-2176",
    text: "Ada asked to cancel O-2176: Taking too long.",
    at: now - 2 * MIN,
  },
];

export type CashUp = {
  date: string;
  expected: number;
  counted: number | null;
  countedBy?: string;
  /** Whoever signed it off, an account officer or a manager, and when (ACC-04). */
  signedOffBy?: string;
  signedOffAt?: number;
  note?: string;
};

/** A month close (ACC-07): who closed it and when. */
export type MonthClose = { month: MonthKey; by: string; at: number };

export const seedCashUps = (now = Date.now()): CashUp[] => [
  {
    date: "Wed 11 Nov",
    expected: 42600,
    counted: 42600,
    countedBy: "K-002",
    signedOffBy: "A-001",
    signedOffAt: now - 22 * 60 * MIN,
  },
  {
    date: "Tue 10 Nov",
    expected: 38900,
    counted: 38400,
    countedBy: "K-002",
    note: "Short ₦500, counted twice",
  },
  {
    date: "Mon 9 Nov",
    expected: 45100,
    counted: 45100,
    countedBy: "K-001",
    signedOffBy: "M-002",
    signedOffAt: now - 3 * 24 * 60 * MIN,
  },
  {
    date: "Sun 8 Nov",
    expected: 29800,
    counted: 29800,
    countedBy: "K-002",
    signedOffBy: "A-001",
    signedOffAt: now - 4 * 24 * 60 * MIN,
  },
];

export const seedMonthCloses = (now = Date.now()): MonthClose[] => [
  { month: "Oct 2026", by: "A-001", at: now - 10 * 24 * 60 * MIN },
];

export type Payout = {
  riderId: string;
  period: string;
  deliveries: number;
  amount: number;
  paidBy: string;
};

export const PAYOUTS: Payout[] = [
  { riderId: "R-001", period: "Week to Sun 8 Nov", deliveries: 31, amount: 31000, paidBy: "A-001" },
  { riderId: "R-002", period: "Week to Sun 8 Nov", deliveries: 27, amount: 27000, paidBy: "A-001" },
  { riderId: "R-003", period: "Week to Sun 8 Nov", deliveries: 22, amount: 22000, paidBy: "M-002" },
];

/** Unpaid deliveries this week before today, per rider. */
export const OWED_EARLIER: Record<string, number> = {
  "R-001": 16,
  "R-002": 14,
  "R-003": 11,
  "R-004": 0,
};

export type AuditEntry = {
  at: number;
  who: string;
  kind: "money" | "account" | "setting" | "contact";
  action: string;
};

export const seedAudit = (now = Date.now()): AuditEntry[] => [
  { at: now - 30 * MIN, who: "M-002", kind: "setting", action: "Paused new orders for 10 minutes" },
  {
    at: now - 26 * 60 * MIN,
    who: "A-001",
    kind: "money",
    action: "Signed off the cash-up for Wed 11 Nov",
  },
  {
    at: now - 2 * 24 * 60 * MIN,
    who: "M-001",
    kind: "setting",
    action: "Changed rider pay from ₦900 to ₦1,000",
  },
  {
    at: now - 4 * 24 * 60 * MIN,
    who: "A-001",
    kind: "money",
    action: "Paid R-001 ₦31,000 for the week to Sun 8 Nov",
  },
];

export const AREAS = [
  "Ugbowo",
  "Ekosodin",
  "BDPA estate",
  "Osasogie",
  "Uselu",
  "Uwelu",
  "Isihor",
  "Idunmwowina",
  "Iguosa",
  "Oluku (up to Oluku Market)",
];

/** Monthly statements. October is closed; November is open. */
export const STATEMENTS = {
  "Nov 2026": {
    closed: false,
    online: 1452000,
    walkin: 498500,
    card: 1210400,
    transfer: 314600,
    cash: 425500,
    refunds: 31000,
    fees: 333000,
    riderPay: 222000,
    riderPaid: 160000,
    variance: -500,
  },
  "Oct 2026": {
    closed: true,
    online: 3412500,
    walkin: 1176000,
    card: 2830100,
    transfer: 752400,
    cash: 1006000,
    refunds: 58500,
    fees: 802500,
    riderPay: 535000,
    riderPaid: 535000,
    variance: -1200,
  },
} as const;
export type MonthKey = keyof typeof STATEMENTS;

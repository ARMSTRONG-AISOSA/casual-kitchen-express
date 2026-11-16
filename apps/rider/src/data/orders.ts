// Demo data for the rider app. The real queue comes from the API, which also works out distances
// on the server so the rider's phone needs no location for the queue (architecture.md 7.1).

/** Load levels per item (architecture.md 6): light 1, medium 2, heavy 3. */
export type Item = { name: string; load: 1 | 2 | 3 };

export type QueueOrder = {
  no: string;
  area: string;
  landmark: string;
  address: string;
  customer: string;
  phone: string;
  /** Kilometres from the kitchen, worked out by the server. */
  km: number;
  readyMins: number;
  items: Item[];
  /** From the API (build step 6b): the order's database ID, its load, and how many items. */
  id?: string;
  load?: number;
  itemCount?: number;
  /** Assigned by dispatch rather than taken from the queue (DSP-05). */
  assigned?: boolean;
  /** The address's map point, for the arrival geofence (step 6d); and whether it's arriving. */
  pin?: { lat: number; lng: number };
  arriving?: boolean;
};

export const KITCHEN = "CKE kitchen, Ugbowo";

export const QUEUE: QueueOrder[] = [
  {
    no: "O-2174",
    area: "Ekosodin",
    landmark: "Blue gate after Ekosodin Market",
    address: "Ekosodin Road, Ekosodin, Benin City",
    customer: "Ada",
    phone: "08035550142",
    km: 1.2,
    readyMins: 2,
    items: [
      { name: "Jollof rice with chicken", load: 2 },
      { name: "Soft drink", load: 1 },
    ],
  },
  {
    no: "O-2175",
    area: "Uselu",
    landmark: "Opposite the Uselu Market gate",
    address: "Uselu Market, Uselu, Benin City",
    customer: "Tunde",
    phone: "08055550193",
    km: 2.6,
    readyMins: 0,
    items: [{ name: "Fried rice with beef", load: 2 }],
  },
  {
    no: "O-2177",
    area: "Oluku",
    landmark: "Two streets before Oluku Market, green house",
    address: "Oluku Market, Oluku, Benin City",
    customer: "Grace",
    phone: "08075550110",
    km: 4.1,
    readyMins: 1,
    items: [
      { name: "Soup of the day with pounded yam", load: 3 },
      { name: "Meat pie", load: 1 },
    ],
  },
  {
    no: "O-2178",
    area: "BDPA estate",
    landmark: "Second street, cream house with a black gate",
    address: "BDPA Estate, Ugbowo, Benin City",
    customer: "Efe",
    phone: "08025550166",
    km: 1.8,
    readyMins: 4,
    items: [
      { name: "Rice combo with chicken", load: 2 },
      { name: "Meat pie", load: 1 },
      { name: "Soft drink", load: 1 },
    ],
  },
];

export const orderLoad = (o: QueueOrder) => o.load ?? o.items.reduce((a, i) => a + i.load, 0);

export const km = (n: number) => `${n.toFixed(1)} km`;

export function readyText(mins: number) {
  if (mins === 0) return "Ready just now";
  if (mins < 60) return `Ready ${mins} minute${mins === 1 ? "" : "s"} ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `Ready ${h} hour${h === 1 ? "" : "s"} ago` : "Ready more than a day ago";
}

/** Mock delivery code. The real one is made by the API and checked there (architecture.md 4.4). */
export const DEMO_DELIVERY_CODE = "4827";

/** The rider's details, entered by the manager. */
export const RIDER = {
  first: "Musa",
  name: "Musa Abdullahi",
  staffId: "R-002",
  username: "musa.a",
  job: "Delivery rider",
  phone: "0802 555 0177",
  home: "Uselu, near Uselu Market",
  gender: "Male",
};

/** A clock time in the app’s style, such as “9:05 am”. */
export function clockTime(ms: number) {
  const d = new Date(ms);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** Earlier deliveries today, so Home and Earnings aren't empty. Times count back from now, within opening hours. */
export const earlierToday = () =>
  [
    { no: "O-2170", area: "Ekosodin" },
    { no: "O-2167", area: "Uselu" },
    { no: "O-2165", area: "BDPA estate" },
    { no: "O-2164", area: "Osasogie" },
    { no: "O-2161", area: "Ugbowo" },
  ].map((d, i, all) => {
    // Spread across the time since online orders opened at 8:00 am, at most 38 minutes apart.
    const opened = new Date().setHours(8, 0, 0, 0);
    const gap = Math.max(4, Math.min(38, (Date.now() - opened) / 60_000 / (all.length + 1)));
    return { ...d, time: clockTime(Date.now() - (i + 1) * gap * 60_000) };
  });

/** Demo payouts. An account officer or a manager marks each week as paid (a simulated payout, architecture.md 18.2). */
export const PAYOUTS = [
  { week: "Week to Sun 8 Nov", deliveries: 31, amount: 31000 },
  { week: "Week to Sun 1 Nov", deliveries: 28, amount: 28000 },
  { week: "Week to Sun 25 Oct", deliveries: 30, amount: 30000 },
  { week: "Week to Sun 18 Oct", deliveries: 27, amount: 27000 },
];

/** Earlier days this week, delivered but not paid out yet. Today's deliveries are added live. */
export const UNPAID_DAYS = [
  { day: "Wed 11 Nov", deliveries: 5, amount: 5000 },
  { day: "Tue 10 Nov", deliveries: 5, amount: 5000 },
  { day: "Mon 9 Nov", deliveries: 6, amount: 6000 },
];

/** Paid deliveries earlier this month (from Sun 1 Nov), and since the rider started. */
export const PAID_THIS_MONTH = { deliveries: 35, amount: 35000 };
export const PAID_ALL_TIME = { deliveries: 232, amount: 232000 };

export const HELP_REASONS = [
  "The customer isn’t answering",
  "The code doesn’t work",
  "Something else",
];

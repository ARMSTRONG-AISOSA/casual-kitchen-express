// A small typed client for the CKE API. Endpoints are added as the API grows.

export type ApiClientOptions = {
  baseUrl: string;
  /**
   * Extra headers for every request, such as the session cookie from Better Auth's Expo client
   * (architecture.md 12). Called each time, so a new sign-in is picked up straight away.
   */
  getHeaders?: () => Record<string, string>;
  /** Called when the API says the session has ended (signed out, reset, or deactivated). */
  onUnauthorized?: () => void;
};

/** GET /me: the signed-in person (architecture.md 4.5). */
export type Me = {
  id: string;
  name: string;
  role: "customer" | "rider" | "kitchen" | "dispatch" | "accounts" | "manager";
  staffCode: string | null;
  isOwner: boolean;
  mustChangePassword: boolean;
  photoId: string | null;
  jobTitle: string | null;
  phone: string | null;
  homeAddress: string | null;
  gender: "female" | "male" | "prefer_not_to_say" | null;
  /** The Google email (customers and managers); null for staff without one. */
  email: string | null;
  /** The customer ID (C-00001, CUS-27); null for staff. */
  customerCode: string | null;
};

/** A person on the People screen (MGR-03, MGR-04). */
export type StaffMember = {
  code: string;
  fullName: string;
  role: "rider" | "kitchen" | "dispatch" | "accounts" | "manager";
  jobTitle: string | null;
  phone: string | null;
  gender: "female" | "male" | "prefer_not_to_say" | null;
  homeAddress: string | null;
  photoId: string | null;
  status: "active" | "deactivated" | "deleted";
  isOwner: boolean;
  mustChangePassword: boolean;
  username: string | null;
  /** The Google email (managers); null for staff who sign in with a username. */
  email: string | null;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** A soup in the rotation. `imageId` is its photo, once one is uploaded (KIT-17). */
export type Soup = { id: string; name: string; imageId?: string | null };

/** GET /bootstrap (architecture.md 14.4, decision 1). */
export type Bootstrap = {
  version: number;
  settings: {
    onlineHours: [string, string];
    walkinHours: [string, string];
    paused: boolean;
    deliveryFee: number;
    riderPay: number;
    cancellationLimit: number;
    trackingMode: "light" | "milestones";
    whatsappNumber: string;
  };
  /** The kitchen's pin and the delivery boundary ([lng, lat] points, null until drawn), for the map. */
  kitchen: { lat: number; lng: number };
  boundary: [number, number][] | null;
  soupOfTheDay: Soup | null;
  soups: Soup[];
  areas: { id: string; name: string; inRange: boolean }[];
  menu: {
    id: string;
    name: string;
    items: {
      id: string;
      name: string;
      description: string;
      price: number;
      available: boolean;
      load: number;
      isSoup: boolean;
      imageId: string | null;
      options: { id: string; name: string; priceChange: number; isDefault: boolean }[];
    }[];
  }[];
};

/* ---------- orders, alerts, riders, and settings (build step 6) ---------- */

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "acknowledged"
  | "preparing"
  | "ready"
  | "ready_for_collection"
  | "rider_accepted"
  | "picked_up"
  | "arriving"
  | "delivered"
  | "collected"
  | "cancelled";

/** An order as staff see it (the board, the live connection, and the order detail). */
export type StaffOrder = {
  id: string;
  number: string;
  businessDate: string;
  channel: "online" | "walkin";
  type: "delivery" | "pickup" | "eat_in" | "take_away";
  status: OrderStatus;
  exception: "delayed" | "item_unavailable" | "delivery_issue" | null;
  foodTotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: "card" | "transfer" | "cash";
  label: string | null;
  /** A practice order from Demo controls (18.4). */
  practice?: boolean;
  placedAt: string;
  readyAt: string | null;
  load: number;
  items: {
    id: string;
    name: string;
    unitPrice: number;
    quantity: number;
    options: string[];
    station: "rice" | "soups_and_swallows" | "snacks_and_drinks";
    ticked: boolean;
  }[];
  customer: {
    code: string;
    name: string;
    phone?: string;
    address?: {
      label: string;
      street: string | null;
      landmark: string | null;
      neighbourhood: string;
    };
  } | null;
  enteredBy: { code: string; name: string } | null;
  rider: { code: string; name: string } | null;
  version: number;
  /** The order detail only. */
  payment?: {
    method: string;
    amount: number;
    cashReceived: number | null;
    changeDue: number | null;
  } | null;
  refunds?: {
    amount: number;
    kind: "full" | "partial";
    reason: string;
    at: string | null;
    by: { code: string; name: string; role: string } | null;
  }[];
  events?: {
    status: OrderStatus;
    at: string;
    by:
      { kind: "staff"; code: string | null; name: string | null } | { kind: "customer" | "system" };
  }[];
};

/** A row in the order list (any date range). */
export type OrderRow = Pick<
  StaffOrder,
  | "id"
  | "number"
  | "businessDate"
  | "channel"
  | "type"
  | "status"
  | "exception"
  | "total"
  | "paymentMethod"
  | "placedAt"
  | "label"
  | "practice"
> & { customerCode: string | null; customerName: string | null; enteredByCode: string | null };

export type AlertView = {
  id: string;
  kind: "unaccepted" | "stuck" | "item_unavailable" | "cancellation_request" | "help_request";
  createdAt: string;
  cleared: boolean;
  requestId: string | null;
  order: { id: string; number: string; channel: string; status: OrderStatus } | null;
  customerName: string | null;
  reason: string | null;
  rider: { code: string; name: string } | null;
  version: number;
};

export type RiderPanel = {
  code: string;
  name: string;
  phone: string | null;
  online: boolean;
  budget: number;
  load: number;
  carrying: { orderId: string; number: string; status: string; neighbourhood: string }[];
  version: number;
};

export type AlertSettingsView = {
  sound: boolean;
  chime: boolean;
  rider: number;
  acknowledge: number;
  kitchen: number;
  road: number;
  updatedAt: string | null;
  updatedBy: { name: string; code: string } | null;
};

export type SettingsView = {
  settings: {
    onlineHours: [string, string];
    walkinHours: [string, string];
    paused: boolean;
    pausedUntil: string | null;
    capacityBudget: number;
    batchDistanceM: number;
    trackingMode: "light" | "milestones";
    cancellationLimit: number;
    deliveryFee: number;
    riderPay: number;
    whatsappNumber: string;
  };
  alerts: AlertSettingsView;
  areas: { id: string; name: string; inRange: boolean }[];
};

export type RefundChoice =
  { kind: "full" } | { kind: "partial"; amount: number } | { kind: "none" };

/** What arrives over the live connection (GET /live). */
export type LiveMessage =
  | { type: "hello" }
  | { type: "order"; order: StaffOrder; version: number; chime?: boolean }
  | { type: "alert"; alert: AlertView; version: number; beep?: boolean }
  | { type: "rider"; rider: RiderPanel; version: number }
  | { type: "catalog"; version: number }
  | { type: "reload"; reason?: "reset" }
  | { type: "alert-settings"; alerts: AlertSettingsView }
  | { type: "demo-reset"; reset: DemoResetState };

/* ---------- riders (build step 6b) ---------- */

/** A card in the rider's queue: only orders that fit what they carry (RID-03). */
export type QueueCard = {
  orderId: string;
  number: string;
  neighbourhood: string;
  distanceM: number;
  load: number;
  readyAt: string | null;
};

/** One of the rider's stops (RID-06, RID-23). */
export type RiderDelivery = {
  orderId: string;
  number: string;
  status: OrderStatus;
  stop: number;
  picked: boolean;
  assignedByDispatch: boolean;
  customerFirstName: string;
  phone: string | null;
  address: {
    label: string;
    street: string | null;
    landmark: string | null;
    neighbourhood: string;
    lat: number;
    lng: number;
  } | null;
  items: number;
  load: number;
  pickup: string;
};

export type RiderEarnings = {
  today: { n: number; pay: number };
  week: { n: number; pay: number };
  month: { n: number; pay: number };
  allTime: { n: number; pay: number };
  owed: { total: number; days: { day: string; n: number; pay: number }[] };
  todaysDeliveries: { number: string; deliveredAt: string; pay: number }[];
  payouts: {
    periodStart: string;
    periodEnd: string;
    deliveries: number;
    amount: number;
    status: "owed" | "paid";
    paidAt: string | null;
  }[];
};

/** What a rider receives over the live connection. */
export type RiderLiveMessage =
  | { type: "hello" }
  | {
      type: "queue";
      orderId: string;
      item: (QueueCard & { lat: number; lng: number }) | null;
      version: number;
    }
  | { type: "delivery"; delivery: RiderDelivery; removed: boolean; version?: number }
  | { type: "catalog"; version: number }
  | { type: "reload"; reason?: "reset" };

/* ---------- customers (build step 6c) ---------- */

/** A customer's own order (CUS-08, CUS-10): what they see on tracking and in their orders. */
export type MyOrder = {
  id: string;
  number: string;
  type: "delivery" | "pickup";
  status: OrderStatus;
  exception: StaffOrder["exception"];
  foodTotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: "card" | "transfer" | "cash";
  placedAt: string;
  items: { id: string; name: string; unitPrice: number; quantity: number; options: string[] }[];
  address: {
    label: string;
    street: string | null;
    landmark: string | null;
    neighbourhood: string;
    lat: number;
    lng: number;
  } | null;
  events: { status: OrderStatus; at: string }[];
  /** The 4-digit code for the rider, while a delivery is on its way (4.4). */
  deliveryCode: string | null;
  refunds: {
    amount: number;
    kind: "full" | "partial";
    status: "pending" | "completed";
    at: string | null;
  }[];
  cancellationRequest: { status: "pending" | "approved" | "declined" } | null;
  canCancel: boolean;
  /** The rider once one has it: first name, stop "2 of 3", and after pickup the last position. */
  rider: {
    firstName: string;
    stop: number;
    stops: number;
    position: RiderPosition | null;
  } | null;
  version: number;
};

export type RiderPosition = { lat: number; lng: number; at: string };

/** Demo controls: auto-play, its speed, and how many practice orders are still moving. */
/* ----- Reports (MGR-17 to MGR-22, MGR-27, MGR-34) ----- */
export type ReportChannel = "all" | "online" | "walkin";
export type ReportSummary = {
  from: string;
  to: string;
  days: number;
  channel: ReportChannel;
  orders: {
    total: number;
    cancelled: number;
    online: number;
    walkin: number;
    delivery: number;
    pickup: number;
    perDay: { date: string; orders: number; sales: number }[];
    perHour: { hour: number; orders: number }[];
  };
  sales: {
    total: number;
    average: number;
    refunds: number;
    net: number;
    cash: number;
    card: number;
    transfer: number;
    online: number;
    walkin: number;
    deliveryFees: number;
  };
  times: {
    acknowledge: number | null;
    prep: number | null;
    waitRider: number | null;
    delivery: number | null;
    total: number | null;
    slowest: { number: string; minutes: number }[];
  };
  riders: {
    code: string;
    name: string;
    deliveries: number;
    minutes: number | null;
    orderValue: number;
    fees: number;
    pay: number;
  }[];
  areas: { name: string; deliveries: number; minutes: number | null }[];
  staff: { code: string; name: string; orders: number; value: number; prep: number | null }[];
  menu: {
    items: { name: string; quantity: number; revenue: number }[];
    categories: { name: string; revenue: number }[];
    soldOut: number;
    itemsSold: number;
  };
  customers: {
    customers: number;
    newCustomers: number;
    returning: number;
    ordersEach: number;
    leaderboard: { code: string; orders: number; spent: number }[];
  };
};
export type RefundRowView = {
  at: string;
  orderNo: string;
  channel: "online" | "walkin";
  amount: number;
  kind: "full" | "partial";
  reason: string;
  by: string;
  byName: string;
  byRole: string;
};

/* ----- Money: rider pay, cash-up, and Finance (MGR-30, ACC-02 to ACC-07) ----- */
export type RiderPayView = {
  rate: number;
  riders: {
    code: string;
    name: string;
    active: boolean;
    owed: number;
    owedDeliveries: number;
    today: number;
    since: string | null;
  }[];
  history: {
    code: string;
    name: string;
    periodStart: string;
    periodEnd: string;
    deliveries: number;
    amount: number;
    paidAt: string;
    paidBy: string | null;
  }[];
};
export type CashUpView = {
  date: string;
  expected: number;
  counted: number | null;
  countedBy: string | null;
  countedAt: string | null;
  signedOffBy: string | null;
  signedOffAt: string | null;
  note: string | null;
  closed: boolean;
};
export type Statement = {
  sales: number;
  online: number;
  walkin: number;
  byMethod: { cash: number; card: number; transfer: number };
  refunds: number;
  deliveryFees: number;
  riderPayEarned: number;
  riderPayPaid: number;
  cashVariance: number;
  adjustments: number;
  net: number;
  orders: number;
};
export type StatementView = {
  month: string;
  months: string[];
  statement: Statement;
  closed: { by: string | null; at: string } | null;
  canClose: boolean;
  waiting: string[];
  adjustmentsList: { amount: number; reason: string; by: string | null; at: string }[];
};
export type AuditView = {
  at: string;
  kind: string;
  action: string;
  who: string | null;
  name: string | null;
};

/** Reset demo data (MGR-29): the running or last reset, step by step. */
export type DemoResetState = {
  status: "idle" | "running" | "failed";
  step: number;
  steps: number;
  label: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  startedBy: string | null;
  error: string | null;
};
export type DemoState = {
  auto: boolean;
  speed: 1 | 5 | 20;
  open: number;
  reset: DemoResetState;
};

/** What the customer app hears on the live connection. */
export type CustomerLiveMessage =
  | { type: "order"; order: MyOrder; version: number }
  | ({ type: "rider-location"; orderId: string } & RiderPosition)
  | { type: "catalog"; version: number }
  | { type: "reload"; reason?: "reset" };

export type MyAddress = {
  id: string;
  label: string;
  street: string | null;
  landmark: string | null;
  neighbourhoodId: string;
  neighbourhood: string;
  contactPhone: string;
  lat: number;
  lng: number;
  isDefault: boolean;
};

export function createApiClient({ baseUrl, getHeaders, onUnauthorized }: ApiClientOptions) {
  /** Headers for an image request, so staff photos (staff only) load too. */
  const imageHeaders = () => getHeaders?.() ?? {};

  async function send(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    for (const [k, v] of Object.entries(imageHeaders())) if (v) headers.set(k, v);
    headers.set("Accept", "application/json");
    // JSON bodies are strings; a FormData upload sets its own multipart Content-Type.
    if (typeof init.body === "string") headers.set("Content-Type", "application/json");
    const res = await fetch(new URL(path, baseUrl), { ...init, headers });
    if (res.status === 401) onUnauthorized?.();
    if (!res.ok && res.status !== 304) {
      // The API answers errors as { error: "A plain sentence" }, ready to show to the person.
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new ApiError(res.status, body?.error ?? `Request failed with status ${res.status}`);
    }
    return res;
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    return (await (await send(path, init)).json()) as T;
  }

  // The last bootstrap reply and its ETag. Asking again sends the ETag, and an unchanged catalog
  // comes back as a tiny 304, so the app keeps what it has.
  let cached: { etag: string; data: Bootstrap } | null = null;

  const post = <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  return {
    request,
    imageHeaders,
    /** The signed-in person (GET /me). */
    me: () => request<Me>("/me"),
    /** This device's Expo push token for the app it's in (10). `sound`: the rider's Sound setting. */
    savePushToken: (token: string, app: "customer" | "rider" | "business", sound?: boolean) =>
      request<{ saved: boolean }>("/me/push-token", {
        method: "PUT",
        body: JSON.stringify({ token, app, sound }),
      }),
    /** Signing out on this device: no more notifications here. */
    removePushToken: (token: string) =>
      request<{ removed: boolean }>("/me/push-token", {
        method: "DELETE",
        body: JSON.stringify({ token }),
      }),
    /** Change your own password: at the first sign-in, after a reset, or any time (12.1). */
    changePassword: (currentPassword: string, newPassword: string) =>
      post<{ ok: true }>("/me/password", { currentPassword, newPassword }),

    /** People (managers): list, add, edit, reset password, deactivate, reactivate. */
    people: () => request<{ people: StaffMember[] }>("/people"),
    addPerson: (person: {
      role: StaffMember["role"];
      fullName: string;
      username?: string;
      email?: string;
      jobTitle?: string;
      phone?: string;
      gender?: StaffMember["gender"];
      homeAddress?: string;
    }) => post<{ code: string; temporaryPassword: string | null }>("/people", person),
    editPerson: (
      code: string,
      changes: Partial<
        Pick<StaffMember, "fullName" | "role" | "jobTitle" | "phone" | "gender" | "homeAddress">
      >,
    ) =>
      request<{ ok: true }>(`/people/${code}`, { method: "PATCH", body: JSON.stringify(changes) }),
    resetPassword: (code: string) =>
      post<{ temporaryPassword: string }>(`/people/${code}/reset-password`),
    deactivate: (code: string) => post<{ ok: true }>(`/people/${code}/deactivate`),
    reactivate: (code: string) => post<{ ok: true }>(`/people/${code}/reactivate`),

    /** The address of an image, for <Image source={{ uri }}>. Cached on the phone for good. */
    mediaUrl: (id: string) => new URL(`/media/${id}`, baseUrl).toString(),
    /** Sourced photos with their author and licence (GET /media/credits). */
    photoCredits: () =>
      request<{
        credits: {
          id: string;
          sourceKind: "business" | "internet" | null;
          title: string | null;
          author: string | null;
          licence: string | null;
          licenceUrl: string | null;
          sourceUrl: string | null;
        }[];
      }>("/media/credits"),
    /** Light call each app makes on open, so the database wakes early (14.2, response 8). */
    health: () => request<{ ok: true }>("/health"),

    /** Menu, soups, areas, and settings. Cheap to call again: unchanged means a 304. */
    bootstrap: async (): Promise<Bootstrap> => {
      const res = await send(
        "/bootstrap",
        cached ? { headers: { "If-None-Match": cached.etag } } : {},
      );
      if (res.status === 304 && cached) return cached.data;
      const data = (await res.json()) as Bootstrap;
      const etag = res.headers.get("ETag");
      cached = etag ? { etag, data } : null;
      return data;
    },

    /** KIT-17: managers add and remove soups in the rotation. */
    addSoup: (name: string) =>
      request<{ soup: Soup; soups: Soup[] }>("/soups", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    removeSoup: (id: string) => request<{ soups: Soup[] }>(`/soups/${id}`, { method: "DELETE" }),
    /**
     * Adds or replaces a photo in one call (architecture.md 8): the compressed WebP and its credit.
     * The API deletes the old photo, so every app shows the new one and the credits follow.
     * `file` is a Blob, or React Native's { uri, name, type } file object.
     */
    uploadPhoto: (kind: PhotoKind, id: string, file: PhotoFile, credit: PhotoCredit) => {
      const form = new FormData();
      // A Blob gets a file name so the API sees a file part.
      if (file instanceof Blob) form.append("file", file, "photo.webp");
      else form.append("file", file as unknown as Blob);
      for (const [k, v] of Object.entries(credit)) if (v) form.append(k, v);
      return request<{ photoId: string }>(`/photos/${kind}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: form,
      });
    },
    removePhoto: (kind: PhotoKind, id: string) =>
      request<{ photoId: null }>(`/photos/${kind}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    /** A customer changes their name or gender on Profile (CUS-15). */
    updateMe: (changes: { name?: string; gender?: Me["gender"] }) =>
      request<{ ok: true }>("/me", { method: "PATCH", body: JSON.stringify(changes) }),
    /** A customer adds or replaces their profile photo, compressed first (CUS-16, 8.1). */
    uploadMyPhoto: (file: PhotoFile) => {
      const form = new FormData();
      if (file instanceof Blob) form.append("file", file, "photo.webp");
      else form.append("file", file as unknown as Blob);
      return request<{ photoId: string }>("/me/photo", { method: "PUT", body: form });
    },
    removeMyPhoto: () => request<{ photoId: null }>("/me/photo", { method: "DELETE" }),
    /** Each staff member's photo and its credit, by staff code. */
    staffPhotos: () =>
      request<{
        staff: {
          code: string;
          photoId: string | null;
          sourceKind: "business" | "internet" | null;
          author: string | null;
          licence: string | null;
          sourceUrl: string | null;
        }[];
      }>("/staff/photos"),

    /* ----- orders (staff) ----- */
    board: () => request<{ orders: StaffOrder[]; latest: number }>("/orders/board"),
    orderList: (q: Record<string, string>) =>
      request<{ orders: OrderRow[]; count: number; totalValue: number; nextCursor: string | null }>(
        `/orders?${new URLSearchParams(q).toString()}`,
      ),
    order: (id: string) => request<{ order: StaffOrder }>(`/orders/${id}`),
    acknowledge: (id: string) => post<{ order: StaffOrder }>(`/orders/${id}/acknowledge`),
    tickItem: (id: string, itemId: string, ticked: boolean) =>
      request<{ order: StaffOrder }>(`/orders/${id}/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ ticked }),
      }),
    ready: (id: string) => post<{ order: StaffOrder }>(`/orders/${id}/ready`),
    collected: (id: string) => post<{ order: StaffOrder }>(`/orders/${id}/collected`),
    walkIn: (body: {
      type: "eat_in" | "take_away";
      label?: string;
      items: { itemId: string; quantity: number; optionIds?: string[] }[];
      payment: { method: "cash"; received: number } | { method: "card" | "transfer" };
    }) => post<{ order: StaffOrder }>("/orders/walk-in", body),
    cancelOrder: (id: string, reason: string, refund?: RefundChoice) =>
      post<{ ok: true }>(`/orders/${id}/cancel`, { reason, confirm: true, refund }),
    refundOrder: (id: string, refund: RefundChoice, reason: string) =>
      post<{ ok: true }>(`/orders/${id}/refunds`, { refund, reason, confirm: true }),
    itemUnavailable: (id: string, itemId: string) =>
      post<{ ok: true }>(`/orders/${id}/item-unavailable`, { itemId }),
    /** What changed since change number `since` (reconnecting, 14.4 decision 4). */
    changes: (since: number) =>
      request<{ orders: StaffOrder[]; alerts: AlertView[]; latest: number; reload: boolean }>(
        `/changes?since=${since}`,
      ),
    /** The live connection's address (ws:// or wss://). */
    liveUrl: () => new URL("/live", baseUrl).toString().replace(/^http/, "ws"),

    /* ----- customers ----- */
    myOrders: (tab: "progress" | "history") =>
      request<{ orders: MyOrder[]; latest: number }>(`/me/orders?tab=${tab}`),
    myOrder: (id: string) => request<{ order: MyOrder }>(`/me/orders/${id}`),
    placeOrder: (body: {
      type: "delivery" | "pickup";
      addressId?: string;
      payment: "card" | "transfer";
      items: { itemId: string; optionId?: string; quantity: number }[];
    }) => post<{ order: MyOrder }>("/me/orders", body),
    /** Before the kitchen acknowledges (4.6). Over the limit, the API says to request instead. */
    cancelMine: (id: string, reason: string) =>
      post<{ order: MyOrder }>(`/me/orders/${id}/cancel`, { reason, confirm: true }),
    requestCancel: (id: string, reason: string) =>
      post<{ order: MyOrder }>(`/me/orders/${id}/cancellation-request`, { reason, confirm: true }),
    rate: (id: string, stars: number) =>
      post<{ rating: { stars: number } }>(`/me/orders/${id}/rating`, { stars }),
    addresses: () => request<{ addresses: MyAddress[] }>("/me/addresses"),
    addAddress: (a: {
      label: string;
      street?: string;
      landmark?: string;
      neighbourhoodId: string;
      contactPhone: string;
      lat: number;
      lng: number;
      isDefault?: boolean;
    }) => post<{ addresses: MyAddress[]; id: string }>("/me/addresses", a),
    editAddress: (id: string, a: Partial<Omit<MyAddress, "id" | "neighbourhood">>) =>
      request<{ addresses: MyAddress[] }>(`/me/addresses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(a),
      }),
    /* ----- Reports (managers and account officers) ----- */
    reportSummary: (from: string, to: string, channel: ReportChannel) =>
      request<ReportSummary>(
        `/reports/summary?${new URLSearchParams({ from, to, channel }).toString()}`,
      ),
    reportRefunds: (from: string, to: string, channel: ReportChannel) =>
      request<{ refunds: RefundRowView[] }>(
        `/reports/refunds?${new URLSearchParams({ from, to, channel }).toString()}`,
      ),
    /* ----- Money (MGR-30, ACC-02 to ACC-07) ----- */
    riderPay: () => request<RiderPayView>("/payouts"),
    payRider: (code: string) =>
      post<{ payout: { amount: number; deliveries: number } }>(`/payouts/${code}/pay`, {}),
    cashUpToday: () => request<CashUpView>("/finance/cash-up/today"),
    countCash: (counted: number) =>
      request<{ expected: number; counted: number }>("/finance/cash-up/today", {
        method: "PUT",
        body: JSON.stringify({ counted }),
      }),
    cashUps: (month: string) =>
      request<{ cashUps: CashUpView[] }>(`/finance/cash-ups?month=${month}`),
    signOffCashUp: (day: string, note: string | null) =>
      post<{ ok: true }>(`/finance/cash-ups/${day}/sign-off`, { note }),
    statement: (month: string) => request<StatementView>(`/finance/statement?month=${month}`),
    closeMonth: (month: string) => post<{ ok: true }>(`/finance/months/${month}/close`, {}),
    addAdjustment: (amount: number, reason: string) =>
      post<{ ok: true; month: string }>("/finance/adjustments", { amount, reason }),
    audit: (q: { from: string; to: string; kind: string; person?: string }) =>
      request<{ entries: AuditView[] }>(
        `/finance/audit?${new URLSearchParams(
          Object.entries(q).filter(([, v]) => v) as [string, string][],
        ).toString()}`,
      ),
    /* ----- Demo controls (managers, 18.4) ----- */
    demoState: () => request<DemoState>("/demo"),
    /** A practice order: online (a demo customer) or a walk-in. */
    practiceOrder: (kind: "online" | "walkin") =>
      post<{ order: { id: string; number: string } }>("/demo/orders", { kind }),
    setAutoplay: (auto: boolean, speed: 1 | 5 | 20) =>
      request<{ auto: boolean; speed: 1 | 5 | 20 }>("/demo/autoplay", {
        method: "PUT",
        body: JSON.stringify({ auto, speed }),
      }),
    /** Removes every practice order; real orders and the history stay. */
    resetPractice: () => post<{ removed: number }>("/demo/reset", {}),
    /** Reset demo data: every order goes, and everything returns to the start (MGR-29). */
    resetDemo: () => post<{ reset: DemoResetState }>("/demo/reset-all", { confirm: "RESET" }),
    /* ----- riders ----- */
    riderOnline: (online: boolean) =>
      request<{ online: boolean }>("/rider/online", {
        method: "PUT",
        body: JSON.stringify({ online }),
      }),
    /** The rider's position while an order is on the way (RID-17). `tracking: false` means stop. */
    riderLocation: (lat: number, lng: number) =>
      request<{ tracking: boolean }>("/rider/location", {
        method: "PUT",
        body: JSON.stringify({ lat, lng }),
      }),
    riderQueue: () =>
      request<{
        online: boolean;
        carrying: number;
        load: number;
        budget: number;
        orders: QueueCard[];
        hidden: number;
        latest: number;
      }>("/rider/queue"),
    acceptOrder: (orderId: string) =>
      post<{ deliveries: RiderDelivery[] }>(`/rider/queue/${orderId}/accept`),
    riderDeliveries: () =>
      request<{ deliveries: RiderDelivery[]; latest: number }>("/rider/deliveries"),
    reorderDeliveries: (orderIds: string[]) =>
      request<{ deliveries: RiderDelivery[] }>("/rider/deliveries/order", {
        method: "PUT",
        body: JSON.stringify({ orderIds }),
      }),
    pickedUp: (orderId: string) =>
      post<{ deliveries: RiderDelivery[] }>(`/rider/deliveries/${orderId}/picked-up`),
    arriving: (orderId: string) =>
      post<{ deliveries: RiderDelivery[] }>(`/rider/deliveries/${orderId}/arriving`),
    /** The customer's 4-digit code. A wrong code is refused with how many tries are left. */
    deliver: (orderId: string, code: string) =>
      post<{ deliveries: RiderDelivery[] }>(`/rider/deliveries/${orderId}/deliver`, { code }),
    riderHelp: (orderId: string, reason: "customer_unreachable" | "code_problem" | "other") =>
      post<{ ok: true }>(`/rider/deliveries/${orderId}/help`, { reason }),
    release: (orderId: string) =>
      post<{ deliveries: RiderDelivery[] }>(`/rider/deliveries/${orderId}/release`),
    riderEarnings: () => request<RiderEarnings>("/rider/earnings"),
    riderChanges: (since: number) =>
      request<{ queue: QueueCard[]; deliveries: RiderDelivery[]; latest: number }>(
        `/changes?since=${since}`,
      ),
    /* ----- alerts, requests, riders ----- */
    alerts: () => request<{ alerts: AlertView[] }>("/alerts"),
    clearAlert: (id: string) => post<{ ok: true }>(`/alerts/${id}/clear`),
    approveRequest: (id: string, refund?: RefundChoice) =>
      post<{ ok: true }>(`/cancellation-requests/${id}/approve`, { confirm: true, refund }),
    declineRequest: (id: string) => post<{ ok: true }>(`/cancellation-requests/${id}/decline`),
    resolveHelp: (id: string, resolution: "manual_completion" | "kept_open") =>
      post<{ ok: true }>(`/help-requests/${id}/resolve`, { resolution }),
    riders: () => request<{ riders: RiderPanel[] }>("/riders"),
    assign: (orderId: string, riderCode: string) =>
      post<{ ok: true }>(`/orders/${orderId}/assign`, { riderCode }),

    /* ----- settings and the menu ----- */
    settings: () => request<SettingsView>("/settings"),
    changeSettings: (changes: Partial<SettingsView["settings"]>) =>
      request<{ settings: SettingsView["settings"] }>("/settings", {
        method: "PATCH",
        body: JSON.stringify(changes),
      }),
    saveAlertSettings: (a: Omit<AlertSettingsView, "updatedAt" | "updatedBy">) =>
      request<{ alerts: AlertSettingsView; changed: boolean }>("/settings/alerts", {
        method: "PUT",
        body: JSON.stringify(a),
      }),
    setArea: (id: string, inRange: boolean) =>
      request<{ area: { id: string; inRange: boolean } }>(`/settings/areas/${id}`, {
        method: "PUT",
        body: JSON.stringify({ inRange }),
      }),
    setAvailability: (itemId: string, available: boolean) =>
      request<{ ok: true }>(`/menu/items/${itemId}/availability`, {
        method: "PUT",
        body: JSON.stringify({ available }),
      }),
    /** KIT-17: kitchen staff and managers pick today's soup. */
    setSoupOfTheDay: (soupId: string) =>
      request<{ soupOfTheDay: Soup }>("/settings/soup-of-the-day", {
        method: "PUT",
        body: JSON.stringify({ soupId }),
      }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** What a photo belongs to: a menu item (its ID), a soup (its ID), or a staff member (staff code). */
export type PhotoKind = "menu-item" | "soup" | "staff";
export type PhotoFile = Blob | { uri: string; name: string; type: string };
/**
 * A photo's credit. CKE's own photos need nothing more (a photographer and link are optional);
 * photos from the internet need who took them, the licence, and the link.
 */
export type PhotoCredit =
  | { sourceKind: "business"; author?: string; sourceUrl?: string }
  | {
      sourceKind: "internet";
      author: string;
      licence: string;
      licenceUrl?: string;
      sourceUrl: string;
    };

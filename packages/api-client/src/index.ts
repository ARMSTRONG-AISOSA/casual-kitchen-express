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
  email: string;
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

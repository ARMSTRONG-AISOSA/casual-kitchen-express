// A small typed client for the CKE API. Endpoints are added as the API grows.

export type ApiClientOptions = {
  baseUrl: string;
  /** Returns the current session token, if signed in. */
  getToken?: () => Promise<string | null> | string | null;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function createApiClient({ baseUrl, getToken }: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getToken ? await getToken() : null;
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(new URL(path, baseUrl), { ...init, headers });
    if (!res.ok) throw new ApiError(res.status, `Request failed with status ${res.status}`);
    return (await res.json()) as T;
  }

  return {
    request,
    /** Light call each app makes on open, so the database wakes early (14.2, response 8). */
    health: () => request<{ ok: true }>("/health"),
  };
}

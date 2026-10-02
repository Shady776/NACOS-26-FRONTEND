import { BASE_URL } from "@/components/api/api";

/**
 * Login is handled with HttpOnly cookies set by the backend, so JavaScript
 * never sees the tokens. This file holds everything the frontend needs:
 *
 *  - installAuthFetch(): wraps window.fetch for calls to our API so they send
 *    the cookies, and on a 401 they refresh the session once and retry.
 *    (This is why the pages that still build an "Authorization: Bearer ..."
 *    header keep working: the header is dropped and the cookie is used.)
 *  - getSession(): who is logged in (asks the backend, cached).
 *  - clearSession(): real logout (revokes the refresh token on the server).
 */

export type SessionUser = {
  id: string;
  username: string;
  email?: string;
  full_name?: string | null;
  role: "student" | "teacher" | "admin";
  matric_number?: string | null;
  department?: string | null;
};

// Keys the old localStorage-based login used. Removed so old tokens don't linger.
const LEGACY_KEYS = ["access_token", "token_type", "userRole"];

const removeLegacyTokens = () => {
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable: nothing to clean */
  }
};

// ── session cache ────────────────────────────────────────────────────────────

let sessionPromise: Promise<SessionUser | null> | null = null;
let cachedUser: SessionUser | null = null;

/** The logged-in user if already known (no network). Useful for first render. */
export const getCachedUser = (): SessionUser | null => cachedUser;

/** Forget the cached user, e.g. right after logging in as someone else. */
export const resetSession = () => {
  sessionPromise = null;
  cachedUser = null;
};

/** Ask the backend who is logged in. Returns null when not logged in. */
export const getSession = async (force = false): Promise<SessionUser | null> => {
  if (!sessionPromise || force) {
    sessionPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/users/me`);
        if (!res.ok) return null;
        const me = (await res.json()) as SessionUser;
        cachedUser = me;
        return me;
      } catch {
        return null;
      }
    })();
  }
  const user = await sessionPromise;
  if (!user) resetSession(); // never cache "not logged in"
  return user;
};

/** Log out: revoke the refresh token on the server, clear cookies and local state. */
export const clearSession = async (): Promise<void> => {
  resetSession();
  try {
    await fetch(`${BASE_URL}/auth/logout`, { method: "POST" });
  } catch {
    /* offline: cookies expire on their own, nothing more we can do */
  }
  removeLegacyTokens();
};

// ── fetch wrapper ────────────────────────────────────────────────────────────

const PUBLIC_PATHS = ["/", "/login", "/signup"];

type RefreshResult = "ok" | "denied" | "error";
let refreshing: Promise<RefreshResult> | null = null;

export const installAuthFetch = () => {
  const w = window as Window & { __authFetchInstalled?: boolean };
  if (w.__authFetchInstalled) return;
  w.__authFetchInstalled = true;

  removeLegacyTokens();
  const nativeFetch = window.fetch.bind(window);

  const isApiUrl = (url: string) => url.startsWith(BASE_URL);
  const isAuthCall = (url: string) => url.startsWith(`${BASE_URL}/auth/`);
  const isSessionProbe = (url: string) => url.startsWith(`${BASE_URL}/users/me`) && !url.includes("?");

  // One refresh at a time: if several requests get a 401 together they all wait for the same call.
  const refreshSession = (): Promise<RefreshResult> => {
    if (!refreshing) {
      refreshing = nativeFetch(`${BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" })
        .then((r): RefreshResult => (r.ok ? "ok" : r.status === 401 || r.status === 403 ? "denied" : "error"))
        // A dropped connection is NOT a logout. Only the server saying "no" is.
        .catch((): RefreshResult => "error")
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing;
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : null;
    if (!url || !isApiUrl(url)) return nativeFetch(input, init);

    const headers = new Headers(init?.headers);
    headers.delete("Authorization"); // the cookie authenticates now
    const options: RequestInit = { ...init, headers, credentials: "include" };

    let response = await nativeFetch(input, options);

    if (response.status === 401 && !isAuthCall(url)) {
      const result = await refreshSession();
      if (result === "ok") {
        response = await nativeFetch(input, options); // retry once with the fresh cookie
      } else if (result === "denied") {
        // Session really is over (logged out elsewhere, password changed, 7 days passed).
        resetSession();
        if (!isSessionProbe(url) && !PUBLIC_PATHS.includes(window.location.pathname)) {
          window.location.assign("/login");
        }
      }
    }
    return response;
  };
};

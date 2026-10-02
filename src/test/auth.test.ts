import { describe, it, expect, beforeEach, vi } from "vitest";

// Each test loads a fresh copy of lib/auth so the fetch wrapper installs against a fresh mock.
const BASE = "http://localhost:8000";

const respond = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("auth fetch wrapper", () => {
  let native: ReturnType<typeof vi.fn>;
  let assignSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    native = vi.fn();
    window.fetch = native as unknown as typeof window.fetch;
    delete (window as any).__authFetchInstalled;
    assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { pathname: "/student/test", assign: assignSpy },
      writable: true,
    });
    const { installAuthFetch } = await import("@/lib/auth");
    installAuthFetch();
  });

  it("sends cookies and drops the Authorization header on API calls", async () => {
    native.mockResolvedValueOnce(respond(200));
    await fetch(`${BASE}/tests/1/start`, { method: "POST", headers: { Authorization: "Bearer null", "Content-Type": "application/json" } });
    const [, init] = native.mock.calls[0];
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("leaves requests to other sites alone", async () => {
    native.mockResolvedValueOnce(respond(200));
    await fetch("https://example.com/x", { headers: { Authorization: "keep" } });
    const [, init] = native.mock.calls[0];
    expect(init.credentials).toBeUndefined();
    expect(new Headers(init.headers).get("Authorization")).toBe("keep");
  });

  it("on 401 refreshes once and retries the request (the /submit case)", async () => {
    native
      .mockResolvedValueOnce(respond(401))               // /submit with expired access cookie
      .mockResolvedValueOnce(respond(200, { detail: "refreshed" })) // /auth/refresh
      .mockResolvedValueOnce(respond(200, { ok: true })); // retried /submit
    const res = await fetch(`${BASE}/tests/1/submit`, { method: "POST", body: JSON.stringify({ answers: [] }) });
    expect(res.status).toBe(200);
    expect(native.mock.calls.map((c) => c[0])).toEqual([
      `${BASE}/tests/1/submit`, `${BASE}/auth/refresh`, `${BASE}/tests/1/submit`,
    ]);
    expect(native.mock.calls[2][1].body).toBe(native.mock.calls[0][1].body);
  });

  it("several simultaneous 401s share a single refresh call", async () => {
    let refreshCalls = 0;
    native.mockImplementation(async (url: string) => {
      if (url.endsWith("/auth/refresh")) { refreshCalls++; await new Promise((r) => setTimeout(r, 10)); return respond(200); }
      return native.mock.calls.filter((c) => c[0] === url).length <= 1 ? respond(401) : respond(200);
    });
    await Promise.all([fetch(`${BASE}/a`), fetch(`${BASE}/b`), fetch(`${BASE}/c`)]);
    expect(refreshCalls).toBe(1);
  });

  it("sends the student to /login when the server refuses the refresh", async () => {
    native.mockResolvedValueOnce(respond(401)).mockResolvedValueOnce(respond(401));
    const res = await fetch(`${BASE}/notifications/my`);
    expect(res.status).toBe(401);
    expect(assignSpy).toHaveBeenCalledWith("/login");
  });

  it("does NOT log anyone out when the refresh fails because the network is down", async () => {
    native.mockResolvedValueOnce(respond(401)).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const res = await fetch(`${BASE}/tests/1/submit`, { method: "POST" });
    expect(res.status).toBe(401);
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("does not try to refresh on login or other /auth calls", async () => {
    native.mockResolvedValueOnce(respond(401, { detail: "Incorrect username or password" }));
    const res = await fetch(`${BASE}/auth/login`, { method: "POST" });
    expect(res.status).toBe(401);
    expect(native).toHaveBeenCalledTimes(1);
  });

  it("getSession returns null (and does not redirect) when logged out", async () => {
    native.mockResolvedValueOnce(respond(401)).mockResolvedValueOnce(respond(401));
    const { getSession } = await import("@/lib/auth");
    expect(await getSession()).toBeNull();
    expect(assignSpy).not.toHaveBeenCalled();
  });
});

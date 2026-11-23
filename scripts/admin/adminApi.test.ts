// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminHandler, hasProxyHeaders, isLoopback, isSameOrigin } from "./adminApi";

const ID = "3f2b8c1e-9d4a-4b7e-8f61-2a5c9e0d7b13";

type Result = { data: unknown; error: { message: string } | null };

function fakeClient(opts: { rpc?: (name: string, args?: unknown) => Promise<Result> } = {}) {
  const calls: Array<[string, ...unknown[]]> = [];
  const ok: Result = { data: null, error: null };
  const client = {
    rpc: vi.fn((name: string, args?: unknown) => {
      calls.push(["rpc", name, args]);
      return opts.rpc ? opts.rpc(name, args) : Promise.resolve({ data: { name }, error: null });
    }),
    from: vi.fn((table: string) => {
      calls.push(["from", table]);
      return {
        delete: () => {
          calls.push(["delete"]);
          return {
            lt: (col: string, value: string) => {
              calls.push(["lt", col, value]);
              return Promise.resolve(ok);
            },
          };
        },
        update: (values: Record<string, unknown>) => {
          calls.push(["update", values]);
          return {
            eq: (col: string, value: string) => {
              calls.push(["eq", col, value]);
              return Promise.resolve(ok);
            },
          };
        },
      };
    }),
  };
  return { client: client as unknown as SupabaseClient, calls, raw: client };
}

let server: http.Server | null = null;

async function closeServer() {
  if (server) await new Promise((r) => server!.close(r));
  server = null;
}

afterEach(closeServer);

async function call(
  getClient: () => SupabaseClient | null,
  method: string,
  path: string,
): Promise<{ status: number; type: string | undefined; body: unknown }> {
  await closeServer();
  const handler = createAdminHandler(getClient);
  server = http.createServer((req, res) => {
    void handler(req, res);
  });
  await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method });
  const text = await res.text();
  return { status: res.status, type: res.headers.get("content-type") ?? undefined, body: JSON.parse(text) };
}

describe("isLoopback", () => {
  it.each(["127.0.0.1", "::1", "::ffff:127.0.0.1"])("accepts %s", (a) => {
    expect(isLoopback(a)).toBe(true);
  });
  it.each(["192.168.1.20", "::ffff:192.168.1.20", undefined, ""])("rejects %s", (a) => {
    expect(isLoopback(a)).toBe(false);
  });
});

describe("hasProxyHeaders", () => {
  it("is false for a plain browser request", () => {
    expect(hasProxyHeaders({ host: "localhost:8080", origin: "http://localhost:8080", accept: "*/*" })).toBe(false);
    expect(hasProxyHeaders({})).toBe(false);
  });
  it.each(["x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "forwarded", "x-real-ip", "via"])(
    "is true when %s is present",
    (h) => {
      expect(hasProxyHeaders({ host: "localhost:8080", [h]: "1.2.3.4" })).toBe(true);
      expect(hasProxyHeaders({ host: "localhost:8080", [h]: "" })).toBe(true);
      expect(hasProxyHeaders({ host: "localhost:8080", [h]: ["a", "b"] })).toBe(true);
    },
  );
});

describe("isSameOrigin", () => {
  it("accepts loopback hosts with a matching or absent origin", () => {
    expect(isSameOrigin({ host: "localhost:8080" })).toBe(true);
    expect(isSameOrigin({ host: "localhost:8080", origin: "http://localhost:8080" })).toBe(true);
    expect(isSameOrigin({ host: "127.0.0.1:8080" })).toBe(true);
    expect(isSameOrigin({ host: "[::1]:8080", origin: "http://[::1]:8080" })).toBe(true);
  });
  it("rejects LAN or foreign hosts and mismatched origins", () => {
    expect(isSameOrigin({ host: "192.168.1.5:8080" })).toBe(false);
    expect(isSameOrigin({ host: "evil.com" })).toBe(false);
    expect(isSameOrigin({ host: "localhost" })).toBe(false);
    expect(isSameOrigin({})).toBe(false);
    expect(isSameOrigin({ host: "localhost:8080", origin: "http://evil.com" })).toBe(false);
    expect(isSameOrigin({ host: "localhost:8080", origin: "http://localhost:9999" })).toBe(false);
  });
});

describe("createAdminHandler", () => {
  it("returns 503 with setup instructions when no service client is configured", async () => {
    const r = await call(() => null, "GET", "/__admin/api/overview");
    expect(r.status).toBe(503);
    expect(r.type).toMatch(/application\/json/);
    expect(r.body).toEqual({ error: "Set SUPABASE_SERVICE_ROLE_KEY in .env.local and restart npm run dev" });
  });

  it("returns 502 JSON when Supabase is unreachable, without throwing", async () => {
    const { client } = fakeClient({ rpc: () => Promise.reject(new Error("fetch failed")) });
    const r = await call(() => client, "GET", "/__admin/api/homegames");
    expect(r.status).toBe(502);
    expect(r.body).toEqual({ error: "fetch failed" });
  });

  it("returns 502 JSON when Supabase returns an error", async () => {
    const { client } = fakeClient({ rpc: () => Promise.resolve({ data: null, error: { message: "boom" } }) });
    const r = await call(() => client, "GET", "/__admin/api/activity");
    expect(r.status).toBe(502);
    expect(r.body).toEqual({ error: "boom" });
  });

  it("GET overview deletes error_log rows older than 90 days before calling admin_overview", async () => {
    const { client, calls } = fakeClient();
    const before = Date.now();
    const r = await call(() => client, "GET", "/__admin/api/overview");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ name: "admin_overview" });
    expect(calls.map((c) => c[0])).toEqual(["from", "delete", "lt", "rpc"]);
    expect(calls[0]).toEqual(["from", "error_log"]);
    const [, col, cutoff] = calls[2] as [string, string, string];
    expect(col).toBe("created_at");
    const ninety = 90 * 24 * 60 * 60 * 1000;
    const t = Date.parse(cutoff);
    expect(t).toBeGreaterThanOrEqual(before - ninety - 1000);
    expect(t).toBeLessThanOrEqual(Date.now() - ninety + 1000);
    expect(calls[3]).toEqual(["rpc", "admin_overview", undefined]);
  });

  it("GET homegames and activity call their RPCs", async () => {
    const a = fakeClient();
    expect((await call(() => a.client, "GET", "/__admin/api/homegames")).status).toBe(200);
    expect(a.raw.rpc).toHaveBeenCalledWith("admin_homegames");
    const b = fakeClient();
    expect((await call(() => b.client, "GET", "/__admin/api/activity")).status).toBe(200);
    expect(b.raw.rpc).toHaveBeenCalledWith("admin_recent_activity");
  });

  it("GET errors?status=fixed passes the status through", async () => {
    const { client, raw } = fakeClient();
    const r = await call(() => client, "GET", "/__admin/api/errors?status=fixed");
    expect(r.status).toBe(200);
    expect(raw.rpc).toHaveBeenCalledWith("admin_errors", { p_status: "fixed" });
  });

  it("GET errors defaults to open and rejects unknown statuses with 400", async () => {
    const a = fakeClient();
    await call(() => a.client, "GET", "/__admin/api/errors");
    expect(a.raw.rpc).toHaveBeenCalledWith("admin_errors", { p_status: "open" });
    const b = fakeClient();
    const r = await call(() => b.client, "GET", "/__admin/api/errors?status=bogus");
    expect(r.status).toBe(400);
    expect(b.raw.rpc).not.toHaveBeenCalled();
  });

  it("POST errors/:id/fix sets fixed_at for that id", async () => {
    const { client, calls } = fakeClient();
    const r = await call(() => client, "POST", `/__admin/api/errors/${ID}/fix`);
    expect(r.status).toBe(200);
    expect(calls[0]).toEqual(["from", "error_log"]);
    const update = calls[1] as [string, { fixed_at: string }];
    expect(update[0]).toBe("update");
    expect(Number.isNaN(Date.parse(update[1].fixed_at))).toBe(false);
    expect(calls[2]).toEqual(["eq", "id", ID]);
  });

  it("POST errors/:id/reopen clears fixed_at", async () => {
    const { client, calls } = fakeClient();
    const r = await call(() => client, "POST", `/__admin/api/errors/${ID}/reopen`);
    expect(r.status).toBe(200);
    expect(calls[1]).toEqual(["update", { fixed_at: null }]);
    expect(calls[2]).toEqual(["eq", "id", ID]);
  });

  it("rejects a non-UUID error id with 400 and touches nothing", async () => {
    const { client, raw } = fakeClient();
    const r = await call(() => client, "POST", "/__admin/api/errors/abc/fix");
    expect(r.status).toBe(400);
    expect(raw.from).not.toHaveBeenCalled();
  });

  it("returns 404 for unknown routes and 405 for the wrong method", async () => {
    const { client, raw } = fakeClient();
    expect((await call(() => client, "GET", "/__admin/api/nope")).status).toBe(404);
    expect((await call(() => client, "GET", "/__admin/api/errors/abc/fix")).status).toBe(405);
    expect((await call(() => client, "POST", "/__admin/api/overview")).status).toBe(405);
    expect(raw.rpc).not.toHaveBeenCalled();
    expect(raw.from).not.toHaveBeenCalled();
  });
});

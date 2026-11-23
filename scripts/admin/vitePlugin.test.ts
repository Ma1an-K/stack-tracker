// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ViteDevServer } from "vite";
import { adminPlugin } from "./vitePlugin";

type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void;

let dir: string;
let middleware: Middleware;

beforeAll(() => {
  // Empty env dir: no service key, so the handler answers 503 when reached.
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "admin-plugin-"));
  const plugin = adminPlugin();
  expect(plugin.apply).toBe("serve");
  const server = {
    config: { mode: "development", root: dir, envDir: dir },
    middlewares: { use: (fn: Middleware) => (middleware = fn) },
  } as unknown as ViteDevServer;
  (plugin.configureServer as (s: ViteDevServer) => void)(server);
});

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

function run(url: string, remoteAddress: string, headers: Record<string, string>) {
  const res = {
    statusCode: 0,
    headersSent: false,
    body: "",
    setHeader: vi.fn(),
    end(chunk?: string) {
      this.body = chunk ?? "";
      done();
    },
  };
  let done!: () => void;
  const finished = new Promise<void>((r) => (done = r));
  const next = vi.fn(() => done());
  const req = { url, method: "GET", headers, socket: { remoteAddress } } as unknown as IncomingMessage;
  middleware(req, res as unknown as ServerResponse, next);
  return finished.then(() => ({ status: res.statusCode, body: res.body, next }));
}

describe("adminPlugin middleware", () => {
  it("passes non-admin paths through", async () => {
    const r = await run("/__admin/apiary", "192.168.1.20", { host: "evil.com" });
    expect(r.next).toHaveBeenCalled();
  });

  it("refuses a LAN peer with 403", async () => {
    const r = await run("/__admin/api/overview", "192.168.1.20", { host: "localhost:8080" });
    expect(r.status).toBe(403);
    expect(r.next).not.toHaveBeenCalled();
  });

  it("refuses a loopback request from a foreign origin or host with 403", async () => {
    expect((await run("/__admin/api/overview", "127.0.0.1", { host: "localhost:8080", origin: "http://evil.com" })).status).toBe(403);
    expect((await run("/__admin/api/overview", "::1", { host: "evil.com:8080" })).status).toBe(403);
  });

  it("refuses a loopback request relayed by a local proxy or tunnel with 403", async () => {
    const r = await run("/__admin/api/overview", "127.0.0.1", { host: "localhost:8080", "x-forwarded-for": "203.0.113.9" });
    expect(r.status).toBe(403);
    expect(r.next).not.toHaveBeenCalled();
    expect((await run("/__admin/api/errors", "::1", { host: "localhost:8080", via: "1.1 tunnel" })).status).toBe(403);
  });

  it("lets a local same-origin request reach the handler (503 without a key)", async () => {
    const r = await run("/__admin/api/overview", "::1", { host: "localhost:8080", origin: "http://localhost:8080" });
    expect(r.status).toBe(503);
    expect(JSON.parse(r.body).error).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

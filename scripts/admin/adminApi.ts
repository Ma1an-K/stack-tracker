// Server-side only: request handling for the local admin page. Runs inside the
// Vite dev server (see vitePlugin.ts) and never ships to the browser bundle.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { SupabaseClient } from "@supabase/supabase-js";

const PREFIX = "/__admin/api/";
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const ERROR_STATUSES = new Set(["open", "fixed", "all"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOOPBACK_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\]):\d{1,5}$/;

export const MISSING_KEY_MESSAGE = "Set SUPABASE_SERVICE_ROLE_KEY in .env.local and restart npm run dev";

export function isLoopback(remoteAddress: string | undefined): boolean {
  return remoteAddress === "127.0.0.1" || remoteAddress === "::1" || remoteAddress === "::ffff:127.0.0.1";
}

export function isSameOrigin(headers: { host?: string; origin?: string }): boolean {
  const { host, origin } = headers;
  if (!host || !LOOPBACK_HOST_RE.test(host)) return false;
  return origin === undefined || origin === `http://${host}`;
}

/**
 * Browsers label every request with Sec-Fetch-Site. When present it must be
 * same-origin or none (typed URL / bookmark); cross-site, same-site and
 * cross-origin requests (e.g. an <img> pointing at the admin API) are refused.
 * Non-browser clients omit the header and are not affected.
 */
export function isAllowedFetchSite(value: string | string[] | undefined): boolean {
  if (value === undefined) return true;
  return value === "same-origin" || value === "none";
}

const PROXY_HEADERS = ["x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "forwarded", "x-real-ip", "via"];

/**
 * True when the request carries a header that reverse proxies and tunnels add
 * (ngrok, cloudflared, tailscale serve, editor port forwarding). They connect
 * from loopback and often rewrite Host, so their traffic is refused outright.
 * Keys are expected lower-cased, as Node delivers them.
 */
export function hasProxyHeaders(headers: Record<string, string | string[] | undefined>): boolean {
  return PROXY_HEADERS.some((h) => headers[h] !== undefined);
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) {
    res.end();
    return;
  }
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body ?? null));
}

type Result = { data?: unknown; error: { message: string } | null };

function unwrap(result: Result): unknown {
  if (result.error) throw new Error(result.error.message);
  return result.data ?? null;
}

type Route = {
  method: "GET" | "POST";
  /** Set when the route matched but its input is invalid (answered with 400). */
  invalid?: string;
  run: (client: SupabaseClient) => Promise<unknown>;
};

function route(path: string, query: URLSearchParams): Route | null {
  if (!path.startsWith(PREFIX)) return null;
  const parts = path.slice(PREFIX.length).split("/");

  if (parts.length === 1) {
    switch (parts[0]) {
      case "overview":
        return {
          method: "GET",
          run: async (c) => {
            const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
            unwrap(await c.from("error_log").delete().lt("created_at", cutoff));
            return unwrap(await c.rpc("admin_overview"));
          },
        };
      case "homegames":
        return { method: "GET", run: async (c) => unwrap(await c.rpc("admin_homegames")) };
      case "activity":
        return { method: "GET", run: async (c) => unwrap(await c.rpc("admin_recent_activity")) };
      case "errors": {
        const status = query.get("status") ?? "open";
        return {
          method: "GET",
          invalid: ERROR_STATUSES.has(status) ? undefined : "status must be open, fixed or all",
          run: async (c) => unwrap(await c.rpc("admin_errors", { p_status: status })),
        };
      }
      default:
        return null;
    }
  }

  if (parts.length === 3 && parts[0] === "errors" && (parts[2] === "fix" || parts[2] === "reopen")) {
    const [, id, action] = parts;
    return {
      method: "POST",
      invalid: UUID_RE.test(id) ? undefined : "invalid error id",
      run: async (c) => {
        const fixed_at = action === "fix" ? new Date().toISOString() : null;
        unwrap(await c.from("error_log").update({ fixed_at }).eq("id", id));
        return { ok: true };
      },
    };
  }

  return null;
}

export function createAdminHandler(
  getClient: () => SupabaseClient | null,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const r = route(url.pathname, url.searchParams);
      if (!r) return sendJson(res, 404, { error: "Not found" });
      if (req.method !== r.method) {
        res.setHeader("Allow", r.method);
        return sendJson(res, 405, { error: "Method not allowed" });
      }
      if (r.invalid) return sendJson(res, 400, { error: r.invalid });
      const client = getClient();
      if (!client) return sendJson(res, 503, { error: MISSING_KEY_MESSAGE });
      sendJson(res, 200, await r.run(client));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendJson(res, 502, { error: message || "Supabase request failed" });
    }
  };
}

// Dev-server-only plugin: holds the Supabase service-role key in the Node
// process and serves aggregated admin JSON at /__admin/api to loopback,
// same-origin requests. `apply: "serve"` keeps it out of every build.
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminHandler, isLoopback, isSameOrigin, sendJson } from "./adminApi";

const MOUNT = "/__admin/api";

export function adminPlugin(): Plugin {
  return {
    name: "stack-tracker-admin",
    apply: "serve",
    configureServer(server) {
      const { mode, root, envDir } = server.config;
      // '' prefix: load every key, including the non-VITE_ service key. This
      // object stays in the dev-server process; it is never injected into code.
      const env = loadEnv(mode, envDir || root, "");
      const url = env.VITE_SUPABASE_URL;
      const key = env.SUPABASE_SERVICE_ROLE_KEY;
      const client: SupabaseClient | null =
        url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
      const handler = createAdminHandler(() => client);

      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (path !== MOUNT && !path.startsWith(`${MOUNT}/`)) return next();
        // The dev server listens on all interfaces; only this machine's own
        // browser, on a localhost origin, may reach the admin API.
        if (!isLoopback(req.socket.remoteAddress) || !isSameOrigin({ host: req.headers.host, origin: req.headers.origin })) {
          return sendJson(res, 403, { error: "Forbidden" });
        }
        void handler(req, res);
      });
    },
  };
}

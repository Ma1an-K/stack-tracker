import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createSupabaseMock } from "@/test/supabaseMock";

const mocks = vi.hoisted(() => ({
  db: null as unknown as ReturnType<typeof import("@/test/supabaseMock").createSupabaseMock>,
  getUser: null as unknown as (...args: unknown[]) => unknown,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mocks.db.from(table),
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: "u1" } } } }),
      getUser: (...args: unknown[]) => mocks.getUser(...args),
    },
  },
}));

import { usePersonalStats } from "./usePersonalStats";

const hgA = { id: "hA", name: "Alpha", currency: "$", disabled_badges: [] };
const hgB = { id: "hB", name: "Bravo", currency: "€", disabled_badges: [] };
const myPlayers = [
  { id: "pA", name: "Me", homegame_id: "hA", user_id: "u1", homegame: hgA },
  { id: "pB", name: "Me", homegame_id: "hB", user_id: "u1", homegame: hgB },
];

let getUser: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mocks.db = createSupabaseMock();
  getUser = vi.fn();
  mocks.getUser = getUser;
});

describe("usePersonalStats", () => {
  it("issues session_players and every per-homegame query concurrently, keeping result order", async () => {
    const { result } = renderHook(() => usePersonalStats());

    await waitFor(() => expect(mocks.db.find("players")).toHaveLength(1));
    expect(getUser).not.toHaveBeenCalled();
    await act(async () => {
      mocks.db.find("players")[0].resolve({ data: myPlayers, error: null });
    });

    // session_players + 3 queries x 2 homegames, all in flight at once.
    await waitFor(() => expect(mocks.db.pending()).toHaveLength(7));
    const pending = mocks.db.pending();
    expect(pending.filter((r) => r.table === "session_players")).toHaveLength(1);
    for (const hg of ["hA", "hB"]) {
      const forHg = pending.filter((r) => mocks.db.hasCall(r, "eq", "homegame_id", hg));
      expect(forHg.map((r) => r.table).sort()).toEqual(["players", "sessions", "sessions"]);
    }

    // Resolve the second homegame first: output order must still follow myPlayers.
    await act(async () => {
      for (const r of [...pending].reverse()) {
        if (r.table === "session_players") {
          r.resolve({
            data: [
              { session_id: "s1", player_id: "pA", buy_in: 10, cash_out: 30, session: { id: "s1", date: "2026-01-01" } },
              { session_id: "s2", player_id: "pB", buy_in: 20, cash_out: 5, session: { id: "s2", date: "2026-02-01" } },
            ],
            error: null,
          });
        } else {
          r.resolve({ data: [], error: null });
        }
      }
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.homegameStats.map((h) => h.homegame.id)).toEqual(["hA", "hB"]);
    expect(result.current.homegameStats[0].stats.totalProfit).toBe(20);
    expect(result.current.homegameStats[1].stats.totalProfit).toBe(-15);
    expect(result.current.recentSessions.map((s) => s.id)).toEqual(["s2", "s1"]);
    expect(result.current.overallStats?.sessionsPlayed).toBe(2);
  });
});

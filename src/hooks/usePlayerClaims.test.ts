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
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/errorLog", () => ({ logError: vi.fn() }));

import { usePlayerClaims } from "./usePlayerClaims";

let getUser: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mocks.db = createSupabaseMock();
  getUser = vi.fn();
  mocks.getUser = getUser;
});

describe("usePlayerClaims", () => {
  it("fetches pending requests and my requests in parallel", async () => {
    const { result } = renderHook(() => usePlayerClaims("h1"));

    await waitFor(() => expect(mocks.db.pending()).toHaveLength(2));
    const [pendingReq, myReq] = [
      mocks.db.find("player_claim_requests", (r) => mocks.db.hasCall(r, "eq", "status", "pending"))[0],
      mocks.db.find("player_claim_requests", (r) => mocks.db.hasCall(r, "eq", "user_id", "u1"))[0],
    ];
    expect(pendingReq).toBeDefined();
    expect(myReq).toBeDefined();
    expect(getUser).not.toHaveBeenCalled();

    await act(async () => {
      myReq.resolve({ data: [{ id: "c9", player_id: "p2", status: "pending" }], error: null });
      pendingReq.resolve({
        data: [
          { id: "c1", player: { homegame_id: "h1" } },
          { id: "c2", player: { homegame_id: "other" } },
        ],
        error: null,
      });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pendingRequests.map((r) => r.id)).toEqual(["c1"]);
    expect(result.current.hasRequestedPlayer("p2")).toBe(true);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createSupabaseMock } from "@/test/supabaseMock";
import type { OneOffGame } from "@/lib/oneOff/types";
import { settleOneOff } from "@/lib/oneOff/settle";

const mocks = vi.hoisted(() => ({
  db: null as unknown as ReturnType<typeof import("@/test/supabaseMock").createSupabaseMock>,
  clearGame: null as unknown as (...args: unknown[]) => unknown,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => mocks.db.from(table) },
}));
vi.mock("@/lib/oneOff/localStore", () => ({
  clearGame: (...args: unknown[]) => mocks.clearGame(...args),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/errorLog", () => ({ logError: vi.fn() }));

import { useOneOffHistory } from "./useOneOffHistory";

let clearGame: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mocks.db = createSupabaseMock();
  clearGame = vi.fn();
  mocks.clearGame = clearGame;
});

function makeGame(overrides: Partial<OneOffGame> = {}): OneOffGame {
  return {
    version: 1,
    mode: "live",
    label: "  Friday at Sam's  ",
    played_on: "2026-11-26",
    currency: "$",
    notes: "   ",
    default_buy_in: 50,
    started_at: "2026-11-26T09:00:00.000Z",
    players: [
      { id: "a", name: "Ana", buy_in: 50, cash_out: 120 },
      { id: "b", name: "Ben", buy_in: 50, cash_out: 0 },
      { id: "c", name: "Cy", buy_in: 50, cash_out: 30 },
    ],
    payments: [{ from_id: "b", to_id: "a", amount: 20 }],
    ...overrides,
  };
}

/** Render the hook and resolve the initial list load with `rows`. */
async function renderLoaded(rows: unknown[] = []) {
  const hook = renderHook(() => useOneOffHistory());
  await waitFor(() => expect(mocks.db.find("oneoff_games")).toHaveLength(1));
  await act(async () => {
    mocks.db.find("oneoff_games")[0].resolve({ data: rows, error: null });
  });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

const insertRequests = () => mocks.db.find("oneoff_games", (r) => r.calls.some((c) => c[0] === "insert"));

describe("useOneOffHistory", () => {
  it("loads games ordered by played_on desc, then created_at desc", async () => {
    const rows = [{ id: "g2" }, { id: "g1" }];
    const { result } = await renderLoaded(rows);

    const list = mocks.db.find("oneoff_games")[0];
    expect(list.calls[0][0]).toBe("select");
    const orders = list.calls.filter((c) => c[0] === "order");
    expect(orders).toEqual([
      ["order", "played_on", { ascending: false }],
      ["order", "created_at", { ascending: false }],
    ]);
    expect(result.current.games.map((g) => g.id)).toEqual(["g2", "g1"]);
  });

  it("save inserts one row with the settled transfers, clears the device copy and returns the id", async () => {
    const { result } = await renderLoaded();
    const game = makeGame();

    let saved: Promise<{ id: string | null; error: string | null }>;
    act(() => {
      saved = result.current.save(game, "u1");
    });
    await waitFor(() => expect(insertRequests()).toHaveLength(1));
    const insert = insertRequests()[0];
    const row = insert.calls.find((c) => c[0] === "insert")![1] as Record<string, unknown>;

    const expected = settleOneOff(
      game.players.map((p) => ({ id: p.id, buy_in: p.buy_in, cash_out: p.cash_out as number })),
      game.payments,
    );
    expect(row).toEqual({
      played_on: "2026-11-26",
      label: "Friday at Sam's",
      currency: "$",
      notes: null,
      players: [
        { id: "a", name: "Ana", buy_in: 50, cash_out: 120 },
        { id: "b", name: "Ben", buy_in: 50, cash_out: 0 },
        { id: "c", name: "Cy", buy_in: 50, cash_out: 30 },
      ],
      payments: game.payments,
      transfers: expected.transfers,
    });
    expect(expected.transfers.length).toBeGreaterThan(0);
    expect(row).not.toHaveProperty("user_id");
    expect(row).not.toHaveProperty("homegame_id");

    await act(async () => {
      insert.resolve({ data: { id: "new-id" }, error: null });
    });
    await expect(saved!).resolves.toEqual({ id: "new-id", error: null });
    expect(clearGame).toHaveBeenCalledWith("u1");
  });

  it("save refuses a game where someone hasn't cashed out", async () => {
    const { result } = await renderLoaded();
    const game = makeGame();
    game.players[2] = { ...game.players[2], cash_out: null };

    let res: { id: string | null; error: string | null } | undefined;
    await act(async () => {
      res = await result.current.save(game, "u1");
    });
    expect(res).toEqual({ id: null, error: "Cash everyone out first" });
    expect(insertRequests()).toHaveLength(0);
    expect(clearGame).not.toHaveBeenCalled();
  });

  it("save refuses an unbalanced game", async () => {
    const { result } = await renderLoaded();
    const game = makeGame();
    game.players[0] = { ...game.players[0], cash_out: 125 };

    let res: { id: string | null; error: string | null } | undefined;
    await act(async () => {
      res = await result.current.save(game, "u1");
    });
    expect(res).toEqual({ id: null, error: "Totals don't balance yet" });
    expect(insertRequests()).toHaveLength(0);
    expect(clearGame).not.toHaveBeenCalled();
  });

  it("failed save keeps the game on the device", async () => {
    const { result } = await renderLoaded();

    let saved: Promise<{ id: string | null; error: string | null }>;
    act(() => {
      saved = result.current.save(makeGame(), "u1");
    });
    await waitFor(() => expect(insertRequests()).toHaveLength(1));
    await act(async () => {
      insertRequests()[0].resolve({ data: null, error: { message: "network down" } });
    });
    await expect(saved!).resolves.toEqual({
      id: null,
      error: "Couldn't save. Check your connection and try again.",
    });
    expect(clearGame).not.toHaveBeenCalled();
  });

  it("remove deletes by id, then refetches", async () => {
    const { result } = await renderLoaded([{ id: "g1" }, { id: "g2" }]);

    let removed: Promise<{ error: string | null }>;
    act(() => {
      removed = result.current.remove("g1");
    });
    const deletes = () => mocks.db.find("oneoff_games", (r) => r.calls.some((c) => c[0] === "delete"));
    await waitFor(() => expect(deletes()).toHaveLength(1));
    expect(mocks.db.hasCall(deletes()[0], "eq", "id", "g1")).toBe(true);

    await act(async () => {
      deletes()[0].resolve({ data: null, error: null });
    });
    const lists = () =>
      mocks.db.find("oneoff_games", (r) => r.calls.some((c) => c[0] === "order"));
    await waitFor(() => expect(lists()).toHaveLength(2));
    await act(async () => {
      lists()[1].resolve({ data: [{ id: "g2" }], error: null });
    });
    await expect(removed!).resolves.toEqual({ error: null });
    expect(result.current.games.map((g) => g.id)).toEqual(["g2"]);
  });

  it("get fetches one game by id", async () => {
    const { result } = await renderLoaded();

    let got: Promise<unknown>;
    act(() => {
      got = result.current.get("g9");
    });
    const gets = () => mocks.db.find("oneoff_games", (r) => mocks.db.hasCall(r, "eq", "id", "g9"));
    await waitFor(() => expect(gets()).toHaveLength(1));
    await act(async () => {
      gets()[0].resolve({ data: { id: "g9" }, error: null });
    });
    await expect(got!).resolves.toEqual({ id: "g9" });
  });
});

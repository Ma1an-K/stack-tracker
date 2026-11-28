import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createSupabaseMock } from "@/test/supabaseMock";

type AuthCallback = (event: string, session: unknown) => void;

const mocks = vi.hoisted(() => ({
  db: null as unknown as ReturnType<typeof import("@/test/supabaseMock").createSupabaseMock>,
  authCallback: null as AuthCallback | null,
  getSession: null as unknown as (...args: unknown[]) => unknown,
  rpc: null as unknown as (...args: unknown[]) => unknown,
  signUp: null as unknown as (...args: unknown[]) => unknown,
  signOut: null as unknown as (...args: unknown[]) => unknown,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mocks.db.from(table),
    rpc: (...args: unknown[]) => mocks.rpc(...args),
    auth: {
      onAuthStateChange: (cb: AuthCallback) => {
        mocks.authCallback = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getSession: (...args: unknown[]) => mocks.getSession(...args),
      signUp: (...args: unknown[]) => mocks.signUp(...args),
      signOut: (...args: unknown[]) => mocks.signOut(...args),
    },
  },
}));

import { useAuth } from "./useAuth";

const session = { user: { id: "u1" } };
let getSession: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mocks.db = createSupabaseMock();
  mocks.authCallback = null;
  getSession = vi.fn(() => Promise.resolve({ data: { session } }));
  mocks.getSession = getSession;
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("useAuth startup", () => {
  it("fetches profile and memberships in parallel, once, and stays loading until both land", async () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);

    // Startup: INITIAL_SESSION, then (as can happen during init) a second
    // event for the same user before the first fetch has finished.
    act(() => {
      mocks.authCallback!("INITIAL_SESSION", session);
      mocks.authCallback!("SIGNED_IN", session);
    });

    // Both requests are in flight before either has resolved.
    await waitFor(() => expect(mocks.db.pending()).toHaveLength(2));
    const [profileReq] = mocks.db.find("profiles");
    const [membershipReq] = mocks.db.find("homegame_members");
    expect(profileReq).toBeDefined();
    expect(membershipReq).toBeDefined();
    expect(result.current.loading).toBe(true);

    await act(async () => {
      profileReq.resolve({ data: { id: "u1", username: "dan" }, error: null });
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      membershipReq.resolve({
        data: [{ role: "owner", homegame: { id: "h1", name: "Friday" } }],
        error: null,
      });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual({ id: "u1", username: "dan" });
    expect(result.current.currentHomegame).toMatchObject({ id: "h1", role: "owner" });

    // Only one fetch of each, and no redundant getSession() round trip.
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(mocks.db.find("profiles")).toHaveLength(1);
    expect(mocks.db.find("homegame_members")).toHaveLength(1);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("stops loading with no user data when there is no session", async () => {
    const { result } = renderHook(() => useAuth());
    act(() => mocks.authCallback!("INITIAL_SESSION", null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(mocks.db.requests).toHaveLength(0);
  });

  it("still flags password recovery", async () => {
    const { result } = renderHook(() => useAuth());
    act(() => mocks.authCallback!("PASSWORD_RECOVERY", session));
    await waitFor(() => expect(result.current.isRecovery).toBe(true));
  });

  it("refetchUserData always issues a fresh fetch", async () => {
    const { result } = renderHook(() => useAuth());
    act(() => mocks.authCallback!("INITIAL_SESSION", session));
    await waitFor(() => expect(mocks.db.pending()).toHaveLength(2));
    await act(async () => {
      for (const r of mocks.db.pending()) {
        r.resolve({ data: r.table === "profiles" ? { id: "u1" } : [], error: null });
      }
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.refetchUserData(); });
    await waitFor(() => expect(mocks.db.find("profiles")).toHaveLength(2));
    expect(mocks.db.find("homegame_members")).toHaveLength(2);
  });
});

describe("useAuth joinHomegame", () => {
  it("makes the joined homegame current, even when already in another one", async () => {
    localStorage.setItem("currentHomegameId", "h1");
    const { result } = renderHook(() => useAuth());
    act(() => mocks.authCallback!("INITIAL_SESSION", session));
    await waitFor(() => expect(mocks.db.pending()).toHaveLength(2));
    await act(async () => {
      for (const r of mocks.db.pending()) {
        r.resolve({
          data: r.table === "profiles" ? { id: "u1" } : [{ role: "owner", homegame: { id: "h1", name: "Friday" } }],
          error: null,
        });
      }
    });
    await waitFor(() => expect(result.current.currentHomegame).toMatchObject({ id: "h1" }));

    mocks.rpc = vi.fn(() => Promise.resolve({ data: [{ homegame_id: "h2", error_message: null }], error: null }));
    let joined: Promise<{ error: unknown; homegameId?: string }>;
    act(() => { joined = result.current.joinHomegame("ABCD1234"); });
    await waitFor(() => expect(mocks.db.pending()).toHaveLength(2));
    await act(async () => {
      for (const r of mocks.db.pending()) {
        r.resolve({
          data: r.table === "profiles"
            ? { id: "u1" }
            : [
                { role: "owner", homegame: { id: "h1", name: "Friday" } },
                { role: "member", homegame: { id: "h2", name: "Sunday" } },
              ],
          error: null,
        });
      }
    });

    await expect(joined!).resolves.toEqual({ error: null, homegameId: "h2" });
    expect(mocks.rpc).toHaveBeenCalledWith("join_with_invite_code", { code_input: "ABCD1234" });
    expect(result.current.currentHomegame).toMatchObject({ id: "h2", role: "member" });
    expect(localStorage.getItem("currentHomegameId")).toBe("h2");
  });
});

describe("useAuth signUp", () => {
  it("sends the confirmation link to /confirmed on this site", async () => {
    mocks.signUp = vi.fn(() => Promise.resolve({ data: { user: null }, error: null }));
    const { result } = renderHook(() => useAuth());

    await act(async () => { await result.current.signUp("a@b.co", "secret123", " Dan "); });

    expect(mocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ emailRedirectTo: `${window.location.origin}/confirmed` }),
      }),
    );
  });
});

describe("useAuth user-data readiness", () => {
  // Resolves the in-flight profile + memberships requests.
  async function land(memberships: { data: unknown; error: unknown }) {
    await waitFor(() => expect(mocks.db.pending()).toHaveLength(2));
    await act(async () => {
      for (const r of mocks.db.pending()) {
        r.resolve(r.table === "profiles" ? { data: { id: "u1" }, error: null } : memberships);
      }
    });
  }

  it("flags the data as pending from sign-in until that user's homegames land", async () => {
    const { result } = renderHook(() => useAuth());
    act(() => mocks.authCallback!("INITIAL_SESSION", null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userDataPending).toBe(false);

    // Signing in on /auth: the user is set at once, the fetch comes after.
    act(() => mocks.authCallback!("SIGNED_IN", session));
    expect(result.current.user).toEqual(session.user);
    expect(result.current.loading).toBe(false);
    expect(result.current.userDataPending).toBe(true);

    await land({ data: [{ role: "member", homegame: { id: "h1", name: "Friday" } }], error: null });
    await waitFor(() => expect(result.current.userDataPending).toBe(false));
    expect(result.current.homegames).toHaveLength(1);
  });

  it("does not flag a token refresh for the same user as pending", async () => {
    const { result } = renderHook(() => useAuth());
    act(() => mocks.authCallback!("INITIAL_SESSION", session));
    await land({ data: [], error: null });
    await waitFor(() => expect(result.current.userDataPending).toBe(false));

    act(() => mocks.authCallback!("TOKEN_REFRESHED", session));
    expect(result.current.userDataPending).toBe(false);
    // The refresh refetches in the background; settle it so it can't leak into the next test.
    await land({ data: [], error: null });
    expect(result.current.userDataPending).toBe(false);
  });

  it("reports a failed memberships fetch instead of treating it as no homegames", async () => {
    const { result } = renderHook(() => useAuth());
    act(() => mocks.authCallback!("INITIAL_SESSION", session));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await land({ data: null, error: { message: "network down" } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userDataPending).toBe(false);
    expect(result.current.membershipsError).toBe(true);
  });

  it("clears the memberships error once a fetch succeeds", async () => {
    const { result } = renderHook(() => useAuth());
    act(() => mocks.authCallback!("INITIAL_SESSION", session));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await land({ data: null, error: { message: "network down" } });
    await waitFor(() => expect(result.current.membershipsError).toBe(true));

    act(() => { result.current.refetchUserData(); });
    await land({ data: [], error: null });
    await waitFor(() => expect(result.current.membershipsError).toBe(false));
  });

  it("remembers the welcome as seen for anyone already in a homegame", async () => {
    renderHook(() => useAuth());
    act(() => mocks.authCallback!("INITIAL_SESSION", session));
    await land({ data: [{ role: "member", homegame: { id: "h1", name: "Friday" } }], error: null });
    await waitFor(() => expect(localStorage.getItem("welcome_seen")).toBe("1"));
  });
});

describe("useAuth signOut", () => {
  it("forgets the welcome choice so the next account on this device gets its own first run", async () => {
    mocks.signOut = vi.fn(() => Promise.resolve({ error: null }));
    localStorage.setItem("welcome_seen", "1");
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signOut(); });
    expect(localStorage.getItem("welcome_seen")).toBeNull();
  });
});

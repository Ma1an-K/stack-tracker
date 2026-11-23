import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminPage from "./AdminPage";

const overview = {
  users_total: 12, users_active_7d: 5, users_active_30d: 8, signups_7d: 2,
  homegames_total: 3, sessions_7d: 4, live_now: 1, errors_open: 1,
};
const homegames = [
  { id: "h1", name: "Friday Game", owner: "Dan", members: 6, players: 8, last_session: "2026-11-20",
    sessions_30d: 3, live_now: true, last_activity: "2026-11-22T10:00:00Z" },
  { id: "h2", name: "Quiet Game", owner: "Eve", members: 2, players: 3, last_session: null,
    sessions_30d: 0, live_now: false, last_activity: "2026-10-01T10:00:00Z" },
];
const activity = {
  signups: [{ at: "2026-11-22T09:00:00Z", label: "New user Zed", detail: "zed@example.com" }],
  homegames: [], joins: [], sessions: [],
};
const openErrors = [{
  id: "e1", created_at: "2026-11-22T08:00:00Z", kind: "crash", action: "render", message: "Boom happened",
  stack: "Error: Boom\n at STACKLINE", page: "/sessions", user_agent: "UA", app_version: "1",
  fixed_at: null, user_label: "Dan", homegame_name: "Friday Game",
}];
const fixedErrors = [{ ...openErrors[0], id: "e2", message: "Old problem", fixed_at: "2026-11-21T00:00:00Z" }];

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

let fetchMock: ReturnType<typeof vi.fn>;
function install(handler?: (url: string, init?: RequestInit) => Promise<Response> | undefined) {
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const custom = handler?.(url, init);
    if (custom) return custom;
    if (url.endsWith("/overview")) return json(overview);
    if (url.endsWith("/homegames")) return json(homegames);
    if (url.endsWith("/activity")) return json(activity);
    if (url.includes("/errors?status=open")) return json(openErrors);
    if (url.includes("/errors?status=fixed")) return json(fixedErrors);
    if (url.endsWith("/fix") || url.endsWith("/reopen")) return json({ ok: true });
    return json({ error: "unexpected " + url }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
}

const calls = (needle: string) => fetchMock.mock.calls.filter(([u]) => String(u).includes(needle));

beforeEach(() => install());
afterEach(() => vi.unstubAllGlobals());

describe("AdminPage", () => {
  it("renders the four sections with tiles, live badge and activity", async () => {
    render(<AdminPage />);
    expect(screen.getByText("Stack Tracker Admin")).toBeTruthy();
    for (const label of ["Users", "Active 7d", "Active 30d", "New signups 7d", "Homegames", "Sessions 7d", "Live now", "Open issues"]) {
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("Active homegames")).toBeTruthy();
    expect((await screen.findAllByText("Friday Game")).length).toBeGreaterThan(0);
    expect(screen.getByText("Quiet Game")).toBeTruthy();
    expect(screen.getAllByText("Live now").length).toBeGreaterThanOrEqual(2); // tile + badge
    expect(screen.getByText("Recent activity")).toBeTruthy();
    expect(await screen.findByText("New user Zed")).toBeTruthy();
    expect(screen.getByText("Issue log")).toBeTruthy();
    expect(await screen.findByText("Boom happened")).toBeTruthy();
  });

  it("defaults the issue log to open and refetches when switched to Fixed", async () => {
    render(<AdminPage />);
    await screen.findByText("Boom happened");
    expect(calls("errors?status=open").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Fixed" }));
    await waitFor(() => expect(calls("errors?status=fixed").length).toBeGreaterThan(0));
    expect(await screen.findByText("Old problem")).toBeTruthy();
  });

  it("Mark fixed posts to the fix endpoint then refetches", async () => {
    render(<AdminPage />);
    await screen.findByText("Boom happened");
    const before = calls("errors?status=open").length;
    fireEvent.click(screen.getByRole("button", { name: "Mark fixed" }));
    await waitFor(() => {
      const post = calls("/errors/e1/fix")[0];
      expect(post).toBeTruthy();
      expect((post[1] as RequestInit).method).toBe("POST");
    });
    await waitFor(() => expect(calls("errors?status=open").length).toBeGreaterThan(before));
  });

  it("expands a row to show the stack", async () => {
    render(<AdminPage />);
    const msg = await screen.findByText("Boom happened");
    expect(screen.queryByText(/STACKLINE/)).toBeNull();
    fireEvent.click(msg);
    expect(await screen.findByText(/STACKLINE/)).toBeTruthy();
  });

  it("shows the server error message when overview returns 503", async () => {
    install((url) => (url.endsWith("/overview") ? json({ error: "Service key missing" }, 503) : undefined));
    render(<AdminPage />);
    expect(await screen.findByText(/Service key missing/)).toBeTruthy();
  });
});

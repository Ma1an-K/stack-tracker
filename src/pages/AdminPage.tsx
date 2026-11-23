import { Fragment, useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Overview = Record<string, number>;
interface Homegame {
  id: string; name: string; owner: string; members: number; players: number;
  last_session: string | null; sessions_30d: number; live_now: boolean; last_activity: string;
}
interface ActivityItem { at: string; label: string; detail: string }
type Activity = Record<"signups" | "homegames" | "joins" | "sessions", ActivityItem[]>;
interface ErrorRow {
  id: string; created_at: string; kind: string; action: string; message: string; stack: string | null;
  page: string | null; user_agent: string | null; app_version: string | null; fixed_at: string | null;
  user_label: string | null; homegame_name: string | null;
}
type Filter = "open" | "fixed" | "all";

const API = "/__admin/api";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/${path}`, init);
  } catch {
    throw new Error("Could not reach the admin API");
  }
  let body: unknown = null;
  try { body = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok) {
    const msg = (body as { error?: string } | null)?.error;
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return body as T;
}

function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [path]);
  useEffect(() => { void load(); }, [load]);
  return { data, error, reload: load };
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

const TILES: [string, string][] = [
  ["Users", "users_total"], ["Active 7d", "users_active_7d"], ["Active 30d", "users_active_30d"],
  ["New signups 7d", "signups_7d"], ["Homegames", "homegames_total"], ["Sessions 7d", "sessions_7d"],
  ["Live now", "live_now"], ["Open issues", "errors_open"],
];

function ErrorNote({ message }: { message: string }) {
  return <p role="alert" className="text-sm text-destructive">{message}</p>;
}

function Tiles() {
  const { data, error } = useApi<Overview>("overview");
  if (error) return <ErrorNote message={error} />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TILES.map(([label, key]) => (
        <Card key={key}>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold text-primary">{data ? data[key] ?? 0 : "…"}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Homegames() {
  const { data, error } = useApi<Homegame[]>("homegames");
  return (
    <Card>
      <CardHeader><CardTitle>Active homegames</CardTitle></CardHeader>
      <CardContent>
        {error ? <ErrorNote message={error} /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Owner</TableHead><TableHead>Members</TableHead>
                  <TableHead>Players</TableHead><TableHead>Last session</TableHead>
                  <TableHead>Sessions 30d</TableHead><TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="whitespace-nowrap">
                      <span>{h.name}</span> {h.live_now && <Badge>Live now</Badge>}
                    </TableCell>
                    <TableCell>{h.owner}</TableCell>
                    <TableCell>{h.members}</TableCell>
                    <TableCell>{h.players}</TableCell>
                    <TableCell className="whitespace-nowrap">{h.last_session ?? "—"}</TableCell>
                    <TableCell>{h.sessions_30d}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmt(h.last_activity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ACTIVITY_GROUPS: [keyof Activity, string][] = [
  ["signups", "Signups"], ["homegames", "New homegames"], ["joins", "Joins"], ["sessions", "Sessions"],
];

function RecentActivity() {
  const { data, error } = useApi<Activity>("activity");
  return (
    <Card>
      <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {error ? <ErrorNote message={error} /> : ACTIVITY_GROUPS.map(([key, title]) => (
          <div key={key}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{title}</h3>
            <ul className="space-y-1 text-sm">
              {(data?.[key] ?? []).map((a, i) => (
                <li key={i}>
                  <span className="font-medium">{a.label}</span>{" "}
                  <span className="text-muted-foreground">{a.detail} · {fmt(a.at)}</span>
                </li>
              ))}
              {data && data[key].length === 0 && <li className="text-muted-foreground">Nothing yet</li>}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function IssueLog() {
  const [filter, setFilter] = useState<Filter>("open");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, reload } = useApi<ErrorRow[]>(`errors?status=${filter}`);

  const toggle = async (row: ErrorRow) => {
    try {
      await api(`errors/${row.id}/${row.fixed_at ? "reopen" : "fix"}`, { method: "POST" });
      setActionError(null);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Issue log</CardTitle>
        <div className="flex gap-1">
          {(["open", "fixed", "all"] as Filter[]).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {(error || actionError) && <ErrorNote message={(error || actionError)!} />}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead><TableHead>Kind</TableHead><TableHead>Action</TableHead>
                <TableHead>Message</TableHead><TableHead>User</TableHead><TableHead>Homegame</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((r) => (
                <Fragment key={r.id}>
                  <TableRow>
                    <TableCell className="whitespace-nowrap">{fmt(r.created_at)}</TableCell>
                    <TableCell><Badge variant={r.kind === "crash" ? "destructive" : "secondary"}>{r.kind}</Badge></TableCell>
                    <TableCell>{r.action}</TableCell>
                    <TableCell className="max-w-xs cursor-pointer break-words" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                      {r.message}
                    </TableCell>
                    <TableCell>{r.user_label ?? "—"}</TableCell>
                    <TableCell>{r.homegame_name ?? "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => void toggle(r)}>
                        {r.fixed_at ? "Reopen" : "Mark fixed"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded === r.id && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="mb-1 text-xs text-muted-foreground">
                          {[r.page, r.app_version ? `v${r.app_version}` : null, r.user_agent].filter(Boolean).join(' · ')}
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap text-xs">{r.stack ?? "(no stack)"}</pre>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        {data && data.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No issues.</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-bold text-primary">Stack Tracker Admin</h1>
        <Tiles />
        <Homegames />
        <RecentActivity />
        <IssueLog />
      </div>
    </div>
  );
}

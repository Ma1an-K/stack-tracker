import { vi } from "vitest";

/**
 * A controllable stand-in for the Supabase query builder. Like the real
 * PostgREST builder it is lazy: a request is only "issued" (recorded in
 * `requests`) when the builder is awaited / `.then`-ed. Each request stays
 * pending until the test resolves it, so tests can assert which requests are
 * in flight at the same time.
 */
export interface MockRequest {
  table: string;
  /** Chained calls after from(), e.g. [["select", "*"], ["eq", "id", "u1"]] */
  calls: [string, ...unknown[]][];
  resolve: (result: { data: unknown; error: unknown }) => void;
  settled: boolean;
}

export function createSupabaseMock() {
  const requests: MockRequest[] = [];

  const from = vi.fn((table: string) => {
    const calls: [string, ...unknown[]][] = [];
    let promise: Promise<{ data: unknown; error: unknown }> | null = null;
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "single", "maybeSingle", "order", "update", "insert", "delete"]) {
      builder[m] = (...args: unknown[]) => {
        calls.push([m, ...args]);
        return builder;
      };
    }
    builder.then = (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => {
      if (!promise) {
        promise = new Promise((resolve) => {
          const req: MockRequest = {
            table,
            calls,
            settled: false,
            resolve: (result) => {
              req.settled = true;
              resolve(result);
            },
          };
          requests.push(req);
        });
      }
      return promise.then(onFulfilled, onRejected);
    };
    return builder;
  });

  const pending = () => requests.filter((r) => !r.settled);
  const find = (table: string, predicate: (r: MockRequest) => boolean = () => true) =>
    requests.filter((r) => r.table === table && predicate(r));
  const hasCall = (r: MockRequest, ...call: unknown[]) =>
    r.calls.some((c) => call.every((v, i) => c[i] === v));

  return { from, requests, pending, find, hasCall };
}

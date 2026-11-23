import { supabase } from '@/integrations/supabase/client';

export type ErrorLogKind = 'crash' | 'save_failed';

export interface LogErrorInput {
  kind: ErrorLogKind;
  action?: string;
  error: unknown;
  homegameId?: string | null;
}

const DEDUPE_WINDOW_MS = 60_000;
const MAX_PER_PAGE_LOAD = 20;

const recent = new Map<string, number>();
let sentCount = 0;

const clip = (value: string | undefined | null, max: number): string | null =>
  value ? value.slice(0, max) : null;

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: error.message || String(error), stack: error.stack };
  if (typeof error === 'string') return { message: error };
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown; stack?: unknown };
    if (typeof e.message === 'string') {
      return { message: e.message, stack: typeof e.stack === 'string' ? e.stack : undefined };
    }
    try {
      return { message: JSON.stringify(error) };
    } catch {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

async function send(input: LogErrorInput): Promise<void> {
  const { message, stack } = describe(input.error);
  const key = `${input.kind}|${input.action ?? ''}|${message}`;
  const now = Date.now();
  const last = recent.get(key);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return;
  if (sentCount >= MAX_PER_PAGE_LOAD) return;
  recent.set(key, now);
  sentCount += 1;

  const { data } = await supabase.auth.getSession();
  if (!data?.session) return;

  // No .select(): the client has no SELECT grant on error_log. user_id is filled by the DB default.
  await supabase.from('error_log').insert({
    kind: input.kind,
    action: clip(input.action, 200),
    message: (message || 'Unknown error').slice(0, 2000),
    stack: clip(stack, 8000),
    page: clip(typeof location !== 'undefined' ? location.pathname : null, 300),
    user_agent: clip(typeof navigator !== 'undefined' ? navigator.userAgent : null, 400),
    app_version: clip(__APP_VERSION__, 64),
    homegame_id: input.homegameId ?? null,
  });
}

/** Fire-and-forget. Never throws, never recurses, never logs its own failure. */
export function logError(input: LogErrorInput): void {
  try {
    send(input).catch(() => {});
  } catch {
    // swallow: the logger must never break the app
  }
}

export function __resetErrorLogForTests(): void {
  recent.clear();
  sentCount = 0;
}

let installed = false;

export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (event) => {
    logError({ kind: 'crash', action: 'window.error', error: event.error ?? event.message });
  });
  window.addEventListener('unhandledrejection', (event) => {
    logError({ kind: 'crash', action: 'unhandledrejection', error: event.reason });
  });
}

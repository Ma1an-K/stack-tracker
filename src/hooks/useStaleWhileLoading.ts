import { useEffect, useRef, useState } from 'react';

/**
 * UI-layer stale-while-revalidate.
 *
 * Data hooks in this app fetch on every mount (unchanged). This wrapper only
 * remembers the last value a page rendered for a given key (e.g. homegame id)
 * so that revisiting a tab paints the previous data instantly while the hook
 * refetches in the background, instead of a full-page spinner.
 *
 * It also hides the old homegame's data for a moment after a homegame switch
 * (the hooks do not reset their state when the id changes), until the hook
 * delivers a new value.
 */
const cache = new Map<string, unknown>();

const SWITCH_GIVE_UP_MS = 6000;

/**
 * Forget remembered page data (all of it, or keys starting with `prefix`).
 * Call after a mutation made on one screen that changes what other screens
 * show (logging a session, adding a player, approving a claim), so they wait
 * for fresh data instead of painting pre-mutation rows.
 */
export function clearStale(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of [...cache.keys()]) if (key.startsWith(prefix)) cache.delete(key);
}

export function useStaleWhileLoading<T>(key: string | null | undefined, value: T, loading: boolean) {
  const [, force] = useState(0);
  const prevKey = useRef(key);
  const switchValue = useRef<{ value: T } | null>(null);

  if (prevKey.current !== key) {
    // The value we hold right now still belongs to the previous key.
    if (prevKey.current) switchValue.current = { value };
    prevKey.current = key;
  }
  if (switchValue.current && switchValue.current.value !== value) {
    switchValue.current = null;
  }

  const switching = !!switchValue.current;
  const pending = loading || switching;

  useEffect(() => {
    if (!pending && key) cache.set(key, value);
  }, [pending, key, value]);

  // Never get stuck hiding data if a refetch after a switch fails silently.
  useEffect(() => {
    if (!switching) return;
    const id = setTimeout(() => {
      switchValue.current = null;
      force((n) => n + 1);
    }, SWITCH_GIVE_UP_MS);
    return () => clearTimeout(id);
  }, [switching, key]);

  if (!pending) return { data: value, isFirstLoad: false, isRefreshing: false };
  if (key && cache.has(key)) return { data: cache.get(key) as T, isFirstLoad: false, isRefreshing: true };
  return { data: value, isFirstLoad: true, isRefreshing: false };
}

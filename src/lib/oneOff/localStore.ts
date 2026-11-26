import type { OneOffGame } from './types';

// An in-progress one-off lives only on this device until it is saved.
// Every localStorage access is guarded: private mode, quota and disabled
// storage all throw, and none of them should break the screen.

export function storageKey(userId: string): string {
  return `oneoff:v1:${userId}`;
}

/** A stored v1 payload, or null for a missing, unparseable or other-version value. */
export function parseGame(raw: string | null): OneOffGame | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as { version?: unknown }).version !== 1
    ) {
      return null;
    }
    return parsed as OneOffGame;
  } catch {
    return null;
  }
}

export function loadGame(userId: string): OneOffGame | null {
  try {
    return parseGame(localStorage.getItem(storageKey(userId)));
  } catch {
    return null;
  }
}

export function saveGame(userId: string, game: OneOffGame): boolean {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(game));
    return true;
  } catch {
    return false;
  }
}

export function clearGame(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

export function validateNames(names: string[]): string | null {
  const seen = new Set<string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed === '') return 'Every player needs a name';
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return `Two players are called ${trimmed}`;
    seen.add(key);
  }
  return null;
}

export function localDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

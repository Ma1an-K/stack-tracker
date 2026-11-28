import type { InviteCode } from '@/types/database';

/** True while a code can still be used to join: active, not expired, uses left. */
function isUsable(code: InviteCode, now: number): boolean {
  if (!code.is_active) return false;
  if (code.expires_at && Date.parse(code.expires_at) <= now) return false;
  if (code.max_uses != null && code.uses_count >= code.max_uses) return false;
  return true;
}

/**
 * The invite code host setup shows: the newest one that still works. Null means
 * the caller should create one (with the usual defaults).
 */
export function pickInviteCode(active: InviteCode[], now: number = Date.now()): InviteCode | null {
  let best: InviteCode | null = null;
  for (const code of active) {
    if (!isUsable(code, now)) continue;
    if (!best || Date.parse(code.created_at) > Date.parse(best.created_at)) best = code;
  }
  return best;
}

/** Set when the host copies or shares the invite; the Getting started checklist reads it. */
export function markInviteShared(homegameId: string): void {
  try {
    localStorage.setItem(`invite_shared:${homegameId}`, '1');
  } catch {
    /* storage unavailable: the checklist just keeps the invite item open */
  }
}

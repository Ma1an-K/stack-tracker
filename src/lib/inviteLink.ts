// Invite links (`/auth?mode=signup&code=XXXXXXXX`) carry the invite code so a
// player never has to type it. The code is only ever used to PREFILL a join
// field; joining always needs the player's own tap (same joinHomegame call).
//
// Only a well-formed 8-character code is accepted. A copy is kept on this
// device for 7 days so it survives the email-confirmation round trip, and so a
// signed-in member who opens the link is offered the join dialog in the app.

const PENDING_CODE_KEY = 'pendingInviteCode';
const PENDING_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function parseInviteCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.replace(/[\s-]/g, '').toUpperCase();
  return /^[A-Z0-9]{8}$/.test(code) ? code : null;
}

export function savePendingCode(code: string): void {
  try {
    localStorage.setItem(PENDING_CODE_KEY, JSON.stringify({ code, savedAt: Date.now() }));
  } catch {
    /* storage unavailable: the code is still in the invite message */
  }
}

export function readPendingCode(): string | null {
  try {
    const raw = localStorage.getItem(PENDING_CODE_KEY);
    if (!raw) return null;
    const { code, savedAt } = JSON.parse(raw) as { code?: string; savedAt?: number };
    if (typeof savedAt !== 'number' || Date.now() - savedAt > PENDING_CODE_TTL_MS) {
      localStorage.removeItem(PENDING_CODE_KEY);
      return null;
    }
    return parseInviteCode(code);
  } catch {
    return null;
  }
}

export function clearPendingCode(): void {
  try {
    localStorage.removeItem(PENDING_CODE_KEY);
  } catch {
    /* storage unavailable */
  }
}

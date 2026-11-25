/** New invite codes expire after this many days unless a positive number is given. */
export const DEFAULT_INVITE_EXPIRY_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export function inviteExpiresAt(expiresInDays?: number, now: number = Date.now()): string {
  const days = typeof expiresInDays === 'number' && Number.isFinite(expiresInDays) && expiresInDays > 0
    ? expiresInDays
    : DEFAULT_INVITE_EXPIRY_DAYS;
  return new Date(now + days * DAY_MS).toISOString();
}

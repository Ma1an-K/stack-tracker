import { toast } from '@/hooks/use-toast';
import { publicOrigin } from '@/lib/platform';
import { markInviteShared } from './ensureInviteCode';

/** The signup link that fills in the invite code. */
export function inviteLink(code: string): string {
  return `${publicOrigin()}/auth?mode=signup&code=${encodeURIComponent(code)}`;
}

/** Copies the invite link and marks the invite shared. Returns whether it worked. */
export async function copyInviteLink(homegameId: string, code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(inviteLink(code));
    markInviteShared(homegameId);
    toast({ title: 'Link copied', description: 'Paste it into your group chat.' });
    return true;
  } catch {
    toast({ title: 'Failed to copy', variant: 'destructive' });
    return false;
  }
}

/**
 * Opens the share sheet with the invite, falling back to copying the link when
 * sharing isn't available or fails. Returns whether the invite went out.
 */
export async function shareInvite(homegameId: string, homegameName: string, code: string): Promise<boolean> {
  if (!navigator.share) return copyInviteLink(homegameId, code);
  const text = `Join ${homegameName || 'our homegame'} on Stack Tracker: ${inviteLink(code)} (invite code ${code}).`;
  try {
    await navigator.share({ title: 'Stack Tracker invite', text });
    markInviteShared(homegameId);
    return true;
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return false;
    return copyInviteLink(homegameId, code);
  }
}

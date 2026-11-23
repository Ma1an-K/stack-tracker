import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useInviteCodes } from '@/hooks/useInviteCodes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Copy, Trash2, Loader2, Share2, Ticket } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

export function InviteCodesPage() {
  const { homegame, isOwner } = useAuthContext();
  const { inviteCodes, loading, createInviteCode, deactivateInviteCode, deleteInviteCode } = useInviteCodes(homegame?.id);
  const [creating, setCreating] = useState(false);

  const handleCreateCode = async () => {
    setCreating(true);
    await createInviteCode();
    setCreating(false);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: 'Invite code copied to clipboard',
    });
  };

  // Native share sheet with a ready-to-send message; falls back to copying it.
  const handleShareCode = async (code: string) => {
    const url = `${window.location.origin}/auth?mode=signup`;
    const text = `Join ${homegame?.name ?? 'our homegame'} on Stack Tracker. Sign up at ${url} and enter invite code ${code}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Stack Tracker invite', text });
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Invite copied', description: 'Paste it into your group chat.' });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={homegame?.name} title="Invites" />
        <EmptyState icon={Ticket} title="Owners only" description="Only homegame owners and admins can create invite codes. Ask yours for a code." />
      </div>
    );
  }

  if (loading) return <PageSkeleton rows={3} />;

  const active = inviteCodes.filter((c) => c.is_active);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={homegame?.name}
        title="Invites"
        subtitle="Share a code and your players can join this homegame."
      />

      <Button size="lg" className="w-full sm:w-auto" onClick={handleCreateCode} disabled={creating}>
        {creating ? <Loader2 className="animate-spin" /> : <Plus />}
        Create invite code
      </Button>

      {inviteCodes.length === 0 ? (
        <EmptyState icon={Ticket} title="No codes yet" description="Create one, then share it straight to your group chat." />
      ) : (
        <section className="space-y-3" aria-label="Invite codes">
          <h2 className="section-header px-1">
            {active.length} active code{active.length !== 1 ? 's' : ''}
          </h2>
          {inviteCodes.map((code) => (
            <Card key={code.id} className={code.is_active ? 'p-4' : 'p-4 opacity-60'}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <code className="font-display text-[2rem] font-semibold leading-none tracking-[0.18em] text-gold">{code.code}</code>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {code.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    {code.max_uses && (
                      <Badge variant="outline" className="tabular-nums">
                        {code.uses_count}/{code.max_uses} uses
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Created {format(new Date(code.created_at), 'MMM d, yyyy')}
                      {code.expires_at && ` · Expires ${format(new Date(code.expires_at), 'MMM d, yyyy')}`}
                    </span>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="-mr-2 -mt-2 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Delete code ${code.code}`}>
                      <Trash2 />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete code {code.code}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Anyone holding this code won't be able to join with it. This can't be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteInviteCode(code.id)}
                        className="bg-destructive bg-none text-destructive-foreground shadow-none hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {code.is_active && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button onClick={() => handleShareCode(code.code)}>
                    <Share2 />
                    Share invite
                  </Button>
                  <Button variant="secondary" onClick={() => handleCopyCode(code.code)}>
                    <Copy />
                    Copy code
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DELETE_CONFIRM_WORD = 'DELETE';

interface DeleteAccountSectionProps {
  /** Called once the account is gone, before navigating away. */
  onDeleted?: () => void;
}

export function DeleteAccountSection({ onDeleted }: DeleteAccountSectionProps) {
  const { deleteAccount } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const confirmed = confirmText.trim().toUpperCase() === DELETE_CONFIRM_WORD;

  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    setOpen(next);
    if (!next) setConfirmText('');
  };

  const handleDelete = async () => {
    if (!confirmed || loading) return;
    setLoading(true);
    const { error } = await deleteAccount();
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't delete your account", description: error.message, variant: 'destructive' });
      return;
    }
    setOpen(false);
    onDeleted?.();
    toast({ title: 'Your account has been deleted' });
    navigate('/', { replace: true });
  };

  return (
    <div className="mt-6 border-t border-border pt-4 space-y-2">
      <p className="text-sm font-medium text-destructive">Delete account</p>
      <p className="text-xs text-muted-foreground">
        Permanently deletes your account and personal data. See the{' '}
        <Link to="/privacy" className="underline underline-offset-2">privacy policy</Link>.
      </p>
      <Button type="button" variant="outline" className="w-full text-destructive" onClick={() => setOpen(true)}>
        Delete my account
      </Button>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>This can't be undone.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your profile, sign-in and saved one-off games are deleted.</li>
                  <li>Homegames you own pass to another member (an admin first, if there is one). Homegames with no other members are deleted.</li>
                  <li>Past sessions stay in each group's history under your player name, no longer linked to you.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Type {DELETE_CONFIRM_WORD} to confirm</Label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={loading}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={!confirmed || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

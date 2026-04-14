import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useInviteCodes } from '@/hooks/useInviteCodes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Copy, Trash2, Loader2, Link } from 'lucide-react';
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

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Only homegame owners can manage invite codes.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invite Codes</h1>
          <p className="text-muted-foreground">Create invite codes to let others join your homegame</p>
        </div>
        <Button onClick={handleCreateCode} disabled={creating}>
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Create Code
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Active Codes
          </CardTitle>
          <CardDescription>
            Share these codes with players you want to invite
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteCodes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No invite codes yet. Create one to invite players!
            </p>
          ) : (
            <div className="space-y-3">
              {inviteCodes.map((code) => (
                <div
                  key={code.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    code.is_active ? 'bg-muted/50' : 'bg-muted/20 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <code className="text-xl font-mono font-bold tracking-widest">
                      {code.code}
                    </code>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {code.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {code.max_uses && (
                          <Badge variant="outline">
                            {code.uses_count}/{code.max_uses} uses
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Created {format(new Date(code.created_at), 'MMM d, yyyy')}
                        {code.expires_at && ` • Expires ${format(new Date(code.expires_at), 'MMM d, yyyy')}`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {code.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyCode(code.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Invite Code</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this invite code? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteInviteCode(code.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

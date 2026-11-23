import { useAuthContext } from '@/contexts/AuthContext';
import { useHomegameMembers } from '@/hooks/useHomegameMembers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, UserMinus, Crown, Shield, ShieldOff } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/common/PageSkeleton';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function MembersPage() {
  const { homegame, isOwner, user, currentHomegame } = useAuthContext();
  const { members, loading, removeMember, updateMemberRole } = useHomegameMembers(homegame?.id);

  // Only the original owner can promote/demote
  const isOriginalOwner = currentHomegame?.role === 'owner';

  if (loading) return <PageSkeleton rows={5} />;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge className="gap-1"><Crown className="h-3 w-3" aria-hidden="true" /> Owner</Badge>;
      case 'admin':
        return <Badge variant="outline" className="gap-1 border-gold/30 text-gold"><Shield className="h-3 w-3" aria-hidden="true" /> Admin</Badge>;
      default:
        return <Badge variant="outline">Member</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={homegame?.name} title="Members" subtitle={`${members.length} ${members.length === 1 ? 'person' : 'people'} at this table`} />

      <Card>
        <CardHeader>
          <CardTitle className="section-header">All members</CardTitle>
          <CardDescription>
            {isOriginalOwner 
              ? 'Manage members and their permissions. Admins can do everything owners can.' 
              : isOwner 
                ? 'You have admin access to this homegame'
                : 'See who else is in this homegame'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No members yet.
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex min-h-[64px] items-center gap-3 rounded-xl border border-border/50 bg-muted/40 p-3"
                >
                  <Avatar className="flex-shrink-0">
                    <AvatarFallback className="bg-gold/10 font-display text-lg text-gold">
                      {member.profile?.username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate max-w-full">
                        {member.profile?.display_name || member.profile?.username || 'Unknown'}
                      </span>
                      {member.user_id === user?.id && (
                        <Badge variant="outline" className="flex-shrink-0">You</Badge>
                      )}
                      <div className="flex-shrink-0">{getRoleBadge(member.role)}</div>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono block truncate">
                      {member.profile?.username}#{member.profile?.discriminator}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {/* Admin toggle - only original owner can do this */}
                    {isOriginalOwner && member.role !== 'owner' && member.user_id !== user?.id && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {member.role === 'admin' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remove admin"
                              className="text-gold hover:text-gold/80"
                              onClick={() => updateMemberRole(member.id, 'member')}
                            >
                              <ShieldOff />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Make admin"
                              className="text-muted-foreground hover:text-gold"
                              onClick={() => updateMemberRole(member.id, 'admin')}
                            >
                              <Shield />
                            </Button>
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Remove member - owners and admins can do this */}
                    {isOwner && member.role !== 'owner' && member.user_id !== user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Remove member" className="text-destructive hover:text-destructive">
                            <UserMinus />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove member?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.profile?.display_name || member.profile?.username} from this homegame?
                              They will need a new invite code to rejoin.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMember(member.id)}
                              className="bg-destructive bg-none text-destructive-foreground shadow-none hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission info card */}
      <Card>
        <CardContent className="pt-4 sm:pt-5">
          <h3 className="section-header mb-3">Permission levels</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-gold" aria-hidden="true" />
              <span className="font-medium">Owner</span>
              <span className="text-muted-foreground">— Full control, can promote admins</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gold" aria-hidden="true" />
              <span className="font-medium">Admin</span>
              <span className="text-muted-foreground">— All owner permissions except promoting admins</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Member</span>
              <span className="text-muted-foreground">— Can view and log sessions</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

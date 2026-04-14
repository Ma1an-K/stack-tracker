import { useAuthContext } from '@/contexts/AuthContext';
import { useHomegameMembers } from '@/hooks/useHomegameMembers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Users, UserMinus, Crown, Shield, ShieldOff } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="default" className="gap-1"><Crown className="h-3 w-3" /> Owner</Badge>;
      case 'admin':
        return <Badge variant="secondary" className="gap-1 bg-primary/20 text-primary"><Shield className="h-3 w-3" /> Admin</Badge>;
      default:
        return <Badge variant="outline">Member</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-muted-foreground">People in {homegame?.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Members ({members.length})
          </CardTitle>
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
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {member.profile?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.profile?.display_name || member.profile?.username || 'Unknown'}
                        </span>
                        {member.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground font-mono">
                        {member.profile?.username}#{member.profile?.discriminator}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getRoleBadge(member.role)}
                    
                    {/* Admin toggle - only original owner can do this */}
                    {isOriginalOwner && member.role !== 'owner' && member.user_id !== user?.id && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {member.role === 'admin' ? (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-primary hover:text-primary/80"
                              onClick={() => updateMemberRole(member.id, 'member')}
                            >
                              <ShieldOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => updateMemberRole(member.id, 'admin')}
                            >
                              <Shield className="h-4 w-4" />
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
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.profile?.display_name || member.profile?.username} from this homegame?
                              They will need a new invite code to rejoin.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMember(member.id)}
                              className="bg-destructive hover:bg-destructive/90"
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
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-3">Permission Levels</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <span className="font-medium">Owner</span>
              <span className="text-muted-foreground">— Full control, can promote admins</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
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

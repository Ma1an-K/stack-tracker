import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut, Settings, ChevronDown, Users, Link, Plus, UserPlus, Bell, BellOff, UserPen, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { PokerChipSpade } from '@/components/icons/PokerChipSpade';
import { Link as RouterLink } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { HomegameDialog } from './HomegameDialog';

export function Header() {
  const { homegame, homegames, profile, isOwner, signOut, selectHomegame, updateProfile } = useAuthContext();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<'create' | 'join'>('create');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: '', username: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const { isSubscribed, isSupported, subscribe, unsubscribe } = usePushNotifications();

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) toast({ title: 'Notifications disabled' });
    } else {
      const ok = await subscribe();
      if (ok) {
        toast({ title: 'Notifications enabled', description: 'You\'ll be notified when sessions are logged.' });
      } else {
        toast({ title: 'Could not enable notifications', description: 'Please allow notifications in your browser settings.', variant: 'destructive' });
      }
    }
  };

  const openProfileDialog = () => {
    setProfileForm({
      display_name: profile?.display_name || '',
      username: profile?.username || '',
    });
    setProfileDialogOpen(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.username.trim()) {
      toast({ title: 'Username is required', variant: 'destructive' });
      return;
    }
    setProfileLoading(true);
    const { error } = await updateProfile({
      username: profileForm.username.trim(),
      display_name: profileForm.display_name.trim() || null,
    });
    setProfileLoading(false);
    if (error) {
      toast({ title: 'Failed to update profile', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated' });
      setProfileDialogOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const openCreateDialog = () => {
    setDialogTab('create');
    setDialogOpen(true);
  };

  const openJoinDialog = () => {
    setDialogTab('join');
    setDialogOpen(true);
  };

  return (
    <>
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="px-4 h-12 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <PokerChipSpade className="w-4.5 h-4.5 text-gold" />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto py-1 px-2 flex flex-col items-start min-w-0 max-w-[180px]">
                  <div className="flex items-center gap-1 min-w-0 w-full">
                    <span className="font-semibold truncate">{homegame?.name || 'Select Homegame'}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {isOwner ? (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">Owner</Badge>
                    ) : homegame ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">Member</Badge>
                    ) : null}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {homegames.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Your Homegames</DropdownMenuLabel>
                    {homegames.map((hg) => (
                      <DropdownMenuItem
                        key={hg.id}
                        onClick={() => selectHomegame(hg.id)}
                        className={homegame?.id === hg.id ? 'bg-accent' : ''}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{hg.name}</span>
                          <Badge variant={hg.role === 'owner' ? 'secondary' : 'outline'} className="text-[10px] font-normal">
                            {hg.role}
                          </Badge>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Homegame
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openJoinDialog}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Join with Invite Code
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {profile && (
              <span className="text-sm text-muted-foreground hidden sm:block font-mono">
                {profile.username}#{profile.discriminator}
              </span>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isSupported && (
                  <>
                    <DropdownMenuItem onClick={handleToggleNotifications}>
                      {isSubscribed ? (
                        <>
                          <BellOff className="mr-2 h-4 w-4" />
                          Disable Notifications
                        </>
                      ) : (
                        <>
                          <Bell className="mr-2 h-4 w-4" />
                          Enable Notifications
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {isOwner && (
                  <>
                    <DropdownMenuItem asChild>
                      <RouterLink to="/members" className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        Manage Members
                      </RouterLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <RouterLink to="/invites" className="flex items-center">
                        <Link className="mr-2 h-4 w-4" />
                        Invite Codes
                      </RouterLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={openProfileDialog}>
                  <UserPen className="mr-2 h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <HomegameDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTab={dialogTab}
      />

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your display name and username.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                placeholder="Your name"
                value={profileForm.display_name}
                onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="username"
                value={profileForm.username}
                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                maxLength={20}
                required
              />
              <p className="text-xs text-muted-foreground">Shown as {profileForm.username || 'username'}#{profile?.discriminator}</p>
            </div>
            <Button type="submit" className="w-full" disabled={profileLoading}>
              {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

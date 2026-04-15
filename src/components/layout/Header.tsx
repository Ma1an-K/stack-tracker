import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut, Settings, ChevronDown, Users, Link, Plus, UserPlus, Bell, BellOff, UserPen, Loader2, Trash2, Image, Award } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { Link as RouterLink } from 'react-router-dom';
import { HOMEGAME_ICONS, getIconSrc } from '@/lib/homegameIcons';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import { getStaticBadgeImage } from '@/assets/badges/static_badges';
import { getHeaterImage } from '@/assets/badges/heater';
import { getColdImage } from '@/assets/badges/cold';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { HomegameDialog } from './HomegameDialog';

export function Header() {
  const { homegame, homegames, profile, isOwner, signOut, selectHomegame, updateProfile, updateHomegame, deleteHomegame } = useAuthContext();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<'create' | 'join'>('create');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: '', username: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconLoading, setIconLoading] = useState(false);
  const [badgesDialogOpen, setBadgesDialogOpen] = useState(false);
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

  const handleDeleteHomegame = async () => {
    if (!homegame) return;
    setDeleteLoading(true);
    const { error } = await deleteHomegame(homegame.id);
    setDeleteLoading(false);
    setDeleteDialogOpen(false);
    if (error) {
      toast({ title: 'Failed to delete homegame', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Homegame deleted' });
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

  const handleSelectIcon = async (iconId: string) => {
    setIconLoading(true);
    const { error } = await updateHomegame({ icon_id: iconId });
    setIconLoading(false);
    if (error) {
      toast({ title: 'Failed to update icon', description: error.message, variant: 'destructive' });
    } else {
      setIconPickerOpen(false);
      toast({ title: 'Icon updated' });
    }
  };

  const handleToggleBadge = async (badgeId: string) => {
    const current = homegame?.disabled_badges ?? [];
    const updated = current.includes(badgeId)
      ? current.filter(id => id !== badgeId)
      : [...current, badgeId];
    const { error } = await updateHomegame({ disabled_badges: updated });
    if (error) {
      toast({ title: 'Failed to update badge', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <header className="border-b fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] backdrop-blur-sm bg-[rgba(13,16,30,0.97)] border-[rgba(200,155,60,0.28)] shadow-[0_2px_20px_rgba(200,155,60,0.08)]">
        <div className="px-4 h-12 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isOwner ? (
              <button
                data-tutorial="tutorial-homegame-icon"
                onClick={() => setIconPickerOpen(true)}
                className="rounded-lg focus:outline-none hover:ring-2 hover:ring-yellow-500/50 transition-all"
                aria-label="Change homegame icon"
              >
                <img src={getIconSrc(homegame?.icon_id)} alt={homegame?.name || 'Stack Tracker'} className="w-9 h-9 rounded-lg object-cover shadow-[0_0_12px_rgba(200,155,60,0.45)]" />
              </button>
            ) : (
              <img data-tutorial="tutorial-homegame-icon" src={getIconSrc(homegame?.icon_id)} alt={homegame?.name || 'Stack Tracker'} className="w-9 h-9 rounded-lg object-cover shadow-[0_0_12px_rgba(200,155,60,0.45)]" />
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto py-1 px-2 flex flex-col items-start min-w-0 max-w-[180px]">
                  <div className="flex items-center gap-1 min-w-0 w-full">
                    <span className="font-semibold truncate">{homegame?.name || 'Select Homegame'}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-xs flex items-center gap-1">
                    {isOwner ? (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-gold">Owner</span>
                    ) : homegame ? (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-gold/60">Member</span>
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
                <Button
                  data-tutorial="tutorial-settings"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg border border-[rgba(200,155,60,0.28)] bg-[rgba(200,155,60,0.10)] hover:bg-[rgba(200,155,60,0.18)] text-gold/70 hover:text-gold transition-colors"
                >
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
                    <DropdownMenuItem onClick={() => setIconPickerOpen(true)}>
                      <Image className="mr-2 h-4 w-4" />
                      Change Icon
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBadgesDialogOpen(true)}>
                      <Award className="mr-2 h-4 w-4" />
                      Badges
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Homegame
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{homegame?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the homegame and all its data — sessions, players, and results. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHomegame}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Homegame
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
        <DialogContent className="flex flex-col sm:max-w-sm max-h-[85vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Choose Homegame Icon</DialogTitle>
            <DialogDescription>Select a badge icon for your homegame.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
          <div className="grid grid-cols-4 gap-2 mt-2 pb-2">
            {HOMEGAME_ICONS.map((icon) => (
              <button
                key={icon.id}
                onClick={() => handleSelectIcon(icon.id)}
                disabled={iconLoading}
                className={`relative rounded-lg p-1 border-2 transition-colors hover:border-yellow-500/60 focus:outline-none ${homegame?.icon_id === icon.id ? 'border-yellow-500' : 'border-border/40'}`}
              >
                <img src={icon.src} alt={icon.label} className="w-full aspect-square object-cover rounded" />
                <span className="block text-center text-[10px] text-muted-foreground mt-1 truncate">{icon.label}</span>
                {iconLoading && homegame?.icon_id !== icon.id && null}
              </button>
            ))}
          </div>
          </div>
          {iconLoading && (
            <div className="flex justify-center mt-2 shrink-0">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={badgesDialogOpen} onOpenChange={setBadgesDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Homegame Badges</DialogTitle>
            <DialogDescription>Toggle which badges are shown for all members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {Object.values(BADGE_DEFINITIONS).map((badge) => {
              const isDisabled = (homegame?.disabled_badges ?? []).includes(badge.id);
              const img = badge.id === 'heater'
                ? getHeaterImage(3)
                : badge.id === 'ice_cold'
                  ? getColdImage(3)
                  : getStaticBadgeImage(badge.id);
              return (
                <div key={badge.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {img ? (
                      <img src={img} alt={badge.name} className="h-10 w-10 object-contain" />
                    ) : (
                      <span className="text-lg w-10 text-center">{badge.emoji}</span>
                    )}
                    <div>
                      <p className="text-sm font-medium">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={!isDisabled}
                    onCheckedChange={() => handleToggleBadge(badge.id)}
                  />
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

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

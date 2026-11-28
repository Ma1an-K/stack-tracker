import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut, ChevronDown, Users, Link, Plus, UserPlus, Bell, BellOff, UserPen, Loader2, Trash2, Image, Award, Check, Calculator, Shield, ChevronRight, LayoutGrid, Spade } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOneOffGame } from '@/contexts/OneOffGameContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { HOMEGAME_ICONS, getIconSrc } from '@/lib/homegameIcons';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import { getStaticBadgeImage } from '@/assets/badges/static_badges';
import { getHeaterImage } from '@/assets/badges/heater';
import { getColdImage } from '@/assets/badges/cold';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { HomegameDialog } from './HomegameDialog';
import { DeleteAccountSection } from './DeleteAccountSection';
import { readPendingCode, clearPendingCode } from '@/lib/inviteLink';

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
  const [clubOpen, setClubOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { isSubscribed, isSupported, subscribe, unsubscribe } = usePushNotifications();
  const { game: oneOff } = useOneOffGame();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  /** Close the Club sheet, then run the action (lets the sheet animate out first). */
  const fromClub = (fn: () => void) => () => {
    setClubOpen(false);
    fn();
  };

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

  // A signed-in member who opened an invite link lands here (the auth page saved
  // the code and redirected). Offer the join dialog once, prefilled; closing it
  // either way forgets the code so it doesn't reappear on every load.
  const [linkInviteCode, setLinkInviteCode] = useState<string | null>(null);
  useEffect(() => {
    const code = readPendingCode();
    if (!code) return;
    setLinkInviteCode(code);
    clearPendingCode();
    setDialogTab('join');
    setDialogOpen(true);
  }, []);

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
      <header className="glass fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] border-b border-gold/15">
        <div className="pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] h-14 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {!homegame ? (
              <>
                <img src="/icon-192x192.png" alt="" className="shrink-0 w-10 h-10 rounded-[10px] object-cover ring-1 ring-gold/40 shadow-[0_0_16px_-2px_hsl(var(--gold)/0.45)]" />
                <div className="flex min-h-[44px] min-w-0 flex-col items-start justify-center px-2">
                  <span className="truncate text-[0.9375rem] font-semibold leading-tight">Stack Tracker</span>
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] leading-tight text-gold/70">No homegame yet</span>
                </div>
              </>
            ) : (
              <>
                {isOwner ? (
                  <button
                    data-tutorial="tutorial-homegame-icon"
                    onClick={() => setIconPickerOpen(true)}
                    className="pressable shrink-0 rounded-xl p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Change homegame icon"
                  >
                    <img src={getIconSrc(homegame.icon_id)} alt="" className="w-10 h-10 rounded-[10px] object-cover ring-1 ring-gold/40 shadow-[0_0_16px_-2px_hsl(var(--gold)/0.45)]" />
                  </button>
                ) : (
                  <img data-tutorial="tutorial-homegame-icon" src={getIconSrc(homegame.icon_id)} alt="" className="shrink-0 w-10 h-10 rounded-[10px] object-cover ring-1 ring-gold/40 shadow-[0_0_16px_-2px_hsl(var(--gold)/0.45)]" />
                )}

                <button
                  onClick={() => setSwitcherOpen(true)}
                  className="pressable flex min-h-[44px] min-w-0 max-w-[60vw] flex-col items-start justify-center rounded-xl px-2 text-left hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:max-w-xs"
                  aria-label={`Current homegame ${homegame.name}. Switch homegame`}
                >
                  <span className="flex w-full min-w-0 items-center gap-1">
                    <span className="truncate text-[0.9375rem] font-semibold leading-tight">{homegame.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <span className={cn('text-[0.6875rem] font-semibold uppercase tracking-[0.14em] leading-tight', isOwner ? 'text-gold' : 'text-gold/70')}>
                    {isOwner ? 'Owner' : 'Member'}
                  </span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {profile && (
              <span className="mr-2 hidden text-sm text-muted-foreground lg:block tabular-nums">
                {profile.username}<span className="text-muted-foreground/80">#{profile.discriminator}</span>
              </span>
            )}
            {!isDesktop && (
              <button
                data-tutorial="tutorial-nav-players"
                onClick={() => navigate('/players')}
                className="pressable flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Players"
              >
                <Users className="h-5 w-5" />
              </button>
            )}
            <button
              data-tutorial="tutorial-settings"
              onClick={() => setClubOpen(true)}
              className="pressable flex h-11 w-11 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold hover:bg-gold/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Club menu and settings"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Homegame switcher (bottom sheet on mobile) */}
      <Dialog open={switcherOpen} onOpenChange={setSwitcherOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Your homegames</DialogTitle>
            <DialogDescription>Switch tables, start a new game or join one with a code.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {homegames.map((hg) => {
              const active = homegame?.id === hg.id;
              return (
                <button
                  key={hg.id}
                  onClick={() => {
                    selectHomegame(hg.id);
                    setSwitcherOpen(false);
                  }}
                  className={cn(
                    'pressable flex w-full min-h-[56px] items-center gap-3 rounded-xl border px-3 text-left',
                    active ? 'border-gold/40 bg-gold/10' : 'border-border/60 bg-secondary/50 hover:bg-accent'
                  )}
                  aria-current={active ? 'true' : undefined}
                >
                  <img src={getIconSrc(hg.icon_id)} alt="" className="h-9 w-9 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{hg.name}</span>
                    <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">{hg.role}</span>
                  </span>
                  {active && <Check className="h-5 w-5 text-gold" aria-label="Current" />}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="secondary" onClick={() => { setSwitcherOpen(false); openCreateDialog(); }}>
              <Plus /> Create
            </Button>
            <Button variant="secondary" onClick={() => { setSwitcherOpen(false); openJoinDialog(); }}>
              <UserPlus /> Join with code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Club sheet: replaces the old gear dropdown */}
      <Dialog open={clubOpen} onOpenChange={setClubOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Club</DialogTitle>
            {profile ? (
              <DialogDescription>
                Signed in as <span className="text-foreground">{profile.display_name || profile.username}</span>{' '}
                <span className="tabular-nums">({profile.username}#{profile.discriminator})</span>
              </DialogDescription>
            ) : (
              <DialogDescription>Settings for you and this homegame.</DialogDescription>
            )}
          </DialogHeader>

          {/* Owners get 6 tiles (two rows of 3), everyone else 4 (a 2x2), so the grid never ends on a lone tile. */}
          <div className={cn('grid gap-2', isOwner ? 'grid-cols-3' : 'grid-cols-2')}>
            <ClubTile icon={Users} label="Players" onClick={fromClub(() => navigate('/players'))} />
            <ClubTile icon={Calculator} label="Calculator" onClick={fromClub(() => navigate('/calculator'))} />
            <ClubTile
              icon={Spade}
              label={oneOff ? `Resume game · ${oneOff.players.length}` : 'One-off'}
              onClick={fromClub(() => navigate('/one-off'))}
            />
            <ClubTile icon={UserPen} label="Profile" onClick={fromClub(openProfileDialog)} />
            {isOwner && (
              <>
                <ClubTile icon={Shield} label="Members" onClick={fromClub(() => navigate('/members'))} />
                <ClubTile icon={Image} label="Icon" onClick={fromClub(() => setIconPickerOpen(true))} />
              </>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-border/60 bg-secondary/40 divide-y divide-border/50">
            {isOwner && (
              <>
                <ClubRow icon={Link} label="Invites" onClick={fromClub(() => navigate('/invites'))} />
                <ClubRow icon={Award} label="Badges" onClick={fromClub(() => setBadgesDialogOpen(true))} />
              </>
            )}
            {isSupported && (
              <ClubRow
                icon={isSubscribed ? BellOff : Bell}
                label={isSubscribed ? 'Disable notifications' : 'Enable notifications'}
                onClick={fromClub(handleToggleNotifications)}
              />
            )}
          </div>

          {/* Account exits kept apart from everyday settings */}
          <div className="mt-2 overflow-hidden rounded-xl border border-border/60 bg-secondary/40 divide-y divide-border/50">
            <ClubRow icon={LogOut} label="Sign out" onClick={fromClub(handleSignOut)} />
            {isOwner && (
              <ClubRow icon={Trash2} label="Delete homegame" destructive onClick={fromClub(() => setDeleteDialogOpen(true))} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <HomegameDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setLinkInviteCode(null);
        }}
        defaultTab={dialogTab}
        initialInviteCode={dialogTab === 'join' ? linkInviteCode : null}
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
              className="bg-destructive text-destructive-foreground bg-none shadow-none hover:bg-destructive/90"
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
                aria-pressed={homegame?.icon_id === icon.id}
                className={`relative rounded-lg p-1 border-2 transition-colors hover:border-gold/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${homegame?.icon_id === icon.id ? 'border-gold shadow-[0_0_18px_-4px_hsl(var(--gold)/0.6)]' : 'border-border/40'}`}
              >
                <img src={icon.src} alt={icon.label} className="w-full aspect-square object-cover rounded" />
                <span className="block text-center text-[0.6875rem] text-muted-foreground mt-1 truncate">{icon.label}</span>
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
                    aria-label={`Show the ${badge.name} badge`}
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
                autoComplete="nickname"
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
                autoComplete="username"
                autoCapitalize="none"
                maxLength={20}
                required
              />
              <p className="text-xs text-muted-foreground">Shown as {profileForm.username || 'username'}#{profile?.discriminator}</p>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={profileLoading}>
              {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
          <DeleteAccountSection onDeleted={() => setProfileDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}


function ClubTile({ icon: Icon, label, onClick }: { icon: typeof Users; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="pressable flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/50 px-2 text-[0.8125rem] font-medium hover:border-gold/30 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      {label}
    </button>
  );
}

function ClubRow({ icon: Icon, label, onClick, destructive }: { icon: typeof Users; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full min-h-[52px] items-center gap-3 px-4 text-left text-sm font-medium transition-colors hover:bg-accent focus:outline-none focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        destructive ? 'text-destructive' : 'text-foreground'
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 opacity-80" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
    </button>
  );
}

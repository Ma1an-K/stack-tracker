export interface TourStep {
  targetId: string;
  title: string;
  description: string;
}

export const OWNER_TOUR: TourStep[] = [
  {
    targetId: 'tutorial-homegame-icon',
    title: 'Homegame Icon',
    description: 'Tap your homegame icon to change it anytime.',
  },
  {
    targetId: 'tutorial-settings',
    title: 'Settings',
    description: 'All your homegame settings are here — invite codes, manage members, badge toggles.',
  },
  {
    targetId: 'tutorial-new-session',
    title: 'New Session',
    description: 'Tap the gold + to log a new poker session.',
  },
  {
    targetId: 'tutorial-nav-players',
    title: 'Players',
    description: 'Add your crew here before logging sessions.',
  },
  {
    targetId: 'tutorial-nav-sessions',
    title: 'Sessions',
    description: 'View and manage all your recorded sessions here.',
  },
  {
    targetId: 'tutorial-nav-standings',
    title: 'Standings',
    description: "See the leaderboard and who's up or down across all sessions.",
  },
  {
    targetId: 'tutorial-nav-stats',
    title: 'My Stats',
    description: 'Your personal profit chart, badges, and session history.',
  },
  {
    targetId: 'tutorial-install',
    title: 'Add to Home Screen',
    description: 'Install Stack Tracker on your home screen for the best experience — faster loads, full screen, no browser bar.',
  },
];

export const PLAYER_TOUR: TourStep[] = [
  {
    targetId: 'tutorial-dashboard',
    title: 'Dashboard',
    description: 'Your home base — see your overall profit, recent sessions, and homegames at a glance.',
  },
  {
    targetId: 'tutorial-new-session',
    title: 'New Session',
    description: 'Tap the gold + to log a new poker session.',
  },
  {
    targetId: 'tutorial-nav-players',
    title: 'Claim Your Player ⚡',
    description: "Find your name in the Players list and tap Claim. This links your account to your player profile — so all your session results show up under My Stats. Without it, your stats won't appear under your account.",
  },
  {
    targetId: 'tutorial-nav-sessions',
    title: 'Sessions',
    description: 'Browse all recorded sessions and see results.',
  },
  {
    targetId: 'tutorial-nav-standings',
    title: 'Standings',
    description: "See where everyone ranks. Who's up, who's down, and this month's badges.",
  },
  {
    targetId: 'tutorial-nav-stats',
    title: 'My Stats',
    description: 'Your personal profit chart, win rate, badges, and full session history.',
  },
  {
    targetId: 'tutorial-settings',
    title: 'Settings',
    description: 'Edit your profile name and manage notification settings here.',
  },
  {
    targetId: 'tutorial-install',
    title: 'Add to Home Screen',
    description: 'Install Stack Tracker on your home screen for the best experience — faster loads, full screen, no browser bar.',
  },
];

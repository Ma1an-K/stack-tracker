export type ShellRoute = 'splash' | 'landing' | 'auth' | 'shell';

export interface ShellRouteInput {
  loading: boolean;
  user: boolean;
  homegame: boolean;
  pathname: string;
  native: boolean;
}

/**
 * What the signed-in app shell should render. Any signed-in user gets the
 * shell, with or without a homegame. Signed-out visitors get the marketing
 * page on "/" in a browser and the sign-in page everywhere else (the native
 * app and the installed web app open straight on sign-in).
 */
export function shellRoute({ loading, user, pathname, native }: ShellRouteInput): ShellRoute {
  if (loading) return 'splash';
  if (user) return 'shell';
  if (pathname === '/' && !native) return 'landing';
  return 'auth';
}

import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthPage } from "@/components/auth/AuthPage";
import { LandingPage } from "@/pages/LandingPage";
import { WelcomeLayout } from "@/pages/welcome/WelcomeLayout";
import { isNativeApp } from "@/lib/platform";
import { shellRoute } from "@/lib/shellRoute";
import { PublicSettlementPage } from "@/pages/PublicSettlementPage";
import { PublicHandCalculatorPage } from "@/pages/PublicHandCalculatorPage";
import { AboutPage } from "@/pages/AboutPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PasswordInput } from "@/components/common/PasswordInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { SplashScreen } from "@/components/common/SplashScreen";
import { RouteErrorBoundary } from "@/components/common/RouteErrorBoundary";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Signed-in screens are code-split; the public, prerendered pages stay eager so
// hydration of their static HTML is synchronous.
const loaders = {
  dashboard: () => import("@/pages/DashboardPage"),
  sessions: () => import("@/pages/SessionsPage"),
  newSession: () => import("@/pages/NewSessionPage"),
  leaderboard: () => import("@/pages/LeaderboardPage"),
  players: () => import("@/pages/PlayersPage"),
  myStats: () => import("@/pages/MyStatsPage"),
  invites: () => import("@/pages/InviteCodesPage"),
  members: () => import("@/pages/MembersPage"),
  calculator: () => import("@/pages/CalculatorPage"),
  badgePreview: () => import("@/pages/BadgePreviewPage"),
  live: () => import("@/pages/LiveSessionPage"),
  oneOffHub: () => import("@/pages/oneoff/OneOffHubPage"),
  oneOffLive: () => import("@/pages/oneoff/OneOffLivePage"),
  oneOffSettle: () => import("@/pages/oneoff/OneOffSettlePage"),
  oneOffSaved: () => import("@/pages/oneoff/SavedOneOffPage"),
  welcomeChoice: () => import("@/pages/welcome/WelcomeChoicePage"),
};

const DashboardPage = lazy(() => loaders.dashboard().then((m) => ({ default: m.DashboardPage })));
const SessionsPage = lazy(() => loaders.sessions().then((m) => ({ default: m.SessionsPage })));
const NewSessionPage = lazy(() => loaders.newSession().then((m) => ({ default: m.NewSessionPage })));
const LeaderboardPage = lazy(() => loaders.leaderboard().then((m) => ({ default: m.LeaderboardPage })));
const PlayersPage = lazy(() => loaders.players().then((m) => ({ default: m.PlayersPage })));
const MyStatsPage = lazy(() => loaders.myStats().then((m) => ({ default: m.MyStatsPage })));
const InviteCodesPage = lazy(() => loaders.invites().then((m) => ({ default: m.InviteCodesPage })));
const MembersPage = lazy(() => loaders.members().then((m) => ({ default: m.MembersPage })));
const CalculatorPage = lazy(() => loaders.calculator().then((m) => ({ default: m.CalculatorPage })));
const BadgePreviewPage = lazy(() => loaders.badgePreview().then((m) => ({ default: m.BadgePreviewPage })));
const LiveSessionPage = lazy(() => loaders.live().then((m) => ({ default: m.LiveSessionPage })));
const OneOffHubPage = lazy(() => loaders.oneOffHub().then((m) => ({ default: m.OneOffHubPage })));
const OneOffLivePage = lazy(() => loaders.oneOffLive().then((m) => ({ default: m.OneOffLivePage })));
const OneOffSettlePage = lazy(() => loaders.oneOffSettle().then((m) => ({ default: m.OneOffSettlePage })));
const SavedOneOffPage = lazy(() => loaders.oneOffSaved().then((m) => ({ default: m.SavedOneOffPage })));
const WelcomeChoicePage = lazy(() => loaders.welcomeChoice().then((m) => ({ default: m.WelcomeChoicePage })));

/** Warm every signed-in screen's chunk once the shell is idle, so tab switches never wait on the network. */
function usePrefetchRoutes(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const run = () => Object.values(loaders).forEach((load) => load().catch(() => {}));
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run);
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(run, 1200);
    return () => window.clearTimeout(id);
  }, [enabled]);
}

const queryClient = new QueryClient();

/**
 * One persistent shell for every signed-in screen (including "/"), so Header,
 * Navigation and LiveSessionProvider are mounted once and never remount on a
 * tab change. Signed-in users get it with or without a homegame. Signed-out
 * visitors get the landing page on "/" and are sent to /auth everywhere else.
 */
function AppShell() {
  const { user, homegame, loading } = useAuthContext();
  const { pathname } = useLocation();
  usePrefetchRoutes(!loading && !!user);

  const route = shellRoute({ loading, user: !!user, homegame: !!homegame, pathname, native: isNativeApp() });
  if (route === "splash") return <SplashScreen />;
  if (route === "landing") return <LandingPage />;
  if (route === "auth") return <Navigate to="/auth" replace />;

  return (
    <MainLayout>
      <RouteErrorBoundary resetKey={pathname}>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </RouteErrorBoundary>
    </MainLayout>
  );
}

function AuthRoute() {
  const { loading } = useAuthContext();
  if (loading) return <SplashScreen />;
  // Redirect is handled in AuthPage via useEffect
  return <AuthPage />;
}

// Dev-server only: __ADMIN_ENABLED__ is false in every build, so this (and the page) is tree-shaken out.
const AdminPage = __ADMIN_ENABLED__ ? lazy(() => import("./pages/AdminPage")) : null;

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/poker-settlement-calculator" element={<PublicSettlementPage />} />
      <Route path="/poker-hand-calculator" element={<PublicHandCalculatorPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      {/* First run: full screen, outside the app shell. */}
      <Route path="/welcome" element={<WelcomeLayout />}>
        <Route index element={<WelcomeChoicePage />} />
      </Route>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/new-session" element={<NewSessionPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/my-stats" element={<MyStatsPage />} />
        <Route path="/invites" element={<InviteCodesPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/badge-preview" element={<BadgePreviewPage />} />
        <Route path="/live-session" element={<LiveSessionPage />} />
        <Route path="/one-off" element={<OneOffHubPage />} />
        <Route path="/one-off/live" element={<OneOffLivePage />} />
        <Route path="/one-off/settle" element={<OneOffSettlePage />} />
        <Route path="/one-off/saved/:id" element={<SavedOneOffPage />} />
      </Route>
      {__ADMIN_ENABLED__ && AdminPage && (
        <Route path="/admin" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
      )}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function PasswordResetDialog() {
  const { isRecovery, updatePassword } = useAuthContext();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      toast({ title: 'Failed to update password', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated successfully' });
      setPassword('');
      setConfirm('');
    }
  };

  return (
    <Dialog open={isRecovery}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set New Password</DialogTitle>
          <DialogDescription>Enter your new password to complete the reset.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GlobalEffects() {
  useKeyboardInset();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <GlobalEffects />
      <BrowserRouter>
        <AuthProvider>
          <TutorialProvider>
            <PasswordResetDialog />
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </TutorialProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

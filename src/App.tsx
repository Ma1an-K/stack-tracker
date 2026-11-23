import { lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthPage } from "@/components/auth/AuthPage";
import { LandingPage } from "@/pages/LandingPage";
import { PublicSettlementPage } from "@/pages/PublicSettlementPage";
import { PublicHandCalculatorPage } from "@/pages/PublicHandCalculatorPage";
import { AboutPage } from "@/pages/AboutPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { SplashScreen } from "@/components/common/SplashScreen";

// Signed-in screens are code-split; the public, prerendered pages stay eager so
// hydration of their static HTML is synchronous.
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const SessionsPage = lazy(() => import("@/pages/SessionsPage").then((m) => ({ default: m.SessionsPage })));
const NewSessionPage = lazy(() => import("@/pages/NewSessionPage").then((m) => ({ default: m.NewSessionPage })));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage").then((m) => ({ default: m.LeaderboardPage })));
const PlayersPage = lazy(() => import("@/pages/PlayersPage").then((m) => ({ default: m.PlayersPage })));
const MyStatsPage = lazy(() => import("@/pages/MyStatsPage").then((m) => ({ default: m.MyStatsPage })));
const InviteCodesPage = lazy(() => import("@/pages/InviteCodesPage").then((m) => ({ default: m.InviteCodesPage })));
const MembersPage = lazy(() => import("@/pages/MembersPage").then((m) => ({ default: m.MembersPage })));
const CalculatorPage = lazy(() => import("@/pages/CalculatorPage").then((m) => ({ default: m.CalculatorPage })));
const BadgePreviewPage = lazy(() => import("@/pages/BadgePreviewPage").then((m) => ({ default: m.BadgePreviewPage })));
const LiveSessionPage = lazy(() => import("@/pages/LiveSessionPage").then((m) => ({ default: m.LiveSessionPage })));

const queryClient = new QueryClient();

/**
 * One persistent shell for every signed-in screen (including "/"), so Header,
 * Navigation and LiveSessionProvider are mounted once and never remount on a
 * tab change. Signed-out visitors get the landing page on "/" and are sent to
 * /auth everywhere else (same behaviour as before).
 */
function AppShell() {
  const { user, homegame, loading } = useAuthContext();
  const { pathname } = useLocation();

  if (loading) return <SplashScreen />;

  if (!user || !homegame) {
    if (pathname === "/") return <LandingPage />;
    return <Navigate to="/auth" replace />;
  }

  return (
    <MainLayout>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </MainLayout>
  );
}

function AuthRoute() {
  const { loading } = useAuthContext();
  if (loading) return <SplashScreen />;
  // Redirect is handled in AuthPage via useEffect
  return <AuthPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/poker-settlement-calculator" element={<PublicSettlementPage />} />
      <Route path="/poker-hand-calculator" element={<PublicHandCalculatorPage />} />
      <Route path="/about" element={<AboutPage />} />
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
      </Route>
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
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
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
            <AppRoutes />
          </TutorialProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

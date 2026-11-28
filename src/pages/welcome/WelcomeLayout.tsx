import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { SplashScreen } from '@/components/common/SplashScreen';

/**
 * First-run screens: full screen, no header or tab bar. Each page draws its
 * own AuthScreen chrome so it matches sign-in. Signed-out visitors go to /auth.
 */
export function WelcomeLayout() {
  const { user, loading } = useAuthContext();
  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <Suspense fallback={<SplashScreen />}>
      <Outlet />
    </Suspense>
  );
}

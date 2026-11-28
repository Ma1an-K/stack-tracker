import { Navigate, useNavigate } from 'react-router-dom';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { APP_ICON } from '@/components/install/InstallGuide';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { isPhoneContext } from '@/lib/installContext';
import { markContinuedInBrowser } from '@/lib/installFirst';

/**
 * Where the sign-up confirmation email lands. The link signs this browser in, but
 * on a phone they most likely installed first, and a Home Screen app on iPhone
 * doesn't share sign-in with the browser, so point them back to the app. Anywhere
 * else, carry straight on into the app.
 */
export function ConfirmedPage() {
  const { context } = useInstallPrompt();
  const navigate = useNavigate();

  if (!isPhoneContext(context)) return <Navigate to="/" replace />;

  const continueHere = () => {
    markContinuedInBrowser();
    navigate('/', { replace: true });
  };

  return (
    <AuthScreen headline="You're confirmed">
      <div className="flex items-center gap-4">
        <img src={APP_ICON} alt="" className="h-[60px] w-[60px] shrink-0 rounded-[14px]" />
        <p className="text-base text-foreground">Open Stack Tracker from your Home Screen to sign in</p>
      </div>
      <div className="min-h-8 flex-1" />
      <Button variant="ghost" className="min-h-[44px] w-full text-muted-foreground" onClick={continueHere}>
        Continue here instead
      </Button>
    </AuthScreen>
  );
}

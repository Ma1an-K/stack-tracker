import { useInstallNudge } from '@/contexts/InstallNudgeContext';
import { GetTheApp } from './GetTheApp';

/**
 * The gentle reminder on Home. Visibility (dismissals, snooze, the open sheet) lives in
 * InstallNudgeProvider; GetTheApp renders nothing once installed, natively or on a laptop.
 */
export function InstallBanner() {
  const { bannerVisible, dismissBanner } = useInstallNudge();
  if (!bannerVisible) return null;
  return <GetTheApp variant="banner" onDismiss={dismissBanner} />;
}

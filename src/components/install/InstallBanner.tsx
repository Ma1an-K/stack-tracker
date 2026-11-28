import { useState } from 'react';
import { useInstallNudge } from '@/contexts/InstallNudgeContext';
import { nudgeState, readNudge, writeNudge } from '@/lib/installNudge';
import { GetTheApp } from './GetTheApp';

// A closed banner stays away for the rest of this visit and comes back next time,
// until the second close stops it for good.
const HIDDEN_THIS_VISIT = 'install_banner_hidden';

function hiddenThisVisit() {
  try {
    return sessionStorage.getItem(HIDDEN_THIS_VISIT) === '1';
  } catch {
    return false;
  }
}

/** The gentle reminder on Home. GetTheApp renders nothing once installed, natively or on a laptop. */
export function InstallBanner() {
  const { sheetOpen } = useInstallNudge();
  const [visible, setVisible] = useState(
    () => !hiddenThisVisit() && nudgeState(readNudge(), Date.now()).bannerVisible,
  );

  if (!visible || sheetOpen) return null;

  const dismiss = () => {
    writeNudge({ bannerDismissals: (readNudge().bannerDismissals ?? 0) + 1 });
    try {
      sessionStorage.setItem(HIDDEN_THIS_VISIT, '1');
    } catch {
      // Storage blocked: it may show again on the next visit to Home.
    }
    setVisible(false);
  };

  return <GetTheApp variant="banner" onDismiss={dismiss} />;
}

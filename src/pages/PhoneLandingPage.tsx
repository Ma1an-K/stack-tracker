import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Clock, Image, Mail, Map, Music, StickyNote, type LucideIcon } from 'lucide-react';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { GetTheApp } from '@/components/install/GetTheApp';
import { APP_ICON, InviteCallout } from '@/components/install/InstallGuide';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { savePendingCode } from '@/lib/inviteLink';

// Generic glyphs on neutral tiles: they read as "other apps" without copying any vendor's icon artwork.
const OTHER_APPS: { name: string; Icon: LucideIcon }[] = [
  { name: 'Photos', Icon: Image },
  { name: 'Maps', Icon: Map },
  { name: 'Music', Icon: Music },
  { name: 'Notes', Icon: StickyNote },
  { name: 'Mail', Icon: Mail },
  { name: 'Camera', Icon: Camera },
  { name: 'Clock', Icon: Clock },
];

/** A drawn Home Screen with Stack Tracker in the last slot, so "Add to Home Screen" reads as a picture. */
function HomeScreen() {
  return (
    <div
      aria-hidden="true"
      className="mb-6 mt-1 grid grid-cols-4 gap-x-2 gap-y-3.5 rounded-[20px] border border-border bg-[radial-gradient(120%_90%_at_50%_0%,hsl(30_30%_18%),hsl(24_12%_8%))] px-3 pb-3.5 pt-[18px]"
    >
      {OTHER_APPS.map(({ name, Icon }) => (
        <div key={name} className="grid justify-items-center gap-[5px] text-[0.625rem] text-[hsl(38_20%_80%)]">
          <i className="grid h-[46px] w-[46px] place-items-center rounded-[11px] bg-[hsl(24_6%_20%)]">
            <Icon className="h-[22px] w-[22px] text-[hsl(38_20%_80%/0.55)]" strokeWidth={1.75} />
          </i>
          {name}
        </div>
      ))}
      <div className="grid justify-items-center gap-[5px] text-[0.625rem] text-[hsl(38_20%_80%)]">
        <img src={APP_ICON} alt="" className="h-[46px] w-[46px] rounded-[11px] motion-safe:animate-pulse" />
        Stack Tracker
      </div>
    </div>
  );
}

export interface PhoneLandingPageProps {
  /** A valid invite code from the link, if they arrived on one. */
  inviteCode?: string | null;
  /** "Continue in browser": the caller shows the normal page. */
  onContinue: () => void;
}

/**
 * What a signed-out visitor sees on a phone browser: one screen whose job is
 * getting Stack Tracker onto the Home Screen before they sign up. The full
 * marketing page stays one tap away ("Learn more").
 */
export function PhoneLandingPage({ inviteCode, onContinue }: PhoneLandingPageProps) {
  const { context } = useInstallPrompt();

  // Keep the code on this device now, so it survives them installing instead of continuing.
  useEffect(() => {
    if (inviteCode) savePendingCode(inviteCode);
  }, [inviteCode]);

  return (
    <AuthScreen headline="Your poker night, one tap away.">
      <p className="mb-5 text-sm text-muted-foreground">
        Log games, settle up and track standings. Built for the phone in your pocket.
      </p>
      <HomeScreen />
      {/* The in-app block already shows the code next to its own steps. */}
      {inviteCode && context !== 'in-app' && (
        <div className="mb-4">
          <InviteCallout code={inviteCode} />
        </div>
      )}
      <GetTheApp variant="landing" inviteCode={inviteCode ?? undefined} onContinue={onContinue} />
      <div className="min-h-4 flex-1" />
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Free · No ads ·{' '}
        <Link
          to="/?learn=1"
          className="inline-flex min-h-[44px] items-center px-1 text-foreground underline underline-offset-4"
        >
          Learn more
        </Link>
      </p>
    </AuthScreen>
  );
}

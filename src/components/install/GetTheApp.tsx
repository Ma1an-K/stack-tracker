import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { isPhoneContext } from '@/lib/installContext';
import { publicOrigin } from '@/lib/platform';
import { APP_ICON, InstallGuide, OpenInSafari } from './InstallGuide';
import { PhoneQr } from './PhoneQr';

export interface GetTheAppProps {
  /**
   * landing: full block for the phone landing page.
   * sheet: compact block inside a bottom sheet.
   * banner: slim dismissable row.
   * hero: the laptop hero's QR code to open it on a phone (laptops only).
   */
  variant: 'landing' | 'sheet' | 'banner' | 'hero';
  /** Shown in the guide, because the installed app can't read the invite link. */
  inviteCode?: string;
  /** "Continue in browser" (landing), or "Continue here" inside an in-app browser. */
  onContinue?: () => void;
  /** The banner's ×. */
  onDismiss?: () => void;
}

function storeLinks() {
  const appStore = import.meta.env.VITE_APP_STORE_URL as string | undefined;
  const playStore = import.meta.env.VITE_PLAY_STORE_URL as string | undefined;
  return appStore && playStore ? { appStore, playStore } : null;
}

function StoreBadge({ href, small, name }: { href: string; small: string; name: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-[44px] flex-col justify-center rounded-[10px] border border-[hsl(0_0%_30%)] bg-[hsl(0_0%_2%)] px-3 py-2 leading-tight text-white"
    >
      <small className="text-[0.625rem] text-[hsl(0_0%_75%)]">{small}</small>
      <b className="text-[0.9375rem] font-semibold">{name}</b>
    </a>
  );
}

function LaptopHero() {
  return (
    <div className="flex items-center gap-6">
      <PhoneQr url={`${publicOrigin()}/`} />
      <div className="max-w-[16rem] space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Stack Tracker lives on your phone, next to the cards. Scan the code to put it on your home screen.
        </p>
        <Button asChild variant="outline" size="lg">
          <Link to="/auth?mode=signup">Or use it here</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * The one way to offer installing Stack Tracker. Picks store badges, the browser's
 * install prompt or a drawn guide to match the device. A laptop gets only the hero's
 * QR code, for opening it on a phone. Renders nothing where installing doesn't apply
 * (already installed, or the native app).
 */
export function GetTheApp({ variant, inviteCode, onContinue, onDismiss }: GetTheAppProps) {
  const { context, trigger } = useInstallPrompt();
  const [guideOpen, setGuideOpen] = useState(false);

  // A laptop can't usefully install, so the hero offers the phone instead.
  if (variant === 'hero') return context === 'desktop' ? <LaptopHero /> : null;
  if (!isPhoneContext(context)) return null;

  // Installing from inside a webview fails either way, so it always gets the open-in-browser help.
  const stores = context === 'in-app' ? null : storeLinks();
  const install = () => (trigger ? trigger() : setGuideOpen(true));

  const guide = (
    <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle className="sr-only">Add Stack Tracker to your Home Screen</DialogTitle>
        <InstallGuide context={context} inviteCode={inviteCode} />
        {onContinue && (
          <Button
            variant="link"
            className="w-full"
            onClick={() => {
              setGuideOpen(false);
              onContinue();
            }}
          >
            Skip, use it in the browser
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );

  if (variant === 'banner') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-gold/35 bg-gold/10 py-1 pl-3 pr-1 text-[0.8125rem]">
        <img src={APP_ICON} alt="" className="h-7 w-7 rounded-[7px]" />
        <span className="flex-1">Put Stack Tracker on your Home Screen</span>
        <Button variant="ghost" size="sm" className="h-11 px-2 text-gold" onClick={install}>
          How
        </Button>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Dismiss" onClick={onDismiss}>
            <X aria-hidden="true" />
          </Button>
        )}
        {guide}
      </div>
    );
  }

  // An in-app browser can't install at all, so the landing page leads with the way out.
  if (variant !== 'sheet' && context === 'in-app') {
    return (
      <div className="space-y-3">
        <OpenInSafari context="in-app" inviteCode={inviteCode} />
        {onContinue && (
          <Button variant="link" className="w-full" onClick={onContinue}>
            Continue here
          </Button>
        )}
      </div>
    );
  }

  const primary = stores ? (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-2.5">
        <StoreBadge href={stores.appStore} small="Download on the" name="App Store" />
        <StoreBadge href={stores.playStore} small="Get it on" name="Google Play" />
      </div>
      <Button variant="link" className="w-full" onClick={install}>
        or add it from your browser
      </Button>
    </div>
  ) : (
    <Button size="lg" className="w-full" onClick={install}>
      {variant === 'sheet' ? 'Show me how' : 'Add to Home Screen'}
    </Button>
  );

  return (
    <div className="space-y-2">
      {primary}
      {variant !== 'sheet' && onContinue && (
        <Button variant="ghost" size="lg" className="w-full" onClick={onContinue}>
          Continue in browser
        </Button>
      )}
      {guide}
    </div>
  );
}

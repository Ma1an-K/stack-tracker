import { useRef, useState, type ReactNode } from 'react';
import { EllipsisVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InstallContext } from '@/lib/installContext';

export const APP_ICON = '/apple-touch-icon-120x120.png';

/** Safari's Share icon, drawn the way the toolbar shows it. */
export function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function AddSquareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

// Safari and Chrome draw their toolbar icons in system blue.
const glyphClass = 'grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-secondary text-[hsl(210_90%_66%)] [&_svg]:h-[18px] [&_svg]:w-[18px]';

function Step({ n, children, glyph }: { n: number; children: ReactNode; glyph: ReactNode }) {
  return (
    <li className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
      <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-gold/15 text-xs font-bold text-gold">{n}</span>
      <span>{children}</span>
      {glyph}
    </li>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{children}</p>;
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-[1.75rem] font-semibold leading-tight text-foreground">{children}</h2>;
}

export function InviteCallout({ code }: { code: string }) {
  return (
    <p className="rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
      <b className="text-foreground">Joining a game?</b> Keep your code handy: <b className="text-foreground">{code}</b>. The app asks for it once you open it.
    </p>
  );
}

/** Copies the current page link; when the clipboard is blocked, selects it so the user can copy by hand. */
function CopyLink() {
  const url = window.location.href;
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  const selectLink = () => {
    const el = codeRef.current;
    const selection = window.getSelection();
    if (!el || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      selectLink();
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card py-1 pl-3 pr-1 text-[0.8125rem]">
      <code ref={codeRef} className="min-w-0 flex-1 select-all truncate text-muted-foreground">{url}</code>
      <Button variant="ghost" size="sm" className="h-11 text-gold" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}

function IosSteps({ inviteCode }: { inviteCode?: string }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Eyebrow>On iPhone</Eyebrow>
        <Heading>Add it in three taps</Heading>
      </div>
      <ol className="grid gap-2.5">
        <Step n={1} glyph={<span className={glyphClass}><ShareIcon /></span>}>
          Tap <b>Share</b> in Safari's bar
        </Step>
        <Step n={2} glyph={<span className={glyphClass}><AddSquareIcon /></span>}>
          Scroll down, tap <b>Add to Home Screen</b>
        </Step>
        <Step n={3} glyph={<img src={APP_ICON} alt="" className="h-[34px] w-[34px] rounded-[9px]" />}>
          Tap <b>Add</b>, then open Stack Tracker from your Home Screen
        </Step>
      </ol>
      {inviteCode && <InviteCallout code={inviteCode} />}
      {/* Safari's toolbar sits just below this sheet. */}
      <p className="flex items-center justify-center gap-2 pt-1 text-xs font-semibold text-gold-bright" aria-hidden="true">
        Tap
        <span className="grid h-8 w-8 place-items-center text-[hsl(210_90%_66%)]">
          <ShareIcon className="h-5 w-5" />
        </span>
        below
        <span className="inline-block motion-safe:animate-bounce">↓</span>
      </p>
    </div>
  );
}

function AndroidSteps({ inviteCode }: { inviteCode?: string }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Eyebrow>On Android</Eyebrow>
        <Heading>Add it in two taps</Heading>
      </div>
      <ol className="grid gap-2.5">
        <Step n={1} glyph={<span className={glyphClass}><EllipsisVertical /></span>}>
          Tap <b>⋮</b> in Chrome's top bar
        </Step>
        <Step n={2} glyph={<img src={APP_ICON} alt="" className="h-[34px] w-[34px] rounded-[9px]" />}>
          Tap <b>Install app</b>, then open Stack Tracker from your Home Screen
        </Step>
      </ol>
      {inviteCode && <InviteCallout code={inviteCode} />}
    </div>
  );
}

/** For browsers that can't add to the Home Screen: in-app webviews (iOS or Android), and Chrome or Firefox on iPhone. */
export function OpenInSafari({ context, inviteCode }: { context: 'in-app' | 'ios-other'; inviteCode?: string }) {
  // In-app webviews are matched by user agent alone, so they can be on Android too.
  const android = context === 'in-app' && /Android/.test(navigator.userAgent ?? '');
  const browser = android ? 'Chrome' : 'Safari';
  const b = (text: string) => <b className="text-foreground">{text}</b>;
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Eyebrow>One quick step</Eyebrow>
        <Heading>{android ? 'Open this in your browser first' : 'Open this in Safari first'}</Heading>
      </div>
      <p className="text-sm text-muted-foreground">
        {context === 'in-app' ? (
          <>This app's built-in browser can't add apps to your Home Screen. Tap {android ? b('⋮') : b('⋯')}, then {b(`Open in ${browser}`)}.</>
        ) : (
          <>Only Safari can add Stack Tracker to your iPhone's Home Screen.</>
        )}
      </p>
      <CopyLink />
      <p className="text-[0.8125rem] text-muted-foreground">Or copy the link and paste it into {browser}.</p>
      {inviteCode && <InviteCallout code={inviteCode} />}
    </div>
  );
}

export interface InstallGuideProps {
  context: InstallContext;
  inviteCode?: string;
}

/** Step-by-step help for adding the app to the Home Screen, matched to the browser. */
export function InstallGuide({ context, inviteCode }: InstallGuideProps) {
  switch (context) {
    case 'ios-safari':
      return <IosSteps inviteCode={inviteCode} />;
    case 'ios-other':
    case 'in-app':
      return <OpenInSafari context={context} inviteCode={inviteCode} />;
    case 'android-prompt':
    case 'android-manual':
      return <AndroidSteps inviteCode={inviteCode} />;
    default:
      return null;
  }
}

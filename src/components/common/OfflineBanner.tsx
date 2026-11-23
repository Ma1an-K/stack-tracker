import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** Tells the user, in place, when the device has no connection (data can't load or save). */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <div role="status" aria-live="polite">
      {offline && (
        <p className="mx-auto mb-4 flex max-w-3xl items-start gap-2.5 rounded-xl border border-gold/35 bg-gold/[0.07] px-3.5 py-3 text-sm">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
          <span>
            <span className="font-semibold">You're offline.</span>{' '}
            <span className="text-muted-foreground">You can keep reading what's on screen; new changes won't save until you reconnect.</span>
          </span>
        </p>
      )}
    </div>
  );
}

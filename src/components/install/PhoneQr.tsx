import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export interface PhoneQrProps {
  /** Where the phone's camera should take the user. */
  url: string;
}

/**
 * A QR code card for opening Stack Tracker on a phone from a laptop.
 * The code sits on a light tile whatever the theme, because phone cameras
 * read dark-on-light codes far more reliably.
 */
export function PhoneQr({ url }: PhoneQrProps) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(url, {
      type: 'svg',
      margin: 1,
      // Dark modules in the app's near-black; transparent light modules let the tile show.
      color: { dark: '#100e0dff', light: '#00000000' },
    }).then(
      (markup) => {
        if (!cancelled) setSvg(markup);
      },
      () => {
        // A url too long to encode leaves the tile blank; the "use it here" route still works.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="w-[200px] rounded-[var(--radius)] border border-border bg-card p-4 text-center">
      <div
        aria-hidden="true"
        className="mx-auto mb-3 h-[144px] w-[144px] rounded-lg bg-foreground p-2.5 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        // Library output built from our own url, never user input, so injecting it is safe.
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      <b className="block text-sm font-semibold text-foreground">Scan with your phone camera</b>
      <small className="text-xs text-muted-foreground">Opens Stack Tracker, ready to add</small>
    </div>
  );
}

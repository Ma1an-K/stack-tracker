import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PhoneQr } from './PhoneQr';

describe('PhoneQr', () => {
  it('draws a QR code for the url with the scan caption', async () => {
    const { container } = render(<PhoneQr url="https://www.stack-tracker.com/" />);

    expect(screen.getByText('Scan with your phone camera')).toBeInTheDocument();
    expect(screen.getByText('Opens Stack Tracker, ready to add')).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector('svg')).toBeInTheDocument());
    // The QR is decoration for sighted users; the caption carries the meaning.
    expect(container.querySelector('[aria-hidden="true"] svg')).toBeInTheDocument();
  });

  it('draws a different code for a different url', async () => {
    const a = render(<PhoneQr url="https://www.stack-tracker.com/" />);
    await waitFor(() => expect(a.container.querySelector('svg')).toBeInTheDocument());
    const first = a.container.querySelector('svg')!.innerHTML;
    a.unmount();

    const b = render(<PhoneQr url="http://localhost:8080/" />);
    await waitFor(() => expect(b.container.querySelector('svg')).toBeInTheDocument());
    expect(b.container.querySelector('svg')!.innerHTML).not.toBe(first);
  });
});

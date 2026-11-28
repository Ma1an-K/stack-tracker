import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { InstallContext } from '@/lib/installContext';

let context: InstallContext = 'ios-safari';
const trigger = vi.fn();
vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({ context, trigger: context === 'android-prompt' ? trigger : null }),
}));

import { GetTheApp } from './GetTheApp';

const IOS_INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 300.0';
const ANDROID_INSTAGRAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36 Instagram 300.0';

function stubBrowser(userAgent: string, writeText = vi.fn().mockResolvedValue(undefined)) {
  vi.stubGlobal('navigator', { userAgent, maxTouchPoints: 5, clipboard: { writeText } });
  return writeText;
}

function stubStores() {
  vi.stubEnv('VITE_APP_STORE_URL', 'https://apps.apple.com/app/id1');
  vi.stubEnv('VITE_PLAY_STORE_URL', 'https://play.google.com/store/apps/details?id=x');
}

beforeEach(() => {
  context = 'ios-safari';
  trigger.mockReset();
  vi.stubEnv('VITE_APP_STORE_URL', '');
  vi.stubEnv('VITE_PLAY_STORE_URL', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('GetTheApp', () => {
  it('makes the store badges the primary action when both store links are set', () => {
    stubStores();
    render(<GetTheApp variant="landing" />);

    const appStore = screen.getByRole('link', { name: /App Store/ });
    expect(appStore).toHaveAttribute('href', 'https://apps.apple.com/app/id1');
    expect(appStore).toHaveAttribute('target', '_blank');
    expect(appStore).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByRole('link', { name: /Google Play/ })).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=x',
    );
    expect(screen.queryByRole('button', { name: 'Add to Home Screen' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'or add it from your browser' }));
    expect(screen.getByText('Add it in three taps')).toBeInTheDocument();
  });

  it('shows the three iPhone steps after tapping "Add to Home Screen"', () => {
    render(<GetTheApp variant="landing" />);
    expect(screen.queryByText('Add it in three taps')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add to Home Screen' }));

    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Tap Share in Safari's bar");
    expect(steps[1]).toHaveTextContent('Scroll down, tap Add to Home Screen');
    expect(steps[2]).toHaveTextContent('Tap Add, then open Stack Tracker from your Home Screen');
  });

  it('opens the browser install prompt on Android when one is available', () => {
    context = 'android-prompt';
    render(<GetTheApp variant="landing" />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to Home Screen' }));
    expect(trigger).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('falls back to the menu steps on Android without a prompt', () => {
    context = 'android-manual';
    render(<GetTheApp variant="sheet" />);
    fireEvent.click(screen.getByRole('button', { name: 'Show me how' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Install app');
  });

  it('asks to open the page in Safari first inside an in-app browser, with a Copy button', async () => {
    context = 'in-app';
    const writeText = stubBrowser(IOS_INSTAGRAM);
    const onContinue = vi.fn();
    render(<GetTheApp variant="landing" onContinue={onContinue} />);

    expect(screen.getByText('Open this in Safari first')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue here' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('selects the link when copying is not allowed', async () => {
    context = 'in-app';
    stubBrowser(IOS_INSTAGRAM, vi.fn().mockRejectedValue(new Error('no')));
    render(<GetTheApp variant="landing" />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    const link = screen.getByText(window.location.href);
    await waitFor(() => expect(window.getSelection()?.toString()).toBe(link.textContent));
  });

  it.each<InstallContext>(['installed', 'native', 'desktop'])('renders nothing in the %s context', c => {
    context = c;
    for (const variant of ['landing', 'sheet', 'banner', 'hero'] as const) {
      const { container, unmount } = render(<GetTheApp variant={variant} />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('shows the invite code in the iPhone guide', () => {
    render(<GetTheApp variant="landing" inviteCode="K7Q44MXP" />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to Home Screen' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Keep your code handy: K7Q44MXP');
  });

  it('calls onContinue from "Continue in browser"', () => {
    const onContinue = vi.fn();
    render(<GetTheApp variant="landing" onContinue={onContinue} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue in browser' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('banner opens the guide from "How" and dismisses from ×', () => {
    const onDismiss = vi.fn();
    render(<GetTheApp variant="banner" onDismiss={onDismiss} />);
    expect(screen.getByText('Put Stack Tracker on your Home Screen')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'How' }));
    expect(screen.getByText('Add it in three taps')).toBeInTheDocument();
  });

  it('uses Safari wording for an in-app browser on iPhone', () => {
    context = 'in-app';
    stubBrowser(IOS_INSTAGRAM);
    render(<GetTheApp variant="landing" />);
    expect(screen.getByRole('heading', { name: 'Open this in Safari first' })).toBeInTheDocument();
    expect(screen.getByText(/Open in Safari/)).toBeInTheDocument();
    expect(screen.getByText('Or copy the link and paste it into Safari.')).toBeInTheDocument();
    expect(screen.queryByText(/Chrome/)).not.toBeInTheDocument();
  });

  it('uses browser and Chrome wording for an in-app browser on Android', () => {
    context = 'in-app';
    stubBrowser(ANDROID_INSTAGRAM);
    render(<GetTheApp variant="landing" />);
    expect(screen.getByRole('heading', { name: 'Open this in your browser first' })).toBeInTheDocument();
    expect(screen.getByText(/Open in Chrome/)).toBeInTheDocument();
    expect(screen.getByText('Or copy the link and paste it into Chrome.')).toBeInTheDocument();
    expect(screen.queryByText(/Safari/)).not.toBeInTheDocument();
  });

  it('sends Chrome or Firefox on iPhone to Safari, with a Copy row', () => {
    context = 'ios-other';
    stubBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0 Mobile/15E148');
    render(<GetTheApp variant="sheet" />);
    fireEvent.click(screen.getByRole('button', { name: 'Show me how' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Open this in Safari first');
    expect(within(dialog).getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('opens the open-in-browser block in the dialog from the sheet variant', () => {
    context = 'in-app';
    stubBrowser(IOS_INSTAGRAM);
    render(<GetTheApp variant="sheet" />);
    expect(screen.queryByText('Open this in Safari first')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show me how' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Open this in Safari first');
    expect(within(dialog).getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it.each(['landing', 'sheet'] as const)('shows no store badges inside an in-app browser (%s)', variant => {
    context = 'in-app';
    stubBrowser(IOS_INSTAGRAM);
    stubStores();
    render(<GetTheApp variant={variant} />);
    expect(screen.queryByRole('link', { name: /App Store/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Google Play/ })).not.toBeInTheDocument();
    if (variant === 'sheet') fireEvent.click(screen.getByRole('button', { name: 'Show me how' }));
    expect(screen.getByText('Open this in Safari first')).toBeInTheDocument();
  });
});

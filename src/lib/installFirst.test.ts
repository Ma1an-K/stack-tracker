import { describe, it, expect } from 'vitest';
import type { InstallContext } from './installContext';
import { showInstallFirst } from './installFirst';

const base = { signedIn: false, continued: false, learn: false };

describe('showInstallFirst', () => {
  it.each<InstallContext>(['ios-safari', 'ios-other', 'android-prompt', 'android-manual', 'in-app'])(
    'asks a signed-out visitor on a phone (%s) to install first',
    (context) => {
      expect(showInstallFirst({ ...base, context })).toBe(true);
    },
  );

  it.each<InstallContext>(['desktop', 'installed', 'native'])('never shows in the %s context', (context) => {
    expect(showInstallFirst({ ...base, context })).toBe(false);
  });

  it('never shows to a signed-in user', () => {
    expect(showInstallFirst({ ...base, context: 'ios-safari', signedIn: true })).toBe(false);
  });

  it('stays out of the way after "Continue in browser"', () => {
    expect(showInstallFirst({ ...base, context: 'ios-safari', continued: true })).toBe(false);
  });

  it('gives way to the full page for "Learn more"', () => {
    expect(showInstallFirst({ ...base, context: 'android-prompt', learn: true })).toBe(false);
  });
});

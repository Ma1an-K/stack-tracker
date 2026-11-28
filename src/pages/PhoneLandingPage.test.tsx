import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({ context: 'ios-safari', trigger: null }),
}));
vi.mock('@/components/install/GetTheApp', () => ({ GetTheApp: () => null }));

import { PhoneLandingPage } from './PhoneLandingPage';

describe('PhoneLandingPage drawn Home Screen', () => {
  it('gives each placeholder app a decorative glyph, keeping it hidden from assistive tech', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PhoneLandingPage onContinue={() => {}} />
      </MemoryRouter>,
    );
    const screenEl = screen.getByText('Photos', { ignore: '' }).closest('[aria-hidden="true"]');
    expect(screenEl).not.toBeNull();
    for (const name of ['Photos', 'Maps', 'Music', 'Notes', 'Mail', 'Camera', 'Clock']) {
      const tile = screen.getByText(name, { ignore: '' }).closest('div');
      expect(tile?.querySelector('svg'), name).not.toBeNull();
    }
    // Stack Tracker stays the one real icon on the screen.
    expect(screenEl?.querySelectorAll('img')).toHaveLength(1);
  });
});

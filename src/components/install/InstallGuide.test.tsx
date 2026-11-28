import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InstallGuide } from './InstallGuide';

describe('InstallGuide iPhone steps', () => {
  it('points at the Share button below without a box drawn around it', () => {
    const { container } = render(<InstallGuide context="ios-safari" />);
    const hint = screen.getByText(/below/).closest('p');
    expect(hint).not.toBeNull();
    expect(hint).toHaveTextContent('Tap');
    expect(hint?.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('.animate-ping, [class*="animate-ping"]')).toBeNull();
    expect(container.querySelector('[class*="border-gold"]')).toBeNull();
  });

  it('lets only the arrow move, and only when motion is allowed', () => {
    render(<InstallGuide context="ios-safari" />);
    const arrow = screen.getByText('↓');
    expect(arrow.className).toContain('motion-safe:animate-bounce');
  });
});

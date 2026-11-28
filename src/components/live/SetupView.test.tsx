import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetupView } from './SetupView';

const players = [
  { id: 'p1', name: 'Ann' },
  { id: 'p2', name: 'Ben' },
  { id: 'p3', name: 'Cat' },
] as Parameters<typeof SetupView>[0]['players'];

describe('SetupView initialSelected', () => {
  it('renders the seeded players as selected and can start at the default buy-in', () => {
    const onStart = vi.fn().mockResolvedValue(undefined);
    render(<SetupView players={players} onStart={onStart} initialSelected={['p1', 'p2', 'p3']} />);
    for (const name of ['Ann', 'Ben', 'Cat']) {
      expect(screen.getByRole('button', { name }).getAttribute('aria-pressed')).toBe('true');
    }
    const start = screen.getByRole('button', { name: /start session/i });
    expect((start as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(start);
    expect(onStart).toHaveBeenCalledWith(
      [
        { player_id: 'p1', buy_in: 50 },
        { player_id: 'p2', buy_in: 50 },
        { player_id: 'p3', buy_in: 50 },
      ],
      50
    );
  });

  it('starts with nobody selected by default', () => {
    render(<SetupView players={players} onStart={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Ann' }).getAttribute('aria-pressed')).toBe('false');
    expect((screen.getByRole('button', { name: /start session/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});

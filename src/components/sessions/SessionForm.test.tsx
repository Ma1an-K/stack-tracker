import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Player } from '@/types/database';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));

import { SessionForm } from './SessionForm';

const players = [
  { id: 'p1', name: 'Sam', is_active: true },
  { id: 'p2', name: 'Dan', is_active: true },
] as Player[];

describe('SessionForm seeded rows', () => {
  it('leaves a seeded buy-in of null blank, so it still has to be filled in', () => {
    render(
      <SessionForm
        players={players}
        onSubmit={vi.fn()}
        initialPlayers={[
          { player_id: 'p1', buy_in: null },
          { player_id: 'p2', buy_in: 50 },
        ]}
      />,
    );
    const buyIns = screen.getAllByPlaceholderText('0.00').filter((el) => el.closest('label')?.textContent?.startsWith('Buy-in'));
    expect(buyIns.map((el) => (el as HTMLInputElement).value)).toEqual(['', '50']);
  });
});

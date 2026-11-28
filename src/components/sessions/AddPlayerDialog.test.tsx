import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddPlayerDialog } from './AddPlayerDialog';
import { formatCurrency } from '@/lib/settlement/format';
import type { Player } from '@/types/database';

const sam = { id: 'p-sam', name: 'Sam' } as Player;
const dana = { id: 'p-dana', name: 'Dana' } as Player;

function setup(over: Record<string, unknown> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    bench: [sam],
    canCreate: true,
    ownerName: 'Matan',
    baseBuyIn: 50,
    onSeat: vi.fn().mockResolvedValue(undefined),
    onCreate: vi.fn().mockResolvedValue({ error: null, player: dana }),
    ...over,
  };
  render(<AddPlayerDialog {...props} />);
  return props;
}

const input = () => screen.getByLabelText('New player') as HTMLInputElement;

describe('AddPlayerDialog', () => {
  it('owner sees new-player input', () => {
    setup();
    expect(screen.getByRole('textbox', { name: 'New player' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add & seat' })).toBeTruthy();
  });

  it('puts the new-player field above the bench list', () => {
    setup();
    const field = screen.getByRole('textbox', { name: 'New player' });
    const first = screen.getByRole('button', { name: 'Sam' });
    expect(field.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('creates then seats', async () => {
    const p = setup();
    fireEvent.change(input(), { target: { value: 'Dana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add & seat' }));
    await waitFor(() => expect(p.onOpenChange).toHaveBeenCalledWith(false));
    expect(p.onCreate).toHaveBeenCalledWith('Dana');
    expect(p.onSeat).toHaveBeenCalledWith('p-dana');
  });

  it('trims and rejects blank names', async () => {
    const p = setup();
    fireEvent.change(input(), { target: { value: '   ' } });
    expect((screen.getByRole('button', { name: 'Add & seat' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input(), { target: { value: '  Dana ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add & seat' }));
    await waitFor(() => expect(p.onCreate).toHaveBeenCalledWith('Dana'));
  });

  it('duplicate name keeps dialog open', async () => {
    const p = setup({ onCreate: vi.fn().mockResolvedValue({ error: { code: '23505' }, player: null }) });
    fireEvent.change(input(), { target: { value: 'Dana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add & seat' }));
    await waitFor(() => expect(p.onCreate).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 0));
    expect(p.onSeat).not.toHaveBeenCalled();
    expect(p.onOpenChange).not.toHaveBeenCalledWith(false);
    expect(input().value).toBe('Dana');
  });

  it('member sees permission message', () => {
    setup({ canCreate: false });
    expect(screen.queryByLabelText('New player')).toBeNull();
    expect(screen.getByText('Only the owner or an admin can create new players. Ask Matan to make you an admin on the Members page.')).toBeTruthy();
  });

  it('member message without owner name', () => {
    setup({ canCreate: false, ownerName: null });
    expect(screen.getByText('Only the owner or an admin can create new players. Ask the owner to make you an admin on the Members page.')).toBeTruthy();
  });

  it('bench buttons seat existing players', async () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: /Sam/ }));
    await waitFor(() => expect(p.onOpenChange).toHaveBeenCalledWith(false));
    expect(p.onSeat).toHaveBeenCalledWith('p-sam');
  });

  it('empty bench', () => {
    setup({ bench: [] });
    expect(screen.getByText("Everyone's already seated")).toBeTruthy();
  });

  it('shows subtitle', () => {
    setup({ currency: '$' });
    expect(screen.getByText(`Joins with a ${formatCurrency(50, '$')} buy-in — adjust after.`)).toBeTruthy();
  });
});

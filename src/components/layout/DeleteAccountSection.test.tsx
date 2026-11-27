import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const deleteAccount = vi.fn();
const toast = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ deleteAccount }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

import { DeleteAccountSection } from './DeleteAccountSection';

function renderSection(onDeleted = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/members']}>
      <Routes>
        <Route path="/members" element={<DeleteAccountSection onDeleted={onDeleted} />} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
  return onDeleted;
}

const confirmButton = () => screen.getByRole('button', { name: 'Delete account' });

describe('DeleteAccountSection', () => {
  beforeEach(() => {
    deleteAccount.mockReset();
    toast.mockReset();
  });

  it('keeps the delete button disabled until DELETE is typed', () => {
    renderSection();
    expect(confirmButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'delet' } });
    expect(confirmButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: ' delete ' } });
    expect(confirmButton()).toBeEnabled();
  });

  it('explains what happens to owned homegames', () => {
    renderSection();
    expect(screen.getByText(/Homegames you own pass to another member/)).toBeInTheDocument();
  });

  it('deletes the account, closes the profile and goes home', async () => {
    deleteAccount.mockResolvedValue({ error: null });
    const onDeleted = renderSection();
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } });
    fireEvent.click(confirmButton());

    await waitFor(() => expect(screen.getByText('Home page')).toBeInTheDocument());
    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({ title: 'Your account has been deleted' });
  });

  it('stays put and shows the error when deletion fails', async () => {
    deleteAccount.mockResolvedValue({ error: { message: 'Network down' } });
    const onDeleted = renderSection();
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } });
    fireEvent.click(confirmButton());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Network down', variant: 'destructive' })),
    );
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.queryByText('Home page')).not.toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
  });
});

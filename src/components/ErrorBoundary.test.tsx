import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const logError = vi.fn();
vi.mock('@/lib/errorLog', () => ({ logError: (...a: unknown[]) => logError(...a) }));

import { ErrorBoundary } from './ErrorBoundary';

function Boom(): JSX.Element {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  it('renders fallback and logs a crash', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'crash', action: 'render' }),
    );
  });
});

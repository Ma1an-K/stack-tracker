import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BuyInField } from './BuyInField';
import { formatCurrency } from '@/lib/settlement/format';

const LABEL = 'Buy-in total for Sam';

function setup(value = 100) {
  const onCommit = vi.fn();
  const utils = render(<BuyInField value={value} onCommit={onCommit} label={LABEL} />);
  const input = () => screen.getByLabelText(LABEL) as HTMLInputElement;
  return { onCommit, input, ...utils };
}

function type(input: HTMLInputElement, text: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
}

describe('BuyInField', () => {
  it('shows the formatted value when not editing', () => {
    const { container, input } = setup(100);
    expect(container.textContent).toContain(formatCurrency(100).charAt(0));
    expect(input().value).toBe('100.00');
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('commits typed total on Enter', () => {
    const { onCommit, input } = setup();
    type(input(), '150');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(150);
  });

  it('commits on blur', () => {
    const { onCommit, input } = setup();
    type(input(), '75');
    fireEvent.blur(input());
    expect(onCommit).toHaveBeenCalledWith(75);
  });

  it('Escape reverts without commit', () => {
    const { onCommit, input } = setup();
    type(input(), '999');
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(input().value).toBe('100.00');
  });

  it.each(['', 'abc', '-20'])('ignores invalid input %j', (bad) => {
    const { onCommit, input } = setup();
    type(input(), bad);
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(input().value).toBe('100.00');
  });

  it('rounds to cents', () => {
    const { onCommit, input } = setup();
    type(input(), '12.345');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(12.35);
  });

  it('no commit when unchanged', () => {
    const { onCommit, input } = setup();
    fireEvent.focus(input());
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('remote value change while not focused updates display', () => {
    const { input, rerender, onCommit } = setup();
    rerender(<BuyInField value={200} onCommit={onCommit} label={LABEL} />);
    expect(input().value).toBe('200.00');
  });

  it('remote value change while focused keeps the draft', () => {
    const { input, rerender, onCommit } = setup();
    type(input(), '130');
    rerender(<BuyInField value={200} onCommit={onCommit} label={LABEL} />);
    expect(input().value).toBe('130');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(130);
  });
});

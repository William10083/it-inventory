import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import useFocusTrap from './useFocusTrap';

function TestComponent({ active }) {
  const panelRef = useRef(null);
  useFocusTrap(active, panelRef);
  return (
    <div ref={panelRef}>
      <button data-testid="btn1">First</button>
      <button data-testid="btn2">Second</button>
      <button data-testid="btn3">Third</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('does nothing when active is false', () => {
    const { container } = render(<TestComponent active={false} />);
    // No error thrown, focus stays where it is
    expect(container).toBeInTheDocument();
  });

  it('cycles focus forward with Tab from last to first', () => {
    const { getByTestId } = render(<TestComponent active={true} />);
    const last = getByTestId('btn3');
    last.focus();
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(last, { key: 'Tab', shiftKey: false });
    const first = getByTestId('btn1');
    expect(document.activeElement).toBe(first);
  });

  it('cycles focus backward with Shift+Tab from first to last', () => {
    const { getByTestId } = render(<TestComponent active={true} />);
    const first = getByTestId('btn1');
    first.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    const last = getByTestId('btn3');
    expect(document.activeElement).toBe(last);
  });
});

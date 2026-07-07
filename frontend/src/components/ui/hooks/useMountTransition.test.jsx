import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { act } from 'react';
import useMountTransition from './useMountTransition';

function TestComponent({ isOpen }) {
  const shouldRender = useMountTransition(isOpen, 100);
  if (!shouldRender) return null;
  return <div data-testid="content">Visible</div>;
}

describe('useMountTransition', () => {
  it('renders when isOpen becomes true', () => {
    const { rerender, queryByTestId } = render(<TestComponent isOpen={false} />);
    expect(queryByTestId('content')).toBeNull();

    rerender(<TestComponent isOpen={true} />);
    expect(queryByTestId('content')).toBeInTheDocument();
  });

  it('keeps content rendered briefly after isOpen goes false (exit transition)', () => {
    vi.useFakeTimers();
    const { rerender, queryByTestId } = render(<TestComponent isOpen={true} />);
    expect(queryByTestId('content')).toBeInTheDocument();

    rerender(<TestComponent isOpen={false} />);
    // Still rendered immediately after close
    expect(queryByTestId('content')).toBeInTheDocument();

    // After the transition timeout, it unmounts
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(queryByTestId('content')).toBeNull();
    vi.useRealTimers();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let matchMediaMock;

beforeEach(() => {
  matchMediaMock = vi.fn();
  vi.stubGlobal('matchMedia', matchMediaMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeMatchMedia(matches) {
  return (query) => {
    if (query === '(prefers-reduced-motion: reduce)') {
      const listeners = new Set();
      return {
        matches,
        addEventListener: (_evt, fn) => listeners.add(fn),
        removeEventListener: (_evt, fn) => listeners.delete(fn),
        _listeners: listeners,
      };
    }
    return { matches: false, addEventListener: () => {}, removeEventListener: () => {} };
  };
}

describe('useReducedMotion', () => {
  it('returns true when prefers-reduced-motion: reduce matches', async () => {
    matchMediaMock.mockImplementation(makeMatchMedia(true));
    const { useReducedMotion } = await import('./useReducedMotion.js');
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('returns false when prefers-reduced-motion does NOT match', async () => {
    matchMediaMock.mockImplementation(makeMatchMedia(false));
    const { useReducedMotion } = await import('./useReducedMotion.js');
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('updates when the media query changes', async () => {
    let matches = false;
    const listeners = new Set();
    matchMediaMock.mockImplementation((query) => {
      if (query === '(prefers-reduced-motion: reduce)') {
        return {
          get matches() { return matches; },
          addEventListener: (_evt, fn) => listeners.add(fn),
          removeEventListener: (_evt, fn) => listeners.delete(fn),
        };
      }
      return { matches: false, addEventListener: () => {}, removeEventListener: () => {} };
    });

    const { useReducedMotion } = await import('./useReducedMotion.js');
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    // Simulate OS toggle
    matches = true;
    act(() => {
      listeners.forEach(fn => fn({ matches: true }));
    });
    expect(result.current).toBe(true);
  });
});

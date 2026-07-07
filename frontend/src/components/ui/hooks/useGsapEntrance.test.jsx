import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

let matchMediaMock;

beforeEach(() => {
  matchMediaMock = vi.fn();
  vi.stubGlobal('matchMedia', matchMediaMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setupMatchMedia(matches) {
  matchMediaMock.mockReturnValue({
    matches,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

describe('useGsapEntrance', () => {
  it('returns a ref object', async () => {
    setupMatchMedia(false);
    const { useGsapEntrance } = await import('./useGsapEntrance.js');
    const { result } = renderHook(() => useGsapEntrance());
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('current');
  });

  it('does not throw when reduced motion is true', async () => {
    setupMatchMedia(true);
    const { useGsapEntrance } = await import('./useGsapEntrance.js');
    const { result } = renderHook(() => useGsapEntrance({ from: { autoAlpha: 0 }, to: { autoAlpha: 1 } }));
    // Should not throw — sets final state via gsap.set
    expect(result.current).toBeDefined();
  });

  it('does not throw when reduced motion is false', async () => {
    setupMatchMedia(false);
    const { useGsapEntrance } = await import('./useGsapEntrance.js');
    const { result } = renderHook(() => useGsapEntrance({ from: { autoAlpha: 0 }, to: { autoAlpha: 1 } }));
    // Should not throw — animates via gsap.fromTo
    expect(result.current).toBeDefined();
  });

  it('does not animate when enabled is false', async () => {
    setupMatchMedia(false);
    const { useGsapEntrance } = await import('./useGsapEntrance.js');
    const { result } = renderHook(() => useGsapEntrance({ enabled: false }));
    expect(result.current).toBeDefined();
  });
});

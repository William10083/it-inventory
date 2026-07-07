import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import gsap from 'gsap';
import CountUpNumber from './CountUpNumber';

// Real (non-reduced-motion) path: mock gsap.to so onUpdate fires synchronously
// and we can inspect the FIRST value it reports. This is what exposes the bug —
// the buggy implementation always tweens `proxy.val` starting from 0, so on a
// same-value re-render (e.g. theme toggle) the first onUpdate call reports 0
// before jumping back to the target, causing a visible restart/flash.
vi.mock('gsap', () => ({
    default: {
        to: vi.fn((proxy, config) => {
            // Record the starting value BEFORE mutating, so tests can assert
            // what the tween animates FROM (the bug animates from 0 always;
            // the fix animates from the previously displayed value).
            gsap.to.startValues = gsap.to.startValues || [];
            gsap.to.startValues.push(proxy.val);
            proxy.val = config.val;
            config.onUpdate?.();
            return { kill: vi.fn() };
        }),
    },
}));

describe('CountUpNumber', () => {
    beforeEach(() => {
        window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: false, // exercise the animated (non-reduced-motion) path
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
        }));
        gsap.to.mockClear();
        gsap.to.startValues = [];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('animates to the target value on first mount', () => {
        render(<CountUpNumber value={42} />);
        expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('1.11/1.12 does NOT re-invoke the tween (no restart) when re-rendered with the same value (theme toggle simulation)', () => {
        const { rerender } = render(<CountUpNumber value={42} />);
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(gsap.to).toHaveBeenCalledTimes(1);

        // Simulate a `.dark` class toggle causing the whole subtree (and this
        // component) to re-render with the SAME value.
        act(() => {
            document.documentElement.classList.add('dark');
        });
        rerender(<CountUpNumber value={42} />);

        // Guard: same-value re-render must be a no-op — no second tween invocation,
        // and the displayed value must remain the previously-reached target.
        expect(gsap.to).toHaveBeenCalledTimes(1);
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.queryByText('0')).not.toBeInTheDocument();

        document.documentElement.classList.remove('dark');
    });

    it('still animates when a genuinely new target value is passed, starting from the previous displayed value', () => {
        const { rerender } = render(<CountUpNumber value={10} />);
        expect(screen.getByText('10')).toBeInTheDocument();

        rerender(<CountUpNumber value={25} />);

        expect(gsap.to).toHaveBeenCalledTimes(2);
        // Per design: animate FROM the previous displayed value, not from 0.
        expect(gsap.to.startValues[1]).toBe(10);
        expect(screen.getByText('25')).toBeInTheDocument();
    });
});

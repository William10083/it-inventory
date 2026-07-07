import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';

// Animates a numeric value counting up using GSAP.
// Respects prefers-reduced-motion (renders the final value immediately when set).
//
// Fix (see DESIGN_frontend-ux-overhaul.md — "CountUpNumber restart fix"):
// theme toggles (or any unrelated parent re-render) must NOT restart the count-up
// from 0. We track the previously-reached target in `prev` and:
//   - no-op when the new target equals the last target (pure re-render, same value)
//   - animate FROM the previous displayed value TO the new target otherwise
const CountUpNumber = ({ value }) => {
    const [display, setDisplay] = useState(0);
    const tweenRef = useRef(null);
    const prev = useRef(0);

    useEffect(() => {
        const target = Number(value) || 0;

        // Same-value re-render (e.g. theme toggle recomputing `metrics`) — no-op,
        // keep the currently displayed value as-is instead of restarting from 0.
        if (target === prev.current) {
            // Previous effect's cleanup already killed the tween; drop the stale ref.
            tweenRef.current = null;
            return;
        }

        const from = prev.current;
        prev.current = target;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (tweenRef.current) {
            tweenRef.current.kill();
            tweenRef.current = null;
        }

        if (prefersReducedMotion) {
            setDisplay(target);
            return;
        }

        const proxy = { val: from };
        tweenRef.current = gsap.to(proxy, {
            val: target,
            duration: 0.6,
            ease: 'power2.out',
            onUpdate: () => setDisplay(Math.round(proxy.val)),
        });

        return () => {
            if (tweenRef.current) {
                tweenRef.current.kill();
                tweenRef.current = null;
            }
        };
    }, [value]);

    return <span className="tabular-nums">{display}</span>;
};

export default CountUpNumber;

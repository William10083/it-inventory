import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useReducedMotion } from './useReducedMotion.js';

/**
 * useGsapEntrance — animates an element's entrance with GSAP.
 * Respects prefers-reduced-motion: when true, sets final state instantly.
 *
 * @param {Object} options
 * @param {Object} options.vars — GSAP vars (e.g. { autoAlpha: 1, x: 0, duration: 0.3 })
 * @param {Object} options.from — initial state (e.g. { autoAlpha: 0, x: 30 })
 * @param {boolean} options.enabled — gate the animation (default true)
 * @returns {React.RefObject} ref to attach to the animated element
 */
export function useGsapEntrance({ from = { autoAlpha: 0 }, to = { autoAlpha: 1, duration: 0.3, ease: 'power2.out' }, enabled = true } = {}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useGSAP(() => {
    if (!ref.current || !enabled) return;

    if (reduced) {
      // Reduced motion: set final state instantly, no tween
      gsap.set(ref.current, to);
      return;
    }

    // Normal motion: animate from → to
    gsap.fromTo(ref.current, from, to);
  }, { scope: ref, dependencies: [reduced, enabled] });

  return ref;
}

import { useEffect } from 'react';

/**
 * useFocusTrap — traps Tab/Shift+Tab focus within a panel while active.
 *
 * @param {boolean} active - whether the trap is engaged
 * @param {React.RefObject<HTMLElement>} panelRef - ref to the trapping container
 *
 * When active, Tabbing past the last focusable element wraps to the first,
 * and Shift+Tab past the first wraps to the last. When deactivated, the
 * listener is removed. No external dependencies.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function useFocusTrap(active, panelRef) {
  useEffect(() => {
    if (!active || !panelRef.current) return;

    const panel = panelRef.current;

    const getFocusable = () =>
      Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === first || !panel.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last || !panel.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    panel.addEventListener('keydown', handleKeyDown);

    // Focus the first focusable element on mount
    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    return () => {
      panel.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, panelRef]);
}

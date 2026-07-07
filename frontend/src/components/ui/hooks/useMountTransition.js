import { useEffect, useState, useCallback } from 'react';

/**
 * useMountTransition — keeps a component mounted during its exit transition.
 *
 * Returns `shouldRender` which is:
 *  - true when `isOpen` is true (mount/enter phase)
 *  - true for `timeoutMs` after `isOpen` flips to false (exit phase)
 *  - false after the timeout fires (unmount)
 *
 * The consumer is responsible for calling the returned `onExitComplete`
 * callback (or letting the timeout elapse) to finalize unmount.
 *
 * @param {boolean} isOpen - controlled visibility state from parent
 * @param {number} timeoutMs - exit transition duration in ms
 * @returns {boolean} shouldRender - whether the component should be in the DOM
 */
export default function useMountTransition(isOpen, timeoutMs = 200) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), timeoutMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, timeoutMs]);

  return shouldRender;
}

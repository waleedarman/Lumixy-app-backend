import { useEffect, useRef } from 'react';

/** Refresh only when the user returns to the tab — no background polling. */
export function useRefreshOnFocus(callback: () => void | Promise<void>) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void callbackRef.current();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);
}

import { useEffect, useRef } from "react";

/**
 * Run `callback` now and then every `intervalMs`, but only while:
 *  - `enabled` is true, and
 *  - the browser tab is visible.
 * Hidden tabs make no requests; when the student comes back to the tab the
 * callback runs once immediately. This cuts background traffic a lot when
 * hundreds of students are logged in at the same time.
 */
export function usePolling(callback: () => void | Promise<void>, intervalMs: number, enabled = true) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!enabled) return;

    let id: ReturnType<typeof setInterval> | null = null;
    const run = () => { void saved.current(); };

    const start = () => {
      if (id === null) id = setInterval(run, intervalMs);
    };
    const stop = () => {
      if (id !== null) { clearInterval(id); id = null; }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        run();
        start();
      }
    };

    if (!document.hidden) {
      run();
      start();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, enabled]);
}

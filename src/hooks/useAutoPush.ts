import { useEffect, useRef } from "react";
import { setOnProjectSaved } from "../lib/projectStore";
import type { ProjectData } from "../lib/projectStore";

/**
 * Auto-push hook — registers a cloud sync callback that fires after every local project save.
 * Debounces to avoid pushing on every keystroke; waits for `delayMs` of inactivity.
 *
 * @param enabled Whether auto-sync is enabled
 * @param delayMs Debounce delay (default 3000ms)
 * @param onPush Callback to execute with the project data for cloud sync
 */
export function useAutoPush(
  enabled: boolean,
  delayMs: number = 3000,
  onPush?: (id: string, project: ProjectData) => void,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ id: string; project: ProjectData } | null>(null);

  useEffect(() => {
    if (!enabled || !onPush) {
      setOnProjectSaved(null);
      return;
    }

    setOnProjectSaved((id, project) => {
      pendingRef.current = { id, project };

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const pending = pendingRef.current;
        if (pending) {
          onPush(pending.id, pending.project);
          pendingRef.current = null;
        }
      }, delayMs);
    });

    return () => {
      setOnProjectSaved(null);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, delayMs, onPush]);
}

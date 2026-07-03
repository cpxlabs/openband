import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { loadProject, ProjectData, setOnProjectSaved } from "./projectStore";

export interface CloudSyncState {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pending: boolean;
  error: string | null;
}

const syncStates = new Map<string, CloudSyncState>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 5000;
const STORAGE_BUCKET = "projects";

function getInitialSyncState(projectId: string): CloudSyncState {
  const cached = syncStates.get(projectId);
  if (cached) return cached;
  return { isSyncing: false, lastSyncedAt: null, pending: false, error: null };
}

async function uploadProjectToStorage(
  projectId: string,
  project: ProjectData,
): Promise<void> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(`${projectId}.json`, JSON.stringify(project, null, 2), {
      upsert: true,
      contentType: "application/json",
    });

  if (error) throw error;
}

/** Immediately sync a project to Supabase Storage. */
export async function syncNow(projectId: string): Promise<void> {
  // Cancel any pending debounce
  const existingTimer = debounceTimers.get(projectId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    debounceTimers.delete(projectId);
  }

  const project = loadProject(projectId);
  if (!project) {
    syncStates.set(projectId, {
      isSyncing: false,
      lastSyncedAt: null,
      pending: false,
      error: "Project not found locally",
    });
    return;
  }

  syncStates.set(projectId, {
    isSyncing: true,
    lastSyncedAt: null,
    pending: false,
    error: null,
  });

  try {
    await uploadProjectToStorage(projectId, project);
    syncStates.set(projectId, {
      isSyncing: false,
      lastSyncedAt: Date.now(),
      pending: false,
      error: null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown sync error";
    syncStates.set(projectId, {
      isSyncing: false,
      lastSyncedAt: null,
      pending: true,
      error: message,
    });
  }
}

/** Get the current sync state for a project. */
export function getSyncState(projectId: string): CloudSyncState {
  return syncStates.get(projectId) ?? getInitialSyncState(projectId);
}

/**
 * React hook that auto-synces a project to Supabase Storage.
 *
 * Watches the local project store via the `onProjectSaved` callback.
 * On each local save, schedules a debounced upload at 5 seconds.
 * Any new save clears the previous timer and reschedules.
 */
export function useCloudSync(projectId: string): CloudSyncState {
  const [state, setState] = useState<CloudSyncState>(
    getInitialSyncState(projectId),
  );
  const projectIdRef = useRef(projectId);

  // Keep ref in sync
  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  // Schedule a debounced upload each time the project is saved locally
  useEffect(() => {
    const handleSave = (savedProjectId: string, _project: ProjectData) => {
      if (savedProjectId !== projectIdRef.current) return;

      const existingTimer = debounceTimers.get(projectIdRef.current);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(async () => {
        const pid = projectIdRef.current;
        const project = loadProject(pid);
        if (!project) {
          const s: CloudSyncState = {
            isSyncing: false,
            lastSyncedAt: null,
            pending: false,
            error: "Project not found locally",
          };
          syncStates.set(pid, s);
          setState(s);
          return;
        }

        const syncing: CloudSyncState = {
          isSyncing: true,
          lastSyncedAt: null,
          pending: false,
          error: null,
        };
        syncStates.set(pid, syncing);
        setState(syncing);

        try {
          await uploadProjectToStorage(pid, project);
          const done: CloudSyncState = {
            isSyncing: false,
            lastSyncedAt: Date.now(),
            pending: false,
            error: null,
          };
          syncStates.set(pid, done);
          setState(done);
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown sync error";
          const failed: CloudSyncState = {
            isSyncing: false,
            lastSyncedAt: null,
            pending: true,
            error: message,
          };
          syncStates.set(pid, failed);
          setState(failed);
        }
      }, DEBOUNCE_MS);

      debounceTimers.set(projectIdRef.current, timer);

      // Mark as pending while waiting for debounce
      const pending: CloudSyncState = {
        isSyncing: false,
        lastSyncedAt: syncStates.get(projectIdRef.current)?.lastSyncedAt ?? null,
        pending: true,
        error: null,
      };
      syncStates.set(projectIdRef.current, pending);
      setState(pending);
    };

    // Register our callback — the projectStore calls onProjectSaved after every local save.
    setOnProjectSaved(handleSave);

    return () => {
      const timer = debounceTimers.get(projectIdRef.current);
      if (timer) {
        clearTimeout(timer);
        debounceTimers.delete(projectIdRef.current);
      }
      setOnProjectSaved(null);
    };
  }, [projectId]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      const timer = debounceTimers.get(projectId);
      if (timer) {
        clearTimeout(timer);
        debounceTimers.delete(projectId);
      }
    };
  }, [projectId]);

  return state;
}

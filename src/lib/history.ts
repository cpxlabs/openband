import { useState, useCallback, useRef } from "react";

const MAX_HISTORY = 50;

export function useHistory<T>(initial: T) {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [present, setPresent] = useState<T>(initial);
  const presentRef = useRef(initial);
  presentRef.current = present;

  const push = useCallback((next: T) => {
    past.current = [
      ...past.current.slice(-(MAX_HISTORY - 1)),
      presentRef.current,
    ];
    future.current = [];
    setPresent(next);
    presentRef.current = next;
  }, []);

  const undo = useCallback((): T | null => {
    if (past.current.length === 0) return null;
    const prev = past.current[past.current.length - 1];
    future.current = [presentRef.current, ...future.current];
    past.current = past.current.slice(0, -1);
    setPresent(prev);
    presentRef.current = prev;
    return prev;
  }, []);

  const redo = useCallback((): T | null => {
    if (future.current.length === 0) return null;
    const next = future.current[0];
    past.current = [...past.current, presentRef.current];
    future.current = future.current.slice(1);
    setPresent(next);
    presentRef.current = next;
    return next;
  }, []);

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  const reset = useCallback((val: T) => {
    past.current = [];
    future.current = [];
    setPresent(val);
    presentRef.current = val;
  }, []);

  return {
    state: present,
    setState: push,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    rawSet: setPresent,
  };
}

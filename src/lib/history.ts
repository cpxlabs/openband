import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

export function useHistory<T>(initial: T) {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [present, setPresent] = useState<T>(initial);

  const push = useCallback((next: T) => {
    past.current = [...past.current.slice(-(MAX_HISTORY - 1)), present];
    future.current = [];
    setPresent(next);
  }, [present]);

  const undo = useCallback((): T | null => {
    if (past.current.length === 0) return null;
    const prev = past.current[past.current.length - 1];
    future.current = [present, ...future.current];
    past.current = past.current.slice(0, -1);
    setPresent(prev);
    return prev;
  }, [present]);

  const redo = useCallback((): T | null => {
    if (future.current.length === 0) return null;
    const next = future.current[0];
    past.current = [...past.current, present];
    future.current = future.current.slice(1);
    setPresent(next);
    return next;
  }, [present]);

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  const reset = useCallback((val: T) => {
    past.current = [];
    future.current = [];
    setPresent(val);
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

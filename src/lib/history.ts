export interface UndoCommand {
  id: string;
  userId: string;
  timestamp: number;
  description: string;
  execute: (state: Record<string, unknown>) => Record<string, unknown>;
  inverse: (state: Record<string, unknown>) => Record<string, unknown>;
  validate: (state: Record<string, unknown>) => boolean;
}

export interface UndoStack {
  undoStack: UndoCommand[];
  redoStack: UndoCommand[];
  maxHistory: number;
}

export function createUndoStack(maxHistory: number = 100): UndoStack {
  return {
    undoStack: [],
    redoStack: [],
    maxHistory,
  };
}

export function pushUndoCommand(
  stack: UndoStack,
  command: UndoCommand,
): UndoStack {
  const newUndoStack = [...stack.undoStack, command];
  if (newUndoStack.length > stack.maxHistory) {
    newUndoStack.splice(0, newUndoStack.length - stack.maxHistory);
  }
  return {
    ...stack,
    undoStack: newUndoStack,
    redoStack: [],
  };
}

export function canUndo(stack: UndoStack): boolean {
  return stack.undoStack.length > 0;
}

export function canRedo(stack: UndoStack): boolean {
  return stack.redoStack.length > 0;
}

export function peekUndo(stack: UndoStack): UndoCommand | null {
  return stack.undoStack[stack.undoStack.length - 1] ?? null;
}

export function peekRedo(stack: UndoStack): UndoCommand | null {
  return stack.redoStack[stack.redoStack.length - 1] ?? null;
}

export function executeUndo(
  stack: UndoStack,
  currentState: Record<string, unknown>,
): { stack: UndoStack; state: Record<string, unknown>; applied: boolean } {
  const command = peekUndo(stack);
  if (!command) return { stack, state: currentState, applied: false };

  if (!command.validate(currentState)) {
    const newStack = {
      ...stack,
      undoStack: stack.undoStack.slice(0, -1),
    };
    return { stack: newStack, state: currentState, applied: false };
  }

  const newState = command.inverse(currentState);

  return {
    stack: {
      ...stack,
      undoStack: stack.undoStack.slice(0, -1),
      redoStack: [...stack.redoStack, command],
    },
    state: newState,
    applied: true,
  };
}

export function executeRedo(
  stack: UndoStack,
  currentState: Record<string, unknown>,
): { stack: UndoStack; state: Record<string, unknown>; applied: boolean } {
  const command = peekRedo(stack);
  if (!command) return { stack, state: currentState, applied: false };

  if (!command.validate(currentState)) {
    const newStack = {
      ...stack,
      redoStack: stack.redoStack.slice(0, -1),
    };
    return { stack: newStack, state: currentState, applied: false };
  }

  const newState = command.execute(currentState);

  return {
    stack: {
      ...stack,
      redoStack: stack.redoStack.slice(0, -1),
      undoStack: [...stack.undoStack, command],
    },
    state: newState,
    applied: true,
  };
}

export function clearUndoStack(stack: UndoStack): UndoStack {
  return { ...stack, undoStack: [], redoStack: [] };
}

export function createTrackAddCommand(
  trackId: string,
  trackData: Record<string, unknown>,
): UndoCommand {
  return {
    id: `undo-add-${trackId}-${Date.now()}`,
    userId: "local",
    timestamp: Date.now(),
    description: `Add track ${trackData.name ?? trackId}`,
    execute: (state) => {
      const tracks = (state.tracks ?? []) as Record<string, unknown>[];
      return { ...state, tracks: [...tracks, { id: trackId, ...trackData }] };
    },
    inverse: (state) => {
      const tracks = (state.tracks ?? []) as { id: string }[];
      return { ...state, tracks: tracks.filter((t) => t.id !== trackId) };
    },
    validate: (state) => {
      const tracks = (state.tracks ?? []) as { id: string }[];
      return !tracks.some((t) => t.id === trackId);
    },
  };
}

export function createTrackRemoveCommand(
  trackId: string,
  trackData: Record<string, unknown>,
): UndoCommand {
  return {
    id: `undo-remove-${trackId}-${Date.now()}`,
    userId: "local",
    timestamp: Date.now(),
    description: `Remove track ${trackData.name ?? trackId}`,
    execute: (state) => {
      const tracks = (state.tracks ?? []) as { id: string }[];
      return { ...state, tracks: tracks.filter((t) => t.id !== trackId) };
    },
    inverse: (state) => {
      const tracks = (state.tracks ?? []) as Record<string, unknown>[];
      return { ...state, tracks: [...tracks, { id: trackId, ...trackData }] };
    },
    validate: (state) => {
      const tracks = (state.tracks ?? []) as { id: string }[];
      return tracks.some((t) => t.id === trackId);
    },
  };
}

export function createTrackUpdateCommand(
  trackId: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
): UndoCommand {
  return {
    id: `undo-update-${trackId}-${field}-${Date.now()}`,
    userId: "local",
    timestamp: Date.now(),
    description: `Change ${field} on track ${trackId}`,
    execute: (state) => {
      const tracks = (state.tracks ?? []) as Record<string, unknown>[];
      return {
        ...state,
        tracks: tracks.map((t) =>
          t.id === trackId ? { ...t, [field]: newValue } : t,
        ),
      };
    },
    inverse: (state) => {
      const tracks = (state.tracks ?? []) as Record<string, unknown>[];
      return {
        ...state,
        tracks: tracks.map((t) =>
          t.id === trackId ? { ...t, [field]: oldValue } : t,
        ),
      };
    },
    validate: (state) => {
      const tracks = (state.tracks ?? []) as { id: string }[];
      return tracks.some((t) => t.id === trackId);
    },
  };
}

export function createNoteAddCommand(
  trackId: string,
  noteData: Record<string, unknown>,
): UndoCommand {
  const noteId = noteData.id as string;
  return {
    id: `undo-note-add-${noteId}-${Date.now()}`,
    userId: "local",
    timestamp: Date.now(),
    description: `Add note on track ${trackId}`,
    execute: (state) => {
      const tracks = (state.tracks ?? []) as Record<string, unknown>[];
      return {
        ...state,
        tracks: tracks.map((t) => {
          if (t.id !== trackId) return t;
          const notes = (t.midiNotes ?? []) as Record<string, unknown>[];
          return { ...t, midiNotes: [...notes, noteData] };
        }),
      };
    },
    inverse: (state) => {
      const tracks = (state.tracks ?? []) as Record<string, unknown>[];
      return {
        ...state,
        tracks: tracks.map((t) => {
          if (t.id !== trackId) return t;
          const notes = (t.midiNotes ?? []) as { id: string }[];
          return { ...t, midiNotes: notes.filter((n) => n.id !== noteId) };
        }),
      };
    },
    validate: (state) => {
      const tracks = (state.tracks ?? []) as { id: string; midiNotes?: { id: string }[] }[];
      const track = tracks.find((t) => t.id === trackId);
      return !!track && !(track.midiNotes ?? []).some((n) => n.id === noteId);
    },
  };
}

export function createNoteRemoveCommand(
  trackId: string,
  noteData: Record<string, unknown>,
): UndoCommand {
  const noteId = noteData.id as string;
  return {
    id: `undo-note-remove-${noteId}-${Date.now()}`,
    userId: "local",
    timestamp: Date.now(),
    description: `Remove note on track ${trackId}`,
    execute: (state) => {
      const tracks = (state.tracks ?? []) as Record<string, unknown>[];
      return {
        ...state,
        tracks: tracks.map((t) => {
          if (t.id !== trackId) return t;
          const notes = (t.midiNotes ?? []) as { id: string }[];
          return { ...t, midiNotes: notes.filter((n) => n.id !== noteId) };
        }),
      };
    },
    inverse: (state) => {
      const tracks = (state.tracks ?? []) as Record<string, unknown>[];
      return {
        ...state,
        tracks: tracks.map((t) => {
          if (t.id !== trackId) return t;
          const notes = (t.midiNotes ?? []) as Record<string, unknown>[];
          return { ...t, midiNotes: [...notes, noteData] };
        }),
      };
    },
    validate: (state) => {
      const tracks = (state.tracks ?? []) as { id: string; midiNotes?: { id: string }[] }[];
      const track = tracks.find((t) => t.id === trackId);
      return !!track && (track.midiNotes ?? []).some((n) => n.id === noteId);
    },
  };
}

import { useEffect } from 'react';
import { Platform } from 'react-native';

interface ShortcutMap {
  [key: string]: (() => void) | undefined;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handler = (e: KeyboardEvent) => {
      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl && !shift && key === 'z') { shortcuts.undo?.(); e.preventDefault(); return; }
      if (ctrl && shift && key === 'z') { shortcuts.redo?.(); e.preventDefault(); return; }
      if (ctrl && !shift && key === 'y') { shortcuts.redo?.(); e.preventDefault(); return; }
      if (ctrl && key === 's') { shortcuts.save?.(); e.preventDefault(); return; }
      if (ctrl && key === 'b') { shortcuts.bounce?.(); e.preventDefault(); return; }

      if (key === ' ') { shortcuts.play?.(); e.preventDefault(); return; }
      if (key === 'm' || key === 'M') { shortcuts.toggleMute?.(); e.preventDefault(); return; }
      if (key === 's' || key === 'S') { shortcuts.toggleSolo?.(); e.preventDefault(); return; }
      if (key === 'r' || key === 'R') { shortcuts.record?.(); e.preventDefault(); return; }
      if (key === 'Delete' || key === 'Backspace') { shortcuts.delete?.(); e.preventDefault(); return; }
      if (key === 'Escape') { shortcuts.escape?.(); e.preventDefault(); return; }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

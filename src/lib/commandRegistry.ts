import { Platform } from "react-native";

export interface Command {
  id: string;
  name: string;
  description: string;
  category: string;
  shortcut?: string;
  altShortcut?: string;
  enabled: boolean;
  visible: boolean;
  action: () => void;
}

export interface KeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

interface CommandRegistryState {
  commands: Map<string, Command>;
  shortcutMap: Map<string, string>;
  activeBinding: KeyBinding | null;
  paletteOpen: boolean;
  searchQuery: string;
}

let registryState: CommandRegistryState = {
  commands: new Map(),
  shortcutMap: new Map(),
  activeBinding: null,
  paletteOpen: false,
  searchQuery: "",
};

let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let stateCallback: ((state: CommandRegistryState) => void) | null = null;

function emitState(): void {
  if (stateCallback) stateCallback({ ...registryState });
}

function parseShortcut(shortcut: string): KeyBinding | null {
  if (!shortcut) return null;
  const parts = shortcut.split("+").map((s) => s.trim());
  const binding: KeyBinding = { key: "" };

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === "ctrl" || lower === "control") binding.ctrl = true;
    else if (lower === "shift") binding.shift = true;
    else if (lower === "alt" || lower === "option") binding.alt = true;
    else if (lower === "meta" || lower === "cmd" || lower === "command") binding.meta = true;
    else if (lower === "escape") binding.key = "Escape";
    else if (lower === "enter" || lower === "return") binding.key = "Enter";
    else if (lower === "space") binding.key = " ";
    else if (lower === "backspace") binding.key = "Backspace";
    else if (lower === "delete") binding.key = "Delete";
    else if (lower === "tab") binding.key = "Tab";
    else if (lower.startsWith("f") && lower.length <= 3) binding.key = part.toUpperCase();
    else binding.key = part.length === 1 ? part.toUpperCase() : part;
  }

  return binding.key ? binding : null;
}

function eventToBinding(e: KeyboardEvent): KeyBinding {
  return {
    key: e.key,
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
  };
}

function bindingsMatch(a: KeyBinding, b: KeyBinding): boolean {
  return (
    a.key === b.key &&
    (a.ctrl ?? false) === (b.ctrl ?? false) &&
    (a.shift ?? false) === (b.shift ?? false) &&
    (a.alt ?? false) === (b.alt ?? false) &&
    (a.meta ?? false) === (b.meta ?? false)
  );
}

function normalizeKeyForPlatform(e: KeyboardEvent): KeyBinding {
  const binding = eventToBinding(e);

  if (Platform.OS === "web") {
    const isMac = navigator.platform?.includes("Mac") || navigator.userAgent?.includes("Mac");
    if (isMac) {
      if (binding.meta && !binding.ctrl) {
        binding.ctrl = true;
        binding.meta = false;
      }
    } else {
      if (binding.ctrl) {
        binding.meta = false;
      }
    }
  }

  return binding;
}

export function registerCommand(
  id: string,
  name: string,
  description: string,
  category: string,
  action: () => void,
  shortcut?: string,
  altShortcut?: string,
  enabled: boolean = true,
  visible: boolean = true,
): Command {
  const command: Command = {
    id,
    name,
    description,
    category,
    shortcut,
    altShortcut,
    enabled,
    visible,
    action,
  };

  registryState.commands.set(id, command);

  if (shortcut) {
    registryState.shortcutMap.set(shortcut, id);
  }
  if (altShortcut) {
    registryState.shortcutMap.set(altShortcut, id);
  }

  return command;
}

export function unregisterCommand(id: string): void {
  const cmd = registryState.commands.get(id);
  if (cmd) {
    if (cmd.shortcut) registryState.shortcutMap.delete(cmd.shortcut);
    if (cmd.altShortcut) registryState.shortcutMap.delete(cmd.altShortcut);
    registryState.commands.delete(id);
  }
}

export function updateCommand(
  id: string,
  updates: Partial<Omit<Command, "id">>,
): void {
  const cmd = registryState.commands.get(id);
  if (!cmd) return;

  if (updates.shortcut !== undefined && cmd.shortcut) {
    registryState.shortcutMap.delete(cmd.shortcut);
  }
  if (updates.altShortcut !== undefined && cmd.altShortcut) {
    registryState.shortcutMap.delete(cmd.altShortcut);
  }

  const updated = { ...cmd, ...updates };
  registryState.commands.set(id, updated);

  if (updated.shortcut) {
    registryState.shortcutMap.set(updated.shortcut, id);
  }
  if (updated.altShortcut) {
    registryState.shortcutMap.set(updated.altShortcut, id);
  }
}

export function getCommand(id: string): Command | null {
  return registryState.commands.get(id) ?? null;
}

export function getAllCommands(): Command[] {
  return Array.from(registryState.commands.values());
}

export function getVisibleCommands(): Command[] {
  return getAllCommands().filter((cmd) => cmd.visible);
}

export function searchCommands(query: string): Command[] {
  const q = query.toLowerCase().trim();
  if (!q) return getVisibleCommands();

  return getVisibleCommands().filter((cmd) => {
    const nameMatch = cmd.name.toLowerCase().includes(q);
    const descMatch = cmd.description.toLowerCase().includes(q);
    const catMatch = cmd.category.toLowerCase().includes(q);
    const idMatch = cmd.id.toLowerCase().includes(q);
    return nameMatch || descMatch || catMatch || idMatch;
  });
}

export function executeCommand(id: string): boolean {
  const cmd = registryState.commands.get(id);
  if (!cmd || !cmd.enabled) return false;

  try {
    cmd.action();
    return true;
  } catch (e) {
    console.error(`Command ${id} failed:`, e);
    return false;
  }
}

export function openPalette(): void {
  registryState = { ...registryState, paletteOpen: true, searchQuery: "" };
  emitState();
}

export function closePalette(): void {
  registryState = { ...registryState, paletteOpen: false, searchQuery: "" };
  emitState();
}

export function togglePalette(): void {
  if (registryState.paletteOpen) closePalette();
  else openPalette();
}

export function setPaletteQuery(query: string): void {
  registryState = { ...registryState, searchQuery: query };
  emitState();
}

export function isPaletteOpen(): boolean {
  return registryState.paletteOpen;
}

export function onRegistryStateChange(
  callback: (state: CommandRegistryState) => void,
): () => void {
  stateCallback = callback;
  return () => {
    stateCallback = null;
  };
}

export function initKeyBindings(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  if (keydownHandler) return;

  keydownHandler = (e: KeyboardEvent) => {
    if (registryState.paletteOpen) {
      if (e.key === "Escape") {
        closePalette();
        e.preventDefault();
        return;
      }
      return;
    }

    const binding = normalizeKeyForPlatform(e);

    if (binding.key === "k" && (binding.ctrl || binding.meta)) {
      e.preventDefault();
      togglePalette();
      return;
    }

    for (const [shortcut, cmdId] of registryState.shortcutMap) {
      const parsed = parseShortcut(shortcut);
      if (parsed && bindingsMatch(parsed, binding)) {
        const cmd = registryState.commands.get(cmdId);
        if (cmd && cmd.enabled) {
          e.preventDefault();
          executeCommand(cmdId);
          return;
        }
      }
    }
  };

  window.addEventListener("keydown", keydownHandler);
}

export function disposeKeyBindings(): void {
  if (keydownHandler && typeof window !== "undefined") {
    window.removeEventListener("keydown", keydownHandler);
    keydownHandler = null;
  }
}

export function getShortcutDisplay(shortcut?: string): string {
  if (!shortcut) return "";
  const isMac =
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    (navigator.platform?.includes("Mac") || navigator.userAgent?.includes("Mac"));

  return shortcut
    .replace(/Ctrl/g, isMac ? "Cmd" : "Ctrl")
    .replace(/Meta/g, isMac ? "Cmd" : "Win")
    .replace(/Alt/g, isMac ? "Option" : "Alt");
}

export function disposeCommandRegistry(): void {
  disposeKeyBindings();
  registryState.commands.clear();
  registryState.shortcutMap.clear();
  registryState.paletteOpen = false;
  registryState.searchQuery = "";
}

export function registerDefaultCommands(actions: Record<string, () => void>): void {
  const defaultCommands: [string, string, string, string, string?, string?][] = [
    ["transport.play", "Play", "Start playback", "Transport", "Space", undefined],
    ["transport.stop", "Stop", "Stop playback", "Transport", "Space", undefined],
    ["transport.record", "Record", "Toggle recording", "Transport", "R", undefined],
    ["transport.metronome", "Metronome", "Toggle metronome click", "Transport", "M", undefined],
    ["edit.undo", "Undo", "Undo last action", "Edit", "Ctrl+Z", "Ctrl+Shift+Z"],
    ["edit.redo", "Redo", "Redo last action", "Edit", "Ctrl+Shift+Z", "Ctrl+Z"],
    ["edit.split", "Split Region", "Split selected region at playhead", "Edit", "S", undefined],
    ["edit.delete", "Delete", "Delete selected", "Edit", "Delete", "Backspace"],
    ["edit.selectAll", "Select All", "Select all regions", "Edit", "Ctrl+A", undefined],
    ["track.add", "Add Track", "Add a new track", "Track", "Ctrl+T", undefined],
    ["track.mute", "Mute", "Toggle mute on selected track", "Track", undefined, undefined],
    ["track.solo", "Solo", "Toggle solo on selected track", "Track", undefined, undefined],
    ["mixer.open", "Open Mixer", "Open mixer view", "View", "Ctrl+M", undefined],
    ["view.zoomIn", "Zoom In", "Zoom into timeline", "View", "Ctrl+=", undefined],
    ["view.zoomOut", "Zoom Out", "Zoom out of timeline", "View", "Ctrl+-", undefined],
    ["view.fitToWindow", "Fit to Window", "Fit all content to view", "View", "Ctrl+0", undefined],
    ["file.save", "Save", "Save current project", "File", "Ctrl+S", undefined],
    ["file.export", "Export", "Export audio mixdown", "File", "Ctrl+Shift+E", undefined],
    ["palette.toggle", "Command Palette", "Open command palette", "System", "Ctrl+K", undefined],
  ];

  for (const [id, name, desc, cat, shortcut, alt] of defaultCommands) {
    const action = actions[id] ?? (() => {});
    registerCommand(id, name, desc, cat, action, shortcut, alt);
  }
}

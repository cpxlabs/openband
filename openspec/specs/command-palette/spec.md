# Command Palette

## Overview
OpenBand provides a centralized keyboard-first command system. The `CommandRegistry` (`src/lib/commandRegistry.ts`) registers, searches, and executes named commands; a `useKeyboardShortcuts` hook (`src/lib/keyboard.ts`) wires global key handling; and the `CommandPalette` component (`src/components/CommandPalette.tsx`) renders a searchable Cmd/Ctrl+K overlay. All commands expose a `shortcut` and optional `altShortcut` parsed into a normalized `KeyBinding`.

## Implementation Notes
The registry is a module-level singleton (`registryState`) holding a `Map<string, Command>` and a `shortcutMap` from shortcut string to command id. `parseShortcut` normalizes `"Ctrl+Shift+Z"` into a `KeyBinding`; `Platform.OS === "web"` remaps `meta`↔`ctrl` for Mac vs non-Mac in `normalizeKeyForPlatform`. `initKeyBindings` attaches a single `window` keydown listener that toggles the palette on `Ctrl/Cmd+K` and otherwise dispatches the first matching shortcut via `executeCommand`. `registerDefaultCommands` registers transport/edit/track/view/file/system commands backed by caller-supplied actions.

## Requirements

### Requirement: Command Registry Register/Execute
The system MUST allow commands to be registered with a unique id and executed by id. Registering a duplicate id overwrites the previous entry. `executeCommand` runs the command `action` and returns `true`, or returns `false` for an unknown or disabled command.

#### Scenario: Register and execute a command
- **Given** no command with id `"test.hello"`
- **When** `registerCommand("test.hello", "Hello", "...", "Test", action)` is called
- **And** `executeCommand("test.hello")` is invoked
- **Then** `action` runs and `executeCommand` returns `true`

#### Scenario: Execute missing or disabled command
- **Given** no command registered for id `"nope"`
- **When** `executeCommand("nope")` is called
- **Then** the result is `false`
- **And** `executeCommand` returns `false` for a command whose `enabled` is `false`

### Requirement: Fuzzy Search
The system MUST return visible commands filtered by a case-insensitive match against name, description, category, and id. An empty query returns all visible commands.

#### Scenario: Search filters by substring
- **Given** registered commands `"transport.play"` (Transport) and `"edit.undo"` (Edit)
- **When** `searchCommands("play")` is called
- **Then** only `"transport.play"` is returned
- **And** `searchCommands("")` returns every visible command

### Requirement: Cmd/Ctrl+K Palette Toggle
The system MUST track palette open state and toggle it. `togglePalette` flips `isPaletteOpen`; `openPalette`/`closePalette` set it explicitly and reset the query.

#### Scenario: Toggle palette visibility
- **Given** `isPaletteOpen()` is `false`
- **When** `togglePalette()` is called
- **Then** `isPaletteOpen()` becomes `true`
- **And** calling `togglePalette()` again returns it to `false`

### Requirement: Shortcut Engine
The system MUST parse a `"mod+mod+key"` shortcut into a normalized `KeyBinding` and match inbound `KeyboardEvent`s against registered bindings. `getShortcutDisplay` adapts the label for the current platform (`Ctrl`→`Cmd` on Mac).

#### Scenario: Normalized binding match
- **Given** a command registered with shortcut `"Ctrl+S"`
- **When** a keydown event with `ctrlKey` and `key === "s"` is normalized
- **Then** `bindingsMatch` reports equality with the parsed binding

### Requirement: Default Commands
The system MUST ship a default set of commands covering Transport, Edit, Track, View, File, and System categories via `registerDefaultCommands`, including a `palette.toggle` bound to `Ctrl+K`.

#### Scenario: Default set registered
- **Given** a record of action callbacks passed to `registerDefaultCommands`
- **When** it runs
- **Then** `getAllCommands()` includes `transport.play`, `edit.undo`, `track.add`, `view.zoomIn`, `file.save`, and `palette.toggle`
- **And** the `"palette.toggle"` command carries shortcut `"Ctrl+K"`

## Test Requirements (Vitest)
- [ ] `registerCommand` then `executeCommand` runs the action and returns `true`
- [ ] `executeCommand` returns `false` for unknown and disabled ids
- [ ] `searchCommands` filters by name/description/category/id and empty query returns all visible
- [ ] `togglePalette` flips `isPaletteOpen`
- [ ] `getShortcutDisplay` remaps `Ctrl` to `Cmd` on Mac platforms
- [ ] `registerDefaultCommands` populates transport/edit/track/view/file/system commands and `palette.toggle` uses `Ctrl+K`

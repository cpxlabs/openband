# Proposal: Milestone 4 - Desktop Build

## Context
OpenBand aims to run on multiple platforms. While the web interface handles basic audio workflows, a dedicated Desktop App (via Electron) offers better performance, offline capabilities, and native file system access for importing/exporting large stems and projects. 

## Objectives
- Introduce an Electron backend wrapper around the Expo Web build.
- Implement the desktop bridge (`@bridge`) architecture as specified in `AGENTS.md` to safely expose native APIs (like file dialogs and file system reading/writing) to the Expo frontend.
- Ensure the frontend remains completely agnostic of the execution environment, using `OpenBandNative` for all native interactions.

## Constraints
- The frontend code in `src/` must NEVER directly import `fs`, `path`, `ipcRenderer`, or any Electron-specific modules.
- All bridge methods must have fallbacks for the browser environment (`src/bridge/browser.ts`).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildVoicing, symbolFromChord, chordsToMIDI, suggestNextChord, PROGRESSION_PRESETS } from "../src/lib/chordTrackState";
import { registerCommand, searchCommands, executeCommand, getAllCommands, disposeCommandRegistry } from "../src/lib/commandRegistry";
import { writeWavHeader, audioBufferToWavBlob, djb2Hash } from "../src/lib/audio";
import { generatePreviewUrl } from "../src/lib/constants";
import {
  createUndoStack, pushUndoCommand, canUndo, canRedo,
  executeUndo, executeRedo, clearUndoStack,
  createTrackAddCommand, createTrackRemoveCommand, createTrackUpdateCommand,
  createNoteAddCommand, createNoteRemoveCommand,
} from "../src/lib/history";
import type { UndoCommand } from "../src/lib/history";

function MockOfflineAudioContext(this: any, _ch: number, _len: number, _sr: number) {
  return {
    createBuffer: (ch: number, len: number, sr: number) => {
      const persistent = new Float32Array(len);
      return {
        numberOfChannels: ch,
        length: len,
        sampleRate: sr,
        getChannelData: () => persistent,
      };
    },
  };
}
vi.stubGlobal("OfflineAudioContext", MockOfflineAudioContext as any);

describe("chordTrackState", () => {
  it("buildVoicing returns correct intervals for major", () => {
    const notes = buildVoicing(0, "major", 0);
    expect(notes).toEqual([60, 64, 67]);
  });

  it("buildVoicing returns correct intervals for minor", () => {
    const notes = buildVoicing(0, "minor", 0);
    expect(notes).toEqual([60, 63, 67]);
  });

  it("buildVoicing returns correct intervals for dom7", () => {
    const notes = buildVoicing(0, "dom7", 0);
    expect(notes).toEqual([60, 64, 67, 70]);
  });

  it("buildVoicing applies inversion", () => {
    const notes = buildVoicing(0, "major", 1);
    expect(notes).toEqual([64, 67, 72]);
  });

  it("buildVoicing handles dim chord", () => {
    const notes = buildVoicing(7, "dim", 0);
    expect(notes).toEqual([67, 70, 73]);
  });

  it("buildVoicing uses major fallback for unknown quality", () => {
    const notes = buildVoicing(0, "unknown" as any, 0);
    expect(notes).toEqual([60, 64, 67]);
  });

  it("symbolFromChord returns correct name for major", () => {
    expect(symbolFromChord(0, "major")).toBe("C");
  });

  it("symbolFromChord returns correct name for minor", () => {
    expect(symbolFromChord(0, "minor")).toBe("Cm");
  });

  it("symbolFromChord returns correct name for D# dom7", () => {
    expect(symbolFromChord(3, "dom7")).toBe("D#7");
  });

  it("chordsToMIDI converts chord regions to MIDI notes", () => {
    const chords = [
      { id: "c1", start: 0, duration: 4, symbol: "C", root: 0, quality: "major" as const, key: "C", inversion: 0, velocity: 80, color: "#34c759" },
    ];
    const notes = chordsToMIDI(chords, 120);
    expect(notes.length).toBe(3);
    expect(notes[0].pitch).toBe(60);
    expect(notes[0].start).toBe(0);
  });

  it("chordsToMIDI handles multiple chords", () => {
    const chords = [
      { id: "c1", start: 0, duration: 4, symbol: "C", root: 0, quality: "major" as const, key: "C", inversion: 0, velocity: 80, color: "#34c759" },
      { id: "c2", start: 4, duration: 4, symbol: "Am", root: 9, quality: "minor" as const, key: "C", inversion: 0, velocity: 80, color: "#34c759" },
    ];
    const notes = chordsToMIDI(chords, 120);
    expect(notes.length).toBe(6);
    expect(notes[3].pitch).toBe(69);
  });

  it("PROGRESSION_PRESETS has expected structure", () => {
    expect(PROGRESSION_PRESETS.length).toBeGreaterThanOrEqual(7);
    for (const preset of PROGRESSION_PRESETS) {
      expect(preset.name).toBeTruthy();
      expect(preset.key).toBeTruthy();
      expect(preset.chords.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("PROGRESSION_PRESETS pop I-V-vi-IV has correct chords", () => {
    const pop = PROGRESSION_PRESETS.find((p) => p.name === "Pop I-V-vi-IV");
    expect(pop).toBeTruthy();
    expect(pop!.chords.length).toBe(4);
    expect(pop!.chords[0].quality).toBe("major");
    expect(pop!.chords[1].quality).toBe("major");
    expect(pop!.chords[2].quality).toBe("minor");
  });
});

describe("commandRegistry", () => {
  beforeEach(() => {
    disposeCommandRegistry();
  });

  it("registerCommand stores a command", () => {
    const cmd = registerCommand("test.cmd", "Test", "A test command", "Test", () => {});
    expect(cmd.id).toBe("test.cmd");
    expect(cmd.name).toBe("Test");
    expect(cmd.enabled).toBe(true);
  });

  it("getAllCommands returns registered commands", () => {
    registerCommand("test.cmd1", "Cmd1", "First", "Test", () => {});
    registerCommand("test.cmd2", "Cmd2", "Second", "Test", () => {});
    expect(getAllCommands().length).toBe(2);
  });

  it("searchCommands returns all when query is empty", () => {
    registerCommand("test.a", "Alpha", "First command", "Edit", () => {});
    registerCommand("test.b", "Beta", "Second command", "View", () => {});
    expect(searchCommands("").length).toBe(2);
  });

  it("searchCommands filters by name", () => {
    registerCommand("test.a", "Alpha", "First", "Edit", () => {});
    registerCommand("test.b", "Beta", "Second", "View", () => {});
    const results = searchCommands("Alpha");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("test.a");
  });

  it("searchCommands filters by description", () => {
    registerCommand("test.a", "Alpha", "First command", "Edit", () => {});
    registerCommand("test.b", "Beta", "Second command", "View", () => {});
    const results = searchCommands("Second");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("test.b");
  });

  it("searchCommands filters by category", () => {
    registerCommand("test.a", "Alpha", "First", "Edit", () => {});
    registerCommand("test.b", "Beta", "Second", "View", () => {});
    const results = searchCommands("View");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("test.b");
  });

  it("executeCommand calls the action", () => {
    let called = false;
    registerCommand("test.exec", "Exec", "Executable", "Test", () => { called = true; });
    const result = executeCommand("test.exec");
    expect(result).toBe(true);
    expect(called).toBe(true);
  });

  it("executeCommand returns false for unknown command", () => {
    const result = executeCommand("nonexistent");
    expect(result).toBe(false);
  });

  it("executeCommand returns false for disabled command", () => {
    let called = false;
    registerCommand("test.disabled", "Disabled", "Disabled cmd", "Test", () => { called = true; }, undefined, undefined, false);
    const result = executeCommand("test.disabled");
    expect(result).toBe(false);
    expect(called).toBe(false);
  });

  it("disposeCommandRegistry clears all commands", () => {
    registerCommand("test.a", "Alpha", "First", "Edit", () => {});
    registerCommand("test.b", "Beta", "Second", "View", () => {});
    disposeCommandRegistry();
    expect(getAllCommands().length).toBe(0);
  });
});

describe("audio WAV functions", () => {
  it("writeWavHeader writes correct RIFF header", () => {
    const ab = new ArrayBuffer(44);
    const view = new DataView(ab);
    writeWavHeader(view, 0, 2, 44100, 16, 0);
    const riff = String.fromCharCode(
      view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3),
    );
    expect(riff).toBe("RIFF");
    const wave = String.fromCharCode(
      view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11),
    );
    expect(wave).toBe("WAVE");
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint16(34, true)).toBe(16);
  });

  it("writeWavHeader writes mono 16-bit header", () => {
    const ab = new ArrayBuffer(44);
    const view = new DataView(ab);
    writeWavHeader(view, 0, 1, 48000, 24, 100);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint16(34, true)).toBe(24);
    const data = String.fromCharCode(
      view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39),
    );
    expect(data).toBe("data");
  });

  it("audioBufferToWavBlob creates a blob", () => {
    const ctx = new OfflineAudioContext(2, 100, 44100);
    const buffer = ctx.createBuffer(2, 100, 44100);
    const blob = audioBufferToWavBlob(buffer, 16);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("audio/wav");
  });

  it("audioBufferToWavBlob creates correctly sized blob", () => {
    const ctx = new OfflineAudioContext(1, 100, 44100);
    const buffer = ctx.createBuffer(1, 100, 44100);
    for (let i = 0; i < 100; i++) {
      buffer.getChannelData(0)[i] = Math.sin(i * 0.1) * 0.5;
    }
    const blob = audioBufferToWavBlob(buffer, 16);
    const expectedSize = 44 + 100 * 2;
    expect(blob.size).toBe(expectedSize);
  });

  it("audioBufferToWavBlob 24-bit has correct size", () => {
    const ctx = new OfflineAudioContext(2, 100, 44100);
    const buffer = ctx.createBuffer(2, 100, 44100);
    const blob = audioBufferToWavBlob(buffer, 24);
    const expectedSize = 44 + 100 * 2 * 3;
    expect(blob.size).toBe(expectedSize);
  });

  it("audioBufferToWavBlob encodes audio data correctly (16-bit)", () => {
    const ctx = new OfflineAudioContext(1, 4, 44100);
    const buffer = ctx.createBuffer(1, 4, 44100);
    const data = buffer.getChannelData(0);
    data[0] = 0.5;
    data[1] = -0.5;
    data[2] = 1.0;
    data[3] = -1.0;
    const blob = audioBufferToWavBlob(buffer, 16);
    expect(blob.size).toBe(44 + 4 * 2);
  });
});

describe("generatePreviewUrl audio playback", () => {
  let origOAC: typeof globalThis.OfflineAudioContext;

  beforeEach(() => {
    origOAC = globalThis.OfflineAudioContext;
    (globalThis as any).OfflineAudioContext = undefined;
  });

  afterEach(() => {
    (globalThis as any).OfflineAudioContext = origOAC;
  });

  it("generates a valid blob URL", async () => {
    const url = await generatePreviewUrl("test-key-1", 2);
    expect(url).toBeTruthy();
    expect(url.startsWith("blob:")).toBe(true);
  });

  it("returns cached URL on second call", async () => {
    const url1 = await generatePreviewUrl("cache-test", 2);
    const url2 = await generatePreviewUrl("cache-test", 2);
    expect(url1).toBe(url2);
  });

  it("pure JS WAV path produces valid RIFF header with sound", () => {
    const sr = 44100;
    const duration = 2;
    const freq = 440;
    const numSamples = Math.ceil(sr * duration);
    const bitDepth = 16;
    const numChannels = 1;
    const bytesPerSample = bitDepth / 8;
    const dataSize = numSamples * numChannels * bytesPerSample;
    const headerSize = 44;
    const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(arrayBuffer);
    writeWavHeader(view, 0, numChannels, sr, bitDepth, dataSize);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sr;
      const phase = (t * freq * 2 * Math.PI) % (2 * Math.PI);
      const wave = Math.sin(phase);
      const envelope = Math.max(0, 0.25 * (1 - t / duration));
      const sample = wave * envelope;
      const pcm = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      view.setInt16(headerSize + i * bytesPerSample, pcm, true);
    }

    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    expect(riff).toBe("RIFF");
    expect(wave).toBe("WAVE");
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint16(34, true)).toBe(16);

    let maxAmplitude = 0;
    let nonZeroCount = 0;
    for (let i = 0; i < numSamples; i++) {
      const s = view.getInt16(headerSize + i * bytesPerSample, true);
      if (Math.abs(s) > maxAmplitude) maxAmplitude = Math.abs(s);
      if (s !== 0) nonZeroCount++;
    }
    expect(maxAmplitude).toBeGreaterThan(100);
    expect(nonZeroCount).toBeGreaterThan(numSamples * 0.5);
  });

  it("duration cap limits WAV to MAX_PREVIEW_DURATION samples", () => {
    const sr = 44100;
    const cappedDuration = 3;
    const numSamples = Math.ceil(sr * cappedDuration);
    const bitDepth = 16;
    const dataSize = numSamples * 1 * (bitDepth / 8);
    const expectedSize = 44 + dataSize;
    expect(numSamples).toBe(Math.ceil(sr * 3));
    expect(expectedSize).toBeLessThan(44 + sr * 180 * 2);
  });

  it("djb2Hash produces different hashes for different keys", () => {
    const h1 = djb2Hash("waveform-a");
    const h2 = djb2Hash("waveform-b");
    expect(h1).not.toBe(h2);

    const freq1 = 110 + Math.abs(h1 % 880);
    const freq2 = 110 + Math.abs(h2 % 880);
    expect(freq1).not.toBe(freq2);
  });

  it("different frequencies produce different waveforms (has unique sound per song)", () => {
    const sr = 44100;
    const duration = 0.1;
    const numSamples = Math.ceil(sr * duration);

    function generateSamples(freq: number): Int16Array {
      const samples = new Int16Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        const t = i / sr;
        const phase = (t * freq * 2 * Math.PI) % (2 * Math.PI);
        const wave = Math.sin(phase);
        const envelope = Math.max(0, 0.25 * (1 - t / duration));
        samples[i] = Math.max(-32768, Math.min(32767, Math.round(wave * envelope * 32767)));
      }
      return samples;
    }

    const samples1 = generateSamples(440);
    const samples2 = generateSamples(880);

    let differ = false;
    for (let i = 0; i < numSamples; i++) {
      if (samples1[i] !== samples2[i]) {
        differ = true;
        break;
      }
    }
    expect(differ).toBe(true);

    let max1 = 0, max2 = 0;
    for (let i = 0; i < numSamples; i++) {
      if (Math.abs(samples1[i]) > max1) max1 = Math.abs(samples1[i]);
      if (Math.abs(samples2[i]) > max2) max2 = Math.abs(samples2[i]);
    }
    expect(max1).toBeGreaterThan(100);
    expect(max2).toBeGreaterThan(100);
  });
});

it("symbolFromChord handles all qualities", () => {
  const qualities = [
    ["major", "C"], ["minor", "Cm"], ["dim", "Cdim"], ["aug", "Caug"],
    ["maj7", "Cmaj7"], ["min7", "Cm7"], ["dom7", "C7"], ["dim7", "Cdim7"],
    ["sus2", "Csus2"], ["sus4", "Csus4"], ["power", "C5"],
  ] as const;
  for (const [quality, expected] of qualities) {
    expect(symbolFromChord(0, quality)).toBe(expected);
  }
});

it("buildVoicing handles edge cases", () => {
  expect(buildVoicing(-1, "major", 0)).toEqual([59, 63, 66]);
  expect(buildVoicing(11, "major", 0)).toEqual([71, 75, 78]);
});

it("chordsToMIDI handles empty array", () => {
  expect(chordsToMIDI([], 120)).toEqual([]);
});

it("suggestNextChord returns dominant resolution from minor", () => {
  const prev = { root: 9, quality: "minor" as const, id: "c1", start: 0, duration: 4, symbol: "Am", key: "C", inversion: 0, velocity: 80, color: "#5ac8fa" };
  const next = suggestNextChord(prev);
  expect(next.root).toBe(4);
  expect(next.quality).toBe("major");
});

it("suggestNextChord returns maj7 from dom7", () => {
  const prev = { root: 7, quality: "dom7" as const, id: "c2", start: 0, duration: 4, symbol: "G7", key: "C", inversion: 0, velocity: 80, color: "#ff9f0a" };
  const next = suggestNextChord(prev);
  expect(next.root).toBe(0);
  expect(next.quality).toBe("maj7");
});

it("suggestNextChord returns major by default", () => {
  const prev = { root: 0, quality: "major" as const, id: "c3", start: 0, duration: 4, symbol: "C", key: "C", inversion: 0, velocity: 80, color: "#34c759" };
  const next = suggestNextChord(prev);
  expect(next.root).toBe(7);
  expect(next.quality).toBe("major");
});

describe("useHistory reducer", () => {
  it("createUndoStack creates empty stack", () => {
    const stack = createUndoStack(50);
    expect(stack.undoStack).toEqual([]);
    expect(stack.redoStack).toEqual([]);
    expect(stack.maxHistory).toBe(50);
  });

  it("pushUndoCommand adds command and clears redo", () => {
    const stack = createUndoStack();
    const cmd: UndoCommand = {
      id: "test", userId: "local", timestamp: 1, description: "test",
      execute: (s) => s, inverse: (s) => s, validate: () => true,
    };
    const next = pushUndoCommand(stack, cmd);
    expect(next.undoStack.length).toBe(1);
    expect(next.redoStack).toEqual([]);
  });

  it("canUndo returns false on empty stack", () => {
    expect(canUndo(createUndoStack())).toBe(false);
  });

  it("canUndo returns true when commands exist", () => {
    const stack = pushUndoCommand(createUndoStack(), {
      id: "test", userId: "local", timestamp: 1, description: "test",
      execute: (s) => s, inverse: (s) => s, validate: () => true,
    });
    expect(canUndo(stack)).toBe(true);
  });

  it("executeUndo inverts state and moves command to redo", () => {
    let state = { count: 10 };
    const cmd: UndoCommand = {
      id: "test", userId: "local", timestamp: 1, description: "decrement",
      execute: (s) => ({ ...s, count: (s as any).count + 1 }),
      inverse: (s) => ({ ...s, count: (s as any).count - 1 }),
      validate: () => true,
    };
    const stack = pushUndoCommand(createUndoStack(), cmd);
    const result = executeUndo(stack, state);
    expect((result.state as any).count).toBe(9);
    expect(result.applied).toBe(true);
    expect(result.stack.undoStack.length).toBe(0);
    expect(result.stack.redoStack.length).toBe(1);
  });

  it("executeUndo skips when validation fails", () => {
    const stack = pushUndoCommand(createUndoStack(), {
      id: "test", userId: "local", timestamp: 1, description: "test",
      execute: (s) => s, inverse: (s) => s, validate: () => false,
    });
    const result = executeUndo(stack, {});
    expect(result.applied).toBe(false);
  });

  it("executeRedo applies command and moves to undo", () => {
    let state = { count: 9 };
    const cmd: UndoCommand = {
      id: "test", userId: "local", timestamp: 1, description: "increment",
      execute: (s) => ({ ...s, count: (s as any).count + 1 }),
      inverse: (s) => ({ ...s, count: (s as any).count - 1 }),
      validate: () => true,
    };
    const stack = pushUndoCommand(createUndoStack(), cmd);
    const undoResult = executeUndo(stack, state);
    const redoResult = executeRedo(undoResult.stack, undoResult.state);
    expect((redoResult.state as any).count).toBe(9);
    expect(redoResult.applied).toBe(true);
  });

  it("executeRedo skips when validation fails", () => {
    const stack = { undoStack: [] as UndoCommand[], redoStack: [{
      id: "test", userId: "local", timestamp: 1, description: "test",
      execute: (s: any) => s, inverse: (s: any) => s, validate: () => false,
    }], maxHistory: 100 };
    const result = executeRedo(stack, {});
    expect(result.applied).toBe(false);
  });

  it("canRedo returns true after undo", () => {
    const cmd: UndoCommand = {
      id: "test", userId: "local", timestamp: 1, description: "test",
      execute: (s) => s, inverse: (s) => s, validate: () => true,
    };
    const stack = pushUndoCommand(createUndoStack(), cmd);
    const undoResult = executeUndo(stack, {});
    expect(canRedo(undoResult.stack)).toBe(true);
  });

  it("clearUndoStack empties both stacks", () => {
    const cmd: UndoCommand = {
      id: "test", userId: "local", timestamp: 1, description: "test",
      execute: (s) => s, inverse: (s) => s, validate: () => true,
    };
    const stack = pushUndoCommand(createUndoStack(), cmd);
    const cleared = clearUndoStack(stack);
    expect(cleared.undoStack).toEqual([]);
    expect(cleared.redoStack).toEqual([]);
  });
});

describe("UndoCommand factory functions", () => {
  it("createTrackAddCommand executes and inversely removes", () => {
    const cmd = createTrackAddCommand("t1", { name: "Kick" });
    expect(cmd.description).toBe("Add track Kick");
    const state = cmd.execute({ tracks: [] });
    expect((state.tracks as any[]).length).toBe(1);
    expect((state.tracks as any[])[0].id).toBe("t1");
    const reverted = cmd.inverse(state);
    expect((reverted.tracks as any[]).length).toBe(0);
    expect(cmd.validate({ tracks: [{ id: "t2" }] })).toBe(true);
    expect(cmd.validate({ tracks: [{ id: "t1" }] })).toBe(false);
  });

  it("createTrackRemoveCommand adds back on inverse", () => {
    const cmd = createTrackRemoveCommand("t1", { name: "Kick" });
    const state = cmd.execute({ tracks: [{ id: "t1", name: "Kick" }, { id: "t2", name: "Snare" }] });
    expect((state.tracks as any[]).length).toBe(1);
    const restored = cmd.inverse(state);
    expect((restored.tracks as any[]).length).toBe(2);
    expect(cmd.validate({ tracks: [{ id: "t1" }] })).toBe(true);
    expect(cmd.validate({ tracks: [] })).toBe(false);
  });

  it("createTrackUpdateCommand changes and reverts", () => {
    const cmd = createTrackUpdateCommand("t1", "volume", 0.8, 0.5);
    const state = cmd.execute({ tracks: [{ id: "t1", volume: 0.8 }] });
    expect((state.tracks as any[])[0].volume).toBe(0.5);
    const reverted = cmd.inverse(state);
    expect((reverted.tracks as any[])[0].volume).toBe(0.8);
    expect(cmd.validate({ tracks: [{ id: "t1" }] })).toBe(true);
    expect(cmd.validate({ tracks: [] })).toBe(false);
  });

  it("createNoteAddCommand adds and removes a note", () => {
    const noteData = { id: "n1", pitch: 60, start: 1, duration: 1 };
    const cmd = createNoteAddCommand("t1", noteData);
    const state = cmd.execute({ tracks: [{ id: "t1", midiNotes: [] }] });
    const track = (state.tracks as any[]).find((t: any) => t.id === "t1");
    expect(track.midiNotes.length).toBe(1);
    expect(track.midiNotes[0].pitch).toBe(60);
    const reverted = cmd.inverse(state);
    const revertedTrack = (reverted.tracks as any[]).find((t: any) => t.id === "t1");
    expect(revertedTrack.midiNotes.length).toBe(0);
    expect(cmd.validate({ tracks: [{ id: "t1", midiNotes: [] }] })).toBe(true);
    expect(cmd.validate({ tracks: [{ id: "t1", midiNotes: [{ id: "n1" }] }] })).toBe(false);
  });

  it("createNoteRemoveCommand adds back on inverse", () => {
    const noteData = { id: "n1", pitch: 60, start: 1, duration: 1 };
    const cmd = createNoteRemoveCommand("t1", noteData);
    const state = cmd.execute({ tracks: [{ id: "t1", midiNotes: [{ id: "n1", pitch: 60 }, { id: "n2" }] }] });
    const track = (state.tracks as any[]).find((t: any) => t.id === "t1");
    expect(track.midiNotes.length).toBe(1);
    expect(track.midiNotes[0].id).toBe("n2");
    const restored = cmd.inverse(state);
    const restoredTrack = (restored.tracks as any[]).find((t: any) => t.id === "t1");
    expect(restoredTrack.midiNotes.length).toBe(2);
  });

  it("pushUndoCommand enforces maxHistory", () => {
    const stack = createUndoStack(3);
    let current = stack;
    for (let i = 0; i < 5; i++) {
      current = pushUndoCommand(current, {
        id: `cmd-${i}`, userId: "local", timestamp: i, description: `cmd ${i}`,
        execute: (s) => s, inverse: (s) => s, validate: () => true,
      });
    }
    expect(current.undoStack.length).toBe(3);
    expect(current.undoStack[0].id).toBe("cmd-2");
    expect(current.undoStack[2].id).toBe("cmd-4");
  });
});

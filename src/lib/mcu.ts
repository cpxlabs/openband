import { bindMidi } from "./midiLearn";
import type { MidiTarget } from "./midiLearn";

export interface McuMapping {
  label: string;
  cc: number;
  channel: number;
  kind: "cc" | "note";
  target: MidiTarget;
}

// Mackie Control Universal (MCU) standard surface mapping.
// Faders 1-8 map to MIDI CC 0-7 on channel 0 (track index stored, resolved at dispatch).
// Master fader -> CC 8. Jog wheel -> CC 60 (scrub). Transport buttons are note-on:
//   Play = note 91, Stop = note 92, Record = note 95, Loop = note 86 (all channel 0).
export const MCU_MAP: McuMapping[] = [
  ...Array.from({ length: 8 }, (_, i) => ({
    label: `Fader ${i + 1}`,
    cc: i,
    channel: 0,
    kind: "cc" as const,
    target: {
      type: "trackVolume",
      trackIndex: i,
    } as MidiTarget,
  })),
  {
    label: "Master Fader",
    cc: 8,
    channel: 0,
    kind: "cc",
    target: { type: "masterVolume" },
  },
  {
    label: "Jog Wheel",
    cc: 60,
    channel: 0,
    kind: "cc",
    target: { type: "transport", action: "scrub" },
  },
  {
    label: "Play",
    cc: 91,
    channel: 0,
    kind: "note",
    target: { type: "transport", action: "togglePlay" },
  },
  {
    label: "Stop",
    cc: 92,
    channel: 0,
    kind: "note",
    target: { type: "transport", action: "stop" },
  },
  {
    label: "Record",
    cc: 95,
    channel: 0,
    kind: "note",
    target: { type: "transport", action: "record" },
  },
  {
    label: "Loop",
    cc: 86,
    channel: 0,
    kind: "note",
    target: { type: "transport", action: "loop" },
  },
];

export function applyMcuPreset(map: McuMapping[] = MCU_MAP): void {
  for (const entry of map) {
    bindMidi(entry.target, entry.cc, entry.channel, entry.kind);
  }
}

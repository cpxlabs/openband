export interface MidiNote {
  channel: number;
  note: number;
  velocity: number;
  start: number;
  duration: number;
}

export interface MidiTrack {
  name: string;
  channel: number;
  notes: MidiNote[];
  instrument: string;
}

export interface MidiData {
  format: number;
  tracks: MidiTrack[];
  bpm: number;
}

function readU16(view: DataView, offset: number): number {
  return (view.getUint8(offset) << 8) | view.getUint8(offset + 1);
}

function readU32(view: DataView, offset: number): number {
  return (view.getUint8(offset) << 24) | (view.getUint8(offset + 1) << 16) | (view.getUint8(offset + 2) << 8) | view.getUint8(offset + 3);
}

function readVarLen(view: DataView, offset: number): { value: number; bytes: number } {
  let value = 0;
  let byte: number;
  let bytes = 0;
  do {
    byte = view.getUint8(offset + bytes);
    value = (value << 7) | (byte & 0x7f);
    bytes++;
  } while (byte & 0x80);
  return { value, bytes };
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteToName(note: number): string {
  return `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
}

const GM_NAMES: Record<number, string> = {
  0: 'Acoustic Piano', 24: 'Acoustic Guitar (nylon)', 33: 'Electric Bass (finger)',
  40: 'Violin', 48: 'String Ensemble', 56: 'Trumpet',
  74: 'Flute', 81: 'Lead 1 (square)', 89: 'Pad 1 (new age)',
};

export function parseMidi(buffer: ArrayBuffer): MidiData | null {
  try {
    const view = new DataView(buffer);
    const header = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (header !== 'MThd') return null;

    const headerLen = readU32(view, 4);
    const format = readU16(view, 8);
    const numTracks = readU16(view, 10);
    const division = readU16(view, 12);
    const ticksPerQuarter = division & 0x8000 ? 480 : division;

    let offset = 14;
    const tracks: MidiTrack[] = [];
    let globalBpm = 120;

    for (let t = 0; t < numTracks; t++) {
      const trackHeader = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
      if (trackHeader !== 'MTrk') { offset += 4 + readU32(view, offset + 4); continue; }

      const trackLen = readU32(view, offset + 4);
      const trackEnd = offset + 8 + trackLen;
      offset += 8;

      const notes: MidiNote[] = [];
      let absoluteTicks = 0;
      let lastStatus = 0;
      let trackName = `Track ${t + 1}`;
      let instrument = 'Piano';
      let channel = 0;

      const noteOns: Map<number, { tick: number; velocity: number; channel: number }> = new Map();

      while (offset < trackEnd) {
        const delta = readVarLen(view, offset);
        offset += delta.bytes;
        absoluteTicks += delta.value;

        let status = view.getUint8(offset);
        if (status & 0x80) {
          lastStatus = status;
          offset++;
        } else {
          status = lastStatus;
        }

        const eventType = status >> 4;
        const chan = status & 0x0f;

        if (eventType === 0x9) {
          const note = view.getUint8(offset);
          const velocity = view.getUint8(offset + 1);
          offset += 2;
          if (velocity > 0) {
            noteOns.set(note + chan * 256, { tick: absoluteTicks, velocity, channel: chan });
          } else {
            const key = note + chan * 256;
            const on = noteOns.get(key);
            if (on) {
              notes.push({ channel: chan, note, velocity: on.velocity, start: on.tick, duration: absoluteTicks - on.tick });
              noteOns.delete(key);
            }
          }
          channel = chan;
        } else if (eventType === 0x8) {
          const note = view.getUint8(offset);
          offset += 2;
          const key = note + chan * 256;
          const on = noteOns.get(key);
          if (on) {
            notes.push({ channel: chan, note, velocity: on.velocity, start: on.tick, duration: absoluteTicks - on.tick });
            noteOns.delete(key);
          }
        } else if (eventType === 0xc) {
          const prog = view.getUint8(offset);
          offset += 1;
          instrument = GM_NAMES[prog] || `Prog ${prog}`;
          channel = chan;
        } else if (eventType === 0xb) {
          offset += 2;
        } else if (eventType === 0xe) {
          offset += 2;
        } else if (eventType === 0xf) {
          if (chan === 0xf) {
            const metaType = view.getUint8(offset); offset++;
            const len = readVarLen(view, offset); offset += len.bytes;
            if (metaType === 0x03) {
              trackName = String.fromCharCode(...Array.from({ length: len.value }, (_, i) => view.getUint8(offset + i)));
            } else if (metaType === 0x51) {
              const microsecs = (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
              globalBpm = Math.round(60000000 / microsecs);
            } else if (metaType === 0x2f) { break; }
            offset += len.value;
          }
        } else {
          offset += view.getUint8(offset) === 0 ? 0 : (eventType === 0xa ? 2 : 1);
        }
      }

      noteOns.forEach((on, key) => {
        notes.push({ channel: on.channel, note: key % 256, velocity: on.velocity, start: on.tick, duration: 120 });
      });

      if (notes.length > 0) {
        tracks.push({ name: trackName, channel, notes, instrument });
      }
    }

    if (tracks.length === 0) return null;
    return { format, tracks, bpm: globalBpm };
  } catch {
    return null;
  }
}

export function ticksToSeconds(ticks: number, bpm: number, ticksPerQuarter: number): number {
  return (ticks / ticksPerQuarter) * (60 / bpm);
}

import type { TrackRegion } from './types';

export function midiToTrackRegions(track: MidiTrack, bpm: number, ticksPerQuarter: number = 480): TrackRegion[] {
  const minTick = track.notes.length > 0 ? Math.min(...track.notes.map(n => n.start)) : 0;
  return track.notes.map(n => ({
    id: `midi-${n.note}-${n.start}`,
    start: ticksToSeconds(n.start - minTick, bpm, ticksPerQuarter),
    duration: Math.max(ticksToSeconds(n.duration, bpm, ticksPerQuarter), 0.5),
  }));
}

import type { TrackDef } from "./types";

export interface StemManifest {
  generator: string;
  projectOriginId: string;
  sessionMetadata: {
    globalBpm: number;
    globalKey: string;
    chordsSequence: string[];
  };
  stemsRegistry: {
    filename: string;
    trackType: string;
    trackName: string;
    isMono: boolean;
    patchRef?: string;
  }[];
}

export function buildStemManifest(
  projectId: string,
  bpm: number,
  key: string,
  chords: string[],
  tracks: TrackDef[],
): StemManifest {
  return {
    generator: "Openband DAW Engine v2.0",
    projectOriginId: projectId,
    sessionMetadata: {
      globalBpm: bpm,
      globalKey: key,
      chordsSequence: chords,
    },
    stemsRegistry: tracks.map((track) => ({
      filename: `${track.name.toLowerCase().replace(/\s+/g, "_")}.wav`,
      trackType:
        track.midiNotes && track.midiNotes.length > 0
          ? "midi_synthesizer"
          : "audio_track",
      trackName: track.name,
      isMono: false,
      ...(track.midiNotes?.length
        ? { patchRef: track.name.toLowerCase().replace(/\s+/g, "_") }
        : {}),
    })),
  };
}

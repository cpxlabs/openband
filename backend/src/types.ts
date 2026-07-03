export type StemType = "drums" | "bass" | "vocals" | "other";

export interface ExtractResponse {
  jobId: string;
  stems: StemFile[];
  duration: number;
}

export interface StemFile {
  type: StemType;
  label: string;
  filename: string;
  size: number;
  url: string;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

export interface MidiNote {
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
}

export interface TrackRegion {
  id: string;
  start: number;
  duration: number;
}

export interface TrackDef {
  id: string;
  name: string;
  type: string;
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  outputId: string | null;
  sends: Record<string, unknown>;
  regions: TrackRegion[];
  midiNotes?: MidiNote[];
  plugins: unknown[];
  automation: Record<string, unknown>;
  sidechainSource: string | null;
}

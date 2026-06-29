export interface TemplateNote {
  id: string;
  pitch: number;
  velocity: number;
  start: number;
  duration: number;
}

export type TemplateRegionType = "midi" | "audio";

export interface TemplateRegion {
  id: string;
  trackId: string;
  type: TemplateRegionType;
  start: number;
  duration: number;
  name: string;
  notes?: TemplateNote[];
  audioUrl?: string;
}

export interface TemplateTrack {
  id: string;
  name: string;
  color: string;
  volume: number;
  pan: number;
  isMuted: boolean;
  isSoloed: boolean;
  pluginChainId?: string;
  regions: TemplateRegion[];
  virtualInstrument: {
    type: "synth" | "sampler" | "piano-roll";
    presetId: string;
  };
}

export interface ProjectStarter {
  id: string;
  name: string;
  description?: string;
  bpm: number;
  timeSignature: {
    numerator: number;
    denominator: number;
  };
  tracks: TemplateTrack[];
}

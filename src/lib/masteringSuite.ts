import type { Plugin } from "./types";
import { getDefaultParams } from "./types";

export interface MasteringVersion {
  id: string;
  name: string;
  created: number;
  plugins: Plugin[];
  notes: string;
}

export interface MasteringSession {
  inputFile: MasteringInput | null;
  versions: MasteringVersion[];
  activeVersionId: string | null;
  bypassed: boolean;
}

export interface MasteringInput {
  type: "single" | "stems";
  filename: string;
  size: number;
  sampleRate: number;
  bitDepth: number;
  duration: number;
  url: string;
  stems?: { name: string; url: string }[];
}

export const MASTERING_PLUGIN_DEFS: {
  name: string;
  type: Plugin["type"];
  color: string;
  description: string;
}[] = [
  {
    name: "Parametric EQ",
    type: "eq",
    color: "#5ac8fa",
    description: "EQ cirúrgico de 8 bandas",
  },
  {
    name: "Compressor",
    type: "compressor",
    color: "#ff9500",
    description: "Compressão VCA / glue",
  },
  {
    name: "Tape Saturation",
    type: "tapeSaturator",
    color: "#ff453a",
    description: "Saturação harmônica de fita",
  },
  {
    name: "Baxandall EQ & Stereo Wider",
    type: "stereoImager",
    color: "#00d4aa",
    description: "Shelf EQ + imagem estéreo M/S",
  },
  {
    name: "De-esser & Air",
    type: "deesser",
    color: "#ff9f0a",
    description: "Controle de sibilância + top-end air",
  },
  {
    name: "Clipper",
    type: "clipper",
    color: "#ff6482",
    description: "Hard/Soft clipping pré-limiter",
  },
  {
    name: "Limiter",
    type: "truePeakLimiter",
    color: "#ff375f",
    description: "Brickwall limiter + LUFS metering",
  },
];

export function buildMasteringChain(): Plugin[] {
  return MASTERING_PLUGIN_DEFS.map((p, i) => ({
    id: `master-${i}`,
    name: p.name,
    type: p.type,
    enabled: true,
    params: getDefaultParams(p.type),
    color: p.color,
  }));
}

export function createVersion(
  plugins: Plugin[],
  name: string,
  notes: string,
): MasteringVersion {
  return {
    id: `v-${Date.now()}`,
    name,
    created: Date.now(),
    plugins: plugins.map((p) => ({ ...p, params: { ...p.params } })),
    notes,
  };
}

export function formatBitDepth(d: number): string {
  return `${d}-bit`;
}

export function formatSampleRate(r: number): string {
  return `${(r / 1000).toFixed(1)}kHz`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

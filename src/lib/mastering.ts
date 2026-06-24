import type { Plugin } from "./types";
import { getDefaultParams } from "./types";

export interface MasteringChainPreset {
  name: string;
  description: string;
  plugins: { name: string; type: Plugin["type"]; color: string }[];
}

export const MASTERING_CHAIN_PRESETS: MasteringChainPreset[] = [
  {
    name: "Master Rápido",
    description: "EQ → Comp → Limiter",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Compressor", type: "compressor", color: "#ff9500" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Master Completo",
    description: "EQ → Multiband → Imager → Tape → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Multiband Comp", type: "multibandCompressor", color: "#bf5af2" },
      { name: "Stereo Imager", type: "stereoImager", color: "#00d4aa" },
      { name: "Tape Saturator", type: "tapeSaturator", color: "#ff453a" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Rádio / Podcast",
    description: "EQ → De-Ess → Comp → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "DeEsser", type: "deesser", color: "#ff9f0a" },
      { name: "Compressor", type: "compressor", color: "#ff9500" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Loudness Maximizer",
    description: "EQ → Multiband → Limiter → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Multiband Comp", type: "multibandCompressor", color: "#bf5af2" },
      { name: "Limiter", type: "limiter", color: "#ff6482" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Acústico Natural",
    description: "EQ leve → Tape → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Tape Saturator", type: "tapeSaturator", color: "#ff453a" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "EDM Club",
    description: "EQ → Multiband → Imager → Limiter → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Multiband Comp", type: "multibandCompressor", color: "#bf5af2" },
      { name: "Stereo Imager", type: "stereoImager", color: "#00d4aa" },
      { name: "Limiter", type: "limiter", color: "#ff6482" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Vintage Warm",
    description: "Tape → EQ → Comp → True Peak",
    plugins: [
      { name: "Tape Saturator", type: "tapeSaturator", color: "#ff453a" },
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Compressor", type: "compressor", color: "#ff9500" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Modern Clean",
    description: "EQ → Comp → Stereo Imager → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Compressor", type: "compressor", color: "#ff9500" },
      { name: "Stereo Imager", type: "stereoImager", color: "#00d4aa" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Lo-Fi Vibe",
    description: "Tape → EQ → Limiter → True Peak",
    plugins: [
      { name: "Tape Saturator", type: "tapeSaturator", color: "#ff453a" },
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Limiter", type: "limiter", color: "#ff6482" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Broadcast Ready",
    description: "EQ → De-Ess → Multiband → Comp → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "DeEsser", type: "deesser", color: "#ff9f0a" },
      { name: "Multiband Comp", type: "multibandCompressor", color: "#bf5af2" },
      { name: "Compressor", type: "compressor", color: "#ff9500" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
];

export function buildMasteringChain(preset: MasteringChainPreset): Plugin[] {
  return preset.plugins.map((p, i) => ({
    id: `master-chain-${i}-${Date.now()}`,
    name: p.name,
    type: p.type,
    enabled: true,
    params: getDefaultParams(p.type),
    color: p.color,
  }));
}

export function getOversampleLabel(value: number): string {
  const map: Record<number, string> = { 0: "1x", 1: "2x", 2: "4x", 3: "8x" };
  return map[value] || "2x";
}

import type { ImperativeRouter } from "expo-router";
import {
  registerCommand,
  unregisterCommand,
} from "./commandRegistry";

export interface CreativeMode {
  id: string;
  modeId: string;
  label: string;
  icon: string;
  route: string;
  description: string;
  category: string;
}

export const CREATIVE_MODES: CreativeMode[] = [
  {
    id: "mode.acoustics",
    modeId: "acoustics",
    label: "Acústica",
    icon: "🏟",
    route: "/acoustics",
    description: "Simulação acústica de sala e tratamento",
    category: "Modes",
  },
  {
    id: "mode.autotune",
    modeId: "autotune",
    label: "Autotune",
    icon: "🎙",
    route: "/autotune",
    description: "Correção de afinação em tempo real",
    category: "Modes",
  },
  {
    id: "mode.beatmaker",
    modeId: "beatmaker",
    label: "Beatmaker",
    icon: "🥁",
    route: "/beatmaker",
    description: "Produção de batidas e grooves",
    category: "Modes",
  },
  {
    id: "mode.cover-jam",
    modeId: "cover-jam",
    label: "Cover Jam",
    icon: "🎸",
    route: "/cover-jam",
    description: "Jam sessions e versões cover",
    category: "Modes",
  },
  {
    id: "mode.dj-stage",
    modeId: "dj-stage",
    label: "DJ Stage",
    icon: "🎚",
    route: "/dj-stage",
    description: "Mesa de DJ e mixagem ao vivo",
    category: "Modes",
  },
  {
    id: "mode.live-room",
    modeId: "live-room",
    label: "Live Room",
    icon: "🎤",
    route: "/live-room",
    description: "Sala de performance ao vivo",
    category: "Modes",
  },
  {
    id: "mode.lofi-tape",
    modeId: "lofi-tape",
    label: "Lofi Tape",
    icon: "📼",
    route: "/lofi-tape",
    description: "Gravação lo-fi em fita",
    category: "Modes",
  },
  {
    id: "mode.mixing-console",
    modeId: "mixing-console",
    label: "Mixing Console",
    icon: "🎛",
    route: "/mixing-console",
    description: "Console de mixagem",
    category: "Modes",
  },
  {
    id: "mode.spatial-audio",
    modeId: "spatial-audio",
    label: "Áudio Espacial",
    icon: "🌐",
    route: "/spatial-audio",
    description: "Áudio espacial e imersivo",
    category: "Modes",
  },
  {
    id: "mode.stem-collider",
    modeId: "stem-collider",
    label: "Stem Collider",
    icon: "🧬",
    route: "/stem-collider",
    description: "Colisão e fusão de stems",
    category: "Modes",
  },
  {
    id: "mode.synth-lab",
    modeId: "synth-lab",
    label: "Synth Lab",
    icon: "🎹",
    route: "/synth-lab",
    description: "Laboratório de sintetizadores",
    category: "Modes",
  },
  {
    id: "mode.vocal-booth",
    modeId: "vocal-booth",
    label: "Vocal Booth",
    icon: "🗣",
    route: "/vocal-booth",
    description: "Cabine de gravação vocal",
    category: "Modes",
  },
  {
    id: "mode.explorer",
    modeId: "explorer",
    label: "Explorer",
    icon: "🌍",
    route: "/tabs/explorer",
    description: "Missão e exploração OpenBand",
    category: "Modes",
  },
];

export function registerCreativeModeCommands(router: ImperativeRouter): void {
  for (const mode of CREATIVE_MODES) {
    registerCommand(
      mode.id,
      mode.label,
      mode.description,
      mode.category,
      () => router.push(mode.route as any),
    );
  }
}

export function unregisterCreativeModeCommands(): void {
  for (const mode of CREATIVE_MODES) {
    unregisterCommand(mode.id);
  }
}

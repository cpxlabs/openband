export interface HarmonyVoice {
  noteOffset: number;
  gain: number;
}

export function getScaleIntervals(key: string): HarmonyVoice[] {
  const isMinor = key.toLowerCase().includes("m");
  return [
    { noteOffset: isMinor ? 3 : 4, gain: 0.5 },
    { noteOffset: 7, gain: 0.4 },
    { noteOffset: 12, gain: 0.3 },
  ];
}

export function getChordIntervals(
  _rootNote: number,
  scale: number[],
): HarmonyVoice[] {
  return [
    { noteOffset: scale[2] - scale[0], gain: 0.55 },
    { noteOffset: scale[4] - scale[0], gain: 0.45 },
    { noteOffset: scale[0], gain: 0.35 },
  ];
}

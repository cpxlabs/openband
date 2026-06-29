const SCALE_INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  melodic_minor: [0, 2, 3, 5, 7, 9, 11],
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
};

const CHORD_INTERVALS: Record<string, number[]> = {
  I: [0, 4, 7],
  ii: [2, 5, 9],
  iiø: [2, 5, 8],
  III: [4, 7, 11],
  iii: [4, 7, 11],
  IV: [5, 9, 0],
  V: [7, 11, 2],
  V7: [7, 11, 2, 5],
  vi: [9, 0, 4],
  VI: [9, 0, 4],
  viiø: [11, 2, 5],
  VII: [11, 2, 5],
  I7: [0, 4, 7, 10],
  IV7: [5, 9, 0, 3],
};

export function getScale(rootNote: number, scaleType: string): number[] {
  const intervals = SCALE_INTERVALS[scaleType];
  if (!intervals) return SCALE_INTERVALS.major.map((i) => rootNote + i);
  return intervals.map((i) => rootNote + i);
}

export function resolveProgression(
  degrees: string[],
  rootNote: number,
  scaleType: string,
): number[][] {
  const scale = getScale(rootNote, scaleType);
  return degrees.map((deg) => {
    const intervals = CHORD_INTERVALS[deg];
    if (!intervals) return scale.slice(0, 3);
    return intervals.map((i) => {
      const octave = Math.floor((rootNote + i) / 12);
      const noteInScale = scale.find(
        (n) => n % 12 === (rootNote + i) % 12 && Math.floor(n / 12) === octave,
      );
      return noteInScale ?? rootNote + i;
    });
  });
}

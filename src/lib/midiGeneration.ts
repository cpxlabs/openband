export interface ProjectMetadata {
  bpm: number;
  key: string;
  timeSignature: string;
  userPrompt: string;
}

export interface GeneratedMidiNote {
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
}

export interface MidiGenerationResult {
  notes: GeneratedMidiNote[];
  bpm: number;
  key: string;
}

export function serializeProjectMetadata(
  bpm: number,
  key: string | undefined,
  timeSignature: [number, number],
  userPrompt: string,
): ProjectMetadata {
  return {
    bpm,
    key: key || "C Major",
    timeSignature: `${timeSignature[0]}/${timeSignature[1]}`,
    userPrompt,
  };
}

export async function generateMidiFromPrompt(
  metadata: ProjectMetadata,
): Promise<MidiGenerationResult | null> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

  try {
    const response = await fetch(`${apiUrl}/api/generate-midi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      console.warn("MIDI generation API error:", response.status);
      return fallbackGenerate(metadata);
    }

    const data = await response.json();
    return {
      notes: (data.midiData || []).map((n: { note: number; start: number; duration: number; velocity?: number }) => ({
        pitch: n.note,
        start: n.start,
        duration: n.duration,
        velocity: n.velocity ?? 100,
      })),
      bpm: data.bpm || metadata.bpm,
      key: data.key || metadata.key,
    };
  } catch (e) {
    console.warn("MIDI generation fetch failed, using fallback:", e);
    return fallbackGenerate(metadata);
  }
}

function fallbackGenerate(metadata: ProjectMetadata): MidiGenerationResult {
  const beatsPerBar = 4;
  const totalBars = 4;
  const totalBeats = totalBars * beatsPerBar;

  const notes: GeneratedMidiNote[] = [];
  const notePool = [60, 62, 64, 65, 67, 69, 71, 72];

  for (let beat = 0; beat < totalBeats; beat++) {
    const pitch = notePool[beat % notePool.length];
    notes.push({
      pitch,
      start: beat,
      duration: 0.5 + (beat % 2),
      velocity: 80 + Math.round(Math.random() * 40),
    });
  }

  return {
    notes,
    bpm: metadata.bpm,
    key: metadata.key,
  };
}

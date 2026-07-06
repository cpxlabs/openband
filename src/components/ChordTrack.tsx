import { useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import type { ChordQuality } from "../lib/harmony";
import {
  PROGRESSION_PRESETS,
  keyToRootNote,
  NOTE_TO_MIDI,
} from "../lib/harmony";
import { suggestNextChords } from "../lib/harmonicAssistant";

const QUALITY_LABELS: Record<ChordQuality, string> = {
  maj: "",
  min: "m",
  dim: "°",
  "7": "7",
  maj7: "maj7",
  min7: "m7",
  sus4: "sus4",
  aug: "+",
};

const QUALITY_COLORS: Record<ChordQuality, string> = {
  maj: "#34c759",
  min: "#5ac8fa",
  dim: "#ff375f",
  "7": "#ff9f0a",
  maj7: "#bf5af2",
  min7: "#00d4aa",
  sus4: "#ffcc00",
  aug: "#ff453a",
};

interface ChordBlock {
  id: string;
  degree: number;
  quality: ChordQuality;
  beats: number;
}

interface ChordTrackProps {
  chords: ChordBlock[];
  onChange: (chords: ChordBlock[]) => void;
  keySignature: string;
  bpm?: number;
  numBars: number;
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

function chordName(
  degree: number,
  quality: ChordQuality,
  keySignature: string,
): string {
  const rootNote = keyToRootNote(keySignature);
  const isMinor = keySignature.includes("m");
  const scale = isMinor
    ? [0, 2, 3, 5, 7, 8, 10].map((i) => rootNote + i)
    : [0, 2, 4, 5, 7, 9, 11].map((i) => rootNote + i);

  const midi = scale[degree % scale.length];
  const noteNames = Object.keys(NOTE_TO_MIDI);
  const noteName = noteNames.find((n) => NOTE_TO_MIDI[n] === midi % 12) ?? "C";
  return `${noteName}${QUALITY_LABELS[quality]}`;
}

export function ChordTrack({
  chords,
  onChange,
  keySignature,
  numBars,
  visible,
  onClose,
  testID,
}: ChordTrackProps) {
  const [showPresets, setShowPresets] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const totalBeats = numBars * 4;

  const currentBeats = useMemo(
    () => chords.reduce((sum, c) => sum + c.beats, 0),
    [chords],
  );

  const suggestions = useMemo(() => {
    const recent = chords.slice(-2).map((c) => ({
      degree: c.degree,
      quality: c.quality,
    }));
    return suggestNextChords(recent, keySignature.includes("m"), 4);
  }, [chords, keySignature]);

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = PROGRESSION_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      const repeats = Math.ceil(totalBeats / (preset.degrees.length * 2));
      const newChords: ChordBlock[] = [];
      let remaining = totalBeats;
      for (let r = 0; r < repeats && remaining > 0; r++) {
        for (const deg of preset.degrees) {
          if (remaining <= 0) break;
          const beats = Math.min(2, remaining);
          newChords.push({
            id: `chord-${Date.now()}-${newChords.length}`,
            degree: deg.degree,
            quality: deg.quality,
            beats,
          });
          remaining -= beats;
        }
      }
      onChange(newChords);
      setShowPresets(false);
    },
    [totalBeats, onChange],
  );

  const addChord = useCallback(
    (degree: number, quality: ChordQuality) => {
      const remaining = totalBeats - currentBeats;
      if (remaining <= 0) return;
      const beats = Math.min(2, remaining);
      onChange([
        ...chords,
        {
          id: `chord-${Date.now()}`,
          degree,
          quality,
          beats,
        },
      ]);
      setShowSuggestions(false);
    },
    [chords, currentBeats, totalBeats, onChange],
  );

  const removeChord = useCallback(
    (id: string) => {
      onChange(chords.filter((c) => c.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [chords, selectedId, onChange],
  );

  const cycleQuality = useCallback(
    (id: string) => {
      const qualities: ChordQuality[] = [
        "maj",
        "min",
        "dim",
        "7",
        "maj7",
        "min7",
        "sus4",
        "aug",
      ];
      onChange(
        chords.map((c) => {
          if (c.id !== id) return c;
          const idx = qualities.indexOf(c.quality);
          const next = qualities[(idx + 1) % qualities.length];
          return { ...c, quality: next };
        }),
      );
    },
    [chords, onChange],
  );

  const cycleDegree = useCallback(
    (id: string, dir: number) => {
      onChange(
        chords.map((c) => {
          if (c.id !== id) return c;
          return { ...c, degree: (c.degree + dir + 7) % 7 };
        }),
      );
    },
    [chords, onChange],
  );

  if (!visible) return null;

  return (
    <View testID={testID} className="bg-dark-surface rounded-xl border border-dark-border overflow-hidden">
      <View className="flex-row items-center justify-between px-3 py-2 border-b border-dark-border">
        <View className="flex-row items-center gap-2">
          <View className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          <Text className="text-gray-300 text-xs font-semibold">
            Chord Track
          </Text>
          <Text className="text-gray-600 text-[9px]">
            {keySignature} · {currentBeats}/{totalBeats} beats
          </Text>
        </View>
        <View className="flex-row gap-1">
          <Pressable
            onPress={() => setShowPresets(!showPresets)}
            className="px-3 py-1 rounded-lg bg-dark-muted pressable-scale"
          >
            <Text className="text-gray-400 text-[9px]">Presets</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowSuggestions(!showSuggestions)}
            className="px-3 py-1 rounded-lg bg-dark-muted pressable-scale"
          >
            <Text className="text-gray-400 text-[9px]">Suggest</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 rounded items-center justify-center pressable-scale"
          >
            <Text className="text-gray-500 text-[10px]">✕</Text>
          </Pressable>
        </View>
      </View>

      {showPresets && (
        <View className="flex-row flex-wrap gap-1 px-3 py-2 bg-dark-bg/50 border-b border-dark-border">
          {PROGRESSION_PRESETS.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => applyPreset(p.id)}
              className="px-3 py-1.5 rounded-md bg-dark-surface border border-dark-border pressable-scale"
            >
              <Text className="text-gray-300 text-[9px] font-medium">
                {p.name}
              </Text>
              <Text className="text-gray-600 text-[7px]">
                {p.description.split("—")[0].trim()}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {showSuggestions && (
        <View className="flex-row gap-1 px-3 py-2 bg-dark-bg/50 border-b border-dark-border">
          {suggestions.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => addChord(s.degree, s.quality)}
              className="px-3 py-1.5 rounded-md border border-dark-border pressable-scale"
              style={{ backgroundColor: `${QUALITY_COLORS[s.quality]}15` }}
            >
              <Text
                className="text-[10px] font-bold"
                style={{ color: QUALITY_COLORS[s.quality] }}
              >
                {s.label}
              </Text>
              <Text className="text-gray-600 text-[7px]">
                {Math.round(s.probability)}%
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-2 py-2"
      >
        <View className="flex-row gap-1">
          {chords.map((chord) => {
            const name = chordName(chord.degree, chord.quality, keySignature);
            const isSelected = selectedId === chord.id;
            const width = Math.max(48, chord.beats * 24);
            return (
              <Pressable
                key={chord.id}
                onPress={() =>
                  setSelectedId(isSelected ? null : chord.id)
                }
                onLongPress={() => removeChord(chord.id)}
                className="rounded-lg border items-center justify-center"
                style={{
                  width,
                  height: 48,
                  borderColor: isSelected
                    ? QUALITY_COLORS[chord.quality]
                    : "#333",
                  backgroundColor: isSelected
                    ? `${QUALITY_COLORS[chord.quality]}20`
                    : `${QUALITY_COLORS[chord.quality]}08`,
                }}
              >
                <Text
                  className="text-[11px] font-bold"
                  style={{ color: QUALITY_COLORS[chord.quality] }}
                >
                  {name}
                </Text>
                <Text className="text-gray-600 text-[7px]">
                  {chord.beats} beats
                </Text>
              </Pressable>
            );
          })}
          {currentBeats < totalBeats && (
            <Pressable
              onPress={() => addChord(0, "maj")}
              className="w-12 h-12 rounded-lg border border-dashed border-dark-border items-center justify-center pressable-scale"
            >
              <Text className="text-gray-600 text-lg">+</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {selectedId && (
        <View className="flex-row items-center justify-center gap-2 px-3 py-2 border-t border-dark-border">
          <Pressable
            onPress={() => cycleDegree(selectedId, -1)}
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center pressable-scale"
          >
            <Text className="text-gray-400 text-xs">←</Text>
          </Pressable>
          <Text className="text-gray-400 text-[9px]">Degree</Text>
          <Pressable
            onPress={() => cycleDegree(selectedId, 1)}
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center pressable-scale"
          >
            <Text className="text-gray-400 text-xs">→</Text>
          </Pressable>
          <View className="w-px h-5 bg-dark-border" />
          <Pressable
            onPress={() => cycleQuality(selectedId)}
            className="px-3 py-1.5 rounded-lg bg-dark-muted pressable-scale"
          >
            <Text className="text-gray-400 text-[9px]">Quality</Text>
          </Pressable>
          <View className="w-px h-5 bg-dark-border" />
          <Pressable
            onPress={() => removeChord(selectedId)}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 pressable-scale"
          >
            <Text className="text-red-400 text-[9px]">Delete</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

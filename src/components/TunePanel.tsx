import { useCallback, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Card } from "./Card";
import { Button } from "./Button";
import { detectKey } from "../lib/keyDetection";
import { hzToNote } from "../lib/pitchEstimate";

const KEYS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const SCALE_OPTIONS: { label: string; value: number }[] = [
  { label: "Major", value: 0 },
  { label: "Minor", value: 1 },
  { label: "Chromatic", value: 2 },
];

function scaleToIndex(scale: string): number {
  if (scale === "minor") return 1;
  if (scale === "chromatic") return 2;
  return 0;
}

function scaleToLabel(value: number): string {
  return SCALE_OPTIONS[value]?.label ?? "Major";
}

interface TunePanelProps {
  params: Record<string, number>;
  onParamChange: (paramId: string, value: number) => void;
  buffer?: AudioBuffer | null;
  livePitch?: number | null;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const normalized = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-[11px] text-neutral-400 font-medium">{label}</Text>
        <Text className="text-[11px] text-neutral-500">
          {value}
          {unit}
        </Text>
      </View>
      <View className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <View
          className="h-full bg-brand-accent rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, normalized))}%` }}
        />
      </View>
      {Platform.OS === "web" && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 opacity-0 cursor-pointer -mt-1.5"
        />
      )}
    </View>
  );
}

export function TunePanel({
  params,
  onParamChange,
  buffer,
  livePitch,
}: TunePanelProps) {
  const [detecting, setDetecting] = useState(false);

  const handleDetect = useCallback(() => {
    if (!buffer) return;
    setDetecting(true);
    try {
      const result = detectKey(buffer);
      onParamChange("key", result.key);
      onParamChange("scale", scaleToIndex(result.scale));
    } finally {
      setDetecting(false);
    }
  }, [buffer, onParamChange]);

  const key = Math.round(params.key ?? 0);
  const scale = Math.round(params.scale ?? 0);
  const liveNote = livePitch ? hzToNote(livePitch) : null;

  return (
    <Card elevated className="p-3">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm text-white font-semibold">Auto-Pitch (TUNE)</Text>
        <Button
          title="Detect key"
          size="sm"
          variant="secondary"
          loading={detecting}
          disabled={!buffer}
          onPress={handleDetect}
          testID="tune-detect-key"
        />
      </View>

      <Text className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
        Key
      </Text>
      <View className="flex-row flex-wrap gap-1 mb-2">
        {KEYS.map((k, i) => (
          <Pressable
            key={k}
            testID={`tune-key-${i}`}
            onPress={() => onParamChange("key", i)}
            className={`px-2 py-1 rounded ${
              key === i ? "bg-brand-accent" : "bg-neutral-800"
            }`}
          >
            <Text
              className={`text-[10px] ${key === i ? "text-black" : "text-neutral-300"}`}
            >
              {k}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
        Scale
      </Text>
      <View className="flex-row gap-1 mb-3">
        {SCALE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.label}
            testID={`tune-scale-${opt.value}`}
            onPress={() => onParamChange("scale", opt.value)}
            className={`flex-1 py-1 rounded ${
              scale === opt.value ? "bg-brand-accent" : "bg-neutral-800"
            }`}
          >
            <Text
              className={`text-[10px] text-center ${
                scale === opt.value ? "text-black" : "text-neutral-300"
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Slider
        label="Amount"
        value={Math.round(params.amount ?? 0)}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => onParamChange("amount", v)}
      />
      <Slider
        label="Speed"
        value={Math.round(params.speed ?? 0)}
        min={1}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => onParamChange("speed", v)}
      />
      <Slider
        label="Formant"
        value={Math.round(params.formant ?? 0)}
        min={-12}
        max={12}
        step={1}
        unit="st"
        onChange={(v) => onParamChange("formant", v)}
      />
      <Slider
        label="Mix"
        value={Math.round(params.mix ?? 0)}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => onParamChange("mix", v)}
      />

      <View className="mt-3 p-2 rounded bg-neutral-800">
        <Text className="text-[10px] text-neutral-500 uppercase tracking-wider">
          Live Pitch
        </Text>
        <Text className="text-base font-mono text-brand-accent" testID="tune-live-pitch">
          {liveNote ? `${liveNote.note} · ${livePitch!.toFixed(1)} Hz` : "—"}
        </Text>
      </View>

      <Text className="text-[9px] text-neutral-600 mt-2">
        Scale: {scaleToLabel(scale)} · Detected key is a suggestion only.
      </Text>
    </Card>
  );
}

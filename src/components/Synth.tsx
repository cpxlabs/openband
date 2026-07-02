import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, Pressable, Modal, Platform, ScrollView } from "react-native";
import {
  createSubtractiveSynth,
  SubtractiveSynth,
  SubtractiveSynthConfig,
  DEFAULT_SYNTH_CONFIG,
  SUBTRACTIVE_PRESETS,
  disposeSubtractiveSynthAudio,
} from "../lib/subtractiveSynth";

type WaveformType = OscillatorType;
type FilterType = BiquadFilterType;
type LfoTarget = "pitch" | "filter" | "amp";
type ArpDirection = "up" | "down" | "random";

interface SynthPreset {
  name: string;
  config: Partial<SubtractiveSynthConfig>;
}

const PRESETS: SynthPreset[] = [
  { name: "Init Saw", config: SUBTRACTIVE_PRESETS["Init Saw"] },
  { name: "Fat Bass", config: SUBTRACTIVE_PRESETS["Fat Bass"] },
  { name: "Soft Pad", config: SUBTRACTIVE_PRESETS["Soft Pad"] },
  { name: "Pluck", config: SUBTRACTIVE_PRESETS["Pluck"] },
  { name: "Wobble", config: SUBTRACTIVE_PRESETS["Wobble"] },
  { name: "Scream Lead", config: SUBTRACTIVE_PRESETS["Scream Lead"] },
  {
    name: "Classic Bass",
    config: {
      osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.8 },
      osc2: { type: "square", detune: 0, octave: -1, level: 0.3 },
      filter: { type: "lowpass", frequency: 400, resonance: 3, envelope: 60 },
      ampEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
      filterEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.2 },
      lfo: { rate: 3, depth: 5, target: "filter" },
    },
  },
  {
    name: "Deep Sub",
    config: {
      osc1: { type: "sine", detune: 0, octave: 0, level: 0.9 },
      osc2: { type: "sine", detune: 0, octave: -2, level: 0.4 },
      filter: { type: "lowpass", frequency: 200, resonance: 1, envelope: 30 },
      ampEnvelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.5 },
      filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.3 },
      lfo: { rate: 2, depth: 3, target: "amp" },
    },
  },
  {
    name: "Lead Saw",
    config: {
      osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.75 },
      osc2: { type: "sawtooth", detune: 7, octave: 0, level: 0.6 },
      filter: { type: "lowpass", frequency: 2000, resonance: 2, envelope: 70 },
      ampEnvelope: { attack: 0.005, decay: 0.1, sustain: 0.8, release: 0.2 },
      filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.1 },
      lfo: { rate: 4, depth: 10, target: "pitch" },
    },
  },
  {
    name: "Square Lead",
    config: {
      osc1: { type: "square", detune: 0, octave: 0, level: 0.7 },
      osc2: { type: "square", detune: 12, octave: 0, level: 0.5 },
      filter: { type: "lowpass", frequency: 1500, resonance: 4, envelope: 50 },
      ampEnvelope: { attack: 0.003, decay: 0.08, sustain: 0.7, release: 0.15 },
      filterEnvelope: { attack: 0.003, decay: 0.15, sustain: 0.5, release: 0.1 },
      lfo: { rate: 5, depth: 15, target: "filter" },
    },
  },
  {
    name: "Analog Pad",
    config: {
      osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.6 },
      osc2: { type: "triangle", detune: -5, octave: 0, level: 0.5 },
      filter: { type: "lowpass", frequency: 800, resonance: 1.5, envelope: 80 },
      ampEnvelope: { attack: 0.1, decay: 0.5, sustain: 0.8, release: 1.0 },
      filterEnvelope: { attack: 0.05, decay: 0.5, sustain: 0.7, release: 0.5 },
      lfo: { rate: 2, depth: 20, target: "filter" },
    },
  },
  {
    name: "Soft Piano",
    config: {
      osc1: { type: "triangle", detune: 0, octave: 0, level: 0.7 },
      osc2: { type: "triangle", detune: 0, octave: 1, level: 0.3 },
      filter: { type: "lowpass", frequency: 3000, resonance: 0.5, envelope: 40 },
      ampEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.6, release: 0.8 },
      filterEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.5, release: 0.3 },
      lfo: { rate: 1, depth: 5, target: "amp" },
    },
  },
  {
    name: "Wobble Bass",
    config: {
      osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.8 },
      osc2: { type: "square", detune: 0, octave: -1, level: 0.4 },
      filter: { type: "lowpass", frequency: 600, resonance: 6, envelope: 50 },
      ampEnvelope: { attack: 0.005, decay: 0.1, sustain: 0.8, release: 0.2 },
      filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.1 },
      lfo: { rate: 6, depth: 50, target: "filter" },
    },
  },
  {
    name: "String Ensemble",
    config: {
      osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.65 },
      osc2: { type: "triangle", detune: 12, octave: 0, level: 0.45 },
      filter: { type: "lowpass", frequency: 1500, resonance: 1, envelope: 60 },
      ampEnvelope: { attack: 0.05, decay: 0.4, sustain: 0.7, release: 1.2 },
      filterEnvelope: { attack: 0.02, decay: 0.4, sustain: 0.5, release: 0.4 },
      lfo: { rate: 1.5, depth: 10, target: "pitch" },
    },
  },
  {
    name: "Brass",
    config: {
      osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.7 },
      osc2: { type: "square", detune: 7, octave: 0, level: 0.4 },
      filter: { type: "lowpass", frequency: 1000, resonance: 2.5, envelope: 70 },
      ampEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.4 },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.2 },
      lfo: { rate: 2, depth: 8, target: "filter" },
    },
  },
  {
    name: "Sine Pad",
    config: {
      osc1: { type: "sine", detune: 0, octave: 0, level: 0.7 },
      osc2: { type: "sine", detune: 7, octave: 0, level: 0.5 },
      filter: { type: "lowpass", frequency: 1000, resonance: 0.5, envelope: 60 },
      ampEnvelope: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 },
      filterEnvelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 0.5 },
      lfo: { rate: 1, depth: 15, target: "filter" },
    },
  },
  {
    name: "Funky Clav",
    config: {
      osc1: { type: "square", detune: 0, octave: 0, level: 0.75 },
      osc2: { type: "sawtooth", detune: -5, octave: 0, level: 0.35 },
      filter: { type: "bandpass", frequency: 1500, resonance: 3, envelope: 60 },
      ampEnvelope: { attack: 0.002, decay: 0.08, sustain: 0.4, release: 0.1 },
      filterEnvelope: { attack: 0.002, decay: 0.1, sustain: 0.3, release: 0.1 },
      lfo: { rate: 4, depth: 10, target: "filter" },
    },
  },
  {
    name: "Noise FX",
    config: {
      osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.3 },
      osc2: { type: "square", detune: 0, octave: 2, level: 0.15 },
      filter: { type: "bandpass", frequency: 3000, resonance: 4, envelope: 50 },
      ampEnvelope: { attack: 0.001, decay: 0.1, sustain: 0.5, release: 0.2 },
      filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0.4, release: 0.1 },
      lfo: { rate: 8, depth: 40, target: "filter" },
    },
  },
  {
    name: "Resonant Sweep",
    config: {
      osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.7 },
      osc2: { type: "sine", detune: 0, octave: 0, level: 0 },
      filter: { type: "highpass", frequency: 100, resonance: 8, envelope: 90 },
      ampEnvelope: { attack: 0.05, decay: 0.5, sustain: 0.3, release: 0.6 },
      filterEnvelope: { attack: 0.02, decay: 0.5, sustain: 0.2, release: 0.3 },
      lfo: { rate: 3, depth: 60, target: "filter" },
    },
  },
  {
    name: "Dream Pad",
    config: {
      osc1: { type: "triangle", detune: 0, octave: 0, level: 0.6 },
      osc2: { type: "sawtooth", detune: 0, octave: -1, level: 0.4 },
      filter: { type: "lowpass", frequency: 600, resonance: 2, envelope: 70 },
      ampEnvelope: { attack: 0.15, decay: 0.4, sustain: 0.75, release: 2.0 },
      filterEnvelope: { attack: 0.05, decay: 0.4, sustain: 0.6, release: 0.5 },
      lfo: { rate: 0.8, depth: 25, target: "pitch" },
    },
  },
  {
    name: "Acid Bass",
    config: {
      osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.85 },
      osc2: { type: "square", detune: 0, octave: -2, level: 0.2 },
      filter: { type: "lowpass", frequency: 300, resonance: 7, envelope: 80 },
      ampEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.3 },
      filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.1 },
      lfo: { rate: 5, depth: 30, target: "filter" },
    },
  },
  {
    name: "Super Saw",
    config: {
      osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.65 },
      osc2: { type: "sawtooth", detune: 14, octave: 0, level: 0.55 },
      filter: { type: "lowpass", frequency: 2500, resonance: 1.5, envelope: 50 },
      ampEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.7, release: 0.3 },
      filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.5, release: 0.2 },
      lfo: { rate: 3, depth: 8, target: "pitch" },
    },
  },
  {
    name: "Subtle Bell",
    config: {
      osc1: { type: "sine", detune: 0, octave: 0, level: 0.7 },
      osc2: { type: "triangle", detune: 19, octave: 1, level: 0.4 },
      filter: { type: "bandpass", frequency: 3000, resonance: 0.5, envelope: 30 },
      ampEnvelope: { attack: 0.001, decay: 0.5, sustain: 0.3, release: 1.5 },
      filterEnvelope: { attack: 0.001, decay: 0.5, sustain: 0.2, release: 0.5 },
      lfo: { rate: 2, depth: 5, target: "pitch" },
    },
  },
  {
    name: "Organ",
    config: {
      osc1: { type: "square", detune: 0, octave: 0, level: 0.6 },
      osc2: { type: "triangle", detune: 12, octave: 0, level: 0.5 },
      filter: { type: "lowpass", frequency: 2000, resonance: 1, envelope: 20 },
      ampEnvelope: { attack: 0.005, decay: 0.05, sustain: 0.9, release: 0.05 },
      filterEnvelope: { attack: 0.005, decay: 0.05, sustain: 0.9, release: 0.05 },
      lfo: { rate: 2, depth: 5, target: "amp" },
    },
  },
  {
    name: "808 Sub",
    config: {
      osc1: { type: "sine", detune: 0, octave: 0, level: 0.95 },
      osc2: { type: "square", detune: 0, octave: -3, level: 0.15 },
      filter: { type: "lowpass", frequency: 100, resonance: 0, envelope: 40 },
      ampEnvelope: { attack: 0.001, decay: 0.6, sustain: 0.4, release: 0.8 },
      filterEnvelope: { attack: 0.001, decay: 0.6, sustain: 0.3, release: 0.3 },
      lfo: { rate: 1, depth: 2, target: "amp" },
    },
  },
];

interface ArpConfig {
  enabled: boolean;
  direction: ArpDirection;
  rate: "1/4" | "1/8" | "1/16";
  octaves: number;
  baseNote: number;
}

interface SynthProps {
  visible: boolean;
  onClose: () => void;
  bpm: number;
  testID?: string;
}

const KEY_MAP: Record<string, number> = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66,
  g: 67, y: 68, h: 69, u: 70, j: 71, k: 72,
};

const PIANO_KEYS = [
  { note: 60, isBlack: false, label: "C3" },
  { note: 61, isBlack: true, label: "C#3" },
  { note: 62, isBlack: false, label: "D3" },
  { note: 63, isBlack: true, label: "D#3" },
  { note: 64, isBlack: false, label: "E3" },
  { note: 65, isBlack: false, label: "F3" },
  { note: 66, isBlack: true, label: "F#3" },
  { note: 67, isBlack: false, label: "G3" },
  { note: 68, isBlack: true, label: "G#3" },
  { note: 69, isBlack: false, label: "A3" },
  { note: 70, isBlack: true, label: "A#3" },
  { note: 71, isBlack: false, label: "B3" },
  { note: 72, isBlack: false, label: "C4" },
  { note: 73, isBlack: true, label: "C#4" },
  { note: 74, isBlack: false, label: "D4" },
  { note: 75, isBlack: true, label: "D#4" },
  { note: 76, isBlack: false, label: "E4" },
  { note: 77, isBlack: false, label: "F4" },
  { note: 78, isBlack: true, label: "F#4" },
  { note: 79, isBlack: false, label: "G4" },
  { note: 80, isBlack: true, label: "G#4" },
  { note: 81, isBlack: false, label: "A4" },
  { note: 82, isBlack: true, label: "A#4" },
  { note: 83, isBlack: false, label: "B4" },
  { note: 84, isBlack: false, label: "C5" },
];

function EnvelopeVisual({ attack, decay, sustain, release }: {
  attack: number; decay: number; sustain: number; release: number;
}) {
  const total = attack + decay + 0.3 + release;
  const aPct = (attack / total) * 100;
  const dPct = (decay / total) * 100;
  const sPct = 0.3 / total * 100;
  const rPct = (release / total) * 100;
  const sY = 100 - (sustain / 100) * 80;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-10" preserveAspectRatio="none">
      <polyline
        points={`0,100 ${aPct},10 ${aPct + dPct},${sY} ${aPct + dPct + sPct},${sY} ${aPct + dPct + sPct + rPct},100`}
        fill="none"
        stroke="#5ac8fa"
        strokeWidth="2"
      />
    </svg>
  );
}

function SynthSlider({ label, value, min, max, step, onChange, unit, displayValue }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; unit?: string; displayValue?: string;
}) {
  const draggingRef = useRef(false);
  const startX = useRef(0);
  const startValue = useRef(0);
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  const handlePressIn = useCallback((e: any) => {
    startX.current = e.nativeEvent.pageX;
    startValue.current = value;
    draggingRef.current = true;
  }, [value]);

  const handleMove = useCallback((e: any) => {
    if (!draggingRef.current) return;
    const dx = e.nativeEvent.pageX - startX.current;
    const range = max - min;
    const delta = (dx / 150) * range;
    const newVal = Math.max(min, Math.min(max, startValue.current + delta));
    const stepped = min + Math.round((newVal - min) / step) * step;
    onChange(stepped);
  }, [min, max, step, onChange]);

  const handleRelease = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return (
    <View className="mb-2">
      <View className="flex-row justify-between mb-0.5">
        <Text className="text-gray-400 text-[9px] font-medium">{label}</Text>
        <Text className="text-gray-500 text-[9px] font-mono">
          {displayValue ?? value}{unit ?? ""}
        </Text>
      </View>
      <Pressable
        onPressIn={handlePressIn}
        onStartShouldSetResponder={() => true}
        onResponderMove={handleMove}
        onResponderRelease={handleRelease}
        onResponderTerminate={handleRelease}
        className="h-4 bg-dark-muted rounded-full overflow-hidden"
        style={{ borderColor: draggingRef.current ? "#5ac8fa" : "transparent", borderWidth: 1 }}
      >
        <View className="h-full bg-brand-accent rounded-full" style={{ width: `${pct}%` }} />
      </Pressable>
    </View>
  );
}

function WaveformSelector({ label, value, onChange }: {
  label: string; value: WaveformType; onChange: (v: WaveformType) => void;
}) {
  const options: WaveformType[] = ["sine", "triangle", "square", "sawtooth"];
  return (
    <View className="mb-2">
      <Text className="text-gray-400 text-[9px] font-medium mb-1">{label}</Text>
      <View className="flex-row gap-1">
        {options.map((w) => (
          <Pressable
            key={w}
            onPress={() => onChange(w)}
            className={`flex-1 py-1 rounded ${value === w ? "bg-brand-accent/30 border border-brand-accent" : "bg-dark-muted border border-dark-border"}`}
          >
            <Text className={`text-[9px] text-center ${value === w ? "text-brand-accent" : "text-gray-400"}`}>
              {w === "sawtooth" ? "saw" : w}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function FilterTypeSelector({ value, onChange }: {
  value: FilterType; onChange: (v: FilterType) => void;
}) {
  const options: FilterType[] = ["lowpass", "highpass", "bandpass"];
  return (
    <View className="mb-2">
      <Text className="text-gray-400 text-[9px] font-medium mb-1">Type</Text>
      <View className="flex-row gap-1">
        {options.map((t) => (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            className={`flex-1 py-1 rounded ${value === t ? "bg-brand-accent/30 border border-brand-accent" : "bg-dark-muted border border-dark-border"}`}
          >
            <Text className={`text-[9px] text-center ${value === t ? "text-brand-accent" : "text-gray-400"}`}>
              {t === "lowpass" ? "LP" : t === "highpass" ? "HP" : "BP"}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LfoTargetSelector({ value, onChange }: {
  value: LfoTarget; onChange: (v: LfoTarget) => void;
}) {
  const options: LfoTarget[] = ["pitch", "filter", "amp"];
  return (
    <View className="flex-row gap-1 mb-2">
      {options.map((t) => (
        <Pressable
          key={t}
          onPress={() => onChange(t)}
          className={`flex-1 py-1 rounded ${value === t ? "bg-brand-accent/30 border border-brand-accent" : "bg-dark-muted border border-dark-border"}`}
        >
          <Text className={`text-[9px] text-center ${value === t ? "text-brand-accent" : "text-gray-400"}`}>
            {t}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const WHITE_KEYS = PIANO_KEYS.filter((k) => !k.isBlack);
const BLACK_KEYS = PIANO_KEYS.filter((k) => k.isBlack);
const WHITE_WIDTH = 100 / WHITE_KEYS.length;

function PianoKey({ note, isBlack, label, active, onPress, onRelease }: {
  note: number; isBlack: boolean; label: string; active: boolean;
  onPress: (n: number) => void; onRelease: (n: number) => void;
}) {
  if (isBlack) {
    const prevWhiteIdx = WHITE_KEYS.findIndex((k) => k.note === note - 1);
    const leftPos = (prevWhiteIdx + 0.65) * WHITE_WIDTH;
    return (
      <Pressable
        onPressIn={() => onPress(note)}
        onPressOut={() => onRelease(note)}
        className="absolute rounded-b"
        style={{
          left: `${leftPos}%`,
          width: `${WHITE_WIDTH * 0.6}%`,
          height: "60%",
          backgroundColor: active ? "#5ac8fa" : "#1a1a1a",
          borderColor: "#333",
          borderWidth: 1,
          zIndex: 1,
        }}
      >
        <View className="flex-1 justify-end items-center pb-1">
          <Text className="text-gray-600 text-[6px]">{label}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPressIn={() => onPress(note)}
      onPressOut={() => onRelease(note)}
      className="flex-1 rounded-b border-l border-gray-700"
      style={{
        backgroundColor: active ? "rgba(90,200,250,0.3)" : "#f5f5f5",
        height: "100%",
      }}
    >
      <View className="flex-1 justify-end items-center pb-1">
        <Text className="text-gray-400 text-[7px]">{label}</Text>
      </View>
    </Pressable>
  );
}

function MiniKeyboard({ activeNotes, onPress, onRelease }: {
  activeNotes: Set<number>;
  onPress: (n: number) => void;
  onRelease: (n: number) => void;
}) {
  return (
    <View className="h-20 mb-3">
      <View className="flex-row h-full relative">
        {WHITE_KEYS.map((k) => (
          <PianoKey
            key={k.note}
            note={k.note}
            isBlack={false}
            label={k.label}
            active={activeNotes.has(k.note)}
            onPress={onPress}
            onRelease={onRelease}
          />
        ))}
        {BLACK_KEYS.map((k) => (
          <PianoKey
            key={k.note}
            note={k.note}
            isBlack={true}
            label={k.label}
            active={activeNotes.has(k.note)}
            onPress={onPress}
            onRelease={onRelease}
          />
        ))}
      </View>
    </View>
  );
}

type TabType = "osc" | "filter" | "env" | "lfo" | "arp";

export function Synth({ visible, onClose, bpm, testID }: SynthProps) {
  const [presetIndex, setPresetIndex] = useState(0);
  const [showPresets, setShowPresets] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("osc");
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [arpConfig, setArpConfig] = useState<ArpConfig>({
    enabled: false,
    direction: "up",
    rate: "1/8",
    octaves: 1,
    baseNote: 60,
  });

  const [config, setConfig] = useState<SubtractiveSynthConfig>({ ...DEFAULT_SYNTH_CONFIG });
  const synthRef = useRef<SubtractiveSynth | null>(null);
  const arpInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const arpStep = useRef(0);
  const voiceIds = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    if (Platform.OS === "web") {
      synthRef.current = createSubtractiveSynth(config);
    }
    return () => {
      if (arpInterval.current) clearInterval(arpInterval.current);
      synthRef.current?.dispose();
      disposeSubtractiveSynthAudio();
    };
    // Only create synth once on mount; config updates are handled by separate effect
  }, []);

  useEffect(() => {
    synthRef.current?.setConfig(config);
  }, [config]);

  const updateConfig = useCallback((partial: Partial<SubtractiveSynthConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const selectPreset = useCallback((index: number) => {
    setPresetIndex(index);
    const preset = PRESETS[index];
    const newConfig = { ...DEFAULT_SYNTH_CONFIG, ...preset.config };
    setConfig(newConfig);
    setShowPresets(false);
  }, []);

  const noteOn = useCallback((note: number) => {
    if (!synthRef.current) return;
    if (voiceIds.current.has(note)) return;
    const id = synthRef.current.noteOn(note, 100);
    voiceIds.current.set(note, id);
    setActiveNotes((prev) => new Set(prev).add(note));
  }, []);

  const noteOff = useCallback((note: number) => {
    const id = voiceIds.current.get(note);
    if (id && synthRef.current) {
      synthRef.current.noteOff(id);
      voiceIds.current.delete(note);
    }
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  }, []);

  const stopArp = useCallback(() => {
    if (arpInterval.current) {
      clearInterval(arpInterval.current);
      arpInterval.current = null;
    }
  }, []);

  const startArp = useCallback(() => {
    stopArp();
    if (!arpConfig.enabled || !synthRef.current) return;

    const divisions = arpConfig.rate === "1/4" ? 1 : arpConfig.rate === "1/8" ? 2 : 4;
    const intervalMs = (60 / bpm / divisions) * 1000;
    arpStep.current = 0;

    const chordNotes = [0, 4, 7, 12];

    arpInterval.current = setInterval(() => {
      if (!synthRef.current) return;

      for (const [note] of voiceIds.current) {
        noteOff(note);
      }

      let noteIdx: number;
      if (arpConfig.direction === "up") {
        noteIdx = arpStep.current % chordNotes.length;
      } else if (arpConfig.direction === "down") {
        noteIdx = (chordNotes.length - 1 - (arpStep.current % chordNotes.length));
      } else {
        noteIdx = Math.floor(Math.random() * chordNotes.length);
      }

      const octaveOffset = Math.floor(arpStep.current / chordNotes.length) % arpConfig.octaves;
      const note = arpConfig.baseNote + chordNotes[noteIdx] + octaveOffset * 12;

      noteOn(note);
      arpStep.current++;
    }, intervalMs);
  }, [arpConfig, bpm, noteOn, noteOff, stopArp]);

  useEffect(() => {
    if (arpConfig.enabled) {
      startArp();
    } else {
      stopArp();
    }
    return () => stopArp();
  }, [arpConfig.enabled, arpConfig.rate, bpm, startArp, stopArp]);

  useEffect(() => {
    if (!visible) {
      for (const [note] of voiceIds.current) noteOff(note);
      stopArp();
    }
  }, [visible, noteOff, stopArp]);

  useEffect(() => {
    if (Platform.OS !== "web" || !visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const note = KEY_MAP[e.key.toLowerCase()];
      if (note !== undefined) {
        if (!synthRef.current) return;
        if (voiceIds.current.has(note)) return;
        const id = synthRef.current.noteOn(note, 100);
        voiceIds.current.set(note, id);
        setActiveNotes((prev) => new Set(prev).add(note));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const note = KEY_MAP[e.key.toLowerCase()];
      if (note !== undefined) {
        const id = voiceIds.current.get(note);
        if (id && synthRef.current) {
          synthRef.current.noteOff(id);
          voiceIds.current.delete(note);
        }
        setActiveNotes((prev) => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [visible]);

  const tabs: { id: TabType; label: string }[] = [
    { id: "osc", label: "OSC" },
    { id: "filter", label: "FLT" },
    { id: "env", label: "ENV" },
    { id: "lfo", label: "LFO" },
    { id: "arp", label: "ARP" },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} testID={testID}>
      <View className="flex-1 bg-black/80 justify-center items-center px-2">
        <View className="w-full max-w-lg bg-dark-surface rounded-3xl border border-dark-border p-4" style={{ maxHeight: "90%" }}>
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white text-lg font-bold">Synth</Text>
            <Pressable
              onPress={() => setShowPresets(!showPresets)}
              className="px-3 py-1 rounded-lg bg-dark-muted border border-dark-border active:opacity-70"
            >
              <Text className="text-gray-300 text-xs">{PRESETS[presetIndex].name}</Text>
            </Pressable>
          </View>

          {/* Preset picker */}
          {showPresets && (
            <ScrollView className="mb-3 p-2 bg-dark-bg rounded-xl border border-dark-border" style={{ maxHeight: 120 }}>
              <View className="flex-row flex-wrap gap-1">
                {PRESETS.map((p, i) => (
                  <Pressable
                    key={p.name}
                    onPress={() => selectPreset(i)}
                    className={`px-2 py-0.5 rounded-lg border ${i === presetIndex ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-muted border-dark-border"}`}
                  >
                    <Text className={`text-[9px] ${i === presetIndex ? "text-brand-accent" : "text-gray-300"}`}>
                      {p.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Tab selector */}
          <View className="flex-row gap-1 mb-3">
            {tabs.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setActiveTab(t.id)}
                className={`flex-1 py-1.5 rounded-lg border ${activeTab === t.id ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-muted border-dark-border"}`}
              >
                <Text className={`text-[10px] text-center font-semibold ${activeTab === t.id ? "text-brand-accent" : "text-gray-400"}`}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Tab content */}
          {activeTab === "osc" && (
            <View>
              <WaveformSelector
                label="Osc 1"
                value={config.osc1.type}
                onChange={(v) => updateConfig({ osc1: { ...config.osc1, type: v } })}
              />
              <SynthSlider label="Osc 1 Level" value={config.osc1.level} min={0} max={1} step={0.01} unit=""
                displayValue={`${Math.round(config.osc1.level * 100)}%`}
                onChange={(v) => updateConfig({ osc1: { ...config.osc1, level: v } })}
              />
              <SynthSlider label="Osc 1 Detune" value={config.osc1.detune} min={-1200} max={1200} step={1} unit="ct"
                onChange={(v) => updateConfig({ osc1: { ...config.osc1, detune: v } })}
              />

              <View className="h-px bg-dark-border my-2" />

              <WaveformSelector
                label="Osc 2"
                value={config.osc2.type}
                onChange={(v) => updateConfig({ osc2: { ...config.osc2, type: v } })}
              />
              <SynthSlider label="Osc 2 Level" value={config.osc2.level} min={0} max={1} step={0.01} unit=""
                displayValue={`${Math.round(config.osc2.level * 100)}%`}
                onChange={(v) => updateConfig({ osc2: { ...config.osc2, level: v } })}
              />
              <SynthSlider label="Osc 2 Detune" value={config.osc2.detune} min={-1200} max={1200} step={1} unit="ct"
                onChange={(v) => updateConfig({ osc2: { ...config.osc2, detune: v } })}
              />
            </View>
          )}

          {activeTab === "filter" && (
            <View>
              <FilterTypeSelector value={config.filter.type} onChange={(v) => updateConfig({ filter: { ...config.filter, type: v } })} />
              <SynthSlider label="Cutoff" value={config.filter.frequency} min={20} max={20000} step={1} unit="Hz"
                onChange={(v) => updateConfig({ filter: { ...config.filter, frequency: v } })}
              />
              <SynthSlider label="Resonance" value={config.filter.resonance} min={0} max={20} step={0.1} unit=""
                onChange={(v) => updateConfig({ filter: { ...config.filter, resonance: v } })}
              />
              <SynthSlider label="Env Amount" value={config.filter.envelope} min={0} max={100} step={1} unit=""
                onChange={(v) => updateConfig({ filter: { ...config.filter, envelope: v } })}
              />
            </View>
          )}

          {activeTab === "env" && (
            <View>
              <Text className="text-gray-400 text-[9px] font-medium mb-1">Amp Envelope</Text>
              <EnvelopeVisual {...config.ampEnvelope} />
              <SynthSlider label="Attack" value={config.ampEnvelope.attack} min={0.001} max={2} step={0.001} unit="s"
                onChange={(v) => updateConfig({ ampEnvelope: { ...config.ampEnvelope, attack: v } })}
              />
              <SynthSlider label="Decay" value={config.ampEnvelope.decay} min={0.001} max={2} step={0.001} unit="s"
                onChange={(v) => updateConfig({ ampEnvelope: { ...config.ampEnvelope, decay: v } })}
              />
              <SynthSlider label="Sustain" value={config.ampEnvelope.sustain} min={0} max={1} step={0.01} unit=""
                onChange={(v) => updateConfig({ ampEnvelope: { ...config.ampEnvelope, sustain: v } })}
              />
              <SynthSlider label="Release" value={config.ampEnvelope.release} min={0.001} max={3} step={0.001} unit="s"
                onChange={(v) => updateConfig({ ampEnvelope: { ...config.ampEnvelope, release: v } })}
              />
            </View>
          )}

          {activeTab === "lfo" && (
            <View>
              <LfoTargetSelector value={config.lfo.target} onChange={(v) => updateConfig({ lfo: { ...config.lfo, target: v } })} />
              <SynthSlider label="Rate" value={config.lfo.rate} min={0} max={20} step={0.1} unit="Hz"
                onChange={(v) => updateConfig({ lfo: { ...config.lfo, rate: v } })}
              />
              <SynthSlider label="Depth" value={config.lfo.depth} min={0} max={100} step={1} unit=""
                onChange={(v) => updateConfig({ lfo: { ...config.lfo, depth: v } })}
              />
            </View>
          )}

          {activeTab === "arp" && (
            <View>
              <View className="flex-row gap-2 mb-2">
                <Pressable
                  onPress={() => setArpConfig((p) => ({ ...p, enabled: !p.enabled }))}
                  className={`flex-1 py-1.5 rounded-lg border ${arpConfig.enabled ? "bg-brand-accent/30 border-brand-accent" : "bg-dark-muted border-dark-border"}`}
                >
                  <Text className={`text-[10px] text-center font-semibold ${arpConfig.enabled ? "text-brand-accent" : "text-gray-400"}`}>
                    {arpConfig.enabled ? "ARP ON" : "ARP OFF"}
                  </Text>
                </Pressable>
              </View>

              <Text className="text-gray-400 text-[9px] font-medium mb-1">Direction</Text>
              <View className="flex-row gap-1 mb-2">
                {(["up", "down", "random"] as ArpDirection[]).map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setArpConfig((p) => ({ ...p, direction: d }))}
                    className={`flex-1 py-1 rounded border ${arpConfig.direction === d ? "bg-brand-accent/30 border-brand-accent" : "bg-dark-muted border-dark-border"}`}
                  >
                    <Text className={`text-[9px] text-center capitalize ${arpConfig.direction === d ? "text-brand-accent" : "text-gray-400"}`}>
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="text-gray-400 text-[9px] font-medium mb-1">Rate</Text>
              <View className="flex-row gap-1 mb-2">
                {(["1/4", "1/8", "1/16"] as const).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setArpConfig((p) => ({ ...p, rate: r }))}
                    className={`flex-1 py-1 rounded border ${arpConfig.rate === r ? "bg-brand-accent/30 border-brand-accent" : "bg-dark-muted border-dark-border"}`}
                  >
                    <Text className={`text-[9px] text-center ${arpConfig.rate === r ? "text-brand-accent" : "text-gray-400"}`}>
                      {r}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <SynthSlider label="Octaves" value={arpConfig.octaves} min={1} max={4} step={1} unit=""
                onChange={(v) => setArpConfig((p) => ({ ...p, octaves: Math.round(v) }))}
              />
            </View>
          )}

          {/* Piano keyboard */}
          <View className="mt-3">
            <MiniKeyboard activeNotes={activeNotes} onPress={noteOn} onRelease={noteOff} />
            <Text className="text-gray-600 text-[8px] text-center">
              Keyboard: A W S E D F T G Y H U J K (C3–C5)
            </Text>
          </View>

          {/* Close */}
          <Pressable
            onPress={onClose}
            className="mt-3 py-3 rounded-xl border border-dark-border items-center active:opacity-70"
          >
            <Text className="text-gray-400 text-sm font-semibold">Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export const SYNTH_PRESETS = PRESETS;

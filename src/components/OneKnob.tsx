import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  type GestureResponderEvent,
} from "react-native";
import {
  computeModulation,
  type ModTarget,
} from "../lib/modulationMatrix";

interface OneKnobProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  testID?: string;
  modTarget?: ModTarget;
  modContext?: { time: number; velocity?: number; noteNumber?: number };
}

export function OneKnob({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "%",
  testID,
  modTarget,
  modContext,
}: OneKnobProps) {
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const [showValue, setShowValue] = useState(false);

  const handlePressIn = useCallback((e: GestureResponderEvent) => {
    startY.current = e.nativeEvent.pageY;
    setDragging(true);
    setShowValue(true);
  }, []);

  const handleMove = useCallback(
    (e: GestureResponderEvent) => {
      if (!dragging) return;
      const dy = startY.current - e.nativeEvent.pageY;
      const delta = Math.round(dy / 3) * step;
      const stepped = min + Math.round((value - min + delta) / step) * step;
      const clamped = Math.max(min, Math.min(max, stepped));
      if (modTarget && modContext) {
        const offset = computeModulation(modTarget, modContext) * (max - min);
        onChange(Math.max(min, Math.min(max, clamped + offset)));
      } else {
        onChange(clamped);
      }
    },
    [dragging, value, min, max, step, onChange, modTarget, modContext],
  );

  const handleRelease = useCallback(() => {
    setDragging(false);
    setShowValue(false);
  }, []);

  const range = max - min;
  const pct = range === 0 ? 0 : ((value - min) / range) * 100;

  return (
    <View testID={testID} className="items-center gap-1">
      <Text className="text-gray-400 text-[9px] font-medium">{label}</Text>
      <Pressable
        onPressIn={handlePressIn}
        onStartShouldSetResponder={() => true}
        onResponderMove={handleMove}
        onResponderRelease={handleRelease}
        className="w-12 h-12 rounded-full items-center justify-center border-2 active:opacity-80"
        style={{
          borderColor: dragging ? "#5ac8fa" : "#444",
          backgroundColor: dragging ? "rgba(90,200,250,0.15)" : "#1c1c1e",
        }}
      >
        <View
          className="absolute bottom-2 w-1 rounded-full"
          style={{
            height: `${Math.max(10, pct)}%`,
            backgroundColor: "#5ac8fa",
            opacity: 0.6 + pct / 250,
          }}
        />
        <Text className="text-white text-xs font-bold">{Math.round(pct)}</Text>
      </Pressable>
      {showValue && (
        <Text className="text-brand-accent text-[9px] font-mono">
          {value}
          {unit}
        </Text>
      )}
    </View>
  );
}

type OneKnobType =
  | "warmth"
  | "presence"
  | "bassBoost"
  | "air"
  | "room"
  | "punch"
  | "loFi"
  | "telephone";

interface OneKnobProcessorProps {
  type: OneKnobType;
  value: number;
  onChange: (type: OneKnobType, value: number) => void;
  testID?: string;
}

const KNOB_LABELS: Record<OneKnobType, string> = {
  warmth: "Warmth",
  presence: "Presence",
  bassBoost: "Bass Boost",
  air: "Air",
  room: "Room",
  punch: "Punch",
  loFi: "Lo-Fi",
  telephone: "Telephone",
};

export function OneKnobProcessor({
  type,
  value,
  onChange,
  testID,
}: OneKnobProcessorProps) {
  return (
    <OneKnob
      testID={testID}
      label={KNOB_LABELS[type]}
      value={value}
      onChange={(v) => onChange(type, v)}
      min={0}
      max={100}
    />
  );
}

export const ONE_KNOB_TYPES: OneKnobType[] = [
  "warmth",
  "presence",
  "bassBoost",
  "air",
  "room",
  "punch",
  "loFi",
  "telephone",
];

export const KNOB_PRESETS: Record<string, Record<OneKnobType, number>> = {
  Natural: {
    warmth: 30,
    presence: 40,
    bassBoost: 20,
    air: 20,
    room: 15,
    punch: 25,
    loFi: 0,
    telephone: 0,
  },
  Warm: {
    warmth: 70,
    presence: 30,
    bassBoost: 40,
    air: 10,
    room: 20,
    punch: 30,
    loFi: 0,
    telephone: 0,
  },
  Bright: {
    warmth: 20,
    presence: 75,
    bassBoost: 10,
    air: 60,
    room: 10,
    punch: 20,
    loFi: 0,
    telephone: 0,
  },
  Bassy: {
    warmth: 60,
    presence: 25,
    bassBoost: 80,
    air: 15,
    room: 15,
    punch: 40,
    loFi: 0,
    telephone: 0,
  },
  Loud: {
    warmth: 40,
    presence: 55,
    bassBoost: 30,
    air: 35,
    room: 25,
    punch: 70,
    loFi: 0,
    telephone: 0,
  },
  "Lo-Fi": {
    warmth: 50,
    presence: 20,
    bassBoost: 30,
    air: 5,
    room: 10,
    punch: 20,
    loFi: 70,
    telephone: 0,
  },
  Telephone: {
    warmth: 10,
    presence: 10,
    bassBoost: 0,
    air: 0,
    room: 5,
    punch: 5,
    loFi: 0,
    telephone: 80,
  },
  Room: {
    warmth: 30,
    presence: 35,
    bassBoost: 20,
    air: 25,
    room: 70,
    punch: 30,
    loFi: 0,
    telephone: 0,
  },
};

// ---------------------------------------------------------------------------
// One-Knob Simplifiers — each type maps to a preset chain of EQ + compressor
// + reverb settings. The knob value (0-1) controls intensity.
// ---------------------------------------------------------------------------

export interface OneKnobEffectChain {
  eqBands: {
    freq: number;
    gain: number; // dB, interpolated from 0 at knob=0
    q: number;
    type: number; // 0=LC, 1=LS, 2=PK, 3=NT, 4=HS, 5=HC
    enabled: number; // 0 or 1
  }[];
  compressor: {
    threshold: number; // dB
    ratio: number;
    attack: number; // ms
    release: number; // ms
    makeupGain: number; // dB
  } | null;
  reverb: {
    mix: number; // 0-100
    decay: number; // seconds
    damping: number; // 0-100
    size: number; // 0-100
    preDelay: number; // ms
  } | null;
  lowpassFreq: number | null; // Hz, for Lo-Fi / Telephone
  highpassFreq: number | null; // Hz, for Telephone
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Returns the effect-chain parameters for a given knob type and intensity (0-1).
 */
export function getOneKnobChain(type: OneKnobType, value: number): OneKnobEffectChain {
  const t = Math.max(0, Math.min(1, value));

  switch (type) {
    case "warmth": {
      const gain = lerp(0, 2, t);
      return {
        eqBands: [
          { freq: 200, gain, q: 0.71, type: 1, enabled: t > 0 ? 1 : 0 },
        ],
        compressor:
          t > 0
            ? { threshold: -18, ratio: lerp(1, 2, t), attack: 3, release: 150, makeupGain: 0 }
            : null,
        reverb: null,
        lowpassFreq: null,
        highpassFreq: null,
      };
    }

    case "presence": {
      const gain = lerp(0, 3, t);
      return {
        eqBands: [
          { freq: 4000, gain, q: 1.2, type: 2, enabled: t > 0 ? 1 : 0 },
        ],
        compressor: null,
        reverb: null,
        lowpassFreq: null,
        highpassFreq: null,
      };
    }

    case "bassBoost": {
      const gain = lerp(0, 6, t);
      return {
        eqBands: [
          { freq: 80, gain, q: 0.71, type: 1, enabled: t > 0 ? 1 : 0 },
        ],
        compressor: null,
        reverb: null,
        lowpassFreq: null,
        highpassFreq: null,
      };
    }

    case "air": {
      const gain = lerp(0, 3, t);
      return {
        eqBands: [
          { freq: 12000, gain, q: 0.71, type: 4, enabled: t > 0 ? 1 : 0 },
        ],
        compressor: null,
        reverb: null,
        lowpassFreq: null,
        highpassFreq: null,
      };
    }

    case "room": {
      const mix = lerp(0, 40, t);
      const decay = lerp(0.3, 1.5, t);
      return {
        eqBands: [],
        compressor: null,
        reverb: {
          mix,
          decay,
          damping: 40,
          size: lerp(10, 60, t),
          preDelay: 10,
        },
        lowpassFreq: null,
        highpassFreq: null,
      };
    }

    case "punch": {
      const ratio = lerp(1, 4, t);
      const makeup = lerp(0, 3, t);
      return {
        eqBands: [],
        compressor: {
          threshold: -24,
          ratio,
          attack: 10,
          release: 100,
          makeupGain: makeup,
        },
        reverb: null,
        lowpassFreq: null,
        highpassFreq: null,
      };
    }

    case "loFi": {
      const lpFreq = lerp(20000, 4000, t);
      const reverbMix = lerp(0, 20, t);
      return {
        eqBands: [
          { freq: lpFreq, gain: 0, q: 0.71, type: 5, enabled: t > 0 ? 1 : 0 },
        ],
        compressor:
          t > 0
            ? { threshold: -12, ratio: 2, attack: 5, release: 80, makeupGain: 2 }
            : null,
        reverb: {
          mix: reverbMix,
          decay: 0.8,
          damping: 60,
          size: 20,
          preDelay: 0,
        },
        lowpassFreq: Math.round(lpFreq),
        highpassFreq: null,
      };
    }

    case "telephone": {
      const hpFreq = lerp(20, 300, t);
      const lpFreq = lerp(20000, 3000, t);
      return {
        eqBands: [
          { freq: hpFreq, gain: 0, q: 0.71, type: 0, enabled: t > 0 ? 1 : 0 },
          { freq: lpFreq, gain: 0, q: 0.71, type: 5, enabled: t > 0 ? 1 : 0 },
        ],
        compressor: null,
        reverb: null,
        lowpassFreq: t > 0 ? Math.round(lpFreq) : null,
        highpassFreq: t > 0 ? Math.round(hpFreq) : null,
      };
    }

    default: {
      return {
        eqBands: [],
        compressor: null,
        reverb: null,
        lowpassFreq: null,
        highpassFreq: null,
      };
    }
  }
}

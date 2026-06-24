import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  type GestureResponderEvent,
} from "react-native";

interface OneKnobProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  testID?: string;
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
      onChange(Math.max(min, Math.min(max, stepped)));
    },
    [dragging, value, min, max, step, onChange],
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

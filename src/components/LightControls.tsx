import { useState, useImperativeHandle, forwardRef } from "react";
import { View, Text, Pressable } from "react-native";

const PRESETS = [
  { color: 0xffffff, label: "White" },
  { color: 0xff0000, label: "Red" },
  { color: 0x00ff00, label: "Green" },
  { color: 0x0000ff, label: "Blue" },
  { color: 0xffff00, label: "Yellow" },
  { color: 0xff00ff, label: "Magenta" },
  { color: 0x00ffff, label: "Cyan" },
  { color: 0xff6600, label: "Orange" },
];

export interface LightControlHandle {
  color: number;
  intensity: number;
}

interface LightControlsProps {
  defaultColor?: number;
  defaultIntensity?: number;
}

const LightControls = forwardRef<LightControlHandle, LightControlsProps>(
  ({ defaultColor = 0xffffff, defaultIntensity = 6 }, ref) => {
    const [color, setColor] = useState(defaultColor);
    const [intensity, setIntensity] = useState(defaultIntensity);
    const [open, setOpen] = useState(false);

    useImperativeHandle(ref, () => ({ color, intensity }), [color, intensity]);

    return (
      <View className="absolute bottom-20 right-4 z-50">
        <Pressable
          onPress={() => setOpen(!open)}
          className="w-11 h-11 rounded-full bg-dark-surface/90 border border-dark-border items-center justify-center pressable-scale"
        >
          <Text className="text-base">💡</Text>
        </Pressable>
        {open && (
          <View className="absolute bottom-12 right-0 bg-dark-surface/95 backdrop-blur-md rounded-xl p-3 border border-dark-border min-w-[200px]">
            <Text className="text-white text-xs font-bold mb-2">RGB LIGHTS</Text>
            <View className="flex-row flex-wrap gap-1.5 mb-3">
              {PRESETS.map((p) => {
                const active = color === p.color;
                return (
                  <Pressable
                    key={p.label}
                    onPress={() => setColor(p.color)}
                    className="w-9 h-9 rounded-full items-center justify-center pressable-scale"
                    style={{
                      backgroundColor: `#${p.color.toString(16).padStart(6, "0")}`,
                      borderWidth: active ? 2 : 0,
                      borderColor: "#fff",
                    }}
                  >
                    {active && <Text className="text-[8px] text-black font-bold">✓</Text>}
                  </Pressable>
                );
              })}
            </View>
            <Text className="text-white text-xs font-bold mb-1">BRIGHTNESS</Text>
            <View className="flex-row gap-1 mb-2">
              {[2, 4, 6, 8, 10].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setIntensity(v)}
                  className={`flex-1 py-2 rounded items-center transition-colors duration-normal pressable-scale ${Math.round(intensity) === v ? "bg-white/20" : "bg-dark-muted/40"}`}
                >
                  <Text className={`text-xs ${Math.round(intensity) === v ? "text-white" : "text-gray-400"}`}>{v}</Text>
                </Pressable>
              ))}
            </View>
            <Text className="text-white text-xs font-bold mb-1">MULTIPLIER</Text>
            <View className="flex-row gap-1">
              {[
                { label: "×2", factor: 2 },
                { label: "×4", factor: 4 },
              ].map(({ label, factor }) => (
                <Pressable
                  key={label}
                  onPress={() => setIntensity((p) => Math.min(p * factor, 40))}
                  className="flex-1 py-2 rounded items-center bg-accent/20 border border-accent/40 pressable-scale"
                >
                  <Text className="text-xs text-accent font-bold">{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }
);

export default LightControls;

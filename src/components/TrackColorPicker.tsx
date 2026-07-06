import { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";

const PRESET_COLORS = [
  { label: "Blue", tw: "bg-blue-500", hex: "#3b82f6" },
  { label: "Green", tw: "bg-green-500", hex: "#22c55e" },
  { label: "Purple", tw: "bg-purple-500", hex: "#a855f7" },
  { label: "Red", tw: "bg-red-500", hex: "#ef4444" },
  { label: "Amber", tw: "bg-amber-500", hex: "#f59e0b" },
  { label: "Cyan", tw: "bg-cyan-500", hex: "#06b6d4" },
  { label: "Pink", tw: "bg-pink-500", hex: "#ec4899" },
  { label: "Indigo", tw: "bg-indigo-500", hex: "#6366f1" },
  { label: "Teal", tw: "bg-teal-500", hex: "#14b8a6" },
  { label: "Orange", tw: "bg-orange-500", hex: "#f97316" },
  { label: "Lime", tw: "bg-lime-500", hex: "#84cc16" },
  { label: "Rose", tw: "bg-rose-500", hex: "#f43f5e" },
];

export interface TrackColorPickerProps {
  visible: boolean;
  currentColor: string;
  onSelect: (color: string) => void;
  onClose: () => void;
  onCustomColor?: (hex: string) => void;
}

export function TrackColorPicker({
  visible,
  currentColor,
  onSelect,
  onClose,
  onCustomColor,
}: TrackColorPickerProps) {
  const [customHex, setCustomHex] = useState("#3b82f6");

  if (!visible) return null;

  const handleCustomChange = (hex: string) => {
    setCustomHex(hex);
    onCustomColor?.(hex);
  };

  return (
    <View
      className="absolute bottom-full mb-2 left-0 z-50 bg-dark-elevated border border-dark-border rounded-xl p-2 shadow-lg"
      style={{ width: 200 }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
          Track Color
        </Text>
        <Pressable
          onPress={onClose}
          className="w-8 h-8 items-center justify-center pressable-scale"
        >
          <Text className="text-gray-500 text-xs">✕</Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-1.5">
        {PRESET_COLORS.map((c) => (
          <Pressable
            key={c.tw}
            onPress={() => {
              onSelect(c.tw);
              onClose();
            }}
            className={`w-9 h-9 rounded-md transition-transform duration-normal pressable-scale ${c.tw} ${
              currentColor === c.tw ? "ring-2 ring-white ring-offset-2 ring-offset-dark-elevated" : ""
            }`}
          />
        ))}
      </View>

      {Platform.OS === "web" && onCustomColor && (
        <View className="mt-2 pt-2 border-t border-dark-border">
          <View className="flex-row items-center gap-2">
            <Text className="text-gray-500 text-[10px] font-medium">
              Custom
            </Text>
            {/* eslint-disable-next-line react-native/no-inline-styles */}
            <input
              type="color"
              value={customHex}
              onChange={(e) => handleCustomChange(e.target.value)}
              style={{
                width: 28,
                height: 28,
                border: "none",
                cursor: "pointer",
                borderRadius: 4,
              }}
            />
            <Pressable
              onPress={() => {
                onSelect(customHex);
                onClose();
              }}
              className="flex-1 h-9 rounded-md bg-brand-primary/20 border border-brand-primary/40 items-center justify-center pressable-scale"
            >
              <Text className="text-brand-accent text-[10px] font-bold">
                Apply
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

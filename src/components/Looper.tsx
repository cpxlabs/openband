import { useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, Modal } from "react-native";

interface LoopSlot {
  id: number;
  bars: number;
  recording: boolean;
  hasContent: boolean;
  layers: number;
}

interface LooperProps {
  visible: boolean;
  onClose: () => void;
  bpm: number;
  onCommitLoop: (slot: number, bars: number) => void;
  testID?: string;
}

const SLOT_COLORS = ["#ff6482", "#5ac8fa", "#34c759", "#ff9f0a"];
const BAR_OPTIONS = [1, 2, 4, 8];

export function Looper({
  visible,
  onClose,
  bpm,
  onCommitLoop,
  testID,
}: LooperProps) {
  const [slots, setSlots] = useState<LoopSlot[]>(
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      bars: 4,
      recording: false,
      hasContent: false,
      layers: 0,
    })),
  );
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const toggleRecord = useCallback(
    (slotId: number) => {
      setSlots((prev) =>
        prev.map((s) => {
          if (s.id !== slotId) return s;
          if (s.recording) {
            onCommitLoop(slotId, s.bars);
            return {
              ...s,
              recording: false,
              hasContent: true,
              layers: s.layers + 1,
            };
          }
          return { ...s, recording: true };
        }),
      );
      setActiveSlot(slotId);
    },
    [onCommitLoop],
  );

  const setBars = useCallback((slotId: number, bars: number) => {
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, bars } : s)));
  }, []);

  const clearSlot = useCallback(
    (slotId: number) => {
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, hasContent: false, layers: 0, recording: false }
            : s,
        ),
      );
      if (activeSlot === slotId) setActiveSlot(null);
    },
    [activeSlot],
  );

  const beatDuration = useMemo(() => 60 / bpm, [bpm]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <View className="flex-1 bg-black/80 justify-center items-center px-4">
        <View className="w-full max-w-sm bg-dark-surface rounded-3xl border border-dark-border p-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-bold">Looper</Text>
            <Text className="text-gray-400 text-xs">
              {bpm} BPM · {beatDuration.toFixed(2)}s/beat
            </Text>
          </View>

          {slots.map((slot) => (
            <View
              key={slot.id}
              className="rounded-2xl border p-3 mb-3"
              style={{
                borderColor: slot.recording
                  ? "#ff375f"
                  : activeSlot === slot.id
                    ? SLOT_COLORS[slot.id]
                    : "#333",
                backgroundColor: slot.recording
                  ? "rgba(255,55,95,0.1)"
                  : "rgba(255,255,255,0.03)",
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <View
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: SLOT_COLORS[slot.id] }}
                  />
                  <Text className="text-white text-sm font-semibold">
                    Loop {slot.id + 1}
                  </Text>
                  {slot.hasContent && (
                    <View className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30">
                      <Text className="text-green-400 text-[9px]">
                        {slot.layers} layer{slot.layers > 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </View>
                {slot.recording && (
                  <View className="flex-row items-center gap-1">
                    <View className="w-2 h-2 rounded-full bg-red-500" />
                    <Text className="text-red-400 text-[10px] font-semibold">
                      REC
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-center gap-2 mb-2">
                <Text className="text-gray-500 text-[10px] w-8">Bars:</Text>
                <View className="flex-row gap-1">
                  {BAR_OPTIONS.map((b) => (
                    <Pressable
                      key={b}
                      onPress={() => setBars(slot.id, b)}
                      className={`px-3 py-1.5 rounded-lg border transition-colors duration-normal pressable-scale ${slot.bars === b ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-muted/30 border-dark-border"}`}
                    >
                      <Text
                        className={`text-[10px] ${slot.bars === b ? "text-brand-accent" : "text-gray-400"}`}
                      >
                        {b}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => toggleRecord(slot.id)}
                  className="flex-1 py-2.5 rounded-xl items-center transition-all duration-normal pressable-scale"
                  style={{
                    backgroundColor: slot.recording ? "#ff375f" : "#1c1c1e",
                  }}
                >
                  <Text className="text-white text-xs font-bold">
                    {slot.recording
                      ? "Stop"
                      : slot.hasContent
                        ? "Overdub"
                        : "Record"}
                  </Text>
                </Pressable>
                {slot.hasContent && (
                  <Pressable
                    onPress={() => clearSlot(slot.id)}
                    className="px-4 py-2.5 rounded-xl bg-dark-muted items-center pressable-scale"
                  >
                    <Text className="text-gray-400 text-xs">Clear</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}

          <Pressable
            onPress={onClose}
            className="mt-2 py-3 rounded-xl border border-dark-border items-center pressable-scale"
          >
            <Text className="text-gray-400 text-sm font-semibold">Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

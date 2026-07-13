import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import {
  listMidiInputs,
  learnCC,
  bindMidi,
  unbindMidi,
  getBindings,
  applyMcuPreset,
} from "../../src/lib/midiLearn";
import type { MidiTarget, MidiBinding } from "../../src/lib/midiLearn";
import type { TrackDef } from "../../src/lib/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  tracks: TrackDef[];
}

const TRANSPORT_ACTIONS: MidiTarget["action"][] = [
  "togglePlay",
  "stop",
  "record",
  "loop",
  "scrub",
];

function describeTarget(target: MidiTarget): string {
  switch (target.type) {
    case "trackVolume":
      return `Track ${((target.trackIndex ?? -1) + 1)} Volume`;
    case "trackPan":
      return `Track ${((target.trackIndex ?? -1) + 1)} Pan`;
    case "masterVolume":
      return "Master Volume";
    case "transport":
      return `Transport: ${target.action}`;
    case "pluginParam":
      return `Plugin: ${target.paramId ?? "?"}`;
  }
}

export function MidiLearnPanel({ visible, onClose, tracks }: Props) {
  const [inputs, setInputs] = useState<{ id: string; name: string }[]>([]);
  const [targetType, setTargetType] = useState<MidiTarget["type"]>("trackVolume");
  const [trackIndex, setTrackIndex] = useState(0);
  const [action, setAction] = useState<MidiTarget["action"]>("togglePlay");
  const [learning, setLearning] = useState(false);
  const [bindings, setBindings] = useState<{ key: string; binding: MidiBinding }[]>([]);

  const refresh = useCallback(() => {
    setBindings(getBindings());
  }, []);

  useEffect(() => {
    if (!visible) return;
    listMidiInputs().then(setInputs).catch(() => setInputs([]));
    refresh();
  }, [visible, refresh]);

  useEffect(() => {
    if (!learning) return;
    const stop = learnCC((cc, channel) => {
      const target: MidiTarget =
        targetType === "transport"
          ? { type: "transport", action }
          : targetType === "trackPan"
            ? { type: "trackPan", trackIndex }
            : targetType === "masterVolume"
              ? { type: "masterVolume" }
              : targetType === "pluginParam"
                ? { type: "pluginParam", paramId: "autoPitch" }
                : { type: "trackVolume", trackIndex };
      bindMidi(target, cc, channel);
      setLearning(false);
      refresh();
    });
    return stop;
  }, [learning, targetType, trackIndex, action, refresh]);

  if (!visible) return null;

  const targetTypes: MidiTarget["type"][] = [
    "trackVolume",
    "trackPan",
    "masterVolume",
    "transport",
    "pluginParam",
  ];

  return (
    <View className="absolute inset-0 z-[70] flex-1 justify-center items-center bg-black/70">
      <View className="w-[92%] max-w-[460px] max-h-[85%] bg-dark-surface rounded-2xl border border-brand-primary/40 p-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white font-bold text-base">MIDI Learn</Text>
          <Pressable
            onPress={onClose}
            className="w-7 h-7 rounded-full bg-dark-muted/30 items-center justify-center active:opacity-70"
          >
            <Text className="text-gray-400 text-sm">✕</Text>
          </Pressable>
        </View>

        <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
          MIDI Input
        </Text>
        {inputs.length === 0 ? (
          <Text className="text-gray-500 text-xs mb-2">
            MIDI not available — Web MIDI requires a browser with controller access.
          </Text>
        ) : (
          <ScrollView horizontal className="mb-2" showsHorizontalScrollIndicator={false}>
            {inputs.map((inp) => (
              <View key={inp.id} className="mr-2 px-2 py-1 rounded bg-dark-muted/40 border border-dark-border">
                <Text className="text-gray-300 text-[10px]">{inp.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
          Bind To
        </Text>
        <ScrollView horizontal className="mb-2" showsHorizontalScrollIndicator={false}>
          {targetTypes.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTargetType(t)}
              className={`mr-1.5 px-2.5 py-1 rounded-lg border ${targetType === t ? "bg-brand-accent/20 border-brand-accent/50" : "bg-dark-muted/30 border-dark-border/40"}`}
            >
              <Text className={`text-[10px] ${targetType === t ? "text-brand-accent" : "text-gray-400"}`}>
                {t}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {(targetType === "trackVolume" || targetType === "trackPan") && (
          <ScrollView horizontal className="mb-2" showsHorizontalScrollIndicator={false}>
            {tracks.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => setTrackIndex(i)}
                className={`mr-1.5 px-2 py-1 rounded-lg border ${trackIndex === i ? "bg-brand-primary/20 border-brand-primary/50" : "bg-dark-muted/30 border-dark-border/40"}`}
              >
                <Text className={`text-[10px] ${trackIndex === i ? "text-brand-primary" : "text-gray-400"}`}>
                  {i + 1}. {t.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {targetType === "transport" && (
          <ScrollView horizontal className="mb-2" showsHorizontalScrollIndicator={false}>
            {TRANSPORT_ACTIONS.map((a) => (
              <Pressable
                key={a}
                onPress={() => setAction(a)}
                className={`mr-1.5 px-2 py-1 rounded-lg border ${action === a ? "bg-brand-accent/20 border-brand-accent/50" : "bg-dark-muted/30 border-dark-border/40"}`}
              >
                <Text className={`text-[10px] ${action === a ? "text-brand-accent" : "text-gray-400"}`}>
                  {a}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View className="flex-row gap-2 mb-3">
          <Pressable
            onPress={() => setLearning(true)}
            className={`flex-1 py-2.5 rounded-xl active:opacity-80 ${learning ? "bg-amber-500/30 border border-amber-400" : "bg-brand-primary"}`}
          >
            <Text className="text-white font-bold text-sm text-center">
              {learning ? "Move a control…" : "🎹 Learn"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              applyMcuPreset();
              refresh();
            }}
            className="flex-1 py-2.5 rounded-xl bg-brand-accent/20 border border-brand-accent/40 active:opacity-80"
          >
            <Text className="text-brand-accent font-bold text-sm text-center">
              Apply MCU Preset
            </Text>
          </Pressable>
        </View>

        <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
          Bindings ({bindings.length})
        </Text>
        <ScrollView className="max-h-40" showsVerticalScrollIndicator={false}>
          {bindings.length === 0 ? (
            <Text className="text-gray-600 text-xs py-2">No bindings yet.</Text>
          ) : (
            bindings.map((b) => (
              <View
                key={b.key}
                className="flex-row items-center justify-between py-1.5 px-2 rounded bg-dark-muted/20 border border-dark-border/40 mb-1"
              >
                <Text className="text-gray-300 text-[11px] flex-1" numberOfLines={1}>
                  {describeTarget(b.binding.target)} · {b.binding.kind} ch{b.binding.channel} #{b.binding.cc}
                </Text>
                <Pressable
                  onPress={() => {
                    unbindMidi(b.key);
                    refresh();
                  }}
                  className="w-6 h-6 rounded bg-red-500/20 items-center justify-center active:opacity-70"
                >
                  <Text className="text-red-400 text-xs">×</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

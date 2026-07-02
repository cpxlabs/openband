import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, Pressable, Modal, Platform } from "react-native";
import type { SamplerSlotData } from "../lib/types";
import { audioBufferToWavBlob } from "../lib/audio";
import {
  detectTransients,
  sliceAudioBuffer,
  type Transient,
} from "../lib/transientDetection";
import { getSharedAudioContext, createTrackedBlob } from "../lib/universalAudio";

interface SampleSlot {
  key: string;
  name: string;
  data: AudioBuffer | null;
  rootKey: number;
  lowKey: number;
  highKey: number;
}

interface ADSR {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

interface SamplerProps {
  visible: boolean;
  onClose: () => void;
  testID?: string;
  onAddToTrack?: (name: string, data: SamplerSlotData[]) => void;
}

const DRUM_PADS = [
  { key: "C2", label: "Kick", color: "#ff6482" },
  { key: "D2", label: "Snare", color: "#ff9f0a" },
  { key: "E2", label: "Hi-Hat", color: "#5ac8fa" },
  { key: "F2", label: "Open HH", color: "#34c759" },
  { key: "G2", label: "Clap", color: "#bf5af2" },
  { key: "A2", label: "Tom Low", color: "#ff375f" },
  { key: "B2", label: "Tom Mid", color: "#00d4aa" },
  { key: "C3", label: "Tom High", color: "#64d2ff" },
  { key: "D3", label: "Crash", color: "#ffcc00" },
  { key: "E3", label: "Ride", color: "#30d158" },
  { key: "F3", label: "Shaker", color: "#aeaeb2" },
  { key: "G3", label: "Tambourine", color: "#ff453a" },
  { key: "A3", label: "Claves", color: "#bf5af2" },
  { key: "B3", label: "Cowbell", color: "#ff9f0a" },
  { key: "C4", label: "Vocal Chop", color: "#5ac8fa" },
  { key: "D4", label: "FX", color: "#34c759" },
];

export function Sampler({
  visible,
  onClose,
  onAddToTrack,
  testID,
}: SamplerProps) {
  const [mode, setMode] = useState<"drum" | "melodic" | "slice">("drum");
  const [slots, setSlots] = useState<SampleSlot[]>(
    DRUM_PADS.map((p, i) => ({
      key: p.key,
      name: p.label,
      data: null,
      rootKey: 36 + i,
      lowKey: 36 + i,
      highKey: 36 + i,
    })),
  );
  const [adsr, setAdsr] = useState<ADSR>({
    attack: 10,
    decay: 200,
    sustain: 70,
    release: 300,
  });
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  const [velocity, setVelocity] = useState(100);
  const [sliceSource, setSliceSource] = useState<AudioBuffer | null>(null);
  const [slicePoints, setSlicePoints] = useState<number[]>([]);
  const [sliceThreshold, setSliceThreshold] = useState(0.3);
  const [sliceTransients, setSliceTransients] = useState<Transient[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioCtxRef.current = getSharedAudioContext();
  }, []);

  const getAudioContext = useCallback(() => {
    if (Platform.OS !== "web") return null;
    const ctx = audioCtxRef.current || getSharedAudioContext();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }, []);

  const handleLoadSample = useCallback(
    async (slotIndex: number) => {
      if (Platform.OS !== "web") return;
      setLoadingSlot(slotIndex);
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".wav,.mp3,.aiff,.flac,.ogg";
      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          setLoadingSlot(null);
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          setLoadingSlot(null);
          return;
        }
        if (
          !file.type.startsWith("audio/") &&
          !file.name.match(/\.(wav|mp3|aiff|flac|ogg)$/i)
        ) {
          setLoadingSlot(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const result = ev.target?.result;
          if (!result) {
            setLoadingSlot(null);
            return;
          }
          try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const buffer = await ctx.decodeAudioData(result as ArrayBuffer);
            setSlots((prev) =>
              prev.map((s, i) =>
                i === slotIndex
                  ? {
                      ...s,
                      data: buffer,
                      name: file.name.replace(/\.[^/.]+$/, ""),
                    }
                  : s,
              ),
            );
          } catch (e) {
            console.warn("Failed to decode audio:", e);
          }
          setLoadingSlot(null);
        };
        reader.readAsArrayBuffer(file);
      };
      input.click();
    },
    [getAudioContext],
  );

  const previewSample = useCallback(
    (slotIndex: number, noteNumber?: number) => {
      if (Platform.OS !== "web") return;
      const slot = slots[slotIndex];
      if (!slot.data) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const source = ctx.createBufferSource();
        source.buffer = slot.data;

        // Pitch shift for melodic mode
        if (mode === "melodic" && noteNumber !== undefined) {
          const semitones = noteNumber - slot.rootKey;
          source.playbackRate.value = Math.pow(2, semitones / 12);
        }

        const gainNode = ctx.createGain();
        const vol = velocity / 127;
        const now = ctx.currentTime;
        const a = adsr.attack / 1000;
        const d = adsr.decay / 1000;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(vol, now + a);
        gainNode.gain.linearRampToValueAtTime(vol * (adsr.sustain / 100), now + a + d);
        gainNode.gain.setValueAtTime(
          vol * (adsr.sustain / 100),
          now + slot.data.duration - adsr.release / 1000,
        );
        gainNode.gain.linearRampToValueAtTime(0, now + slot.data.duration);

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(now);
      } catch (e) {
        console.warn("Failed to preview sample:", e);
      }
    },
    [slots, adsr, velocity, mode, getAudioContext],
  );

  const handleSliceLoad = useCallback(() => {
    if (Platform.OS !== "web") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".wav,.mp3,.aiff,.flac,.ogg";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const result = ev.target?.result;
        if (!result) return;
        try {
          const ctx = getAudioContext();
          if (!ctx) return;
          const buffer = await ctx.decodeAudioData(result as ArrayBuffer);
          setSliceSource(buffer);
          setSlicePoints([]);
        } catch (e) {
          console.warn("Failed to decode audio for slicing:", e);
        }
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  }, [getAudioContext]);

  const runAutoSlice = useCallback(() => {
    if (!sliceSource) return;
    const transients = detectTransients(sliceSource, sliceThreshold);
    setSliceTransients(transients);
    setSlicePoints(transients.map((t) => t.time));
  }, [sliceSource, sliceThreshold]);

  const handleSliceToPads = useCallback(() => {
    if (!sliceSource || slicePoints.length === 0) return;
    const slices = sliceAudioBuffer(sliceSource, slicePoints);
    const newSlots = DRUM_PADS.map((p, i) => {
      const slice = slices[i];
      if (!slice) {
        return {
          key: p.key,
          name: p.label,
          data: null,
          rootKey: 36 + i,
          lowKey: 36 + i,
          highKey: 36 + i,
        };
      }
      return {
        key: p.key,
        name: `Slice ${i + 1}`,
        data: slice,
        rootKey: 36 + i,
        lowKey: 36 + i,
        highKey: 36 + i,
      };
    });
    setSlots(newSlots);
    setMode("drum");
  }, [sliceSource, slicePoints]);

  const toggleSlicePoint = useCallback(
    (time: number) => {
      setSlicePoints((prev) => {
        const exists = prev.find((p) => Math.abs(p - time) < 0.01);
        if (exists) return prev.filter((p) => Math.abs(p - time) >= 0.01);
        return [...prev, time].sort((a, b) => a - b);
      });
    },
    [],
  );

  const handleAddToTrack = useCallback(() => {
    const loadedSlots = slots.filter(
      (s): s is SampleSlot & { data: AudioBuffer } => s.data !== null,
    );
    if (loadedSlots.length === 0) return;
    const sampleData: SamplerSlotData[] = loadedSlots.map((slot) => {
      let url = "";
      if (Platform.OS === "web") {
        const blob = audioBufferToWavBlob(slot.data);
        url = createTrackedBlob(blob);
      }
      return {
        key: slot.key,
        name: slot.name,
        url,
        rootKey: slot.rootKey,
        lowKey: slot.lowKey,
        highKey: slot.highKey,
      };
    });
    onAddToTrack?.(mode === "drum" ? "Drum Rack" : "Sampler", sampleData);
    onClose();
  }, [slots, mode, onAddToTrack, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <View className="flex-1 bg-black/80 justify-center items-center px-2">
        <View
          className="w-full max-w-lg bg-dark-surface rounded-3xl border border-dark-border p-4"
          style={{ maxHeight: "90%" }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white text-lg font-bold">Sampler</Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setMode("drum")}
                className={`px-3 py-1 rounded-lg border ${mode === "drum" ? "bg-brand-accent/20 border-brand-accent" : "border-dark-border"}`}
              >
                <Text
                  className={`text-xs ${mode === "drum" ? "text-brand-accent" : "text-gray-400"}`}
                >
                  Drum Rack
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("melodic")}
                className={`px-3 py-1 rounded-lg border ${mode === "melodic" ? "bg-brand-accent/20 border-brand-accent" : "border-dark-border"}`}
              >
                <Text
                  className={`text-xs ${mode === "melodic" ? "text-brand-accent" : "text-gray-400"}`}
                >
                  Melodic
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("slice")}
                className={`px-3 py-1 rounded-lg border ${mode === "slice" ? "bg-brand-accent/20 border-brand-accent" : "border-dark-border"}`}
              >
                <Text
                  className={`text-xs ${mode === "slice" ? "text-brand-accent" : "text-gray-400"}`}
                >
                  Slice
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {slots.map((slot, i) => (
              <Pressable
                key={slot.key}
                onPress={() => {
                  setSelectedSlot(i);
                  if (slot.data) previewSample(i);
                }}
                onLongPress={() => handleLoadSample(i)}
                className="rounded-xl p-2 border items-center justify-center"
                style={{
                  width: "23%",
                  aspectRatio: 1,
                  borderColor: selectedSlot === i ? DRUM_PADS[i].color : "#333",
                  backgroundColor: slot.data
                    ? "rgba(90,200,250,0.1)"
                    : loadingSlot === i
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,0.03)",
                }}
              >
                <Text className="text-[9px] text-gray-300 font-semibold">
                  {slot.name}
                </Text>
                <Text className="text-[8px] text-gray-600 mt-0.5">
                  {slot.key}
                </Text>
                <Text className="text-[7px] text-gray-600 mt-0.5">
                  {slot.data ? "✓" : loadingSlot === i ? "..." : "+"}
                </Text>
              </Pressable>
            ))}
          </View>

          {selectedSlot !== null && (
            <View className="bg-dark-bg rounded-xl p-3 border border-dark-border mb-3">
              <Text className="text-gray-300 text-xs font-semibold mb-2">
                ADSR Envelope
              </Text>
              <View className="flex-row gap-2">
                {(
                  ["attack", "decay", "sustain", "release"] as (keyof ADSR)[]
                ).map((param) => (
                  <View key={param} className="flex-1 items-center">
                    <Text className="text-gray-500 text-[8px] mb-1">
                      {param[0].toUpperCase()}
                    </Text>
                    <View className="w-full h-12 bg-dark-surface rounded-lg relative overflow-hidden justify-end">
                      <View
                        className="w-full bg-brand-accent rounded-t-sm"
                        style={{
                          height: `${param === "sustain" ? adsr[param] : (adsr[param] / (param === "attack" ? 1000 : param === "decay" ? 1000 : param === "release" ? 1000 : 1)) * 100}%`,
                        }}
                      />
                    </View>
                    <Pressable
                      onPress={() => {
                        const max =
                          param === "attack"
                            ? 1000
                            : param === "decay"
                              ? 1000
                              : param === "release"
                                ? 1000
                                : 100;
                        const step = param === "sustain" ? 5 : 50;
                        setAdsr((prev) => ({
                          ...prev,
                          [param]: Math.min(max, prev[param] + step),
                        }));
                      }}
                      className="w-6 h-4 rounded bg-dark-muted items-center justify-center mt-1 active:opacity-70"
                    >
                      <Text className="text-gray-400 text-[8px]">+</Text>
                    </Pressable>
                    <Text className="text-[8px] text-gray-500 font-mono mt-0.5">
                      {adsr[param]}
                      {param === "sustain" ? "%" : "ms"}
                    </Text>
                    <Pressable
                      onPress={() => {
                        const step = param === "sustain" ? 5 : 50;
                        setAdsr((prev) => ({
                          ...prev,
                          [param]: Math.max(
                            param === "sustain" ? 0 : 1,
                            prev[param] - step,
                          ),
                        }));
                      }}
                      className="w-6 h-4 rounded bg-dark-muted items-center justify-center active:opacity-70"
                    >
                      <Text className="text-gray-400 text-[8px]">−</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Velocity control */}
          <View className="bg-dark-bg rounded-xl p-3 border border-dark-border mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-300 text-xs font-semibold">Velocity</Text>
              <Text className="text-gray-400 text-[10px] font-mono">{velocity}/127</Text>
            </View>
            <View className="flex-row gap-1">
              {[0, 32, 64, 80, 96, 112, 127].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setVelocity(v)}
                  className={`flex-1 py-1.5 rounded ${velocity === v ? "bg-brand-accent/30 border border-brand-accent" : "bg-dark-muted border border-dark-border"}`}
                >
                  <Text className={`text-[8px] text-center ${velocity === v ? "text-brand-accent" : "text-gray-500"}`}>
                    {v}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Melodic mini-keyboard */}
          {mode === "melodic" && (
            <View className="bg-dark-bg rounded-xl p-3 border border-dark-border mb-3">
              <Text className="text-gray-300 text-xs font-semibold mb-2">Keyboard</Text>
              <View className="h-16 flex-row relative">
                {[48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72].map((note, i) => {
                  const noteNames = ["C2","D2","E2","F2","G2","A2","B2","C3","D3","E3","F3","G3","A3","B3","C4"];
                  const hasLoadedSlot = slots.find((s) => note >= s.lowKey && note <= s.highKey && s.data);
                  return (
                    <Pressable
                      key={note}
                      onPressIn={() => {
                        if (hasLoadedSlot) {
                          const idx = slots.indexOf(hasLoadedSlot);
                          previewSample(idx, note);
                        }
                      }}
                      className="flex-1 rounded-b border-l border-gray-700"
                      style={{ backgroundColor: hasLoadedSlot ? "rgba(90,200,250,0.3)" : "#f5f5f5" }}
                    >
                      <View className="flex-1 justify-end items-center pb-1">
                        <Text className="text-gray-400 text-[7px]">{noteNames[i]}</Text>
                      </View>
                    </Pressable>
                  );
                })}
                {[49, 51, 54, 56, 58, 61, 63, 66, 68, 70].map((note, i) => {
                  const noteNames = ["C#2","D#2","F#2","G#2","A#2","C#3","D#3","F#3","G#3","A#3"];
                  const whiteNotes = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72];
                  const prevWhite = whiteNotes.filter((w) => w < note).length;
                  const hasLoadedSlot = slots.find((s) => note >= s.lowKey && note <= s.highKey && s.data);
                  return (
                    <Pressable
                      key={note}
                      onPressIn={() => {
                        if (hasLoadedSlot) {
                          const idx = slots.indexOf(hasLoadedSlot);
                          previewSample(idx, note);
                        }
                      }}
                      className="absolute rounded-b"
                      style={{
                        left: `${((prevWhite - 1 + 0.65) / whiteNotes.length) * 100}%`,
                        width: `${(0.6 / whiteNotes.length) * 100}%`,
                        height: "60%",
                        backgroundColor: hasLoadedSlot ? "#5ac8fa" : "#1a1a1a",
                        borderColor: "#333",
                        borderWidth: 1,
                        zIndex: 1,
                      }}
                    >
                      <View className="flex-1 justify-end items-center pb-0.5">
                        <Text className="text-gray-600 text-[5px]">{noteNames[i]}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <Text className="text-gray-600 text-[8px] text-center mt-1">
                Tap keys to preview samples at different pitches
              </Text>
            </View>
          )}

          {mode === "slice" && (
            <View className="bg-dark-bg rounded-xl p-3 border border-dark-border mb-3">
              <Text className="text-gray-300 text-xs font-semibold mb-2">
                Audio Slicer
              </Text>
              {!sliceSource ? (
                <Pressable
                  onPress={handleSliceLoad}
                  className="py-6 rounded-lg border border-dashed border-dark-border items-center active:opacity-70"
                >
                  <Text className="text-gray-400 text-xs">
                    Tap to load audio for slicing
                  </Text>
                  <Text className="text-gray-600 text-[9px] mt-1">
                    WAV, MP3, AIFF, FLAC, OGG
                  </Text>
                </Pressable>
              ) : (
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-500 text-[9px]">
                      Transients: {sliceTransients.length} | Slices:{" "}
                      {slicePoints.length + 1}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setSliceSource(null);
                        setSlicePoints([]);
                        setSliceTransients([]);
                      }}
                      className="px-2 py-0.5 rounded bg-dark-muted active:opacity-70"
                    >
                      <Text className="text-gray-400 text-[9px]">Clear</Text>
                    </Pressable>
                  </View>

                  <View className="mb-2">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-gray-500 text-[9px]">
                        Threshold
                      </Text>
                      <Text className="text-gray-400 text-[9px] font-mono">
                        {Math.round(sliceThreshold * 100)}%
                      </Text>
                    </View>
                    <View className="flex-row gap-1">
                      {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8].map((t) => (
                        <Pressable
                          key={t}
                          onPress={() => setSliceThreshold(t)}
                          className={`flex-1 py-1 rounded ${Math.abs(sliceThreshold - t) < 0.01 ? "bg-brand-accent/20 border border-brand-accent/40" : "bg-dark-muted/30"}`}
                        >
                          <Text
                            className={`text-[8px] text-center ${Math.abs(sliceThreshold - t) < 0.01 ? "text-brand-accent" : "text-gray-500"}`}
                          >
                            {Math.round(t * 100)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View className="h-16 bg-dark-surface rounded-lg mb-2 overflow-hidden relative">
                    {sliceTransients.map((t, i) => (
                      <Pressable
                        key={i}
                        onPress={() => toggleSlicePoint(t.time)}
                        className="absolute top-0 bottom-0 w-0.5"
                        style={{
                          left: `${(t.time / sliceSource.duration) * 100}%`,
                          backgroundColor: slicePoints.includes(t.time)
                            ? "#5ac8fa"
                            : "#ff375f",
                        }}
                      />
                    ))}
                    {slicePoints.map((p, i) => (
                      <View
                        key={`sp-${i}`}
                        className="absolute top-0 bottom-0 w-0.5 bg-brand-accent"
                        style={{
                          left: `${(p / sliceSource.duration) * 100}%`,
                        }}
                      />
                    ))}
                  </View>

                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={runAutoSlice}
                      className="flex-1 py-2 rounded-lg bg-dark-muted items-center active:opacity-70"
                    >
                      <Text className="text-gray-300 text-[10px] font-semibold">
                        Auto-Slice
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSliceToPads}
                      disabled={slicePoints.length === 0}
                      className={`flex-1 py-2 rounded-lg items-center ${slicePoints.length > 0 ? "bg-brand-primary active:opacity-80" : "bg-dark-muted/30"}`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${slicePoints.length > 0 ? "text-white" : "text-gray-600"}`}
                      >
                        Slice to Pads ({slicePoints.length + 1})
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          <View className="flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3 rounded-xl border border-dark-border items-center active:opacity-70"
            >
              <Text className="text-gray-400 text-sm font-semibold">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleAddToTrack}
              className="flex-1 py-3 rounded-xl bg-brand-primary items-center active:opacity-80"
            >
              <Text className="text-white text-sm font-bold">
                Add to Track ({slots.filter((s) => s.data).length} samples)
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

import { useMemo, useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import type { Plugin } from "../lib/types";
import { PLUGIN_SPECS, PLUGIN_ICONS, EQ_BAND_LABELS } from "../lib/types";
import { getOversampleLabel } from "../lib/mastering";
import {
  processMidiCC,
  startLearning,
  stopLearning,
  loadMappings,
  isLearning,
  type MidiLearnState,
} from "../lib/midiLearn";
import {
  getModSources,
  getModulationState,
  addModRoute,
  removeModRoute,
  applyModulation,
  paramToTarget,
  type ModSource,
} from "../lib/modulationMatrix";

interface ModulationContextValue {
  contextTime: number;
  playing: boolean;
  velocity?: number;
  noteNumber?: number;
}

const ModulationContext = createContext<ModulationContextValue>({
  contextTime: 0,
  playing: false,
});

interface PluginEditorProps {
  plugin: Plugin | null;
  onParamChange: (pluginId: string, paramId: string, value: number) => void;
  onToggle: (pluginId: string) => void;
  onClose: () => void;
  bpm?: number;
  testID?: string;
  trackId?: string;
  contextTime?: number;
  playing?: boolean;
  velocity?: number;
  noteNumber?: number;
}

function ParamRow({
  param,
  value,
  onChange,
  onLearn,
  isLearning: learning = false,
}: {
  param: {
    id: string;
    label: string;
    min: number;
    max: number;
    step: number;
    unit?: string;
  };
  value: number;
  onChange: (v: number) => void;
  onLearn?: () => void;
  isLearning?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [routesTick, setRoutesTick] = useState(0);
  const mod = useContext(ModulationContext);
  const modTarget = paramToTarget(param.id);
  const range = param.max - param.min;

  const activeRoutes = modTarget
    ? getModulationState().routes.filter(
        (r) => r.target === modTarget && r.enabled,
      )
    : [];

  const displayed =
    modTarget && mod.playing
      ? applyModulation(modTarget, value, param.min, param.max, {
          time: mod.contextTime,
          velocity: mod.velocity,
          noteNumber: mod.noteNumber,
        })
      : value;
  const pct = range === 0 ? 0 : ((displayed - param.min) / range) * 100;
  const displayVal =
    param.step >= 1 ? String(Math.round(displayed)) : String(displayed);

  const handleAddRoute = (source: ModSource) => {
    if (!modTarget) return;
    addModRoute(source, modTarget, 0.5, false);
    setRoutesTick((t) => t + 1);
    setPickerOpen(false);
  };

  const handleRemoveRoutes = () => {
    for (const r of activeRoutes) removeModRoute(r.id);
    setRoutesTick((t) => t + 1);
    setPickerOpen(false);
  };

  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-between mb-1">
        <Pressable
          onPress={onLearn}
          className={`flex-row items-center gap-1 ${learning ? "opacity-100" : ""}`}
        >
          <Text className={`text-xs font-medium ${learning ? "text-brand-accent" : "text-gray-400"}`}>
            {param.label}
          </Text>
          {learning && (
            <View className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
          )}
        </Pressable>
        <View className="flex-row items-center gap-1.5">
          {modTarget && (
            <Pressable
              onPress={() => setPickerOpen((o) => !o)}
              className={`px-1.5 py-0.5 rounded-md border items-center ${
                activeRoutes.length > 0
                  ? "border-brand-accent bg-brand-accent/20"
                  : "border-dark-border bg-dark-surface"
              }`}
              testID={`mod-${param.id}`}
            >
              <Text
                className={`text-[9px] font-bold ${
                  activeRoutes.length > 0 ? "text-brand-accent" : "text-gray-500"
                }`}
              >
                {activeRoutes.length > 0 ? "MOD●" : "MOD"}
              </Text>
            </Pressable>
          )}
          <Text className="text-white font-mono text-[11px]">
            {displayVal}
            {param.unit ? ` ${param.unit}` : ""}
          </Text>
        </View>
      </View>
      {pickerOpen && modTarget && (
        <View key={routesTick} className="mb-2 p-2 rounded-lg bg-dark-surface border border-dark-border">
          <Text className="text-[9px] text-gray-500 mb-1">
            Mod source → {modTarget}
          </Text>
          <Text className="text-[8px] text-gray-600 mb-1">
            Atribui uma fonte de modulação (LFO, envelope, macro…) a este
            parâmetro. O valor é aplicado em tempo de reprodução.
          </Text>
          <View className="flex-row flex-wrap gap-1">
            {getModSources().map((src) => (
              <Pressable
                key={src}
                onPress={() => handleAddRoute(src)}
                className="px-2 py-1 rounded-md bg-dark-elevated border border-dark-border active:opacity-70"
              >
                <Text className="text-[9px] text-gray-300 font-mono">{src}</Text>
              </Pressable>
            ))}
            {activeRoutes.length > 0 && (
              <Pressable
                onPress={handleRemoveRoutes}
                className="px-2 py-1 rounded-md bg-red-500/20 border border-red-500/50 active:opacity-70"
                testID={`mod-clear-${param.id}`}
              >
                <Text className="text-[9px] text-red-400 font-bold">clear</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => onChange(Math.max(param.min, value - param.step))}
          className="w-7 h-7 rounded-lg bg-dark-surface items-center justify-center active:opacity-70"
        >
          <Text className="text-gray-400 text-sm">−</Text>
        </Pressable>
        <View className="flex-1 h-6 bg-dark-surface rounded-lg overflow-hidden justify-center">
          <View
            className="absolute h-full rounded-lg bg-brand-accent/40"
            style={{ width: `${pct}%` }}
          />
          <View
            className="absolute w-3 h-6 rounded-sm bg-white shadow-sm"
            style={{ left: `${pct}%`, marginLeft: -4 }}
          />
        </View>
        <Pressable
          onPress={() => onChange(Math.min(param.max, value + param.step))}
          className="w-7 h-7 rounded-lg bg-dark-surface items-center justify-center active:opacity-70"
        >
          <Text className="text-gray-400 text-sm">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EqEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  const bands = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
      index: i,
      freq: plugin.params[`b${i}_freq`] ?? 1000,
      gain: plugin.params[`b${i}_gain`] ?? 0,
      q: plugin.params[`b${i}_q`] ?? 0.71,
      type: plugin.params[`b${i}_type`] ?? 2,
      enabled: (plugin.params[`b${i}_enabled`] ?? 0) === 1,
    }));
  }, [plugin.params]);

  const curvePoints = useMemo(() => {
    const points: { x: number; db: number }[] = [];
    for (let fi = 0; fi < 60; fi++) {
      const freq = 20 * Math.pow(20000 / 20, fi / 59);
      let totalDb = 0;
      for (const band of bands) {
        if (!band.enabled) continue;
        const f = band.freq;
        const g = band.gain;
        const q = band.q;
        const type = band.type;
        const ratio = f / freq;
        if (ratio === 0) continue;
        let contribution = 0;
        switch (type) {
          case 2: {
            contribution = g / (1 + Math.pow((freq / f - f / freq) * q, 2));
            break;
          }
          case 3: {
            const num = Math.pow((freq / f - f / freq) * q, 2);
            contribution = (-g * num) / (1 + num);
            break;
          }
          case 0: {
            if (freq < f) {
              contribution =
                g * Math.exp(-0.5 * Math.pow(Math.log2(freq / f) * 2, 2));
            }
            break;
          }
          case 5: {
            if (freq > f) {
              contribution =
                g * Math.exp(-0.5 * Math.pow(Math.log2(freq / f) * 2, 2));
            }
            break;
          }
          case 1: {
            if (freq < f) {
              contribution =
                g * 0.5 * (1 + Math.cos((Math.PI * Math.log2(freq / f)) / 2));
            }
            break;
          }
          case 4: {
            if (freq > f) {
              contribution =
                g * 0.5 * (1 + Math.cos((Math.PI * Math.log2(freq / f)) / 2));
            }
            break;
          }
        }
        totalDb += contribution;
      }
      totalDb += plugin.params.master ?? 0;
      points.push({ x: fi / 59, db: Math.max(-18, Math.min(18, totalDb)) });
    }
    return points;
  }, [bands, plugin.params.master]);

  const bandColors = [
    "#5ac8fa",
    "#ff9500",
    "#ffcc00",
    "#34c759",
    "#ff375f",
    "#bf5af2",
    "#00d4aa",
    "#ff6482",
  ];

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="h-44 bg-[#0b0b0d] rounded-xl border border-dark-border mb-3 overflow-hidden px-1">
        <View className="flex-1 flex-row items-end py-3 gap-[1px]">
          {curvePoints.map((pt, i) => {
            const barHeight = ((pt.db + 18) / 36) * 100;
            return (
              <View
                key={i}
                className="flex-1 items-center justify-end"
                style={{ height: "100%" }}
              >
                <View
                  className="w-full rounded-sm"
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: pt.db > 0 ? "#5ac8fa" : "#ff6482",
                    opacity: 0.7 + (Math.abs(pt.db) / 36) * 0.3,
                  }}
                />
              </View>
            );
          })}
        </View>
        <View className="absolute inset-0 justify-center">
          <View className="h-px bg-dark-border/50" style={{ top: "50%" }} />
        </View>
      </View>

      <View className="flex-row items-center gap-1.5 mb-3">
        {bands.map((band, i) => (
          <Pressable
            key={i}
            onPress={() => onParamChange(`b${i}_enabled`, band.enabled ? 0 : 1)}
            className={`flex-1 py-2 rounded-lg border items-center ${
              band.enabled
                ? "border-dark-border bg-dark-elevated"
                : "border-dark-border/30 bg-dark-surface/50"
            }`}
          >
            <Text
              className={`text-[10px] font-mono font-bold ${band.enabled ? "text-white" : "text-gray-600"}`}
              style={{ color: band.enabled ? bandColors[i] : undefined }}
            >
              {EQ_BAND_LABELS[band.type] || "PK"}
            </Text>
            <Text
              className={`text-[8px] font-mono mt-0.5 ${band.enabled ? "text-gray-400" : "text-gray-700"}`}
            >
              {band.freq >= 1000
                ? `${(band.freq / 1000).toFixed(0)}k`
                : String(band.freq)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-2"
      >
        <View className="flex-row gap-1.5 mb-2">
          {[0, 1, 2, 3, 4, 5].map((type) => {
            const label = EQ_BAND_LABELS[type] || "—";
            return (
              <Pressable
                key={type}
                onPress={() => {
                  bands.forEach((b) => onParamChange(`b${b.index}_type`, type));
                }}
                className="px-2 py-1 rounded-md bg-dark-surface border border-dark-border"
              >
                <Text className="text-gray-400 text-[9px] font-mono">
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <ParamRow
        param={{
          id: "master",
          label: "Master Gain",
          min: -6,
          max: 6,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.master ?? 0}
        onChange={(v) => onParamChange("master", v)}
      />
    </ScrollView>
  );
}

function CompressorEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
  onParamLearn?: (pluginId: string, paramId: string) => void;
  midiLearnState?: MidiLearnState;
}) {
  const threshold = plugin.params.threshold ?? -18;
  const ratio = plugin.params.ratio ?? 4;
  const reduction = threshold < 0 ? threshold * (1 - 1 / ratio) : 0;

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="h-28 bg-[#0b0b0d] rounded-xl border border-dark-border mb-3 items-center justify-center">
        <View className="flex-row items-end gap-1.5" style={{ height: 64 }}>
          {Array.from({ length: 12 }, (_, i) => {
            const bar = Math.max(0, 1 - i / 12);
            const reduced = threshold < -i * 5;
            return (
              <View
                key={i}
                className="w-3 items-center justify-end"
                style={{ height: 64 }}
              >
                <View
                  className="w-full rounded-sm"
                  style={{
                    height: `${bar * 100}%`,
                    backgroundColor: reduced ? "#ff6482" : "#5ac8fa",
                    opacity: reduced ? 0.9 : 0.3,
                  }}
                />
              </View>
            );
          })}
        </View>
        <View className="flex-row items-center gap-4 mt-2">
          <View className="flex-row items-center gap-1">
            <Text className="text-gray-500 text-[9px]">GR:</Text>
            <Text className="text-[#ff6482] font-mono text-xs font-bold">
              {reduction < 0 ? reduction.toFixed(1) : "0.0"} dB
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-gray-500 text-[9px]">Ratio:</Text>
            <Text className="text-white font-mono text-xs">{ratio}:1</Text>
          </View>
        </View>
      </View>

      <ParamRow
        param={{
          id: "threshold",
          label: "Threshold",
          min: -60,
          max: 0,
          step: 0.5,
          unit: "dB",
        }}
        value={threshold}
        onChange={(v) => onParamChange("threshold", v)}
      />
      <ParamRow
        param={{
          id: "ratio",
          label: "Ratio",
          min: 1,
          max: 20,
          step: 0.5,
          unit: ":1",
        }}
        value={ratio}
        onChange={(v) => onParamChange("ratio", v)}
      />
      <ParamRow
        param={{
          id: "knee",
          label: "Knee",
          min: 0,
          max: 10,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.knee ?? 3}
        onChange={(v) => onParamChange("knee", v)}
      />
      <ParamRow
        param={{
          id: "attack",
          label: "Attack",
          min: 0.1,
          max: 50,
          step: 0.1,
          unit: "ms",
        }}
        value={plugin.params.attack ?? 3}
        onChange={(v) => onParamChange("attack", v)}
      />
      <ParamRow
        param={{
          id: "release",
          label: "Release",
          min: 10,
          max: 1000,
          step: 10,
          unit: "ms",
        }}
        value={plugin.params.release ?? 150}
        onChange={(v) => onParamChange("release", v)}
      />
      <ParamRow
        param={{
          id: "makeupGain",
          label: "Make-Up Gain",
          min: 0,
          max: 24,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.makeupGain ?? 6}
        onChange={(v) => onParamChange("makeupGain", v)}
      />
    </ScrollView>
  );
}

function LimiterEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="h-28 bg-[#0b0b0d] rounded-xl border border-dark-border mb-3 items-center justify-center">
        <View className="items-center">
          <Text className="text-gray-500 text-[9px]">Gain Reduction</Text>
          <Text className="text-[#ff6482] font-mono text-2xl font-bold">
            0.0 dB
          </Text>
          <Text className="text-gray-600 text-[9px] mt-1">
            Ceiling: {plugin.params.ceiling ?? -1} dB
          </Text>
        </View>
      </View>
      <ParamRow
        param={{
          id: "threshold",
          label: "Threshold",
          min: -30,
          max: 0,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.threshold ?? -6}
        onChange={(v) => onParamChange("threshold", v)}
      />
      <ParamRow
        param={{
          id: "ceiling",
          label: "Ceiling",
          min: -6,
          max: 0,
          step: 0.1,
          unit: "dB",
        }}
        value={plugin.params.ceiling ?? -1}
        onChange={(v) => onParamChange("ceiling", v)}
      />
      <ParamRow
        param={{
          id: "attack",
          label: "Attack",
          min: 0.01,
          max: 5,
          step: 0.01,
          unit: "ms",
        }}
        value={plugin.params.attack ?? 0.5}
        onChange={(v) => onParamChange("attack", v)}
      />
      <ParamRow
        param={{
          id: "release",
          label: "Release",
          min: 10,
          max: 100,
          step: 5,
          unit: "ms",
        }}
        value={plugin.params.release ?? 40}
        onChange={(v) => onParamChange("release", v)}
      />
    </ScrollView>
  );
}

function DistortionEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="h-20 bg-[#0b0b0d] rounded-xl border border-dark-border mb-3 items-center justify-center">
        <View className="flex-row items-end gap-1">
          {Array.from({ length: 20 }, (_, i) => {
            const h =
              (Math.tanh(((i / 20) * (plugin.params.drive ?? 6)) / 3) + 1) * 24;
            return (
              <View
                key={i}
                className="w-2 rounded-sm"
                style={{
                  height: h,
                  backgroundColor: i > 12 ? "#ff375f" : "#ff9500",
                  opacity: 0.7,
                }}
              />
            );
          })}
        </View>
      </View>
      <ParamRow
        param={{
          id: "drive",
          label: "Drive",
          min: 0,
          max: 24,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.drive ?? 6}
        onChange={(v) => onParamChange("drive", v)}
      />
      <ParamRow
        param={{
          id: "tone",
          label: "Tone",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.tone ?? 50}
        onChange={(v) => onParamChange("tone", v)}
      />
      <ParamRow
        param={{
          id: "mix",
          label: "Mix",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.mix ?? 70}
        onChange={(v) => onParamChange("mix", v)}
      />
    </ScrollView>
  );
}

function ReverbEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="h-20 bg-[#0b0b0d] rounded-xl border border-dark-border mb-3 items-center justify-center flex-row gap-6">
        <View className="items-center">
          <Text className="text-gray-500 text-[9px]">Decay</Text>
          <Text className="text-white font-mono text-lg font-bold">
            {(plugin.params.decay ?? 2.5).toFixed(1)}s
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-gray-500 text-[9px]">Size</Text>
          <Text className="text-[#64d2ff] font-mono text-lg font-bold">
            {plugin.params.size ?? 60}%
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-gray-500 text-[9px]">Mix</Text>
          <Text className="text-[#30d158] font-mono text-lg font-bold">
            {plugin.params.mix ?? 30}%
          </Text>
        </View>
      </View>
      <ParamRow
        param={{
          id: "decay",
          label: "Decay",
          min: 0.1,
          max: 10,
          step: 0.1,
          unit: "s",
        }}
        value={plugin.params.decay ?? 2.5}
        onChange={(v) => onParamChange("decay", v)}
      />
      <ParamRow
        param={{
          id: "preDelay",
          label: "Pré-Delay",
          min: 0,
          max: 100,
          step: 1,
          unit: "ms",
        }}
        value={plugin.params.preDelay ?? 20}
        onChange={(v) => onParamChange("preDelay", v)}
      />
      <ParamRow
        param={{
          id: "damping",
          label: "Damping",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.damping ?? 40}
        onChange={(v) => onParamChange("damping", v)}
      />
      <ParamRow
        param={{
          id: "size",
          label: "Size",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.size ?? 60}
        onChange={(v) => onParamChange("size", v)}
      />
      <ParamRow
        param={{
          id: "mix",
          label: "Mix",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.mix ?? 30}
        onChange={(v) => onParamChange("mix", v)}
      />
    </ScrollView>
  );
}

function DelayEditor({
  plugin,
  onParamChange,
  bpm = 120,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
  bpm?: number;
}) {
  const timeMs = plugin.params.time ?? 300;
  const noteValues = [
    { label: "1/4", ms: 60000 / bpm },
    { label: "1/4T", ms: 60000 / bpm / 1.5 },
    { label: "1/8", ms: 60000 / bpm / 2 },
    { label: "1/8T", ms: 60000 / bpm / 2 / 1.5 },
    { label: "1/16", ms: 60000 / bpm / 4 },
  ];

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="h-20 bg-[#0b0b0d] rounded-xl border border-dark-border mb-3 items-center justify-center">
        <View className="flex-row gap-2">
          {noteValues.map((n) => (
            <Pressable
              key={n.label}
              onPress={() => onParamChange("time", n.ms)}
              className={`px-3 py-1.5 rounded-md border ${Math.abs(timeMs - n.ms) < 5 ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-surface border-dark-border"}`}
            >
              <Text
                className={`text-xs font-mono ${Math.abs(timeMs - n.ms) < 5 ? "text-brand-accent font-bold" : "text-gray-400"}`}
              >
                {n.label}
              </Text>
              <Text
                className={`text-[8px] font-mono ${Math.abs(timeMs - n.ms) < 5 ? "text-brand-accent/70" : "text-gray-600"}`}
              >
                {n.ms}ms
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ParamRow
        param={{
          id: "time",
          label: "Delay Time",
          min: 1,
          max: 2000,
          step: 1,
          unit: "ms",
        }}
        value={timeMs}
        onChange={(v) => onParamChange("time", v)}
      />
      <ParamRow
        param={{
          id: "feedback",
          label: "Feedback",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.feedback ?? 35}
        onChange={(v) => onParamChange("feedback", v)}
      />
      <ParamRow
        param={{
          id: "mix",
          label: "Mix",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.mix ?? 25}
        onChange={(v) => onParamChange("mix", v)}
      />
    </ScrollView>
  );
}

function MultibandCompEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  const bandLabels = ["Low", "Mid", "High"];
  const bandColors = ["#5ac8fa", "#ffcc00", "#ff6482"];
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {[0, 1, 2].map((b) => {
        const muted = (plugin.params[`b${b}_mute`] ?? 0) === 1;
        return (
          <View
            key={b}
            className="mb-3 bg-dark-surface/50 rounded-xl p-3 border border-dark-border"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <View
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: bandColors[b] }}
                />
                <Text className="text-white text-sm font-bold">
                  {bandLabels[b]}
                </Text>
              </View>
              <Pressable
                onPress={() => onParamChange(`b${b}_mute`, muted ? 0 : 1)}
                className={`px-2.5 py-1 rounded-md border ${muted ? "bg-red-500/20 border-red-500/50" : "bg-dark-surface border-dark-border"}`}
              >
                <Text
                  className={`text-[9px] font-bold ${muted ? "text-red-400" : "text-gray-500"}`}
                >
                  {muted ? "OFF" : "ON"}
                </Text>
              </Pressable>
            </View>
            <ParamRow
              param={{
                id: `b${b}_cross`,
                label: "Crossover",
                min: 20,
                max: 20000,
                step: 1,
                unit: "Hz",
              }}
              value={plugin.params[`b${b}_cross`] ?? [200, 2000, 20000][b]}
              onChange={(v) => onParamChange(`b${b}_cross`, v)}
            />
            <ParamRow
              param={{
                id: `b${b}_threshold`,
                label: "Threshold",
                min: -60,
                max: 0,
                step: 0.5,
                unit: "dB",
              }}
              value={plugin.params[`b${b}_threshold`] ?? -20}
              onChange={(v) => onParamChange(`b${b}_threshold`, v)}
            />
            <ParamRow
              param={{
                id: `b${b}_ratio`,
                label: "Ratio",
                min: 1,
                max: 20,
                step: 0.5,
                unit: ":1",
              }}
              value={plugin.params[`b${b}_ratio`] ?? 4}
              onChange={(v) => onParamChange(`b${b}_ratio`, v)}
            />
            <ParamRow
              param={{
                id: `b${b}_attack`,
                label: "Attack",
                min: 0.1,
                max: 50,
                step: 0.1,
                unit: "ms",
              }}
              value={plugin.params[`b${b}_attack`] ?? 3}
              onChange={(v) => onParamChange(`b${b}_attack`, v)}
            />
            <ParamRow
              param={{
                id: `b${b}_release`,
                label: "Release",
                min: 10,
                max: 1000,
                step: 10,
                unit: "ms",
              }}
              value={plugin.params[`b${b}_release`] ?? 100}
              onChange={(v) => onParamChange(`b${b}_release`, v)}
            />
            <ParamRow
              param={{
                id: `b${b}_makeup`,
                label: "Make-Up",
                min: 0,
                max: 24,
                step: 0.5,
                unit: "dB",
              }}
              value={plugin.params[`b${b}_makeup`] ?? 4}
              onChange={(v) => onParamChange(`b${b}_makeup`, v)}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

function StereoImagerEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="h-28 bg-[#0b0b0d] rounded-xl border border-dark-border mb-3 items-center justify-center">
        <View className="flex-row items-center gap-8">
          <View className="items-center">
            <Text className="text-gray-500 text-[9px]">Mid</Text>
            <Text className="text-[#5ac8fa] font-mono text-lg font-bold">
              {plugin.params.midGain ?? 0} dB
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500 text-[9px]">Side</Text>
            <Text className="text-[#ff6482] font-mono text-lg font-bold">
              {plugin.params.sideGain ?? 0} dB
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500 text-[9px]">Width</Text>
            <Text className="text-[#30d158] font-mono text-lg font-bold">
              {plugin.params.width ?? 100}%
            </Text>
          </View>
        </View>
      </View>
      <ParamRow
        param={{
          id: "width",
          label: "Stereo Width",
          min: 0,
          max: 200,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.width ?? 100}
        onChange={(v) => onParamChange("width", v)}
      />
      <ParamRow
        param={{
          id: "midGain",
          label: "Mid Gain",
          min: -12,
          max: 12,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.midGain ?? 0}
        onChange={(v) => onParamChange("midGain", v)}
      />
      <ParamRow
        param={{
          id: "sideGain",
          label: "Side Gain",
          min: -12,
          max: 12,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.sideGain ?? 0}
        onChange={(v) => onParamChange("sideGain", v)}
      />
      <ParamRow
        param={{
          id: "monoCross",
          label: "Mono Crossover",
          min: 20,
          max: 500,
          step: 1,
          unit: "Hz",
        }}
        value={plugin.params.monoCross ?? 150}
        onChange={(v) => onParamChange("monoCross", v)}
      />
      <ParamRow
        param={{
          id: "balance",
          label: "Balance",
          min: -100,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.balance ?? 0}
        onChange={(v) => onParamChange("balance", v)}
      />
    </ScrollView>
  );
}

function DeesserEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="h-20 bg-[#0b0b0d] rounded-xl border border-dark-border mb-3 items-center justify-center flex-row gap-6">
        <View className="items-center">
          <Text className="text-gray-500 text-[9px]">Freq</Text>
          <Text className="text-white font-mono text-lg font-bold">
            {(plugin.params.frequency ?? 6000) / 1000}kHz
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-gray-500 text-[9px]">Range</Text>
          <Text className="text-[#ff9f0a] font-mono text-lg font-bold">
            {plugin.params.range ?? 12}dB
          </Text>
        </View>
      </View>
      <ParamRow
        param={{
          id: "frequency",
          label: "Detection Freq",
          min: 1000,
          max: 10000,
          step: 10,
          unit: "Hz",
        }}
        value={plugin.params.frequency ?? 6000}
        onChange={(v) => onParamChange("frequency", v)}
      />
      <ParamRow
        param={{
          id: "threshold",
          label: "Threshold",
          min: -40,
          max: 0,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.threshold ?? -18}
        onChange={(v) => onParamChange("threshold", v)}
      />
      <ParamRow
        param={{
          id: "range",
          label: "Max Reduction",
          min: 0,
          max: 24,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.range ?? 12}
        onChange={(v) => onParamChange("range", v)}
      />
      <View className="mb-2">
        <Text className="text-gray-400 text-xs font-medium mb-1">Mode</Text>
        <View className="flex-row gap-2">
          {["Wideband", "Split"].map((label, i) => (
            <Pressable
              key={label}
              onPress={() => onParamChange("mode", i)}
              className={`flex-1 py-2.5 rounded-lg items-center border ${(plugin.params.mode ?? 0) === i ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-surface border-dark-border"}`}
            >
              <Text
                className={`text-xs font-semibold ${(plugin.params.mode ?? 0) === i ? "text-brand-accent" : "text-gray-400"}`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function TapeSatEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="h-20 bg-[#0b0b0d] rounded-xl border border-dark-border mb-3 items-center justify-center">
        <Text className="text-gray-500 text-[9px]">Tape Saturation</Text>
        <View className="flex-row items-center gap-3 mt-1">
          <Text className="text-[#ff453a] font-mono text-lg font-bold">
            {plugin.params.drive ?? 4}dB
          </Text>
          <Text className="text-gray-600">|</Text>
          <Text className="text-[#ff9f0a] font-mono text-lg font-bold">
            {plugin.params.warmth ?? 50}%
          </Text>
          <Text className="text-gray-600">|</Text>
          <Text className="text-gray-400 font-mono text-lg font-bold">
            {plugin.params.mix ?? 60}%
          </Text>
        </View>
      </View>
      <ParamRow
        param={{
          id: "drive",
          label: "Drive",
          min: 0,
          max: 24,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.drive ?? 4}
        onChange={(v) => onParamChange("drive", v)}
      />
      <ParamRow
        param={{
          id: "warmth",
          label: "Warmth",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.warmth ?? 50}
        onChange={(v) => onParamChange("warmth", v)}
      />
      <ParamRow
        param={{
          id: "noise",
          label: "Noise Floor",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.noise ?? 5}
        onChange={(v) => onParamChange("noise", v)}
      />
      <ParamRow
        param={{
          id: "wow",
          label: "Wow / Flutter",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.wow ?? 10}
        onChange={(v) => onParamChange("wow", v)}
      />
      <ParamRow
        param={{
          id: "mix",
          label: "Mix",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.mix ?? 60}
        onChange={(v) => onParamChange("mix", v)}
      />
    </ScrollView>
  );
}

function TruePeakEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  const oversample = plugin.params.oversample ?? 2;
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="bg-[#0b0b0d] rounded-xl border border-dark-border mb-3 p-4">
        <View className="items-center mb-2">
          <Text className="text-gray-500 text-[9px] tracking-wider uppercase">
            True Peak Level
          </Text>
          <Text className="text-white font-mono text-3xl font-bold mt-1">
            −∞
          </Text>
          <Text className="text-gray-600 text-[9px]">dBTP</Text>
        </View>
        <View className="flex-row items-center gap-2">
          {[-24, -18, -12, -6, -3, -1, -0.5, 0].map((db) => (
            <View key={db} className="flex-1 h-6 justify-end">
              <View
                className={`w-full rounded-sm ${db >= 0 ? "bg-red-500" : db >= -1 ? "bg-yellow-500" : "bg-green-600/50"}`}
                style={{
                  height: db >= 0 ? "100%" : db >= -3 ? "60%" : "30%",
                  opacity: 0.6,
                }}
              />
            </View>
          ))}
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-gray-700 text-[7px]">-24</Text>
          <Text className="text-gray-700 text-[7px]">0 dBTP</Text>
        </View>
      </View>

      <ParamRow
        param={{
          id: "threshold",
          label: "Threshold",
          min: -30,
          max: 0,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.threshold ?? -3}
        onChange={(v) => onParamChange("threshold", v)}
      />
      <ParamRow
        param={{
          id: "ceiling",
          label: "Ceiling (True Peak)",
          min: -6,
          max: 0,
          step: 0.1,
          unit: "dBTP",
        }}
        value={plugin.params.ceiling ?? -0.5}
        onChange={(v) => onParamChange("ceiling", v)}
      />

      <View className="mb-3">
        <Text className="text-gray-400 text-xs font-medium mb-1">
          Oversampling
        </Text>
        <View className="flex-row gap-2">
          {[0, 1, 2, 3].map((v) => (
            <Pressable
              key={v}
              onPress={() => onParamChange("oversample", v)}
              className={`flex-1 py-2.5 rounded-lg items-center border ${oversample === v ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-surface border-dark-border"}`}
            >
              <Text
                className={`text-xs font-bold ${oversample === v ? "text-brand-accent" : "text-gray-400"}`}
              >
                {getOversampleLabel(v)}
              </Text>
              <Text
                className={`text-[8px] ${oversample === v ? "text-brand-accent/70" : "text-gray-600"}`}
              >
                {["None", "Slow", "Good", "Best"][v]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ParamRow
        param={{
          id: "lookahead",
          label: "Lookahead",
          min: 0.1,
          max: 10,
          step: 0.1,
          unit: "ms",
        }}
        value={plugin.params.lookahead ?? 1}
        onChange={(v) => onParamChange("lookahead", v)}
      />
      <ParamRow
        param={{
          id: "release",
          label: "Release",
          min: 10,
          max: 200,
          step: 5,
          unit: "ms",
        }}
        value={plugin.params.release ?? 50}
        onChange={(v) => onParamChange("release", v)}
      />
    </ScrollView>
  );
}

function ClipperEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  const mode = plugin.params.mode ?? 0;
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="bg-[#0b0b0d] rounded-xl border border-dark-border mb-3 p-4">
        <View className="items-center mb-2">
          <Text className="text-gray-500 text-[9px] tracking-wider uppercase">
            Clip Mode
          </Text>
          <View className="flex-row gap-2 mt-2">
            {["Soft", "Hard"].map((label, i) => (
              <Pressable
                key={label}
                onPress={() => onParamChange("mode", i)}
                className={`flex-1 py-2 rounded-lg items-center border ${mode === i ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-surface border-dark-border"}`}
              >
                <Text
                  className={`text-xs font-bold ${mode === i ? "text-brand-accent" : "text-gray-400"}`}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <ParamRow
        param={{
          id: "threshold",
          label: "Threshold",
          min: -30,
          max: 0,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.threshold ?? -3}
        onChange={(v) => onParamChange("threshold", v)}
      />
      <ParamRow
        param={{
          id: "ceiling",
          label: "Ceiling",
          min: -6,
          max: 0,
          step: 0.1,
          unit: "dB",
        }}
        value={plugin.params.ceiling ?? -0.5}
        onChange={(v) => onParamChange("ceiling", v)}
      />
      <ParamRow
        param={{
          id: "mix",
          label: "Mix",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.mix ?? 100}
        onChange={(v) => onParamChange("mix", v)}
      />
      <Text className="text-gray-600 text-[10px] mt-2 text-center">
        Clipper segura transientes antes do limiter, aumentando loudness
        perceptível.
      </Text>
    </ScrollView>
  );
}

function NoiseGateEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <ParamRow
        param={{
          id: "threshold",
          label: "Threshold",
          min: -80,
          max: 0,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.threshold ?? -40}
        onChange={(v) => onParamChange("threshold", v)}
      />
      <ParamRow
        param={{
          id: "ratio",
          label: "Ratio",
          min: 2,
          max: 20,
          step: 1,
          unit: ":1",
        }}
        value={plugin.params.ratio ?? 10}
        onChange={(v) => onParamChange("ratio", v)}
      />
      <ParamRow
        param={{
          id: "attack",
          label: "Attack",
          min: 0.1,
          max: 50,
          step: 0.1,
          unit: "ms",
        }}
        value={plugin.params.attack ?? 1}
        onChange={(v) => onParamChange("attack", v)}
      />
      <ParamRow
        param={{
          id: "release",
          label: "Release",
          min: 10,
          max: 1000,
          step: 10,
          unit: "ms",
        }}
        value={plugin.params.release ?? 100}
        onChange={(v) => onParamChange("release", v)}
      />
      <ParamRow
        param={{
          id: "range",
          label: "Range",
          min: 0,
          max: 80,
          step: 1,
          unit: "dB",
        }}
        value={plugin.params.range ?? 60}
        onChange={(v) => onParamChange("range", v)}
      />
      <ParamRow
        param={{
          id: "hold",
          label: "Hold",
          min: 0,
          max: 500,
          step: 10,
          unit: "ms",
        }}
        value={plugin.params.hold ?? 20}
        onChange={(v) => onParamChange("hold", v)}
      />
      <Text className="text-gray-600 text-[10px] mt-2 text-center">
        Noise Gate reduz ruído de fundo quando o sinal está abaixo do threshold.
      </Text>
    </ScrollView>
  );
}

function AutoPitchEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  const keys = [
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
  const scales = ["Maior", "Menor", "Cromático"];
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <ParamRow
        param={{
          id: "amount",
          label: "Amount",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.amount ?? 70}
        onChange={(v) => onParamChange("amount", v)}
      />
      <ParamRow
        param={{
          id: "speed",
          label: "Speed",
          min: 1,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.speed ?? 30}
        onChange={(v) => onParamChange("speed", v)}
      />
      <ParamRow
        param={{
          id: "formant",
          label: "Formant",
          min: -12,
          max: 12,
          step: 1,
          unit: "st",
        }}
        value={plugin.params.formant ?? 0}
        onChange={(v) => onParamChange("formant", v)}
      />
      <ParamRow
        param={{
          id: "vibrato",
          label: "Vibrato",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.vibrato ?? 15}
        onChange={(v) => onParamChange("vibrato", v)}
      />
      <ParamRow
        param={{
          id: "mix",
          label: "Mix",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.mix ?? 80}
        onChange={(v) => onParamChange("mix", v)}
      />
      <View className="mb-2">
        <Text className="text-gray-400 text-xs font-medium mb-1">Key</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-1.5 flex-wrap" style={{ width: 300 }}>
            {keys.map((k, i) => (
              <Pressable
                key={k}
                onPress={() => onParamChange("key", i)}
                className={`w-9 h-9 rounded-lg items-center justify-center border ${(plugin.params.key ?? 0) === i ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-surface border-dark-border"}`}
              >
                <Text
                  className={`text-xs font-semibold ${(plugin.params.key ?? 0) === i ? "text-brand-accent" : "text-white"}`}
                >
                  {k}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
      <View className="mb-2">
        <Text className="text-gray-400 text-xs font-medium mb-1">Scale</Text>
        <View className="flex-row gap-2">
          {scales.map((s, i) => (
            <Pressable
              key={s}
              onPress={() => onParamChange("scale", i)}
              className={`flex-1 py-2.5 rounded-lg items-center border ${(plugin.params.scale ?? 0) === i ? "bg-dark-muted border-gray-500" : "bg-dark-surface border-dark-border"}`}
            >
              <Text
                className={`text-xs font-semibold ${(plugin.params.scale ?? 0) === i ? "text-white" : "text-gray-400"}`}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Text className="text-gray-600 text-[10px] mt-2 text-center">
        Auto-Pitch corrige a afinação da voz para a escala selecionada.
      </Text>
    </ScrollView>
  );
}

function BassMonoEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <ParamRow
        param={{
          id: "crossover",
          label: "Crossover",
          min: 40,
          max: 500,
          step: 1,
          unit: "Hz",
        }}
        value={plugin.params.crossover ?? 150}
        onChange={(v) => onParamChange("crossover", v)}
      />
      <ParamRow
        param={{
          id: "amount",
          label: "Amount",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.amount ?? 100}
        onChange={(v) => onParamChange("amount", v)}
      />
      <ParamRow
        param={{
          id: "dryWet",
          label: "Dry/Wet",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.dryWet ?? 100}
        onChange={(v) => onParamChange("dryWet", v)}
      />
      <View className="mb-2">
        <Text className="text-gray-400 text-xs font-medium mb-1">Phase</Text>
        <View className="flex-row gap-2">
          {["Normal", "Invert"].map((label, i) => (
            <Pressable
              key={label}
              onPress={() => onParamChange("phase", i)}
              className={`flex-1 py-2.5 rounded-lg items-center border ${(plugin.params.phase ?? 0) === i ? "bg-dark-muted border-gray-500" : "bg-dark-surface border-dark-border"}`}
            >
              <Text
                className={`text-xs font-semibold ${(plugin.params.phase ?? 0) === i ? "text-white" : "text-gray-400"}`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Text className="text-gray-600 text-[10px] mt-2 text-center">
        Bass Mono soma as frequências abaixo do crossover para mono, garantindo
        graves centrados.
      </Text>
    </ScrollView>
  );
}

function StereoWidenerEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <ParamRow
        param={{
          id: "width",
          label: "Largura",
          min: 0,
          max: 200,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.width ?? 120}
        onChange={(v) => onParamChange("width", v)}
      />
      <ParamRow
        param={{
          id: "midGain",
          label: "Mid Gain",
          min: -12,
          max: 12,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.midGain ?? 0}
        onChange={(v) => onParamChange("midGain", v)}
      />
      <ParamRow
        param={{
          id: "sideGain",
          label: "Side Gain",
          min: -12,
          max: 12,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.sideGain ?? 0}
        onChange={(v) => onParamChange("sideGain", v)}
      />
      <ParamRow
        param={{
          id: "crossover",
          label: "Crossover",
          min: 20,
          max: 1000,
          step: 1,
          unit: "Hz",
        }}
        value={plugin.params.crossover ?? 200}
        onChange={(v) => onParamChange("crossover", v)}
      />
      <ParamRow
        param={{
          id: "stereoize",
          label: "Estereoizar",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.stereoize ?? 30}
        onChange={(v) => onParamChange("stereoize", v)}
      />
      <ParamRow
        param={{
          id: "mix",
          label: "Mix",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.mix ?? 100}
        onChange={(v) => onParamChange("mix", v)}
      />
      <Text className="text-gray-600 text-[10px] mt-2 text-center">
        Stereo Widener processa o sinal M/S para alargar ou estreitar a imagem
        estéreo.
      </Text>
    </ScrollView>
  );
}

function UtilityEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <ParamRow
        param={{
          id: "gain",
          label: "Gain",
          min: -24,
          max: 24,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.gain ?? 0}
        onChange={(v) => onParamChange("gain", v)}
      />
      <ParamRow
        param={{
          id: "pan",
          label: "Pan",
          min: -100,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.pan ?? 0}
        onChange={(v) => onParamChange("pan", v)}
      />
      <View className="mb-2">
        <Text className="text-gray-400 text-xs font-medium mb-1">
          Phase Invert
        </Text>
        <View className="flex-row gap-2">
          {["Normal", "Invert"].map((label, i) => (
            <Pressable
              key={label}
              onPress={() => onParamChange("phase", i)}
              className={`flex-1 py-2.5 rounded-lg items-center border ${(plugin.params.phase ?? 0) === i ? "bg-dark-muted border-gray-500" : "bg-dark-surface border-dark-border"}`}
            >
              <Text
                className={`text-xs font-semibold ${(plugin.params.phase ?? 0) === i ? "text-white" : "text-gray-400"}`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function VoiceCleanerEditor({
  plugin,
  onParamChange,
}: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
}) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <ParamRow
        param={{
          id: "threshold",
          label: "Threshold",
          min: -80,
          max: 0,
          step: 0.5,
          unit: "dB",
        }}
        value={plugin.params.threshold ?? -40}
        onChange={(v) => onParamChange("threshold", v)}
      />
      <ParamRow
        param={{
          id: "highpass",
          label: "High-Pass",
          min: 20,
          max: 500,
          step: 1,
          unit: "Hz",
        }}
        value={plugin.params.highpass ?? 80}
        onChange={(v) => onParamChange("highpass", v)}
      />
      <ParamRow
        param={{
          id: "reduction",
          label: "Reduction",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.reduction ?? 40}
        onChange={(v) => onParamChange("reduction", v)}
      />
      <ParamRow
        param={{
          id: "mix",
          label: "Mix",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
        }}
        value={plugin.params.mix ?? 100}
        onChange={(v) => onParamChange("mix", v)}
      />
      <Text className="text-gray-600 text-[10px] mt-2 text-center">
        Voice Cleaner remove ruído de fundo com high-pass e noise gate.
      </Text>
    </ScrollView>
  );
}

type EditorComp = (props: {
  plugin: Plugin;
  onParamChange: (id: string, v: number) => void;
  onParamLearn?: (pluginId: string, paramId: string) => void;
  midiLearnState?: MidiLearnState;
  bpm?: number;
}) => React.JSX.Element;

const EDITOR_MAP: Record<string, EditorComp> = {
  eq: EqEditor,
  compressor: CompressorEditor,
  limiter: LimiterEditor,
  distortion: DistortionEditor,
  reverb: ReverbEditor,
  delay: DelayEditor,
  multibandCompressor: MultibandCompEditor,
  stereoImager: StereoImagerEditor,
  deesser: DeesserEditor,
  tapeSaturator: TapeSatEditor,
  truePeakLimiter: TruePeakEditor,
  clipper: ClipperEditor,
  noiseGate: NoiseGateEditor,
  autoPitch: AutoPitchEditor,
  bassMono: BassMonoEditor,
  stereoWidener: StereoWidenerEditor,
  utility: UtilityEditor,
  voiceCleaner: VoiceCleanerEditor,
};

export function PluginEditor({
  plugin,
  onParamChange,
  onToggle,
  onClose,
  bpm,
  testID,
  trackId,
  contextTime = 0,
  playing = false,
  velocity,
  noteNumber,
}: PluginEditorProps) {
  const [midiLearnState, setMidiLearnState] = useState<MidiLearnState>(() => ({
    mappings: loadMappings(),
    learningMode: false,
    activeTarget: null,
  }));

  const stateRef = useRef(midiLearnState);
  stateRef.current = midiLearnState;

  const toggleLearnMode = useCallback(() => {
    setMidiLearnState((prev) => {
      if (prev.learningMode) {
        stopLearning(prev);
        return { ...prev };
      }
      return { ...prev };
    });
  }, []);

  const handleMidiCC = useCallback(
    (cc: number, value: number) => {
      const result = processMidiCC(cc, value, stateRef.current);
      if (result) {
        onParamChange(result.pluginId, result.paramId, result.normalizedValue);
      }
    },
    [onParamChange],
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    const handleMidiMessage = (event: MIDIMessageEvent) => {
      const data = event.data;
      if (!data || data.length < 3) return;
      const status = data[0];
      const cc = data[1];
      const value = data[2];
      const isCC = (status & 0xf0) === 0xb0;
      if (isCC) {
        handleMidiCC(cc, value);
      }
    };

    let midiAccess: MIDIAccess | null = null;

    navigator.requestMIDIAccess?.({ sysex: false }).then(
      (access) => {
        midiAccess = access;
        access.inputs.forEach((input) => {
          input.onmidimessage = handleMidiMessage;
        });
        access.onstatechange = () => {
          access.inputs.forEach((input) => {
            input.onmidimessage = handleMidiMessage;
          });
        };
      },
      () => {
        // MIDI not available
      },
    );

    return () => {
      if (midiAccess) {
        midiAccess.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
      }
    };
  }, [handleMidiCC]);

  const handleParamLearn = useCallback(
    (pluginId: string, paramId: string) => {
      if (!midiLearnState.learningMode || !trackId) return;
      setMidiLearnState((prev) => {
        if (!prev.learningMode) return prev;
        startLearning(
          { pluginId, paramId, trackId },
          prev,
        );
        return { ...prev };
      });
    },
    [midiLearnState.learningMode, trackId],
  );

  if (!plugin) return null;

  const spec = PLUGIN_SPECS[plugin.type];

  const handleParamChange = (paramId: string, value: number) => {
    onParamChange(plugin.id, paramId, value);
  };

  const EditorComponent = EDITOR_MAP[plugin.type] || null;

  return (
    <ModulationContext.Provider
      value={{ contextTime, playing, velocity, noteNumber }}
    >
      <View
        testID={testID}
        className="absolute inset-0 z-50 bg-black/70 justify-end"
      >
        <View className="bg-dark-elevated border-t border-dark-border rounded-t-3xl max-h-[85%]">
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-dark-border">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => onToggle(plugin.id)}
                className={`w-10 h-10 rounded-xl items-center justify-center border ${
                  plugin.enabled
                    ? "bg-dark-surface border-dark-border"
                    : "bg-dark-surface/50 border-dark-border/30"
                }`}
              >
                <Text
                  className={`text-base ${plugin.enabled ? "text-white" : "text-gray-600"}`}
                >
                  {PLUGIN_ICONS[plugin.type] || "≡"}
                </Text>
              </Pressable>
              <View>
                <Text className="text-white text-base font-bold">
                  {plugin.name}
                </Text>
                <Text className="text-gray-500 text-[10px] uppercase tracking-wider">
                  {plugin.type}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={toggleLearnMode}
                className={`px-3 py-1.5 rounded-lg border items-center ${
                  midiLearnState.learningMode
                    ? "bg-brand-accent/20 border-brand-accent"
                    : "bg-dark-surface border-dark-border"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    midiLearnState.learningMode
                      ? "text-brand-accent"
                      : "text-gray-400"
                  }`}
                >
                  MIDI Learn
                </Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-dark-surface items-center justify-center active:opacity-70"
              >
                <Text className="text-gray-400 text-lg">✕</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView className="px-5 py-4" style={{ maxHeight: 500 }}>
            {EditorComponent ? (
              <EditorComponent
                plugin={plugin}
                onParamChange={handleParamChange}
                onParamLearn={handleParamLearn}
                midiLearnState={midiLearnState}
                bpm={bpm}
              />
            ) : spec ? (
              <View className="py-4">
                {spec.params.map((p) => (
                  <ParamRow
                    key={p.id}
                    param={p}
                    value={plugin.params[p.id] ?? p.default}
                    onChange={(v) => handleParamChange(p.id, v)}
                    onLearn={
                      midiLearnState.learningMode
                        ? () => handleParamLearn(plugin.id, p.id)
                        : undefined
                    }
                    isLearning={
                      midiLearnState.learningMode &&
                      isLearning(
                        midiLearnState,
                        plugin.id,
                        p.id,
                        trackId ?? "",
                      )
                    }
                  />
                ))}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </ModulationContext.Provider>
  );
}

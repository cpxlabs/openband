import { useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import type {
  PluginDescriptor,
  PluginParameter,
} from "../lib/wasmPluginHost";
import { createGenericPluginUI } from "../lib/wasmPluginHost";

interface PluginUIProps {
  descriptor: PluginDescriptor;
  paramValues: Record<string, number>;
  onParamChange: (paramId: string, value: number) => void;
  onToggle?: (enabled: boolean) => void;
  onClose?: () => void;
}

function ParamSlider({
  param,
  value,
  onChange,
}: {
  param: PluginParameter;
  value: number;
  onChange: (v: number) => void;
}) {
  const normalized = param.max > param.min
    ? ((value - param.min) / (param.max - param.min)) * 100
    : 0;

  const displayValue = param.type === "int"
    ? Math.round(value).toString()
    : value.toFixed(param.step && param.step < 0.01 ? 3 : 2);

  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-[11px] text-neutral-400 font-medium">{param.name}</Text>
        <Text className="text-[11px] text-neutral-500">
          {displayValue}{param.unit ? ` ${param.unit}` : ""}
        </Text>
      </View>

      {param.type === "bool" ? (
        <Pressable
          className="h-6 rounded bg-neutral-800 flex-row items-center px-1"
          onPress={() => onChange(value > 0.5 ? 0 : 1)}
        >
          <View
            className={`w-5 h-5 rounded-sm ${value > 0.5 ? "bg-purple-500" : "bg-neutral-700"}`}
          />
          <Text className="text-[10px] text-neutral-300 ml-2">
            {value > 0.5 ? "ON" : "OFF"}
          </Text>
        </Pressable>
      ) : param.type === "enum" && param.enumValues ? (
        <View className="flex-row gap-1">
          {param.enumValues.map((v, i) => (
            <Pressable
              key={v}
              className={`flex-1 py-1 rounded ${
                Math.round(value) === i ? "bg-purple-600" : "bg-neutral-800"
              }`}
              onPress={() => onChange(i)}
            >
              <Text className="text-[10px] text-neutral-300 text-center">{v}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View>
          <View className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <View
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, normalized))}%` }}
            />
          </View>
          <input
            type="range"
            min={param.min}
            max={param.max}
            step={param.step ?? (param.max - param.min) / 1000}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1.5 opacity-0 cursor-pointer -mt-1.5"
          />
        </View>
      )}
    </View>
  );
}

export function PluginUI({
  descriptor,
  paramValues,
  onParamChange,
  onToggle,
  onClose,
}: PluginUIProps) {
  const [enabled, setEnabled] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const uiState = useMemo(
    () => createGenericPluginUI(descriptor, paramValues, onParamChange),
    [descriptor, onParamChange],
  );

  const toggleGroup = useCallback(
    (group: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(group)) next.delete(group);
        else next.add(group);
        return next;
      });
    },
    [],
  );

  return (
    <View className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 w-64">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2 flex-1">
          <Pressable
            onPress={() => {
              setEnabled(!enabled);
              onToggle?.(!enabled);
            }}
          >
            <View
              className={`w-3 h-3 rounded-full ${enabled ? "bg-green-500" : "bg-red-500"}`}
            />
          </Pressable>
          <Text className="text-sm text-white font-semibold" numberOfLines={1}>
            {descriptor.name}
          </Text>
        </View>
        {onClose && (
          <Pressable onPress={onClose}>
            <Text className="text-neutral-500 text-sm">✕</Text>
          </Pressable>
        )}
      </View>

      <Text className="text-[10px] text-neutral-500 mb-2">
        {descriptor.author} · v{descriptor.version} · {descriptor.category}
      </Text>

      <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
        {Array.from(uiState.groups.entries()).map(([group, params]) => (
          <View key={group} className="mb-2">
            <Pressable
              className="flex-row items-center justify-between py-1"
              onPress={() => toggleGroup(group)}
            >
              <Text className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider">
                {group}
              </Text>
              <Text className="text-neutral-600 text-xs">
                {collapsed.has(group) ? "▸" : "▾"}
              </Text>
            </Pressable>

            {!collapsed.has(group) &&
              params.map((param) => (
                <ParamSlider
                  key={param.id}
                  param={param}
                  value={paramValues[param.id] ?? param.default}
                  onChange={(v) => onParamChange(param.id, v)}
                />
              ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

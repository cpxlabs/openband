import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type { Plugin } from '../lib/types';
import { PLUGIN_PRESETS, PLUGIN_ICONS, PLUGIN_SPECS, getDefaultParams } from '../lib/types';

function formatPluginType(type: string): string {
  switch (type) {
    case 'multibandCompressor': return 'MULTI COMP';
    case 'truePeakLimiter': return 'TRUE PEAK';
    case 'stereoImager': return 'STEREO IMG';
    case 'tapeSaturator': return 'TAPE SAT';
    default: return type.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
  }
}

interface PluginRackProps {
  plugins: Plugin[];
  onChange: (plugins: Plugin[]) => void;
  onEdit?: (plugin: Plugin) => void;
  trackName?: string;
  maxSlots?: number;
}

export function PluginRack({ plugins, onChange, onEdit, trackName, maxSlots = 8 }: PluginRackProps) {
  const [showAdd, setShowAdd] = useState(false);

  const togglePlugin = useCallback((id: string) => {
    onChange(plugins.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  }, [plugins, onChange]);

  const removePlugin = useCallback((id: string) => {
    onChange(plugins.filter(p => p.id !== id));
  }, [plugins, onChange]);

  const addPlugin = useCallback((preset: Partial<Plugin>) => {
    if (plugins.length >= maxSlots) return;
    const type = PLUGIN_SPECS[preset.type as keyof typeof PLUGIN_SPECS] ? (preset.type as Plugin['type']) : 'utility';
    const plugin: Plugin = {
      id: `plugin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: preset.name || 'Plugin',
      type,
      enabled: true,
      params: getDefaultParams(type),
      color: preset.color || '#888',
    };
    onChange([...plugins, plugin]);
    setShowAdd(false);
  }, [plugins, onChange, maxSlots]);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    const next = [...plugins];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }, [plugins, onChange]);

  const moveDown = useCallback((index: number) => {
    if (index >= plugins.length - 1) return;
    const next = [...plugins];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }, [plugins, onChange]);

  return (
    <View className="bg-dark-surface/80 rounded-xl border border-dark-border">
      <Pressable
        onPress={() => setShowAdd(!showAdd)}
        className="flex-row items-center justify-between px-3 py-2 border-b border-dark-border/50"
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">
            {trackName ? `${trackName}` : 'Insert FX'}
          </Text>
          <Text className="text-gray-600 text-xs">{plugins.length}/{maxSlots}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          {plugins.length > 0 && (
            <View className="flex-row -space-x-1">
              {plugins.filter(p => p.enabled).slice(0, 3).map(p => (
                <View key={p.id} className="w-2 h-2 rounded-full border border-dark-bg" style={{ backgroundColor: p.color }} />
              ))}
            </View>
          )}
          <Text className="text-brand-accent text-xs font-bold ml-1">{showAdd ? '−' : '+'}</Text>
        </View>
      </Pressable>

      {plugins.map((plugin, index) => (
        <Pressable
          key={plugin.id}
          onPress={() => onEdit?.(plugin)}
          className="flex-row items-center gap-2 px-3 py-2 border-b border-dark-border/30 active:opacity-80"
        >
          <Pressable
            onPress={() => togglePlugin(plugin.id)}
            className={`w-12 h-7 rounded-lg border items-center justify-center ${
              plugin.enabled
                ? 'bg-dark-elevated border-dark-border'
                : 'bg-dark-surface border-dark-border/50'
            }`}
          >
            <Text
              className={`text-xs font-bold ${plugin.enabled ? 'text-white' : 'text-gray-600'}`}
              style={{ color: plugin.enabled ? plugin.color : undefined }}
            >
              {PLUGIN_ICONS[plugin.type] || '≡'}
            </Text>
          </Pressable>

          <View className="flex-1">
            <Text className={`text-xs font-semibold ${plugin.enabled ? 'text-gray-200' : 'text-gray-600'}`}>
              {plugin.name}
            </Text>
            <Text className={`text-[9px] ${plugin.enabled ? 'text-gray-500' : 'text-gray-700'}`}>
              {formatPluginType(plugin.type)}
            </Text>
          </View>

          {onEdit && (
            <View className="w-6 h-6 rounded items-center justify-center">
              <Text className="text-gray-600 text-xs">▸</Text>
            </View>
          )}

          <Pressable
            onPress={() => moveUp(index)}
            className={`w-6 h-6 rounded items-center justify-center ${index === 0 ? 'opacity-20' : 'active:opacity-70'}`}
          >
            <Text className="text-gray-500 text-xs">▲</Text>
          </Pressable>
          <Pressable
            onPress={() => moveDown(index)}
            className={`w-6 h-6 rounded items-center justify-center ${index >= plugins.length - 1 ? 'opacity-20' : 'active:opacity-70'}`}
          >
            <Text className="text-gray-500 text-xs">▼</Text>
          </Pressable>
          <Pressable
            onPress={() => removePlugin(plugin.id)}
            className="w-6 h-6 rounded items-center justify-center active:opacity-70"
          >
            <Text className="text-gray-600 text-xs">✕</Text>
          </Pressable>
        </Pressable>
      ))}

      {showAdd && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-3 py-2">
          <View className="flex-row gap-1.5">
            {PLUGIN_PRESETS.map((preset, i) => {
              const presetName = preset.name || 'Plugin';
              const presetType = (preset.type || 'utility') as string;
              return (
                <Pressable
                  key={`${presetName}-${i}`}
                  onPress={() => addPlugin(preset)}
                  className="px-3 py-2 rounded-lg border border-dark-border bg-dark-surface items-center active:opacity-70"
                >
                  <Text className="text-white text-xs font-semibold">{presetName}</Text>
                  <Text className="text-gray-500 text-[9px] mt-0.5">
                    {PLUGIN_ICONS[presetType] || '≡'} {formatPluginType(presetType).toLowerCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {plugins.length === 0 && !showAdd && (
        <View className="py-3 items-center">
          <Text className="text-gray-600 text-xs">Nenhum plugin inserido</Text>
          <Pressable
            onPress={() => setShowAdd(true)}
            className="mt-1"
          >
            <Text className="text-brand-accent text-xs font-bold">+ Adicionar Plugin</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function MasterRack({ plugins, onChange, onEdit }: { plugins: Plugin[]; onChange: (p: Plugin[]) => void; onEdit?: (p: Plugin) => void }) {
  return (
    <View className="mt-2">
      <View className="flex-row items-center gap-2 mb-1.5 px-1">
        <View className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        <Text className="label text-amber-400/70">Master</Text>
      </View>
      <PluginRack plugins={plugins} onChange={onChange} onEdit={onEdit} maxSlots={8} />
    </View>
  );
}

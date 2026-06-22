import { View, Text, Pressable, ScrollView } from 'react-native';
import type { Plugin } from '../lib/types';
import { PLUGIN_ICONS } from '../lib/types';
import { MASTERING_PLUGIN_DEFS } from '../lib/masteringSuite';

interface MasteringChainProps {
  plugins: Plugin[];
  onToggle: (pluginId: string) => void;
  onEdit: (plugin: Plugin) => void;
  onReset: () => void;
}

export function MasteringChain({ plugins, onToggle, onEdit, onReset }: MasteringChainProps) {
  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <View className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Cadeia de Masterização</Text>
        </View>
        <Pressable onPress={onReset} className="px-2.5 py-1 rounded-lg bg-dark-surface border border-dark-border active:opacity-70">
          <Text className="text-gray-400 text-[10px] font-medium">Reset</Text>
        </Pressable>
      </View>
      <View className="relative">
        <View className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-dark-border" />
        {plugins.map((plugin, i) => {
          const def = MASTERING_PLUGIN_DEFS[i];
          return (
            <View key={plugin.id} className="flex-row items-center mb-2">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center border-2 z-10 ${plugin.enabled ? 'border-rose-500/40 bg-dark-surface' : 'border-dark-border bg-dark-surface/50'}`}
                style={{ borderColor: plugin.enabled ? plugin.color : undefined }}
              >
                <Text className={`text-sm ${plugin.enabled ? 'text-white' : 'text-gray-600'}`}>
                  {i + 1}
                </Text>
              </View>
              <Pressable
                onPress={() => onEdit(plugin)}
                className={`flex-1 flex-row items-center gap-3 ml-2 px-3 py-3 rounded-xl border ${plugin.enabled ? 'bg-dark-surface/80 border-dark-border' : 'bg-dark-surface/30 border-dark-border/30'}`}
              >
                <Text className={`text-base ${plugin.enabled ? 'text-white' : 'text-gray-600'}`}>
                  {PLUGIN_ICONS[plugin.type] || '≡'}
                </Text>
                <View className="flex-1">
                  <Text className={`text-xs font-semibold ${plugin.enabled ? 'text-white' : 'text-gray-500'}`}>
                    {plugin.name}
                  </Text>
                  <Text className={`text-[9px] ${plugin.enabled ? 'text-gray-500' : 'text-gray-600'}`}>
                    {def?.description || plugin.type}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onToggle(plugin.id)}
                  className={`w-8 h-6 rounded-md border items-center justify-center ${plugin.enabled ? 'bg-rose-500/20 border-rose-500/30' : 'bg-dark-surface border-dark-border/30'}`}
                >
                  <Text className={`text-[9px] font-bold ${plugin.enabled ? 'text-rose-400' : 'text-gray-600'}`}>
                    {plugin.enabled ? 'ON' : 'OFF'}
                  </Text>
                </Pressable>
                <Text className="text-gray-500 text-xs ml-1">▸</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

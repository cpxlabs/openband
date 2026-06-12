import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type { GuitarPedal, AmpModel, CabModel, TrackAmpChain } from '../lib/types';
import { PEDAL_PRESETS, AMP_PRESETS, CAB_PRESETS } from '../lib/types';

interface PedalRackProps {
  chain: TrackAmpChain;
  onChange: (chain: TrackAmpChain) => void;
  trackName?: string;
  maxHeight?: number;
}

function PedalSlot({ pedal, index, onToggle, onReplace, onRemove }:
  { pedal: GuitarPedal | null; index: number; onToggle: () => void; onReplace: (p: GuitarPedal) => void; onRemove: () => void }) {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <View className="w-20 items-center gap-1">
      <Pressable onPress={onToggle}
        className={`w-full aspect-square rounded-xl border-2 items-center justify-center ${pedal?.enabled ? 'bg-dark-muted border-brand-accent' : pedal ? 'bg-dark-surface border-dark-border' : 'bg-dark-surface/30 border-dashed border-dark-border/50'}`}>
        {pedal ? (
          <View className="items-center">
            <View className={`w-3 h-3 rounded-full mb-0.5 ${pedal.enabled ? 'bg-green-500' : 'bg-gray-600'}`} />
            <Text className="text-[8px] text-gray-400 text-center leading-tight px-0.5">{pedal.name}</Text>
            <Text className="text-[7px] text-gray-600">{pedal.brand}</Text>
          </View>
        ) : (
          <Text className="text-[20px] text-gray-600">+</Text>
        )}
      </Pressable>
      <Text className="text-[8px] text-gray-600">{index + 1}</Text>
      {pedal && (
        <View className="flex-row gap-1">
          <Pressable onPress={() => setShowPicker(!showPicker)}
            className="px-1.5 py-0.5 rounded bg-dark-muted/30 active:opacity-70">
            <Text className="text-[7px] text-gray-500">🔁</Text>
          </Pressable>
          <Pressable onPress={onRemove} className="px-1.5 py-0.5 rounded bg-red-500/20 active:opacity-70">
            <Text className="text-[7px] text-red-400">×</Text>
          </Pressable>
        </View>
      )}
      {showPicker && (
        <View className="absolute top-full left-0 z-50 w-48 bg-dark-elevated border border-dark-border rounded-xl p-2 shadow-2xl" style={{ maxHeight: 200 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {PEDAL_PRESETS.map((preset, i) => (
              <Pressable key={i} onPress={() => { onReplace({ id: `pedal-${Date.now()}-${i}`, ...preset, enabled: true } as GuitarPedal); setShowPicker(false); }}
                className="flex-row items-center gap-2 py-1.5 px-2 rounded-lg active:bg-dark-muted/40">
                <Text className="text-[10px] text-gray-400 flex-1">{preset.brand} {preset.name}</Text>
                <Text className="text-[8px] text-gray-600 uppercase">{preset.type}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function AmpSelector({ amp, onSelect, onRemove }:
  { amp: AmpModel | null; onSelect: (a: AmpModel) => void; onRemove: () => void }) {
  const [showPicker, setShowPicker] = useState(false);
  const brands = [...new Set(AMP_PRESETS.map(a => a.brand))];
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const filtered = selectedBrand ? AMP_PRESETS.filter(a => a.brand === selectedBrand) : AMP_PRESETS;
  return (
    <View className="relative">
      <Pressable onPress={() => setShowPicker(!showPicker)}
        className={`w-full rounded-xl border-2 p-2.5 ${amp ? 'bg-dark-surface border-orange-500/60' : 'bg-dark-surface/30 border-dashed border-dark-border/50'}`}>
        {amp ? (
          <View>
            <Text className="text-[9px] text-white font-bold">{amp.name}</Text>
            <Text className="text-[8px] text-gray-500">{amp.brand} · {amp.type}</Text>
            <View className="flex-row gap-1 mt-1">
              {(['gain', 'bass', 'mid', 'treble'] as const).map(k => (
                <View key={k} className="flex-1 items-center">
                  <View className="h-6 w-full bg-dark-bg rounded-full overflow-hidden">
                    <View className="w-full rounded-full bg-orange-500/70" style={{ height: `${(amp.params[k] / 10) * 100}%` }} />
                  </View>
                  <Text className="text-[6px] text-gray-600 uppercase mt-0.5">{k[0]}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View className="items-center py-2">
            <Text className="text-[10px] text-gray-500 font-bold uppercase">Amp</Text>
            <Text className="text-[16px] text-gray-600">+</Text>
          </View>
        )}
      </Pressable>
      {amp && (
        <Pressable onPress={onRemove} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/30 items-center justify-center">
          <Text className="text-red-400 text-[10px]">×</Text>
        </Pressable>
      )}
      {showPicker && (
        <View className="absolute top-full left-0 z-50 w-64 bg-dark-elevated border border-dark-border rounded-xl p-2 shadow-2xl" style={{ maxHeight: 260 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1.5">
            <View className="flex-row gap-1">
              <Pressable onPress={() => setSelectedBrand(null)}
                className={`px-2 py-1 rounded-md ${!selectedBrand ? 'bg-orange-500/30 border border-orange-500' : 'bg-dark-surface border border-dark-border'}`}>
                <Text className={`text-[9px] ${!selectedBrand ? 'text-orange-400' : 'text-gray-400'}`}>Todos</Text>
              </Pressable>
              {brands.map(b => (
                <Pressable key={b} onPress={() => setSelectedBrand(b)}
                  className={`px-2 py-1 rounded-md ${selectedBrand === b ? 'bg-orange-500/30 border border-orange-500' : 'bg-dark-surface border border-dark-border'}`}>
                  <Text className={`text-[9px] ${selectedBrand === b ? 'text-orange-400' : 'text-gray-400'}`}>{b}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 180 }}>
            {filtered.map(a => (
              <Pressable key={a.id} onPress={() => { onSelect(a); setShowPicker(false); }}
                className="flex-row items-center gap-2 py-1.5 px-2 rounded-lg active:bg-dark-muted/40">
                <View>
                  <Text className="text-[10px] text-gray-300 font-medium">{a.name}</Text>
                  <Text className="text-[8px] text-gray-500">{a.brand} · {a.type}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function CabSelector({ cab, onSelect, onRemove }:
  { cab: CabModel | null; onSelect: (c: CabModel) => void; onRemove: () => void }) {
  const [showPicker, setShowPicker] = useState(false);
  const brands = [...new Set(CAB_PRESETS.map(c => c.brand))];
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const filtered = selectedBrand ? CAB_PRESETS.filter(c => c.brand === selectedBrand) : CAB_PRESETS;
  return (
    <View className="relative">
      <Pressable onPress={() => setShowPicker(!showPicker)}
        className={`w-full rounded-xl border-2 p-2.5 ${cab ? 'bg-dark-surface border-amber-500/60' : 'bg-dark-surface/30 border-dashed border-dark-border/50'}`}>
        {cab ? (
          <View>
            <Text className="text-[9px] text-white font-bold">{cab.name}</Text>
            <Text className="text-[8px] text-gray-500">{cab.brand} · {cab.speakers}</Text>
            <View className="flex-row gap-2 mt-1">
              <View className="flex-1">
                <Text className="text-[7px] text-gray-600">Mic</Text>
                <View className="h-1.5 bg-dark-bg rounded-full overflow-hidden">
                  <View className="w-1/2 h-full bg-amber-500 rounded-full" style={{ width: `${cab.params.micPosition}%` }} />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-[7px] text-gray-600">Room</Text>
                <View className="h-1.5 bg-dark-bg rounded-full overflow-hidden">
                  <View className="w-1/2 h-full bg-amber-500 rounded-full" style={{ width: `${cab.params.room}%` }} />
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View className="items-center py-2">
            <Text className="text-[9px] text-gray-500 font-bold uppercase">Cab</Text>
            <Text className="text-[16px] text-gray-600">+</Text>
          </View>
        )}
      </Pressable>
      {cab && (
        <Pressable onPress={onRemove} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/30 items-center justify-center">
          <Text className="text-red-400 text-[10px]">×</Text>
        </Pressable>
      )}
      {showPicker && (
        <View className="absolute top-full left-0 z-50 w-64 bg-dark-elevated border border-dark-border rounded-xl p-2 shadow-2xl" style={{ maxHeight: 260 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1.5">
            <View className="flex-row gap-1">
              <Pressable onPress={() => setSelectedBrand(null)}
                className={`px-2 py-1 rounded-md ${!selectedBrand ? 'bg-amber-500/30 border border-amber-500' : 'bg-dark-surface border border-dark-border'}`}>
                <Text className={`text-[9px] ${!selectedBrand ? 'text-amber-400' : 'text-gray-400'}`}>Todos</Text>
              </Pressable>
              {brands.map(b => (
                <Pressable key={b} onPress={() => setSelectedBrand(b)}
                  className={`px-2 py-1 rounded-md ${selectedBrand === b ? 'bg-amber-500/30 border border-amber-500' : 'bg-dark-surface border border-dark-border'}`}>
                  <Text className={`text-[9px] ${selectedBrand === b ? 'text-amber-400' : 'text-gray-400'}`}>{b}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 180 }}>
            {filtered.map(c => (
              <Pressable key={c.id} onPress={() => { onSelect(c); setShowPicker(false); }}
                className="flex-row items-center gap-2 py-1.5 px-2 rounded-lg active:bg-dark-muted/40">
                <View>
                  <Text className="text-[10px] text-gray-300 font-medium">{c.name}</Text>
                  <Text className="text-[8px] text-gray-500">{c.brand} · {c.speakers}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export function PedalRack({ chain, onChange, trackName, maxHeight }: PedalRackProps) {
  const handleTogglePedal = (index: number) => {
    const pedals = [...chain.pedals];
    if (pedals[index]) pedals[index] = { ...pedals[index], enabled: !pedals[index].enabled };
    onChange({ ...chain, pedals });
  };

  const handleReplacePedal = (index: number, pedal: GuitarPedal) => {
    const pedals = [...chain.pedals];
    pedals[index] = pedal;
    onChange({ ...chain, pedals });
  };

  const handleRemovePedal = (index: number) => {
    const pedals = [...chain.pedals];
    pedals[index] = null as unknown as GuitarPedal;
    onChange({ ...chain, pedals: pedals.filter(Boolean) });
  };

  return (
    <View className="relative">
      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          {trackName ? `${trackName} — ` : ''}Pedalboard
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
        <View className="flex-row gap-2 py-1">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <PedalSlot key={i} index={i} pedal={chain.pedals[i] ?? null}
              onToggle={() => handleTogglePedal(i)}
              onReplace={(p) => handleReplacePedal(i, p)}
              onRemove={() => handleRemovePedal(i)}
            />
          ))}
          <View className="w-36">
            <AmpSelector amp={chain.amp} onSelect={(a) => onChange({ ...chain, amp: a })} onRemove={() => onChange({ ...chain, amp: null })} />
          </View>
          <View className="w-36">
            <CabSelector cab={chain.cab} onSelect={(c) => onChange({ ...chain, cab: c })} onRemove={() => onChange({ ...chain, cab: null })} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

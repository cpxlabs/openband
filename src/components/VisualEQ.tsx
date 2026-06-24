import { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';

interface EqBand {
  freq: number;
  gain: number;
  q: number;
  type: number;
  enabled: number;
}

interface VisualEQProps {
  bands: EqBand[];
  onChange: (index: number, params: Partial<EqBand>) => void;
  height?: number;
  testID?: string;
}

const PRESETS: { name: string; bands: EqBand[] }[] = [
  {
    name: 'Flat',
    bands: [
      { freq: 30, gain: 0, q: 0.71, type: 3, enabled: 0 },
      { freq: 120, gain: 0, q: 0.71, type: 1, enabled: 0 },
      { freq: 500, gain: 0, q: 0.71, type: 2, enabled: 0 },
      { freq: 1500, gain: 0, q: 0.71, type: 2, enabled: 0 },
      { freq: 5000, gain: 0, q: 0.71, type: 2, enabled: 0 },
      { freq: 10000, gain: 0, q: 0.71, type: 4, enabled: 0 },
      { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 0 },
      { freq: 18000, gain: 0, q: 0.71, type: 5, enabled: 0 },
    ],
  },
  {
    name: 'Voice',
    bands: [
      { freq: 30, gain: 0, q: 0.71, type: 3, enabled: 0 },
      { freq: 120, gain: 0.5, q: 0.71, type: 1, enabled: 1 },
      { freq: 500, gain: -0.5, q: 0.71, type: 2, enabled: 1 },
      { freq: 2500, gain: 3, q: 1.2, type: 2, enabled: 1 },
      { freq: 6000, gain: 2, q: 0.9, type: 2, enabled: 1 },
      { freq: 10000, gain: 1, q: 0.71, type: 2, enabled: 0 },
      { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 1 },
      { freq: 18000, gain: 0, q: 0.71, type: 5, enabled: 0 },
    ],
  },
  {
    name: 'Guitar',
    bands: [
      { freq: 30, gain: 0, q: 0.71, type: 3, enabled: 0 },
      { freq: 80, gain: 2, q: 0.6, type: 1, enabled: 1 },
      { freq: 200, gain: 1.5, q: 0.8, type: 2, enabled: 1 },
      { freq: 1500, gain: 0, q: 0.71, type: 2, enabled: 0 },
      { freq: 3000, gain: 2, q: 1, type: 2, enabled: 1 },
      { freq: 6000, gain: 1.5, q: 0.71, type: 2, enabled: 0 },
      { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 1 },
      { freq: 18000, gain: -1, q: 0.71, type: 5, enabled: 0 },
    ],
  },
  {
    name: 'Bass',
    bands: [
      { freq: 30, gain: 4, q: 0.71, type: 3, enabled: 0 },
      { freq: 60, gain: 3, q: 0.5, type: 1, enabled: 1 },
      { freq: 120, gain: 1, q: 0.71, type: 2, enabled: 1 },
      { freq: 500, gain: 0, q: 0.71, type: 2, enabled: 0 },
      { freq: 1500, gain: -1, q: 0.71, type: 2, enabled: 0 },
      { freq: 5000, gain: -2, q: 0.71, type: 2, enabled: 0 },
      { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 1 },
      { freq: 18000, gain: -2, q: 0.71, type: 5, enabled: 1 },
    ],
  },
  {
    name: 'Master',
    bands: [
      { freq: 30, gain: -1, q: 0.71, type: 3, enabled: 0 },
      { freq: 60, gain: -0.5, q: 0.71, type: 1, enabled: 1 },
      { freq: 400, gain: 0, q: 0.71, type: 2, enabled: 0 },
      { freq: 2000, gain: 0, q: 0.71, type: 2, enabled: 0 },
      { freq: 6000, gain: 0.5, q: 0.71, type: 2, enabled: 0 },
      { freq: 10000, gain: 0, q: 0.71, type: 4, enabled: 0 },
      { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 1 },
      { freq: 18000, gain: 0, q: 0.71, type: 5, enabled: 1 },
    ],
  },
];

export function VisualEQ({ bands, onChange, height = 140, testID }: VisualEQProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const freqToX = useCallback((freq: number, w: number) => {
    if (freq <= 0) return 0;
    const minLog = Math.log(20);
    const maxLog = Math.log(20000);
    return ((Math.log(freq) - minLog) / (maxLog - minLog)) * w;
  }, []);

  const gainToY = useCallback((gain: number, h: number) => {
    return ((18 - gain) / 36) * h;
  }, []);

  const applyPreset = useCallback((presetBands: EqBand[]) => {
    presetBands.forEach((band, i) => {
      if (i < bands.length) onChange(i, band);
    });
  }, [bands, onChange]);

  const w = 320;
  const h = height;

  const barData = useMemo(() => {
    const data: { gain: number }[] = [];
    for (let fi = 0; fi < 99; fi++) {
      const freq = 20 * Math.pow(20000 / 20, fi / 99);
      let totalGain = 0;
      for (const band of bands) {
        if (!band.enabled) continue;
        const g = band.gain;
        const f = band.freq;
        const qVal = band.q;
        const type = band.type;
        const ratio = freq / f;
        let contribution = 0;
        if (type === 2 || type === 3) {
          contribution = g / (1 + Math.pow((ratio - 1 / ratio) * qVal, 2));
        } else if (type === 1) {
          contribution = g * Math.exp(-0.5 * Math.pow(Math.log2(ratio) * 2, 2));
        } else if (type === 4) {
          contribution = g * Math.exp(-0.5 * Math.pow(Math.log2(ratio) * 2, 2));
        } else if (type === 0) {
          if (freq < f) contribution = g * 0.5 * (1 + Math.cos(Math.PI * Math.log2(ratio) / 2));
        } else if (type === 5) {
          if (freq > f) contribution = g * 0.5 * (1 + Math.cos(Math.PI * Math.log2(ratio) / 2));
        }
        totalGain += contribution;
      }
      data.push({ gain: Math.max(-18, Math.min(18, totalGain)) });
    }
    return data;
  }, [bands]);

  return (
    <View testID={testID} className="bg-dark-bg rounded-xl border border-dark-border overflow-hidden">
      <View className="flex-row items-center justify-between px-3 py-1.5 bg-dark-surface border-b border-dark-border">
        <Text className="text-gray-400 text-[10px] font-medium">Visual EQ</Text>
        <Pressable onPress={() => setShowPresets(!showPresets)} className="px-2 py-0.5 rounded bg-dark-muted active:opacity-70">
          <Text className="text-gray-400 text-[9px]">Presets</Text>
        </Pressable>
      </View>

      {showPresets && (
        <View className="flex-row flex-wrap gap-1 px-3 py-2 bg-dark-surface/50 border-b border-dark-border">
          {PRESETS.map(p => (
            <Pressable key={p.name} onPress={() => { applyPreset(p.bands); setShowPresets(false); }}
              className="px-2 py-0.5 rounded bg-dark-muted border border-dark-border active:opacity-70"
            >
              <Text className="text-gray-300 text-[9px]">{p.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View
        style={{ width: w, height: h }}
        className="relative"
        onStartShouldSetResponder={() => true}
        onResponderMove={(e) => {
          if (dragIndex === null) return;
          const x = e.nativeEvent.locationX;
          const y = e.nativeEvent.locationY;
          const minLog = Math.log(20);
          const maxLog = Math.log(20000);
          const freq = Math.round(Math.exp(minLog + (x / w) * (maxLog - minLog)));
          const gain = Math.round((18 - (y / h) * 36) / 0.5) * 0.5;
          onChange(dragIndex, { freq: Math.max(20, Math.min(20000, freq)), gain: Math.max(-18, Math.min(18, gain)) });
        }}
        onResponderRelease={() => setDragIndex(null)}
      >
        {/* 0dB line */}
        <View className="absolute left-0 right-0" style={{ top: h / 2, height: 1, backgroundColor: '#444' }} />

        {/* Grid lines */}
        {[50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].map(f => {
          const isEven = f >= 1000;
          return (
            <View key={f} className="absolute top-0 bottom-0" style={{ left: freqToX(f, w), width: 1, backgroundColor: isEven ? '#333' : '#222' }} />
          );
        })}

        {/* Spectrum bars */}
        {barData.map((seg, i) => {
          const barHeight = ((seg.gain + 18) / 36) * 100;
          return (
            <View
              key={i}
              className="absolute bottom-0"
              style={{
                left: `${(i / 99) * 100}%`,
                width: `${100 / 99}%`,
                height: `${barHeight}%`,
                backgroundColor: seg.gain >= 0 ? '#22c55e' : '#ef4444',
                opacity: 0.6,
              }}
            />
          );
        })}

        {/* Band handles */}
        {bands.map((band, i) => {
          if (!band.enabled) return null;
          const bx = freqToX(band.freq, w) - 6;
          const by = gainToY(band.gain, h) - 6;
          return (
            <Pressable
              key={i}
              onPressIn={() => setDragIndex(i)}
              className="absolute w-3 h-3 rounded-full border-2 z-10"
              style={{
                left: bx,
                top: by,
                backgroundColor: dragIndex === i ? '#fff' : '#5ac8fa',
                borderColor: 'white',
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

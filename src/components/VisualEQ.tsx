import { useState, useCallback, useMemo } from "react";
import { View, Text, Pressable } from "react-native";

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
    name: "Flat",
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
    name: "Voice",
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
    name: "Guitar",
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
    name: "Bass",
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
    name: "Master",
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

const FREQ_LABELS = [
  { label: "Low", range: "20-200Hz" },
  { label: "Low-Mid", range: "200-2kHz" },
  { label: "Mid", range: "2k-5kHz" },
  { label: "High-Mid", range: "5k-10kHz" },
  { label: "High", range: "10k-20kHz" },
];

const GRID_FREQS = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

const SPECTRUM_SEGMENTS = 99;

function formatFreq(freq: number): string {
  if (freq >= 1000) return `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}k`;
  return `${Math.round(freq)}`;
}

function computeBandContribution(freq: number, band: EqBand): number {
  if (!band.enabled) return 0;
  const g = band.gain;
  const f = band.freq;
  const qVal = band.q;
  const type = band.type;
  const ratio = freq / f;

  switch (type) {
    case 2: // peak
    case 3: // notch
      return g / (1 + Math.pow((ratio - 1 / ratio) * qVal, 2));
    case 1: // low shelf
      return g * Math.exp(-0.5 * Math.pow(Math.log2(ratio) * 2, 2));
    case 4: // high shelf
      return g * Math.exp(-0.5 * Math.pow(Math.log2(ratio) * 2, 2));
    case 0: // low cut
      if (freq < f) return g * 0.5 * (1 + Math.cos((Math.PI * Math.log2(ratio)) / 2));
      break;
    case 5: // high cut
      if (freq > f) return g * 0.5 * (1 + Math.cos((Math.PI * Math.log2(ratio)) / 2));
      break;
  }
  return 0;
}

export function VisualEQ({
  bands,
  onChange,
  height = 180,
  testID,
}: VisualEQProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [dragValue, setDragValue] = useState<{ gain: number; freq: number } | null>(null);

  const freqToX = useCallback((freq: number, w: number) => {
    if (freq <= 0) return 0;
    const minLog = Math.log(20);
    const maxLog = Math.log(20000);
    return ((Math.log(freq) - minLog) / (maxLog - minLog)) * w;
  }, []);

  const gainToY = useCallback((gain: number, h: number) => {
    return ((18 - gain) / 36) * h;
  }, []);

  const applyPreset = useCallback(
    (presetBands: EqBand[]) => {
      presetBands.forEach((band, i) => {
        if (i < bands.length) onChange(i, band);
      });
    },
    [bands, onChange],
  );

  const w = 320;
  const labelHeight = 30;
  const axisHeight = 20;
  const h = height - labelHeight - axisHeight;

  const curveData = useMemo(() => {
    const data: number[] = [];
    for (let fi = 0; fi < SPECTRUM_SEGMENTS; fi++) {
      const freq = 20 * Math.pow(20000 / 20, fi / SPECTRUM_SEGMENTS);
      let totalGain = 0;
      for (const band of bands) {
        totalGain += computeBandContribution(freq, band);
      }
      data.push(Math.max(-18, Math.min(18, totalGain)));
    }
    return data;
  }, [bands]);

  const spectrumBars = useMemo(() => {
    const bars: { height: number; gain: number; color: string }[] = [];
    for (let fi = 0; fi < SPECTRUM_SEGMENTS; fi++) {
      const freq = 20 * Math.pow(20000 / 20, fi / SPECTRUM_SEGMENTS);
      let totalGain = 0;
      for (const band of bands) {
        totalGain += computeBandContribution(freq, band);
      }
      const clamped = Math.max(-18, Math.min(18, totalGain));
      const heightPct = ((clamped + 18) / 36) * 100;
      const absGain = Math.abs(clamped);
      let color: string;
      if (clamped >= 0) {
        const t = absGain / 18;
        color = `hsl(${120 - t * 30}, 70%, ${40 + t * 15}%)`;
      } else {
        const t = absGain / 18;
        color = `hsl(${0 + t * 10}, 65%, ${45 + t * 10}%)`;
      }
      bars.push({ height: heightPct, gain: clamped, color });
    }
    return bars;
  }, [bands]);

  const curvePathPoints = useMemo(() => {
    return curveData.map((gain, i) => ({
      x: freqToX(20 * Math.pow(20000 / 20, i / SPECTRUM_SEGMENTS), w),
      y: gainToY(gain, h),
    }));
  }, [curveData, w, h, freqToX, gainToY]);

  return (
    <View
      testID={testID}
      className="bg-dark-bg rounded-xl border border-dark-border overflow-hidden"
    >
      <View className="flex-row items-center justify-between px-3 py-1.5 bg-dark-surface border-b border-dark-border">
        <Text className="text-gray-400 text-[10px] font-medium">Visual EQ</Text>
        <Pressable
          onPress={() => setShowPresets(!showPresets)}
          className="px-2 py-0.5 rounded bg-dark-muted active:opacity-70"
        >
          <Text className="text-gray-400 text-[9px]">Presets</Text>
        </Pressable>
      </View>

      {showPresets && (
        <View className="flex-row flex-wrap gap-1 px-3 py-2 bg-dark-surface/50 border-b border-dark-border">
          {PRESETS.map((p) => (
            <Pressable
              key={p.name}
              onPress={() => {
                applyPreset(p.bands);
                setShowPresets(false);
              }}
              className="px-2 py-0.5 rounded bg-dark-muted border border-dark-border active:opacity-70"
            >
              <Text className="text-gray-300 text-[9px]">{p.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Main EQ display area */}
      <View
        style={{ width: w, height: h + axisHeight }}
        className="relative"
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          const x = e.nativeEvent.locationX;
          const minLog = Math.log(20);
          const maxLog = Math.log(20000);
          const clickedFreq = Math.exp(minLog + (x / w) * (maxLog - minLog));

          let closestBand = -1;
          let closestDist = Infinity;
          bands.forEach((band, i) => {
            if (!band.enabled) return;
            const bx = freqToX(band.freq, w);
            const dist = Math.abs(bx - x);
            if (dist < 20 && dist < closestDist) {
              closestDist = dist;
              closestBand = i;
            }
          });

          if (closestBand >= 0) {
            setDragIndex(closestBand);
            const y = e.nativeEvent.locationY;
            const gain = Math.round((18 - (y / h) * 36) / 0.5) * 0.5;
            setDragValue({ gain, freq: clickedFreq });
          }
        }}
        onResponderMove={(e) => {
          if (dragIndex === null) return;
          const x = e.nativeEvent.locationX;
          const y = e.nativeEvent.locationY;
          const minLog = Math.log(20);
          const maxLog = Math.log(20000);
          const freq = Math.round(
            Math.exp(minLog + (x / w) * (maxLog - minLog)),
          );
          const gain = Math.round((18 - (y / h) * 36) / 0.5) * 0.5;
          onChange(dragIndex, {
            freq: Math.max(20, Math.min(20000, freq)),
            gain: Math.max(-18, Math.min(18, gain)),
          });
          setDragValue({ gain, freq });
        }}
        onResponderRelease={() => {
          setDragIndex(null);
          setDragValue(null);
        }}
      >
        {/* Gain labels on left side */}
        {[18, 6, 0, -6, -18].map((g) => (
          <View key={g} className="absolute left-0.5" style={{ top: gainToY(g, h) - 5 }}>
            <Text className="text-[7px]" style={{ color: g === 0 ? "#888" : "#555" }}>
              {g > 0 ? `+${g}` : g}
            </Text>
          </View>
        ))}

        {/* 0dB reference line */}
        <View
          className="absolute left-0 right-0"
          style={{ left: 16, top: h / 2, height: 1, backgroundColor: "#555" }}
        />

        {/* Grid lines */}
        {GRID_FREQS.map((f) => {
          const x = freqToX(f, w);
          const isMajor = [100, 1000, 10000, 20000].includes(f);
          return (
            <View
              key={f}
              className="absolute top-0 bottom-0"
              style={{
                left: Math.max(16, x),
                width: isMajor ? 1 : 0.5,
                backgroundColor: isMajor ? "#333" : "#1a1a2e",
              }}
            />
          );
        })}

        {/* Spectrum analyzer background bars */}
        {spectrumBars.map((bar, i) => {
          const barX = (i / SPECTRUM_SEGMENTS) * w;
          const barW = w / SPECTRUM_SEGMENTS + 1;
          return (
            <View
              key={i}
              className="absolute bottom-0"
              style={{
                left: barX,
                width: barW,
                height: `${Math.max(0, bar.height)}%`,
                backgroundColor: bar.color,
                opacity: 0.15 + (bar.height / 100) * 0.15,
              }}
            />
          );
        })}

        {/* Frequency response curve (filled area under curve) */}
        <View
          className="absolute left-0 right-0 top-0 bottom-0"
          style={{ left: 0 }}
          pointerEvents="none"
        >
          {curvePathPoints.map((pt, i) => {
            if (i === 0) return null;
            const prev = curvePathPoints[i - 1];
            const midY = (prev.y + pt.y) / 2;
            const fillBottom = h;
            return (
              <View
                key={`fill-${i}`}
                className="absolute"
                style={{
                  left: prev.x,
                  top: Math.min(prev.y, pt.y),
                  width: Math.max(1, pt.x - prev.x),
                  height: Math.max(1, fillBottom - Math.min(prev.y, pt.y)),
                  backgroundColor: "rgba(90, 200, 250, 0.04)",
                }}
              />
            );
          })}
        </View>

        {/* Frequency response curve line */}
        {curvePathPoints.map((pt, i) => {
          if (i === 0) return null;
          const prev = curvePathPoints[i - 1];
          const dx = pt.x - prev.x;
          const dy = pt.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 1) return null;
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const isPositive = pt.y < h / 2;
          return (
            <View
              key={`line-${i}`}
              className="absolute"
              style={{
                left: prev.x,
                top: prev.y,
                width: len,
                height: 2,
                backgroundColor: isPositive ? "#5ac8fa" : "#f97316",
                opacity: 0.9,
                transform: [{ rotate: `${angle}deg` }],
                borderRadius: 1,
              }}
            />
          );
        })}

        {/* Band handles */}
        {bands.map((band, i) => {
          if (!band.enabled) return null;
          const bx = freqToX(band.freq, w) - 7;
          const by = gainToY(band.gain, h) - 7;
          const isActive = dragIndex === i;
          return (
            <Pressable
              key={i}
              onPressIn={() => {
                setDragIndex(i);
                setDragValue({ gain: band.gain, freq: band.freq });
              }}
              className="absolute rounded-full border-2 z-10"
              style={{
                left: bx,
                top: by,
                width: 14,
                height: 14,
                backgroundColor: isActive ? "#fff" : band.gain >= 0 ? "#5ac8fa" : "#f97316",
                borderColor: isActive ? "#5ac8fa" : "#fff",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                elevation: 4,
              }}
            />
          );
        })}

        {/* Drag value tooltip */}
        {dragValue !== null && dragIndex !== null && (
          <View
            className="absolute px-1.5 py-0.5 rounded z-20"
            style={{
              left: Math.min(Math.max(20, freqToX(dragValue.freq, w) - 25), w - 50),
              top: Math.max(0, gainToY(dragValue.gain, h) - 28),
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              borderColor: "#5ac8fa",
              borderWidth: 1,
              borderRadius: 4,
            }}
            pointerEvents="none"
          >
            <Text className="text-[9px] font-bold" style={{ color: "#5ac8fa" }}>
              {dragValue.gain > 0 ? "+" : ""}{dragValue.gain.toFixed(1)} dB
            </Text>
            <Text className="text-[7px]" style={{ color: "#999" }}>
              {formatFreq(dragValue.freq)} Hz
            </Text>
          </View>
        )}

        {/* Frequency axis labels */}
        <View className="absolute left-0 right-0" style={{ top: h, height: axisHeight }}>
          {GRID_FREQS.filter(f => [100, 200, 500, 1000, 2000, 5000, 10000, 20000].includes(f)).map((f) => {
            const x = freqToX(f, w);
            if (x < 16 || x > w - 10) return null;
            return (
              <View key={f} className="absolute" style={{ left: x - 8, top: 2 }}>
                <Text className="text-[7px]" style={{ color: "#666" }}>
                  {formatFreq(f)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Band region labels */}
      <View
        style={{ width: w, height: labelHeight }}
        className="flex-row border-t border-dark-border bg-dark-surface/30"
      >
        {FREQ_LABELS.map((fl, i) => {
          const freqRanges = [
            { start: 20, end: 200 },
            { start: 200, end: 2000 },
            { start: 2000, end: 5000 },
            { start: 5000, end: 10000 },
            { start: 10000, end: 20000 },
          ];
          const r = freqRanges[i];
          const xStart = freqToX(r.start, w);
          const xEnd = freqToX(r.end, w);
          const center = (xStart + xEnd) / 2;
          return (
            <View
              key={i}
              className="absolute flex-row items-center justify-center"
              style={{
                left: xStart,
                width: xEnd - xStart,
                top: 0,
                height: labelHeight,
              }}
            >
              <Text className="text-[8px] font-medium" style={{ color: "#777" }}>
                {fl.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

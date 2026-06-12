import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';

interface LufsMeterProps {
  isPlaying: boolean;
}

const LUFS_TARGETS = [
  { name: 'Streaming', integrated: -14, shortTerm: -18, label: '-14 LUFS' },
  { name: 'Broadcast', integrated: -16, shortTerm: -20, label: '-16 LUFS' },
  { name: 'EBU R128', integrated: -23, shortTerm: -27, label: '-23 LUFS' },
  { name: 'Custom', integrated: -12, shortTerm: -16, label: '-12 LUFS' },
];

const MIN_LUFS = -36;
const MAX_LUFS = 0;
const RANGE = MAX_LUFS - MIN_LUFS;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function simulateLoudness(playing: boolean, base: number, target: number, speed: number) {
  if (!playing) return lerp(base, -30, 0.05);
  return lerp(base, target, speed);
}

export function LufsMeter({ isPlaying }: LufsMeterProps) {
  const [targetIdx, setTargetIdx] = useState(0);
  const target = LUFS_TARGETS[targetIdx];

  const integratedRef = useRef(-24);
  const shortTermRef = useRef(-26);
  const truePeakRef = useRef(-12);
  const lraRef = useRef(4);

  const [integrated, setIntegrated] = useState(-24);
  const [shortTerm, setShortTerm] = useState(-26);
  const [truePeak, setTruePeak] = useState(-12);
  const [lra, setLra] = useState(4);
  const [history, setHistory] = useState<number[]>([]);
  const [avgLoudness, setAvgLoudness] = useState(-24);

  useEffect(() => {
    if (!isPlaying) {
      const decay = setInterval(() => {
        integratedRef.current = lerp(integratedRef.current, -30, 0.02);
        shortTermRef.current = lerp(shortTermRef.current, -34, 0.03);
        truePeakRef.current = lerp(truePeakRef.current, -18, 0.02);
        setIntegrated(integratedRef.current);
        setShortTerm(shortTermRef.current);
        setTruePeak(truePeakRef.current);
        setHistory(prev => {
          const next = [...prev, -30];
          return next.length > 30 ? next.slice(-30) : next;
        });
        setAvgLoudness(lerp(avgLoudness, -30, 0.02));
      }, 200);
      return () => clearInterval(decay);
    }

    const baseIntegrated = -(4 + Math.random() * 6);
    const baseShortTerm = baseIntegrated + (Math.random() * 2 - 0.5);
    const baseTruePeak = target.integrated + 10 + Math.random() * 4;
    const baseLra = 4 + Math.random() * 6;

    let time = 0;
    const tick = setInterval(() => {
      time += 0.2;
      const drift = Math.sin(time * 0.3) * 1.5 + Math.sin(time * 0.7) * 0.5;
      const transient = Math.random() < 0.05 ? Math.random() * 3 : 0;

      integratedRef.current = simulateLoudness(true, integratedRef.current, baseIntegrated + drift * 0.3, 0.08);
      shortTermRef.current = simulateLoudness(true, shortTermRef.current, baseShortTerm + drift + transient, 0.12);
      truePeakRef.current = simulateLoudness(true, truePeakRef.current, baseTruePeak + transient * 0.5 - drift * 0.3, 0.15);
      lraRef.current = lerp(lraRef.current, baseLra + Math.abs(drift) * 0.5, 0.05);

      setIntegrated(integratedRef.current);
      setShortTerm(shortTermRef.current);
      setTruePeak(truePeakRef.current);
      setLra(lraRef.current);
      setHistory(prev => {
        const next = [...prev, shortTermRef.current];
        return next.length > 30 ? next.slice(-30) : next;
      });
      const h = integratedRef.current;
      setAvgLoudness(lerp(avgLoudness, h, 0.1));
    }, 200);

    return () => clearInterval(tick);
  }, [isPlaying, target.integrated]);

  const shortPct = ((shortTerm - MIN_LUFS) / RANGE) * 100;
  const integratedPct = ((avgLoudness - MIN_LUFS) / RANGE) * 100;
  const targetPct = ((target.integrated - MIN_LUFS) / RANGE) * 100;

  const barSegments = 36;
  const getBarColor = (db: number) => {
    if (db >= -3) return '#ff453a';
    if (db >= -8) return '#ff9f0a';
    if (db >= -14) return '#ffcc00';
    if (db >= -20) return '#30d158';
    if (db >= -28) return '#34c759';
    return '#30d158';
  };

  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-rose-500" />
          <Text className="label text-rose-400/70 uppercase">LUFS Meter</Text>
        </View>
        <View className="flex-row gap-1">
          {LUFS_TARGETS.map((t, i) => (
            <Pressable
              key={t.name}
              onPress={() => setTargetIdx(i)}
              className={`px-2 py-0.5 rounded-md border ${i === targetIdx ? 'bg-rose-500/20 border-rose-500/50' : 'bg-dark-surface border-dark-border'}`}
            >
              <Text className={`text-[8px] font-bold ${i === targetIdx ? 'text-rose-400' : 'text-gray-500'}`}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="bg-[#0b0b0d] rounded-xl border border-dark-border p-3 mb-2">
        <View className="h-20 relative mb-2">
          <View className="absolute inset-0 flex-row rounded-lg overflow-hidden">
            {Array.from({ length: barSegments }, (_, i) => {
              const db = MIN_LUFS + (i / barSegments) * RANGE;
              return (
                <View
                  key={i}
                  className="flex-1 mx-[0.5px] rounded-sm"
                  style={{ backgroundColor: getBarColor(db), opacity: 0.15 + (i / barSegments) * 0.3 }}
                />
              );
            })}
          </View>

          <View
            className="absolute bottom-0 w-2 h-full bg-rose-400 rounded-sm shadow-sm"
            style={{
              left: `${shortPct}%`,
              marginLeft: -4,
              opacity: isPlaying ? 1 : 0.3,
            }}
          />

          <View
            className="absolute bottom-0 w-1 h-full bg-white rounded-sm"
            style={{
              left: `${integratedPct}%`,
              marginLeft: -2,
              opacity: isPlaying ? 0.8 : 0.2,
            }}
          />

          <View
            className="absolute bottom-0 w-0.5 h-full bg-yellow-400"
            style={{
              left: `${targetPct}%`,
              opacity: 0.7,
            }}
          />

          <View className="absolute -top-1 -right-1 bg-rose-500/20 rounded-lg px-1.5 py-0.5 border border-rose-500/30">
            <Text className="text-rose-400 font-mono text-[8px] font-bold">{target.label}</Text>
          </View>
        </View>

        <View className="flex-row justify-between items-end mb-1">
          <Text className="text-gray-700 text-[8px] font-mono">-36</Text>
          <Text className="text-gray-700 text-[8px] font-mono">-24</Text>
          <Text className="text-gray-700 text-[8px] font-mono">-14</Text>
          <Text className="text-gray-700 text-[8px] font-mono">0 LUFS</Text>
        </View>

        <View className="flex-row gap-3">
          {[
            { label: 'Integrated', value: integrated, color: 'text-white' },
            { label: 'Short-Term', value: shortTerm, color: 'text-cyan-400' },
            { label: 'True Peak', value: truePeak, color: 'text-rose-400', unit: 'dBTP' },
            { label: 'LRA', value: lra, color: 'text-yellow-400', unit: 'LU' },
          ].map(m => {
            const display = m.value <= -40 ? '-∞' : `${m.value >= 0 ? '+' : ''}${m.value.toFixed(1)}`;
            return (
              <View key={m.label} className="flex-1 items-center">
                <Text className="text-gray-600 text-[8px] font-medium">{m.label}</Text>
                <Text className={`${m.color} font-mono text-sm font-bold`}>{display}</Text>
                <Text className="text-gray-600 text-[7px]">{m.unit || 'LUFS'}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {history.length > 1 && (
        <View className="h-8 bg-[#0b0b0d] rounded-lg border border-dark-border overflow-hidden px-1 flex-row items-end">
          {history.map((val, i) => {
            const pct = Math.max(0, Math.min(100, ((val - MIN_LUFS) / RANGE) * 100));
            return (
              <View
                key={i}
                className="flex-1 mx-[0.5px] rounded-sm"
                style={{
                  height: `${pct}%`,
                  backgroundColor: val > target.integrated + 3 ? '#ff453a' : val > target.integrated - 3 ? '#30d158' : '#5ac8fa',
                  opacity: 0.5 + (i / history.length) * 0.4,
                }}
              />
            );
          })}
        </View>
      )}

      <View className="flex-row items-center justify-between mt-1.5">
        <View className="flex-row items-center gap-2">
          <Text className="text-gray-600 text-[9px]">Loudness Range:</Text>
          <Text className="text-yellow-400 font-mono text-xs font-bold">{lra.toFixed(1)} LU</Text>
        </View>
        <Text className="text-gray-700 text-[8px]">
          {isPlaying ? '⚡ Analyzing' : '⏸ Paused'}
        </Text>
      </View>
    </View>
  );
}

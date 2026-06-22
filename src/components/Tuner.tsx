import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';

interface TuningNote {
  name: string;
  frequency: number;
  octave: number;
}

const GUITAR_STANDARD: TuningNote[] = [
  { name: 'E', frequency: 82.41, octave: 2 },
  { name: 'A', frequency: 110.00, octave: 2 },
  { name: 'D', frequency: 146.83, octave: 3 },
  { name: 'G', frequency: 196.00, octave: 3 },
  { name: 'B', frequency: 246.94, octave: 3 },
  { name: 'E', frequency: 329.63, octave: 4 },
];

const BASS_STANDARD: TuningNote[] = [
  { name: 'E', frequency: 41.20, octave: 1 },
  { name: 'A', frequency: 55.00, octave: 1 },
  { name: 'D', frequency: 73.42, octave: 2 },
  { name: 'G', frequency: 98.00, octave: 2 },
];

const ALL_NOTES = [
  { name: 'C', freq: 16.35 }, { name: 'C#', freq: 17.32 }, { name: 'D', freq: 18.35 },
  { name: 'D#', freq: 19.45 }, { name: 'E', freq: 20.60 }, { name: 'F', freq: 21.83 },
  { name: 'F#', freq: 23.12 }, { name: 'G', freq: 24.50 }, { name: 'G#', freq: 25.96 },
  { name: 'A', freq: 27.50 }, { name: 'A#', freq: 29.14 }, { name: 'B', freq: 30.87 },
];

function noteNameFromFreq(freq: number): { name: string; octave: number; cents: number } {
  if (freq <= 0) return { name: '—', octave: 0, cents: 0 };
  const a4 = 440;
  const semitones = 12 * Math.log2(freq / a4);
  const noteIndex = Math.round(semitones) % 12;
  const octave = 4 + Math.floor((Math.round(semitones) + 9) / 12);
  const targetFreq = a4 * Math.pow(2, Math.round(semitones) / 12);
  const cents = 1200 * Math.log2(freq / targetFreq);
  const idx = ((noteIndex % 12) + 12) % 12;
  return { name: ALL_NOTES[idx].name, octave, cents: Math.round(cents) };
}

interface TunerProps {
  visible: boolean;
  onClose: () => void;
}

export function Tuner({ visible, onClose }: TunerProps) {
  const [instrument, setInstrument] = useState<'guitar' | 'bass'>('guitar');
  const [simFreq, setSimFreq] = useState(0);
  const [activeString, setActiveString] = useState(-1);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tuning = instrument === 'guitar' ? GUITAR_STANDARD : BASS_STANDARD;
  const tuningRef = useRef(tuning);
  tuningRef.current = tuning;

  useEffect(() => {
    if (!visible) { setSimFreq(0); setActiveString(-1); return; }

    let step = 0;
    animRef.current = setInterval(() => {
      step++;
      const freq = 40 + Math.sin(step * 0.3) * 200 + Math.sin(step * 0.7) * 50 + 100 * Math.sin(step * 0.1);
      setSimFreq(Math.max(20, freq + 200));

      const note = noteNameFromFreq(freq + 200);
      const idx = tuningRef.current.findIndex(t => t.name === note.name && Math.abs(t.octave - note.octave) <= 1);
      setActiveString(idx >= 0 ? idx : -1);
    }, 200);

    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [visible]);

  const note = noteNameFromFreq(simFreq);
  const isInTune = Math.abs(note.cents) <= 5;
  const centsBarWidth = Math.max(0, 100 - Math.abs(note.cents) * 2);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable className="flex-1 bg-black/70 justify-center items-center px-4" onPress={onClose}>
          <Pressable className="w-full max-w-sm bg-dark-surface rounded-3xl border border-dark-border p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-bold">Afinador</Text>
            <Pressable onPress={onClose} className="w-7 h-7 items-center justify-center active:opacity-60">
              <Text className="text-gray-500 text-sm">✕</Text>
            </Pressable>
          </View>

          <View className="flex-row gap-2 mb-6">
            <Pressable onPress={() => setInstrument('guitar')}
              className={`flex-1 py-2.5 rounded-xl items-center border ${instrument === 'guitar' ? 'bg-brand-primary/20 border-brand-primary' : 'bg-dark-elevated border-dark-border'}`}>
              <Text className={`text-sm font-semibold ${instrument === 'guitar' ? 'text-brand-primary' : 'text-white'}`}>🎸 Guitarra</Text>
            </Pressable>
            <Pressable onPress={() => setInstrument('bass')}
              className={`flex-1 py-2.5 rounded-xl items-center border ${instrument === 'bass' ? 'bg-brand-accent/20 border-brand-accent' : 'bg-dark-elevated border-dark-border'}`}>
              <Text className={`text-sm font-semibold ${instrument === 'bass' ? 'text-brand-accent' : 'text-white'}`}>🎸 Baixo</Text>
            </Pressable>
          </View>

          <View className="items-center mb-6">
            <Text className={`text-6xl font-bold ${isInTune ? 'text-green-400' : note.cents > 0 ? 'text-yellow-400' : 'text-brand-primary'}`}>
              {note.name}{note.octave}
            </Text>
            <Text className={`text-sm font-mono mt-1 ${isInTune ? 'text-green-400' : 'text-gray-400'}`}>
              {simFreq > 0 ? `${simFreq.toFixed(1)} Hz` : '—'}
            </Text>
            <Text className={`text-xs mt-0.5 font-semibold ${isInTune ? 'text-green-400' : note.cents > 0 ? 'text-yellow-500' : 'text-brand-primary'}`}>
              {simFreq > 0 ? (isInTune ? '✓ Afinado' : `${note.cents > 0 ? '+' : ''}${note.cents} ¢`) : 'Toque uma corda'}
            </Text>
          </View>

          <View className="h-12 bg-dark-bg rounded-xl relative overflow-hidden mb-6">
            <View className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 z-10" />
            <View
              className="absolute top-1 bottom-1 rounded-lg"
              style={{
                left: `${50 + Math.min(Math.max(note.cents, -50), 50)}%`,
                width: `${Math.max(4, centsBarWidth)}%`,
                backgroundColor: isInTune ? '#34c759' : note.cents > 0 ? '#ff9f0a' : '#ff3b30',
              }}
            />
          </View>

          <View className="flex-row justify-between px-1 mb-4">
            <Text className="text-gray-600 text-[10px]">♭</Text>
            <Text className="text-gray-600 text-[10px]">0</Text>
            <Text className="text-gray-600 text-[10px]">♯</Text>
          </View>

          <Text className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Referência</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {tuning.map((t, i) => (
              <View key={i}
                className={`px-2.5 py-2 rounded-xl flex-1 items-center border ${activeString === i ? 'bg-brand-accent/20 border-brand-accent' : 'bg-dark-elevated border-dark-border'}`}>
                <Text className={`text-xs font-bold ${activeString === i ? 'text-brand-accent' : 'text-white'}`}>{t.name}{t.octave}</Text>
                <Text className="text-gray-600 text-[8px]">{t.frequency.toFixed(1)}Hz</Text>
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

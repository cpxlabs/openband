import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, Modal, Platform } from 'react-native';
import type { SamplerSlotData } from '../lib/types';

interface SampleSlot {
  key: string;
  name: string;
  data: AudioBuffer | null;
  rootKey: number;
  lowKey: number;
  highKey: number;
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const totalSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);
  const w = (o: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(o + i, str.charCodeAt(i)); };
  w(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true);
  w(8, 'WAVE'); w(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  w(36, 'data'); view.setUint32(40, dataSize, true);
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const offset = 44 + (i * numChannels + ch) * bytesPerSample;
      view.setInt16(offset, Math.max(-32768, Math.min(32767, Math.round(buffer.getChannelData(ch)[i] * 32767))), true);
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
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
  { key: 'C2', label: 'Kick', color: '#ff6482' },
  { key: 'D2', label: 'Snare', color: '#ff9f0a' },
  { key: 'E2', label: 'Hi-Hat', color: '#5ac8fa' },
  { key: 'F2', label: 'Open HH', color: '#34c759' },
  { key: 'G2', label: 'Clap', color: '#bf5af2' },
  { key: 'A2', label: 'Tom Low', color: '#ff375f' },
  { key: 'B2', label: 'Tom Mid', color: '#00d4aa' },
  { key: 'C3', label: 'Tom High', color: '#64d2ff' },
  { key: 'D3', label: 'Crash', color: '#ffcc00' },
  { key: 'E3', label: 'Ride', color: '#30d158' },
  { key: 'F3', label: 'Shaker', color: '#aeaeb2' },
  { key: 'G3', label: 'Tambourine', color: '#ff453a' },
  { key: 'A3', label: 'Claves', color: '#bf5af2' },
  { key: 'B3', label: 'Cowbell', color: '#ff9f0a' },
  { key: 'C4', label: 'Vocal Chop', color: '#5ac8fa' },
  { key: 'D4', label: 'FX', color: '#34c759' },
];

export function Sampler({ visible, onClose, onAddToTrack, testID }: SamplerProps) {
  const [mode, setMode] = useState<'drum' | 'melodic'>('drum');
  const [slots, setSlots] = useState<SampleSlot[]>(
    DRUM_PADS.map((p, i) => ({
      key: p.key,
      name: p.label,
      data: null,
      rootKey: 36 + i,
      lowKey: 36 + i,
      highKey: 36 + i,
    }))
  );
  const [adsr, setAdsr] = useState<ADSR>({ attack: 10, decay: 200, sustain: 70, release: 300 });
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);

  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      audioCtx.current?.close();
      audioCtx.current = null;
    };
  }, []);

  const getAudioContext = useCallback(() => {
    if (Platform.OS !== 'web') return null;
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
    return audioCtx.current;
  }, []);

  const handleLoadSample = useCallback(async (slotIndex: number) => {
    if (Platform.OS !== 'web') return;
    setLoadingSlot(slotIndex);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.wav,.mp3,.aiff,.flac,.ogg';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) { setLoadingSlot(null); return; }
      if (file.size > 50 * 1024 * 1024) { setLoadingSlot(null); return; }
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|aiff|flac|ogg)$/i)) { setLoadingSlot(null); return; }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const result = ev.target?.result;
        if (!result) { setLoadingSlot(null); return; }
        try {
          const ctx = getAudioContext();
          if (!ctx) return;
          const buffer = await ctx.decodeAudioData(result as ArrayBuffer);
          setSlots(prev => prev.map((s, i) => i === slotIndex ? { ...s, data: buffer, name: file.name.replace(/\.[^/.]+$/, '') } : s));
        } catch (e) { console.warn('Failed to decode audio:', e); }
        setLoadingSlot(null);
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  }, [getAudioContext]);

  const previewSample = useCallback((slotIndex: number) => {
    if (Platform.OS !== 'web') return;
    const slot = slots[slotIndex];
    if (!slot.data) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const source = ctx.createBufferSource();
      source.buffer = slot.data;

      const gainNode = ctx.createGain();
      const now = ctx.currentTime;
      const a = adsr.attack / 1000;
      const d = adsr.decay / 1000;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1, now + a);
      gainNode.gain.linearRampToValueAtTime(adsr.sustain / 100, now + a + d);
      gainNode.gain.setValueAtTime(adsr.sustain / 100, now + slot.data.duration - adsr.release / 1000);
      gainNode.gain.linearRampToValueAtTime(0, now + slot.data.duration);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(now);
    } catch (e) { console.warn('Failed to preview sample:', e); }
  }, [slots, adsr, getAudioContext]);

  const handleAddToTrack = useCallback(() => {
    const loadedSlots = slots.filter((s): s is SampleSlot & { data: AudioBuffer } => s.data !== null);
    if (loadedSlots.length === 0) return;
    const sampleData: SamplerSlotData[] = loadedSlots.map(slot => {
      let url = '';
      if (Platform.OS === 'web') {
        const blob = audioBufferToWavBlob(slot.data);
        url = URL.createObjectURL(blob);
      }
      return { key: slot.key, name: slot.name, url, rootKey: slot.rootKey, lowKey: slot.lowKey, highKey: slot.highKey };
    });
    onAddToTrack?.(mode === 'drum' ? 'Drum Rack' : 'Sampler', sampleData);
    onClose();
  }, [slots, mode, onAddToTrack, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} testID={testID}>
      <View className="flex-1 bg-black/80 justify-center items-center px-2">
        <View className="w-full max-w-lg bg-dark-surface rounded-3xl border border-dark-border p-4" style={{ maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white text-lg font-bold">Sampler</Text>
            <View className="flex-row gap-2">
              <Pressable onPress={() => setMode('drum')}
                className={`px-3 py-1 rounded-lg border ${mode === 'drum' ? 'bg-brand-accent/20 border-brand-accent' : 'border-dark-border'}`}>
                <Text className={`text-xs ${mode === 'drum' ? 'text-brand-accent' : 'text-gray-400'}`}>Drum Rack</Text>
              </Pressable>
              <Pressable onPress={() => setMode('melodic')}
                className={`px-3 py-1 rounded-lg border ${mode === 'melodic' ? 'bg-brand-accent/20 border-brand-accent' : 'border-dark-border'}`}>
                <Text className={`text-xs ${mode === 'melodic' ? 'text-brand-accent' : 'text-gray-400'}`}>Melodic</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {slots.map((slot, i) => (
              <Pressable
                key={slot.key}
                onPress={() => { setSelectedSlot(i); if (slot.data) previewSample(i); }}
                onLongPress={() => handleLoadSample(i)}
                className="rounded-xl p-2 border items-center justify-center"
                style={{
                  width: '23%',
                  aspectRatio: 1,
                  borderColor: selectedSlot === i ? DRUM_PADS[i].color : '#333',
                  backgroundColor: slot.data ? 'rgba(90,200,250,0.1)' : loadingSlot === i ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                }}
              >
                <Text className="text-[9px] text-gray-300 font-semibold">{slot.name}</Text>
                <Text className="text-[8px] text-gray-600 mt-0.5">{slot.key}</Text>
                <Text className="text-[7px] text-gray-600 mt-0.5">{slot.data ? '✓' : loadingSlot === i ? '...' : '+'}</Text>
              </Pressable>
            ))}
          </View>

          {selectedSlot !== null && (
            <View className="bg-dark-bg rounded-xl p-3 border border-dark-border mb-3">
              <Text className="text-gray-300 text-xs font-semibold mb-2">ADSR Envelope</Text>
              <View className="flex-row gap-2">
                {(['attack', 'decay', 'sustain', 'release'] as (keyof ADSR)[]).map(param => (
                  <View key={param} className="flex-1 items-center">
                    <Text className="text-gray-500 text-[8px] mb-1">{param[0].toUpperCase()}</Text>
                    <View className="w-full h-12 bg-dark-surface rounded-lg relative overflow-hidden justify-end">
                      <View
                        className="w-full bg-brand-accent rounded-t-sm"
                        style={{ height: `${param === 'sustain' ? adsr[param] : (adsr[param] / (param === 'attack' ? 1000 : param === 'decay' ? 1000 : param === 'release' ? 1000 : 1)) * 100}%` }}
                      />
                    </View>
                    <Pressable
                      onPress={() => {
                        const max = param === 'attack' ? 1000 : param === 'decay' ? 1000 : param === 'release' ? 1000 : 100;
                        const step = param === 'sustain' ? 5 : 50;
                        setAdsr(prev => ({ ...prev, [param]: Math.min(max, prev[param] + step) }));
                      }}
                      className="w-6 h-4 rounded bg-dark-muted items-center justify-center mt-1 active:opacity-70"
                    >
                      <Text className="text-gray-400 text-[8px]">+</Text>
                    </Pressable>
                    <Text className="text-[8px] text-gray-500 font-mono mt-0.5">
                      {adsr[param]}{param === 'sustain' ? '%' : 'ms'}
                    </Text>
                    <Pressable
                      onPress={() => {
                        const step = param === 'sustain' ? 5 : 50;
                        setAdsr(prev => ({ ...prev, [param]: Math.max(param === 'sustain' ? 0 : 1, prev[param] - step) }));
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

          <View className="flex-row gap-3">
            <Pressable onPress={onClose} className="flex-1 py-3 rounded-xl border border-dark-border items-center active:opacity-70">
              <Text className="text-gray-400 text-sm font-semibold">Cancel</Text>
            </Pressable>
            <Pressable onPress={handleAddToTrack}
              className="flex-1 py-3 rounded-xl bg-brand-primary items-center active:opacity-80"
            >
              <Text className="text-white text-sm font-bold">
                Add to Track ({slots.filter(s => s.data).length} samples)
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

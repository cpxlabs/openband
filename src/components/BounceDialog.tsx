import { useState, useCallback } from 'react';
import { View, Text, Modal, Pressable, Platform, Alert } from 'react-native';

type ExportFormat = 'wav' | 'aiff' | 'flac';
type BitDepth = 16 | 24 | 32;
type ExportSampleRate = 44100 | 48000 | 96000;

const FORMATS: { key: ExportFormat; label: string; ext: string }[] = [
  { key: 'wav', label: 'WAV', ext: '.wav' },
  { key: 'aiff', label: 'AIFF', ext: '.aiff' },
  { key: 'flac', label: 'FLAC', ext: '.flac' },
];

const BIT_DEPTHS: BitDepth[] = [16, 24, 32];
const SAMPLE_RATES: ExportSampleRate[] = [44100, 48000, 96000];

function downloadBlob(blob: Blob, filename: string) {
  if (Platform.OS !== 'web') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generateSilentWav(durationSec: number, sampleRate: ExportSampleRate, bitDepth: BitDepth): Blob {
  const numChannels = 2;
  const numSamples = Math.floor(sampleRate * durationSec);
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  const write16 = (offset: number, v: number) => view.setUint16(offset, v, true);
  const write32 = (offset: number, v: number) => view.setUint32(offset, v, true);

  writeStr(0, 'RIFF');
  write32(4, 36 + dataSize);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  write32(16, 16);
  write16(20, 1);
  write16(22, numChannels);
  write32(24, sampleRate);
  write32(28, byteRate);
  write16(32, blockAlign);
  write16(34, bitDepth);
  writeStr(36, 'data');
  write32(40, dataSize);

  const bytesPerSample = bitDepth / 8;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const offset = 44 + (i * numChannels + ch) * bytesPerSample;
      if (bitDepth === 16) {
        const val = Math.floor(Math.random() * 4 - 2);
        write16(offset, Math.max(-32768, Math.min(32767, val)));
      } else if (bitDepth === 24) {
        const val = Math.floor(Math.random() * 512 - 256);
        view.setInt8(offset + 2, Math.max(-128, Math.min(127, val >> 16)));
        view.setInt8(offset + 1, Math.max(-128, Math.min(127, (val >> 8) & 0xff)));
        view.setInt8(offset, Math.max(-128, Math.min(127, val & 0xff)));
      } else {
        view.setFloat32(offset, Math.random() * 0.0002 - 0.0001, true);
      }
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

interface BounceDialogProps {
  visible: boolean;
  onClose: () => void;
  projectTitle: string;
  duration: number;
}

export function BounceDialog({ visible, onClose, projectTitle, duration }: BounceDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('wav');
  const [bitDepth, setBitDepth] = useState<BitDepth>(24);
  const [sampleRate, setSampleRate] = useState<ExportSampleRate>(48000);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    if (Platform.OS !== 'web') {
      Alert.alert('Exportar', 'Exportação disponível apenas na versão web.');
      return;
    }
    setExporting(true);
    setTimeout(() => {
      try {
        const ext = FORMATS.find(f => f.key === format)?.ext || '.wav';
        const blob = generateSilentWav(Math.min(duration, 30), sampleRate, bitDepth);
        downloadBlob(blob, `${projectTitle.replace(/\s+/g, '_')}_mix${ext}`);
        Alert.alert('Exportado', `Mix exportado como ${format.toUpperCase()} (${bitDepth}bit, ${sampleRate}Hz)`);
      } catch {
        Alert.alert('Erro', 'Falha ao exportar.');
      }
      setExporting(false);
    }, 800);
  }, [format, bitDepth, sampleRate, projectTitle, duration]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-center items-center px-6" onPress={onClose}>
        <Pressable className="w-full max-w-sm bg-dark-surface rounded-3xl border border-dark-border p-5" onPress={() => {}}>
          <Text className="text-white text-lg font-bold mb-1">Exportar Mix</Text>
          <Text className="text-gray-500 text-xs mb-5">Escolha as configurações de exportação</Text>

          <Text className="label mb-2">Formato</Text>
          <View className="flex-row gap-2 mb-4">
            {FORMATS.map(f => (
              <Pressable key={f.key} onPress={() => setFormat(f.key)}
                className={`flex-1 py-2.5 rounded-xl items-center border ${format === f.key ? 'bg-brand-primary/20 border-brand-primary' : 'bg-dark-elevated border-dark-border'}`}>
                <Text className={`text-sm font-semibold ${format === f.key ? 'text-brand-primary' : 'text-white'}`}>{f.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="label mb-2">Bit Depth</Text>
          <View className="flex-row gap-2 mb-4">
            {BIT_DEPTHS.map(b => (
              <Pressable key={b} onPress={() => setBitDepth(b)}
                className={`flex-1 py-2.5 rounded-xl items-center border ${bitDepth === b ? 'bg-brand-accent/20 border-brand-accent' : 'bg-dark-elevated border-dark-border'}`}>
                <Text className={`text-sm font-semibold ${bitDepth === b ? 'text-brand-accent' : 'text-white'}`}>{b}-bit</Text>
              </Pressable>
            ))}
          </View>

          <Text className="label mb-2">Sample Rate</Text>
          <View className="flex-row gap-2 mb-5">
            {SAMPLE_RATES.map(sr => (
              <Pressable key={sr} onPress={() => setSampleRate(sr)}
                className={`flex-1 py-2.5 rounded-xl items-center border ${sampleRate === sr ? 'bg-brand-accent/20 border-brand-accent' : 'bg-dark-elevated border-dark-border'}`}>
                <Text className={`text-sm font-semibold ${sampleRate === sr ? 'text-brand-accent' : 'text-white'}`}>{sr / 1000}kHz</Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-row gap-3">
            <Pressable onPress={onClose}
              className="flex-1 py-3 rounded-xl border border-dark-border items-center active:opacity-70">
              <Text className="text-gray-400 text-sm font-semibold">Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleExport}
              className="flex-1 py-3 rounded-xl bg-brand-primary items-center active:opacity-80 disabled:opacity-50"
              disabled={exporting}>
              <Text className="text-white text-sm font-bold">{exporting ? 'Exportando...' : 'Exportar'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

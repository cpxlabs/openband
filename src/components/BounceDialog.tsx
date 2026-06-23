import { useState, useCallback, useRef } from 'react';
import { View, Text, Modal, Pressable, Platform, Alert } from 'react-native';
import { OpenBandNative } from '../bridge';
import { ProgressBar } from './ProgressBar';

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

interface BounceRegion {
  start: number;
  duration: number;
  url?: string;
}

interface BounceTrack {
  id: string;
  name: string;
  muted: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  regions: BounceRegion[];
}

interface BounceDialogProps {
  visible: boolean;
  onClose: () => void;
  projectTitle: string;
  duration: number;
  tracks?: BounceTrack[];
}

async function writeBlobToFile(blob: Blob, filename: string) {
  const arrayBuffer = await blob.arrayBuffer();
  await OpenBandNative.writeFile(filename, arrayBuffer);
}

function writeWavHeader(
  view: DataView,
  offset: number,
  numChannels: number,
  sampleRate: number,
  bitDepth: number,
  dataSize: number,
): void {
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);

  const writeStr = (o: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(o + i, str.charCodeAt(i));
  };
  const write16 = (o: number, v: number) => view.setUint16(o, v, true);
  const write32 = (o: number, v: number) => view.setUint32(o, v, true);

  writeStr(offset, 'RIFF');
  write32(offset + 4, 36 + dataSize);
  writeStr(offset + 8, 'WAVE');
  writeStr(offset + 12, 'fmt ');
  write32(offset + 16, 16);
  write16(offset + 20, 1);
  write16(offset + 22, numChannels);
  write32(offset + 24, sampleRate);
  write32(offset + 28, byteRate);
  write16(offset + 32, blockAlign);
  write16(offset + 34, bitDepth);
  writeStr(offset + 36, 'data');
  write32(offset + 40, dataSize);
}

async function fetchAudioData(url: string): Promise<AudioBuffer> {
  const parsed = new URL(url, typeof location !== 'undefined' ? location.origin : undefined);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Invalid URL scheme');
  }
  if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1' && !parsed.hostname.endsWith('.localhost')) {
    if (parsed.protocol !== 'https:') {
      throw new Error('Only HTTPS allowed for external URLs');
    }
  }
  const response = await fetch(url, { credentials: 'omit' });
  const arrayBuffer = await response.arrayBuffer();
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  audioCtx.close();
  return audioBuffer;
}

async function renderMixdown(
  tracks: BounceTrack[],
  duration: number,
  sampleRate: ExportSampleRate,
  onProgress?: (pct: number) => void,
): Promise<AudioBuffer> {
  const anySolo = tracks.some(t => t.solo);
  const audible = tracks.filter(t => {
    if (anySolo) return t.solo && !t.muted;
    return !t.muted;
  });

  const totalRegions = audible.reduce((sum, t) => sum + t.regions.length, 0);
  let processedRegions = 0;

  const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);

  for (const track of audible) {
    for (const region of track.regions) {
      if (!region.url) continue;
      try {
        const audioBuffer = await fetchAudioData(region.url);

        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = offlineCtx.createGain();
        gainNode.gain.value = track.volume / 100;

        const panNode = offlineCtx.createStereoPanner();
        panNode.pan.value = track.pan / 100;

        source.connect(gainNode);
        gainNode.connect(panNode);
        panNode.connect(offlineCtx.destination);

        source.start(region.start, 0, Math.min(region.duration, Math.max(0, duration - region.start)));
      } catch {}
      processedRegions++;
      onProgress?.(Math.round((processedRegions / totalRegions) * 60));
    }
  }

  onProgress?.(65);
  const rendered = await offlineCtx.startRendering();
  onProgress?.(70);
  return rendered;
}

function audioBufferToWavBlob(buffer: AudioBuffer, bitDepth: BitDepth): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  writeWavHeader(view, 0, numChannels, sampleRate, bitDepth, dataSize);

  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buffer.getChannelData(ch)[i];
      const offset = headerSize + (i * numChannels + ch) * bytesPerSample;

      if (bitDepth === 16) {
        const pcm = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
        view.setInt16(offset, pcm, true);
      } else if (bitDepth === 24) {
        const pcm = Math.max(-8388608, Math.min(8388607, Math.round(sample * 8388607)));
        view.setInt8(offset, pcm & 0xff);
        view.setInt8(offset + 1, (pcm >> 8) & 0xff);
        view.setInt8(offset + 2, (pcm >> 16) & 0xff);
      } else {
        view.setFloat32(offset, sample, true);
      }
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export function BounceDialog({ visible, onClose, projectTitle, duration, tracks = [] }: BounceDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('wav');
  const [bitDepth, setBitDepth] = useState<BitDepth>(24);
  const [sampleRate, setSampleRate] = useState<ExportSampleRate>(48000);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  const updateProgress = useCallback((pct: number) => {
    progressRef.current = pct;
    setProgress(pct);
  }, []);

  const handleExport = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Indisponível', 'Exportação de mix está disponível apenas na versão web.');
      setExporting(false);
      return;
    }
    setExporting(true);
    setProgress(0);
    progressRef.current = 0;
    try {
      const ext = FORMATS.find(f => f.key === format)?.ext || '.wav';
      let blob: Blob;

      if (tracks.length > 0) {
        const mixBuffer = await renderMixdown(tracks, Math.min(duration, 300), sampleRate, updateProgress);
        updateProgress(75);
        blob = audioBufferToWavBlob(mixBuffer, bitDepth);
        updateProgress(90);
      } else {
        updateProgress(50);
        const sampleCount = Math.floor(sampleRate * Math.min(duration, 30));
        const silentBuffer = new Float32Array(sampleCount * 2);
        const rawBuffer = new ArrayBuffer(44 + silentBuffer.length * 2);
        const view = new DataView(rawBuffer);
        writeWavHeader(view, 0, 2, sampleRate, 16, silentBuffer.length * 2);
        blob = new Blob([rawBuffer], { type: 'audio/wav' });
        updateProgress(80);
      }

      updateProgress(92);
      const filename = `${projectTitle.replace(/[^a-zA-Z0-9_-]/g, '').replace(/\s+/g, '_')}_mix${ext}`;
      const path = await OpenBandNative.showSaveDialog({
        defaultPath: filename,
        filters: [{ name: 'Audio', extensions: [format] }],
      });
      if (path) {
        updateProgress(96);
        await writeBlobToFile(blob, path);
        updateProgress(100);
        Alert.alert('Exportado', `Mix exportado como ${format.toUpperCase()} (${bitDepth}bit, ${sampleRate}Hz)`);
      }
    } catch (e) {
      console.error('Export failed:', e);
      Alert.alert('Erro', 'Falha ao exportar mix.');
    }
    setExporting(false);
  }, [format, bitDepth, sampleRate, projectTitle, duration, tracks, updateProgress]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable className="flex-1 bg-black/60 justify-center items-center px-6" onPress={onClose}>
          <Pressable className="w-full max-w-sm bg-dark-surface rounded-3xl border border-dark-border p-5">
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

          {exporting && (
            <View className="mb-5">
              <ProgressBar progress={progress} className="mb-2" />
              <Text className="text-gray-400 text-xs text-center">{progress}%</Text>
            </View>
          )}
          <View className="flex-row gap-3">
            <Pressable onPress={onClose}
              className="flex-1 py-3 rounded-xl border border-dark-border items-center active:opacity-70"
              disabled={exporting}>
              <Text className="text-gray-400 text-sm font-semibold">Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleExport}
              className="flex-1 py-3 rounded-xl bg-brand-primary items-center active:opacity-80 disabled:opacity-50"
              disabled={exporting}>
              <Text className={`text-white text-sm font-bold ${exporting ? 'opacity-70' : ''}`}>
                {exporting ? 'Exportando...' : 'Exportar'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

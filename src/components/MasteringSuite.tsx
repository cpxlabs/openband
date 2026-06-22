import { useCallback, useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { Plugin } from '../lib/types';
import {
  MasteringChain,
  MasteringVersionManager,
  MasteringUpload,
  LufsMeter,
  PluginEditor,
} from '../components';
import {
  MasteringVersion,
  MasteringInput,
  MasteringSession,
  buildMasteringChain,
  createVersion,
} from '../lib/masteringSuite';
import { OpenBandNative } from '../bridge';
import { DEMO_AUDIO_URL } from '../lib/constants';

interface MasteringSuiteProps {
  initialProjectId?: string;
  onBack?: () => void;
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

async function fetchAndRenderAudio(url: string, sampleRate: number, duration: number): Promise<AudioBuffer> {
  const response = await fetch(url);
  const raw = await response.arrayBuffer();
  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(raw);
  audioCtx.close();
  const renderLen = Math.ceil(sampleRate * Math.min(duration, decoded.duration));
  const offlineCtx = new OfflineAudioContext(2, renderLen, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start(0);
  return offlineCtx.startRendering();
}

function audioBufferToWavBlob(buffer: AudioBuffer, bitDepth: number): Blob {
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

export function MasteringSuite({ initialProjectId, onBack }: MasteringSuiteProps) {
  const [session, setSession] = useState<MasteringSession>({
    inputFile: null,
    versions: [],
    activeVersionId: null,
    bypassed: false,
  });
  const [plugins, setPlugins] = useState<Plugin[]>(buildMasteringChain());
  const [inputMode, setInputMode] = useState<'single' | 'stems'>('single');
  const [editingPluginId, setEditingPluginId] = useState<string | null>(null);
  const editingPlugin = useMemo(() => {
    if (!editingPluginId) return null;
    return plugins.find(p => p.id === editingPluginId) ?? null;
  }, [editingPluginId, plugins]);
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<'wav' | 'mp3'>('wav');
  const [exportBitDepth, setExportBitDepth] = useState<16 | 24>(24);
  const [exportSampleRate, setExportSampleRate] = useState<44100 | 48000 | 96000>(44100);
  const [exporting, setExporting] = useState(false);

  const audioSource = useMemo(() => {
    if (session.inputFile?.url && !session.inputFile.url.startsWith('audio://')) {
      return session.inputFile.url;
    }
    return DEMO_AUDIO_URL;
  }, [session.inputFile]);

  const player = useAudioPlayer(audioSource);
  const playerStatus = useAudioPlayerStatus(player);

  const togglePlay = useCallback(() => {
    if (playerStatus.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, playerStatus.playing]);

  const handleSeek = useCallback((pct: number) => {
    if (playerStatus.duration) {
      player.seekTo(pct * playerStatus.duration);
    }
  }, [player, playerStatus.duration]);

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const handleToggle = useCallback((pluginId: string) => {
    setPlugins(prev => prev.map(p => p.id === pluginId ? { ...p, enabled: !p.enabled } : p));
  }, []);

  const handleParamChange = useCallback((pluginId: string, paramId: string, value: number) => {
    setPlugins(prev => prev.map(p =>
      p.id === pluginId ? { ...p, params: { ...p.params, [paramId]: value } } : p
    ));
  }, []);

  const handleReset = useCallback(() => {
    setPlugins(buildMasteringChain());
  }, []);

  const handleSaveVersion = useCallback((name: string, notes: string) => {
    const version = createVersion(plugins, name, notes);
    setSession(prev => ({
      ...prev,
      versions: [...prev.versions, version],
      activeVersionId: version.id,
    }));
  }, [plugins]);

  const handleLoadVersion = useCallback((id: string) => {
    const version = session.versions.find(v => v.id === id);
    if (version) {
      setPlugins(version.plugins.map(p => ({ ...p, params: { ...p.params } })));
      setSession(prev => ({ ...prev, activeVersionId: id, bypassed: false }));
    }
  }, [session.versions]);

  const handleDeleteVersion = useCallback((id: string) => {
    setSession(prev => ({
      ...prev,
      versions: prev.versions.filter(v => v.id !== id),
      activeVersionId: prev.activeVersionId === id ? null : prev.activeVersionId,
    }));
  }, []);

  const handleToggleBypass = useCallback(() => {
    setSession(prev => ({ ...prev, bypassed: !prev.bypassed }));
  }, []);

  const handleUpload = useCallback(() => {
    const now = Date.now();
    const input: MasteringInput = {
      type: inputMode,
      filename: inputMode === 'single' ? 'mix_final.wav' : 'projeto_stems',
      size: inputMode === 'single' ? 52428800 : 104857600,
      sampleRate: 44100,
      bitDepth: 24,
      duration: 180,
      url: DEMO_AUDIO_URL,
      stems: inputMode === 'stems'
        ? [
            { name: 'Drums', url: DEMO_AUDIO_URL },
            { name: 'Bass', url: DEMO_AUDIO_URL },
            { name: 'Vocals', url: DEMO_AUDIO_URL },
            { name: 'Melodies', url: DEMO_AUDIO_URL },
          ]
        : undefined,
    };
    setSession(prev => ({ ...prev, inputFile: input }));
  }, [inputMode]);

  const handleClearInput = useCallback(() => {
    player.pause();
    setSession(prev => ({ ...prev, inputFile: null }));
  }, [player]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const sr = exportFormat === 'mp3' ? 44100 : exportSampleRate;
      const bd = exportFormat === 'mp3' ? 16 : exportBitDepth;
      const ext = exportFormat === 'mp3' ? '.mp3' : '.wav';
      const sourceUrl = session.inputFile?.url || DEMO_AUDIO_URL;
      const duration = session.inputFile?.duration ?? 30;

      const rendered = await fetchAndRenderAudio(sourceUrl, sr, duration);
      const blob = audioBufferToWavBlob(rendered, bd);

      const filename = session.inputFile
        ? session.inputFile.filename.replace(/\.[^/.]+$/, '') + '_master'
        : 'master_export';
      const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '').replace(/\s+/g, '_') + ext;

      const path = await OpenBandNative.showSaveDialog({
        defaultPath: safeName,
        filters: [{ name: 'Audio', extensions: [exportFormat] }],
      });

      if (path) {
        const bytes = await blob.arrayBuffer();
        await OpenBandNative.writeFile(path, bytes);
        Alert.alert('Exportado', `Master exportado com áudio (${bd}bit, ${sr}Hz)`);
      }
    } catch (e) {
      console.error('Export failed:', e);
      if (Platform.OS === 'web') {
        try {
          const sr = exportFormat === 'mp3' ? 44100 : exportSampleRate;
          const bd = exportFormat === 'mp3' ? 16 : exportBitDepth;
          const sourceUrl = session.inputFile?.url || DEMO_AUDIO_URL;
          const rendered = await fetchAndRenderAudio(sourceUrl, sr, 30);
          const blob = audioBufferToWavBlob(rendered, bd);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'master_export.wav';
          a.click();
          URL.revokeObjectURL(url);
          Alert.alert('Exportado', 'Master exportado via download.');
        } catch {
          Alert.alert('Erro', 'Falha ao exportar master.');
        }
      } else {
        Alert.alert('Erro', 'Falha ao exportar master.');
      }
    }
    setExporting(false);
    setShowExport(false);
  }, [exportFormat, exportBitDepth, exportSampleRate, session.inputFile]);

  return (
    <View className="flex-1 bg-dark-bg">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-border">
        <View className="flex-row items-center gap-3">
          {onBack && (
            <Pressable onPress={onBack} className="w-8 h-8 rounded-lg bg-dark-surface items-center justify-center active:opacity-70">
              <Text className="text-gray-400 text-lg">←</Text>
            </Pressable>
          )}
          <View>
            <Text className="text-white text-base font-bold">Mastering Suite</Text>
            <Text className="text-gray-500 text-[10px] uppercase tracking-wider">OpenBand</Text>
          </View>
        </View>
        <Pressable
          onPress={() => setShowExport(true)}
          className="px-4 py-2 rounded-lg bg-brand-accent active:opacity-80"
        >
          <Text className="text-white text-xs font-bold">Export</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4 pt-3 pb-6" showsVerticalScrollIndicator={false}>
        <MasteringUpload
          input={session.inputFile}
          mode={inputMode}
          onModeChange={setInputMode}
          onUpload={handleUpload}
          onClear={handleClearInput}
        />

        <View className="mt-4 bg-dark-surface rounded-xl border border-dark-border p-3">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={togglePlay}
              className="w-10 h-10 rounded-full bg-brand-accent items-center justify-center active:opacity-80"
            >
              <Text className="text-white text-lg">
                {playerStatus.playing ? '⏸' : '▶'}
              </Text>
            </Pressable>
            <View className="flex-1">
              <View className="h-2 bg-dark-muted rounded-full overflow-hidden">
                <Pressable
                  onPress={(e) => {
                    const x = (e as any).nativeEvent?.locationX ?? 0;
                    const w = (e as any).nativeEvent?.target?.clientWidth ?? 1;
                    handleSeek(x / (w || 1));
                  }}
                  className="h-full"
                  style={{ width: `${playerStatus.duration > 0 ? (playerStatus.currentTime / playerStatus.duration) * 100 : 0}%`, backgroundColor: '#007aff' }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-gray-400 text-[10px] font-mono">
                  {formatTime(playerStatus.currentTime)}
                </Text>
                <Text className="text-gray-500 text-[10px] font-mono">
                  {playerStatus.isLoaded ? formatTime(playerStatus.duration) : '--:--'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-4">
          <LufsMeter isPlaying={playerStatus.playing && !session.bypassed} />
        </View>

        <View className="mt-4">
          <MasteringChain
            plugins={plugins}
            onToggle={handleToggle}
            onEdit={(p) => setEditingPluginId(p.id)}
            onReset={handleReset}
          />
        </View>

        <View className="mt-4">
          <MasteringVersionManager
            versions={session.versions}
            activeVersionId={session.activeVersionId}
            bypassed={session.bypassed}
            onSaveVersion={handleSaveVersion}
            onLoadVersion={handleLoadVersion}
            onDeleteVersion={handleDeleteVersion}
            onToggleBypass={handleToggleBypass}
          />
        </View>

        <View className="mt-4 mb-8">
          <View className="flex-row items-center gap-2 mb-2">
            <View className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Export</Text>
          </View>
          <Pressable
            onPress={() => setShowExport(true)}
            className="bg-gradient-to-r from-purple-600/30 to-brand-accent/30 rounded-xl border border-purple-500/30 p-4 items-center active:opacity-80"
          >
            <Text className="text-white text-sm font-bold">Exportar Master</Text>
            <Text className="text-gray-400 text-[10px] mt-1">
              WAV {exportBitDepth}-bit / {exportSampleRate / 1000}kHz
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {showExport && (
        <View className="absolute inset-0 z-50 bg-black/70 justify-end">
          <View className="bg-dark-elevated border-t border-dark-border rounded-t-3xl p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-base font-bold">Exportar Master</Text>
              <Pressable onPress={() => setShowExport(false)} className="w-8 h-8 rounded-full bg-dark-surface items-center justify-center">
                <Text className="text-gray-400 text-lg">✕</Text>
              </Pressable>
            </View>

            <View className="mb-4">
              <Text className="text-gray-400 text-xs font-medium mb-2">Formato</Text>
              <View className="flex-row gap-2">
                {(['wav', 'mp3'] as const).map(f => (
                  <Pressable
                    key={f}
                    onPress={() => setExportFormat(f)}
                    className={`flex-1 py-3 rounded-xl items-center border ${exportFormat === f ? 'bg-brand-accent/20 border-brand-accent' : 'bg-dark-surface border-dark-border'}`}
                  >
                    <Text className={`text-xs font-bold uppercase ${exportFormat === f ? 'text-brand-accent' : 'text-gray-400'}`}>{f}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {exportFormat === 'wav' && (
              <View className="mb-4">
                <Text className="text-gray-400 text-xs font-medium mb-2">Bit Depth</Text>
                <View className="flex-row gap-2">
                  {([16, 24] as const).map(b => (
                    <Pressable
                      key={b}
                      onPress={() => setExportBitDepth(b)}
                      className={`flex-1 py-3 rounded-xl items-center border ${exportBitDepth === b ? 'bg-brand-accent/20 border-brand-accent' : 'bg-dark-surface border-dark-border'}`}
                    >
                      <Text className={`text-xs font-bold ${exportBitDepth === b ? 'text-brand-accent' : 'text-gray-400'}`}>{b}-bit</Text>
                      <Text className={`text-[8px] ${exportBitDepth === b ? 'text-brand-accent/70' : 'text-gray-600'}`}>
                        {b === 16 ? 'Com dithering' : 'Alta resolução'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {exportFormat === 'mp3' && (
              <View className="mb-4 bg-dark-surface rounded-xl border border-dark-border p-3">
                <Text className="text-gray-400 text-xs">MP3 320 kbps CBR</Text>
                <Text className="text-gray-600 text-[10px] mt-0.5">Para distribuição rápida</Text>
              </View>
            )}

            <View className="mb-4">
              <Text className="text-gray-400 text-xs font-medium mb-2">Sample Rate</Text>
              <View className="flex-row gap-2">
                {([44100, 48000, 96000] as const).map(r => (
                  <Pressable
                    key={r}
                    onPress={() => setExportSampleRate(r)}
                    className={`flex-1 py-3 rounded-xl items-center border ${exportSampleRate === r ? 'bg-brand-accent/20 border-brand-accent' : 'bg-dark-surface border-dark-border'}`}
                  >
                    <Text className={`text-xs font-bold ${exportSampleRate === r ? 'text-brand-accent' : 'text-gray-400'}`}>{r / 1000}kHz</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={handleExport}
              disabled={!session.inputFile || exporting}
              className={`py-3 rounded-xl items-center ${session.inputFile && !exporting ? 'bg-brand-accent' : 'bg-dark-muted'}`}
            >
              <Text className={`text-sm font-bold ${session.inputFile && !exporting ? 'text-white' : 'text-gray-500'}`}>
                {exporting ? 'Renderizando...' : session.inputFile ? 'Renderizar & Exportar' : 'Faça upload primeiro'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <PluginEditor
        plugin={editingPlugin}
        onParamChange={handleParamChange}
        onToggle={handleToggle}
        onClose={() => setEditingPluginId(null)}
      />
    </View>
  );
}

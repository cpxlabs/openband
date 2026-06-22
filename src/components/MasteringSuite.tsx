import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Platform } from 'react-native';
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

export function MasteringSuite({ initialProjectId, onBack }: MasteringSuiteProps) {
  const [session, setSession] = useState<MasteringSession>({
    inputFile: null,
    versions: [],
    activeVersionId: null,
    bypassed: false,
  });
  const [plugins, setPlugins] = useState<Plugin[]>(buildMasteringChain());
  const [inputMode, setInputMode] = useState<'single' | 'stems'>('single');
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<'wav' | 'mp3'>('wav');
  const [exportBitDepth, setExportBitDepth] = useState<16 | 24>(24);
  const [exportSampleRate, setExportSampleRate] = useState<44100 | 48000 | 96000>(44100);
  const [exporting, setExporting] = useState(false);

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
      url: `audio://input-${now}.wav`,
      stems: inputMode === 'stems'
        ? [
            { name: 'Drums', url: `audio://stem-drums-${now}.wav` },
            { name: 'Bass', url: `audio://stem-bass-${now}.wav` },
            { name: 'Vocals', url: `audio://stem-vocals-${now}.wav` },
            { name: 'Melodies', url: `audio://stem-melodies-${now}.wav` },
          ]
        : undefined,
    };
    setSession(prev => ({ ...prev, inputFile: input }));
  }, [inputMode]);

  const handleClearInput = useCallback(() => {
    setSession(prev => ({ ...prev, inputFile: null }));
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const sampleRate = exportFormat === 'mp3' ? 44100 : exportSampleRate;
      const bitDepth = exportFormat === 'mp3' ? 16 : exportBitDepth;
      const ext = exportFormat === 'mp3' ? '.mp3' : '.wav';
      const duration = session.inputFile?.duration ?? 30;
      const numSamples = Math.floor(sampleRate * Math.min(duration, 300));
      const numChannels = 2;
      const bytesPerSample = bitDepth / 8;
      const blockAlign = numChannels * bytesPerSample;
      const dataSize = numSamples * blockAlign;
      const headerSize = 44;
      const totalSize = headerSize + dataSize;

      const arrayBuffer = new ArrayBuffer(totalSize);
      const view = new DataView(arrayBuffer);
      writeWavHeader(view, 0, numChannels, sampleRate, bitDepth, dataSize);

      const filename = session.inputFile
        ? session.inputFile.filename.replace(/\.[^/.]+$/, '') + '_master'
        : 'master_export';
      const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '').replace(/\s+/g, '_') + ext;

      const path = await OpenBandNative.showSaveDialog({
        defaultPath: safeName,
        filters: [{ name: 'Audio', extensions: [exportFormat] }],
      });

      if (path) {
        const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
        const bytes = await blob.arrayBuffer();
        await OpenBandNative.writeFile(path, bytes);
        Alert.alert('Exportado', `Master exportado como ${exportFormat.toUpperCase()} (${bitDepth}bit, ${sampleRate}Hz)`);
      }
    } catch (e) {
      console.error('Export failed:', e);
      if (Platform.OS === 'web') {
        const sampleRate = exportFormat === 'mp3' ? 44100 : exportSampleRate;
        const bitDepth = exportFormat === 'mp3' ? 16 : exportBitDepth;
        const numSamples = Math.floor(sampleRate * 30);
        const numChannels = 2;
        const bytesPerSample = bitDepth / 8;
        const dataSize = numSamples * numChannels * bytesPerSample;
        const totalSize = 44 + dataSize;
        const buf = new ArrayBuffer(totalSize);
        const vw = new DataView(buf);
        writeWavHeader(vw, 0, numChannels, sampleRate, bitDepth, dataSize);
        const blob = new Blob([buf], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'master_export.wav';
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Exportado', 'Master exportado via download.');
      } else {
        Alert.alert('Erro', 'Falha ao exportar master.');
      }
    }
    setExporting(false);
    setShowExport(false);
  }, [plugins, exportFormat, exportBitDepth, exportSampleRate, session.inputFile]);

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

        <View className="mt-4">
          <LufsMeter isPlaying={!session.bypassed && !!session.inputFile} />
        </View>

        <View className="mt-4">
          <MasteringChain
            plugins={plugins}
            onToggle={handleToggle}
            onEdit={setEditingPlugin}
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
        onClose={() => setEditingPlugin(null)}
      />
    </View>
  );
}

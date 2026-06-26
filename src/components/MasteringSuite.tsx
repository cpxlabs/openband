import { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import type { Plugin } from "../lib/types";
import { MasteringChain } from "./MasteringChain";
import { MasteringVersionManager } from "./MasteringVersionManager";
import { MasteringUpload } from "./MasteringUpload";
import { LufsMeter } from "./LufsMeter";
import { PluginEditor } from "./PluginEditor";
import {
  MasteringInput,
  MasteringSession,
  buildMasteringChain,
  createVersion,
} from "../lib/masteringSuite";
import { OpenBandNative } from "../bridge";
import { DEMO_AUDIO_URL } from "../lib/constants";
import { takeMasteringInput } from "../lib/masteringBridge";
import { audioBufferToWavBlob } from "../lib/audio";

interface MasteringSuiteProps {
  onBack?: () => void;
  testID?: string;
}

async function fetchAndRenderAudio(
  url: string,
  sampleRate: number,
  duration: number,
): Promise<AudioBuffer> {
  if (Platform.OS !== "web")
    throw new Error("AudioContext unavailable on native");
  const response = await fetch(url);
  const raw = await response.arrayBuffer();
  const audioCtx = new AudioContext();
  try {
    const decoded = await audioCtx.decodeAudioData(raw);
    const renderLen = Math.ceil(
      sampleRate * Math.min(duration, decoded.duration),
    );
    const offlineCtx = new OfflineAudioContext(2, renderLen, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);
    return offlineCtx.startRendering();
  } finally {
    audioCtx.close();
  }
}

export function MasteringSuite({ onBack, testID }: MasteringSuiteProps) {
  const [session, setSession] = useState<MasteringSession>(() => {
    const pending = takeMasteringInput();
    if (pending) {
      return {
        inputFile: {
          type: "stems",
          filename: pending.filename,
          size: 0,
          sampleRate: 44100,
          bitDepth: 24,
          duration: 180,
          url: pending.url,
          stems: pending.stems,
        },
        versions: [],
        activeVersionId: null,
        bypassed: false,
      };
    }
    return {
      inputFile: null,
      versions: [],
      activeVersionId: null,
      bypassed: false,
    };
  });
  const [inputMode, setInputMode] = useState<"single" | "stems">(
    session.inputFile?.stems ? "stems" : "single",
  );
  const [plugins, setPlugins] = useState<Plugin[]>(buildMasteringChain());
  const [editingPluginId, setEditingPluginId] = useState<string | null>(null);
  const editingPlugin = useMemo(() => {
    if (!editingPluginId) return null;
    return plugins.find((p) => p.id === editingPluginId) ?? null;
  }, [editingPluginId, plugins]);
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<"wav" | "mp3">("wav");
  const [exportBitDepth, setExportBitDepth] = useState<16 | 24>(24);
  const [exportSampleRate, setExportSampleRate] = useState<
    44100 | 48000 | 96000
  >(44100);
  const [exporting, setExporting] = useState(false);
  const [seekBarWidth, setSeekBarWidth] = useState(0);

  const audioSource = useMemo(() => {
    if (
      session.inputFile?.url &&
      !session.inputFile.url.startsWith("audio://")
    ) {
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

  const handleSeek = useCallback(
    (pct: number) => {
      if (playerStatus.duration) {
        player.seekTo(pct * playerStatus.duration);
      }
    },
    [player, playerStatus.duration],
  );

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const handleToggle = useCallback((pluginId: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === pluginId ? { ...p, enabled: !p.enabled } : p)),
    );
  }, []);

  const handleParamChange = useCallback(
    (pluginId: string, paramId: string, value: number) => {
      setPlugins((prev) =>
        prev.map((p) =>
          p.id === pluginId
            ? { ...p, params: { ...p.params, [paramId]: value } }
            : p,
        ),
      );
    },
    [],
  );

  const handleReset = useCallback(() => {
    setPlugins(buildMasteringChain());
  }, []);

  const handleSaveVersion = useCallback(
    (name: string, notes: string) => {
      const version = createVersion(plugins, name, notes);
      setSession((prev) => ({
        ...prev,
        versions: [...prev.versions, version],
        activeVersionId: version.id,
      }));
    },
    [plugins],
  );

  const handleLoadVersion = useCallback(
    (id: string) => {
      const version = session.versions.find((v) => v.id === id);
      if (version) {
        setPlugins(
          version.plugins.map((p) => ({ ...p, params: { ...p.params } })),
        );
        setSession((prev) => ({
          ...prev,
          activeVersionId: id,
          bypassed: false,
        }));
      }
    },
    [session.versions],
  );

  const handleDeleteVersion = useCallback((id: string) => {
    setSession((prev) => ({
      ...prev,
      versions: prev.versions.filter((v) => v.id !== id),
      activeVersionId:
        prev.activeVersionId === id ? null : prev.activeVersionId,
    }));
  }, []);

  const handleToggleBypass = useCallback(() => {
    setSession((prev) => ({ ...prev, bypassed: !prev.bypassed }));
  }, []);

  const handleUpload = useCallback(() => {
    if (Platform.OS !== "web") return;
    const inputEl = document.createElement("input");
    inputEl.type = "file";
    inputEl.accept = ".wav,.mp3,.aiff,.flac,.ogg,.m4a";
    inputEl.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 200 * 1024 * 1024) {
        Alert.alert("Erro", "Arquivo muito grande (max 200MB).");
        return;
      }
      const url = URL.createObjectURL(file);
      const input: MasteringInput = {
        type: inputMode,
        filename: file.name,
        size: file.size,
        sampleRate: 44100,
        bitDepth: 24,
        duration: 180,
        url,
        stems:
          inputMode === "stems"
            ? [
                { name: "Drums", url },
                { name: "Bass", url },
                { name: "Vocals", url },
                { name: "Melodies", url },
              ]
            : undefined,
      };
      setSession((prev) => ({ ...prev, inputFile: input }));
    };
    inputEl.click();
  }, [inputMode]);

  const handleClearInput = useCallback(() => {
    player.pause();
    setSession((prev) => ({ ...prev, inputFile: null }));
  }, [player]);

  const handleExport = useCallback(async () => {
    if (Platform.OS !== "web") {
      Alert.alert(
        "Indisponível",
        "Exportação está disponível apenas na versão web.",
      );
      setExporting(false);
      return;
    }
    setExporting(true);
    try {
      const sr = exportFormat === "mp3" ? 44100 : exportSampleRate;
      const bd = exportFormat === "mp3" ? 16 : exportBitDepth;
      const ext = exportFormat === "mp3" ? ".mp3" : ".wav";
      const sourceUrl = session.inputFile?.url || DEMO_AUDIO_URL;
      const duration = session.inputFile?.duration ?? 30;

      const rendered = await fetchAndRenderAudio(sourceUrl, sr, duration);
      const blob = audioBufferToWavBlob(rendered, bd);

      const filename = session.inputFile
        ? session.inputFile.filename.replace(/\.[^/.]+$/, "") + "_master"
        : "master_export";
      const safeName =
        filename.replace(/[^a-zA-Z0-9_-]/g, "").replace(/\s+/g, "_") + ext;

      const path = await OpenBandNative.showSaveDialog({
        defaultPath: safeName,
        filters: [{ name: "Audio", extensions: [exportFormat] }],
      });

      if (path) {
        const bytes = await blob.arrayBuffer();
        await OpenBandNative.writeFile(path, bytes);
        Alert.alert(
          "Exportado",
          `Master exportado com áudio (${bd}bit, ${sr}Hz)`,
        );
      }
    } catch (e) {
      console.error("Export failed:", e);
      Alert.alert("Erro", "Falha ao exportar master.");
    }
    setExporting(false);
    setShowExport(false);
  }, [exportFormat, exportBitDepth, exportSampleRate, session.inputFile]);

  return (
    <View testID={testID} className="flex-1 bg-dark-bg">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-border">
        <View className="flex-row items-center gap-3">
          {onBack && (
            <Pressable
              onPress={onBack}
              className="w-8 h-8 rounded-lg bg-dark-surface items-center justify-center active:opacity-70"
            >
              <Text className="text-gray-400 text-lg">←</Text>
            </Pressable>
          )}
          <View>
            <Text className="text-white text-base font-bold">
              Mastering Suite
            </Text>
            <Text className="text-gray-500 text-[10px] uppercase tracking-wider">
              OpenBand
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setShowExport(true)}
          className="px-4 py-2 rounded-lg bg-brand-accent active:opacity-80"
        >
          <Text className="text-white text-xs font-bold">Export</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-3 pb-6"
        showsVerticalScrollIndicator={false}
      >
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
                {playerStatus.playing ? "⏸" : "▶"}
              </Text>
            </Pressable>
            <View className="flex-1">
              <View
                className="h-2 bg-dark-muted rounded-full overflow-hidden"
                onLayout={(e) => setSeekBarWidth(e.nativeEvent.layout.width)}
              >
                <Pressable
                  onPress={(e) => {
                    const x = e.nativeEvent.locationX;
                    handleSeek(seekBarWidth > 0 ? x / seekBarWidth : 0);
                  }}
                  className="h-full"
                  style={{
                    width: `${playerStatus.duration > 0 ? (playerStatus.currentTime / playerStatus.duration) * 100 : 0}%`,
                    backgroundColor: "#007aff",
                  }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-gray-400 text-[10px] font-mono">
                  {formatTime(playerStatus.currentTime)}
                </Text>
                <Text className="text-gray-500 text-[10px] font-mono">
                  {playerStatus.isLoaded
                    ? formatTime(playerStatus.duration)
                    : "--:--"}
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
            <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Export
            </Text>
          </View>
          <Pressable
            onPress={() => setShowExport(true)}
            className="bg-purple-600/30 rounded-xl border border-purple-500/30 p-4 items-center active:opacity-80"
          >
            <Text className="text-white text-sm font-bold">
              Exportar Master
            </Text>
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
              <Text className="text-white text-base font-bold">
                Exportar Master
              </Text>
              <Pressable
                onPress={() => setShowExport(false)}
                className="w-8 h-8 rounded-full bg-dark-surface items-center justify-center"
              >
                <Text className="text-gray-400 text-lg">✕</Text>
              </Pressable>
            </View>

            <View className="mb-4">
              <Text className="text-gray-400 text-xs font-medium mb-2">
                Formato
              </Text>
              <View className="flex-row gap-2">
                {(["wav", "mp3"] as const).map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setExportFormat(f)}
                    className={`flex-1 py-3 rounded-xl items-center border ${exportFormat === f ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-surface border-dark-border"}`}
                  >
                    <Text
                      className={`text-xs font-bold uppercase ${exportFormat === f ? "text-brand-accent" : "text-gray-400"}`}
                    >
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {exportFormat === "wav" && (
              <View className="mb-4">
                <Text className="text-gray-400 text-xs font-medium mb-2">
                  Bit Depth
                </Text>
                <View className="flex-row gap-2">
                  {([16, 24] as const).map((b) => (
                    <Pressable
                      key={b}
                      onPress={() => setExportBitDepth(b)}
                      className={`flex-1 py-3 rounded-xl items-center border ${exportBitDepth === b ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-surface border-dark-border"}`}
                    >
                      <Text
                        className={`text-xs font-bold ${exportBitDepth === b ? "text-brand-accent" : "text-gray-400"}`}
                      >
                        {b}-bit
                      </Text>
                      <Text
                        className={`text-[8px] ${exportBitDepth === b ? "text-brand-accent/70" : "text-gray-600"}`}
                      >
                        {b === 16 ? "Com dithering" : "Alta resolução"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {exportFormat === "mp3" && (
              <View className="mb-4 bg-dark-surface rounded-xl border border-dark-border p-3">
                <Text className="text-gray-400 text-xs">MP3 320 kbps CBR</Text>
                <Text className="text-gray-600 text-[10px] mt-0.5">
                  Para distribuição rápida
                </Text>
              </View>
            )}

            <View className="mb-4">
              <Text className="text-gray-400 text-xs font-medium mb-2">
                Sample Rate
              </Text>
              <View className="flex-row gap-2">
                {([44100, 48000, 96000] as const).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setExportSampleRate(r)}
                    className={`flex-1 py-3 rounded-xl items-center border ${exportSampleRate === r ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-surface border-dark-border"}`}
                  >
                    <Text
                      className={`text-xs font-bold ${exportSampleRate === r ? "text-brand-accent" : "text-gray-400"}`}
                    >
                      {r / 1000}kHz
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={handleExport}
              disabled={!session.inputFile || exporting}
              className={`py-3 rounded-xl items-center ${session.inputFile && !exporting ? "bg-brand-accent" : "bg-dark-muted"}`}
            >
              <Text
                className={`text-sm font-bold ${session.inputFile && !exporting ? "text-white" : "text-gray-500"}`}
              >
                {exporting
                  ? "Renderizando..."
                  : session.inputFile
                    ? "Renderizar & Exportar"
                    : "Faça upload primeiro"}
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

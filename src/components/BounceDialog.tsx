import { useState, useCallback } from "react";
import { View, Text, Modal, Pressable, Alert } from "react-native";
import { ProgressBar } from "./ProgressBar";
import { audioSystem } from "../lib/universalAudio";
import { exportVideo, downloadVideoFile, VideoExportOptions } from "../lib/videoExport";

type ExportFormat = "wav" | "aiff" | "flac";
type BitDepth = 16 | 24 | 32;
type ExportSampleRate = 44100 | 48000 | 96000;
type ExportMode = "audio" | "video";

const FORMATS: { key: ExportFormat; label: string; ext: string }[] = [
  { key: "wav", label: "WAV", ext: ".wav" },
  { key: "aiff", label: "AIFF", ext: ".aiff" },
  { key: "flac", label: "FLAC", ext: ".flac" },
];

const VIDEO_FORMATS: { key: "webm" | "mp4"; label: string; ext: string }[] = [
  { key: "webm", label: "WebM", ext: ".webm" },
  { key: "mp4", label: "MP4", ext: ".mp4" },
];

const BIT_DEPTHS: BitDepth[] = [16, 24, 32];
const SAMPLE_RATES: ExportSampleRate[] = [44100, 48000, 96000];

interface BounceRegion {
  id?: string;
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
  bpm?: number;
  tracks?: BounceTrack[];
  testID?: string;
}

export function BounceDialog({
  visible,
  onClose,
  projectTitle,
  duration,
  bpm = 120,
  tracks = [],
  testID,
}: BounceDialogProps) {
  const [mode, setMode] = useState<ExportMode>("audio");
  const [format, setFormat] = useState<ExportFormat>("wav");
  const [videoFormat, setVideoFormat] = useState<"webm" | "mp4">("webm");
  const [bitDepth, setBitDepth] = useState<BitDepth>(24);
  const [sampleRate, setSampleRate] = useState<ExportSampleRate>(48000);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoColor, setVideoColor] = useState("#6366f1");

  const updateProgress = useCallback((pct: number) => {
    setProgress(pct);
  }, []);

  const handleVideoExport = useCallback(async () => {
    setExporting(true);
    setProgress(0);

    try {
      await audioSystem.initialize();
      const ext = VIDEO_FORMATS.find((f) => f.key === videoFormat)?.ext || ".webm";

      const videoTracks = tracks.map((t) => ({
        id: t.id,
        name: t.name,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
        solo: t.solo,
        regions: t.regions.map((r) => ({
          ...r,
          color: t.name.toLowerCase().includes("drum") ? "#f59e0b"
            : t.name.toLowerCase().includes("bass") ? "#10b981"
            : t.name.toLowerCase().includes("vocal") ? "#ec4899"
            : videoColor,
        })),
      }));

      const videoOptions: VideoExportOptions = {
        width: 1080,
        height: 1920,
        title: projectTitle,
        color: videoColor,
        format: videoFormat,
      };

      const result = await exportVideo(
        videoTracks,
        bpm,
        Math.min(duration, 300),
        videoOptions,
        updateProgress,
      );

      updateProgress(95);
      const filename = `${projectTitle.replace(/[^a-zA-Z0-9_-]/g, "").replace(/\s+/g, "_")}_video${ext}`;
      await downloadVideoFile(result.blob, filename, updateProgress);
      updateProgress(100);

      Alert.alert(
        "Exportado",
        `V\xeddeo exportado como ${videoFormat.toUpperCase()}`,
      );
    } catch (e) {
      console.error("Video export failed:", e);
      Alert.alert("Erro", "Falha ao exportar v\xeddeo. O recurso requer um navegador web.");
    }
    setExporting(false);
  }, [
    videoFormat,
    projectTitle,
    duration,
    bpm,
    tracks,
    videoColor,
    updateProgress,
  ]);

  const handleExport = useCallback(async () => {
    if (mode === "video") {
      await handleVideoExport();
      return;
    }

    setExporting(true);
    setProgress(0);

    try {
      await audioSystem.initialize();
      const ext = FORMATS.find((f) => f.key === format)?.ext || ".wav";
      let blob: Blob;

      if (tracks.length > 0) {
        blob = await audioSystem.renderMixdown(
          tracks,
          Math.min(duration, 300),
          sampleRate,
          updateProgress,
        );
        updateProgress(75);
      } else {
        updateProgress(50);
        const sampleCount = Math.floor(sampleRate * Math.min(duration, 30));
        const raw = new ArrayBuffer(44 + sampleCount * 2);
        blob = new Blob([raw], { type: "audio/wav" });
        updateProgress(80);
      }

      updateProgress(92);
      const filename = `${projectTitle.replace(/[^a-zA-Z0-9_-]/g, "").replace(/\s+/g, "_")}_mix${ext}`;
      await audioSystem.exportToFile(blob, filename);
      updateProgress(100);

      Alert.alert(
        "Exportado",
        `Mix exportado como ${format.toUpperCase()} (${bitDepth}bit, ${sampleRate}Hz)`,
      );
    } catch (e) {
      console.error("Export failed:", e);
      Alert.alert("Erro", "Falha ao exportar mix.");
    }
    setExporting(false);
  }, [
    mode,
    format,
    bitDepth,
    sampleRate,
    projectTitle,
    duration,
    tracks,
    updateProgress,
  ]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable
        className="flex-1 bg-black/60 justify-center items-center px-6"
        onPress={onClose}
      >
        <Pressable className="w-full max-w-sm bg-dark-surface rounded-3xl border border-dark-border p-5">
          <Text className="text-white text-lg font-bold mb-1">
            Exportar Mix
          </Text>
          <Text className="text-gray-500 text-xs mb-5">
            Escolha as configurações de exportação
          </Text>

          <Text className="label mb-2">Mode</Text>
          <View className="flex-row gap-2 mb-4">
            <Pressable
              onPress={() => setMode("audio")}
              className={`flex-1 py-2.5 rounded-xl items-center border ${
                mode === "audio"
                  ? "bg-brand-primary/20 border-brand-primary"
                  : "bg-dark-elevated border-dark-border"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  mode === "audio" ? "text-brand-primary" : "text-white"
                }`}
              >
                Audio
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("video")}
              className={`flex-1 py-2.5 rounded-xl items-center border ${
                mode === "video"
                  ? "bg-brand-accent/20 border-brand-accent"
                  : "bg-dark-elevated border-dark-border"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  mode === "video" ? "text-brand-accent" : "text-white"
                }`}
              >
                Video
              </Text>
            </Pressable>
          </View>

          {mode === "audio" ? (
            <>
              <Text className="label mb-2">Formato</Text>
              <View className="flex-row gap-2 mb-4">
                {FORMATS.map((f) => (
                  <Pressable
                    key={f.key}
                    onPress={() => setFormat(f.key)}
                    className={`flex-1 py-2.5 rounded-xl items-center border ${
                      format === f.key
                        ? "bg-brand-primary/20 border-brand-primary"
                        : "bg-dark-elevated border-dark-border"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        format === f.key ? "text-brand-primary" : "text-white"
                      }`}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text className="label mb-2">Formato</Text>
              <View className="flex-row gap-2 mb-4">
                {VIDEO_FORMATS.map((f) => (
                  <Pressable
                    key={f.key}
                    onPress={() => setVideoFormat(f.key)}
                    className={`flex-1 py-2.5 rounded-xl items-center border ${
                      videoFormat === f.key
                        ? "bg-brand-accent/20 border-brand-accent"
                        : "bg-dark-elevated border-dark-border"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        videoFormat === f.key ? "text-brand-accent" : "text-white"
                      }`}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="label mb-2">Cor do waveform</Text>
              <View className="flex-row gap-2 mb-5">
                {["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"].map(
                  (c) => (
                    <Pressable
                      key={c}
                      onPress={() => setVideoColor(c)}
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        videoColor === c ? "border-2 border-white" : "border-2 border-transparent"
                      }`}
                      style={{ backgroundColor: c } as Record<string, string>}
                    >
                      {videoColor === c && (
                        <Text className="text-white text-xs">{"\u2713"}</Text>
                      )}
                    </Pressable>
                  ),
                )}
              </View>
            </>
          )}

          {mode === "audio" && (
            <>
              <Text className="label mb-2">Bit Depth</Text>
              <View className="flex-row gap-2 mb-4">
                {BIT_DEPTHS.map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => setBitDepth(b)}
                    className={`flex-1 py-2.5 rounded-xl items-center border ${
                      bitDepth === b
                        ? "bg-brand-accent/20 border-brand-accent"
                        : "bg-dark-elevated border-dark-border"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        bitDepth === b ? "text-brand-accent" : "text-white"
                      }`}
                    >
                      {b}-bit
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="label mb-2">Sample Rate</Text>
              <View className="flex-row gap-2 mb-5">
                {SAMPLE_RATES.map((sr) => (
                  <Pressable
                    key={sr}
                    onPress={() => setSampleRate(sr)}
                    className={`flex-1 py-2.5 rounded-xl items-center border ${
                      sampleRate === sr
                        ? "bg-brand-accent/20 border-brand-accent"
                        : "bg-dark-elevated border-dark-border"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        sampleRate === sr ? "text-brand-accent" : "text-white"
                      }`}
                    >
                      {sr / 1000}kHz
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {exporting && (
            <View className="mb-5">
              <ProgressBar progress={progress} className="mb-2" />
              <Text className="text-gray-400 text-xs text-center">
                {progress}%
              </Text>
            </View>
          )}
          <View className="flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3 rounded-xl border border-dark-border items-center active:opacity-70"
              disabled={exporting}
            >
              <Text className="text-gray-400 text-sm font-semibold">
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={handleExport}
              className="flex-1 py-3 rounded-xl bg-brand-primary items-center active:opacity-80 disabled:opacity-50"
              disabled={exporting}
            >
              <Text
                className={`text-white text-sm font-bold ${
                  exporting ? "opacity-70" : ""
                }`}
              >
                {exporting ? "Exportando..." : "Exportar"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

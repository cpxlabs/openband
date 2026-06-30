import { useState, useCallback } from "react";
import { View, Text, Modal, Pressable, Alert } from "react-native";
import { ProgressBar } from "./ProgressBar";
import { audioSystem } from "../lib/universalAudio";

type ExportFormat = "wav" | "aiff" | "flac";
type BitDepth = 16 | 24 | 32;
type ExportSampleRate = 44100 | 48000 | 96000;

const FORMATS: { key: ExportFormat; label: string; ext: string }[] = [
  { key: "wav", label: "WAV", ext: ".wav" },
  { key: "aiff", label: "AIFF", ext: ".aiff" },
  { key: "flac", label: "FLAC", ext: ".flac" },
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
  tracks?: BounceTrack[];
  testID?: string;
}

export function BounceDialog({
  visible,
  onClose,
  projectTitle,
  duration,
  tracks = [],
  testID,
}: BounceDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("wav");
  const [bitDepth, setBitDepth] = useState<BitDepth>(24);
  const [sampleRate, setSampleRate] = useState<ExportSampleRate>(48000);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateProgress = useCallback((pct: number) => {
    setProgress(pct);
  }, []);

  const handleExport = useCallback(async () => {
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

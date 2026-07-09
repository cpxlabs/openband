import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  ProgressBar,
  NewProject,
  Sidebar,
} from "../src/components";
import { DEMO_AUDIO_URL, SCREEN_BOTTOM_PADDING } from "../src/lib/constants";
import { LAYOUT_MAX_WIDTHS, useResponsive } from "../src/lib/responsive";
import { saveProject } from "../src/lib/projectStore";
import { setMasteringInput } from "../src/lib/masteringBridge";
import type { TrackDef, TrackRegion } from "../src/lib/types";
import type { GenreTemplate, Mood } from "../src/lib/projectTemplates";
import { useWebAudioPlayer } from "../src/hooks/useWebAudioPlayer";

type StemType = "drums" | "bass" | "vocals" | "other";

interface StemResult {
  type: StemType;
  label: string;
  icon: string;
  color: string;
  url: string;
  duration: number;
}

const STEM_META: Record<
  StemType,
  { label: string; icon: string; color: string }
> = {
  drums: { label: "Bateria", icon: "🥁", color: "bg-green-600" },
  bass: { label: "Baixo", icon: "🎸", color: "bg-blue-600" },
  vocals: { label: "Vocal", icon: "🎤", color: "bg-purple-600" },
  other: { label: "Outros", icon: "🎹", color: "bg-amber-600" },
};

const PRESET_TRACKS = [
  { id: "demo1", title: "Rock Alternativo", artist: "Banda Exemplo" },
  { id: "demo2", title: "Lo-fi Study Beat", artist: "Produtor Anônimo" },
];

type Phase = "select" | "processing" | "done";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function StemPlayer({
  stem,
  onAddToProject,
}: {
  stem: StemResult;
  onAddToProject: () => void;
}) {
  const isWeb = Platform.OS === "web";
  const webPlayer = useWebAudioPlayer();
  const expoPlayer = useAudioPlayer(stem.url);
  const expoStatus = useAudioPlayerStatus(expoPlayer);

  const status = isWeb
    ? { playing: webPlayer.isPlaying, currentTime: webPlayer.currentTime, duration: webPlayer.duration }
    : expoStatus;
  const player = isWeb ? webPlayer : expoPlayer;

  const meta = STEM_META[stem.type];

  return (
    <Card className="mb-3">
      <View className="p-4 flex-row items-center gap-4">
        <View
          className={`w-14 h-14 rounded-2xl ${meta.color} items-center justify-center shadow-lg`}
        >
          <Text className="text-2xl">{meta.icon}</Text>
        </View>

        <View className="flex-1 gap-1">
          <Text className="text-white font-bold text-base">{meta.label}</Text>
          <View className="flex-row items-center gap-2">
            <Badge text={formatTime(stem.duration)} variant="play" />
            <Badge text="Stem" />
          </View>

          <View className="mt-1 h-1 bg-dark-border rounded-full overflow-hidden">
            <View
              className="h-full bg-white/60 rounded-full"
              style={{
                width: status.duration
                  ? `${(status.currentTime / status.duration) * 100}%`
                  : "0%",
              }}
            />
          </View>
        </View>

        <View className="gap-2">
          <Pressable
            onPress={async () => {
              if (status.playing) {
                player.pause();
              } else {
                if (isWeb) {
                  await webPlayer.replace(stem.url);
                  await webPlayer.play();
                } else {
                  expoPlayer.play();
                }
              }
            }}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              status.playing
                ? "bg-green-600"
                : "bg-dark-muted border border-dark-border"
            }`}
          >
            <Text className="text-white text-base">
              {status.playing ? "⏸" : "▶"}
            </Text>
          </Pressable>
          <Pressable
            onPress={onAddToProject}
            className="w-10 h-10 rounded-xl bg-brand-accent/20 items-center justify-center active:opacity-70"
          >
            <Text className="text-brand-accent text-base">+</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

export default function Extractor() {
  const [phase, setPhase] = useState<Phase>("select");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [results, setResults] = useState<StemResult[]>([]);
  const [animTick, setAnimTick] = useState(0);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectPrefill, setNewProjectPrefill] = useState<{
    title?: string;
  }>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const statusMessages = [
    "Analisando espectro de frequências...",
    "Separando bateria...",
    "Extraindo linha de baixo...",
    "Isolando vocais...",
    "Separando instrumentos restantes...",
    "Renderizando stems...",
    "Finalizando...",
  ];

  const startProcessing = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("processing");
    setProgress(0);
    let step = 0;

    timerRef.current = setInterval(() => {
      step += 1;
      const pct = Math.min(100, (step / statusMessages.length) * 100);
      setProgress(pct);
      setStatusText(
        statusMessages[Math.min(step - 1, statusMessages.length - 1)],
      );

      if (pct >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);

        const stems: StemResult[] = [
          {
            type: "drums",
            label: "Bateria",
            icon: "🥁",
            color: "bg-green-600",
            url: DEMO_AUDIO_URL,
            duration: 30,
          },
          {
            type: "bass",
            label: "Baixo",
            icon: "🎸",
            color: "bg-blue-600",
            url: DEMO_AUDIO_URL,
            duration: 28,
          },
          {
            type: "vocals",
            label: "Vocal",
            icon: "🎤",
            color: "bg-purple-600",
            url: DEMO_AUDIO_URL,
            duration: 25,
          },
          {
            type: "other",
            label: "Outros",
            icon: "🎹",
            color: "bg-amber-600",
            url: DEMO_AUDIO_URL,
            duration: 32,
          },
        ];
        setResults(stems);
        setPhase("done");
      }
    }, 600);
  }, []);

  useEffect(() => {
    if (phase === "processing") {
      animRef.current = setInterval(() => {
        setAnimTick((t) => t + 1);
      }, 50);
    }
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSelectPreset = useCallback((id: string) => {
    setSelectedTrack(id);
  }, []);

  const router = useRouter();
  const resp = useResponsive();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const handleNavigate = useCallback((route: string) => {
    const target = route === "index" ? "/tabs/feed" : `/tabs/${route}`;
    router.push(target as Parameters<typeof router.push>[0]);
    setDrawerOpen(false);
  }, [router]);

  const handleCreateProject = useCallback(
    (config: {
      name: string;
      genre: GenreTemplate;
      key: string;
      bpm: number;
      mood?: Mood;
      numBars?: number;
      timeSignature?: string;
    }) => {
      const stemDefaults: Record<
        StemType,
        { name: string; volume: number; pan: number }
      > = {
        drums: { name: "Drums", volume: 80, pan: 0 },
        bass: { name: "Bass", volume: 75, pan: 0 },
        vocals: { name: "Vocals", volume: 85, pan: 0 },
        other: { name: "Other", volume: 70, pan: 10 },
      };

      const projectId = `stems-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const tracks = results.map((stem) => {
        const defaults = stemDefaults[stem.type];
        return {
          id: `track-${stem.type}`,
          name: defaults.name,
          color: "bg-blue-500",
          muted: false,
          solo: false,
          volume: defaults.volume,
          pan: defaults.pan,
          sends: {},
          sidechainSource: null,
          regions: [
            {
              id: `region-${stem.type}`,
              start: 0,
              duration: stem.duration,
              url: stem.url,
            },
          ],
          plugins: [],
          automation: {},
        };
      });

      const projectTitle = results
        .map((s) => stemDefaults[s.type].name)
        .join(" + ");

      saveProject(projectId, {
        title: config.name || projectTitle,
        genre: config.genre.id,
        key: config.key,
        bpm: config.bpm,
        tracks,
        groups: [],
        buses: [],
        trackAssignments: {},
        masterPlugins: [],
        masteringChain: [],
        sendBuses: [],
        trackAmpChains: {},
        mixSnapshots: [],
        activeMixId: undefined,
        metronome: {
          bpm: config.bpm,
          timeSig: [4, 4],
          accentInterval: 4,
          volume: 60,
          enabled: true,
          countIn: true,
          countInBars: 2,
        },
        recordSettings: {
          armed: false,
          inputSource: "mic",
          quality: "high",
          sampleRate: 44100,
          mono: false,
          preRoll: 0,
        },
      });
      setShowNewProject(false);
      router.push(
        `/studio/${projectId}?title=${encodeURIComponent(config.name || projectTitle)}`,
      );
    },
    [results, router],
  );

  const handleAddToProject = useCallback(
    (stem: StemResult) => {
      const projectId = `stem-${Date.now()}`;
      const region: TrackRegion = {
        id: `region-${Date.now()}`,
        start: 0,
        duration: 30,
        url: stem.url,
      };
      const track: TrackDef = {
        id: `track-${Date.now()}`,
        name: stem.label,
        color: "bg-blue-500",
        muted: false,
        solo: false,
        volume: 75,
        pan: 0,
        sends: {},
        sidechainSource: null,
        regions: [region],
        plugins: [],
        automation: {},
      };
        saveProject(projectId, {
          title: stem.label,
          genre: "pop",
          key: "C",
          bpm: 120,
          tracks: [track],
          groups: [],
          buses: [],
          trackAssignments: {},
          masterPlugins: [],
          masteringChain: [],
          sendBuses: [],
          trackAmpChains: {},
          mixSnapshots: [],
          activeMixId: undefined,
        metronome: {
          bpm: 120,
          timeSig: [4, 4],
          accentInterval: 4,
          volume: 60,
          enabled: true,
          countIn: true,
          countInBars: 2,
        },
        recordSettings: {
          armed: false,
          inputSource: "mic",
          quality: "high",
          sampleRate: 44100,
          mono: false,
          preRoll: 0,
        },
      });
      router.push(
        `/studio/${projectId}?title=${encodeURIComponent(stem.label)}`,
      );
    },
    [router],
  );

  const handleReset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animRef.current) clearInterval(animRef.current);
    setPhase("select");
    setProgress(0);
    setSelectedTrack(null);
    setResults([]);
    setStatusText("");
  }, []);

  return (
    <View className="flex-1 bg-dark-bg flex-row">
      {resp.isDesktop && (
        <Sidebar
          currentRoute=""
          onNavigate={handleNavigate}
          isOpen
          onClose={() => {}}
          isPersistent
          testID="sidebar"
        />
      )}
      {drawerOpen && (
        <View className="absolute inset-0 z-50 flex-row">
          <Pressable className="flex-1 bg-black/60" onPress={() => setDrawerOpen(false)} />
          <View className="w-64 bg-[#0d0d11] border-l border-dark-border/40 h-full">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-border/40">
              <Text className="text-white font-bold text-base">Open<Text className="text-brand-primary">Band</Text></Text>
              <Pressable onPress={() => setDrawerOpen(false)} className="w-7 h-7 rounded-full bg-dark-muted/30 items-center justify-center active:opacity-70">
                <Text className="text-gray-400 text-sm">✕</Text>
              </Pressable>
            </View>
            <ScrollView className="flex-1 px-2 pt-2">
              {[
                { key: "index", label: "Feed", icon: "♫" },
                { key: "moments", label: "Momentos", icon: "♡" },
                { key: "library", label: "Biblioteca", icon: "☰" },
                { key: "account", label: "Conta", icon: "●" },
                { key: "settings", label: "Ajustes", icon: "⚙" },
              ].map((item) => (
                <Pressable key={item.key} onPress={() => handleNavigate(item.key)} className="flex-row items-center gap-3 px-3 py-3 rounded-xl mb-0.5 border border-transparent">
                  <View className="w-8 h-8 rounded-lg bg-dark-muted/20 items-center justify-center">
                    <Text className="text-base text-gray-400">{item.icon}</Text>
                  </View>
                  <Text className="flex-1 text-sm font-semibold text-gray-300">{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
      <View className="flex-1">
        {!resp.isDesktop && (
          <View className="bg-dark-surface/95 border-b border-dark-border/50 flex-row items-center px-3 h-12">
            <Pressable
              testID="hamburger-button"
              onPress={() => setDrawerOpen(true)}
              className="w-9 h-9 rounded-lg bg-dark-muted/30 items-center justify-center active:opacity-70"
            >
              <Text className="text-gray-300 text-lg">☰</Text>
            </Pressable>
            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-sm tracking-wide">Extrator de Stems</Text>
            </View>
            <View className="w-9" />
          </View>
        )}
      {phase === "done" && (
        <View
          className="pt-4 tablet:pt-12 px-4 tablet:px-6 flex-row justify-end"
          style={{
            maxWidth: LAYOUT_MAX_WIDTHS.extractor,
            alignSelf: "center",
            width: "100%",
          }}
        >
          <Pressable onPress={handleReset} className="p-2 active:opacity-60">
            <Text className="text-brand-accent text-sm font-medium">
              Nova extração
            </Text>
          </Pressable>
        </View>
      )}

      <View
        className="pt-4 tablet:pt-12 px-4 tablet:px-6"
        style={{
          maxWidth: LAYOUT_MAX_WIDTHS.extractor,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <PageHeader
          title="Separar Stems"
          subtitle="Extraia faixas individuais de qualquer áudio"
        />
      </View>

      <ScrollView
        className="flex-1 px-4 tablet:px-6"
        style={{
          maxWidth: LAYOUT_MAX_WIDTHS.extractor,
          alignSelf: "center",
          width: "100%",
        }}
        contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_PADDING, flexGrow: 1 }}
      >
        {phase === "select" && (
          <View>
            <View className="card-elevated p-5 tablet:p-8 mb-6 items-center border-dashed border-2 border-dark-border active:border-brand-accent">
              <View className="w-16 h-16 rounded-2xl bg-brand-primary/10 items-center justify-center mb-4">
                <Text className="text-3xl">📁</Text>
              </View>
              <Text className="text-white font-semibold text-lg mb-1">
                Selecionar arquivo de áudio
              </Text>
              <Text className="text-gray-500 text-sm text-center mb-4 max-w-xs">
                MP3, WAV, FLAC ou M4A
              </Text>
              <Button
                title="Escolher arquivo"
                variant="secondary"
                icon="📂"
                onPress={() => {
                  handleSelectPreset("custom");
                  startProcessing();
                }}
              />
            </View>

            <View className="flex-row items-center gap-3 mb-4">
              <View className="flex-1 h-px bg-dark-border" />
              <Text className="text-gray-600 text-xs font-medium">
                ou use uma faixa de demonstração
              </Text>
              <View className="flex-1 h-px bg-dark-border" />
            </View>

            {PRESET_TRACKS.map((track) => (
              <Pressable
                key={track.id}
                onPress={() => {
                  handleSelectPreset(track.id);
                  startProcessing();
                }}
                className="card p-4 mb-3 active:border-brand-accent/50 flex-row items-center gap-4"
              >
                <View className="w-12 h-12 rounded-xl bg-brand-primary/20 items-center justify-center">
                  <Text className="text-xl">♫</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold">
                    {track.title}
                  </Text>
                  <Text className="text-gray-500 text-sm">{track.artist}</Text>
                </View>
                <Text className="text-gray-400">→</Text>
              </Pressable>
            ))}
          </View>
        )}

        {phase === "processing" && (
          <View className="items-center py-16 px-4">
            <View className="w-24 h-24 rounded-3xl bg-brand-primary/10 items-center justify-center mb-6">
              <Text className="text-5xl">🔊</Text>
            </View>

            <View className="flex-row gap-1.5 mb-6">
              {Array.from({ length: 9 }, (_, i) => (
                <View
                  key={i}
                  className="w-2.5 rounded-full"
                  style={{
                    height: 20 + Math.sin(animTick * 0.5 + i * 1.2) * 14,
                    opacity: progress > i * 12 ? 1 : 0.2,
                    backgroundColor:
                      progress > i * 12 ? "#ff3b30" : "#26262b",
                  }}
                />
              ))}
            </View>

            <View className="flex-row items-center gap-2 mb-2">
              <View className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
              <Text className="text-white font-medium text-base">
                {statusText}
              </Text>
            </View>
            <Text className="text-brand-primary font-bold text-2xl mb-4">
              {Math.round(progress)}%
            </Text>

            <View className="w-full max-w-xs mb-8">
              <ProgressBar progress={progress} />
            </View>

            <View className="flex-row gap-3 flex-wrap justify-center">
              {(["drums", "bass", "vocals", "other"] as const).map((type) => {
                const meta = STEM_META[type];
                const isActive = progress > (type === "drums" ? 15 : type === "bass" ? 30 : type === "vocals" ? 60 : 85);
                return (
                  <View key={type} className={`items-center gap-1 ${isActive ? "opacity-100" : "opacity-30"}`}>
                    <View
                      className={`w-12 h-12 rounded-xl ${meta.color} items-center justify-center`}
                    >
                      <Text className="text-lg">{meta.icon}</Text>
                    </View>
                    <Text className={`text-xs font-medium ${isActive ? "text-white" : "text-gray-500"}`}>
                      {meta.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {phase === "done" && (
          <View>
            <View className="card-elevated p-4 mb-6 flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-green-600/20 items-center justify-center">
                <Text className="text-green-400 text-lg">✓</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">
                  Extração concluída
                </Text>
                <Text className="text-gray-500 text-xs">
                  {results.length} stems gerados a partir de{" "}
                  {selectedTrack === "custom"
                    ? "arquivo selecionado"
                    : "faixa de demonstração"}
                </Text>
              </View>
            </View>

            {results.map((stem) => (
              <StemPlayer
                key={stem.type}
                stem={stem}
                onAddToProject={() => handleAddToProject(stem)}
              />
            ))}

            <View className="card-elevated p-4 mt-4 gap-3">
              <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Ações
              </Text>
              <Button
                title="Adicionar todos ao estúdio"
                icon="+"
                onPress={() => {
                  const title = results
                    .map((s) => STEM_META[s.type].label)
                    .join(" + ");
                  setNewProjectPrefill({ title });
                  setShowNewProject(true);
                }}
              />
              <Button
                title="Exportar stems"
                variant="secondary"
                icon="📦"
                onPress={() =>
                  Alert.alert("Exportação", "Exportação iniciada (demo)")
                }
              />
              <Button
                title="Masterizar stems"
                variant="secondary"
                icon="🎚"
                onPress={() => {
                  setMasteringInput({
                    url: results[0]?.url || "",
                    filename: "stem_mix",
                    stems: results.map((s) => ({ name: s.label, url: s.url })),
                  });
                  router.push("/mastering");
                }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      <NewProject
        key={`np-${showNewProject}`}
        visible={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={handleCreateProject}
        initialTitle={newProjectPrefill.title}
      />
      </View>
    </View>
  );
}

import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

interface SampleEntry {
  id: string;
  name: string;
  category: string;
  color: string;
  duration: number;
}

const SAMPLE_CATEGORIES = [
  { key: "all", label: "Todos", icon: "♫" },
  { key: "drums", label: "Bateria", icon: "🥁" },
  { key: "xx808", label: "808", icon: "📀" },
  { key: "trap", label: "Trap", icon: "🔥" },
  { key: "hiphop", label: "Hip-Hop", icon: "🎤" },
  { key: "bass", label: "Baixo", icon: "🎸" },
  { key: "synth", label: "Sintetizador", icon: "🎹" },
  { key: "melodic", label: "Melódico", icon: "🎵" },
  { key: "fx", label: "Efeitos", icon: "✨" },
];

const SAMPLES: SampleEntry[] = [
  {
    id: "kit_1",
    name: "Kick 808 Profundo",
    category: "drums",
    color: "bg-red-500",
    duration: 2,
  },
  {
    id: "kit_2",
    name: "Snare Acústico",
    category: "drums",
    color: "bg-red-500",
    duration: 1.5,
  },
  {
    id: "kit_3",
    name: "Hi-Hat Fechado",
    category: "drums",
    color: "bg-red-500",
    duration: 0.5,
  },
  {
    id: "kit_4",
    name: "Hi-Hat Aberto",
    category: "drums",
    color: "bg-red-500",
    duration: 1,
  },
  {
    id: "kit_5",
    name: "Clap Eletrônico",
    category: "drums",
    color: "bg-red-500",
    duration: 1,
  },
  {
    id: "kit_6",
    name: "Rim Shot",
    category: "drums",
    color: "bg-red-500",
    duration: 0.8,
  },
  {
    id: "bass_1",
    name: "Sub Bass Puro",
    category: "bass",
    color: "bg-blue-500",
    duration: 4,
  },
  {
    id: "bass_2",
    name: "Baixo Elétrico",
    category: "bass",
    color: "bg-blue-500",
    duration: 4,
  },
  {
    id: "bass_3",
    name: "Synth Bass 303",
    category: "bass",
    color: "bg-blue-500",
    duration: 4,
  },
  {
    id: "synth_1",
    name: "Pad Ambiente",
    category: "synth",
    color: "bg-purple-600",
    duration: 8,
  },
  {
    id: "synth_2",
    name: "Lead Agudo",
    category: "synth",
    color: "bg-purple-600",
    duration: 4,
  },
  {
    id: "synth_3",
    name: "Arpejo Rápido",
    category: "synth",
    color: "bg-purple-600",
    duration: 4,
  },
  {
    id: "synth_4",
    name: "Brass Synth",
    category: "synth",
    color: "bg-purple-600",
    duration: 4,
  },
  {
    id: "mel_1",
    name: "Violão Dedilhado",
    category: "melodic",
    color: "bg-green-500",
    duration: 8,
  },
  {
    id: "mel_2",
    name: "Piano Melancólico",
    category: "melodic",
    color: "bg-green-500",
    duration: 8,
  },
  {
    id: "mel_3",
    name: "Guitarra Slide",
    category: "melodic",
    color: "bg-green-500",
    duration: 4,
  },
  {
    id: "mel_4",
    name: "Vocal Chop",
    category: "melodic",
    color: "bg-green-500",
    duration: 2,
  },
  {
    id: "fx_1",
    name: "Riser 4 bars",
    category: "fx",
    color: "bg-amber-500",
    duration: 8,
  },
  {
    id: "fx_2",
    name: "Impacto",
    category: "fx",
    color: "bg-amber-500",
    duration: 1,
  },
  {
    id: "fx_3",
    name: "Whoosh",
    category: "fx",
    color: "bg-amber-500",
    duration: 2,
  },
  {
    id: "fx_4",
    name: "Ruído Branco",
    category: "fx",
    color: "bg-amber-500",
    duration: 4,
  },

  {
    id: "a808_kick",
    name: "808 Kick Deep",
    category: "xx808",
    color: "bg-red-500",
    duration: 2,
  },
  {
    id: "a808_kick_long",
    name: "808 Kick Long",
    category: "xx808",
    color: "bg-red-500",
    duration: 4,
  },
  {
    id: "a808_kick_hard",
    name: "808 Kick Hard",
    category: "xx808",
    color: "bg-red-500",
    duration: 2,
  },
  {
    id: "a808_snare",
    name: "808 Snare",
    category: "xx808",
    color: "bg-red-500",
    duration: 1.5,
  },
  {
    id: "a808_clap",
    name: "808 Clap",
    category: "xx808",
    color: "bg-red-500",
    duration: 1,
  },
  {
    id: "a808_hihat_closed",
    name: "808 Hi-Hat Closed",
    category: "xx808",
    color: "bg-red-500",
    duration: 0.4,
  },
  {
    id: "a808_hihat_open",
    name: "808 Hi-Hat Open",
    category: "xx808",
    color: "bg-red-500",
    duration: 1.2,
  },
  {
    id: "a808_rim",
    name: "808 Rim Shot",
    category: "xx808",
    color: "bg-red-500",
    duration: 0.6,
  },
  {
    id: "a808_tom_low",
    name: "808 Tom Low",
    category: "xx808",
    color: "bg-red-500",
    duration: 1.5,
  },
  {
    id: "a808_tom_mid",
    name: "808 Tom Mid",
    category: "xx808",
    color: "bg-red-500",
    duration: 1.3,
  },
  {
    id: "a808_tom_high",
    name: "808 Tom High",
    category: "xx808",
    color: "bg-red-500",
    duration: 1,
  },
  {
    id: "a808_cowbell",
    name: "808 Cowbell",
    category: "xx808",
    color: "bg-red-500",
    duration: 0.6,
  },
  {
    id: "a808_crash",
    name: "808 Crash",
    category: "xx808",
    color: "bg-red-500",
    duration: 2,
  },
  {
    id: "a808_ride",
    name: "808 Ride",
    category: "xx808",
    color: "bg-red-500",
    duration: 2,
  },
  {
    id: "a808_maracas",
    name: "808 Maracas",
    category: "xx808",
    color: "bg-red-500",
    duration: 0.5,
  },
  {
    id: "a808_claves",
    name: "808 Claves",
    category: "xx808",
    color: "bg-red-500",
    duration: 0.4,
  },

  {
    id: "trap_kick_1",
    name: "Trap Kick 808 Slide",
    category: "trap",
    color: "bg-red-500",
    duration: 3,
  },
  {
    id: "trap_kick_2",
    name: "Trap Kick Spinz",
    category: "trap",
    color: "bg-red-500",
    duration: 2.5,
  },
  {
    id: "trap_snare_roll",
    name: "Trap Snare Roll",
    category: "trap",
    color: "bg-red-500",
    duration: 2,
  },
  {
    id: "trap_clap",
    name: "Trap Clap Layered",
    category: "trap",
    color: "bg-red-500",
    duration: 1.2,
  },
  {
    id: "trap_hihat_roll",
    name: "Trap Hi-Hat Roll 16th",
    category: "trap",
    color: "bg-red-500",
    duration: 1,
  },
  {
    id: "trap_hihat_half",
    name: "Trap Hi-Hat Half-Time",
    category: "trap",
    color: "bg-red-500",
    duration: 2,
  },
  {
    id: "trap_openhat",
    name: "Trap Open Hat",
    category: "trap",
    color: "bg-red-500",
    duration: 1,
  },
  {
    id: "trap_perc_bongo",
    name: "Trap Perc Bongo",
    category: "trap",
    color: "bg-red-500",
    duration: 1,
  },
  {
    id: "trap_perc_shaker",
    name: "Trap Shaker",
    category: "trap",
    color: "bg-red-500",
    duration: 1.5,
  },
  {
    id: "trap_fx_drop",
    name: "Trap Drop FX",
    category: "trap",
    color: "bg-amber-500",
    duration: 2,
  },
  {
    id: "trap_fx_riser",
    name: "Trap Riser 4 bars",
    category: "trap",
    color: "bg-amber-500",
    duration: 8,
  },

  {
    id: "hh_kick_main",
    name: "Hip-Hop Kick Main",
    category: "hiphop",
    color: "bg-red-500",
    duration: 2,
  },
  {
    id: "hh_kick_sub",
    name: "Hip-Hop Kick Sub",
    category: "hiphop",
    color: "bg-red-500",
    duration: 3,
  },
  {
    id: "hh_snare_acoustic",
    name: "Hip-Hop Snare Acoustic",
    category: "hiphop",
    color: "bg-red-500",
    duration: 1.8,
  },
  {
    id: "hh_snare_electronic",
    name: "Hip-Hop Snare Electronic",
    category: "hiphop",
    color: "bg-red-500",
    duration: 1.5,
  },
  {
    id: "hh_clap",
    name: "Hip-Hop Clap",
    category: "hiphop",
    color: "bg-red-500",
    duration: 1,
  },
  {
    id: "hh_hihat",
    name: "Hip-Hop Hi-Hat",
    category: "hiphop",
    color: "bg-red-500",
    duration: 0.5,
  },
  {
    id: "hh_hihat_pedal",
    name: "Hip-Hop Hi-Hat Pedal",
    category: "hiphop",
    color: "bg-red-500",
    duration: 0.3,
  },
  {
    id: "hh_rim",
    name: "Hip-Hop Rim",
    category: "hiphop",
    color: "bg-red-500",
    duration: 0.6,
  },
  {
    id: "hh_conga",
    name: "Hip-Hop Conga",
    category: "hiphop",
    color: "bg-red-500",
    duration: 1.5,
  },
  {
    id: "hh_bongo",
    name: "Hip-Hop Bongo",
    category: "hiphop",
    color: "bg-red-500",
    duration: 1.2,
  },
  {
    id: "hh_scratch",
    name: "Hip-Hop Scratch",
    category: "hiphop",
    color: "bg-amber-500",
    duration: 1.5,
  },
  {
    id: "hh_vocal_yeah",
    name: 'Hip-Hop Vocal "Yeah"',
    category: "hiphop",
    color: "bg-amber-500",
    duration: 1,
  },
  {
    id: "hh_vocal_what",
    name: 'Hip-Hop Vocal "What"',
    category: "hiphop",
    color: "bg-amber-500",
    duration: 1,
  },
];

function SampleCard({
  sample,
  onAddToTrack,
  status,
  playingId,
  onPlayPreview,
}: {
  sample: SampleEntry;
  onAddToTrack: (sample: SampleEntry) => void;
  status: { isLoaded: boolean; playing: boolean };
  playingId: string | null;
  onPlayPreview: (id: string) => void;
}) {
  const isThisPlaying =
    playingId === sample.id && status.isLoaded && status.playing;

  return (
    <View className="bg-dark-surface rounded-xl border border-dark-border overflow-hidden">
      <View className="p-3 gap-2">
        <View
          className={`w-full h-12 rounded-lg ${sample.color}/20 items-center justify-center`}
        >
          <Text className="text-xl">
            {sample.category === "xx808"
              ? "📀"
              : sample.category === "trap"
                ? "🔥"
                : sample.category === "hiphop"
                  ? "🎤"
                  : sample.color === "bg-red-500"
                    ? "🥁"
                    : sample.color === "bg-blue-500"
                      ? "🎸"
                      : sample.color === "bg-purple-600"
                        ? "🎹"
                        : sample.color === "bg-green-500"
                          ? "🎵"
                          : "✨"}
          </Text>
        </View>
        <Text className="text-white text-xs font-semibold truncate">
          {sample.name}
        </Text>
        <Text className="text-gray-600 text-[10px]">
          {sample.duration.toFixed(1)}s
        </Text>

        <View className="flex-row gap-1.5">
          <Pressable
            onPress={() => onPlayPreview(sample.id)}
            className={`flex-1 h-7 rounded-lg items-center justify-center ${isThisPlaying ? "bg-green-600" : "bg-dark-muted"}`}
          >
            <Text className="text-white text-[10px] font-bold">
              {isThisPlaying ? "⏸" : "▶"}
            </Text>
          </Pressable>
        </View>
      </View>
      <Pressable
        onPress={() => onAddToTrack(sample)}
        className="h-7 bg-brand-accent/20 items-center justify-center active:opacity-70 border-t border-dark-border"
      >
        <Text className="text-brand-accent text-[9px] font-bold">+ TRACK</Text>
      </Pressable>
    </View>
  );
}

interface SampleBrowserProps {
  visible: boolean;
  onAddSample: (sample: SampleEntry) => void;
  testID?: string;
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeStr = (o: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(o + i, str.charCodeAt(i));
  };
  const write16 = (o: number, v: number) => view.setUint16(o, v, true);
  const write32 = (o: number, v: number) => view.setUint32(o, v, true);

  writeStr(0, "RIFF");
  write32(4, 36 + dataSize);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  write32(16, 16);
  write16(20, 1);
  write16(22, numChannels);
  write32(24, sampleRate);
  write32(28, sampleRate * blockAlign);
  write16(32, blockAlign);
  write16(34, bytesPerSample * 8);
  writeStr(36, "data");
  write32(40, dataSize);

  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buffer.getChannelData(ch)[i];
      const offset = headerSize + (i * numChannels + ch) * bytesPerSample;
      const pcm = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      view.setInt16(offset, pcm, true);
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return h;
}

export function SampleBrowser({
  visible,
  onAddSample,
  testID,
}: SampleBrowserProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const toneCache = useRef<Map<string, string>>(new Map());

  const getToneUrl = useCallback(
    async (id: string, duration: number): Promise<string> => {
      const cached = toneCache.current.get(id);
      if (cached) return cached;
      if (Platform.OS !== "web") return "";
      const sampleRate = 44100;
      const h = hashId(id);
      const freq = 110 + Math.abs(h % 880);
      const oscTypes: OscillatorType[] = [
        "sine",
        "triangle",
        "sawtooth",
        "square",
      ];
      const offlineCtx = new OfflineAudioContext(
        1,
        Math.ceil(sampleRate * duration),
        sampleRate,
      );
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = oscTypes[Math.abs(h) % 4];
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, 0);
      gain.gain.linearRampToValueAtTime(0.3, 0.01);
      gain.gain.linearRampToValueAtTime(0, duration);
      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(0);
      osc.stop(duration);
      const buffer = await offlineCtx.startRendering();
      const blob = audioBufferToWavBlob(buffer);
      const url = URL.createObjectURL(blob);
      toneCache.current.set(id, url);
      return url;
    },
    [],
  );

  const handlePlayPreview = useCallback(
    async (id: string) => {
      if (playingId === id) {
        player.pause();
        setPlayingId(null);
      } else {
        const sample = SAMPLES.find((s) => s.id === id);
        if (!sample) return;
        const url = await getToneUrl(id, sample.duration);
        if (url) {
          await player.replace(url);
          player.play();
          setPlayingId(id);
        }
      }
    },
    [player, playingId, getToneUrl],
  );

  const filtered = SAMPLES.filter((s) => {
    if (category !== "all" && s.category !== category) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  if (!visible) return null;

  return (
    <View testID={testID} className="flex-1">
      <View className="px-4 py-2">
        <View className="bg-dark-elevated rounded-xl border border-dark-border px-3 py-2">
          <TextInput
            placeholder="Buscar samples..."
            placeholderTextColor="#666"
            value={search}
            onChangeText={setSearch}
            className="text-white text-sm"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mb-3"
        style={{ maxHeight: 36 }}
      >
        <View className="flex-row gap-2">
          {SAMPLE_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              onPress={() => setCategory(cat.key)}
              className={`px-3 py-1.5 rounded-full border ${category === cat.key ? "bg-brand-primary/20 border-brand-primary" : "bg-dark-elevated border-dark-border"}`}
            >
              <Text
                className={`text-xs font-semibold ${category === cat.key ? "text-brand-primary" : "text-white"}`}
              >
                {cat.icon} {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View className="flex-row flex-wrap gap-2">
          {filtered.map((sample) => (
            <View key={sample.id} className="w-[calc(50%-4px)]">
              <SampleCard
                sample={sample}
                onAddToTrack={onAddSample}
                status={status}
                playingId={playingId}
                onPlayPreview={handlePlayPreview}
              />
            </View>
          ))}
          {filtered.length === 0 && (
            <View className="w-full py-8 items-center">
              <Text className="text-gray-600 text-sm">
                Nenhum sample encontrado
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

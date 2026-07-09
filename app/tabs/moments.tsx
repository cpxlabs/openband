import { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { PageHeader, NewProject, SamplePackCard } from "../../src/components";
import { MomentCard } from "../../src/components";
import type { MomentData } from "../../src/components/MomentCard";
import { GENRES } from "../../src/lib/projectTemplates";
import type { GenreTemplate, Mood } from "../../src/lib/projectTemplates";
import { LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive";
import { SCREEN_BOTTOM_PADDING } from "../../src/lib/constants";

const MOCK_MOMENTS: MomentData[] = [
  {
    id: "m1",
    artistName: "Ana Beatriz",
    artistHandle: "@anabeatriz",
    avatar: "Ana Beatriz",
    imageUrl: "https://picsum.photos/seed/studio/800/400",
    caption:
      "Finalizando o novo single no estúdio! 🎧 O som tá ficando incrível, mal posso esperar pra compartilhar com vocês.",
    songTitle: "Novo Single - Preview",
    songDuration: 45,
    likes: 1234,
    comments: 89,
    userLiked: true,
    timeAgo: "2h",
  },
  {
    id: "m2",
    artistName: "Carlos Guitarra",
    artistHandle: "@carlosguitarra",
    avatar: "Carlos",
    imageUrl: "https://picsum.photos/seed/guitar/800/400",
    caption:
      "Acabei de gravar esse riff novo com uma Stratocaster 69. Som vintage puro! 🎸 Quem curte rock clássico?",
    songTitle: "Riff Clássico - Ao Vivo",
    songDuration: 30,
    likes: 856,
    comments: 42,
    userLiked: false,
    timeAgo: "5h",
  },
  {
    id: "m3",
    artistName: "DJ Eletro",
    artistHandle: "@djeletro",
    avatar: "DJ Eletro",
    caption:
      "Testando o novo setup no estúdio de casa. Esse drop ficou pesado! 🔥",
    songTitle: "Drop Teste - EDM",
    songDuration: 60,
    likes: 2341,
    comments: 156,
    userLiked: false,
    timeAgo: "1d",
  },
];

const FREE_SAMPLE_PACKS = [
  {
    id: "pack_1",
    artist: "Ana Beatriz",
    handle: "@anabeatriz",
    instrument: "Guitarra",
    samples: [
      "Riff Rock 1",
      "Riff Rock 2",
      "Power Chord C5",
      "Power Chord G5",
      "Solo Lick",
      "Slide Up",
    ],
    icon: "🎸",
    color: "bg-blue-500",
  },
  {
    id: "pack_2",
    artist: "DJ Eletro",
    handle: "@djeletro",
    instrument: "Sintetizador",
    samples: [
      "Bass 808 Deep",
      "Lead Synth",
      "Pad Atmosférico",
      "Arpejo Rápido",
      "FX Riser",
      "Sub Hit",
    ],
    icon: "🎹",
    color: "bg-purple-600",
  },
  {
    id: "pack_3",
    artist: "Bateria MC",
    handle: "@bateriamc",
    instrument: "Bateria",
    samples: [
      "Kick 808",
      "Snare Trap",
      "Hi-Hat Roll",
      "Clap Layer",
      "Perc Loop",
      "Tamborim",
    ],
    icon: "🥁",
    color: "bg-red-500",
  },
  {
    id: "pack_4",
    artist: "Baixo BR",
    handle: "@baixobr",
    instrument: "Baixo",
    samples: [
      "Slap Bass",
      "Fingerstyle",
      "Sub Fundamental",
      "Pick Attack",
      "Harmonics",
      "Slide Baixo",
    ],
    icon: "🎸",
    color: "bg-green-500",
  },
  {
    id: "pack_5",
    artist: "Baixo BR",
    handle: "@baixobr",
    instrument: "Vocal",
    samples: [
      "Vocal Chop A",
      "Vocal Chop B",
      "Ad-lib Hey",
      "Ad-lib Yeah",
      "Harmony Ooh",
      "Whisper",
    ],
    icon: "🎤",
    color: "bg-amber-500",
  },
  {
    id: "pack_6",
    artist: "Lo-Fi BR",
    handle: "@lofibbr",
    instrument: "Melódico",
    samples: [
      "Piano Chord",
      "Guitar Fingerpick",
      "Vinyl Crackle",
      "Melody Loop",
      "Bass Walk",
      "Pad Dream",
    ],
    icon: "🎵",
    color: "bg-cyan-500",
  },
];

const PACK_GENRE_MAP: Record<string, string> = {
  Guitarra: "rock",
  Sintetizador: "edm",
  Bateria: "hiphop",
  Baixo: "rnb",
  Vocal: "pop",
  Melódico: "lofi",
};

import { useResponsive } from "../../src/lib/responsive";

export default function Moments() {
  const router = useRouter();
  const resp = useResponsive();
  const [tab, setTab] = useState<"moments" | "packs">("moments");
  const [credits, setCredits] = useState<{ artist: string; sample: string }[]>(
    [],
  );
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectPrefill, setNewProjectPrefill] = useState<{
    title?: string;
    genre?: GenreTemplate;
  }>({});

  const handleUsePack = useCallback(
    (pack: (typeof FREE_SAMPLE_PACKS)[0], sampleName: string) => {
      setCredits((prev) => [
        ...prev,
        { artist: pack.artist, sample: sampleName },
      ]);
      const genreId = PACK_GENRE_MAP[pack.instrument] ?? "pop";
      const genre = GENRES.find((g) => g.id === genreId) ?? GENRES[0];
      setNewProjectPrefill({
        title: `Sample: ${sampleName}`,
        genre,
      });
      setShowNewProject(true);
    },
    [],
  );

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
      const projectId = `proj-sample-${Date.now()}`;
      const params = new URLSearchParams({
        title: config.name,
        genre: config.genre.id,
        key: config.key,
        bpm: String(config.bpm),
        numBars: String(config.numBars ?? 8),
        timeSignature: config.timeSignature ?? "4/4",
      });
      if (config.mood) params.set("mood", config.mood);
      setShowNewProject(false);
      router.push(`/studio/${projectId}?${params.toString()}`);
    },
    [router],
  );

  return (
    <View className="flex-1 bg-dark-bg">
      <View
        className="pt-4 tablet:pt-12 px-4 tablet:px-6 flex-row items-center justify-between mb-2"
      >
        <PageHeader title="Momentos" subtitle="Artistas e criadores" />
      </View>

      <View
        className="flex-row gap-2 px-4 tablet:px-6 mb-3"
      >
        <Pressable
          onPress={() => setTab("moments")}
          className={`flex-1 py-2.5 rounded-xl items-center border flex-row justify-center gap-2 ${
            tab === "moments" ? "bg-brand-primary/15 border-brand-primary/50" : "bg-dark-elevated border-dark-border/50"
          }`}
        >
          <Text
            className={`text-xs ${tab === "moments" ? "text-brand-primary" : "text-gray-400"}`}
          >
            ♫
          </Text>
          <Text
            className={`text-xs font-bold ${tab === "moments" ? "text-brand-primary" : "text-white"}`}
          >
            Momentos
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("packs")}
          className={`flex-1 py-2.5 rounded-xl items-center border flex-row justify-center gap-2 ${
            tab === "packs" ? "bg-brand-primary/15 border-brand-primary/50" : "bg-dark-elevated border-dark-border/50"
          }`}
        >
          <Text
            className={`text-xs ${tab === "packs" ? "text-brand-primary" : "text-gray-400"}`}
          >
            🎁
          </Text>
          <Text
            className={`text-xs font-bold ${tab === "packs" ? "text-brand-primary" : "text-white"}`}
          >
            Free Packs
          </Text>
        </Pressable>
      </View>

      {credits.length > 0 && (
        <View
          className="px-4 tablet:px-6 mb-3"
          style={{
            maxWidth: LAYOUT_MAX_WIDTHS.moments,
            alignSelf: "center",
            width: "100%",
          }}
        >
          <View className="p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20">
            <Text className="text-brand-primary text-[10px] font-bold uppercase tracking-wider">
              Créditos
            </Text>
            {credits.map((c, i) => (
              <Text key={i} className="text-gray-300 text-[10px] mt-0.5">
                • {c.sample} por {c.artist}
              </Text>
            ))}
            <Text className="text-gray-500 text-[8px] mt-1">
              Lembre-se de creditar os artistas ao publicar!
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_PADDING, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        style={{
          maxWidth: LAYOUT_MAX_WIDTHS.moments,
          alignSelf: "center",
          width: "100%",
        }}
      >
        {tab === "moments" ? (
          <View className="px-4 tablet:px-6">
            {MOCK_MOMENTS.map((moment) => (
              <MomentCard key={moment.id} moment={moment} />
            ))}
          </View>
        ) : (
          <View
            className="px-4 tablet:px-6 gap-3 tablet:flex-row tablet:flex-wrap tablet:gap-4"
          >
            <View className="card-premium p-4 mb-1 w-full">
              <Text className="text-gray-400 text-xs leading-relaxed">
                Samples gratuitos feitos por artistas da comunidade. Use nos
                seus projetos e credite o artista!
              </Text>
            </View>
            {FREE_SAMPLE_PACKS.map((pack) => (
              <SamplePackCard
                key={pack.id}
                pack={pack}
                onUsePack={handleUsePack}
                widthStyle={{ width: resp.isDesktop ? "31%" : resp.isTablet ? "48%" : "100%" }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <NewProject
        key={`np-${showNewProject}`}
        visible={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={handleCreateProject}
        initialTitle={newProjectPrefill.title}
        initialGenre={newProjectPrefill.genre}
      />
    </View>
  );
}

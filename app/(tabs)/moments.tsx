import { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { PageHeader, Button, Badge } from "../../src/components";
import { MomentCard } from "../../src/components";
import type { MomentData } from "../../src/components/MomentCard";
import { useResponsive, LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive";
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
    artist: "Vocal MC",
    handle: "@vocalmc",
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

export default function Moments() {
  const router = useRouter();
  const resp = useResponsive();
  const [tab, setTab] = useState<"moments" | "packs">("moments");
  const [credits, setCredits] = useState<{ artist: string; sample: string }[]>(
    [],
  );

  const handleUsePack = useCallback(
    (pack: (typeof FREE_SAMPLE_PACKS)[0], sampleName: string) => {
      const projectId = `proj-sample-${Date.now()}`;
      setCredits((prev) => [
        ...prev,
        { artist: pack.artist, sample: sampleName },
      ]);
      router.push(
        `/studio/${projectId}?title=Sample: ${sampleName}&genre=pop&key=C&bpm=120`,
      );
    },
    [router],
  );

  return (
    <View className="flex-1 bg-dark-bg">
      <View
        className="pt-4 mobile:pt-12 px-4 mobile:px-6 flex-row items-center justify-between mb-2"
      >
        <PageHeader title="Momentos" subtitle="Artistas e criadores" />
      </View>

      <View
        className="flex-row gap-2 px-4 mobile:px-6 mb-3"
      >
        <Pressable
          onPress={() => setTab("moments")}
          className={`flex-1 py-2 rounded-xl items-center border ${tab === "moments" ? "bg-brand-primary/20 border-brand-primary" : "bg-dark-elevated border-dark-border"}`}
        >
          <Text
            className={`text-xs font-bold ${tab === "moments" ? "text-brand-primary" : "text-white"}`}
          >
            ♫ Momentos
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("packs")}
          className={`flex-1 py-2 rounded-xl items-center border ${tab === "packs" ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-elevated border-dark-border"}`}
        >
          <Text
            className={`text-xs font-bold ${tab === "packs" ? "text-brand-accent" : "text-white"}`}
          >
            🎁 Free Packs
          </Text>
        </Pressable>
      </View>

      {credits.length > 0 && (
        <View
          className="px-4 mobile:px-6 mb-3 p-2.5 rounded-xl bg-brand-accent/10 border border-brand-accent/20"
          style={
            resp.isDesktop
              ? {
                  maxWidth: LAYOUT_MAX_WIDTHS.moments,
                  alignSelf: "center",
                  width: "100%",
                }
              : undefined
          }
        >
          <Text className="text-brand-accent text-[10px] font-bold uppercase tracking-wider">
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
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_PADDING }}
        showsVerticalScrollIndicator={false}
        style={
          resp.isDesktop
            ? {
                maxWidth: LAYOUT_MAX_WIDTHS.moments,
                alignSelf: "center",
                width: "100%",
              }
            : undefined
        }
      >
        {tab === "moments" ? (
          <View className="px-4 mobile:px-6">
            {MOCK_MOMENTS.map((moment) => (
              <MomentCard key={moment.id} moment={moment} />
            ))}
          </View>
        ) : (
          <View
            className="px-4 mobile:px-6 gap-3 tablet:flex-row tablet:flex-wrap tablet:gap-4"
          >
            <View className="card p-3 mb-1 w-full">
              <Text className="text-gray-400 text-xs leading-relaxed">
                Samples gratuitos feitos por artistas da comunidade. Use nos
                seus projetos e credite o artista!
              </Text>
            </View>
            {FREE_SAMPLE_PACKS.map((pack) => (
              <View
                key={pack.id}
                className="card overflow-hidden w-full tablet:w-[49%]"
              >
                <View className="p-4">
                  <View className="flex-row items-start gap-3 mb-3">
                    <View
                      className={`w-12 h-12 rounded-2xl ${pack.color} items-center justify-center shadow-lg`}
                    >
                      <Text className="text-2xl">{pack.icon}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-bold text-base">
                        {pack.artist}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        {pack.handle}
                      </Text>
                      <View className="flex-row items-center gap-1.5 mt-1">
                        <Badge text={pack.instrument} variant="default" />
                        <Badge
                          text={`${pack.samples.length} samples`}
                          variant="default"
                        />
                      </View>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-1.5 mb-3">
                    {pack.samples.map((s) => (
                      <View
                        key={s}
                        className="bg-dark-elevated border border-dark-border rounded-lg px-2 py-1"
                      >
                        <Text className="text-gray-300 text-[10px]">{s}</Text>
                      </View>
                    ))}
                  </View>

                  <Button
                    title={`Usar ${pack.samples[0]} no Estúdio`}
                    variant="secondary"
                    icon="+"
                    onPress={() => handleUsePack(pack, pack.samples[0])}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

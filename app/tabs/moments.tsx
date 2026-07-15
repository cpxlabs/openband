import { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { PageHeader, NewProject, SamplePackCard, MomentCard, Loading, EmptyState } from "../../src/components";
import type { MomentData } from "../../src/components/MomentCard";
import { fetchFeed } from "../../src/lib/feedApi";
import { GENRES } from "../../src/lib/projectTemplates";
import type { GenreTemplate } from "../../src/lib/projectTemplates";
import type { ProjectStarterResult } from "../../src/lib/projectStarter";
import { LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive";
import { SCREEN_BOTTOM_PADDING } from "../../src/lib/constants";
import { useTranslation } from "react-i18next";
import { MOCK_MOMENTS, FREE_SAMPLE_PACKS } from "../../src/fixtures/mockMoments";

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
  const { t } = useTranslation();
  const [tab, setTab] = useState<"moments" | "packs">("moments");
  const [moments, setMoments] = useState<MomentData[]>(MOCK_MOMENTS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [credits, setCredits] = useState<{ artist: string; sample: string }[]>(
    [],
  );
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectPrefill, setNewProjectPrefill] = useState<{
    title?: string;
    genre?: GenreTemplate;
  }>({});

  const loadMoments = useCallback(() => {
    setLoading(true);
    return fetchFeed({ type: "moment" })
      .then((res) => {
        if (Array.isArray(res.posts) && res.posts.length > 0) {
          setMoments(res.posts as MomentData[]);
        } else {
          setMoments(MOCK_MOMENTS);
        }
      })
      .catch(() => {
        setMoments(MOCK_MOMENTS);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadMoments();
  }, [loadMoments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMoments().finally(() => setRefreshing(false));
  }, [loadMoments]);

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
    (config: ProjectStarterResult) => {
      const projectId = `proj-sample-${Date.now()}`;
      const params = new URLSearchParams({
        title: config.name,
        genre: config.genreId,
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
    <View className="flex-1 bg-dark-bg" style={{ paddingTop: resp.safeTop }}>
      <View
        className="pt-4 tablet:pt-12 px-4 tablet:px-6 flex-row items-center justify-between mb-2"
        style={{
          maxWidth: LAYOUT_MAX_WIDTHS.moments,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <PageHeader title={t("moments.title", "Momentos")} subtitle={t("moments.subtitle", "Artistas e criadores")} />
      </View>

      <View
        className="flex-row gap-2 px-4 tablet:px-6 mb-3"
        style={{
          maxWidth: LAYOUT_MAX_WIDTHS.moments,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <Pressable
          onPress={() => setTab("moments")}
          className={`flex-1 py-2.5 rounded-xl items-center border flex-row justify-center gap-2 ${
            tab === "moments" ? "bg-brand-primary/15 border-brand-primary/50" : "bg-dark-elevated border-dark-border/50"
          }`}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "moments" }}
        >
          <Text
            className={`text-xs ${tab === "moments" ? "text-brand-primary" : "text-gray-400"}`}
          >
            ♫
          </Text>
          <Text
            className={`text-xs font-bold ${tab === "moments" ? "text-brand-primary" : "text-white"}`}
          >
            {t("moments.tabMoments", "Momentos")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("packs")}
          className={`flex-1 py-2.5 rounded-xl items-center border flex-row justify-center gap-2 ${
            tab === "packs" ? "bg-brand-primary/15 border-brand-primary/50" : "bg-dark-elevated border-dark-border/50"
          }`}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "packs" }}
        >
          <Text
            className={`text-xs ${tab === "packs" ? "text-brand-primary" : "text-gray-400"}`}
          >
            🎁
          </Text>
          <Text
            className={`text-xs font-bold ${tab === "packs" ? "text-brand-primary" : "text-white"}`}
          >
            {t("moments.tabPacks", "Free Packs")}
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
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-brand-primary text-[10px] font-bold uppercase tracking-wider">
                {t("moments.credits", "Créditos")}
              </Text>
              <Pressable
                onPress={() => setCredits([])}
                className="px-2 py-0.5 rounded-md bg-dark-surface border border-dark-border active:opacity-70"
                accessibilityRole="button"
              >
                <Text className="text-gray-300 text-[10px]">
                  {t("moments.clearCredits", "Limpar")}
                </Text>
              </Pressable>
            </View>
            <ScrollView
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator={true}
            >
              {credits.map((c, i) => (
                <Text key={i} className="text-gray-300 text-[10px] mt-0.5">
                  • {c.sample} por {c.artist}
                </Text>
              ))}
            </ScrollView>
            <Text className="text-gray-500 text-[8px] mt-1">
              {t("moments.creditNote", "Lembre-se de creditar os artistas ao publicar!")}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_PADDING, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={["#ffffff"]}
          />
        }
        style={{
          maxWidth: LAYOUT_MAX_WIDTHS.moments,
          alignSelf: "center",
          width: "100%",
        }}
      >
        {tab === "moments" ? (
          loading ? (
            <Loading message={t("moments.loading", "Carregando momentos...")} />
          ) : moments.length === 0 ? (
            <EmptyState
              icon="🎵"
              title={t("moments.emptyTitle", "Nenhum momento ainda")}
              subtitle={t("moments.emptySubtitle", "Os artistas ainda não publicaram momentos.")}
            />
          ) : (
            <View className="px-4 tablet:px-6">
              {moments.map((moment) => (
                <MomentCard key={moment.id} moment={moment} />
              ))}
            </View>
          )
        ) : (
          <View
            className="px-4 tablet:px-6 gap-3 tablet:flex-row tablet:flex-wrap tablet:gap-4"
          >
            <View className="card-premium p-4 mb-1 w-full">
              <Text className="text-gray-400 text-xs leading-relaxed">
                {t("moments.freePacksIntro", "Samples gratuitos feitos por artistas da comunidade. Use nos seus projetos e credite o artista!")}
              </Text>
            </View>
            {FREE_SAMPLE_PACKS.map((pack) => (
              <SamplePackCard
                key={pack.id}
                pack={pack}
                onUsePack={handleUsePack}
                widthStyle={{ width: resp.numColumns === 1 ? "100%" : `${(100 / resp.numColumns) - 2}%` }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <NewProject
        visible={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={handleCreateProject}
        initialTitle={newProjectPrefill.title}
        initialGenre={newProjectPrefill.genre}
      />
    </View>
  );
}

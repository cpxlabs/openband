import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  FlatList,
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  Share,
  Platform,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import {
  PageHeader,
  Button,
  QuickActions,
  setMiniPlayerState,
  QuickTools,
  NewProject,
  OnboardingFlow,
  FeedPostCard,
  Loading,
  FeedSkeletonCard,
  useToast,
} from "../../src/components";
import type { FeedPost } from "../../src/components/FeedPostCard";
import { fetchFeed, toggleLike, createRemix } from "../../src/lib/feedApi";
import { generatePreviewUrl, SCREEN_BOTTOM_PADDING } from "../../src/lib/constants";
import { LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive";
import { GENRES } from "../../src/lib/projectTemplates";
import type { ProjectStarterResult } from "../../src/lib/projectStarter";
import { useResponsive } from "../../src/lib/responsive";
import { listProjectIndex } from "../../src/lib/projectStore";
import { audioSystem } from "../../src/lib/universalAudio";
import { useWebAudioPlayer } from "../../src/hooks/useWebAudioPlayer";
import { useTranslation } from "react-i18next";
import { MOCK_POSTS } from "../../src/fixtures/mockPosts";

  const GENRE_FILTERS = [
    { id: "all", label: "all", icon: "♫" },
    ...GENRES.map((g) => ({ id: g.id, label: g.name, icon: g.icon })),
  ];

const FEED_PAGE_SIZE = 6;

type SortMode = "recent" | "popular" | "genre";



export default function Feed() {
  const router = useRouter();
  const { t } = useTranslation();
  const resp = useResponsive();
  const webAudio = useWebAudioPlayer({ trackTime: false });
  const { tierLimits, hasOnboarded, completeOnboarding } = useAuth();
  const toast = useToast();
  const [showOnboarding, setShowOnboarding] = useState(!hasOnboarded);
  const expoPlayer = useAudioPlayer(null);
  const expoStatus = useAudioPlayerStatus(expoPlayer);
  const isWeb = Platform.OS === "web";
  const webAudioRef = useRef(webAudio);
  webAudioRef.current = webAudio;
  const expoPlayerRef = useRef(expoPlayer);
  expoPlayerRef.current = expoPlayer;
  const playing = isWeb ? webAudio.isPlaying : expoStatus.playing;
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showQuickTools, setShowQuickTools] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [hasProjects, setHasProjects] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const index = listProjectIndex();
    setHasProjects(Object.keys(index).length > 0);
  }, []);

  const webAudioPause = webAudio.pause;
  const webAudioSeekTo = webAudio.seekTo;
  useEffect(() => {
    return () => {
      if (isWeb) {
        webAudioPause();
        webAudioSeekTo(0);
      } else {
        expoPlayerRef.current.pause();
        expoPlayerRef.current.seekTo(0);
      }
    };
  }, [isWeb, webAudioPause, webAudioSeekTo]);
  const [genreFilter, setGenreFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(FEED_PAGE_SIZE);
  const currentPostRef = useRef<FeedPost | undefined>(undefined);

  const didInitialLoad = useRef(false);
  const loadFeed = useCallback(() => {
    setLoading(true);
    return fetchFeed({})
      .then((res) => {
        if (Array.isArray(res.posts) && res.posts.length > 0) {
          setPosts(res.posts as FeedPost[]);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        if (!didInitialLoad.current) {
          didInitialLoad.current = true;
          setInitialLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed().finally(() => setRefreshing(false));
  }, [loadFeed]);

  useEffect(() => {
    setVisibleCount(FEED_PAGE_SIZE);
  }, [genreFilter, sortMode]);

  const filteredPosts = useMemo(() => {
    let result =
      genreFilter === "all"
        ? posts
        : posts.filter((p) => p.genre === genreFilter);
    if (sortMode === "popular") {
      result = [...result].sort((a, b) => b.likes - a.likes);
    } else if (sortMode === "genre") {
      result = [...result].sort((a, b) => a.genre.localeCompare(b.genre));
    }
    return result;
  }, [posts, genreFilter, sortMode]);

  const visiblePosts = useMemo(
    () => filteredPosts.slice(0, visibleCount),
    [filteredPosts, visibleCount],
  );

  const handleEndReached = useCallback(() => {
    setVisibleCount((c) => Math.min(c + FEED_PAGE_SIZE, filteredPosts.length));
  }, [filteredPosts.length]);

  const playingRef = useRef(playing);
  playingRef.current = playing;
  const playingIdRef = useRef(playingId);
  playingIdRef.current = playingId;
  const loadingIdRef = useRef(loadingId);
  loadingIdRef.current = loadingId;

  const handlePlay = useCallback(
    async (post: FeedPost) => {
      if (isWeb) webAudioRef.current.unlock();
      if (loadingIdRef.current) return;
      if (playingIdRef.current === post.id && playingRef.current) {
        if (isWeb) webAudioRef.current.pause(); else expoPlayerRef.current.pause();
        if (isMountedRef.current) setPlayingId(null);
        setMiniPlayerState({ visible: false, url: null });
        return;
      }
      if (isMountedRef.current) setLoadingId(post.id);
      loadingIdRef.current = post.id;
      try {
        const url = await generatePreviewUrl(post.id, post.duration);
        if (isWeb) {
          await audioSystem.ensureContext();
          await webAudioRef.current.replace(url);
          await webAudioRef.current.play();
        } else {
          await expoPlayerRef.current.replace(url);
          try {
            await expoPlayerRef.current.play();
          } catch (e) {
            console.warn("Native playback failed:", e);
          }
        }
        if (isMountedRef.current) {
          currentPostRef.current = post;
          setPlayingId(post.id);
          setMiniPlayerState({
            title: post.title,
            subtitle: post.author,
            url,
            projectId: post.id,
            visible: true,
          });
        }
      } catch (error) {
        console.warn("Feed playback failed:", error);
        Alert.alert(t("feed.errorTitle", "Erro"), t("feed.playbackError", "Falha ao carregar prévia do áudio."));
      } finally {
        if (isMountedRef.current) setLoadingId(null);
        loadingIdRef.current = null;
      }
    },
    [isWeb],
  );

  const handleLike = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              userLiked: !p.userLiked,
              likes: p.userLiked ? p.likes - 1 : p.likes + 1,
            }
          : p,
      ),
    );
    toggleLike(postId)
      .then((res) => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, userLiked: res.liked, likes: res.likes } : p,
          ),
        );
      })
      .catch(() => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  userLiked: !p.userLiked,
                  likes: p.userLiked ? p.likes - 1 : p.likes + 1,
                }
              : p,
          ),
        );
        toast.show("Não foi possível curtir", "error");
      });
  }, []);

  const handleRemix = useCallback(
    (post: FeedPost) => {
      if (!tierLimits.canCreateRemixes) {
        Alert.alert(
          t("feed.upgradeRequired", "Plano necessário"),
          t("feed.remixUpgrade", "Remix requer o plano Live ou Studio. Faça upgrade para continuar."),
        );
        return;
      }
      const projectId = `remix-${post.id}-${Date.now()}`;
      createRemix(post.id, projectId).catch(() => {
        toast.show(t("feed.remixError", "Não foi possível criar o remix"), "error");
      });
      router.push(
        `/studio/${projectId}?title=${encodeURIComponent(`Remix: ${post.title}`)}&genre=${post.genre}&key=${post.key}&bpm=${post.bpm}`,
      );
    },
    [router, tierLimits.canCreateRemixes, t],
  );

  const handleNewProject = useCallback(() => {
    setShowQuickTools(true);
  }, []);

  const handleOpenNewProject = useCallback(() => {
    setShowNewProject(true);
  }, []);

  const handleCreateProject = useCallback(
    (
      config: ProjectStarterResult,
      fromOnboarding = false,
    ) => {
      const projectId = `proj-${Date.now()}`;
      const params = new URLSearchParams({
        title: config.name,
        genre: config.genreId,
        key: config.key,
        bpm: String(config.bpm),
        numBars: String(config.numBars ?? 8),
        timeSignature: config.timeSignature ?? "4/4",
      });
      if (config.mood) params.set("mood", config.mood);
      if (fromOnboarding) params.set("fromOnboarding", "1");
      setShowNewProject(false);
      setShowOnboarding(false);
      router.push(`/studio/${projectId}?${params.toString()}`);
    },
    [router],
  );

  const handleOnboardingCreate = useCallback(
    (config: ProjectStarterResult) => {
      handleCreateProject(config, true);
    },
    [handleCreateProject],
  );

  const handleShare = useCallback(async (post: FeedPost) => {
    const link = `https://openband.app/track/${post.id}`;
    if (Platform.OS === "web") {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(link);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = link;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        toast.show("Link copiado", "success");
      } catch {
        toast.show(t("feed.shareError", "Não foi possível copiar o link"), "error");
      }
    } else {
      try {
        await Share.share({ title: post.title, url: link });
      } catch {
        toast.show(t("feed.shareError", "Não foi possível compartilhar"), "error");
      }
    }
  }, [t, toast]);

  const handlePlayed = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, plays: p.plays + 1 } : p)),
    );
  }, []);

  const renderItem = useCallback(({ item }: { item: FeedPost }) => {
    const isThisPlaying = playingId === item.id && playing;
    const isThisLoading = loadingId === item.id;
    return (
      <FeedPostCard
        item={item}
        isPlaying={isThisPlaying}
        isLoading={isThisLoading}
        audioRef={webAudio.audioRef}
        onPlay={handlePlay}
        onLike={handleLike}
        onRemix={handleRemix}
        onShare={handleShare}
        onPlayed={handlePlayed}
      />
    );
  }, [playingId, loadingId, playing, webAudio.audioRef, handlePlay, handleLike, handleRemix, handleShare, handlePlayed]);

  const maxWidthStyle: Record<string, string | number | undefined> = { width: "100%", maxWidth: LAYOUT_MAX_WIDTHS.feedWide, alignSelf: "center" as const };

  return (
    <View className="flex-1 bg-dark-bg" style={{ paddingTop: resp.safeTop }}>
      <QuickTools
        visible={showQuickTools}
        onClose={() => setShowQuickTools(false)}
        onNewProject={handleOpenNewProject}
      />
      <NewProject
        visible={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={handleCreateProject}
      />
      <OnboardingFlow
        visible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onCreate={handleOnboardingCreate}
        onStartFromScratch={handleOpenNewProject}
        onDontShowAgain={completeOnboarding}
      />
      <View style={maxWidthStyle}>
        <View className="pt-4 tablet:pt-12 px-4 tablet:px-6 flex-row items-start justify-between">
          <View className="flex-1">
            <PageHeader title={t("feed.title", "Feed")} subtitle={t("feed.subtitle", "Descubra novos sons e crie os seus")} />
          </View>
          <Pressable
            onPress={handleNewProject}
            className="bg-brand-primary rounded-full px-5 py-2.5 flex-row items-center gap-2 active:opacity-80 hover:bg-brand-primaryDark"
            accessibilityRole="button"
            accessibilityLabel={t("feed.newProject", "Novo Projeto")}
          >
            <Text className="text-white font-bold text-base">+</Text>
            <Text className="text-white font-bold text-sm">{t("feed.newProject", "Novo Projeto")}</Text>
          </Pressable>
        </View>

        <View className="px-4 tablet:px-6 mb-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-2"
            contentContainerStyle={{ paddingRight: 16 }}
          >
            <View className="flex-row gap-2 py-1.5">
              {GENRE_FILTERS.map((genre) => (
                <Pressable
                  key={genre.id}
                  onPress={() => setGenreFilter(genre.id)}
                  className={`px-3 py-1.5 rounded-full border flex-row items-center gap-1 ${
                    genreFilter === genre.id
                      ? "bg-brand-primary/20 border-brand-primary"
                      : "bg-dark-elevated border-dark-border"
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={genre.id === "all" ? t("feed.all", "Todos") : genre.label}
                  accessibilityState={{ selected: genreFilter === genre.id }}
                >
                  <Text
                    className={`text-xs ${genreFilter === genre.id ? "text-brand-primary" : "text-gray-400"}`}
                  >
                     {genre.icon}
                   </Text>
                   <Text
                     className={`text-xs font-semibold ${genreFilter === genre.id ? "text-brand-primary" : "text-white"}`}
                   >
                     {genre.id === "all" ? t("feed.all", "Todos") : genre.label}
                   </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View className="flex-row gap-2">
            {(["recent", "popular", "genre"] as SortMode[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setSortMode(mode)}
                className={`px-3 py-1 rounded-lg border ${sortMode === mode ? "bg-brand-accent border-brand-accent" : "bg-dark-elevated border-dark-border"}`}
                accessibilityRole="radio"
                accessibilityLabel={
                  mode === "recent"
                    ? t("feed.recent", "Recentes")
                    : mode === "popular"
                      ? t("feed.popular", "Populares")
                      : t("feed.genre", "Gênero")
                }
                accessibilityState={{ selected: sortMode === mode }}
              >
                <Text
                  className={`text-[10px] font-semibold ${sortMode === mode ? "text-dark-bg" : "text-gray-400"}`}
                >
                  {mode === "recent"
                    ? t("feed.recent", "Recentes")
                    : mode === "popular"
                      ? t("feed.popular", "Populares")
                      : t("feed.genre", "Gênero")}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {playingId && (
        <View className="px-4 tablet:px-6 py-3 bg-brand-primary/10 border-b border-brand-primary/20" style={maxWidthStyle}>
          <View className="flex-row items-center gap-2.5">
            <View className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <Text className="text-green-400 text-xs font-medium flex-1">
              {t("feed.playing", "Tocando: ")}{currentPostRef.current?.title ?? ""}
            </Text>
          </View>
        </View>
      )}

      <View className="flex-1 flex-row" style={maxWidthStyle}>
        <View style={resp.isDesktop ? { flex: 7 } : { flex: 1 }}>
          {initialLoading ? (
            <View className="px-4 tablet:px-6" style={{ paddingTop: 8 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <FeedSkeletonCard key={i} />
              ))}
            </View>
          ) : (
          <FlatList
            key={resp.numColumns}
            numColumns={resp.numColumns}
            columnWrapperStyle={resp.numColumns > 1 ? { gap: 12 } : undefined}
            data={visiblePosts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingBottom: SCREEN_BOTTOM_PADDING,
              paddingHorizontal: resp.isDesktop ? 16 : 0,
            }}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            refreshing={refreshing}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#ffffff"
                colors={["#ffffff"]}
              />
            }
            ListEmptyComponent={
              loading ? (
                <Loading message={t("feed.loadingFeed", "Carregando feed...")} />
              ) : (
                <View className="py-16 items-center">
                  <Text className="text-4xl mb-3 opacity-50">🎵</Text>
                  <Text className="text-gray-500 text-sm">
                    {t("feed.noTracks", "Nenhum track encontrado")}
                  </Text>
                </View>
              )
            }
            ListHeaderComponent={
              !hasProjects ? (
                <View className="mx-4 mb-4 mt-2 p-5 rounded-2xl bg-brand-primary/10 border border-brand-primary/30">
                  <Text className="text-2xl mb-2">🎸</Text>
                  <Text className="text-white font-bold text-lg mb-1">
                    {t("feed.welcomeTitle", "Bem-vindo ao OpenBand!")}
                  </Text>
                  <Text className="text-gray-300 text-sm mb-3 leading-5">
                    {t("feed.welcomeText", "Crie seu primeiro projeto musical e comece a produzir música agora.")}
                  </Text>
                  <View className="flex-row gap-2">
                    <Button
                      title={`+ ${t("feed.newProject", "Novo Projeto")}`}
                      onPress={handleNewProject}
                      variant="primary"
                      className="flex-1"
                    />
                    <Button
                      title={t("feed.viewLibrary", "Ver Biblioteca")}
                      onPress={() => router.push("/tabs/library")}
                      variant="secondary"
                      className="flex-1"
                    />
                  </View>
                </View>
              ) : null
            }
            renderItem={renderItem}
          />
          )}
        </View>

        {resp.isDesktop && (
          <View style={{ flex: 3, paddingLeft: 12 }}>
            <QuickActions />
          </View>
        )}
      </View>
    </View>
  );
}

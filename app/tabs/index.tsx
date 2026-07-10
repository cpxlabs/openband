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
} from "react-native";
import { useRouter } from "expo-router";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import {
  PageHeader,
  QuickActions,
  setMiniPlayerState,
  QuickTools,
  NewProject,
  FeedPostCard,
} from "../../src/components";
import type { FeedPost } from "../../src/components/FeedPostCard";
import { generatePreviewUrl, SCREEN_BOTTOM_PADDING } from "../../src/lib/constants";
import { LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive";
import { GENRES } from "../../src/lib/projectTemplates";
import type { GenreTemplate, Mood } from "../../src/lib/projectTemplates";
import { useResponsive } from "../../src/lib/responsive";
import { listProjectIndex } from "../../src/lib/projectStore";
import { audioSystem } from "../../src/lib/universalAudio";
import { useWebAudioPlayer } from "../../src/hooks/useWebAudioPlayer";
import { useTranslation } from "react-i18next";

const MOCK_POSTS: FeedPost[] = [
  {
    id: "1",
    title: "Solo de Guitarra Pesado",
    author: "João M.",
    authorHandle: "@joaomusico99",
    genre: "rock",
    key: "E",
    bpm: 140,
    plays: 2341,
    likes: 182,
    userLiked: false,
    duration: 45,
    color: "bg-orange-500",
  },
  {
    id: "2",
    title: "Beat Lo-fi Chill 2026",
    author: "Ana Sintetizador",
    authorHandle: "@sintetizadorvirtual",
    genre: "lofi",
    key: "Am",
    bpm: 90,
    plays: 1892,
    likes: 245,
    userLiked: true,
    duration: 120,
    color: "bg-amber-500",
  },
  {
    id: "3",
    title: "Bateria Eletrônica",
    author: "Drummer BR",
    authorHandle: "@drummerbr",
    genre: "edm",
    key: "F#m",
    bpm: 128,
    plays: 3567,
    likes: 423,
    userLiked: false,
    duration: 60,
    color: "bg-green-500",
  },
  {
    id: "4",
    title: "Baixo Synthwave",
    author: "Synthwave BR",
    authorHandle: "@synthwavebr",
    genre: "edm",
    key: "Dm",
    bpm: 110,
    plays: 923,
    likes: 89,
    userLiked: false,
    duration: 90,
    color: "bg-purple-500",
  },
  {
    id: "5",
    title: "Violão na Praia",
    author: "Maria Acústico",
    authorHandle: "@mariaacustico",
    genre: "acoustic",
    key: "G",
    bpm: 100,
    plays: 1456,
    likes: 312,
    userLiked: true,
    duration: 75,
    color: "bg-cyan-500",
  },
  {
    id: "6",
    title: "Jazz Improviso Noturno",
    author: "Carlos Jazz",
    authorHandle: "@carlosjazz",
    genre: "jazz",
    key: "Bb",
    bpm: 120,
    plays: 678,
    likes: 156,
    userLiked: false,
    duration: 180,
    color: "bg-indigo-500",
  },
  {
    id: "7",
    title: "Beat Hip-Hop 808",
    author: "Produtor RC",
    authorHandle: "@produtorrc",
    genre: "hiphop",
    key: "C#m",
    bpm: 95,
    plays: 2876,
    likes: 534,
    userLiked: false,
    duration: 80,
    color: "bg-red-500",
  },
  {
    id: "8",
    title: "Metal Pesado Riff",
    author: "Guitar Hero",
    authorHandle: "@guitarhero",
    genre: "metal",
    key: "F",
    bpm: 180,
    plays: 4321,
    likes: 678,
    userLiked: true,
    duration: 40,
    color: "bg-gray-500",
  },
  {
    id: "9",
    title: "R&B Suave",
    author: "Neo Soul BR",
    authorHandle: "@neosoulbr",
    genre: "rnb",
    key: "A",
    bpm: 85,
    plays: 1567,
    likes: 289,
    userLiked: false,
    duration: 110,
    color: "bg-pink-500",
  },
  {
    id: "10",
    title: "Blues Elétrico",
    author: "Blues Man",
    authorHandle: "@bluesman",
    genre: "blues",
    key: "A",
    bpm: 100,
    plays: 834,
    likes: 167,
    userLiked: false,
    duration: 150,
    color: "bg-blue-500",
  },
];

const GENRE_FILTERS = [
  { id: "all", label: "Todos", icon: "♫" },
  ...GENRES.map((g) => ({ id: g.id, label: g.name, icon: g.icon })),
];

type SortMode = "recent" | "popular" | "genre";



export default function Feed() {
  const router = useRouter();
  const { t } = useTranslation();
  const resp = useResponsive();
  const webAudio = useWebAudioPlayer({ trackTime: false });
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
  const currentPostRef = useRef(posts[0]);

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
        Alert.alert("Erro", "Falha ao carregar prévia do áudio.");
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
  }, []);

  const handleRemix = useCallback(
    (post: FeedPost) => {
      const projectId = `remix-${post.id}-${Date.now()}`;
      router.push(
        `/studio/${projectId}?title=${encodeURIComponent(`Remix: ${post.title}`)}&genre=${post.genre}&key=${post.key}&bpm=${post.bpm}`,
      );
    },
    [router],
  );

  const handleNewProject = useCallback(() => {
    setShowQuickTools(true);
  }, []);

  const handleOpenNewProject = useCallback(() => {
    setShowNewProject(true);
  }, []);

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
      const projectId = `proj-${Date.now()}`;
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

  const handleShare = useCallback(async (post: FeedPost) => {
    if (Platform.OS === "web") {
      await navigator.clipboard.writeText(
        `https://openband.app/track/${post.id}`,
      );
      Alert.alert("Compartilhar", "Link copiado para a área de transferência!");
    } else {
      await Share.share({
        title: post.title,
        url: `https://openband.app/track/${post.id}`,
      });
    }
  }, []);

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
                >
                  <Text
                    className={`text-xs ${genreFilter === genre.id ? "text-brand-primary" : "text-gray-400"}`}
                  >
                    {genre.icon}
                  </Text>
                  <Text
                    className={`text-xs font-semibold ${genreFilter === genre.id ? "text-brand-primary" : "text-white"}`}
                  >
                    {genre.label}
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
                className={`px-3 py-1 rounded-lg border ${sortMode === mode ? "bg-dark-muted border-brand-accent/40" : "bg-dark-elevated border-dark-border"}`}
              >
                <Text
                  className={`text-[10px] font-semibold ${sortMode === mode ? "text-brand-accent" : "text-gray-400"}`}
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

        {playingId && (
          <View className="px-4 tablet:px-6 py-3 bg-brand-primary/10 border-b border-brand-primary/20">
            <View className="flex-row items-center gap-2.5">
              <View className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <Text className="text-green-400 text-xs font-medium flex-1">
                {t("feed.playing", "Tocando: ")}{currentPostRef.current.title}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className="flex-1 flex-row" style={maxWidthStyle}>
        <View style={resp.isDesktop ? { flex: 7 } : { flex: 1 }}>
          <FlatList
            key={resp.numColumns}
            numColumns={resp.numColumns}
            columnWrapperStyle={resp.numColumns > 1 ? { gap: 12 } : undefined}
            data={filteredPosts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingBottom: SCREEN_BOTTOM_PADDING,
              paddingHorizontal: resp.isDesktop ? 16 : 0,
            }}
            ListEmptyComponent={
              <View className="py-16 items-center">
                <Text className="text-4xl mb-3 opacity-50">🎵</Text>
                <Text className="text-gray-500 text-sm">
                  {t("feed.noTracks", "Nenhum track encontrado")}
                </Text>
              </View>
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
                    <Pressable
                      onPress={handleNewProject}
                      className="flex-1 bg-brand-primary rounded-xl py-3 items-center"
                    >
                      <Text className="text-white font-bold text-sm">
                        + {t("feed.newProject", "Novo Projeto")}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push("/tabs/library")}
                      className="flex-1 bg-dark-elevated border border-dark-border rounded-xl py-3 items-center"
                    >
                      <Text className="text-white font-bold text-sm">
                        {t("feed.viewLibrary", "Ver Biblioteca")}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null
            }
            renderItem={renderItem}
          />
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

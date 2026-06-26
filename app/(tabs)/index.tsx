import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  FlatList,
  View,
  Text,
  Pressable,
  ScrollView,
  Share,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import {
  Card,
  Badge,
  ProgressBar,
  PageHeader,
  Avatar,
  QuickActions,
  NewProject,
} from "../../src/components";
import { generatePreviewUrl, SCREEN_BOTTOM_PADDING } from "../../src/lib/constants";
import { GENRES } from "../../src/lib/projectTemplates";
import { useResponsive } from "../../src/lib/responsive";

interface FeedPost {
  id: string;
  title: string;
  author: string;
  authorHandle: string;
  genre: string;
  key: string;
  bpm: number;
  plays: number;
  likes: number;
  userLiked: boolean;
  duration: number;
  color: string;
}

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

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function Feed() {
  const router = useRouter();
  const resp = useResponsive();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);

  useEffect(() => {
    return () => {
      player.pause();
    };
  }, [player]);
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

  const handlePlay = useCallback(
    async (post: FeedPost) => {
      if (playingId === post.id && player.playing) {
        player.pause();
        setPlayingId(null);
        return;
      }
      const url = await generatePreviewUrl(post.id, post.duration);
      if (url) {
        await player.replace(url);
        player.play();
        currentPostRef.current = post;
        setPlayingId(post.id);
      }
    },
    [playingId, player],
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
    setShowNewProject(true);
  }, []);

  const handleCreateProject = useCallback(
    (config: { name: string; genre: any; key: string; bpm: number; mood?: string }) => {
      const projectId = `proj-${Date.now()}`;
      const params = new URLSearchParams({
        title: config.name,
        genre: config.genre.id,
        bpm: String(config.bpm),
        key: config.key,
      });
      if (config.mood) params.set("mood", config.mood);
      router.push(`/studio/${projectId}?${params.toString()}`);
      setShowNewProject(false);
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

  const maxWidthStyle: any = resp.isDesktop
    ? { maxWidth: 1200, alignSelf: "center" as const }
    : undefined

  return (
    <View className="flex-1 bg-dark-bg">
      <NewProject
        visible={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={handleCreateProject}
      />
      <View style={maxWidthStyle}>
        <View className="pt-4 tablet:pt-12 px-4 tablet:px-6 flex-row items-start justify-between">
          <View className="flex-1">
            <PageHeader title="Feed" subtitle="Descubra novos sons e crie os seus" />
          </View>
          <Pressable
            onPress={handleNewProject}
            className="bg-brand-primary rounded-full px-5 py-2.5 flex-row items-center gap-2 active:opacity-80 hover:bg-brand-primaryDark"
            accessibilityRole="button"
            accessibilityLabel="Novo Projeto"
          >
            <Text className="text-white font-bold text-base">+</Text>
            <Text className="text-white font-bold text-sm">Novo Projeto</Text>
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
                    ? "Recentes"
                    : mode === "popular"
                      ? "Populares"
                      : "Gênero"}
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
                Tocando: {currentPostRef.current.title}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className="flex-1 flex-row" style={maxWidthStyle}>
        <View className="flex-1" style={{ flexBasis: resp.isDesktop ? "70%" : "100%" }}>
          <FlatList
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
                  Nenhum track encontrado
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isThisPlaying = playingId === item.id && player.playing;
              const progress = status.duration
                ? (status.currentTime / status.duration) * 100
                : 0;

              return (
                <Card highlighted={isThisPlaying} className="mx-4 tablet:mx-2 mb-3">
                  <View className="p-4">
                    <View className="flex-row items-start gap-3">
                      <Avatar name={item.author} size="md" />
                      <View className="flex-1">
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 mr-2">
                            <Text className="text-white font-bold text-base leading-tight">
                              {item.title}
                            </Text>
                            <Text className="text-gray-400 text-xs mt-0.5">
                              {item.authorHandle}
                            </Text>
                          </View>
                          <Badge
                            text={formatCount(item.plays)}
                            icon="▶"
                            variant="play"
                          />
                        </View>

                        <View className="flex-row items-center gap-2 mt-2">
                          <Badge
                            text={item.genre.toUpperCase()}
                            variant="default"
                          />
                          <Badge text={item.key} variant="default" />
                          <Badge text={`${item.bpm} BPM`} variant="default" />
                          <Text className="text-gray-600 text-[10px]">
                            {Math.floor(item.duration / 60)}:
                            {String(item.duration % 60).padStart(2, "0")}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => {
                        handlePlay(item);
                        handlePlayed(item.id);
                      }}
                      className={`mt-3 h-10 rounded-xl items-center justify-center flex-row gap-2 ${
                        isThisPlaying ? "bg-green-600" : "btn-secondary"
                      }`}
                    >
                      <Text
                        className={`text-sm ${isThisPlaying ? "text-white" : "text-brand-primary"}`}
                      >
                        {isThisPlaying ? "⏸" : "▶"}
                      </Text>
                      <Text
                        className={`font-bold text-xs ${isThisPlaying ? "text-white" : "text-brand-primary"}`}
                      >
                        {isThisPlaying ? "Pausar" : "Ouvir"}
                      </Text>
                    </Pressable>

                    <View className="flex-row items-center gap-3 mt-3">
                      <Pressable
                        onPress={() => handleLike(item.id)}
                        className="flex-row items-center gap-1 active:opacity-60"
                      >
                        <Text
                          className={`text-base ${item.userLiked ? "text-brand-primary" : "text-gray-500"}`}
                        >
                          {item.userLiked ? "❤" : "♡"}
                        </Text>
                        <Text
                          className={`text-xs font-semibold ${item.userLiked ? "text-brand-primary" : "text-gray-500"}`}
                        >
                          {formatCount(item.likes)}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleRemix(item)}
                        className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-dark-elevated border border-dark-border active:opacity-70"
                      >
                        <Text className="text-gray-400 text-xs">🔄</Text>
                        <Text className="text-gray-400 text-[10px] font-semibold">
                          Remix
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleShare(item)}
                        className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-dark-elevated border border-dark-border active:opacity-70"
                      >
                        <Text className="text-gray-400 text-xs">↗</Text>
                        <Text className="text-gray-400 text-[10px] font-semibold">
                          Compartilhar
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  {isThisPlaying && <ProgressBar progress={progress} />}
                </Card>
              );
            }}
          />
        </View>

        {resp.isDesktop && (
          <View style={{ width: "30%", paddingLeft: 12 }}>
            <QuickActions />
          </View>
        )}
      </View>
    </View>
  );
}

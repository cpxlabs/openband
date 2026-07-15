import React, { useState, useEffect, memo } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { ProgressBar } from "./ProgressBar";

export interface FeedPost {
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
  userFavorited?: boolean;
  duration: number;
  color: string;
}

interface FeedPostCardProps {
  item: FeedPost;
  isPlaying: boolean;
  isLoading: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onPlay: (post: FeedPost) => void;
  onLike: (postId: string) => void;
  onRemix: (post: FeedPost) => void;
  onShare: (post: FeedPost) => void;
  onPlayed: (postId: string) => void;
  onFavorite?: (postId: string) => void;
  flex?: number;
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const LiveProgressBar = memo(function LiveProgressBar({
  audioRef,
}: {
  audioRef: React.RefObject<HTMLAudioElement | null>;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    let rafId: number;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [audioRef]);

  return <ProgressBar progress={progress} />;
});

export const FeedPostCard = memo(function FeedPostCard({
  item,
  isPlaying,
  isLoading,
  audioRef,
  onPlay,
  onLike,
  onRemix,
  onShare,
  onPlayed,
  onFavorite,
  flex = 1,
}: FeedPostCardProps) {
  return (
    <View 
      className={`card-premium mb-3 ${isPlaying ? "border-brand-primary/40" : ""}`}
      style={{ flex }}
    >
      <View className="p-4 pb-0">
        <View className="flex-row items-start gap-3 mb-3">
          <Avatar name={item.author} size="md" />
          <View className="flex-1">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-2">
                <Text className="text-white font-bold text-base leading-tight" numberOfLines={1} ellipsizeMode="tail">
                  {item.title}
                </Text>
                <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1} ellipsizeMode="tail">
                  {item.authorHandle}
                </Text>
              </View>
              <View className="bg-dark-muted/30 px-2 py-1 rounded-lg flex-row items-center gap-1">
                <Text className="text-gray-400 text-[9px]">▶</Text>
                <Text className="text-gray-400 text-[10px] font-semibold">
                  {formatCount(item.plays)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2 mt-2">
              <Badge text={item.genre.toUpperCase()} variant="default" />
              <Badge text={item.key} variant="default" />
              <Badge text={`${item.bpm} BPM`} variant="default" />
              <Text className="text-gray-600 text-[10px]">
                {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, "0")}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => {
            onPlay(item);
            onPlayed(item.id);
          }}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel={isLoading ? "Carregando áudio" : isPlaying ? "Pausar áudio" : "Ouvir áudio"}
          accessibilityState={{ disabled: isLoading }}
          className={`h-11 rounded-xl items-center justify-center flex-row gap-2 ${
            isPlaying ? "bg-green-600" : "bg-brand-primary"
          } shadow-sm ${isPlaying ? "shadow-green-600/20" : "shadow-brand-primary/20"}`}
        >
          <Text className="text-white text-sm">
            {isLoading ? "…" : isPlaying ? "⏸" : "▶"}
          </Text>
          <Text className="text-white font-bold text-sm">
            {isLoading ? "Carregando" : isPlaying ? "Pausar" : "Ouvir"}
          </Text>
        </Pressable>
      </View>

      <View className="px-4 py-3 flex-row items-center gap-4">
        <Pressable
          onPress={() => onLike(item.id)}
          className="flex-row items-center gap-1.5 active:opacity-60"
        >
          <Text className={`text-base ${item.userLiked ? "text-brand-primary" : "text-gray-500"}`}>
            {item.userLiked ? "❤" : "♡"}
          </Text>
          <Text className={`text-xs font-semibold ${item.userLiked ? "text-brand-primary" : "text-gray-500"}`}>
            {formatCount(item.likes)}
          </Text>
        </Pressable>

        {onFavorite && (
          <Pressable
            onPress={() => onFavorite(item.id)}
            className="flex-row items-center gap-1.5 active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel={item.userFavorited ? "Remover dos favoritos" : "Favoritar"}
          >
            <Text className={`text-base ${item.userFavorited ? "text-yellow-400" : "text-gray-500"}`}>
              {item.userFavorited ? "★" : "☆"}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => onRemix(item)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-elevated border border-dark-border/60 active:opacity-70"
        >
          <Text className="text-gray-400 text-xs">🔄</Text>
          <Text className="text-gray-400 text-[10px] font-semibold">Remix</Text>
        </Pressable>

        <Pressable
          onPress={() => onShare(item)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-elevated border border-dark-border/60 active:opacity-70"
        >
          <Text className="text-gray-400 text-xs">↗</Text>
          <Text className="text-gray-400 text-[10px] font-semibold">Compartilhar</Text>
        </Pressable>
      </View>
      {isPlaying && <LiveProgressBar audioRef={audioRef} />}
    </View>
  );
});

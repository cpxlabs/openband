import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Avatar } from "./Avatar";
import { ProgressBar } from "./ProgressBar";
import { generatePreviewUrl } from "../lib/constants";

export interface MomentData {
  id: string;
  artistName: string;
  artistHandle: string;
  avatar: string;
  imageUrl?: string;
  caption: string;
  songTitle: string;
  songDuration: number;
  likes: number;
  comments: number;
  userLiked: boolean;
  timeAgo: string;
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

interface MomentCardProps {
  moment: MomentData;
  testID?: string;
}

function MomentAudioPlayer({
  isPlaying,
  onStatusChange,
  songTitle,
  songDuration,
}: {
  isPlaying: boolean;
  onStatusChange: (
    playing: boolean,
    currentTime: number,
    duration: number,
  ) => void;
  songTitle: string;
  songDuration: number;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const player = useAudioPlayer(previewUrl);
  const status = useAudioPlayerStatus(player);
  const prevRef = useRef({ playing: false, currentTime: 0, duration: 0 });

  useEffect(() => {
    if (isPlaying && !previewUrl) {
      generatePreviewUrl(songTitle, Math.min(songDuration, 30)).then((url) => {
        if (url) setPreviewUrl(url);
      });
    }
  }, [isPlaying, previewUrl, songTitle, songDuration]);

  useEffect(() => {
    if (previewUrl && isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player, previewUrl]);

  useEffect(() => {
    const p = status.playing;
    const ct = status.currentTime ?? 0;
    const d = status.duration ?? 0;
    const prev = prevRef.current;
    if (
      p !== prev.playing ||
      Math.abs(ct - prev.currentTime) > 0.01 ||
      Math.abs(d - prev.duration) > 0.01
    ) {
      prevRef.current = { playing: p, currentTime: ct, duration: d };
      onStatusChange(p, ct, d);
    }
  }, [status, onStatusChange]);

  return null;
}

export function MomentCard({ moment, testID }: MomentCardProps) {
  const [playerActive, setPlayerActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [liked, setLiked] = useState(moment.userLiked);
  const [likeCount, setLikeCount] = useState(moment.likes);
  const handlePlay = useCallback(() => {
    if (!playerActive) {
      setPlayerActive(true);
    }
    setIsPlaying((prev) => !prev);
  }, [playerActive]);

  const handleStatusChange = useCallback(
    (_playing: boolean, currentTime: number, dur: number) => {
      setDuration(dur);
      setProgress(dur ? (currentTime / dur) * 100 : 0);
    },
    [],
  );

  const handleLike = useCallback(() => {
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  }, [liked]);

  const progressPercent = duration ? progress : 0;

  return (
    <View
      testID={testID}
      className="mb-4 bg-dark-surface rounded-2xl border border-dark-border overflow-hidden"
    >
      <View className="p-4 pb-0">
        <View className="flex-row items-center gap-3 mb-3">
          <Avatar name={moment.artistName} size="md" />
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-white font-bold text-sm">
                {moment.artistName}
              </Text>
              <View className="bg-brand-primary/20 px-1.5 py-0.5 rounded">
                <Text className="text-brand-primary text-[8px] font-bold">
                  ARTISTA
                </Text>
              </View>
            </View>
            <Text className="text-gray-500 text-[11px]">
              {moment.artistHandle} · {moment.timeAgo}
            </Text>
          </View>
          <Pressable
            onPress={handleLike}
            className="items-center pressable-scale"
          >
            <Text
              className={`text-lg transition-all duration-normal ${liked ? "text-brand-primary" : "text-gray-500"}`}
            >
              {liked ? "❤" : "♡"}
            </Text>
            <Text
              className={`text-[9px] font-semibold ${liked ? "text-brand-primary" : "text-gray-500"}`}
            >
              {formatCount(likeCount)}
            </Text>
          </Pressable>
        </View>

        <Text className="text-gray-200 text-sm leading-relaxed mb-3">
          {moment.caption}
        </Text>

        {moment.imageUrl && (
          <View className="rounded-xl overflow-hidden mb-3 h-48 bg-dark-elevated">
            <Image
              source={{ uri: moment.imageUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
        )}
      </View>

      <View className="px-4 mb-4 gap-2">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={handlePlay}
            className={`w-10 h-10 rounded-full items-center justify-center ${isPlaying ? "bg-green-600" : "bg-brand-accent"}`}
          >
            <Text className="text-white text-base ml-0.5">
              {isPlaying ? "⏸" : "▶"}
            </Text>
          </Pressable>
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold">
              {moment.songTitle}
            </Text>
            <Text className="text-gray-500 text-[10px] mt-0.5">
              {Math.floor(moment.songDuration / 60)}:
              {String(moment.songDuration % 60).padStart(2, "0")}
            </Text>
          </View>
        </View>

        <View className="mt-1">
          <ProgressBar progress={progressPercent} />
        </View>

        {playerActive && (
          <MomentAudioPlayer
            isPlaying={isPlaying}
            onStatusChange={handleStatusChange}
            songTitle={moment.songTitle}
            songDuration={moment.songDuration}
          />
        )}
      </View>

      <View className="px-4 pb-3 flex-row items-center gap-4">
        <View className="flex-row items-center gap-1">
          <Text className="text-gray-500 text-xs">💬</Text>
          <Text className="text-gray-500 text-[11px] font-medium">
            {formatCount(moment.comments)}
          </Text>
        </View>
        <Pressable
          onPress={handleLike}
          className="flex-row items-center gap-1 active:opacity-60"
        >
          <Text
            className={`text-xs ${liked ? "text-brand-primary" : "text-gray-500"}`}
          >
            {liked ? "❤" : "♡"}
          </Text>
          <Text
            className={`text-[11px] font-medium ${liked ? "text-brand-primary" : "text-gray-500"}`}
          >
            Curtir
          </Text>
        </Pressable>
        <View className="flex-row items-center gap-1">
          <Text className="text-gray-500 text-xs">↗</Text>
          <Text className="text-gray-500 text-[11px] font-medium">
            Compartilhar
          </Text>
        </View>
      </View>
    </View>
  );
}

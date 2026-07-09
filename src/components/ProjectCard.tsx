
import { View, Text, Pressable } from "react-native";
import { Badge } from "./Badge";
import { ProjectMenu } from "./ProjectMenu";
import type { ProjectData } from "../lib/projectStore";

export interface ProjectDisplayData {
  id: string;
  title: string;
  lastSaved: number;
  genre?: string;
  key?: string;
  bpm?: number;
  metadata?: ProjectData | null;
}

interface ProjectCardProps {
  project: ProjectDisplayData;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpen: (id: string) => void;
  onRefresh: () => void;
  flex?: number;
}

export function ProjectCard({
  project,
  isFavorite,
  onToggleFavorite,
  onOpen,
  onRefresh,
  flex = 1,
}: ProjectCardProps) {
  return (
    <View className="card-premium mb-2.5" style={{ flex }}>
      <View className="p-4 flex-row items-center">
        <Pressable
          onPress={() => onOpen(project.id)}
          className="flex-1 flex-row items-center active:opacity-80"
        >
          <View className="w-12 h-12 rounded-xl bg-brand-primary/15 items-center justify-center">
            <Text className="text-xl">♫</Text>
          </View>
          <View className="flex-1 ml-3.5 mr-2">
            <Text className="text-white font-semibold text-base">{project.title}</Text>
            <View className="flex-row items-center gap-2 mt-1.5 flex-wrap">
              <Text className="text-gray-500 text-xs">
                {new Date(project.lastSaved).toLocaleDateString()}
              </Text>
              {project.bpm && (
                <Badge text={`${project.bpm} BPM`} variant="default" />
              )}
              {project.key && (
                <Badge text={project.key} variant="default" />
              )}
              {project.genre && (
                <Badge text={project.genre.toUpperCase()} variant="default" />
              )}
            </View>
          </View>
        </Pressable>
        <Pressable
          onPress={() => onToggleFavorite(project.id)}
          className="px-2 py-2 active:opacity-60"
        >
          <Text className={`text-lg ${isFavorite ? "text-brand-primary" : "text-gray-500"}`}>
            {isFavorite ? "★" : "☆"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onOpen(project.id)}
          className="px-3.5 py-2 rounded-lg bg-brand-primary/10 border border-brand-primary/30 active:opacity-70 ml-1"
        >
          <Text className="text-brand-primary text-sm font-semibold">Abrir →</Text>
        </Pressable>
        <ProjectMenu
          projectId={project.id}
          projectTitle={project.title}
          onRefresh={onRefresh}
        />
      </View>
    </View>
  );
}

import { useState, useCallback, useMemo } from "react"
import { View, Text, FlatList, Pressable, Alert } from "react-native"
import { useRouter } from "expo-router"
import { EmptyState, PageHeader, Button, NewProject, Badge, ProjectMenu } from "../../src/components"
import type { GenreTemplate, Mood } from "../../src/lib/projectTemplates"
import { useResponsive, LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive"
import { listProjectIndex, importProject, loadProject, getFavoriteProjects, isProjectFavorite, toggleProjectFavorite } from "../../src/lib/projectStore"
import { SCREEN_BOTTOM_PADDING } from "../../src/lib/constants"
import { OpenBandNative } from "../../src/bridge"

type FilterTab = "all" | "favorites" | "collabs" | "trash"

const FILTER_TABS: { id: FilterTab; label: string; icon: string }[] = [
  { id: "all", label: "Todos", icon: "♫" },
  { id: "favorites", label: "Favoritos", icon: "★" },
  { id: "collabs", label: "Colaborações", icon: "👥" },
  { id: "trash", label: "Lixeira", icon: "🗑" },
]

export default function Library() {
  const router = useRouter()
  const resp = useResponsive()
  const [showNewProject, setShowNewProject] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filterTab, setFilterTab] = useState<FilterTab>("all")

  const projectIndex = useMemo(() => listProjectIndex(), [refreshKey])

  const projects = useMemo(() => {
    return Object.entries(projectIndex)
      .map(([id, meta]) => {
        const full = loadProject(id)
        return {
          id,
          title: meta.title,
          lastSaved: meta.lastSaved,
          genre: full?.genre,
          key: full?.key,
          bpm: full?.bpm,
          metadata: full,
        }
      })
      .sort((a, b) => b.lastSaved - a.lastSaved)
  }, [projectIndex])

  const handleToggleFavorite = useCallback((projectId: string) => {
    toggleProjectFavorite(projectId)
    setRefreshKey(k => k + 1)
  }, [])

  const filtered = useMemo(() => {
    if (filterTab === "favorites") {
      const favorites = getFavoriteProjects();
      return projects.filter(p => favorites.includes(p.id));
    }
    if (filterTab === "collabs") {
      return projects.filter(p => p.metadata?.parentProjectId);
    }
    return projects
  }, [projects, filterTab])

  const handleCreate = useCallback((config: {
    name: string; genre: GenreTemplate; key: string; bpm: number; mood?: Mood; numBars?: number; timeSignature?: string
  }) => {
    const projectId = `proj-${Date.now()}`
    const params = new URLSearchParams({
      title: config.name, genre: config.genre.id, key: config.key, bpm: String(config.bpm),
      numBars: String(config.numBars ?? 8), timeSignature: config.timeSignature ?? "4/4",
    })
    if (config.mood) params.set("mood", config.mood)
    setRefreshKey(k => k + 1)
    setShowNewProject(false)
    router.push(`/studio/${projectId}?${params.toString()}`)
  }, [router])

  const handleImportProject = useCallback(async () => {
    try {
      const path = await OpenBandNative.showOpenDialog({
        filters: [{ name: "OpenBand Project", extensions: ["json"] }],
      })
      if (!path) return
      const buffer = await OpenBandNative.readFile(path)
      const text = typeof TextDecoder !== "undefined"
        ? new TextDecoder().decode(buffer)
        : String.fromCharCode(...new Uint8Array(buffer))
      const id = importProject(text)
      if (id) {
        setRefreshKey(k => k + 1)
        router.push(`/studio/${id}`)
      } else {
        Alert.alert("Erro", "Arquivo de projeto inválido.")
      }
    } catch (e) {
      console.warn("Import failed:", e)
      Alert.alert("Erro", "Falha ao importar projeto.")
    }
  }, [router])

  const px = resp.isMobile ? "px-4" : "px-6"

  return (
    <View className="flex-1 bg-dark-bg">
      <View className={`pt-4 tablet:pt-12 ${px}`}>
        <PageHeader title="Biblioteca" subtitle="Seus projetos musicais" />
      </View>

      <View className={`${px} mb-4 gap-3`}>
        <Pressable
          onPress={() => setShowNewProject(true)}
          className="btn-red shadow-sm shadow-brand-primary/20"
          accessibilityRole="button"
          accessibilityLabel="Novo Projeto"
        >
          <Text className="text-white font-bold text-base">+</Text>
          <Text className="text-white font-bold text-sm">Novo Projeto</Text>
        </Pressable>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button title="Importar Projeto" variant="secondary" icon="📂" onPress={handleImportProject} />
          </View>
          <View className="flex-1">
            <Button title="Separar Stems" variant="secondary" icon="🔊" onPress={() => router.push("/extractor")} />
          </View>
        </View>
      </View>

      <View className={`${px} mb-3`}>
        <View className="flex-row gap-2">
          {FILTER_TABS.map(tab => (
            <Pressable
              key={tab.id}
              onPress={() => setFilterTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-full border flex-row items-center gap-1.5 ${
                filterTab === tab.id
                  ? "bg-brand-primary/15 border-brand-primary/50"
                  : "bg-dark-elevated border-dark-border/50"
              }`}
            >
              <Text className={`text-xs ${filterTab === tab.id ? "text-brand-primary" : "text-gray-400"}`}>
                {tab.icon}
              </Text>
              <Text className={`text-xs font-semibold ${filterTab === tab.id ? "text-brand-primary" : "text-gray-400"}`}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        key={refreshKey}
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_PADDING, paddingHorizontal: resp.isMobile ? 16 : 24 }}
        style={{ maxWidth: LAYOUT_MAX_WIDTHS.library, alignSelf: "center", width: "100%" }}
        ListEmptyComponent={
          <EmptyState icon="🎧" title="Nenhum projeto ainda" subtitle="Crie seu primeiro projeto acima" />
        }
        renderItem={({ item }) => {
          const isFavorite = isProjectFavorite(item.id)
          return (
          <View className="card-premium mb-2.5">
            <Pressable
              onPress={() => router.push(`/studio/${item.id}`)}
              className="p-4 flex-row items-center active:opacity-80"
            >
              <View className="w-12 h-12 rounded-xl bg-brand-primary/15 items-center justify-center">
                <Text className="text-xl">♫</Text>
              </View>
              <View className="flex-1 ml-3.5">
                <Text className="text-white font-semibold text-base">{item.title}</Text>
                <View className="flex-row items-center gap-2 mt-1.5 flex-wrap">
                  <Text className="text-gray-500 text-xs">
                    {new Date(item.lastSaved).toLocaleDateString()}
                  </Text>
                  {item.bpm && (
                    <Badge text={`${item.bpm} BPM`} variant="default" />
                  )}
                  {item.key && (
                    <Badge text={item.key} variant="default" />
                  )}
                  {item.genre && (
                    <Badge text={item.genre.toUpperCase()} variant="default" />
                  )}
                </View>
              </View>
              <Pressable
                onPress={() => handleToggleFavorite(item.id)}
                className="px-2 py-2 active:opacity-60"
              >
                <Text className={`text-lg ${isFavorite ? "text-brand-primary" : "text-gray-500"}`}>
                  {isFavorite ? "★" : "☆"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/studio/${item.id}`)}
                className="px-3.5 py-2 rounded-lg bg-brand-primary/10 border border-brand-primary/30 active:opacity-70 ml-1"
              >
                <Text className="text-brand-primary text-sm font-semibold">Abrir →</Text>
              </Pressable>
              <ProjectMenu
                projectId={item.id}
                projectTitle={item.title}
                onRefresh={() => setRefreshKey(k => k + 1)}
              />
            </Pressable>
          </View>
          )
        }}
      />

      <NewProject
        visible={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={handleCreate}
        onStartFromScratch={() => {
          const projectId = `proj-${Date.now()}`
          setShowNewProject(false)
          router.push(`/studio/${projectId}?scratch=1`)
        }}
      />
    </View>
  )
}
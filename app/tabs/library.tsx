import { useState, useCallback, useMemo } from "react"
import { View, Text, FlatList, Pressable, Alert } from "react-native"
import { useRouter } from "expo-router"
import { EmptyState, PageHeader, Button, NewProject, ProjectCard } from "../../src/components"
import type { GenreTemplate, Mood } from "../../src/lib/projectTemplates"
import { useResponsive, LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive"
import { listProjectIndex, importProject, loadProject, getFavoriteProjects, isProjectFavorite, toggleProjectFavorite, saveProject } from "../../src/lib/projectStore"
import { SCREEN_BOTTOM_PADDING } from "../../src/lib/constants"
import { OpenBandNative } from "../../src/bridge"
import { fetchCloudProjects } from "../../src/lib/cloudSync"

type FilterTab = "all" | "favorites" | "cloud" | "collabs" | "trash"

const FILTER_TABS: { id: FilterTab; label: string; icon: string }[] = [
  { id: "all", label: "Todos", icon: "♫" },
  { id: "favorites", label: "Favoritos", icon: "★" },
  { id: "cloud", label: "Nuvem", icon: "☁️" },
  { id: "collabs", label: "Colaborações", icon: "👥" },
  { id: "trash", label: "Lixeira", icon: "🗑" },
]

export default function Library() {
  const router = useRouter()
  const resp = useResponsive()
  const [showNewProject, setShowNewProject] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [cloudProjects, setCloudProjects] = useState<any[]>([])

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
    if (filterTab === "cloud") {
      return cloudProjects.map(p => ({
        id: p.id,
        title: p.title,
        lastSaved: p.lastSaved,
        genre: p.genre,
        key: p.key,
        bpm: p.bpm,
        metadata: p,
      }))
    }
    if (filterTab === "favorites") {
      const favorites = getFavoriteProjects();
      return projects.filter(p => favorites.includes(p.id));
    }
    if (filterTab === "collabs") {
      return projects.filter(p => p.metadata?.parentProjectId);
    }
    return projects
  }, [projects, filterTab, cloudProjects])

  const handleTabChange = useCallback(async (tab: FilterTab) => {
    setFilterTab(tab)
    if (tab === "cloud") {
      setIsLoadingCloud(true)
      const { data, error } = await fetchCloudProjects()
      if (data) setCloudProjects(data)
      setIsLoadingCloud(false)
    }
  }, [])

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
    } catch {
      Alert.alert("Erro", "Falha ao importar projeto.")
    }
  }, [router])

  const px = resp.isMobile ? "px-4" : "px-6"

  return (
    <View className="flex-1 bg-dark-bg" style={{ paddingTop: resp.safeTop }}>
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

      <View className="mb-4">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TABS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: resp.isMobile ? 16 : 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleTabChange(item.id)}
              className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full mr-2 ${filterTab === item.id ? "bg-brand-primary" : "bg-dark-surface"}`}
            >
              <Text className="text-white font-semibold text-xs">{item.icon} {item.label}</Text>
            </Pressable>
          )}
        />
      </View>

      <FlatList
        key={resp.numColumns}
        numColumns={resp.numColumns}
        columnWrapperStyle={resp.numColumns > 1 ? { gap: 12 } : undefined}
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
            <ProjectCard
              project={item}
              isFavorite={isFavorite}
              onToggleFavorite={() => handleToggleFavorite(item.id)}
              onOpen={(id) => {
                if (filterTab === "cloud") {
                  saveProject(id, item.metadata)
                }
                router.push(`/studio/${id}`)
              }}
              onRefresh={() => setRefreshKey(k => k + 1)}
            />
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

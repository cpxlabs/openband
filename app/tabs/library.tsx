import { useState, useCallback, useMemo } from "react"
import { View, Text, FlatList, Pressable, Alert } from "react-native"
import { useRouter } from "expo-router"
import { CardRow, CardIcon, EmptyState, PageHeader, Button, NewProject, Badge, ProjectMenu } from "../../src/components"
import type { GenreTemplate, Mood } from "../../src/lib/projectTemplates"
import { useResponsive, LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive"
import { listProjectIndex, importProject, loadProject } from "../../src/lib/projectStore"
import { SCREEN_BOTTOM_PADDING } from "../../src/lib/constants"
import { OpenBandNative } from "../../src/bridge"

type FilterTab = "all" | "favorites" | "collabs" | "trash"

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "Todos os Projetos" },
  { id: "favorites", label: "Favoritos" },
  { id: "collabs", label: "Colaborações" },
  { id: "trash", label: "Lixeira" },
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

  const filtered = useMemo(() => {
    return projects
  }, [projects])

  const handleCreate = useCallback((config: {
    name: string; genre: GenreTemplate; key: string; bpm: number; mood?: Mood
  }) => {
    const projectId = `proj-${Date.now()}`
    const params = new URLSearchParams({
      title: config.name, genre: config.genre.id, key: config.key, bpm: String(config.bpm),
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

      <View className={`${px} mb-3 gap-3`}>
        <Button title="Novo Projeto" icon="+" onPress={() => setShowNewProject(true)} />
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
              className={`px-3 py-1.5 rounded-full border ${
                filterTab === tab.id
                  ? "bg-brand-primary/20 border-brand-primary"
                  : "bg-dark-elevated border-dark-border"
              }`}
            >
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
        renderItem={({ item }) => (
          <CardRow onPress={() => router.push(`/studio/${item.id}`)} className="mb-2 relative">
            <CardIcon icon="♫" />
            <View className="flex-1 ml-4">
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
              onPress={() => router.push(`/studio/${item.id}`)}
              className="px-3 py-2 rounded-lg bg-dark-muted active:opacity-70 mr-1"
            >
              <Text className="text-brand-accent text-sm font-semibold">Abrir →</Text>
            </Pressable>
            <ProjectMenu
              projectId={item.id}
              projectTitle={item.title}
              onRefresh={() => setRefreshKey(k => k + 1)}
            />
          </CardRow>
        )}
      />

      <NewProject visible={showNewProject} onClose={() => setShowNewProject(false)} onCreate={handleCreate} />
    </View>
  )
}

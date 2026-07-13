import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { View, Text, FlatList, Pressable, Alert } from "react-native"
import { useRouter } from "expo-router"
import { EmptyState, PageHeader, Button, NewProject, ProjectCard, Loading } from "../../src/components"
import type { GenreTemplate, Mood } from "../../src/lib/projectTemplates"
import { useResponsive, LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive"
import { listProjectIndex, importProject, loadProject, getFavoriteProjects, toggleProjectFavorite, saveProject, type ProjectData } from "../../src/lib/projectStore"
import { SCREEN_BOTTOM_PADDING } from "../../src/lib/constants"
import { OpenBandNative } from "../../src/bridge"
import { fetchCloudProjects } from "../../src/lib/cloudSync"
import { useTranslation } from "react-i18next"

function decodeUtf8Manual(bytes: Uint8Array): string {
  let result = ""
  let i = 0
  const len = bytes.length
  while (i < len) {
    const byte = bytes[i]
    if (byte < 0x80) {
      result += String.fromCharCode(byte)
      i += 1
    } else if (byte >= 0xc0 && byte < 0xe0) {
      const code = ((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f)
      result += String.fromCharCode(code)
      i += 2
    } else if (byte >= 0xe0 && byte < 0xf0) {
      const code = ((byte & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f)
      result += String.fromCharCode(code)
      i += 3
    } else if (byte >= 0xf0) {
      const code = ((byte & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f)
      result += String.fromCodePoint(code)
      i += 4
    } else {
      i += 1
    }
  }
  return result
}

async function decodeFileText(buffer: ArrayBuffer): Promise<string> {
  if (typeof Blob !== "undefined" && typeof Blob.prototype.text === "function") {
    return new Blob([buffer]).text()
  }
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder("utf-8").decode(buffer)
  }
  return decodeUtf8Manual(new Uint8Array(buffer))
}

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
  const { t } = useTranslation()
  const resp = useResponsive()
  const [showNewProject, setShowNewProject] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [cloudProjects, setCloudProjects] = useState<any[]>([])
  const [loadingCloud, setLoadingCloud] = useState(false)

  const projectIndex = useMemo(() => listProjectIndex(), [refreshKey])

  const metadataCache = useRef<Map<string, ProjectData>>(new Map())

  useEffect(() => {
    metadataCache.current.clear()
  }, [refreshKey])

  const projects = useMemo(() => {
    return Object.entries(projectIndex)
      .map(([id, meta]) => {
        let full = metadataCache.current.get(id)
        if (!full) {
          const loaded = loadProject(id)
          if (loaded) {
            full = loaded
            metadataCache.current.set(id, full)
          }
        }
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

  const favoriteSet = useMemo(() => new Set(getFavoriteProjects()), [refreshKey])

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
      return projects.filter(p => favoriteSet.has(p.id));
    }
    if (filterTab === "collabs") {
      return projects.filter(p => p.metadata?.parentProjectId);
    }
    if (filterTab === "trash") {
      return []
    }
    return projects
  }, [projects, filterTab, cloudProjects, favoriteSet])

  const handleTabChange = useCallback(async (tab: FilterTab) => {
    setFilterTab(tab)
    if (tab === "cloud") {
      setLoadingCloud(true)
      try {
        const { data } = await fetchCloudProjects()
        if (data) setCloudProjects(data)
      } finally {
        setLoadingCloud(false)
      }
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
        filters: [{ name: "OpenBand Project", extensions: ["json", "openband"] }],
      })
      if (!path) return
      const buffer = await OpenBandNative.readFile(path)
      const text = await decodeFileText(buffer)
      let id: string | null
      try {
        id = importProject(text)
      } catch {
        id = null
      }
      if (id) {
        setRefreshKey(k => k + 1)
        router.push(`/studio/${id}`)
      } else {
        Alert.alert("Erro", t("library.invalidFile", "Arquivo de projeto inválido."))
      }
    } catch {
      Alert.alert("Erro", t("library.importError", "Falha ao importar projeto."))
    }
  }, [router, t])

  const px = resp.isMobile ? "px-4" : "px-6"

  return (
    <View className="flex-1 bg-dark-bg" style={{ paddingTop: resp.safeTop }}>
      <View className={`pt-4 tablet:pt-12 ${px}`}>
        <PageHeader title={t("library.title", "Biblioteca")} subtitle={t("library.subtitle", "Seus projetos musicais")} />
      </View>

      <View className={`${px} mb-4 gap-3`}>
        <Pressable
          onPress={() => setShowNewProject(true)}
          className="btn-red shadow-sm shadow-brand-primary/20"
          accessibilityRole="button"
          accessibilityLabel={t("library.newProject", "Novo Projeto")}
        >
          <Text className="text-white font-bold text-base">+</Text>
          <Text className="text-white font-bold text-sm">{t("library.newProject", "Novo Projeto")}</Text>
        </Pressable>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button title={t("library.importProject", "Importar Projeto")} variant="secondary" icon="📂" onPress={handleImportProject} />
          </View>
          <View className="flex-1">
            <Button title={t("library.extractStems", "Separar Stems")} variant="secondary" icon="🔊" onPress={() => router.push("/extractor")} />
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
          renderItem={({ item }) => {
            let label = item.label;
            if (item.id === "all") label = t("library.filterAll", "Todos");
            if (item.id === "favorites") label = t("library.filterFavorites", "Favoritos");
            if (item.id === "cloud") label = t("library.filterCloud", "Nuvem");
            if (item.id === "collabs") label = t("library.filterCollabs", "Colaborações");
            if (item.id === "trash") label = t("library.filterTrash", "Lixeira");

            return (
              <Pressable
                onPress={() => handleTabChange(item.id)}
                className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full mr-2 ${filterTab === item.id ? "bg-brand-primary" : "bg-dark-surface"}`}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: filterTab === item.id }}
              >
                <Text className="text-white font-semibold text-xs">{item.icon} {label}</Text>
              </Pressable>
            )
          }}
        />
      </View>

      {loadingCloud && (
        <Loading message={t("library.loadingCloud", "Carregando projetos da nuvem...")} />
      )}

      <FlatList
        key={resp.numColumns}
        numColumns={resp.numColumns}
        columnWrapperStyle={resp.numColumns > 1 ? { gap: 12 } : undefined}
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_PADDING, paddingHorizontal: resp.isMobile ? 16 : 24 }}
        style={{ maxWidth: LAYOUT_MAX_WIDTHS.library, alignSelf: "center", width: "100%" }}
        ListEmptyComponent={
          filterTab === "trash" ? (
            <EmptyState icon="🗑️" title={t("library.trashEmpty", "Lixeira vazia")} subtitle={t("library.trashEmptySubtitle", "Projetos excluídos aparecerão aqui")} />
          ) : (
            <EmptyState icon="🎧" title={t("library.emptyTitle", "Nenhum projeto ainda")} subtitle={t("library.emptySubtitle", "Crie seu primeiro projeto acima")} />
          )
        }
        renderItem={({ item }) => {
          const isFavorite = favoriteSet.has(item.id)
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

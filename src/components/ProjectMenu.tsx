import { useState, useCallback } from "react"
import { View, Text, Pressable, Alert, Platform } from "react-native"
import { exportProject, loadProject, saveProject } from "../lib/projectStore"
import { OpenBandNative } from "../bridge"

export function ProjectMenu({ projectId, projectTitle, onRefresh }: {
  projectId: string
  projectTitle: string
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)

  const handleDuplicate = useCallback(() => {
    const newId = createDuplicate(projectId, projectTitle)
    if (newId) { onRefresh() }
    setOpen(false)
  }, [projectId, projectTitle, onRefresh])

  const handleRename = useCallback(() => {
    setOpen(false)
    Alert.prompt(
      "Renomear Projeto",
      "Digite o novo nome do projeto:",
      (newTitle) => {
        if (!newTitle || !newTitle.trim()) return
        const project = loadProject(projectId)
        if (!project) return
        project.title = newTitle.trim()
        saveProject(projectId, project)
        onRefresh()
      },
      "plain-text",
      projectTitle,
    )
  }, [projectId, projectTitle, onRefresh])

  const handleDownload = useCallback(async () => {
    const json = exportProject(projectId)
    if (!json) return
    try {
      if (Platform.OS === "web") {
        const a = document.createElement("a")
        a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }))
        a.download = `${projectTitle.replace(/\s+/g, "_")}.openband.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        const path = await OpenBandNative.showSaveDialog({
          defaultPath: `${projectTitle.replace(/\s+/g, "_")}.openband.json`,
        })
        if (path) {
          await OpenBandNative.writeFile(path, json)
        }
      }
    } catch (e) {
      console.warn("Download failed:", e)
      Alert.alert("Erro", "Falha ao baixar projeto.")
    }
    setOpen(false)
  }, [projectId, projectTitle])

  const handleMoveToTrash = useCallback(() => {
    Alert.alert(
      "Mover para Lixeira",
      `O projeto "${projectTitle}" será movido para a lixeira.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Mover", style: "destructive",
          onPress: () => {
            localStorage.removeItem(`openband_project_${projectId}`)
            updateProjectIndex(projectId)
            onRefresh()
            setOpen(false)
          },
        },
      ],
    )
  }, [projectId, projectTitle, onRefresh])

  return (
    <View className="relative">
      <Pressable onPress={() => setOpen(!open)} className="p-2 active:opacity-60">
        <Text className="text-gray-400 text-lg font-bold">⋯</Text>
      </Pressable>
      {open && (
        <>
          <Pressable className="absolute inset-0 z-10" onPress={() => setOpen(false)} />
          <View className="absolute right-0 top-10 z-20 bg-dark-surface border border-dark-border rounded-xl py-1 w-48 shadow-lg">
            <MenuOption icon="📋" label="Duplicar Projeto" onPress={handleDuplicate} />
            <MenuOption icon="✏️" label="Renomear" onPress={handleRename} />
            <MenuOption icon="⬇️" label="Baixar Áudio (.wav)" onPress={handleDownload} />
            <View className="h-px bg-dark-border mx-3" />
            <MenuOption icon="🗑️" label="Mover para Lixeira" onPress={handleMoveToTrash} destructive />
          </View>
        </>
      )}
    </View>
  )
}

function MenuOption({ icon, label, onPress, destructive }: {
  icon: string; label: string; onPress: () => void; destructive?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-2.5 active:bg-dark-muted"
    >
      <Text className="text-base">{icon}</Text>
      <Text className={`text-sm ${destructive ? "text-red-400" : "text-gray-300"}`}>{label}</Text>
    </Pressable>
  )
}

function createDuplicate(id: string, title: string): string | null {
  try {
    const raw = localStorage.getItem(`openband_project_${id}`)
    if (!raw) return null
    const data = JSON.parse(raw)
    const newId = `proj-${Date.now()}`
    data.id = newId
    data.title = `${title} (cópia)`
    data.lastSaved = Date.now()
    localStorage.setItem(`openband_project_${newId}`, JSON.stringify(data))
    const index = JSON.parse(localStorage.getItem("openband_project_index") || "{}")
    index[newId] = { title: data.title, lastSaved: data.lastSaved }
    localStorage.setItem("openband_project_index", JSON.stringify(index))
    return newId
  } catch { return null }
}

function updateProjectIndex(id: string) {
  try {
    const index = JSON.parse(localStorage.getItem("openband_project_index") || "{}")
    delete index[id]
    localStorage.setItem("openband_project_index", JSON.stringify(index))
  } catch {}
}

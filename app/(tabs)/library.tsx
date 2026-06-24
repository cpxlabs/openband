import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CardRow, CardIcon, EmptyState, PageHeader, Button, NewProject } from '../../src/components';
import type { GenreTemplate } from '../../src/lib/projectTemplates';
import { useResponsive, LAYOUT_MAX_WIDTHS } from '../../src/lib/responsive';
import { listProjectIndex, exportProject, importProject } from '../../src/lib/projectStore';
import { OpenBandNative } from '../../src/bridge';

export default function Library() {
  const router = useRouter();
  const resp = useResponsive();
  const [showNewProject, setShowNewProject] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const projectIndex = useMemo(() => listProjectIndex(), [refreshKey]);

  const projects = useMemo(() => {
    return Object.entries(projectIndex)
      .map(([id, meta]) => ({ id, title: meta.title, lastSaved: meta.lastSaved }))
      .sort((a, b) => b.lastSaved - a.lastSaved);
  }, [projectIndex]);

  const handleCreate = useCallback((config: { name: string; genre: GenreTemplate; key: string; bpm: number }) => {
    const projectId = `proj-${Date.now()}`;
    const params = new URLSearchParams({
      title: config.name,
      genre: config.genre.id,
      key: config.key,
      bpm: String(config.bpm),
    });
    setRefreshKey(k => k + 1);
    setShowNewProject(false);
    router.push(`/studio/${projectId}?${params.toString()}`);
  }, [router]);

  const handleShareProject = useCallback(async (id: string, title: string) => {
    const json = exportProject(id);
    if (!json) { Alert.alert('Erro', 'Não foi possível exportar o projeto.'); return; }
    try {
      const path = await OpenBandNative.showSaveDialog({
        defaultPath: `${title.replace(/\s+/g, '_')}.openband.json`,
        filters: [{ name: 'OpenBand Project', extensions: ['json'] }],
      });
      if (path) {
        await OpenBandNative.writeFile(path, json);
        Alert.alert('Exportado', 'Projeto exportado com sucesso.');
      }
    } catch {
      Alert.alert('Erro', 'Falha ao exportar projeto.');
    }
  }, []);

  const handleImportProject = useCallback(async () => {
    try {
      const path = await OpenBandNative.showOpenDialog({
        filters: [{ name: 'OpenBand Project', extensions: ['json'] }],
      });
      if (!path) return;
      const buffer = await OpenBandNative.readFile(path);
      const text = typeof TextDecoder !== 'undefined'
        ? new TextDecoder().decode(buffer)
        : String.fromCharCode(...new Uint8Array(buffer));
      const id = importProject(text);
      if (id) {
        setRefreshKey(k => k + 1);
        router.push(`/studio/${id}`);
      } else {
        Alert.alert('Erro', 'Arquivo de projeto inválido.');
      }
    } catch {
      Alert.alert('Erro', 'Falha ao importar projeto.');
    }
  }, [router]);

  return (
    <View className="flex-1 bg-dark-bg">
      <View className={`${resp.isMobile ? 'pt-4' : 'pt-12'} ${resp.isMobile ? 'px-4' : 'px-6'}`}>
        <PageHeader title="Biblioteca" subtitle="Seus projetos musicais" />
      </View>

      <View className={`${resp.isMobile ? 'mx-4' : 'mx-6'} mb-3 gap-3 ${resp.isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <Button
          title="Novo Projeto"
          icon="+"
          onPress={() => setShowNewProject(true)}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              title="Importar Projeto"
              variant="secondary"
              icon="📂"
              onPress={handleImportProject}
            />
          </View>
          <View className="flex-1">
            <Button
              title="Separar Stems"
              variant="secondary"
              icon="🔊"
              onPress={() => router.push('/extractor')}
            />
          </View>
        </View>
      </View>

      <FlatList
        key={refreshKey}
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: resp.isMobile ? 16 : 24 }}
        style={resp.isDesktop ? { maxWidth: LAYOUT_MAX_WIDTHS.library, alignSelf: 'center', width: '100%' } : undefined}
        ListEmptyComponent={
          <EmptyState
            icon="🎧"
            title="Nenhum projeto ainda"
            subtitle="Crie seu primeiro projeto acima"
          />
        }
        renderItem={({ item }) => (
          <CardRow onPress={() => router.push(`/studio/${item.id}`)} className="mb-2">
            <CardIcon icon="♫" />
            <View className="flex-1 ml-4">
              <Text className="text-white font-semibold text-base">{item.title}</Text>
              <Text className="text-gray-500 text-xs mt-1">
                {new Date(item.lastSaved).toLocaleDateString()}
              </Text>
            </View>
            <Pressable
              onPress={() => handleShareProject(item.id, item.title)}
              className="px-3 py-2 rounded-lg bg-dark-muted active:opacity-70 mr-2"
            >
              <Text className="text-gray-300 text-xs font-semibold">Compartilhar</Text>
            </Pressable>
            <Text className="text-brand-accent text-sm">Abrir →</Text>
          </CardRow>
        )}
      />

      <NewProject
        visible={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}

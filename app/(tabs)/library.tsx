import { useState, useCallback } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { CardRow, CardIcon, EmptyState, PageHeader, Button } from '../../src/components';
import { NewProject } from '../../src/components/NewProject';
import type { GenreTemplate } from '../../src/lib/projectTemplates';
import { useResponsive } from '../../src/lib/responsive';

const mockProjects = [
  { id: 'musica-1', title: 'Meu Hit de Verão', updated: '2 dias atrás', stemCount: 4 },
  { id: 'musica-2', title: 'Ideia de Riff (C# Menor)', updated: '1 semana atrás', stemCount: 2 },
];

export default function Library() {
  const router = useRouter();
  const resp = useResponsive();
  const [showNewProject, setShowNewProject] = useState(false);

  const handleCreate = useCallback((config: { name: string; genre: GenreTemplate; key: string; bpm: number }) => {
    const projectId = `proj-${Date.now()}`;
    const params = new URLSearchParams({
      title: config.name,
      genre: config.genre.id,
      key: config.key,
      bpm: String(config.bpm),
    });
    setShowNewProject(false);
    router.push(`/studio/${projectId}?${params.toString()}`);
  }, [router]);

  return (
    <View className="flex-1 bg-dark-bg pt-12">
      <View className={`${resp.isMobile ? 'px-4' : 'px-6'}`}>
        <PageHeader title="Biblioteca" subtitle="Seus projetos musicais" />
      </View>

      <View className={`${resp.isMobile ? 'mx-4' : 'mx-6'} mb-3 gap-3 ${resp.isDesktop ? 'max-w-md' : ''}`}>
        <Button
          title="Novo Projeto"
          icon="+"
          onPress={() => setShowNewProject(true)}
        />
        <Button
          title="Separar Stems"
          variant="secondary"
          icon="🔊"
          onPress={() => router.push('/extractor')}
        />
      </View>

      <FlatList
        data={mockProjects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: resp.isMobile ? 16 : 24, paddingBottom: 100 }}
        style={resp.isDesktop ? { maxWidth: 768, alignSelf: 'center', width: '100%' } : undefined}
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
              <View className="flex-row items-center gap-3 mt-1">
                <Text className="text-gray-500 text-xs">{item.updated}</Text>
                <Text className="text-gray-600 text-xs">·</Text>
                <Text className="text-gray-500 text-xs">{item.stemCount} stems</Text>
              </View>
            </View>
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

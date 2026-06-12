import { View, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, CardRow, CardIcon, EmptyState, PageHeader, Button } from '../../src/components';

const mockProjects = [
  { id: 'musica-1', title: 'Meu Hit de Verão', updated: '2 dias atrás', stemCount: 4 },
  { id: 'musica-2', title: 'Ideia de Riff (C# Menor)', updated: '1 semana atrás', stemCount: 2 },
];

export default function Library() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-dark-bg pt-12">
      <PageHeader title="Biblioteca" subtitle="Seus projetos musicais" />

      <View className="mx-4 mb-3 gap-3">
        <Button
          title="Novo Projeto"
          icon="+"
          onPress={() => alert('Criando nova sessão no banco...')}
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
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
    </View>
  );
}

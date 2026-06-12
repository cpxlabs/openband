import { View, Text, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';

export default function Library() {
  const router = useRouter();
  const mockProjects = [
    { id: 'musica-1', title: 'Meu Hit de Verão' },
    { id: 'musica-2', title: 'Ideia de Riff (C# Menor)' }
  ];

  return (
    <View className="flex-1 bg-dark-bg pt-12 px-4">
      <Text className="text-white text-3xl font-bold mb-6">Minhas Músicas</Text>

      <Pressable
        className="bg-brand-primary p-4 rounded-xl mb-6 items-center active:opacity-90"
        onPress={() => alert('Criando nova sessão no banco...')}
      >
        <Text className="text-white font-bold text-base">🎙️ Começar Novo Projeto</Text>
      </Pressable>

      <FlatList
        data={mockProjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            className="p-4 mb-2 bg-dark-surface rounded-lg border border-dark-border flex-row justify-between items-center active:border-gray-500"
            onPress={() => router.push(`/studio/${item.id}`)}
          >
            <View>
              <Text className="text-white font-semibold text-lg">{item.title}</Text>
              <Text className="text-gray-500 text-xs">Modificado recentemente</Text>
            </View>
            <Text className="text-brand-accent text-sm">Abrir Estúdio →</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

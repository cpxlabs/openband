import { FlatList, View, Text, Pressable } from 'react-native';

const MOCK_POSTS = [
  { id: '1', title: 'Solo de Guitarra Pesado', author: 'JoaoMúsico99' },
  { id: '2', title: 'Beat Lo-fi Chill 2026', author: 'SintetizadorVirtual' },
];

export default function Feed() {
  return (
    <View className="flex-1 bg-dark-bg pt-12">
      <Text className="text-white text-3xl font-bold px-4 mb-6">Feed Global</Text>
      <FlatList
        data={MOCK_POSTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable className="bg-dark-surface p-5 m-4 mt-0 rounded-xl border border-dark-border active:border-brand-primary">
            <Text className="text-white font-bold text-xl mb-1">{item.title}</Text>
            <Text className="text-gray-400 font-medium">@ {item.author}</Text>
            <View className="mt-4 bg-dark-bg p-3 rounded-lg border border-dark-border items-center">
              <Text className="text-brand-primary font-bold">▶ Ouvir Track</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

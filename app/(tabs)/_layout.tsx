import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#18181c', borderTopWidth: 1, borderTopColor: '#26262b' },
      tabBarActiveTintColor: '#ff3b30',
      tabBarInactiveTintColor: '#888'
    }}>
      <Tabs.Screen name="index" options={{ title: 'Feed' }} />
      <Tabs.Screen name="library" options={{ title: 'Biblioteca' }} />
    </Tabs>
  );
}

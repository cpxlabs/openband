import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Feed: '♫',
    Momentos: '♡',
    Biblioteca: '☰',
    Conta: '●',
    Ajustes: '⚙',
  };
  return (
    <View className="items-center justify-center gap-0.5">
      <Text className={`text-xl ${focused ? 'text-brand-primary' : 'text-gray-500'}`}>
        {icons[label] || '●'}
      </Text>
      <Text className={`text-[10px] font-medium ${focused ? 'text-brand-primary' : 'text-gray-500'}`}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#18181c',
          borderTopWidth: 1,
          borderTopColor: '#26262b',
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#ff3b30',
        tabBarInactiveTintColor: '#888',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Feed" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="moments"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Momentos" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Biblioteca" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Conta" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Ajustes" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

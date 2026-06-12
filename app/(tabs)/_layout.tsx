import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useResponsive } from '../../src/lib/responsive';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const { breakpoint } = useResponsive();
  const icons: Record<string, string> = {
    Feed: '♫',
    Momentos: '♡',
    Biblioteca: '☰',
    Conta: '●',
    Ajustes: '⚙',
  };
  return (
    <View className="items-center justify-center gap-0.5 px-1">
      <Text className={`${breakpoint === 'mobile' ? 'text-xl' : 'text-2xl'} ${focused ? 'text-brand-primary' : 'text-gray-500'}`}>
        {icons[label] || '●'}
      </Text>
      <Text className={`${breakpoint === 'mobile' ? 'text-[10px]' : 'text-xs'} font-medium ${focused ? 'text-brand-primary' : 'text-gray-500'}`}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { breakpoint, isWeb } = useResponsive();
  const isDesktop = breakpoint === 'desktop' && isWeb;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#18181c',
          borderTopWidth: 1,
          borderTopColor: '#26262b',
          height: isDesktop ? 80 : breakpoint === 'tablet' ? 72 : 65,
          paddingBottom: isDesktop ? 12 : 8,
          paddingTop: isDesktop ? 10 : 6,
          paddingHorizontal: isDesktop ? 32 : breakpoint === 'tablet' ? 16 : 0,
          maxWidth: isDesktop ? 600 : undefined,
          alignSelf: isDesktop ? 'center' : undefined,
        } as any,
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

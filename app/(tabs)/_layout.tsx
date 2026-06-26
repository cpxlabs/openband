import { useState } from "react";
import { Tabs, useRouter, useSegments, type Href } from "expo-router";
import { Text, View, Pressable, type ViewStyle } from "react-native";
import { useResponsive } from "../../src/lib/responsive";
import { Sidebar } from "../../src/components";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const { breakpoint } = useResponsive();
  const icons: Record<string, string> = {
    Feed: "♫",
    Momentos: "♡",
    Biblioteca: "☰",
    Conta: "●",
    Ajustes: "⚙",
  };
  return (
    <View className="items-center justify-center gap-0.5 px-1">
      <Text
        className={`${breakpoint === "mobile" ? "text-xl" : "text-2xl"} ${focused ? "text-brand-primary" : "text-gray-500"}`}
      >
        {icons[label] || "●"}
      </Text>
      <Text
        className={`${breakpoint === "mobile" ? "text-[10px]" : "text-xs"} font-medium ${focused ? "text-brand-primary" : "text-gray-500"}`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { breakpoint } = useResponsive();
  const isDesktop = breakpoint === "desktop";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentSegment = segments[segments.length - 1] || "index";
  const routeNameMap: Record<string, string> = {
    index: "Feed",
    moments: "Momentos",
    library: "Biblioteca",
    account: "Conta",
    settings: "Ajustes",
  };
  const pageTitle = routeNameMap[currentSegment] || "OpenBand";

  const handleNavigate = (route: string) => {
    router.navigate(`/(tabs)/${route}` as Href);
    setDrawerOpen(false);
  };

  return (
    <View className="flex-1 bg-dark-bg flex-row">
      {isDesktop && (
        <Sidebar
          currentRoute={currentSegment}
          onNavigate={handleNavigate}
          isOpen
          onClose={() => {}}
          isPersistent
        />
      )}
      <View className="flex-1">
        {!isDesktop && (
          <View className="h-12 bg-dark-surface border-b border-dark-border flex-row items-center px-3 z-20">
            <Pressable
              onPress={() => setDrawerOpen(true)}
              className="w-9 h-9 rounded-lg bg-dark-muted/40 items-center justify-center active:opacity-70"
            >
              <Text className="text-gray-300 text-lg">☰</Text>
            </Pressable>
            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-sm">{pageTitle}</Text>
            </View>
            <View className="w-9" />
          </View>
        )}
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: "#18181c",
              borderTopWidth: 1,
              borderTopColor: "#26262b",
              display: isDesktop ? "none" : "flex",
              height: breakpoint === "tablet" ? 72 : 65,
              paddingBottom: 8,
              paddingTop: 6,
              paddingHorizontal: breakpoint === "tablet" ? 24 : 12,
            } as ViewStyle,
            tabBarActiveTintColor: "#ff3b30",
            tabBarInactiveTintColor: "#888",
            tabBarShowLabel: false,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon label="Feed" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="moments"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon label="Momentos" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="library"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon label="Biblioteca" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="account"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon label="Conta" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon label="Ajustes" focused={focused} />
              ),
            }}
          />
        </Tabs>
      </View>
      {!isDesktop && (
        <Sidebar
          currentRoute={currentSegment}
          onNavigate={handleNavigate}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          isPersistent={false}
        />
      )}
    </View>
  );
}

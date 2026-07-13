import { useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MasteringSuite, Sidebar, MobileDrawer } from "../../src/components";
import { useResponsive } from "../../src/lib/responsive";

export default function MasteringScreen() {
  const router = useRouter();
  const resp = useResponsive();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNavigate = useCallback((route: string) => {
    const target = route === "index" ? "/tabs/feed" : `/tabs/${route}`;
    router.push(target as Parameters<typeof router.push>[0]);
    setDrawerOpen(false);
  }, [router]);

  return (
    <View className="flex-1 bg-dark-bg flex-row" style={{ paddingTop: resp.safeTop }}>
      {resp.isDesktop && (
        <Sidebar
          currentRoute=""
          onNavigate={handleNavigate}
          isOpen
          onClose={() => {}}
          isPersistent
          testID="sidebar"
        />
      )}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={handleNavigate}
      />
      <View className="flex-1">
        {!resp.isDesktop && (
          <View className="bg-dark-surface/95 border-b border-dark-border/50 flex-row items-center px-3 h-12">
            <Pressable
              testID="hamburger-button"
              onPress={() => setDrawerOpen(true)}
              className="w-9 h-9 rounded-lg bg-dark-muted/30 items-center justify-center active:opacity-70"
            >
              <Text className="text-gray-300 text-lg">☰</Text>
            </Pressable>
            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-sm tracking-wide">Masterização</Text>
            </View>
            <View className="w-9" />
          </View>
        )}
        <MasteringSuite onBack={() => router.back()} />
      </View>
    </View>
  );
}

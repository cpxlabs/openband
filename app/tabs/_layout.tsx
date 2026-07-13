import { useState, useCallback, useEffect, useRef } from "react";
import { Tabs, useRouter, useSegments, type Href } from "expo-router";
import { Text, View, Pressable, ScrollView, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsive } from "../../src/lib/responsive";
import { useAuth } from "../../src/context/AuthContext";
import { MiniPlayer, Sidebar, ErrorBoundary } from "../../src/components";

const TIER_LABELS: Record<string, string> = {
  free: "Gratuito",
  tier1_live: "Live",
  tier2_studio: "Studio",
};

function tierLabel(tier: string): string {
  if (!tier) return "Gratuito";
  return TIER_LABELS[tier.toLowerCase()] ?? tier.charAt(0).toUpperCase() + tier.slice(1);
}

const NAV_ITEMS = [
  { key: "index", label: "Feed", icon: "♫" },
  { key: "moments", label: "Momentos", icon: "♡" },
  { key: "library", label: "Biblioteca", icon: "☰" },
  { key: "account", label: "Conta", icon: "●" },
  { key: "settings", label: "Ajustes", icon: "⚙" },
  { key: "explorer", label: "Explorer", icon: "🌍" },
  { key: "virtual-studio", label: "3D Studio", icon: "🏠" },
  { key: "modes", label: "Modos", icon: "✨" },
];

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isDesktop, headerHeight } = useResponsive();
  const { tier } = useAuth();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslate = useRef(new Animated.Value(256)).current;

  useEffect(() => {
    if (drawerOpen) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(panelTranslate, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [drawerOpen, backdropOpacity, panelTranslate]);

  const lastSegment = segments[segments.length - 1] || "index";
  const currentSegment = lastSegment === "tabs" ? "index" : lastSegment;
  const routeNameMap: Record<string, string> = {
    index: "Feed",
    feed: "Feed",
    moments: "Momentos",
    library: "Biblioteca",
    account: "Conta",
    settings: "Ajustes",
    explorer: "Explorer",
    "virtual-studio": "3D Studio",
    modes: "Modos",
  };
  const pageTitle = routeNameMap[currentSegment] || "OpenBand";

  const handleNavigate = useCallback((route: string) => {
    if (route.startsWith("/")) {
      router.push(route as Href);
      setDrawerOpen(false);
      return;
    }
    if (currentSegment === route) {
      setDrawerOpen(false);
      return;
    }
    const target = route === "index" ? "/tabs/feed" : `/tabs/${route}`;
    router.push(target as Href);
    setDrawerOpen(false);
  }, [currentSegment, router]);

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
          <>
            <View
              className="bg-dark-surface/95 border-b border-dark-border/50 flex-row items-center px-3 z-20"
              style={{ height: headerHeight + insets.top, paddingTop: insets.top }}
            >
              <Pressable
                onPress={() => setDrawerOpen(true)}
                className="w-9 h-9 rounded-lg bg-dark-muted/30 items-center justify-center active:opacity-70"
              >
                <Text className="text-gray-300 text-lg">☰</Text>
              </Pressable>
              <View className="flex-1 items-center">
                <Text className="text-white font-bold text-sm tracking-wide">{pageTitle}</Text>
              </View>
              <View className="w-9" />
            </View>

            {drawerOpen && (
              <View className="absolute inset-0 z-50 flex-row" style={{ paddingTop: insets.top }}>
                <Animated.View
                  className="flex-1 bg-black/60"
                  style={{ opacity: backdropOpacity }}
                >
                  <Pressable
                    className="flex-1"
                    onPress={() => setDrawerOpen(false)}
                  />
                </Animated.View>
                <Animated.View
                  className="w-64 bg-[#0d0d11] border-l border-dark-border/40 h-full"
                  style={{ transform: [{ translateX: panelTranslate }] }}
                >
                  <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-border/40">
                    <Text className="text-white font-bold text-base">
                      Open<Text className="text-brand-primary">Band</Text>
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Fechar menu"
                      onPress={() => setDrawerOpen(false)}
                      className="w-7 h-7 rounded-full bg-dark-muted/30 items-center justify-center active:opacity-70"
                    >
                      <Text className="text-gray-400 text-sm">✕</Text>
                    </Pressable>
                  </View>
                  <ScrollView className="flex-1 px-2 pt-2">
                    {NAV_ITEMS.map((item) => {
                      const activeKey = item.key === "index" ? "feed" : item.key;
                      const isActiveRoute = currentSegment === activeKey;
                      return (
                        <Pressable
                          key={item.key}
                          onPress={() => handleNavigate(item.key)}
                          className={`flex-row items-center gap-3 px-3 py-3 rounded-xl mb-0.5 ${
                            isActiveRoute
                              ? "bg-brand-primary/10 border border-brand-primary/20"
                              : "border border-transparent"
                          }`}
                        >
                          <View
                            className={`w-8 h-8 rounded-lg items-center justify-center ${
                              isActiveRoute ? "bg-brand-primary/15" : "bg-dark-muted/20"
                            }`}
                          >
                            <Text className={`text-base ${isActiveRoute ? "text-brand-primary" : "text-gray-400"}`}>
                              {item.icon}
                            </Text>
                          </View>
                          <Text className={`flex-1 text-sm font-semibold ${isActiveRoute ? "text-white" : "text-gray-300"}`}>
                            {item.label}
                          </Text>
                          {isActiveRoute && (
                            <View className="w-2 h-2 rounded-full bg-brand-primary shadow-sm shadow-brand-primary/50" />
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <View className="px-4 py-3 border-t border-dark-border/40">
                    <View className="flex-row items-center gap-2.5 px-3 py-2.5">
                      <View className="w-8 h-8 rounded-full bg-brand-primary/15 items-center justify-center">
                        <Text className="text-brand-primary text-xs font-bold">U</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-400 text-2xs font-medium">Conta</Text>
                        <Text className="text-brand-primary/50 text-3xs">{tierLabel(tier)}</Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              </View>
            )}
          </>
        )}

        <View className="flex-1">
          <ErrorBoundary fallbackTitle="Algo deu errado">
            <Tabs
              screenOptions={{
                headerShown: false,
                tabBarStyle: { display: "none" },
              }}
            >
              <Tabs.Screen name="index" />
              <Tabs.Screen name="feed" />
              <Tabs.Screen name="moments" />
              <Tabs.Screen name="library" />
              <Tabs.Screen name="account" />
              <Tabs.Screen name="settings" />
              <Tabs.Screen name="explorer" />
              <Tabs.Screen name="virtual-studio" />
              <Tabs.Screen name="modes" />
            </Tabs>
          </ErrorBoundary>
          <MiniPlayer />
        </View>
      </View>
    </View>
  );
}

import { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { MasteringSuite, Sidebar } from "../../src/components";
import { useResponsive } from "../../src/lib/responsive";

const NAV_ITEMS = [
  { key: "index", label: "Feed", icon: "♫" },
  { key: "moments", label: "Momentos", icon: "♡" },
  { key: "library", label: "Biblioteca", icon: "☰" },
  { key: "account", label: "Conta", icon: "●" },
  { key: "settings", label: "Ajustes", icon: "⚙" },
];

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
    <View className="flex-1 bg-dark-bg flex-row">
      {resp.isDesktop && (
        <Sidebar
          currentRoute=""
          onNavigate={handleNavigate}
          isOpen
          onClose={() => {}}
          isPersistent
        />
      )}
      {drawerOpen && (
        <View className="absolute inset-0 z-50 flex-row">
          <Pressable className="flex-1 bg-black/60" onPress={() => setDrawerOpen(false)} />
          <View className="w-64 bg-[#0d0d11] border-l border-dark-border/40 h-full">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-border/40">
              <Text className="text-white font-bold text-base">Open<Text className="text-brand-primary">Band</Text></Text>
              <Pressable onPress={() => setDrawerOpen(false)} className="w-7 h-7 rounded-full bg-dark-muted/30 items-center justify-center active:opacity-70">
                <Text className="text-gray-400 text-sm">✕</Text>
              </Pressable>
            </View>
            <ScrollView className="flex-1 px-2 pt-2">
              {NAV_ITEMS.map((item) => (
                <Pressable key={item.key} onPress={() => handleNavigate(item.key)} className="flex-row items-center gap-3 px-3 py-3 rounded-xl mb-0.5 border border-transparent">
                  <View className="w-8 h-8 rounded-lg bg-dark-muted/20 items-center justify-center">
                    <Text className="text-base text-gray-400">{item.icon}</Text>
                  </View>
                  <Text className="flex-1 text-sm font-semibold text-gray-300">{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
      <View className="flex-1">
        {!resp.isDesktop && (
          <View className="bg-dark-surface/95 border-b border-dark-border/50 flex-row items-center px-3 h-12">
            <Pressable
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

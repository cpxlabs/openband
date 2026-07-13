import { useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MasteringSuite, Sidebar, MobileDrawer, EmptyState, Button } from "../../src/components";
import { useResponsive } from "../../src/lib/responsive";
import { getMasteringInput } from "../../src/lib/masteringBridge";

export default function MasteringScreen() {
  const router = useRouter();
  const resp = useResponsive();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasMasteringInput = useState(() => !!getMasteringInput())[0];

  const handleNavigate = useCallback((route: string) => {
    const target = route === "index" ? "/tabs/feed" : `/tabs/${route}`;
    router.push(target as Parameters<typeof router.push>[0]);
    setDrawerOpen(false);
  }, [router]);

  return (
    <View className="flex-1 bg-dark-bg flex-row" style={{ paddingTop: resp.safeTop }}>
      {resp.isDesktop && (
        <Sidebar
          currentRoute="virtual-studio"
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
        {!hasMasteringInput && (
          <View className="px-4 pt-4">
            <EmptyState
              icon="🎚"
              title="Nenhum áudio para masterizar"
              subtitle="Envie um áudio pelo extrator ou faça upload direto na suíte abaixo."
              action={
                <View className="flex-row gap-2 mt-1">
                  <Button
                    title="Ir para o Extrator"
                    variant="primary"
                    onPress={() => router.push("/extractor" as Parameters<typeof router.push>[0])}
                  />
                  <Button title="Voltar" variant="ghost" onPress={() => router.back()} />
                </View>
              }
            />
          </View>
        )}
        <MasteringSuite onBack={() => router.back()} />
      </View>
    </View>
  );
}

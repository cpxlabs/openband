import { useEffect, useMemo } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { PageHeader, Card, CardIcon, Divider } from "../../src/components";
import { useResponsive } from "../../src/lib/responsive";
import {
  CREATIVE_MODES,
  registerCreativeModeCommands,
  unregisterCreativeModeCommands,
} from "../../src/lib/creativeModes";

export default function ModesScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();

  useEffect(() => {
    registerCreativeModeCommands(router);
    return () => unregisterCreativeModeCommands();
  }, [router]);

  const gridStyle = useMemo(
    () => ({
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 12,
    }),
    [],
  );

  return (
    <View className="flex-1 bg-dark-bg">
      <ScrollView className="flex-1 px-4 pt-4 pb-8">
        <PageHeader
          title="Modos Criativos"
          subtitle="Acesse todos os modos de criação do OpenBand"
          testID="modes-header"
        />
        <View className="mt-4">
          <Divider label="Modos" />
        </View>
        <View style={gridStyle} className="mt-4">
          {CREATIVE_MODES.map((mode) => (
            <Pressable
              key={mode.id}
              testID={`mode-tile-${mode.modeId}`}
              accessibilityRole="button"
              accessibilityLabel={mode.label}
              onPress={() => router.push(mode.route as any)}
              style={{ width: isDesktop ? "23%" : "31%" }}
              className="active:opacity-80 active:scale-[0.98]"
            >
              <Card elevated>
                <View className="items-center p-4">
                  <CardIcon icon={mode.icon} />
                  <Text className="text-white font-semibold text-sm mt-3 text-center">
                    {mode.label}
                  </Text>
                  <Text className="text-gray-500 text-2xs mt-1 text-center">
                    {mode.description}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

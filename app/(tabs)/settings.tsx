import { View, Text, ScrollView, Pressable } from "react-native";
import { PageHeader, Avatar, Divider } from "../../src/components";
import { useTheme } from "../../src/context/ThemeContext";
import { useResponsive, LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive";

const MOCK_PROFILE = {
  name: "João Produtor",
  email: "joao@openband.app",
  bio: "Produtor musical independente. Trabalho com gêneros eletrônicos e acústicos. Amante de sintetizadores analógicos.",
  location: "São Paulo, BR",
  memberSince: "Março 2026",
};

export default function Settings() {
  const resp = useResponsive();
  const { theme, setTheme } = useTheme();
  const profile = MOCK_PROFILE;


  return (
    <ScrollView
      className="flex-1 bg-dark-bg"
      contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
      style={
        resp.isDesktop
          ? { maxWidth: LAYOUT_MAX_WIDTHS.settings, alignSelf: "center", width: "100%" }
          : undefined
      }
    >
      <View className="pt-4 tablet:pt-12 px-4 tablet:px-6">
        <PageHeader title="Configurações" subtitle="Personalize sua experiência" />
      </View>

      <View className="px-4 tablet:px-6 gap-6">
        <View className="items-center py-6 gap-3">
          <Avatar name={profile.name} size="lg" />
          <View className="items-center">
            <Text className="text-white text-xl font-bold">{profile.name}</Text>
            <Text className="text-gray-500 text-sm">{profile.email}</Text>
          </View>
          <View className="card-elevated p-4 w-full">
            <Text className="text-gray-400 text-sm text-center leading-relaxed">
              {profile.bio}
            </Text>
          </View>
          <View className="flex-row gap-6 mt-1">
            <View className="items-center">
              <Text className="label mb-1">Local</Text>
              <Text className="text-white text-sm font-medium">{profile.location}</Text>
            </View>
            <View className="w-px bg-dark-border" />
            <View className="items-center">
              <Text className="label mb-1">Membro desde</Text>
              <Text className="text-white text-sm font-medium">{profile.memberSince}</Text>
            </View>
          </View>
        </View>

        <Divider label="Aparência" />

        <View className="flex-row gap-3">
          <Pressable
            onPress={() => setTheme("dark")}
            className={`flex-1 card-elevated p-4 items-center gap-3 border-2 ${
              theme === "dark"
                ? "border-brand-primary bg-brand-primary/10"
                : "border-dark-border"
            }`}
          >
            <View className="w-10 h-10 rounded-xl bg-[#0f0f11] border border-[#26262b] items-center justify-center">
              <Text className="text-white text-sm">☾</Text>
            </View>
            <Text className={`text-sm font-semibold ${theme === "dark" ? "text-brand-primary" : "text-white"}`}>
              Escuro
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTheme("light")}
            className={`flex-1 card-elevated p-4 items-center gap-3 border-2 ${
              theme === "light"
                ? "border-brand-accent bg-brand-accent/10"
                : "border-dark-border"
            }`}
          >
            <View className="w-10 h-10 rounded-xl bg-white border border-gray-200 items-center justify-center">
              <Text className="text-yellow-600 text-sm">☀</Text>
            </View>
            <Text className={`text-sm font-semibold ${theme === "light" ? "text-brand-accent" : "text-white"}`}>
              Claro
            </Text>
          </Pressable>
        </View>

        <Divider label="Informações" />

        <View className="card-elevated">
          <View className="p-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">Versão do App</Text>
            <Text className="text-white text-sm font-medium">1.0.0</Text>
          </View>
          <View className="h-px bg-dark-border" />
          <View className="p-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">Framework</Text>
            <Text className="text-white text-sm font-medium">Expo SDK 56</Text>
          </View>
          <View className="h-px bg-dark-border" />
          <View className="p-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">Engine</Text>
            <Text className="text-white text-sm font-medium">React Native 0.85</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

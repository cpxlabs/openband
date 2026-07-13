import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Platform } from "react-native";
import Constants from "expo-constants";
import { PageHeader, Avatar, Divider, Badge, Button } from "../../src/components";
import { useTheme } from "../../src/context/ThemeContext";
import { useAuth } from "../../src/context/AuthContext";
import { LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive";
import { SCREEN_BOTTOM_PADDING } from "../../src/lib/constants";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../src/lib/i18n";

const DEFAULT_LANGUAGE = "pt-BR";
const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "pt-BR", label: "PT" },
  { code: "es", label: "ES" },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user, tier, tierLimits } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const handleReset = () => {
    const doReset = () => {
      changeLanguage(DEFAULT_LANGUAGE);
      setTheme("dark");
      setNotificationsEnabled(false);
      setResetMessage(t("settings.resetDone", "Preferências restauradas."));
      setTimeout(() => setResetMessage(""), 2500);
    };

    if (Platform.OS === "web" && typeof window !== "undefined" && window.confirm) {
      if (window.confirm(t("settings.resetConfirm", "Restaurar todas as preferências para o padrão?"))) {
        doReset();
      }
    } else {
      Alert.alert(
        t("settings.resetDefaults", "Restaurar padrões"),
        t("settings.resetConfirm", "Restaurar todas as preferências para o padrão?"),
        [
          { text: t("settings.cancel", "Cancelar"), style: "cancel" },
          { text: t("settings.confirm", "Confirmar"), onPress: doReset },
        ]
      );
    }
  };
  const profileName =
    (user?.user_metadata?.name as string) ??
    user?.email?.split("@")[0] ??
    t("settings.guest", "Visitante");

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";


  return (
    <ScrollView
      className="flex-1 bg-dark-bg"
      contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_PADDING, flexGrow: 1 }}
      style={{ maxWidth: LAYOUT_MAX_WIDTHS.settings, alignSelf: "center", width: "100%" }}
    >
      <View className="pt-4 tablet:pt-12 px-4 tablet:px-6">
        <PageHeader title={t("settings.title", "Configurações")} subtitle={t("settings.subtitleCustom", "Personalize sua experiência")} />
      </View>

      <View className="px-4 tablet:px-6 gap-6">
        <View className="items-center py-6 gap-3">
          <Avatar name={profileName} size="lg" />
          <View className="items-center">
            <Text className="text-white text-xl font-bold">{profileName}</Text>
            <Text className="text-gray-500 text-sm">{user?.email ?? ""}</Text>
          </View>
          <View className="card-elevated p-4 w-full">
            <Text className="text-gray-400 text-sm text-center leading-relaxed">
              {t("settings.profileBio", "Produtor musical independente. Trabalho com gêneros eletrônicos e acústicos. Amante de sintetizadores analógicos.")}
            </Text>
          </View>
          <View className="flex-row gap-6 mt-1">
            <View className="items-center">
              <Text className="label mb-1">{t("settings.local", "Local")}</Text>
              <Text className="text-white text-sm font-medium">{t("settings.profileLocation", "São Paulo, BR")}</Text>
            </View>
            <View className="w-px bg-dark-border" />
            <View className="items-center">
              <Text className="label mb-1">{t("settings.memberSinceLabel", "Membro desde")}</Text>
              <Text className="text-white text-sm font-medium">{t("settings.memberSince", "Março 2026")}</Text>
            </View>
          </View>
        </View>

        <Divider label={t("settings.language", "Idioma")} />

        <View className="flex-row gap-2">
          {LANGUAGES.map(({ code, label }) => {
            const isSelected =
              i18n.language === code ||
              (code === "pt-BR" &&
                (i18n.language === "pt" || i18n.language === "pt-BR"));
            return (
              <Pressable
                key={code}
                onPress={() => changeLanguage(code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                className={`flex-1 py-2 px-2 items-center rounded-full border-2 ${
                  isSelected
                    ? "border-brand-primary bg-brand-primary/10"
                    : "border-dark-border"
                }`}
              >
                <Text className={`text-xs font-semibold ${isSelected ? "text-brand-primary" : "text-white"}`}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Divider label={t("settings.appearance", "Aparência")} />

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
              {t("settings.themeDark", "Escuro")}
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
              {t("settings.themeLight", "Claro")}
            </Text>
          </Pressable>
        </View>

        <Divider label={t("settings.info", "Informações")} />

        <View className="card-elevated">
          <View className="p-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("settings.appVersion", "Versão do App")}</Text>
            <Text className="text-white text-sm font-medium">{appVersion}</Text>
          </View>
          <View className="h-px bg-dark-border" />
          <View className="p-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("settings.framework", "Framework")}</Text>
            <Text className="text-white text-sm font-medium">Expo SDK 56</Text>
          </View>
          <View className="h-px bg-dark-border" />
          <View className="p-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("settings.engine", "Engine")}</Text>
            <Text className="text-white text-sm font-medium">React Native 0.85</Text>
          </View>
        </View>

        <Divider label={t("settings.audio", "Áudio")} />

        <View className="card-elevated">
          <View className="p-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("settings.sampleRate", "Sample Rate")}</Text>
            <Text className="text-white text-sm font-medium">44100 Hz</Text>
          </View>
          <View className="h-px bg-dark-border" />
          <View className="p-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("settings.audioDetails", "Detalhes")}</Text>
            <Text className="text-white text-sm font-medium">{t("settings.soon", "Em breve")}</Text>
          </View>
        </View>

        <Divider label={t("settings.plan", "Plano")} />

        <View className="card-elevated">
          <View className="p-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("settings.planCurrent", "Plano atual")}</Text>
            <Badge text={tier} variant="active" />
          </View>
          <View className="h-px bg-dark-border" />
          <View className="p-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("settings.publishFeed", "Publicar no feed")}</Text>
            <Text className="text-white text-sm font-medium">{tierLimits.canPublishToFeed ? t("settings.yes", "Sim") : t("settings.no", "Não")}</Text>
          </View>
          <View className="h-px bg-dark-border" />
          <View className="p-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("settings.createRemixes", "Criar remixes")}</Text>
            <Text className="text-white text-sm font-medium">{tierLimits.canCreateRemixes ? t("settings.yes", "Sim") : t("settings.no", "Não")}</Text>
          </View>
          <View className="h-px bg-dark-border" />
          <View className="p-4 flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("settings.exportVideo", "Exportar vídeo")}</Text>
            <Text className="text-white text-sm font-medium">{tierLimits.canExportVideo ? t("settings.yes", "Sim") : t("settings.no", "Não")}</Text>
          </View>
        </View>

        <Divider label={t("settings.notifications", "Notificações")} />

        <View className="card-elevated">
          <View className="p-4 flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-white text-sm font-medium">{t("settings.pushNotifications", "Notificações push")}</Text>
              <Text className="text-gray-500 text-xs mt-1">{t("settings.pushNotificationsHint", "Receba avisos de novidades e atividade")}</Text>
            </View>
            <Pressable
              onPress={() => setNotificationsEnabled((prev) => !prev)}
              accessibilityRole="switch"
              accessibilityState={{ checked: notificationsEnabled }}
              className={`w-12 h-7 rounded-full items-center justify-center ${
                notificationsEnabled ? "bg-brand-primary" : "bg-dark-border"
              }`}
            >
              <View
                className={`w-5 h-5 rounded-full bg-white absolute ${
                  notificationsEnabled ? "right-1" : "left-1"
                }`}
              />
            </Pressable>
          </View>
        </View>

        <Divider label={t("settings.actions", "Ações")} />

        <View className="card-elevated">
          <View className="p-4">
            <Button
              title={t("settings.resetDefaults", "Restaurar padrões")}
              variant="secondary"
              onPress={handleReset}
            />
            {resetMessage ? (
              <Text className="text-brand-primary text-xs mt-3 text-center">{resetMessage}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

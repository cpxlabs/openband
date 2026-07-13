import { useState, useEffect } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";
import {
  PageHeader,
  Avatar,
  Button,
  TextInput,
  Divider,
  Badge,
} from "../../src/components";
import { LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive";
import { SCREEN_BOTTOM_PADDING } from "../../src/lib/constants";
import { useTranslation } from "react-i18next";

const TIER_LABELS: Record<string, string> = {
  free: "Gratuito",
  live: "Live",
  studio: "Studio",
};

function tierLabel(tier: string): string {
  if (!tier) return "";
  return TIER_LABELS[tier.toLowerCase()] ?? tier.charAt(0).toUpperCase() + tier.slice(1);
}

export default function Account() {
  const { t } = useTranslation();
  const { user, signOut, tier, tierLimits } = useAuth();
  const currentName =
    (user?.user_metadata?.name as string) ?? user?.email?.split("@")[0] ?? "";
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === currentName) return;
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: name.trim() },
      });
      if (error) {
        Alert.alert(t("account.error", "Erro"), error.message);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.warn("Update user failed:", e);
      Alert.alert(t("account.error", "Erro"), t("account.saveError", "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(t("account.signOut", "Sair"), t("account.signOutConfirm", "Tem certeza que deseja sair?"), [
      { text: t("account.cancel", "Cancelar"), style: "cancel" },
      {
        text: t("account.signOut", "Sair"),
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } catch (e) {
            console.error("Sign out failed:", e);
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-dark-bg"
      contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_PADDING, flexGrow: 1 }}
      style={{ maxWidth: LAYOUT_MAX_WIDTHS.account, alignSelf: "center", width: "100%" }}
    >
      <View className="pt-4 tablet:pt-12 px-4 tablet:px-6">
        <PageHeader title={t("account.title", "Conta")} subtitle={t("account.subtitle", "Suas informações de perfil")} />
      </View>

      <View className="px-4 tablet:px-6 gap-6">
        <View className="items-center py-6">
          <Avatar name={currentName} size="lg" />
          <Text className="text-white text-xl font-bold mt-4">{currentName}</Text>
          <Text className="text-gray-500 text-sm mt-1">{user?.email}</Text>
        </View>

        <Divider label={t("account.editProfile", "Editar perfil")} />

        <TextInput
          label={t("account.displayName", "Nome de exibição")}
          placeholder={t("account.namePlaceholder", "Seu nome")}
          onChangeText={setName}
          value={name}
          autoCapitalize="words"
        />
        <Button
          title={t("account.save", "Salvar")}
          onPress={handleSaveName}
          loading={saving}
          disabled={!name.trim() || name.trim() === currentName || saving}
        />
        {saved && (
          <Text className="text-brand-green text-sm font-medium mt-2">
            {t("account.nameUpdated", "Nome atualizado")}
          </Text>
        )}

        <Divider label={t("account.session", "Sessão")} />

        <View className="card-elevated p-4 flex-row justify-between items-center">
          <Text className="text-gray-400 text-sm">{t("account.status", "Status")}</Text>
          <View className="flex-row items-center gap-1.5">
            <View className="w-2 h-2 rounded-full bg-brand-green" />
            <Text className="text-brand-green text-sm font-medium">{t("account.connected", "Conectado")}</Text>
          </View>
        </View>

        <Divider label={t("account.plan", "Plano")} />

        <View className="card-elevated p-4 gap-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("account.planTier", "Plano atual")}</Text>
            <Badge text={tierLabel(tier)} variant="active" />
          </View>
          <View className="h-px bg-dark-border" />
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("account.maxProjects", "Projetos")}</Text>
            <Text className="text-white text-sm font-medium">{tierLimits.maxProjects === Infinity ? "∞" : tierLimits.maxProjects}</Text>
          </View>
          <View className="h-px bg-dark-border" />
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("account.maxTracks", "Trilhas")}</Text>
            <Text className="text-white text-sm font-medium">{tierLimits.maxTracks === Infinity ? "∞" : tierLimits.maxTracks}</Text>
          </View>
          <View className="h-px bg-dark-border" />
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-400 text-sm">{t("account.exportVideo", "Exportar vídeo")}</Text>
            <Text className="text-white text-sm font-medium">{tierLimits.canExportVideo ? t("account.yes", "Sim") : t("account.no", "Não")}</Text>
          </View>
        </View>

        <Button
          title={t("account.signOut", "Sair")}
          onPress={handleSignOut}
          variant="ghost"
          loading={signingOut}
        />
      </View>
    </ScrollView>
  );
}

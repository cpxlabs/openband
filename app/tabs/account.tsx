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
} from "../../src/components";
import { LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive";

export default function Account() {
  const { user, signOut } = useAuth();
  const currentName =
    (user?.user_metadata?.name as string) ?? user?.email?.split("@")[0] ?? "";
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === currentName) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: name.trim() },
      });
      if (error) {
        Alert.alert("Erro", error.message);
      }
    } catch (e) {
      console.warn("Update user failed:", e);
      Alert.alert("Erro", "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
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
      contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
      style={{ maxWidth: LAYOUT_MAX_WIDTHS.account, alignSelf: "center", width: "100%" }}
    >
      <View className="pt-4 tablet:pt-12 px-4 tablet:px-6">
        <PageHeader title="Conta" subtitle="Suas informações de perfil" />
      </View>

      <View className="px-4 tablet:px-6 gap-6">
        <View className="items-center py-6">
          <Avatar name={currentName} size="lg" />
          <Text className="text-white text-xl font-bold mt-4">{currentName}</Text>
          <Text className="text-gray-500 text-sm mt-1">{user?.email}</Text>
        </View>

        <Divider label="Editar perfil" />

        <TextInput
          label="Nome de exibição"
          placeholder="Seu nome"
          onChangeText={setName}
          value={name}
          autoCapitalize="words"
        />
        <Button
          title="Salvar"
          onPress={handleSaveName}
          loading={saving}
          disabled={!name.trim() || name.trim() === currentName}
        />

        <Divider label="Sessão" />

        <View className="card-elevated p-4 flex-row justify-between items-center">
          <Text className="text-gray-400 text-sm">Status</Text>
          <View className="flex-row items-center gap-1.5">
            <View className="w-2 h-2 rounded-full bg-brand-green" />
            <Text className="text-brand-green text-sm font-medium">Conectado</Text>
          </View>
        </View>

        <Button
          title="Sair"
          onPress={handleSignOut}
          variant="ghost"
          loading={signingOut}
        />
      </View>
    </ScrollView>
  );
}

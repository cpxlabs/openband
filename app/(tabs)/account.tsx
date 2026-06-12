import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { PageHeader, Avatar, Button, TextInput, Divider } from '../../src/components';

export default function Account() {
  const { session, user, signOut } = useAuth();
  const currentName = (user?.user_metadata?.name as string) ?? user?.email?.split('@')[0] ?? '';
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === currentName) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
      if (error) {
        Alert.alert('Erro', error.message);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-dark-bg">
      <PageHeader title="Conta" subtitle="Suas informações de perfil" />

      <View className="px-4 gap-6 pb-8">
        <View className="items-center py-6">
          <Avatar name={currentName} size="lg" />
          <Text className="text-white text-xl font-bold mt-4">{currentName}</Text>
          <Text className="text-gray-500 text-sm mt-1">{user?.email}</Text>
        </View>

        <Divider />

        <View className="gap-4">
          <Text className="label px-1">Editar perfil</Text>
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
        </View>

        <Divider />

        <View className="gap-4">
          <Text className="label px-1">Sessão</Text>
          <View className="card p-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-400 text-sm">Status</Text>
              <View className="flex-row items-center gap-1.5">
                <View className="w-2 h-2 rounded-full bg-brand-green" />
                <Text className="text-brand-green text-sm">Conectado</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-4">
          <Button title="Sair" onPress={handleSignOut} variant="ghost" loading={signingOut} />
        </View>
      </View>
    </ScrollView>
  );
}

import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, TextInput } from '../../src/components';
import { supabase } from '../../src/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-12">
          <View className="w-20 h-20 rounded-2xl bg-brand-primary items-center justify-center mb-6 shadow-lg shadow-brand-primary/30">
            <Text className="text-white text-4xl">♫</Text>
          </View>
          <Text className="text-white text-4xl font-bold tracking-tight">OpenBand</Text>
          <Text className="text-gray-500 text-sm mt-2">Entre para criar música</Text>
        </View>

        <View className="gap-4">
          <TextInput
            label="E-mail"
            placeholder="seu@email.com"
            onChangeText={setEmail}
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            label="Senha"
            placeholder="••••••••"
            secureTextEntry
            onChangeText={setPassword}
            value={password}
            autoComplete="current-password"
          />
        </View>

        {error && (
          <View className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          </View>
        )}

        <View className="mt-6">
          <Button title="Entrar" onPress={handleSignIn} loading={loading} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

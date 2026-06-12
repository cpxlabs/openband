import { useState } from 'react';
import { View, TextInput, Pressable, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } catch (e) {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-dark-bg justify-center p-6">
      <Text className="text-white text-3xl font-bold mb-8 text-center text-brand-primary">BandClone</Text>
      <TextInput
        className="bg-dark-surface p-4 rounded-lg text-white mb-4 border border-dark-border focus:border-brand-primary"
        placeholder="E-mail" placeholderTextColor="#666"
        onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
      />
      <TextInput
        className="bg-dark-surface p-4 rounded-lg text-white mb-8 border border-dark-border focus:border-brand-primary"
        placeholder="Senha" placeholderTextColor="#666" secureTextEntry
        onChangeText={setPassword}
      />
      <Pressable
        className="bg-brand-primary p-4 rounded-lg items-center active:opacity-80"
        onPress={handleSignIn} disabled={loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Entrar</Text>}
      </Pressable>
      {error && <Text className="text-red-400 text-sm mt-4 text-center">{error}</Text>}
    </View>
  );
}

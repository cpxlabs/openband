import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Button, TextInput } from "../../src/components";
import { supabase } from "../../src/lib/supabase";
import { useResponsive, LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive";
import { VISITOR_MODE } from "../../src/lib/flags";
import { useAuth } from "../../src/context/AuthContext";

export default function Login() {
  const resp = useResponsive();
  const { signInAsVisitor } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim() || (isSignUp && !name.trim())) {
      setError("Preencha todos os campos.");
      return;
    }
    if (isSignUp) {
      if (password.length < 8) {
        setError("Senha deve ter no mínimo 8 caracteres.");
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setError("Senha deve conter pelo menos uma letra maiúscula.");
        return;
      }
      if (!/[0-9]/.test(password)) {
        setError("Senha deve conter pelo menos um número.");
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) setError(error.message);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) setError(error.message);
      }
    } catch (e) {
      console.error("Login error:", e);
      setError("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark-bg"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        className="flex-1 justify-center px-8 desktop:mx-auto desktop:w-full desktop:px-0"
        style={
          resp.isDesktop
            ? {
                maxWidth: LAYOUT_MAX_WIDTHS.login,
                alignSelf: "center",
                width: "100%",
              }
            : undefined
        }
      >
        <View className="items-center mb-12">
          <View className="w-20 h-20 rounded-2xl bg-brand-primary items-center justify-center mb-6 shadow-lg shadow-brand-primary/30">
            <Text className="text-white text-4xl">♫</Text>
          </View>
          <Text className="text-white text-4xl font-bold tracking-tight">
            OpenBand
          </Text>
          <Text className="text-gray-500 text-sm mt-2">
            {isSignUp ? "Crie sua conta" : "Entre para criar música"}
          </Text>
        </View>

        <View className="gap-4">
          {isSignUp && (
            <TextInput
              label="Nome"
              placeholder="Seu nome"
              onChangeText={setName}
              value={name}
              autoCapitalize="words"
              autoComplete="name"
            />
          )}
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
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
        </View>

        {error && (
          <View className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          </View>
        )}

        <View className="mt-6">
          <Button
            title={isSignUp ? "Criar conta" : "Entrar"}
            onPress={handleSubmit}
            loading={loading}
          />
        </View>

        <Pressable
          onPress={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
          className="mt-4"
        >
          <Text className="text-gray-500 text-sm text-center">
            {isSignUp
              ? "Já tem uma conta? Entre"
              : "Não tem conta? Cadastre-se"}
          </Text>
        </Pressable>

        {VISITOR_MODE && (
          <View className="mt-8 pt-6 border-t border-dark-border">
            <Button
              title="Entrar como Visitante"
              variant="secondary"
              icon="👤"
              onPress={signInAsVisitor}
            />
            <Text className="text-gray-600 text-[10px] text-center mt-2">
              Modo desenvolvimento — perfil Admin
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

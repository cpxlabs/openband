import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Keyboard,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import { Button, TextInput } from "../../src/components";
import { supabase } from "../../src/lib/supabase";
import { LAYOUT_MAX_WIDTHS } from "../../src/lib/responsive";
import { useAuth } from "../../src/context/AuthContext";

export default function Login() {
  const { signInAsVisitor } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [visitorLoading, setVisitorLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim() || (isSignUp && !name.trim())) {
      setError("Preencha todos os campos.");
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError("Digite um e-mail válido.");
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
    Keyboard.dismiss();
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

  const handleForgotPassword = async () => {
    setResetMessage(null);
    if (!email.trim()) {
      setError("Digite seu e-mail para redefinir a senha.");
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError("Digite um e-mail válido.");
      return;
    }
    try {
      if (typeof supabase.auth.resetPasswordForEmail === "function") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim()
        );
        if (error) {
          setError(error.message);
          return;
        }
        setResetMessage("Enviamos um link de redefinição para o seu e-mail.");
      } else {
        Alert.alert(
          "Redefinir senha",
          "Um link de redefinição de senha será enviado para o seu e-mail."
        );
      }
    } catch (e) {
      console.error("Reset password error:", e);
      setError("Ocorreu um erro inesperado. Tente novamente.");
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark-bg"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        className="flex-1 justify-center px-8 desktop:mx-auto desktop:w-full desktop:px-0"
        style={{
          maxWidth: LAYOUT_MAX_WIDTHS.login,
          alignSelf: "center",
          width: "100%",
        }}
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
          <View className="relative">
            <TextInput
              label="Senha"
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              value={password}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="pr-12"
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-[38px] p-1"
              accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
              accessibilityRole="button"
            >
              <Text className="text-gray-400 text-lg">
                {showPassword ? "🙈" : "👁"}
              </Text>
            </Pressable>
          </View>
        </View>

        {!isSignUp && (
          <Pressable
            onPress={handleForgotPassword}
            className="mt-2 items-end"
            accessibilityRole="link"
          >
            <Text className="text-gray-500 text-sm">Esqueceu a senha?</Text>
          </Pressable>
        )}

        {error && (
          <View className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          </View>
        )}

        {resetMessage && (
          <View className="mt-4 bg-brand-primary/10 border border-brand-primary/30 rounded-xl p-3">
            <Text className="text-brand-primary text-sm text-center">
              {resetMessage}
            </Text>
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
            setPassword("");
            setError(null);
            setResetMessage(null);
          }}
          className="mt-4"
        >
          <Text className="text-gray-500 text-sm text-center">
            {isSignUp
              ? "Já tem uma conta? Entre"
              : "Não tem conta? Cadastre-se"}
          </Text>
        </Pressable>

        <View className="mt-8 pt-6 border-t border-dark-border">
          <Button
            title="Entrar como Visitante"
            variant="secondary"
            icon="👤"
            onPress={async () => {
              setVisitorLoading(true);
              try {
                await signInAsVisitor();
              } finally {
                setVisitorLoading(false);
              }
            }}
            loading={visitorLoading}
            disabled={visitorLoading || loading}
          />
          <Text className="text-gray-600 text-[10px] text-center mt-2">
            Explore o app sem criar uma conta
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

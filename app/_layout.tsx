import { Stack, useRouter, useSegments } from "expo-router";
import Head from "expo-router/head";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { ThemeProvider } from "../src/context/ThemeContext";
import { View, Platform } from "react-native";
import { Loading } from "../src/components";

import "../global.css";

function RootLayoutProtected() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace("/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        <Loading message="Carregando..." />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#18181c' },
        headerTintColor: '#fff',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="extractor" options={{ title: 'Separar Stems' }} />
      <Stack.Screen name="studio/[id]" options={{ title: 'Studio', headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "web" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js");
      });
    }
  }, []);

  return (
    <SafeAreaProvider>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/assets/icon-192.png" />
      </Head>
      <View className="flex-1 bg-dark-bg">
        <StatusBar style="light" />
        <ThemeProvider>
          <AuthProvider>
            <RootLayoutProtected />
          </AuthProvider>
        </ThemeProvider>
      </View>
    </SafeAreaProvider>
  );
}

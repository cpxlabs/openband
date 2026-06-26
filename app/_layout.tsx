import { Stack, useRouter, useSegments } from "expo-router";
import Head from "expo-router/head";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { ThemeProvider } from "../src/context/ThemeContext";
import { View, Platform } from "react-native";
import { Loading } from "../src/components";
import { AudioEngineProvider } from "../src/context/AudioEngine";
import { VISITOR_MODE } from "../src/lib/flags";

import "../global.css";

function RootLayoutProtected() {
  const { session, loading, signInAsVisitor } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (VISITOR_MODE && !session && !loading) {
      signInAsVisitor();
    }
  }, [session, loading, signInAsVisitor]);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup && !VISITOR_MODE) {
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
        headerStyle: { backgroundColor: "#18181c" },
        headerTintColor: "#fff",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="extractor" options={{ headerShown: false }} />
      <Stack.Screen name="studio/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="mastering" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      !("serviceWorker" in navigator) ||
      window.electronAPI
    )
      return;
    const register = async () => {
      try {
        const resp = await fetch("/sw.js", { method: "HEAD" });
        if (!resp.ok) return;
        await navigator.serviceWorker.register("/sw.js");
      } catch (e) {
        console.warn("Service worker registration failed:", e);
      }
    };
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return (
    <SafeAreaProvider>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/assets/icon-192.png" />
      </Head>
      <View className="flex-1 bg-dark-bg">
        <StatusBar style="light" />
        <ThemeProvider>
          <AuthProvider>
            <AudioEngineProvider>
              <RootLayoutProtected />
            </AudioEngineProvider>
          </AuthProvider>
        </ThemeProvider>
      </View>
    </SafeAreaProvider>
  );
}

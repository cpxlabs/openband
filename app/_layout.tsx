import { Slot, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { View } from "react-native";
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

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View className="flex-1 bg-dark-bg">
        <StatusBar style="light" />
        <AuthProvider>
          <RootLayoutProtected />
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}

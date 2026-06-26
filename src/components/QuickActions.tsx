import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  route?: string;
  params?: Record<string, string>;
  alert?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "new-project",
    icon: "🚀",
    label: "Novo Projeto Rápido",
    route: "/studio/new",
    params: { title: "Novo Projeto", genre: "pop", bpm: "120", key: "C" },
  },
  { id: "mastering", icon: "🎚️", label: "Masterização Inteligente (AI)", route: "/mastering" },
  { id: "stems", icon: "✂️", label: "Extrator de Stems", route: "/extractor" },
  { id: "arrangement", icon: "🤖", label: "Assistente de Arranjo", alert: "Assistente de Arranjo em breve!" },
  { id: "voice-guide", icon: "🎤", label: "Gravador de Voz Guia", alert: "Gravador de Voz em breve!" },
  { id: "triton", icon: "🎹", label: "Triton Preset Pack", alert: "Triton Preset Pack em breve!" },
  { id: "juno", icon: "🎛️", label: "Juno Synth Rack", alert: "Juno Synth Rack em breve!" },
  { id: "drum-kit", icon: "🥁", label: "Drum Kit Builder", alert: "Drum Kit Builder em breve!" },
  { id: "jam", icon: "🌀", label: "Sincronizar Banda (Live Jam)", alert: "Live Jam em breve!" },
  { id: "trash", icon: "📂", label: "Lixeira de Projetos", alert: "Lixeira de Projetos em breve!" },
];

export function QuickActions({ testID }: { testID?: string }) {
  const router = useRouter();

  const handlePress = (action: QuickAction) => {
    if (action.alert) {
      return;
    }
    if (action.route) {
      const params = action.params
        ? "?" + Object.entries(action.params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
        : "";
      router.push(`${action.route}${params}` as any);
    }
  };

  return (
    <View testID={testID} className="card-elevated flex-1 p-4 gap-2">
      <Text className="label mb-1">Ferramentas Rápidas</Text>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => handlePress(action)}
            className="flex-row items-center gap-3 p-3 rounded-xl bg-dark-elevated hover:bg-dark-muted active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Text className="text-lg">{action.icon}</Text>
            <Text className="text-white text-sm flex-1">{action.label}</Text>
            <Text className="text-gray-600 text-xs">›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { showToast } from "./Toast";

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

interface QuickToolsProps {
  visible: boolean;
  onClose: () => void;
  onNewProject?: () => void;
  testID?: string;
}

export function QuickTools({ visible, onClose, onNewProject, testID }: QuickToolsProps) {
  const router = useRouter();

  if (!visible) return null;

  const handlePress = (action: QuickAction) => {
    if (action.alert) {
      showToast({ message: action.alert, type: "info", icon: "🚧" });
      return;
    }
    if (action.id === "new-project") {
      onNewProject?.();
      onClose();
      return;
    }
    if (action.route) {
      const params = action.params
        ? "?" + Object.entries(action.params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
        : "";
      router.push(`${action.route}${params}` as `/studio/${string}` | `"/mastering"` | `"/extractor"`);
      onClose();
    }
  };

  return (
    <View
      testID={testID}
      className="absolute inset-0 z-50 bg-black/70 items-center justify-center"
    >
      <View className="w-[90%] max-w-md bg-dark-elevated rounded-2xl border border-dark-border overflow-hidden">
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-dark-border">
          <Text className="text-white text-lg font-bold">Ferramentas Rápidas</Text>
          <Pressable
            onPress={onClose}
            className="w-10 h-10 rounded-full bg-dark-surface items-center justify-center pressable-scale"
          >
            <Text className="text-gray-400 text-lg">✕</Text>
          </Pressable>
        </View>

        <ScrollView className="max-h-96 px-3 py-3" showsVerticalScrollIndicator={false}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => handlePress(action)}
              className="flex-row items-center gap-3 p-3.5 rounded-xl bg-dark-surface hover:bg-dark-muted transition-colors duration-normal pressable-scale mb-1.5"
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View className="w-10 h-10 rounded-xl bg-dark-muted/40 items-center justify-center">
                <Text className="text-lg">{action.icon}</Text>
              </View>
              <Text className="text-white text-sm flex-1 font-medium">{action.label}</Text>
              <Text className="text-gray-600 text-lg">›</Text>
            </Pressable>
          ))}
        </ScrollView>

        {QUICK_ACTIONS.some((a) => a.alert) && (
          <View className="px-5 py-3 border-t border-dark-border">
            <Text className="text-gray-600 text-[10px] text-center">
              Algumas ferramentas estão em desenvolvimento
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  route?: string;
  params?: Record<string, string>;
  description?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "new-project",
    icon: "🚀",
    label: "Novo Projeto Rápido",
    description: "Crie um projeto em segundos",
  },
  {
    id: "mastering",
    icon: "🎚",
    label: "Masterização Inteligente",
    route: "/mastering",
    description: "AI-powered mastering",
  },
  {
    id: "stems",
    icon: "✂",
    label: "Extrator de Stems",
    route: "/extractor",
    description: "Separe faixas por IA",
  },
  {
    id: "arrangement",
    icon: "🤖",
    label: "Assistente de Arranjo",
    description: "Em breve",
  },
  {
    id: "drum-kit",
    icon: "🥁",
    label: "Drum Kit Builder",
    description: "Monte sua bateria",
  },
  {
    id: "synth-rack",
    icon: "🎛",
    label: "Synth Rack",
    description: "Sintetizadores",
  },
  {
    id: "library",
    icon: "📂",
    label: "Biblioteca de Samples",
    route: "/tabs/library",
    description: "Seus samples salvos",
  },
];

interface RightSidebarProps {
  visible: boolean;
  onClose: () => void;
  onNewProject?: () => void;
  testID?: string;
}

export function RightSidebar({ visible, onClose, onNewProject, testID }: RightSidebarProps) {
  const router = useRouter();

  if (!visible) return null;

  const handlePress = (action: QuickAction) => {
    if (action.id === "new-project") {
      onNewProject?.();
      onClose();
      return;
    }
    if (action.route) {
      const params = action.params
        ? "?" + Object.entries(action.params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
        : "";
      router.push(`${action.route}${params}` as any);
      onClose();
    }
  };

  return (
    <View
      testID={testID}
      className="w-64 bg-[#0f0f13] border-l border-dark-border/50 h-full"
    >
      <View className="px-4 py-4 border-b border-dark-border/40">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-white text-sm font-bold uppercase tracking-wider">
            Ferramentas
          </Text>
          <Text className="text-gray-500 text-xs">Rápidas</Text>
        </View>
        <Text className="text-gray-600 text-[10px]">
          Ações e atalhos do OpenBand
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-3 py-2"
      >
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => handlePress(action)}
            className="flex-row items-center gap-3 p-3 rounded-xl hover:bg-dark-muted/30 active:opacity-70 mb-1"
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View className="w-9 h-9 rounded-lg bg-dark-muted/20 items-center justify-center">
              <Text className="text-base">{action.icon}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white text-xs font-semibold">
                {action.label}
              </Text>
              <Text className="text-gray-600 text-[9px]">
                {action.description}
              </Text>
            </View>
            <Text className="text-gray-600 text-xs">›</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View className="px-4 py-3 border-t border-dark-border/40">
        <Pressable
          onPress={onClose}
          className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl bg-dark-muted/20 border border-dark-border/40 active:opacity-70"
        >
          <Text className="text-gray-400 text-xs font-semibold">Recolher</Text>
          <Text className="text-gray-500 text-xs">›</Text>
        </Pressable>
      </View>
    </View>
  );
}

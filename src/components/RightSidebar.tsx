import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";

const TOOLS = [
  { key: "new-project", label: "Novo Projeto Rápido", icon: "🚀", route: "/studio/new?title=New%20Project" },
  { key: "mastering", label: "Masterização Inteligente (AI)", icon: "🎚", route: "/mastering" },
  { key: "stems", label: "Extrator de Stems", icon: "✂", route: "/extractor" },
  { key: "arrangement", label: "Assistente de Arranjo", icon: "🤖", route: "/studio/assist?tool=arrangement" },
  { key: "voice", label: "Gravador de Voz Guia", icon: "🎤", route: "/studio/voice?tool=recorder" },
  { key: "triton", label: "Triton Preset Pack", icon: "🎹", route: "/studio/presets?pack=triton" },
  { key: "juno", label: "Juno Synth Rack", icon: "🎹", route: "/studio/presets?pack=juno" },
  { key: "drums", label: "Drum Kit Builder", icon: "🥁", route: "/studio/drums" },
];

interface RightSidebarProps {
  isPersistent: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function RightSidebar({ isPersistent, isOpen, onClose }: RightSidebarProps) {
  const router = useRouter();

  if (!isOpen && !isPersistent) return null;

  const content = (
    <View className={`bg-dark-surface border-l border-dark-border h-full ${isPersistent ? "w-64" : "w-72"}`}>
      <View className="pt-8 pb-4 px-4 border-b border-dark-border">
        <Text className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">
          FERRAMENTAS RÁPIDAS
        </Text>
      </View>

      <ScrollView className="flex-1 py-4 px-2">
        {TOOLS.map((tool) => (
          <Pressable
            key={tool.key}
            onPress={() => {
              router.push(tool.route as any);
              if (!isPersistent) onClose();
            }}
            className="flex-row items-center gap-3 px-3 py-3 mb-1 rounded-xl transition-all duration-normal hover:bg-dark-muted pressable-scale"
          >
            <View className="w-7 h-7 rounded-lg items-center justify-center bg-dark-muted/40">
              <Text className="text-base">{tool.icon}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-gray-300 text-sm font-medium pr-2" numberOfLines={2}>
                {tool.label}
              </Text>
            </View>
            <Text className="text-gray-600 text-xs">›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  if (isPersistent) {
    return content;
  }

  return (
    <View className="absolute inset-0 z-50 flex-row justify-end">
      <Pressable className="flex-1 bg-black/60 animate-fade-in" onPress={onClose} />
      {content}
    </View>
  );
}

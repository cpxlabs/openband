import { View, Text, Pressable, ScrollView } from "react-native";

export interface MobileDrawerItem {
  key: string;
  label: string;
  icon: string;
}

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (routeKey: string) => void;
  items?: MobileDrawerItem[];
}

const DEFAULT_ITEMS: MobileDrawerItem[] = [
  { key: "index", label: "Feed", icon: "♫" },
  { key: "moments", label: "Momentos", icon: "♡" },
  { key: "library", label: "Biblioteca", icon: "☰" },
  { key: "account", label: "Conta", icon: "●" },
  { key: "settings", label: "Ajustes", icon: "⚙" },
];

export function MobileDrawer({
  open,
  onClose,
  onNavigate,
  items = DEFAULT_ITEMS,
}: MobileDrawerProps) {
  if (!open) return null;

  return (
    <View className="absolute inset-0 z-50 flex-row">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar menu"
        className="flex-1 bg-black/60"
        onPress={onClose}
      />
      <View className="w-64 bg-[#0d0d11] border-l border-dark-border/40 h-full">
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-border/40">
          <Text className="text-white font-bold text-base">
            Open<Text className="text-brand-primary">Band</Text>
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar menu"
            onPress={onClose}
            className="w-7 h-7 rounded-full bg-dark-muted/30 items-center justify-center active:opacity-70"
          >
            <Text className="text-gray-400 text-sm">✕</Text>
          </Pressable>
        </View>
        <ScrollView className="flex-1 px-2 pt-2">
          {items.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => onNavigate(item.key)}
              className="flex-row items-center gap-3 px-3 py-3 rounded-xl mb-0.5 border border-transparent"
            >
              <View className="w-8 h-8 rounded-lg bg-dark-muted/20 items-center justify-center">
                <Text className="text-base text-gray-400">{item.icon}</Text>
              </View>
              <Text className="flex-1 text-sm font-semibold text-gray-300">
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

import { View, Text, Pressable, ScrollView, Image } from "react-native";

const NAV_ITEMS = [
  { key: "index", label: "Feed", icon: "♫" },
  { key: "moments", label: "Momentos", icon: "♡" },
  { key: "library", label: "Biblioteca", icon: "☰" },
  { key: "account", label: "Conta", icon: "●" },
  { key: "settings", label: "Ajustes", icon: "⚙" },
];

const LOGO = require("../../assets/logo-dark.png");

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isPersistent: boolean;
  testID?: string;
}

export function Sidebar({
  currentRoute,
  onNavigate,
  isOpen,
  onClose,
  isPersistent,
  testID,
}: SidebarProps) {
  if (!isOpen && !isPersistent) return null;

  const sidebarContent = (
    <View
      testID={testID}
      className={`bg-dark-surface border-r border-dark-border h-full ${isPersistent ? "w-52" : "w-64"}`}
    >
      <View className="items-center justify-center pt-8 pb-6 px-4 border-b border-dark-border select-none">
        <View className="w-16 h-16 items-center justify-center mb-3">
          <Image
            source={LOGO}
            style={{ width: 64, height: 64 }}
            className="object-contain"
            resizeMode="contain"
          />
        </View>

        <View className="items-center">
          <Text className="text-white text-xl font-bold tracking-wide uppercase">
            Open<Text className="text-brand-primary">Band</Text>
          </Text>
          <Text className="text-gray-600 text-[10px] font-mono tracking-widest uppercase mt-0.5">
            v1.0.0
          </Text>
        </View>
      </View>

      <ScrollView className={`flex-1 py-4 ${isPersistent ? "px-2" : "px-3"}`}>
        {NAV_ITEMS.map((item) => {
          const isActive = currentRoute === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                onNavigate(item.key);
                if (!isPersistent) onClose();
              }}
              className={`flex-row items-center gap-3 px-3 py-2.5 rounded-xl mb-1 active:opacity-70 hover:bg-dark-muted ${
                isActive
                  ? "bg-brand-primary/15 border border-brand-primary/30"
                  : "border border-transparent"
              }`}
              accessibilityRole="button"
              aria-current={isActive ? "page" : undefined}
            >
              <View
                className={`w-8 h-8 rounded-lg items-center justify-center ${
                  isActive ? "bg-brand-primary/20" : "bg-dark-muted/40"
                }`}
              >
                <Text
                  className={`text-base ${isActive ? "text-brand-primary" : "text-gray-400"}`}
                >
                  {item.icon}
                </Text>
              </View>
              <Text
                className={`text-sm font-semibold ${isActive ? "text-brand-primary" : "text-gray-300"}`}
              >
                {item.label}
              </Text>
              {isActive && (
                <View className="w-1.5 h-1.5 rounded-full bg-brand-primary ml-auto" />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="border-t border-dark-border px-3 py-3">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-brand-primary/20 items-center justify-center">
            <Text className="text-brand-primary text-xs font-bold">U</Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-400 text-2xs font-medium">
              OpenBand
            </Text>
            <Text className="text-brand-primary/50 text-3xs">v1.0.0</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (isPersistent) {
    return sidebarContent;
  }

  return (
    <View className="absolute inset-0 z-50 flex-row">
      <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      {sidebarContent}
    </View>
  );
}

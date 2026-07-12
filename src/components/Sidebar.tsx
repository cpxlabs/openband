import { useState } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";

const NAV_ITEMS = [
  { key: "feed", label: "Feed", icon: "♫" },
  { key: "moments", label: "Momentos", icon: "♡" },
  { key: "library", label: "Biblioteca", icon: "☰" },
  {
    key: "virtual-studio",
    label: "3D Studio",
    icon: "🏠",
    subItems: [
      { key: "mixer", label: "Mixing Console", icon: "🎛", route: "/studio/:id?title=Mixing%20Console&scratch=1&tab=mixer" },
      { key: "mastering-3d", label: "Mastering Suite", icon: "🎚", route: "/mastering" },
      { key: "timeline", label: "Timeline", icon: "🎬", route: "/studio/:id?title=Timeline&scratch=1&tab=mixes" },
      { key: "piano-roll", label: "Piano Roll", icon: "🎹", route: "/studio/:id?title=Piano%20Roll&scratch=1&tab=chords&tool=piano" },
      { key: "pedalboard", label: "Pedalboard", icon: "🎸", route: "/studio/:id?title=Pedalboard&scratch=1&tab=fx" },
      { key: "synth", label: "Synthesizer", icon: "🎹", route: "/studio/:id?title=Synthesizer&scratch=1&tab=fx&tool=synth" },
    ],
  },
  { key: "explorer", label: "Explorer", icon: "🌍" },
  { key: "modes", label: "Modos", icon: "✨" },
  { key: "account", label: "Conta", icon: "●" },
  { key: "settings", label: "Ajustes", icon: "⚙" },
];

const LOGO = require("../../assets/logo-dark.png");

function buildRoute(route: string) {
  return route.includes(":id") ? route.replace(":id", `proj-${Date.now()}`) : route;
}

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

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(["virtual-studio"])
  );

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sidebarContent = (
    <View
      testID={testID}
      className={`bg-[#0d0d11] border-r border-dark-border/60 h-full ${isPersistent ? "w-56" : "w-64"}`}
    >
      <View className="items-center justify-center pt-6 pb-5 px-4 border-b border-dark-border/40 select-none">
        <View className="w-14 h-14 items-center justify-center mb-2.5">
          <Image
            source={LOGO}
            style={{ width: 56, height: 56 }}
            className="object-contain"
            resizeMode="contain"
          />
        </View>
        <View className="items-center">
          <Text className="text-white text-lg font-bold tracking-wide uppercase">
            Open<Text className="text-brand-primary">Band</Text>
          </Text>
          <View className="bg-brand-primary/10 px-2 py-0.5 rounded-full mt-1">
            <Text className="text-brand-primary/70 text-[9px] font-mono tracking-widest uppercase">
              v1.0.0
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className={`flex-1 ${isPersistent ? "px-2 pt-2" : "px-3 pt-3"}`}>
        {NAV_ITEMS.map((item) => {
          const isActive = currentRoute === item.key;
          const hasSubItems = "subItems" in item && Array.isArray(item.subItems);
          const isExpanded = expandedSections.has(item.key);

          return (
            <View key={item.key} className="mb-0.5">
              <Pressable
                onPress={() => {
                  if (hasSubItems) {
                    toggleSection(item.key);
                  }
                  onNavigate(item.key);
                  if (!isPersistent) onClose();
                }}
                className={`flex-row items-center gap-3 px-3 py-2.5 rounded-xl active:opacity-70 hover:bg-dark-muted/40 ${
                  isActive
                    ? "bg-brand-primary/10 border border-brand-primary/20"
                    : "border border-transparent"
                }`}
                accessibilityRole="button"
                aria-current={isActive ? "page" : undefined}
              >
                <View
                  className={`w-8 h-8 rounded-lg items-center justify-center ${
                    isActive ? "bg-brand-primary/15" : "bg-dark-muted/20"
                  }`}
                >
                  <Text
                    className={`text-base ${isActive ? "text-brand-primary" : "text-gray-400"}`}
                  >
                    {item.icon}
                  </Text>
                </View>
                <Text
                  className={`flex-1 text-sm font-semibold ${isActive ? "text-white" : "text-gray-300"}`}
                >
                  {item.label}
                </Text>
                {hasSubItems && (
                  <Text className="text-gray-500 text-xs">
                    {isExpanded ? "▾" : "▸"}
                  </Text>
                )}
                {!hasSubItems && isActive && (
                  <View className="w-2 h-2 rounded-full bg-brand-primary shadow-sm shadow-brand-primary/50 ml-auto" />
                )}
              </Pressable>
              {hasSubItems && isExpanded && (item as typeof item & { subItems: typeof item.subItems }).subItems && (
                <View className="ml-3 mt-0.5 mb-0.5 border-l border-dark-border/40 pl-2">
                  {((item as typeof item & { subItems: typeof item.subItems }).subItems || []).map((sub) => (
                    <Pressable
                      key={sub.key}
                      onPress={() => {
                        onNavigate(sub.route ? buildRoute(sub.route) : sub.key);
                        if (!isPersistent) onClose();
                      }}
                      className="flex-row items-center gap-2 px-3 py-2 rounded-lg active:opacity-70 hover:bg-dark-muted/30 border border-transparent"
                      accessibilityRole="button"
                    >
                      <View className="w-6 h-6 rounded-md items-center justify-center bg-dark-muted/20">
                        <Text className="text-sm">{sub.icon}</Text>
                      </View>
                      <Text className="flex-1 text-xs font-medium text-gray-300">
                        {sub.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View className="border-t border-dark-border/40 px-3 py-3">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-full bg-brand-primary/15 items-center justify-center">
            <Text className="text-brand-primary text-xs font-bold">U</Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-400 text-2xs font-medium">
              Conta OpenBand
            </Text>
            <Text className="text-brand-primary/50 text-3xs">Premium</Text>
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

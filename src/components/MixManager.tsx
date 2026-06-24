import { useState, useCallback } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import type { MixSnapshot } from "../lib/types";

interface MixManagerProps {
  snapshots: MixSnapshot[];
  activeMixId?: string;
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onCompare: (idA: string, idB: string) => void;
  testID?: string;
}

export function MixManager({
  snapshots,
  activeMixId,
  onSave,
  onLoad,
  onDelete,
  onCompare,
  testID,
}: MixManagerProps) {
  const [expanded, setExpanded] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    onSave(saveName.trim());
    setSaveName("");
    setShowSave(false);
  }, [saveName, onSave]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  return (
    <View testID={testID}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-surface border border-dark-border"
      >
        <Text className="text-gray-400 text-xs font-bold">MIX</Text>
        <View
          className={`flex-1 h-1 rounded-full bg-dark-border overflow-hidden ${activeMixId ? "opacity-100" : "opacity-50"}`}
        >
          {activeMixId && (
            <View
              className="h-full bg-brand-accent rounded-full"
              style={{ width: "60%" }}
            />
          )}
        </View>
        <Text className="text-gray-500 text-xs">
          {snapshots.length > 0 ? `${snapshots.length}` : "0"}
        </Text>
      </Pressable>

      {expanded && (
        <View className="absolute top-full mt-2 right-0 w-80 bg-dark-elevated border border-dark-border rounded-2xl p-4 z-50 shadow-xl">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="label text-gray-300">Gerenciar Mixes</Text>
            {compareIds.length === 2 && (
              <Pressable
                onPress={() => {
                  onCompare(compareIds[0], compareIds[1]);
                  setCompareIds([]);
                }}
                className="px-2 py-1 rounded-lg bg-brand-accent/20"
              >
                <Text className="text-brand-accent text-xs font-bold">
                  Comparar A/B
                </Text>
              </Pressable>
            )}
          </View>

          {showSave ? (
            <View className="flex-row items-center gap-2 mb-3">
              <TextInput
                value={saveName}
                onChangeText={setSaveName}
                placeholder="Nome do mix..."
                placeholderTextColor="#555"
                className="flex-1 h-9 bg-dark-surface border border-dark-border rounded-lg text-white text-xs px-3"
              />
              <Pressable
                onPress={handleSave}
                className="h-9 px-4 rounded-lg bg-brand-accent items-center justify-center active:opacity-70"
              >
                <Text className="text-white text-xs font-bold">Salvar</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowSave(false)}
                className="h-9 w-9 rounded-lg bg-dark-surface items-center justify-center active:opacity-70"
              >
                <Text className="text-gray-400 text-xs">✕</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowSave(true)}
              className="flex-row items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-dark-border bg-dark-surface/50 mb-3 active:opacity-70"
            >
              <Text className="text-brand-accent text-xs font-bold">
                + Salvar Mix Atual
              </Text>
            </Pressable>
          )}

          <ScrollView style={{ maxHeight: 200 }}>
            {snapshots.length === 0 ? (
              <View className="py-6 items-center">
                <Text className="text-gray-600 text-xs">Nenhum mix salvo</Text>
                <Text className="text-gray-700 text-[10px] mt-1">
                  Salve snapshots para comparar
                </Text>
              </View>
            ) : (
              snapshots.map((snap) => {
                const isActive = activeMixId === snap.id;
                const isSelected = compareIds.includes(snap.id);
                return (
                  <View
                    key={snap.id}
                    className={`flex-row items-center gap-2 p-2.5 rounded-xl mb-1.5 border ${
                      isActive
                        ? "bg-brand-accent/10 border-brand-accent/30"
                        : isSelected
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-dark-surface border-dark-border"
                    }`}
                  >
                    <Pressable
                      onPress={() => toggleCompare(snap.id)}
                      className={`w-5 h-5 rounded border items-center justify-center ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-400"
                          : "border-dark-border"
                      }`}
                    >
                      {isSelected && (
                        <Text className="text-white text-[10px]">✓</Text>
                      )}
                    </Pressable>

                    <View className="flex-1">
                      <Text
                        className={`text-xs font-semibold ${isActive ? "text-brand-accent" : "text-gray-200"}`}
                      >
                        {snap.name}
                      </Text>
                      <Text className="text-gray-600 text-[9px]">
                        {(() => {
                          const d = new Date(snap.created);
                          return isNaN(d.getTime())
                            ? "Data desconhecida"
                            : d.toLocaleDateString("pt-BR", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                        })()}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => onLoad(snap.id)}
                      className={`px-3 py-1.5 rounded-lg ${isActive ? "bg-brand-accent" : "bg-dark-muted"} active:opacity-70`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${isActive ? "text-white" : "text-gray-400"}`}
                      >
                        {isActive ? "Ativo" : "Carregar"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onDelete(snap.id)}
                      className="w-6 h-6 rounded items-center justify-center active:opacity-70"
                    >
                      <Text className="text-gray-600 text-xs">✕</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

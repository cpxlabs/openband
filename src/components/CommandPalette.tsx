import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import type { Command } from "../lib/commandRegistry";
import {
  searchCommands,
  executeCommand,
  onRegistryStateChange,
  getShortcutDisplay,
} from "../lib/commandRegistry";

interface CommandPaletteProps {
  visible: boolean;
  onClose: () => void;
}

export function CommandPalette({ visible, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Command[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const unsub = onRegistryStateChange((state) => {
      setIsOpen(state.paletteOpen);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (visible || isOpen) {
      setQuery("");
      setSelectedIndex(0);
      const cmds = searchCommands("");
      setResults(cmds);
    }
  }, [visible, isOpen]);

  useEffect(() => {
    const cmds = searchCommands(query);
    setResults(cmds);
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (cmd: Command) => {
      executeCommand(cmd.id);
      onClose();
    },
    [onClose],
  );

  if (!visible && !isOpen) return null;

  const categories = new Map<string, Command[]>();
  for (const cmd of results) {
    if (!categories.has(cmd.category)) categories.set(cmd.category, []);
    categories.get(cmd.category)!.push(cmd);
  }

  let flatIndex = 0;

  return (
    <View className="absolute inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />

      <View className="bg-neutral-900 border border-neutral-700 rounded-xl w-[90%] max-w-[520px] shadow-2xl overflow-hidden">
        <View className="flex-row items-center px-4 border-b border-neutral-800">
          <Text className="text-neutral-500 text-lg mr-2">⌘</Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search commands..."
            placeholderTextColor="#555"
            className="flex-1 bg-transparent text-white text-sm py-3 outline-none"
            autoFocus
            selectTextOnFocus
          />
          <Text className="text-neutral-600 text-xs">ESC</Text>
        </View>

        <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
          {results.length === 0 ? (
            <View className="p-8 items-center">
              <Text className="text-neutral-500 text-sm">No commands found</Text>
            </View>
          ) : (
            Array.from(categories.entries()).map(([category, cmds]) => (
              <View key={category}>
                <View className="px-4 py-1.5 bg-neutral-800/50">
                  <Text className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">
                    {category}
                  </Text>
                </View>

                {cmds.map((cmd) => {
                  const isSelected = flatIndex === selectedIndex;
                  const idx = flatIndex;
                  flatIndex++;

                  return (
                    <Pressable
                      key={cmd.id}
                      className={`flex-row items-center justify-between px-4 py-2.5 transition-colors duration-normal ${
                        isSelected ? "bg-purple-600/20" : "bg-transparent"
                      }`}
                      onPress={() => handleSelect(cmd)}
                      onPointerEnter={() => setSelectedIndex(idx)}
                    >
                      <View className="flex-1">
                        <Text
                          className={`text-sm ${
                            isSelected ? "text-white" : "text-neutral-300"
                          }`}
                        >
                          {cmd.name}
                        </Text>
                        <Text className="text-[11px] text-neutral-500">
                          {cmd.description}
                        </Text>
                      </View>

                      {cmd.shortcut && (
                        <View className="flex-row gap-1 ml-4">
                          {getShortcutDisplay(cmd.shortcut)
                            .split("+")
                            .map((key, i) => (
                              <Text
                                key={i}
                                className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-700"
                              >
                                {key}
                              </Text>
                            ))}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>

        <View className="flex-row items-center justify-between px-4 py-2 border-t border-neutral-800">
          <Text className="text-[10px] text-neutral-600">
            {results.length} command{results.length !== 1 ? "s" : ""}
          </Text>
          <View className="flex-row gap-2">
            <Text className="text-[10px] text-neutral-600">↑↓ navigate</Text>
            <Text className="text-[10px] text-neutral-600">↵ select</Text>
            <Text className="text-[10px] text-neutral-600">esc close</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

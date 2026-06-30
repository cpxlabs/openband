import { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import type { Branch, BranchDiff } from "../lib/projectBranching";
import {
  createBranch,
  switchBranch,
  getActiveBranch,
  getAllBranches,
  diffBranches,
  mergeBranch,
  deleteBranch,
} from "../lib/projectBranching";

interface BranchManagerProps {
  visible: boolean;
  onClose: () => void;
  onBranchSwitch?: (branchId: string) => void;
  onMerge?: (branchId: string) => void;
}

export function BranchManager({
  visible,
  onClose,
  onBranchSwitch,
  onMerge,
}: BranchManagerProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [newBranchName, setNewBranchName] = useState("");
  const [selectedDiff, setSelectedDiff] = useState<BranchDiff | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const refresh = useCallback(() => {
    setBranches(getAllBranches());
    setActiveBranch(getActiveBranch());
  }, []);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const handleCreate = useCallback(() => {
    const name = newBranchName.trim();
    if (!name) return;
    createBranch(name);
    setNewBranchName("");
    refresh();
  }, [newBranchName, refresh]);

  const handleSwitch = useCallback(
    (id: string) => {
      switchBranch(id);
      refresh();
      onBranchSwitch?.(id);
    },
    [refresh, onBranchSwitch],
  );

  const handleMerge = useCallback(
    (id: string) => {
      mergeBranch(id);
      refresh();
      onMerge?.(id);
    },
    [refresh, onMerge],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteBranch(id);
      refresh();
    },
    [refresh],
  );

  const handleShowDiff = useCallback(
    (id: string) => {
      const diff = diffBranches(id);
      setSelectedDiff(diff);
      setShowDiff(true);
    },
    [],
  );

  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
      <View className="bg-neutral-900 border border-neutral-700 rounded-xl w-[560px] max-h-[80vh]">
        <View className="flex-row items-center justify-between p-4 border-b border-neutral-800">
          <Text className="text-white text-lg font-semibold">Branches</Text>
          <Pressable onPress={onClose}>
            <Text className="text-neutral-400 text-lg">✕</Text>
          </Pressable>
        </View>

        <View className="p-4 flex-row gap-2">
          <TextInput
            value={newBranchName}
            onChangeText={setNewBranchName}
            placeholder="New branch name..."
            placeholderTextColor="#666"
            className="flex-1 bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
          />
          <Pressable
            className="bg-purple-600 rounded-lg px-4 py-2"
            onPress={handleCreate}
          >
            <Text className="text-white text-sm font-medium">Fork</Text>
          </Pressable>
        </View>

        <ScrollView className="px-4 pb-4 max-h-96">
          {branches.map((branch) => {
            const isActive = branch.id === activeBranch?.id;
            const isMain = branch.id === "main";

            return (
              <View
                key={branch.id}
                className={`rounded-lg p-3 mb-2 border ${
                  isActive
                    ? "border-purple-500/50 bg-purple-500/10"
                    : "border-neutral-800 bg-neutral-800/50"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View
                      className={`w-2 h-2 rounded-full ${
                        isActive ? "bg-purple-500" : "bg-neutral-600"
                      }`}
                    />
                    <Text className="text-white font-medium text-sm">
                      {branch.name}
                    </Text>
                    {isMain && (
                      <Text className="text-[10px] bg-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded">
                        MAIN
                      </Text>
                    )}
                    {branch.merged && (
                      <Text className="text-[10px] bg-green-800 text-green-300 px-1.5 py-0.5 rounded">
                        MERGED
                      </Text>
                    )}
                  </View>

                  <View className="flex-row gap-1">
                    {!isActive && !branch.merged && (
                      <>
                        <Pressable
                          className="px-2 py-1 bg-neutral-700 rounded"
                          onPress={() => handleSwitch(branch.id)}
                        >
                          <Text className="text-[10px] text-neutral-300">Switch</Text>
                        </Pressable>
                        <Pressable
                          className="px-2 py-1 bg-neutral-700 rounded"
                          onPress={() => handleShowDiff(branch.id)}
                        >
                          <Text className="text-[10px] text-neutral-300">Diff</Text>
                        </Pressable>
                        <Pressable
                          className="px-2 py-1 bg-purple-700 rounded"
                          onPress={() => handleMerge(branch.id)}
                        >
                          <Text className="text-[10px] text-white">Merge</Text>
                        </Pressable>
                      </>
                    )}
                    {!isMain && !branch.merged && (
                      <Pressable
                        className="px-2 py-1 bg-red-900 rounded"
                        onPress={() => handleDelete(branch.id)}
                      >
                        <Text className="text-[10px] text-red-300">Delete</Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                <Text className="text-[10px] text-neutral-500 mt-1">
                  {branch.state.crdtOperations.length} ops · Created{" "}
                  {new Date(branch.createdAt).toLocaleTimeString()}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {showDiff && selectedDiff && (
          <View className="absolute inset-0 bg-neutral-900 rounded-xl p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-semibold">Branch Diff</Text>
              <Pressable onPress={() => setShowDiff(false)}>
                <Text className="text-neutral-400">✕</Text>
              </Pressable>
            </View>

            <ScrollView className="flex-1">
              {selectedDiff.addedTracks.length > 0 && (
                <View className="mb-3">
                  <Text className="text-green-400 text-xs font-medium mb-1">Added Tracks</Text>
                  {selectedDiff.addedTracks.map((id) => (
                    <Text key={id} className="text-neutral-300 text-sm ml-2">
                      + {id}
                    </Text>
                  ))}
                </View>
              )}

              {selectedDiff.removedTracks.length > 0 && (
                <View className="mb-3">
                  <Text className="text-red-400 text-xs font-medium mb-1">Removed Tracks</Text>
                  {selectedDiff.removedTracks.map((id) => (
                    <Text key={id} className="text-neutral-300 text-sm ml-2">
                      - {id}
                    </Text>
                  ))}
                </View>
              )}

              {selectedDiff.modifiedTracks.length > 0 && (
                <View className="mb-3">
                  <Text className="text-yellow-400 text-xs font-medium mb-1">Modified Tracks</Text>
                  {selectedDiff.modifiedTracks.map((mod) => (
                    <View key={mod.trackId} className="ml-2 mb-1">
                      <Text className="text-neutral-400 text-xs">{mod.trackName}</Text>
                      {mod.changes.map((c) => (
                        <Text key={c.field} className="text-neutral-500 text-[11px] ml-2">
                          {c.field}: {JSON.stringify(c.oldValue)} → {JSON.stringify(c.newValue)}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              {selectedDiff.addedBuses.length > 0 && (
                <View className="mb-3">
                  <Text className="text-green-400 text-xs font-medium mb-1">Added Buses</Text>
                  {selectedDiff.addedBuses.map((id) => (
                    <Text key={id} className="text-neutral-300 text-sm ml-2">+ {id}</Text>
                  ))}
                </View>
              )}

              {selectedDiff.removedBuses.length > 0 && (
                <View className="mb-3">
                  <Text className="text-red-400 text-xs font-medium mb-1">Removed Buses</Text>
                  {selectedDiff.removedBuses.map((id) => (
                    <Text key={id} className="text-neutral-300 text-sm ml-2">- {id}</Text>
                  ))}
                </View>
              )}

              {selectedDiff.modifiedBuses.length > 0 && (
                <View className="mb-3">
                  <Text className="text-yellow-400 text-xs font-medium mb-1">Modified Buses</Text>
                  {selectedDiff.modifiedBuses.map((mod) => (
                    <View key={mod.busId} className="ml-2 mb-1">
                      <Text className="text-neutral-400 text-xs">{mod.busName}</Text>
                      {mod.changes.map((c) => (
                        <Text key={c.field} className="text-neutral-500 text-[11px] ml-2">
                          {c.field}: {JSON.stringify(c.oldValue)} → {JSON.stringify(c.newValue)}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              <Text className="text-neutral-600 text-xs mt-2">
                {selectedDiff.opCount} CRDT operations on branch
              </Text>
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

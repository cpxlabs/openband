import { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import type { ProjectCommit, ProjectHistory } from "../lib/stateAssetSeparation";
import {
  commitState,
  getHistory,
  getProject,
} from "../lib/stateAssetSeparation";
import {
  syncProject,
} from "../lib/supabaseRemote";

interface CommitModalProps {
  visible: boolean;
  onClose: () => void;
  onCommit?: (commit: ProjectCommit) => void;
  onSync?: (result: { pushed: number; conflicts: number }) => void;
}

export function CommitModal({
  visible,
  onClose,
  onCommit,
  onSync,
}: CommitModalProps) {
  const [message, setMessage] = useState("");
  const [author, setAuthor] = useState("local");
  const [committing, setCommitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleCommit = useCallback(async () => {
    if (!message.trim()) return;
    setCommitting(true);
    try {
      const commit = await commitState(message.trim(), author);
      if (commit) {
        onCommit?.(commit);
        setLastResult(`Committed: ${commit.stateHash.slice(0, 12)}`);
        setMessage("");
      }
    } catch (e) {
      setLastResult(`Error: ${(e as Error).message}`);
    } finally {
      setCommitting(false);
    }
  }, [message, author, onCommit]);

  const handleSync = useCallback(async () => {
    const project = getProject();
    if (!project) return;

    setSyncing(true);
    try {
      const result = await syncProject(
        project.manifest.projectId,
        JSON.stringify(project),
        `local-${Date.now()}`,
      );
      setLastResult(
        `Synced: ${result.pushed} pushed, ${result.conflicts} conflicts`,
      );
      onSync?.(result);
    } catch (e) {
      setLastResult(`Sync error: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }, [onSync]);

  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
      <View className="bg-neutral-900 border border-neutral-700 rounded-xl w-[440px]">
        <View className="flex-row items-center justify-between p-4 border-b border-neutral-800">
          <Text className="text-white text-lg font-semibold">Commit & Sync</Text>
          <Pressable onPress={onClose}>
            <Text className="text-neutral-400 text-lg">✕</Text>
          </Pressable>
        </View>

        <View className="p-4">
          <View className="mb-3">
            <Text className="text-[11px] text-neutral-400 mb-1">Commit Message</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your changes..."
              placeholderTextColor="#555"
              className="bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View className="mb-4">
            <Text className="text-[11px] text-neutral-400 mb-1">Author</Text>
            <TextInput
              value={author}
              onChangeText={setAuthor}
              placeholder="Your name"
              placeholderTextColor="#555"
              className="bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
            />
          </View>

          {lastResult && (
            <View className="mb-3 bg-neutral-800 rounded-lg p-2">
              <Text className="text-xs text-neutral-300">{lastResult}</Text>
            </View>
          )}

          <View className="flex-row gap-2">
            <Pressable
              className={`flex-1 py-2.5 rounded-lg ${
                committing || !message.trim()
                  ? "bg-neutral-700"
                  : "bg-purple-600"
              }`}
              onPress={handleCommit}
              disabled={committing || !message.trim()}
            >
              <Text className="text-white text-sm font-medium text-center">
                {committing ? "Committing..." : "Commit"}
              </Text>
            </Pressable>

            <Pressable
              className={`flex-1 py-2.5 rounded-lg ${
                syncing ? "bg-neutral-700" : "bg-blue-600"
              }`}
              onPress={handleSync}
              disabled={syncing}
            >
              <Text className="text-white text-sm font-medium text-center">
                {syncing ? "Syncing..." : "Push to Cloud"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

interface VersionHistoryProps {
  visible: boolean;
  onClose: () => void;
  onRevert?: (commitId: string) => void;
}

export function VersionHistory({
  visible,
  onClose,
  onRevert,
}: VersionHistoryProps) {
  const [history, setHistory] = useState<ProjectHistory | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setHistory(getHistory());
    }
  }, [visible]);

  if (!visible || !history) return null;

  const commits = [...history.commits].reverse();

  return (
    <View className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
      <View className="bg-neutral-900 border border-neutral-700 rounded-xl w-[520px] max-h-[80vh]">
        <View className="flex-row items-center justify-between p-4 border-b border-neutral-800">
          <Text className="text-white text-lg font-semibold">Version History</Text>
          <Pressable onPress={onClose}>
            <Text className="text-neutral-400 text-lg">✕</Text>
          </Pressable>
        </View>

        <ScrollView className="px-4 py-2 max-h-[60vh]">
          {commits.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-neutral-500 text-sm">No commits yet</Text>
              <Text className="text-neutral-600 text-xs mt-1">
                Make changes and commit to see history
              </Text>
            </View>
          ) : (
            commits.map((commit, idx) => {
              const isSelected = selectedCommit === commit.id;
              const isLatest = idx === 0;

              return (
                <View key={commit.id} className="flex-row items-start mb-1">
                  <View className="flex flex-col items-center w-8 mr-2">
                    <View
                      className={`w-3 h-3 rounded-full ${
                        isLatest ? "bg-purple-500" : "bg-neutral-600"
                      }`}
                    />
                    {idx < commits.length - 1 && (
                      <View className="w-px h-8 bg-neutral-700" />
                    )}
                  </View>

                  <Pressable
                    className={`flex-1 rounded-lg p-3 mb-1 ${
                      isSelected
                        ? "bg-purple-600/20 border border-purple-500/30"
                        : "bg-neutral-800/50"
                    }`}
                    onPress={() => setSelectedCommit(isSelected ? null : commit.id)}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-white font-medium" numberOfLines={1}>
                        {commit.message}
                      </Text>
                      <Text className="text-[10px] text-neutral-500 ml-2">
                        {commit.branchName}
                      </Text>
                    </View>

                    <View className="flex-row items-center mt-1 gap-2">
                      <Text className="text-[10px] text-neutral-500">
                        {commit.author}
                      </Text>
                      <Text className="text-[10px] text-neutral-600">
                        {new Date(commit.timestamp).toLocaleString()}
                      </Text>
                      <Text className="text-[10px] text-neutral-600 font-mono">
                        {commit.stateHash.slice(0, 8)}
                      </Text>
                    </View>

                    {isSelected && (
                      <View className="mt-2 pt-2 border-t border-neutral-700">
                        <Text className="text-[10px] text-neutral-500 mb-1">
                          State: {commit.stateRef}
                        </Text>
                        <Text className="text-[10px] text-neutral-500 mb-2">
                          Assets: {commit.assetRefs.length} referenced
                        </Text>
                        <Pressable
                          className="bg-neutral-700 rounded py-1.5 px-3 self-start"
                          onPress={() => onRevert?.(commit.id)}
                        >
                          <Text className="text-[11px] text-white">Revert to this version</Text>
                        </Pressable>
                      </View>
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>

        <View className="px-4 py-2 border-t border-neutral-800">
          <Text className="text-[10px] text-neutral-600">
            {commits.length} commit{commits.length !== 1 ? "s" : ""} ·{" "}
            {Object.keys(history.branches).length} branch
            {Object.keys(history.branches).length !== 1 ? "es" : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

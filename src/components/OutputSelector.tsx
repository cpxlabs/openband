import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Modal, Platform } from "react-native";
import {
  enumerateAudioDevices,
  setAudioOutputDevice,
  getCurrentOutputDevice,
  type AudioDevice,
} from "../lib/hardwareIO";

interface OutputSelectorProps {
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

const SINK_ID_SUPPORTED =
  Platform.OS === "web" && typeof AudioContext !== "undefined";

export function OutputSelector({ visible, onClose, testID }: OutputSelectorProps) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    try {
      const { outputs } = await enumerateAudioDevices();
      setDevices(outputs);
      setCurrentId(getCurrentOutputDevice());
    } catch (e) {
      setError("Failed to enumerate devices");
    } finally {
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) loadDevices();
  }, [visible, loadDevices]);

  const selectDevice = useCallback(async (deviceId: string) => {
    setError(null);
    const ok = await setAudioOutputDevice(deviceId);
    if (ok) {
      setCurrentId(deviceId);
    } else {
      setError(
        SINK_ID_SUPPORTED
          ? "Failed to switch output. Check Chrome permissions."
          : "Output selection requires Chrome 110+ on web.",
      );
    }
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} testID={testID}>
      <View className="flex-1 bg-black/80 justify-center items-center px-2">
        <View className="w-full max-w-sm bg-dark-surface rounded-3xl border border-dark-border p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white text-lg font-bold">Output Device</Text>
            <Pressable onPress={onClose} className="p-1">
              <Text className="text-gray-400 text-sm">✕</Text>
            </Pressable>
          </View>

          {!SINK_ID_SUPPORTED && (
            <View className="mb-3 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <Text className="text-yellow-400 text-[10px]">
                Output selection requires Chrome 110+ on web. On other platforms, the OS handles audio routing.
              </Text>
            </View>
          )}

          {loading && (
            <Text className="text-gray-400 text-xs text-center py-4">Enumerating devices...</Text>
          )}

          {error && (
            <Text className="text-red-400 text-[10px] mb-2">{error}</Text>
          )}

          {!loading && (
            <View>
              <Pressable
                onPress={() => selectDevice("")}
                className={`py-2.5 px-3 rounded-lg mb-1 border ${currentId === "" ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-muted border-dark-border"}`}
              >
                <Text className={`text-xs ${currentId === "" ? "text-brand-accent" : "text-gray-300"}`}>
                  System Default
                </Text>
              </Pressable>

              {devices.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => selectDevice(d.id)}
                  className={`py-2.5 px-3 rounded-lg mb-1 border ${currentId === d.id ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-muted border-dark-border"}`}
                >
                  <Text className={`text-xs ${currentId === d.id ? "text-brand-accent" : "text-gray-300"}`}>
                    {d.label}
                  </Text>
                  <Text className="text-gray-600 text-[8px]">{d.groupId}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            onPress={onClose}
            className="mt-3 py-3 rounded-xl border border-dark-border items-center active:opacity-70"
          >
            <Text className="text-gray-400 text-sm font-semibold">Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

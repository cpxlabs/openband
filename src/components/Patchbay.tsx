import { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import type { AudioDevice, HardwareChannel, PatchRoute } from "../lib/hardwareIO";
import {
  enumerateAudioDevices,
  getHardwareChannels,
  createPatchRoute,
  removePatchRoute,
  getPatchbayState,
} from "../lib/hardwareIO";

interface PatchbayProps {
  visible: boolean;
  onClose: () => void;
  trackIds: string[];
  onRouteCreated?: (route: PatchRoute) => void;
  onRouteRemoved?: (routeId: string) => void;
}

export function Patchbay({
  visible,
  onClose,
  trackIds,
  onRouteCreated,
  onRouteRemoved,
}: PatchbayProps) {
  const [inputs, setInputs] = useState<AudioDevice[]>([]);
  const [routes, setRoutes] = useState<PatchRoute[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [channels, setChannels] = useState<HardwareChannel[]>([]);
  const [dragSource, setDragSource] = useState<HardwareChannel | null>(null);

  const refresh = useCallback(() => {
    const state = getPatchbayState();
    setRoutes(state.routes);
  }, []);

  useEffect(() => {
    if (visible) {
      enumerateAudioDevices().then(({ inputs: ins }) => {
        setInputs(ins);
      });
      refresh();
    }
  }, [visible, refresh]);

  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDevice(deviceId);
    setChannels(getHardwareChannels(deviceId, 16));
  }, []);

  const handleDragStart = useCallback((channel: HardwareChannel) => {
    setDragSource(channel);
  }, []);

  const handleDrop = useCallback(
    (trackId: string) => {
      if (!dragSource) return;
      const route = createPatchRoute(dragSource, trackId);
      setDragSource(null);
      refresh();
      onRouteCreated?.(route);
    },
    [dragSource, refresh, onRouteCreated],
  );

  const handleRemoveRoute = useCallback(
    (routeId: string) => {
      removePatchRoute(routeId);
      refresh();
      onRouteRemoved?.(routeId);
    },
    [refresh, onRouteRemoved],
  );

  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
      <View className="bg-neutral-900 border border-neutral-700 rounded-xl w-[720px] max-h-[80vh]">
        <View className="flex-row items-center justify-between p-4 border-b border-neutral-800">
          <Text className="text-white text-lg font-semibold">Hardware Patchbay</Text>
          <Pressable onPress={onClose}>
            <Text className="text-neutral-400 text-lg">✕</Text>
          </Pressable>
        </View>

        <View className="flex-row flex-1 min-h-[400px]">
          <View className="w-48 border-r border-neutral-800 p-3">
            <Text className="text-[11px] text-neutral-400 uppercase tracking-wider mb-2">
              Inputs
            </Text>
            <ScrollView>
              {inputs.map((device) => (
                <Pressable
                  key={device.id}
                  className={`p-2 rounded mb-1 ${
                    selectedDevice === device.id
                      ? "bg-purple-600/20 border border-purple-500/30"
                      : "bg-neutral-800"
                  }`}
                  onPress={() => selectDevice(device.id)}
                >
                  <Text className="text-xs text-white" numberOfLines={1}>
                    {device.label}
                  </Text>
                  <Text className="text-[10px] text-neutral-500">
                    {device.kind === "audioinput" ? "Input" : "Output"}
                  </Text>
                </Pressable>
              ))}
              {inputs.length === 0 && (
                <Text className="text-xs text-neutral-600">No devices found</Text>
              )}
            </ScrollView>
          </View>

          <View className="w-56 border-r border-neutral-800 p-3">
            <Text className="text-[11px] text-neutral-400 uppercase tracking-wider mb-2">
              Channels
            </Text>
            <ScrollView>
              {channels.map((ch) => (
                <Pressable
                  key={`${ch.deviceId}-${ch.channelIndex}`}
                  className="p-2 rounded bg-neutral-800 mb-1"
                  onPressIn={() => handleDragStart(ch)}
                >
                  <Text className="text-xs text-white">{ch.label}</Text>
                </Pressable>
              ))}
              {channels.length === 0 && (
                <Text className="text-xs text-neutral-600">Select an input device</Text>
              )}
            </ScrollView>
          </View>

          <View className="flex-1 p-3">
            <Text className="text-[11px] text-neutral-400 uppercase tracking-wider mb-2">
              DAW Tracks (drop here)
            </Text>
            <ScrollView>
              {trackIds.map((trackId) => {
                const trackRoutes = routes.filter((r) => r.targetTrackId === trackId);
                return (
                  <Pressable
                    key={trackId}
                    className="p-2 rounded bg-neutral-800 mb-1 border border-neutral-700"
                    onPressIn={() => {}}
                    onPointerUp={() => handleDrop(trackId)}
                  >
                    <Text className="text-xs text-white mb-1">{trackId}</Text>
                    {trackRoutes.length > 0 ? (
                      <View className="flex-row flex-wrap gap-1">
                        {trackRoutes.map((r) => (
                          <Pressable
                            key={r.id}
                            className="flex-row items-center gap-1 bg-purple-900/30 rounded px-1.5 py-0.5"
                            onPress={() => handleRemoveRoute(r.id)}
                          >
                            <Text className="text-[10px] text-purple-300">
                              Ch {r.source.channelIndex + 1}
                            </Text>
                            <Text className="text-[10px] text-neutral-500">✕</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text className="text-[10px] text-neutral-600">No routes</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {dragSource && (
          <View className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-purple-600 rounded-lg px-3 py-1.5">
            <Text className="text-white text-xs font-medium">
              Routing: {dragSource.label} → Drop on a track
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

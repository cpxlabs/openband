import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  icon?: string;
}

type ToastInput = Omit<ToastMessage, "id">;

let _toasts: ToastMessage[] = [];
const listeners = new Set<(toasts: ToastMessage[]) => void>();

export function showToast(input: ToastInput) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  _toasts = [..._toasts, { ...input, id }];
  listeners.forEach((fn) => fn(_toasts));
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id);
    listeners.forEach((fn) => fn(_toasts));
  }, 3500);
}

function useToastState() {
  const [toasts, setToasts] = useState(_toasts);
  useEffect(() => {
    listeners.add(setToasts);
    return () => { listeners.delete(setToasts); };
  }, []);
  return toasts;
}

const dismiss = (id: string) => {
  _toasts = _toasts.filter((t) => t.id !== id);
  listeners.forEach((fn) => fn(_toasts));
};

const iconMap = {
  success: "✓",
  error: "✕",
  info: "i",
};

const typeStyles = {
  success: "border-brand-green/30",
  error: "border-brand-primary/30",
  info: "border-brand-accent/30",
};

const typeIcons = {
  success: "bg-brand-green/20 text-brand-green",
  error: "bg-brand-primary/20 text-brand-primary",
  info: "bg-brand-accent/20 text-brand-accent",
};

export function Toast() {
  const toasts = useToastState();

  if (toasts.length === 0) return null;

  return (
    <View className="absolute top-12 left-0 right-0 z-[100] items-center gap-2 px-4 pointer-events-none">
      {toasts.map((toast) => (
        <View
          key={toast.id}
          className={`toast ${typeStyles[toast.type]} flex-row items-center gap-3 pointer-events-auto animate-slide-up`}
        >
          <View className={`w-6 h-6 rounded-full items-center justify-center ${typeIcons[toast.type]}`}>
            <Text className="text-[10px] font-bold">{iconMap[toast.type]}</Text>
          </View>
          <Text className="text-gray-200 text-sm flex-1">{toast.message}</Text>
          <Pressable
            onPress={() => dismiss(toast.id)}
            className="w-6 h-6 items-center justify-center"
            hitSlop={8}
          >
            <Text className="text-gray-500 text-xs">✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

import { createContext, useCallback, useContext, useState } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";

type ToastType = "info" | "error" | "success";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  opacity: Animated.Value;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ACCENT: Record<ToastType, string> = {
  info: "#007aff",
  error: "#ff3b30",
  success: "#34c759",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Date.now() + Math.random();
      const opacity = new Animated.Value(0);
      setToasts((prev) => [...prev, { id, message, type, opacity }]);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      const dismiss = () => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => remove(id));
      };
      setTimeout(dismiss, 3000);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toasts.length > 0 && (
        <View
          pointerEvents="none"
          style={styles.container}
          accessibilityRole="alert"
        >
          {toasts.map((t) => (
            <Animated.View
              key={t.id}
              style={[styles.toast, { opacity: t.opacity, borderLeftColor: ACCENT[t.type] }]}
            >
              <Text style={styles.text}>{t.message}</Text>
            </Animated.View>
          ))}
        </View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    backgroundColor: "rgb(28 28 34)",
    borderWidth: 1,
    borderColor: "rgb(42 42 50)",
    borderLeftWidth: 4,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 8,
    maxWidth: 360,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

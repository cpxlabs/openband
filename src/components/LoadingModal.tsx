import { useEffect, useRef } from "react";
import { View, Text, Modal, Pressable, ActivityIndicator } from "react-native";
import { ProgressBar } from "./ProgressBar";

interface LoadingModalProps {
  visible: boolean;
  title: string;
  message?: string;
  progress?: number;
  phase?: string;
  subProgress?: number;
  onCancel?: () => void;
  cancelLabel?: string;
  testID?: string;
}

export function LoadingModal({
  visible,
  title,
  message,
  progress,
  phase,
  subProgress,
  onCancel,
  cancelLabel = "Cancelar",
  testID,
}: LoadingModalProps) {
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (progress === 100 && onCancel) {
      autoCloseTimer.current = setTimeout(() => {
        onCancel();
      }, 1500);
    }
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    };
  }, [progress, onCancel]);

  const isIndeterminate = progress === undefined;
  const isComplete = progress === 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel || (() => {})}
      testID={testID}
    >
      <View className="flex-1 bg-black/60 justify-center items-center px-6">
        <View className="w-full max-w-xs bg-dark-surface rounded-3xl border border-dark-border p-6 items-center">
          <Text className="text-white text-base font-bold mb-1">{title}</Text>
          {message && (
            <Text className="text-gray-400 text-xs mb-4 text-center">
              {message}
            </Text>
          )}

          {isIndeterminate ? (
            <ActivityIndicator size="large" color="#5ac8fa" className="mb-4" />
          ) : (
            <>
              <ProgressBar progress={progress} className="mb-2" />
              <Text className="text-gray-400 text-xs font-mono mb-3">
                {progress}%
              </Text>
            </>
          )}

          {phase && (
            <Text className="text-gray-500 text-[10px] mb-1">{phase}</Text>
          )}
          {subProgress !== undefined && (
            <View className="flex-row items-center gap-2 w-full mb-3">
              <View className="flex-1 h-1 bg-dark-border rounded-full overflow-hidden">
                <View
                  className="h-full bg-brand-accent/60 rounded-full"
                  style={{ width: `${subProgress}%` }}
                />
              </View>
              <Text className="text-gray-500 text-[8px] font-mono">
                {subProgress}%
              </Text>
            </View>
          )}

          {onCancel && !isComplete && (
            <Pressable
              onPress={onCancel}
              className="mt-2 px-5 py-2 rounded-lg bg-dark-muted border border-dark-border active:opacity-70"
            >
              <Text className="text-gray-400 text-xs font-medium">
                {cancelLabel}
              </Text>
            </Pressable>
          )}

          {isComplete && (
            <Text className="text-green-400 text-xs font-bold mt-2">
              Concluído
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

import { useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { Card } from "./Card";
import { Button } from "./Button";
import { NewProject } from "./NewProject";
import type { GenreTemplate, Mood } from "../lib/projectTemplates";

export interface OnboardingProjectConfig {
  name: string;
  genre: GenreTemplate;
  key: string;
  bpm: number;
  mood?: Mood;
  numBars?: number;
  timeSignature?: string;
}

interface OnboardingFlowProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (config: OnboardingProjectConfig) => void;
  onStartFromScratch?: () => void;
  onDontShowAgain?: () => void;
  testID?: string;
}

export function OnboardingFlow({
  visible,
  onClose,
  onCreate,
  onStartFromScratch,
  onDontShowAgain,
  testID,
}: OnboardingFlowProps) {
  const [showProject, setShowProject] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = useCallback(() => {
    if (dontShowAgain) onDontShowAgain?.();
    onClose();
  }, [dontShowAgain, onDontShowAgain, onClose]);

  const handleProjectCreate = useCallback(
    (config: OnboardingProjectConfig) => {
      setShowProject(false);
      onCreate(config);
    },
    [onCreate],
  );

  const handleProjectClose = useCallback(() => {
    setShowProject(false);
    onClose();
  }, [onClose]);

  const handleStartFromScratch = useCallback(() => {
    setShowProject(false);
    onStartFromScratch?.();
    onClose();
  }, [onStartFromScratch, onClose]);

  if (!visible) return null;

  if (!showProject) {
    return (
      <View
        testID={testID}
        className="absolute inset-0 z-50 bg-black/80 justify-center items-center px-6"
      >
        <Card className="relative w-full max-w-md p-7 items-center">
          <Pressable
            onPress={handleClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-dark-surface items-center justify-center active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            testID="onboarding-close"
          >
            <Text className="text-gray-400 text-lg">✕</Text>
          </Pressable>
          <Text className="text-4xl mb-3 mt-2">🎸</Text>
          <Text className="text-white text-2xl font-bold text-center mb-2">
            Bem-vindo ao OpenBand
          </Text>
          <Text className="text-gray-300 text-sm text-center mb-6 leading-5">
            Vamos criar seu primeiro projeto em poucos passos. Escolha um gênero,
            um mood e comece a produzir música agora.
          </Text>
          <View className="w-full">
            <Button
              title="Começar"
              onPress={() => setShowProject(true)}
              testID="onboarding-start"
            />
          </View>
          <Pressable
            onPress={() => setDontShowAgain((v) => !v)}
            className="mt-4 flex-row items-center gap-2 self-start"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: dontShowAgain }}
            accessibilityLabel="Não mostrar novamente"
            testID="onboarding-dont-show"
          >
            <View
              className={`w-5 h-5 rounded border items-center justify-center ${
                dontShowAgain
                  ? "bg-brand-primary border-brand-primary"
                  : "border-gray-500"
              }`}
            >
              {dontShowAgain && <Text className="text-white text-xs">✓</Text>}
            </View>
            <Text className="text-gray-300 text-sm">Não mostrar novamente</Text>
          </Pressable>
        </Card>
      </View>
    );
  }

  return (
    <NewProject
      visible={true}
      onClose={handleProjectClose}
      onCreate={handleProjectCreate}
      onStartFromScratch={handleStartFromScratch}
      testID={testID}
    />
  );
}

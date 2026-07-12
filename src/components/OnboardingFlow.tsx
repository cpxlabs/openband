import { useState, useCallback } from "react";
import { View, Text } from "react-native";
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
  testID?: string;
}

export function OnboardingFlow({
  visible,
  onClose,
  onCreate,
  onStartFromScratch,
  testID,
}: OnboardingFlowProps) {
  const [showProject, setShowProject] = useState(false);

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
        <Card className="w-full max-w-md p-7 items-center">
          <Text className="text-4xl mb-3">🎸</Text>
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

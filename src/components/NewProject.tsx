import { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { GENRES, MUSICAL_KEYS, keyLabel, MOODS, TIME_SIGNATURES } from "../lib/projectTemplates";
import type { GenreTemplate, Mood } from "../lib/projectTemplates";

interface NewProjectProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (config: {
    name: string;
    genre: GenreTemplate;
    key: string;
    bpm: number;
    mood?: Mood;
    numBars?: number;
    timeSignature?: string;
  }) => void;
  onStartFromScratch?: () => void;
  initialGenre?: GenreTemplate;
  initialKey?: string;
  initialBpm?: number;
  initialMood?: Mood;
  initialTitle?: string;
  initialTimeSignature?: string;
  testID?: string;
}

export function NewProject({
  visible,
  onClose,
  onCreate,
  onStartFromScratch,
  initialGenre,
  initialKey,
  initialBpm,
  initialMood,
  initialTitle,
  initialTimeSignature,
  testID,
}: NewProjectProps) {
  const [name, setName] = useState(initialTitle ?? "");
  const [selectedGenre, setSelectedGenre] = useState<GenreTemplate>(
    initialGenre ?? GENRES[0],
  );
  const [bpm, setBpm] = useState(
    initialBpm ?? initialGenre?.defaultBpm ?? GENRES[0].defaultBpm,
  );
  const [selectedKey, setSelectedKey] = useState(
    initialKey ?? initialGenre?.defaultKey ?? GENRES[0].defaultKey,
  );
  const [selectedMood, setSelectedMood] = useState<Mood | undefined>(initialMood);
  const [numBars, setNumBars] = useState(8);
  const [timeSignature, setTimeSignature] = useState(
    initialTimeSignature ?? "4/4",
  );
  const [step, setStep] = useState<"genre" | "mood" | "details">(
    initialMood ? "details" : initialGenre ? "mood" : "genre",
  );

  const handleSelectGenre = useCallback((genre: GenreTemplate) => {
    setSelectedGenre(genre);
    setBpm(genre.defaultBpm);
    setSelectedKey(genre.defaultKey);
    setSelectedMood(undefined);
    setStep("mood");
  }, []);

  const handleSelectMood = useCallback((mood: Mood) => {
    setSelectedMood(mood);
    const moodPreset = MOODS.find((m) => m.id === mood);
    if (moodPreset) {
      setBpm(Math.max(1, selectedGenre.defaultBpm + moodPreset.bpmOffset));
    }
    setStep("details");
  }, [selectedGenre.defaultBpm]);

  const handleCreate = useCallback(() => {
    const finalName = name.trim() || `${selectedGenre.name} - Novo Projeto`;
    const config = { name: finalName, genre: selectedGenre, key: selectedKey, bpm, mood: selectedMood, numBars, timeSignature };
    setName("");
    setSelectedGenre(GENRES[0]);
    setBpm(GENRES[0].defaultBpm);
    setSelectedKey(GENRES[0].defaultKey);
    setSelectedMood(undefined);
    setNumBars(8);
    setTimeSignature("4/4");
    setStep("genre");
    onCreate(config);
  }, [name, selectedGenre, selectedKey, bpm, selectedMood, numBars, timeSignature, onCreate]);

  const handleClose = useCallback(() => {
    setName("");
    setSelectedGenre(GENRES[0]);
    setBpm(GENRES[0].defaultBpm);
    setSelectedKey(GENRES[0].defaultKey);
    setSelectedMood(undefined);
    setNumBars(8);
    setTimeSignature("4/4");
    setStep("genre");
    onClose();
  }, [onClose]);

  const handleScratch = useCallback(() => {
    setName("");
    setSelectedGenre(GENRES[0]);
    setBpm(GENRES[0].defaultBpm);
    setSelectedKey(GENRES[0].defaultKey);
    setSelectedMood(undefined);
    setNumBars(8);
    setTimeSignature("4/4");
    setStep("genre");
    onStartFromScratch?.();
    onClose();
  }, [onStartFromScratch, onClose]);

  if (!visible) return null;

  return (
    <View
      testID={testID}
      className="absolute inset-0 z-50 bg-black/70 justify-end"
    >
      <View className="bg-dark-elevated border-t border-dark-border rounded-t-3xl max-h-[85%]">
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-dark-border">
          <Text className="text-white text-lg font-bold">
            {step === "genre"
              ? "Novo Projeto"
              : step === "mood"
                ? "Escolha o mood"
                : selectedGenre.name}
          </Text>
          <Pressable
            onPress={handleClose}
            className="w-8 h-8 rounded-full bg-dark-surface items-center justify-center active:opacity-70"
          >
            <Text className="text-gray-400 text-lg">✕</Text>
          </Pressable>
        </View>

        <ScrollView className="px-5 py-4">
          {step === "genre" ? (
            <View>
              <Text className="text-gray-400 text-xs font-medium mb-3">
                Escolha um gênero
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {GENRES.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => handleSelectGenre(g)}
                    className="w-[48%] p-4 rounded-2xl border bg-dark-surface active:opacity-80"
                    style={{
                      borderColor:
                        selectedGenre.id === g.id ? "#ff3b30" : "#26262b",
                    }}
                  >
                    <Text className="text-2xl mb-1">{g.icon}</Text>
                    <Text className="text-white font-bold text-sm">
                      {g.name}
                    </Text>
                    <Text className="text-gray-500 text-[10px] mt-0.5">
                      {g.description}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-2">
                      <Text className="text-gray-600 font-mono text-[10px]">
                        {g.defaultBpm} BPM
                      </Text>
                      <Text className="text-gray-700 text-[10px]">·</Text>
                      <Text className="text-gray-600 font-mono text-[10px]">
                        {g.defaultKey}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                {onStartFromScratch && (
                  <Pressable
                    onPress={handleScratch}
                    className="w-[48%] p-4 rounded-2xl border border-dark-border bg-dark-surface items-center justify-center active:opacity-80"
                  >
                    <Text className="text-3xl mb-1">▢</Text>
                    <Text className="text-white font-bold text-sm">
                      Começar do Zero
                    </Text>
                    <Text className="text-gray-500 text-[10px] mt-0.5 text-center">
                      Projeto vazio, sem tracks sugeridas
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : step === "mood" ? (
            <View>
              <Text className="text-gray-400 text-xs font-medium mb-1">
                Gênero selecionado
              </Text>
              <View className="flex-row items-center gap-3 bg-dark-surface rounded-xl border border-dark-border p-3 mb-4">
                <Text className="text-2xl">{selectedGenre.icon}</Text>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-sm">
                    {selectedGenre.name}
                  </Text>
                  <Text className="text-gray-500 text-[10px]">
                    {selectedGenre.description}
                  </Text>
                </View>
                <Text className="text-gray-600 text-xs">
                  {selectedGenre.defaultBpm} BPM · {selectedGenre.defaultKey}
                </Text>
              </View>

              <Text className="text-gray-400 text-xs font-medium mb-3">
                Escolha o mood
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {MOODS.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => handleSelectMood(m.id)}
                    className="w-[48%] p-4 rounded-2xl border bg-dark-surface active:opacity-80"
                    style={{
                      borderColor:
                        selectedMood === m.id ? "#ff3b30" : "#26262b",
                    }}
                  >
                    <Text className="text-2xl mb-1">{m.icon}</Text>
                    <Text className="text-white font-bold text-sm">
                      {m.name}
                    </Text>
                    <Text className="text-gray-500 text-[10px] mt-0.5">
                      {m.description}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-2">
                      <Text className="text-gray-600 font-mono text-[10px]">
                        {m.bpmOffset >= 0 ? "+" : ""}
                        {m.bpmOffset} BPM
                      </Text>
                      <Text className="text-gray-700 text-[10px]">·</Text>
                      <Text className="text-gray-600 font-mono text-[10px]">
                        dens. {m.density.toFixed(1)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              <View className="flex-row gap-3 mb-6">
                <Pressable
                  onPress={() => setStep("genre")}
                  className="flex-1 p-4 rounded-xl bg-dark-surface border border-dark-border items-center active:opacity-80"
                >
                  <Text className="text-gray-300 font-bold text-sm">
                    Voltar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setSelectedMood(undefined);
                    setStep("details");
                  }}
                  className="flex-1 p-4 rounded-xl bg-dark-surface border border-dark-border items-center active:opacity-80"
                >
                  <Text className="text-gray-300 text-sm">Pular</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View>
              <Text className="text-gray-400 text-xs font-medium mb-1">
                Nome do Projeto
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={`${selectedGenre.name} - Novo Projeto`}
                placeholderTextColor="#555"
                className="bg-dark-surface border border-dark-border rounded-xl text-white text-sm p-4 mb-4"
              />

              <Text className="text-gray-400 text-xs font-medium mb-2">
                Gênero
              </Text>
              <Pressable
                onPress={() => setStep("genre")}
                className="flex-row items-center gap-3 bg-dark-surface rounded-xl border border-dark-border p-3 mb-4 active:opacity-80"
              >
                <Text className="text-2xl">{selectedGenre.icon}</Text>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-sm">
                    {selectedGenre.name}
                  </Text>
                  <Text className="text-gray-500 text-[10px]">
                    {selectedGenre.description}
                  </Text>
                </View>
                <Text className="text-gray-600 text-xs">Alterar →</Text>
              </Pressable>

              <Text className="text-gray-400 text-xs font-medium mb-2">
                BPM — {bpm}
              </Text>
              <View className="flex-row items-center gap-3 mb-4">
                <Pressable
                  onPress={() =>
                    setBpm(Math.max(selectedGenre.bpmRange[0], bpm - 5))
                  }
                  className="w-10 h-10 rounded-xl bg-dark-surface border border-dark-border items-center justify-center active:opacity-70"
                >
                  <Text className="text-gray-300 text-lg">−</Text>
                </Pressable>
                <View className="flex-1 h-2 bg-dark-border rounded-full overflow-hidden relative justify-center">
                  <View
                    className="h-full bg-brand-accent rounded-full"
                    style={{
                      width: `${((bpm - selectedGenre.bpmRange[0]) / (selectedGenre.bpmRange[1] - selectedGenre.bpmRange[0])) * 100}%`,
                    }}
                  />
                  <View
                    className="absolute w-4 h-4 rounded-full bg-white shadow-sm"
                    style={{
                      left: `${((bpm - selectedGenre.bpmRange[0]) / (selectedGenre.bpmRange[1] - selectedGenre.bpmRange[0])) * 100}%`,
                      marginLeft: -8,
                    }}
                  />
                </View>
                <Pressable
                  onPress={() =>
                    setBpm(Math.min(selectedGenre.bpmRange[1], bpm + 5))
                  }
                  className="w-10 h-10 rounded-xl bg-dark-surface border border-dark-border items-center justify-center active:opacity-70"
                >
                  <Text className="text-gray-300 text-lg">+</Text>
                </Pressable>
              </View>

              <Text className="text-gray-400 text-xs font-medium mb-2">
                Compassos
              </Text>
              <View className="flex-row items-center gap-3 mb-4">
                <Pressable
                  onPress={() => setNumBars(Math.max(1, numBars - 2))}
                  className="w-10 h-10 rounded-xl bg-dark-surface border border-dark-border items-center justify-center active:opacity-70"
                >
                  <Text className="text-gray-300 text-lg">−</Text>
                </Pressable>
                <View className="flex-1 items-center">
                  <Text className="text-white font-mono text-base font-bold">
                    {numBars}
                  </Text>
                  <Text className="text-gray-600 text-[10px]">compassos</Text>
                </View>
                <Pressable
                  onPress={() => setNumBars(Math.min(64, numBars + 2))}
                  className="w-10 h-10 rounded-xl bg-dark-surface border border-dark-border items-center justify-center active:opacity-70"
                >
                  <Text className="text-gray-300 text-lg">+</Text>
                </Pressable>
              </View>

              <Text className="text-gray-400 text-xs font-medium mb-2">
                Fórmula de Compasso
              </Text>
              <View className="flex-row flex-wrap gap-1.5 mb-4">
                {TIME_SIGNATURES.map((ts) => (
                  <Pressable
                    key={ts}
                    onPress={() => setTimeSignature(ts)}
                    className={`px-3 py-2 rounded-lg border ${
                      timeSignature === ts
                        ? "bg-brand-accent/20 border-brand-accent"
                        : "bg-dark-surface border-dark-border"
                    }`}
                  >
                    <Text
                      className={`font-mono text-sm font-bold ${
                        timeSignature === ts
                          ? "text-brand-accent"
                          : "text-gray-400"
                      }`}
                    >
                      {ts}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="text-gray-400 text-xs font-medium mb-2">
                Tom
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                <View
                  className="flex-row flex-wrap gap-1.5"
                  style={{ width: 360 }}
                >
                  {MUSICAL_KEYS.map((k) => (
                    <Pressable
                      key={k}
                      onPress={() => setSelectedKey(k)}
                      className={`px-3 py-2 rounded-lg border ${
                        selectedKey === k
                          ? "bg-brand-accent/20 border-brand-accent"
                          : "bg-dark-surface border-dark-border"
                      }`}
                    >
                      <Text
                        className={`font-mono text-sm font-bold ${
                          selectedKey === k
                            ? "text-brand-accent"
                            : "text-gray-400"
                        }`}
                      >
                        {keyLabel(k)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text className="text-gray-400 text-xs font-medium mb-2">
                Tracks Sugeridas
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {selectedGenre.suggestedTracks.map((t, i) => (
                  <View
                    key={i}
                    className="flex-row items-center gap-1.5 bg-dark-surface rounded-lg border border-dark-border px-3 py-2"
                  >
                    <View className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                    <Text className="text-gray-300 text-xs">{t.name}</Text>
                  </View>
                ))}
              </View>

              <View className="flex-row gap-3 mb-6">
                <Pressable
                  onPress={() => setStep("genre")}
                  className="flex-1 p-4 rounded-xl bg-dark-surface border border-dark-border items-center active:opacity-80"
                >
                  <Text className="text-gray-300 font-bold text-sm">
                    Voltar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
                  className="flex-[2] p-4 rounded-xl bg-brand-primary items-center active:opacity-80"
                >
                  <Text className="text-white font-bold text-sm">
                    Criar Projeto
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

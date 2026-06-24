import type { Meta, StoryObj } from "@storybook/react";
import { Metronome } from "../src/components";
import type { MetronomeSettings } from "../src/lib/types";
import { View } from "react-native";

const meta: Meta<typeof Metronome> = {
  title: "Metronome",
  component: Metronome,
  decorators: [
    (Story) => (
      <View className="p-4 w-80">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultSettings: MetronomeSettings = {
  bpm: 120,
  timeSig: [4, 4],
  accentInterval: 1,
  volume: 60,
  enabled: true,
  countIn: false,
  countInBars: 2,
};

export const Stopped: Story = {
  args: {
    settings: defaultSettings,
    onChange: (s: MetronomeSettings) => console.log("Metronome", s),
    isPlaying: false,
  },
};

export const Playing: Story = {
  args: {
    settings: { ...defaultSettings, bpm: 140 },
    onChange: (s: MetronomeSettings) => console.log("Metronome", s),
    isPlaying: true,
  },
};

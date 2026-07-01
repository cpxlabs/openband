import type { Meta, StoryObj } from "@storybook/react";
import { ChordTrack } from "../src/components";
import { View } from "react-native";

interface ChordBlock {
  id: string;
  degree: number;
  quality: string;
  beats: number;
}

const meta: Meta<typeof ChordTrack> = {
  title: "ChordTrack",
  component: ChordTrack,
  decorators: [
    (Story) => (
      <View className="p-4 w-96 h-64 bg-dark-bg">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    chords: [
      { id: "c1", degree: 0, quality: "maj", beats: 4 },
      { id: "c2", degree: 3, quality: "min", beats: 4 },
      { id: "c3", degree: 4, quality: "maj", beats: 4 },
      { id: "c4", degree: 5, quality: "maj", beats: 4 },
    ],
    onChange: (chords: ChordBlock[]) => console.log("Chords", chords),
    keySignature: "C",
    bpm: 120,
    numBars: 8,
    visible: true,
    onClose: () => alert("Close"),
  },
};

export const Empty: Story = {
  args: {
    chords: [],
    onChange: (chords: ChordBlock[]) => console.log("Chords", chords),
    keySignature: "Am",
    bpm: 100,
    numBars: 4,
    visible: true,
    onClose: () => alert("Close"),
  },
};

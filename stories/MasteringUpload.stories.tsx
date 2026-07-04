import type { Meta, StoryObj } from "@storybook/react";
import { MasteringUpload } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof MasteringUpload> = {
  title: "MasteringUpload",
  component: MasteringUpload,
  decorators: [
    (Story) => (
      <View className="p-4 w-96 h-80 bg-dark-bg">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleMode: Story = {
  args: {
    input: null,
    mode: "single",
    onModeChange: (mode: string) => console.log("Mode", mode),
    onUpload: () => console.log("Upload"),
    onClear: () => console.log("Clear"),
  },
};

export const StemsWithMetadata: Story = {
  args: {
    input: {
      type: "stems",
      filename: "my-project-stems.wav",
      size: 1048576,
      sampleRate: 44100,
      bitDepth: 24,
      duration: 180,
      url: "blob:stems",
      bpm: 128,
      key: "Am",
      timeSignature: "4/4",
      stems: [
        { name: "Drums", url: "blob:drums" },
        { name: "Bass", url: "blob:bass" },
        { name: "Vocals", url: "blob:vocals" },
        { name: "Melodies", url: "blob:melodies" },
      ],
    },
    mode: "stems",
    onModeChange: (mode: string) => console.log("Mode", mode),
    onUpload: () => console.log("Upload"),
    onClear: () => console.log("Clear"),
  },
};

export const SingleWithMetadata: Story = {
  args: {
    input: {
      type: "single",
      filename: "final-mix.wav",
      size: 2097152,
      sampleRate: 48000,
      bitDepth: 16,
      duration: 240,
      url: "blob:mix",
      bpm: 140,
      key: "Dm",
      timeSignature: "6/8",
    },
    mode: "single",
    onModeChange: (mode: string) => console.log("Mode", mode),
    onUpload: () => console.log("Upload"),
    onClear: () => console.log("Clear"),
  },
};

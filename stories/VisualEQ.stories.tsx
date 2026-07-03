import type { Meta, StoryObj } from "@storybook/react";
import { VisualEQ } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof VisualEQ> = {
  title: "VisualEQ",
  component: VisualEQ,
  decorators: [
    (Story) => (
      <View className="p-4">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultBands = [
  { freq: 30, gain: 0, q: 0.71, type: 3, enabled: 0 },
  { freq: 120, gain: 0, q: 0.71, type: 1, enabled: 0 },
  { freq: 500, gain: 0, q: 0.71, type: 2, enabled: 1 },
  { freq: 1500, gain: 0, q: 0.71, type: 2, enabled: 1 },
  { freq: 5000, gain: 0, q: 0.71, type: 2, enabled: 0 },
  { freq: 10000, gain: 0, q: 0.71, type: 4, enabled: 0 },
  { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 0 },
  { freq: 18000, gain: 0, q: 0.71, type: 5, enabled: 0 },
];

export const Default: Story = {
  args: {
    bands: defaultBands,
    onChange: (_index: number, _params: { freq?: number; gain?: number; q?: number; type?: number; enabled?: number }) =>
      console.log("Band changed"),
    spectrum: Array.from({ length: 60 }, () => Math.random()),
    height: 140,
  },
};

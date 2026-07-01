import type { Meta, StoryObj } from "@storybook/react";
import { WaveformCanvas } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof WaveformCanvas> = {
  title: "WaveformCanvas",
  component: WaveformCanvas,
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

export const Default: Story = {
  args: {
    regionId: "region-1",
    duration: 8,
    color: "bg-brand-accent",
    audible: true,
    height: 56,
  },
};

export const Selected: Story = {
  args: {
    regionId: "region-2",
    duration: 4,
    color: "bg-blue-500",
    audible: true,
    selected: true,
    height: 56,
  },
};

export const Muted: Story = {
  args: {
    regionId: "region-3",
    duration: 6,
    color: "bg-gray-500",
    audible: false,
    muted: true,
    height: 40,
  },
};

export const Zoomed: Story = {
  args: {
    regionId: "region-4",
    duration: 16,
    color: "bg-purple-500",
    audible: true,
    height: 64,
    zoom: 2,
  },
};

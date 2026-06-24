import type { Meta, StoryObj } from "@storybook/react";
import { WaveformClip } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof WaveformClip> = {
  title: "WaveformClip",
  component: WaveformClip,
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

export const Muted: Story = {
  args: {
    regionId: "region-2",
    duration: 4,
    color: "bg-gray-500",
    audible: false,
    height: 40,
  },
};

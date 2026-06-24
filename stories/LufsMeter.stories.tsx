import type { Meta, StoryObj } from "@storybook/react";
import { LufsMeter } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof LufsMeter> = {
  title: "LufsMeter",
  component: LufsMeter,
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

export const Stopped: Story = {
  args: {
    isPlaying: false,
  },
};

export const Playing: Story = {
  args: {
    isPlaying: true,
  },
};

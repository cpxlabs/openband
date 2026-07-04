import type { Meta, StoryObj } from "@storybook/react";
import { LightControls } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof LightControls> = {
  title: "LightControls",
  component: LightControls,
  decorators: [
    (Story) => (
      <View className="p-4 w-80 h-40 bg-dark-bg">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultColor: 0xffffff,
    defaultIntensity: 6,
  },
};

export const Red: Story = {
  args: {
    defaultColor: 0xff0000,
    defaultIntensity: 4,
  },
};

export const Dim: Story = {
  args: {
    defaultColor: 0x00e5ff,
    defaultIntensity: 2,
  },
};

import type { Meta, StoryObj } from "@storybook/react";
import { CardIcon } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof CardIcon> = {
  title: "CardIcon",
  component: CardIcon,
  decorators: [
    (Story) => (
      <View className="p-4 w-40">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: "🎵",
  },
};

export const Emoji: Story = {
  args: {
    icon: "🔥",
  },
};

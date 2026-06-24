import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof Badge> = {
  title: "Badge",
  component: Badge,
  decorators: [
    (Story) => (
      <View className="p-4 flex-row gap-2">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: "2.4k",
    variant: "default",
  },
};

export const Play: Story = {
  args: {
    text: "▶ 2:34",
    variant: "play",
  },
};

export const Active: Story = {
  args: {
    text: "LIVE",
    variant: "active",
  },
};

export const WithIcon: Story = {
  args: {
    text: "Premium",
    icon: "⭐",
    variant: "default",
  },
};

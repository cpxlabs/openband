import type { Meta, StoryObj } from "@storybook/react";
import { CardRow } from "../src/components";
import { View, Text } from "react-native";

const meta: Meta<typeof CardRow> = {
  title: "CardRow",
  component: CardRow,
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
    children: (
      <View className="flex-row items-center gap-2">
        <Text className="text-white">Track 1</Text>
      </View>
    ),
  },
};

export const Pressable: Story = {
  args: {
    children: (
      <View className="flex-row items-center gap-2">
        <Text className="text-white">Selectable Row</Text>
      </View>
    ),
    onPress: () => alert("Pressed"),
  },
};

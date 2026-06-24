import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardRow, CardIcon } from "../src/components";
import { Text, View } from "react-native";

const meta: Meta<typeof Card> = {
  title: "Card",
  component: Card,
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

const cardContent = (
  <View className="p-4">
    <Text className="text-white font-bold">Card Title</Text>
    <Text className="text-gray-400 text-sm mt-1">
      This is a card component used for grouping content.
    </Text>
  </View>
);

export const Default: Story = {
  args: {
    children: cardContent,
  },
};

export const Elevated: Story = {
  args: {
    children: cardContent,
    elevated: true,
  },
};

export const ActiveBorder: Story = {
  args: {
    children: cardContent,
    activeBorder: true,
  },
};

export const Pressable: Story = {
  args: {
    children: (
      <CardRow onPress={() => alert("Row pressed")}>
        <CardIcon icon="🎵" />
        <View className="ml-3">
          <Text className="text-white font-semibold">Track Name</Text>
          <Text className="text-gray-500 text-xs">2:34 · Artist</Text>
        </View>
      </CardRow>
    ),
  },
};

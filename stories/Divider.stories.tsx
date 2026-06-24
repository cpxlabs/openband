import type { Meta, StoryObj } from "@storybook/react";
import { Divider } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof Divider> = {
  title: "Divider",
  component: Divider,
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

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    label: "Seção",
  },
};

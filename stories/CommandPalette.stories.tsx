import type { Meta, StoryObj } from "@storybook/react";
import { CommandPalette } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof CommandPalette> = {
  title: "CommandPalette",
  component: CommandPalette,
  decorators: [
    (Story) => (
      <View className="p-4 w-96 h-96 bg-dark-bg">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {
  args: {
    visible: true,
    onClose: () => alert("Close"),
  },
};

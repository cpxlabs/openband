import type { Meta, StoryObj } from "@storybook/react";
import { VersionHistory } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof VersionHistory> = {
  title: "VersionHistory",
  component: VersionHistory,
  decorators: [
    (Story) => (
      <View className="p-4 w-96 h-80 bg-dark-bg">
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
    onRevert: (id: string) => console.log("Revert to", id),
  },
};

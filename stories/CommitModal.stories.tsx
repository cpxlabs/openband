import type { Meta, StoryObj } from "@storybook/react";
import { CommitModal } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof CommitModal> = {
  title: "CommitModal",
  component: CommitModal,
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
    onCommit: (_commit: { message: string; timestamp: number }) => console.log("Commit"),
    onSync: (_result: { pushed: number; conflicts: number }) => console.log("Sync"),
  },
};

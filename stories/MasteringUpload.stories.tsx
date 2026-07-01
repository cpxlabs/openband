import type { Meta, StoryObj } from "@storybook/react";
import { MasteringUpload } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof MasteringUpload> = {
  title: "MasteringUpload",
  component: MasteringUpload,
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

export const SingleMode: Story = {
  args: {
    input: null,
    mode: "single",
    onModeChange: (mode: string) => console.log("Mode", mode),
    onUpload: () => console.log("Upload"),
    onClear: () => console.log("Clear"),
  },
};

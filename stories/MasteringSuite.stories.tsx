import type { Meta, StoryObj } from "@storybook/react";
import { MasteringSuite } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof MasteringSuite> = {
  title: "MasteringSuite",
  component: MasteringSuite,
  decorators: [
    (Story) => (
      <View className="p-4 w-96 h-[600px] bg-dark-bg">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onBack: () => alert("Back"),
  },
};

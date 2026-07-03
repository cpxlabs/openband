import type { Meta, StoryObj } from "@storybook/react";
import { NewProject } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof NewProject> = {
  title: "NewProject",
  component: NewProject,
  decorators: [
    (Story) => (
      <View className="h-96">
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
    onClose: () => {},
    onCreate: (config: { name: string; genre: string; key: string; bpm: number }) => alert(`Create: ${config.name}`),
  },
};

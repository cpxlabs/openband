import type { Meta, StoryObj } from "@storybook/react";
import { SampleBrowser } from "../src/components";
import { View } from "react-native";
import type { SampleEntry } from "../src/components/SampleBrowser";

const meta: Meta<typeof SampleBrowser> = {
  title: "SampleBrowser",
  component: SampleBrowser,
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
    onAddSample: (sample: SampleEntry) => console.log("Add", sample.name),
  },
};

import type { Meta, StoryObj } from "@storybook/react";
import { OneKnob } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof OneKnob> = {
  title: "OneKnob",
  component: OneKnob,
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

export const Default: Story = {
  args: {
    label: "Warmth",
    value: 60,
    onChange: (v: number) => console.log("Value", v),
    min: 0,
    max: 100,
    step: 1,
    unit: "%",
  },
};

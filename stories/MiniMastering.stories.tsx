import type { Meta, StoryObj } from "@storybook/react";
import { MiniMastering } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof MiniMastering> = {
  title: "MiniMastering",
  component: MiniMastering,
  decorators: [
    (Story) => (
      <View className="p-4 w-80">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onPresetChange: (i: number) => console.log("Preset", i),
    activePreset: 0,
    eqValues: { bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0 },
    onEqChange: (band: string, value: number) => console.log("EQ", band, value),
  },
};

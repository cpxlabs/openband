import type { Meta, StoryObj } from "@storybook/react";
import { PluginUI } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof PluginUI> = {
  title: "PluginUI",
  component: PluginUI,
  decorators: [
    (Story) => (
      <View className="p-4 w-80 bg-dark-bg">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockDescriptor = {
  id: "eq-1",
  name: "Parametric EQ",
  params: [
    { id: "freq", label: "Frequency", type: "knob" as const, min: 20, max: 20000, step: 1, default: 1000 },
    { id: "gain", label: "Gain", type: "knob" as const, min: -24, max: 24, step: 0.1, default: 0 },
    { id: "q", label: "Q", type: "knob" as const, min: 0.1, max: 10, step: 0.01, default: 0.71 },
    { id: "bypass", label: "Bypass", type: "toggle" as const, default: 0 },
  ],
};

export const Default: Story = {
  args: {
    descriptor: mockDescriptor,
    paramValues: { freq: 1000, gain: 0, q: 0.71, bypass: 0 },
    onParamChange: (id: string, value: number) => console.log("Param", id, value),
    onToggle: (enabled: boolean) => console.log("Toggle", enabled),
    onClose: () => alert("Close"),
  },
};

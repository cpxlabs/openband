import type { Meta, StoryObj } from "@storybook/react";
import { MasteringChain } from "../src/components";
import type { Plugin } from "../src/lib/types";
import { View } from "react-native";

const meta: Meta<typeof MasteringChain> = {
  title: "MasteringChain",
  component: MasteringChain,
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

const mockPlugins: Plugin[] = [
  { id: "e1", name: "EQ", type: "eq", enabled: true, params: {}, color: "#5ac8fa" },
  { id: "c1", name: "Compressor", type: "compressor", enabled: true, params: { threshold: -14, ratio: 2 }, color: "#ff9500" },
  { id: "l1", name: "Limiter", type: "truePeakLimiter", enabled: true, params: { threshold: -3 }, color: "#ff375f" },
];

export const Default: Story = {
  args: {
    plugins: mockPlugins,
    onToggle: (id: string) => console.log("Toggle", id),
    onEdit: (plugin: Plugin) => console.log("Edit", plugin.name),
    onReset: () => console.log("Reset"),
  },
};

export const SomeDisabled: Story = {
  args: {
    plugins: mockPlugins.map((p, i) => i === 1 ? { ...p, enabled: false } : p),
    onToggle: (id: string) => console.log("Toggle", id),
    onEdit: (plugin: Plugin) => console.log("Edit", plugin.name),
    onReset: () => console.log("Reset"),
  },
};

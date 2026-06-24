import type { Meta, StoryObj } from "@storybook/react";
import { PluginEditor } from "../src/components";
import type { Plugin } from "../src/lib/types";
import { View } from "react-native";

const meta: Meta<typeof PluginEditor> = {
  title: "PluginEditor",
  component: PluginEditor,
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

const eqPlugin: Plugin = {
  id: "pe1",
  name: "EQ Eight",
  type: "eq",
  enabled: true,
  params: {
    master: 0,
    b0_freq: 30,
    b0_gain: 0,
    b0_q: 0.71,
    b0_type: 3,
    b0_enabled: 0,
    b1_freq: 120,
    b1_gain: 2,
    b1_q: 0.71,
    b1_type: 1,
    b1_enabled: 1,
    b2_freq: 500,
    b2_gain: -1,
    b2_q: 0.71,
    b2_type: 2,
    b2_enabled: 1,
    b3_freq: 2500,
    b3_gain: 3,
    b3_q: 1.2,
    b3_type: 2,
    b3_enabled: 1,
    b4_freq: 6000,
    b4_gain: 2,
    b4_q: 0.9,
    b4_type: 2,
    b4_enabled: 1,
    b5_freq: 10000,
    b5_gain: 1,
    b5_q: 0.71,
    b5_type: 2,
    b5_enabled: 0,
    b6_freq: 40,
    b6_gain: 0,
    b6_q: 0.71,
    b6_type: 0,
    b6_enabled: 1,
    b7_freq: 18000,
    b7_gain: 0,
    b7_q: 0.71,
    b7_type: 5,
    b7_enabled: 0,
  },
  color: "#5ac8fa",
};

const compressorPlugin: Plugin = {
  id: "pe2",
  name: "Compressor",
  type: "compressor",
  enabled: true,
  params: {
    threshold: -24,
    ratio: 3,
    knee: 5,
    attack: 2,
    release: 80,
    makeupGain: 8,
  },
  color: "#ff9500",
};

export const NoPlugin: Story = {
  args: {
    plugin: null,
    onParamChange: (id: string, param: string, value: number) =>
      console.log(id, param, value),
    onToggle: (id: string) => console.log("Toggle", id),
    onClose: () => {},
  },
};

export const WithEQ: Story = {
  args: {
    plugin: eqPlugin,
    onParamChange: (id: string, param: string, value: number) =>
      console.log(id, param, value),
    onToggle: (id: string) => console.log("Toggle", id),
    onClose: () => {},
  },
};

export const WithCompressor: Story = {
  args: {
    plugin: compressorPlugin,
    onParamChange: (id: string, param: string, value: number) =>
      console.log(id, param, value),
    onToggle: (id: string) => console.log("Toggle", id),
    onClose: () => {},
  },
};

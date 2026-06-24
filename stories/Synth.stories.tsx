import type { Meta, StoryObj } from "@storybook/react";
import { Synth } from "../src/components";

const meta: Meta<typeof Synth> = {
  title: "Synth",
  component: Synth,
  args: {
    visible: true,
    onClose: () => alert("Close"),
    bpm: 120,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};

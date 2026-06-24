import type { Meta, StoryObj } from "@storybook/react";
import { Sampler } from "../src/components";

const meta: Meta<typeof Sampler> = {
  title: "Sampler",
  component: Sampler,
  args: {
    visible: true,
    onClose: () => alert("Close"),
    onAddToTrack: (name: string) => alert(`Add ${name} to track`),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};

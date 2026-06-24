import type { Meta, StoryObj } from "@storybook/react";
import { Tuner } from "../src/components";

const meta: Meta<typeof Tuner> = {
  title: "Tuner",
  component: Tuner,
  args: {
    visible: true,
    onClose: () => alert("Close tuner"),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};

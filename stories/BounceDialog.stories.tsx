import type { Meta, StoryObj } from "@storybook/react";
import { BounceDialog } from "../src/components";

const meta: Meta<typeof BounceDialog> = {
  title: "BounceDialog",
  component: BounceDialog,
  args: {
    visible: true,
    onClose: () => alert("Close"),
    projectTitle: "Minha Nova Faixa",
    duration: 180,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};

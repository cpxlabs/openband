import type { Meta, StoryObj } from "@storybook/react";
import { TextInput } from "../src/components";

const meta: Meta<typeof TextInput> = {
  title: "TextInput",
  component: TextInput,
  args: {
    placeholder: "Digite algo...",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Nome",
    placeholder: "Seu nome...",
  },
};

export const WithError: Story = {
  args: {
    label: "Email",
    placeholder: "email@exemplo.com",
    value: "invalido",
    error: "Email inválido",
  },
};
